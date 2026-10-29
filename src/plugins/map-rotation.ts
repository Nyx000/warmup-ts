/**
 * Moves the server between maps. `next()` changes to a random map from the list, and players
 * can rock the vote: once more than half the humans on the server have typed !rtv, it changes.
 * Never to the map already running, and only ever to a map on the list, since changelevel runs
 * whatever it is given.
 */

import { Console, Instance } from "cs_script/point_script";
import type { CSPlayerController } from "cs_script/point_script";
import { commands, say } from "../core/chat";
import type { Plugin } from "../core/plugin";
import { connectedPlayers, playerStore } from "../core/players";
import { after } from "../core/timers";

export function mapRotation({ maps, delay = 5 }: { maps: string[]; delay?: number }): Plugin & { next(seconds?: number): void } {
  const votes = playerStore<true>();
  let changing = false;

  function next(seconds = delay): void {
    const current = Instance.GetMapName();
    const choices = maps.filter((map) => map !== current);
    if (changing || choices.length === 0) return;
    changing = true;
    const map = choices[Math.floor(Math.random() * choices.length)];
    say(`Next map: ${map}`);
    after(seconds, () => Console.ServerCommand(`changelevel ${map}`));
  }

  function vote({ player }: { player: CSPlayerController }): void {
    if (changing) return;
    votes.set(player.GetPlayerSlot(), true);
    const humans = connectedPlayers().filter((controller) => !controller.IsBot()).length;
    const needed = Math.floor(humans / 2) + 1;
    if (votes.size >= needed) next();
    else say(`${player.GetPlayerName()} wants a new map (${votes.size}/${needed}). Type !rtv to vote`);
  }

  return {
    ...commands({ "!rtv": vote, rtv: vote }),
    name: "mapRotation",
    players: { votes },
    next,
  };
}
