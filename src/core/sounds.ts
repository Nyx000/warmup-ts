/**
 * Plays a map's point_soundevent from a player, for plugins that make a player-made sound.
 *
 * The map provides the point_soundevent: "Re-trigger Stops Last" off so overlapping plays don't
 * cut each other short, and "Entity Index Selection" set to "Use Entity Index" so it plays from
 * the player (the default plays from the map origin, out of earshot). The sound is positional:
 * everyone near the player hears it.
 */

import { Console, Instance } from "cs_script/point_script";
import type { CSPlayerPawn } from "cs_script/point_script";
import { pawnTargetName } from "./players";

/** Returns a function that plays the sound from a pawn, optionally as a different sound event. */
export function mapSound(pluginName: string, entityName: string): (from: CSPlayerPawn, soundEvent?: string) => void {
  let warned = false;

  return (from, soundEvent) => {
    const sound = Instance.FindEntityByName(entityName);
    if (!sound) {
      if (!warned) Console.Log(`[${pluginName}] no point_soundevent named ${entityName}; its sound stays off`);
      warned = true;
      return;
    }
    const source = pawnTargetName(from);
    if (!source) return;
    // Assumed, not measured: queued inputs to one entity run in the order fired, so two players in
    // the same tick each get their own source
    if (soundEvent) Instance.EntFireAtTarget({ target: sound, input: "SetSoundEventName", value: soundEvent });
    Instance.EntFireAtTarget({ target: sound, input: "SetSourceEntity", value: source });
    Instance.EntFireAtTarget({ target: sound, input: "StartSound" });
  };
}
