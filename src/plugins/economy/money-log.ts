/**
 * Logs a player's money to the console each time it changes.
 */

import { Console, Instance } from "cs_script/point_script";
import type { Plugin } from "../../core/plugin";

const MAX_SLOTS = 64;

export function moneyLog(): Plugin {
  const last = new Map<number, number>();

  return {
    name: "moneyLog",
    onPlayerDisconnect({ playerSlot }) {
      last.delete(playerSlot);
    },
    onThink() {
      for (let slot = 0; slot < MAX_SLOTS; slot++) {
        const controller = Instance.GetPlayerController(slot);
        if (!controller?.IsValid()) continue;
        const money = controller.GetMoneySpendableNow();
        if (last.get(slot) === money) continue;
        last.set(slot, money);
        Console.Log(`[Money] ${controller.GetPlayerName()}: $${money}`);
      }
    },
  };
}
