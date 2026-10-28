/**
 * Plays a sound from each player as they spawn, so nobody is surprised by someone appearing beside them.
 *
 * The map provides a point_soundevent with that name and its sound event set. Turn its
 * "Re-trigger Stops Last" off, or players spawning together cut each other's sound short, and set
 * "Entity Index Selection" to "Use Entity Index": the default plays from the map origin, out of
 * earshot.
 */

import { Console, Instance } from "cs_script/point_script";
import type { Plugin } from "../../core/plugin";
import { pawnTargetName } from "../../core/players";

export function spawnSound(entityName = "wts_spawn_sound"): Plugin {
  let warned = false;

  return {
    name: "spawnSound",
    onPlayerReset({ player }) {
      const sound = Instance.FindEntityByName(entityName);
      if (!sound) {
        if (!warned) Console.Log(`[spawnSound] no point_soundevent named ${entityName}; spawns stay silent`);
        warned = true;
        return;
      }
      // The source is set by name, and inputs run in the order fired, so players spawning in the same tick each get their own
      const source = pawnTargetName(player);
      if (!source) return;
      Instance.EntFireAtTarget({ target: sound, input: "SetSourceEntity", value: source });
      Instance.EntFireAtTarget({ target: sound, input: "StartSound" });
    },
  };
}
