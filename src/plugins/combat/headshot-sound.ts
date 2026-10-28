/**
 * Plays a sound from the shooter on every headshot they land: a hit cue for them, and a clue to
 * where they are for anyone else in earshot. The map provides the point_soundevent (settings in
 * core/sounds.ts). With `sounds`, each headshot plays one of them at random in place of the
 * entity's own sound event.
 */

import { CSHitGroup } from "cs_script/point_script";
import type { CSPlayerPawn } from "cs_script/point_script";
import type { Plugin } from "../../core/plugin";
import { mapSound } from "../../core/sounds";

export function headshotSound({ entityName = "wts_headshot_sound", sounds = [] as string[] } = {}): Plugin {
  const play = mapSound("headshotSound", entityName);

  return {
    name: "headshotSound",
    onPlayerDamage({ hitGroup, attacker }) {
      if (hitGroup !== CSHitGroup.HEAD || attacker?.GetClassName() !== "player") return;
      const pick = sounds.length > 0 ? sounds[Math.floor(Math.random() * sounds.length)] : undefined;
      play(attacker as CSPlayerPawn, pick);
    },
  };
}
