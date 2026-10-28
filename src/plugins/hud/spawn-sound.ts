/**
 * Plays a sound from each player as they spawn, so nobody is surprised by someone appearing beside
 * them. The map provides the point_soundevent (settings in core/sounds.ts).
 */

import type { Plugin } from "../../core/plugin";
import { mapSound } from "../../core/sounds";

export function spawnSound(entityName = "wts_spawn_sound"): Plugin {
  const play = mapSound("spawnSound", entityName);

  return {
    name: "spawnSound",
    onPlayerReset({ player }) {
      play(player);
    },
  };
}
