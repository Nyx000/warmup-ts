/**
 * Sprays blood from a player's head when they take a headshot: bursts in front of the head and at
 * it spraying back at the shooter, and beyond it spraying out the far side.
 *
 * The map or the server provides the effects (see core/effects.ts): info_particle_system entities
 * named `<name>_0` up to `<name>_<pool - 1>`, each with a blood effect and "Start Active" off;
 * headshotBloodPool describes them for serverPools. Each burst takes a free name, so `pool` should
 * be several times `spots`.
 */

import { CSHitGroup } from "cs_script/point_script";
import type { QAngle, Vector } from "cs_script/point_script";
import { effectPool, particlePool } from "../core/effects";
import type { Plugin } from "../core/plugin";

/**
 * The game's blood impacts layered, so the spray is bigger; _high and _med also drop decals. Those
 * two fade their spray with the distance from control point 0 to control point 1, which a real hit
 * sets to the shooter; left unset only their decals were seen (2026-10-28), so control points 1 and
 * 2 follow the effect itself.
 */
const BLOOD_EFFECTS = [
  "particles/blood_impact/blood_impact_headshot.vpcf",
  "particles/blood_impact/blood_impact_heavy.vpcf",
  "particles/blood_impact/blood_impact_heavy.vpcf",
  "particles/blood_impact/blood_impact_goop_heavy.vpcf",
  "particles/blood_impact/blood_impact_high.vpcf",
  "particles/blood_impact/blood_impact_med.vpcf",
];

export function headshotBloodPool({ name = "wts_blood", pool = 12 } = {}) {
  return particlePool(name, pool, BLOOD_EFFECTS, { cpoint1: "{name}", cpoint2: "{name}" });
}

/**
 * `spots` bursts per headshot, `step` units apart along the shot starting one step in front of the
 * head, each scattered up to `spread` units, so the spray covers more.
 */
export function headshotBlood({ name = "wts_blood", pool = 12, spots = 3, step = 12, spread = 6 } = {}): Plugin {
  const burst = effectPool("headshotBlood", name, pool);

  return {
    name: "headshotBlood",
    onPlayerDamage({ player, hitGroup, attacker }) {
      if (hitGroup !== CSHitGroup.HEAD) return;
      const head = player.GetEyePosition();
      const from = attacker?.GetEyePosition() ?? head;
      const away = direction(from, head);
      const back = { x: -away.x, y: -away.y, z: -away.z };
      const jitter = () => (Math.random() * 2 - 1) * spread;
      for (let spot = 0; spot < spots; spot++) {
        const reach = (spot - 1) * step;
        const position = { x: head.x + away.x * reach + jitter(), y: head.y + away.y * reach + jitter(), z: head.z + away.z * reach + jitter() };
        // Not measured: assumed the blood effects spray along the entity's facing, as off a surface
        burst(position, facing(reach > 0 ? away : back));
      }
    },
  };
}

// Pitch is positive looking down
function facing({ x, y, z }: Vector): QAngle {
  return { pitch: -(Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI, yaw: (Math.atan2(y, x) * 180) / Math.PI, roll: 0 };
}

// Unit vector from one point to another; none when they coincide, so every spot is at the head
function direction(from: Vector, to: Vector): Vector {
  const d = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  const length = Math.hypot(d.x, d.y, d.z);
  return length === 0 ? { x: 0, y: 0, z: 0 } : { x: d.x / length, y: d.y / length, z: d.z / length };
}
