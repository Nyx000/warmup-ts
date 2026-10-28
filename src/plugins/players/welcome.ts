/**
 * Greets each human player in chat as they join. Chat goes to everyone, so the rest of the server
 * sees who arrived.
 */

import { Console } from "cs_script/point_script";
import type { Plugin } from "../../core/plugin";

export function welcome(message: (name: string) => string): Plugin {
  return {
    name: "welcome",
    onPlayerActivate({ player }) {
      if (player.IsBot()) return;
      Console.ServerCommand(`say ${message(player.GetPlayerName().replace(/[";]/g, ""))}`);
    },
  };
}
