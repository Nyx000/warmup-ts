/**
 * Greets each human player in chat as they join. Chat goes to everyone, so the rest of the server
 * sees who arrived.
 */

import { say } from "../../core/chat";
import type { Plugin } from "../../core/plugin";

export function welcome(message: (name: string) => string): Plugin {
  return {
    name: "welcome",
    onPlayerActivate({ player }) {
      if (player.IsBot()) return;
      say(message(player.GetPlayerName()));
    },
  };
}
