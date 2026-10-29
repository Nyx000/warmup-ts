/**
 * Throws a player backwards along the shot when a headshot kills them, and up into the air when
 * a grenade does. cs_script can't
 * change the death impulse, and a dying player's speed didn't carry into the ragdoll (seen
 * 2026-10-28). So the killing headshot leaves them alive on 1 health and pushes them, again on
 * every think so ground friction can't eat the speed, and after `hold` seconds they take the
 * killing damage from the same shooter and weapon. Scripted damage has no hit group, so a
 * headshot's finishing hit carries the HEADSHOT damage type to keep the kill a headshot; the
 * grenade icon is still lost. Put it after any plugin that can cancel
 * damage, so a cancelled hit throws no one.
 */

import { CSDamageFlags, CSDamageTypes, CSHitGroup, Instance } from "cs_script/point_script";
import type { CSPlayerPawn, Vector } from "cs_script/point_script";
import type { Plugin } from "../core/plugin";
import { every } from "../core/timers";

/**
 * Units per second along the shooter's aim, and straight up (negative pushes down). A grenade
 * kill swaps them: `speed` straight up and `lift` out from the explosion.
 */
export interface Launch {
  speed: number;
  lift: number;
}

/**
 * `pick` chooses which of `launches` a killer's shot gets, by index (clamped to the list), and
 * the victim is pushed for `hold` seconds after the shot, then dies. Grenade kills pick from
 * `blasts` the same way, `launches` when it is left out.
 */
export function ragdollPunch({
  launches = [{ speed: 1200, lift: 350 }] as Launch[],
  blasts = undefined as Launch[] | undefined,
  pick = (_killer: CSPlayerPawn): number => 0,
  hold = 0.1,
} = {}): Plugin {
  return {
    name: "ragdollPunch",
    onModifyPlayerDamage({ player, damage, damageTypes, damageFlags, hitGroup, attacker, inflictor, weapon }) {
      const blast = (damageTypes & CSDamageTypes.BLAST) !== 0;
      // FORCE_DEATH: our own finishing hit, which may arrive with the head hit group
      if (damageFlags & CSDamageFlags.FORCE_DEATH) return undefined;
      if ((!blast && hitGroup !== CSHitGroup.HEAD) || attacker?.GetClassName() !== "player" || damage < player.GetHealth()) return undefined;
      const list = blast ? (blasts ?? launches) : launches;
      const { speed, lift } = list[Math.max(0, Math.min(list.length - 1, pick(attacker as CSPlayerPawn)))];
      let velocity: Vector;
      if (blast) {
        const from = inflictor?.GetAbsOrigin() ?? player.GetAbsOrigin();
        const to = player.GetAbsOrigin();
        const flat = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        velocity = { x: ((to.x - from.x) / flat) * lift, y: ((to.y - from.y) / flat) * lift, z: speed };
      } else {
        // Along the shooter's aim, flattened: the way the bullet travelled
        const yaw = (attacker.GetEyeAngles().yaw * Math.PI) / 180;
        velocity = { x: Math.cos(yaw) * speed, y: Math.sin(yaw) * speed, z: lift };
      }
      player.Teleport({ velocity });
      const until = Instance.GetGameTime() + hold;
      // Shorter than a think, so it runs on every think
      const timer = every(0.01, () => {
        if (!player.IsValid() || !player.IsAlive()) return timer.cancel();
        player.Teleport({ velocity });
        if (Instance.GetGameTime() < until) return;
        timer.cancel();
        // Not a bullet, so headshot-only rules let it through
        const damageTypes = blast ? CSDamageTypes.GENERIC : CSDamageTypes.HEADSHOT;
        player.TakeDamage({ damage: player.GetHealth() + 100, damageTypes, damageFlags: CSDamageFlags.FORCE_DEATH, attacker, inflictor, weapon });
      });
      return { damageFlags: damageFlags | CSDamageFlags.PREVENT_DEATH };
    },
  };
}
