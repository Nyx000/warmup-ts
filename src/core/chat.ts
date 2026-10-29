/**
 * Chat in and out. The engine can't suppress a chat line (OnPlayerChat returns void), so a
 * command is still shown to everyone.
 */

import { Console } from "cs_script/point_script";
import type { CSPlayerController } from "cs_script/point_script";
import type { Plugin } from "./plugin";

/** Says a line in chat to everyone. Quotes and semicolons would end the console command early. */
export function say(message: string): void {
  Console.ServerCommand(`say ${message.replace(/[";]/g, "")}`);
}

/**
 * Runs a handler when a chat line starts with its command word, matched case-insensitively; the
 * rest of the line, split on whitespace, is `args`. Lines with no player (console `say`) are ignored.
 * The default name lists the command words, so a gamemode can use commands() more than once.
 */
export function commands(
  handlers: Record<string, (call: { player: CSPlayerController; args: string[] }) => void>,
  name = `commands:${Object.keys(handlers).join(",")}`,
): Plugin {
  // A Map, so a chat line of "constructor" can't find an Object.prototype method
  const byWord = new Map(Object.entries(handlers).map(([word, handler]) => [word.toLowerCase(), handler]));
  return {
    name,
    onPlayerChat({ player, text }) {
      if (!player) return;
      const [word, ...args] = text.trim().split(/\s+/);
      byWord.get(word.toLowerCase())?.({ player, args });
    },
  };
}
