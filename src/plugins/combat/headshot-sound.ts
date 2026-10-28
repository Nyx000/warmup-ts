/**
 * Plays a sound from the shooter on every headshot they land, so they hear it hit.
 *
 * The map provides a point_soundevent with that name and its sound event set, "Re-trigger Stops
 * Last" off so quick headshots don't cut each other short, and "Entity Index Selection" set to
 * "Use Entity Index" so the sound plays from the shooter instead of the map origin. With
 * `sounds`, each headshot plays one of them at random in place of the entity's own sound event.
 */

import { Console, CSHitGroup, Instance } from "cs_script/point_script";
import type { CSPlayerPawn } from "cs_script/point_script";
import type { Plugin } from "../../core/plugin";
import { pawnTargetName } from "../../core/players";

export function headshotSound({ entityName = "wts_headshot_sound", sounds = [] as string[] } = {}): Plugin {
  let warned = false;

  return {
    name: "headshotSound",
    onPlayerDamage({ hitGroup, attacker }) {
      if (hitGroup !== CSHitGroup.HEAD || attacker?.GetClassName() !== "player") return;
      const sound = Instance.FindEntityByName(entityName);
      if (!sound) {
        if (!warned) Console.Log(`[headshotSound] no point_soundevent named ${entityName}; headshots stay quiet`);
        warned = true;
        return;
      }
      const source = pawnTargetName(attacker as CSPlayerPawn);
      if (!source) return;
      if (sounds.length > 0) {
        const pick = sounds[Math.floor(Math.random() * sounds.length)];
        Instance.EntFireAtTarget({ target: sound, input: "SetSoundEventName", value: pick });
      }
      Instance.EntFireAtTarget({ target: sound, input: "SetSourceEntity", value: source });
      Instance.EntFireAtTarget({ target: sound, input: "StartSound" });
    },
  };
}
