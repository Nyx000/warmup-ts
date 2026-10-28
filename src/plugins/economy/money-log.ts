/**
 * Logs a player's money to the console each time it changes.
 */

import { Console } from "cs_script/point_script";
import { connectedPlayers, playerStore } from "../../core/players";
import type { Plugin } from "../../core/plugin";

export function moneyLog(): Plugin {
  const last = playerStore<number>();

  return {
    name: "moneyLog",
    players: { last },
    onThink() {
      for (const controller of connectedPlayers()) {
        const slot = controller.GetPlayerSlot();
        const money = controller.GetMoneySpendableNow();
        if (last.get(slot) === money) continue;
        last.set(slot, money);
        Console.Log(`[Money] ${controller.GetPlayerName()}: $${money}`);
      }
    },
  };
}
