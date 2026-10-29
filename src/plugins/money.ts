/**
 * Pays in-game money for kills, and whatever else a gamemode pays for through `pay`. Every
 * payment to a human is logged as `[money] slot=N +amount reason`, for a log reader that keeps
 * players' balances. Bots are paid too, so the scoreboard reads the same for everyone, but get
 * no line. Turn the engine's own cash awards off (mp_playercashawards 0), or kills pay twice.
 */

import { Console, CSPlayerPawn } from "cs_script/point_script";
import type { CSPlayerController } from "cs_script/point_script";
import type { Plugin } from "../core/plugin";

export interface MoneyPlugin extends Plugin {
  /** `reason` is one word, so the log line stays easy to read. */
  pay(controller: CSPlayerController, amount: number, reason: string): void;
}

/** Dollars per kill: of a human player, and of a bot. */
export function money({ killHuman = 5, killBot = 1 } = {}): MoneyPlugin {
  let warned = false;

  function pay(controller: CSPlayerController, amount: number, reason: string) {
    const before = controller.GetMoneySpendableNow();
    controller.AddMoneySpendableNow(amount);
    if (controller.GetMoneySpendableNow() === before && amount !== 0 && !warned) {
      warned = true;
      Console.Log(`[money] Money didn't change: at mp_maxmoney, or the server blocks it`);
    }
    if (!controller.IsBot()) Console.Log(`[money] slot=${controller.GetPlayerSlot()} ${amount < 0 ? "" : "+"}${amount} ${reason}`);
  }

  return {
    name: "money",
    pay,
    onPlayerKill({ player, attacker }) {
      if (!(attacker instanceof CSPlayerPawn) || attacker === player) return;
      const killer = attacker.GetPlayerController();
      if (!killer) return;
      pay(killer, player.GetPlayerController()?.IsBot() ? killBot : killHuman, "kill");
    },
  };
}
