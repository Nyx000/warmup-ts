import { expect, test } from "bun:test";
import { createGamemode } from "../src/core/gamemode";
import { money } from "../src/plugins/money";
import { engine } from "./fake-point-script";

test("kills pay by the victim outside warmup, every human payment is logged by slot, bots are paid without a line", () => {
  const wallet = money({ killHuman: 300, killBot: 100 });
  createGamemode({ name: "Test", plugins: [wallet] });
  engine.activate();
  const [alice, bob, comb] = [engine.addPlayer("Alice"), engine.addPlayer("Bob"), engine.addPlayer("Comb")];
  comb.bot = true;
  const kill = (killer: typeof alice, victim: typeof alice) => engine.fire("OnPlayerKill", { player: victim.pawn, attacker: killer.pawn });

  engine.warmupPeriod = true;
  kill(alice, bob);
  engine.warmupPeriod = false;
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

test("each human's money becomes their balance, plus what they were paid while it was on its way", () => {
  // The last map's answer: a new request must not match it
  engine.convars.set("wts_wallet_out", "7 0:999");
  const wallet = money({ killHuman: 5, killBot: 1 });
  createGamemode({ name: "Test", plugins: [wallet] });
  engine.activate();
  const [alice, comb] = [engine.addPlayer("Alice"), engine.addPlayer("Comb")];
  comb.bot = true;
  engine.tick();
  expect(engine.logs.filter((line) => line.startsWith("[wallet]"))).toEqual(["[wallet] seq=8 slots=0"]);

  // No charge before the balance arrives; a kill still pays
  expect(wallet.pay(alice as never, -50, "grenade")).toBe(false);
  engine.fire("OnPlayerKill", { player: comb.pawn, attacker: alice.pawn });
  engine.convars.set("wts_wallet_out", "8 0:1240");
  engine.tick();
  expect(alice.money).toBe(1241);
  expect(wallet.pay(alice as never, -50, "grenade")).toBe(true);
  expect(alice.money).toBe(1191);
});

test("without wts_wallet_out, money starts at 0 and charges are allowed", () => {
  const wallet = money();
  createGamemode({ name: "Test", plugins: [wallet] });
  engine.activate();
  const alice = engine.addPlayer("Alice");
  engine.tick();
  expect(engine.logs.some((line) => line.startsWith("[wallet] seq="))).toBe(false);
  alice.money = 100;
  expect(wallet.pay(alice as never, -50, "grenade")).toBe(true);
});
