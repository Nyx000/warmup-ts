/**
 * Pays in-game money for kills, and whatever else a gamemode pays or charges for through `pay`.
 * Every payment to a human is logged as `[money] slot=N +amount reason`, for a log reader that
 * keeps players' balances. Bots are paid too, so the scoreboard reads the same for everyone, but
 * get no line. Turn the engine's own cash awards off (mp_playercashawards 0), or kills pay twice.
 *
 * Balances: when the server provides the convar `wts_wallet_out`, each human's money is set to
 * their balance once they are in game, and held there: the engine sets everyone's money to
 * mp_startmoney at every match start, and the next think puts the balance back. The plugin logs `[wallet] seq=S slots=0,3`; whoever keeps
 * the balances answers by setting the convar to `S 0:1240 3:0`. Until a player's balance has
 * arrived they can be paid but not charged, so a charge can't come out of money that isn't there.
 */

import { Console, CSPlayerPawn, GameRules, Instance } from "cs_script/point_script";
import type { CSPlayerController } from "cs_script/point_script";
import { connectedPlayers, playerStore } from "../core/players";
import type { Plugin } from "../core/plugin";

const WALLET = "wts_wallet_out";
// A request with no answer by then is sent again
const WALLET_TIMEOUT_SECONDS = 5;

export interface MoneyPlugin extends Plugin {
  /** `reason` is one word, so the log line stays easy to read. false when a charge is refused. */
  pay(controller: CSPlayerController, amount: number, reason: string): boolean;
}

/** Dollars per kill: of a human player, and of a bot. */
export function money({ killHuman = 5, killBot = 1 } = {}): MoneyPlugin {
  // Each restored human's balance, kept up to date with their payments since
  const balances = playerStore<number>();
  let request: { seq: number; slots: number[]; at: number; paid: Map<number, number> } | undefined;
  let seq = 0;
  let wallet: "unknown" | "on" | "off" = "unknown";
  let warned = false;

  function pay(controller: CSPlayerController, amount: number, reason: string): boolean {
    const slot = controller.GetPlayerSlot();
    const human = !controller.IsBot();
    if (amount < 0 && human && wallet === "on" && !balances.has(slot)) return false;
    const before = controller.GetMoneySpendableNow();
    controller.AddMoneySpendableNow(amount);
    if (controller.GetMoneySpendableNow() === before && amount !== 0 && !warned) {
      warned = true;
      Console.Log(`[money] ${controller.GetPlayerName()}'s money stayed at $${before} when paid ${amount}: at mp_maxmoney, or the server blocks it`);
    }
    if (human) {
      Console.Log(`[money] slot=${slot} ${amount < 0 ? "" : "+"}${amount} ${reason}`);
      const balance = balances.get(slot);
      if (balance !== undefined) balances.set(slot, balance + amount);
      // Not in the balance the pending request will bring back
      if (request?.slots.includes(slot)) request.paid.set(slot, (request.paid.get(slot) ?? 0) + amount);
    }
    return true;
  }

  function apply(reply: string) {
    for (const pair of reply.split(" ").slice(1)) {
      const [slot, balance] = pair.split(":").map(Number);
      const controller = Instance.GetPlayerController(slot);
      if (!controller || !request?.slots.includes(slot) || !Number.isFinite(balance)) continue;
      const target = balance + (request.paid.get(slot) ?? 0);
      controller.AddMoneySpendableNow(target - controller.GetMoneySpendableNow());
      balances.set(slot, target);
    }
    request = undefined;
  }

  return {
    name: "money",
    pay,
    players: { balances },

    onThink() {
      if (wallet === "unknown") {
        const last = Console.GetConvarString(WALLET);
        wallet = last === undefined ? "off" : "on";
        if (wallet === "off") Console.Log(`[wallet] No ${WALLET} on this server: money starts at 0 each map`);
        // The convar outlives a map change, so number on from its last answer rather than match it again
        else seq = Number.parseInt(last ?? "", 10) || 0;
      }
      if (wallet === "off") return;
      for (const [slot, balance] of balances) {
        const controller = Instance.GetPlayerController(slot);
        const drift = controller ? balance - controller.GetMoneySpendableNow() : 0;
        if (drift !== 0) controller?.AddMoneySpendableNow(drift);
      }
      if (request) {
        const reply = Console.GetConvarString(WALLET) ?? "";
        if (reply.startsWith(`${request.seq} `)) apply(reply);
        else if (Instance.GetGameTime() - request.at > WALLET_TIMEOUT_SECONDS) request = undefined;
        return;
      }
      const waiting = connectedPlayers()
        .filter((controller) => !controller.IsBot() && !balances.has(controller.GetPlayerSlot()))
        .map((controller) => controller.GetPlayerSlot());
      if (waiting.length === 0) return;
      request = { seq: ++seq, slots: waiting, at: Instance.GetGameTime(), paid: new Map() };
      Console.Log(`[wallet] seq=${request.seq} slots=${waiting.join(",")}`);
    },

    onPlayerKill({ player, attacker }) {
      // Warmup kills don't count for anything
      if (GameRules.IsWarmupPeriod() || !(attacker instanceof CSPlayerPawn) || attacker === player) return;
      const killer = attacker.GetPlayerController();
      if (!killer) return;
      pay(killer, player.GetPlayerController()?.IsBot() ? killBot : killHuman, "kill");
    },
  };
}
