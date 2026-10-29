/**
 * Minimal plugin. Copy this file, rename the function and the name, and add it to
 * the plugin list in your gamemode file (src/gamemodes/<name>/<name>.ts). Every hook is optional.
 */

import { Console } from "cs_script/point_script";
import type { Plugin } from "../core/plugin";

interface ExampleState {
  connected: number;
}

export function example(): Plugin<ExampleState> {
  let state: ExampleState = { connected: 0 };

  return {
    name: "example",

    init() {
      Console.Log(`[Example] Ready, ${state.connected} player(s) connected`);
    },

    // Carries the count across script_reload
    saveState: () => state,
    restoreState(saved) {
      state = saved;
    },

    onPlayerConnect({ player }) {
      state.connected++;
      // Some connects (bots joining) arrive without a player
      Console.Log(`[Example] ${player?.GetPlayerName() ?? "a bot"} connected`);
    },

    onPlayerDisconnect() {
      state.connected = Math.max(0, state.connected - 1);
    },
  };
}
