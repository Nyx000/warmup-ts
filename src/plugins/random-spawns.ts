/**
 * Moves each player to a random spawn point as they spawn, away from other players, instead of
 * their team's spawn.
 *
 * mp_randomspawn 1 still put everyone at the CT spawn in a custom game mode (measured on
 * de_inferno, game_type 3), and the deathmatch spawns the engine generates aren't entities a
 * script can find, so the script picks the point itself: from a list for the current map
 * (src/spawns), or else from the map's info_deathmatch_spawn entities.
 */

import { Console, Instance } from "cs_script/point_script";
import type { CSPlayerPawn, Vector } from "cs_script/point_script";
import type { Plugin } from "../core/plugin";
import { connectedPlayers } from "../core/players";

export interface SpawnPoint {
  position: Vector;
  /** Degrees; 0 faces +x. */
  yaw: number;
}

function distanceToNearest(from: Vector, others: Vector[]): number {
  let nearest = Infinity;
  for (const other of others) nearest = Math.min(nearest, Math.hypot(from.x - other.x, from.y - other.y, from.z - other.z));
  return nearest;
}

function entityPoints(className: string): SpawnPoint[] {
  return Instance.FindEntitiesByClass(className).map((entity) => ({ position: entity.GetAbsOrigin(), yaw: entity.GetAbsAngles().yaw }));
}

/**
 * `maps` holds spawn lists by map name. `candidates` is how many random points to weigh per
 * spawn: more spreads players further, fewer is less predictable.
 */
export function randomSpawns({
  maps = {} as Record<string, SpawnPoint[]>,
  className = "info_deathmatch_spawn",
  candidates = 4,
} = {}): Plugin {
  let reported = false;

  return {
    name: "randomSpawns",
    onPlayerReset({ player }) {
      const map = Instance.GetMapName();
      const points = maps[map] ?? entityPoints(className);
      if (!reported) Console.Log(`[randomSpawns] ${points.length} spawn point(s) on ${map} from ${maps[map] ? "its list" : className}`);
      reported = true;
      if (points.length === 0) return;

      const others = connectedPlayers()
        .map((controller) => controller.GetPlayerPawn())
        .filter((pawn): pawn is CSPlayerPawn => !!pawn && pawn !== player && pawn.IsAlive())
        .map((pawn) => pawn.GetAbsOrigin());
      const pool = points.length <= candidates
        ? points
        : Array.from({ length: candidates }, () => points[Math.floor(Math.random() * points.length)]);

      let best = pool[0];
      let bestDistance = -1;
      for (const point of pool) {
        const distance = distanceToNearest(point.position, others);
        if (distance > bestDistance) [best, bestDistance] = [point, distance];
      }
      player.Teleport({ position: best.position, angles: { pitch: 0, yaw: best.yaw, roll: 0 }, velocity: { x: 0, y: 0, z: 0 } });
    },
  };
}
