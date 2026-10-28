/**
 * Sprays blood from a player's head when they take a headshot.
 *
 * The map provides the effects: info_particle_system entities named `<name>_0` up to
 * `<name>_<pool - 1>`, each with a blood effect and "Start Active" off. Entities sharing a name
 * play together, so effects can be layered. Each hit takes the next name in turn, so one spray
 * isn't cut short by the next.
 */

import { Console, CSHitGroup, Instance } from "cs_script/point_script";
import type { Plugin } from "../../core/plugin";

/** `spread` scatters each layered effect up to that many units from the head, so the spray covers more. */
export function headshotBlood({ name = "wts_blood", pool = 4, spread = 10 } = {}): Plugin {
  let next = 0;
  const warned = new Set<number>();

  return {
    name: "headshotBlood",
    onPlayerDamage({ player, hitGroup }) {
      if (hitGroup !== CSHitGroup.HEAD) return;
      const slot = next;
      next = (next + 1) % pool;
      const effects = Instance.FindEntitiesByName(`${name}_${slot}`);
      if (effects.length === 0) {
        // Each missing name is reported, so a map with fewer effects than `pool` shows which
        if (!warned.has(slot)) Console.Log(`[headshotBlood] no info_particle_system named ${name}_${slot}; those headshots stay clean`);
        warned.add(slot);
        return;
      }
      const position = player.GetEyePosition();
      for (const effect of effects) {
        const jitter = () => (Math.random() * 2 - 1) * spread;
        effect.Teleport({ position: { x: position.x + jitter(), y: position.y + jitter(), z: position.z + jitter() } });
        // Stopping first restarts an effect still playing from an earlier hit. The teleport is
        // immediate and the inputs queued, so a still-playing spray jumps first (not measured)
        Instance.EntFireAtTarget({ target: effect, input: "Stop" });
        Instance.EntFireAtTarget({ target: effect, input: "Start" });
      }
    },
  };
}
