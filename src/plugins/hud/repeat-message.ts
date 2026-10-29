/**
 * Says the same line in chat every `seconds`, such as what the server runs on.
 */

import { say } from "../../core/chat";
import type { Plugin } from "../../core/plugin";
import { every } from "../../core/timers";

export function repeatMessage({ seconds, message }: { seconds: number; message: string }): Plugin {
  return {
    name: "repeatMessage",
    // A hot reload cancels every timer, and init runs again after one
    init() {
      every(seconds, () => say(message));
    },
  };
}
