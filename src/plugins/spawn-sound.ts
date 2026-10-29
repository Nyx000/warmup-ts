/**
 * Plays a sound from each player as they spawn, so nobody is surprised by someone appearing beside
 * them. The map provides the point_soundevent (settings in core/sounds.ts). With `sounds`, every
 * one of them plays at once in place of the entity's own sound event: no event's volume can be
 * raised, so layering is how a spawn gets louder. With `bots` off, bots spawn silently: a stock
 * sound event can play only so often server-wide (the chicken ones block repeats for 5 seconds),
 * and constantly respawning bots would use it up.
 */

import type { Plugin } from "../core/plugin";
import { mapSound } from "../core/sounds";

export function spawnSound({ entityName = "wts_spawn_sound", sounds = [] as string[], bots = true } = {}): Plugin {
  const play = mapSound("spawnSound", entityName);

  return {
    name: "spawnSound",
    onPlayerReset({ player }) {
      if (!bots && player.GetPlayerController()?.IsBot()) return;
      if (sounds.length === 0) play(player);
      for (const sound of sounds) play(player, sound);
    },
  };
}
