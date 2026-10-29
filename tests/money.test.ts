import { expect, test } from "bun:test";
import { createGamemode } from "../src/core/gamemode";
import { money } from "../src/plugins/money";
import { engine } from "./fake-point-script";

test("kills pay by the victim, every human payment is logged by slot, bots are paid without a line", () => {
  const wallet = money({ killHuman: 300, killBot: 100 });
  createGamemode({ name: "Test", plugins: [wallet] });
  engine.activate();
  const [alice, bob, comb] = [engine.addPlayer("Alice"), engine.addPlayer("Bob"), engine.addPlayer("Comb")];
  comb.bot = true;
  const kill = (killer: typeof alice, victim: typeof alice) => engine.fire("OnPlayerKill", { player: victim.pawn, attacker: killer.pawn });

  kill(alice, bob);
  kill(alice, comb);
  kill(comb, alice);
  // A suicide or the world pays no one
  kill(bob, bob);
  engine.fire("OnPlayerKill", { player: bob.pawn });
  // A charge, as a shop would make: the fake controller stands in for the real one
  wallet.pay(alice as never, -250, "grenade");

  expect([alice.money, bob.money, comb.money]).toEqual([150, 0, 300]);
  expect(engine.logs.filter((line) => line.startsWith("[money]"))).toEqual([
    "[money] slot=0 +300 kill",
    "[money] slot=0 +100 kill",
    "[money] slot=0 -250 grenade",
  ]);
});
