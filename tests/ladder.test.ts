import { expect, test } from "bun:test";
import { createGamemode } from "../src/core/gamemode";
import { CSGrenadeType, CSInputs, CSMoveType, CSPlayerPawn, CSRoundEndReason, CSWeaponType, engine, weapon } from "./fake-point-script";
import { ladder, type MatchResult } from "../src/gamemodes/gun-game/ladder";

const LADDER = ["weapon_glock", "weapon_deagle", "weapon_knife"];
const PISTOL = weapon(CSWeaponType.PISTOL);
const KNIFE = weapon(CSWeaponType.KNIFE);

function start(weapons = LADDER): void {
  createGamemode({ name: "Test", plugins: [ladder({ weapons })] });
  engine.activate();
}

function join(name: string): CSPlayerPawn {
  const player = engine.addPlayer(name);
  engine.fire("OnPlayerConnect", { player });
  engine.fire("OnPlayerReset", { player: player.GetPlayerPawn() });
  return player.GetPlayerPawn();
}

function kill(attacker: unknown, player: CSPlayerPawn, killWeapon: unknown = PISTOL): void {
  engine.fire("OnPlayerKill", { player, attacker, weapon: killWeapon });
}

test.each([
  ["two gun kills keep the weapon", [PISTOL, PISTOL], ["weapon_knife", "weapon_glock"]],
  ["three gun kills move up a weapon", [PISTOL, PISTOL, PISTOL], ["weapon_knife", "weapon_deagle"]],
  ["one knife kill moves up a weapon", [KNIFE], ["weapon_knife", "weapon_deagle"]],
  ["a knife kill after gun kills moves up once", [PISTOL, KNIFE, PISTOL], ["weapon_knife", "weapon_deagle"]],
])("%s", (_, weapons, holds) => {
  start();
  const alice = join("Alice");
  const bob = join("Bob");
  for (const killWeapon of weapons) kill(alice, bob, killWeapon);
  expect(alice.weapons).toEqual(holds);
  expect(bob.weapons).toEqual(["weapon_knife", "weapon_glock"]);
});

// A grenade kill carries no weapon (measured 2026-10-27)
test.each([
  ["a grenade kill", undefined, false],
  ["a gun kill", PISTOL, false],
  ["a knife kill", KNIFE, true],
])("on the last weapon, %s wins: %p", (_, killWeapon, wins) => {
  start();
  const alice = join("Alice");
  const bob = join("Bob");
  kill(alice, bob, KNIFE);
  kill(alice, bob, KNIFE);
  engine.fire("OnPlayerKill", { player: bob, attacker: alice, weapon: killWeapon });
  expect(engine.logs.some((line) => line.includes("Alice WINS"))).toBe(wins);
});

function startWithWinner(onMatchEnd?: (result: MatchResult) => void) {
  createGamemode({ name: "Test", plugins: [ladder({ weapons: LADDER, onMatchEnd })] });
  engine.activate();
  const alice = join("Alice");
  const bob = join("Bob");
  const carol = join("Carol");
  kill(alice, bob, KNIFE);
  kill(alice, bob, KNIFE);
  kill(alice, bob, KNIFE);
  return { alice, bob, carol };
}

test("a win freezes and disarms everyone but the winner, and only the winner can hurt anyone", () => {
  const { alice, bob, carol } = startWithWinner();
  expect([alice.moveType, bob.moveType, carol.moveType]).toEqual([CSMoveType.WALK, CSMoveType.NONE, CSMoveType.NONE]);
  expect(engine.roundEnds).toEqual([]);
  expect([bob.weapons, carol.weapons]).toEqual([[], []]);

  const damage = (attacker: CSPlayerPawn, player: CSPlayerPawn) =>
    engine.fire("OnModifyPlayerDamage", { player, attacker, damage: 50, damageTypes: 0, damageFlags: 0 });
  expect(damage(alice, bob)).toBeUndefined();
  expect(damage(carol, alice)).toEqual({ abort: true });

  // Anyone who moves mid-lap is put back on the next think, and lap kills don't count
  bob.position = { x: 100, y: 0, z: 0 };
  engine.tick(0.5);
  expect(bob.position).toEqual({ x: 0, y: 0, z: 0 });
  kill(carol, bob, KNIFE);
  kill(carol, bob, KNIFE);
  expect(carol.weapons).toEqual([]);
});

test("after the victory lap the match ends on the scoreboard with its stats, and the next starts everyone over", () => {
  const results: MatchResult[] = [];
  const { alice, bob } = startWithWinner((result) => results.push(result));
  engine.tick(4);
  expect(engine.roundEnds).toEqual([]);
  engine.tick(1);

  expect(results).toEqual([
    {
      winner: "Alice",
      players: [
        { slot: 0, name: "Alice", kills: 3 },
        { slot: 1, name: "Bob", kills: 0 },
        { slot: 2, name: "Carol", kills: 0 },
      ],
    },
  ]);
  expect(bob.moveType).toBe(CSMoveType.WALK);
  const [[reason, delay]] = engine.roundEnds;
  expect(reason).toBe(CSRoundEndReason.TERRORISTS_WIN);
  // With no restart delay the engine often skips the scoreboard (measured 2026-10-27)
  expect(delay).toBeGreaterThan(0);

  engine.fire("OnRoundStart", {});
  engine.fire("OnPlayerReset", { player: alice });
  expect(alice.weapons).toEqual(["weapon_knife", "weapon_glock"]);
});

test.each([
  ["a suicide", (victim: CSPlayerPawn) => victim],
  ["a death to the world", () => undefined],
])("%s moves nobody up", (_, attackerOf) => {
  start();
  const alice = join("Alice");
  kill(attackerOf(alice), alice, KNIFE);
  expect(alice.weapons).toEqual(["weapon_knife", "weapon_glock"]);
});

test("a connect without a player is ignored", () => {
  start();
  expect(() => engine.fire("OnPlayerConnect", {})).not.toThrow();
  expect(engine.logs.some((line) => line.includes("threw"))).toBe(false);
});

const { ATTACK, ATTACK2 } = CSInputs;

test.each([
  ["left click throws overhand", ATTACK, 1],
  ["right click throws underhand", ATTACK2, 0],
  ["both throw in between", ATTACK | ATTACK2, 0.5],
])("on the grenade level a player holds nothing; %s", (_, inputs, throwStrength) => {
  start(["weapon_hegrenade", "weapon_knife"]);
  const alice = join("Alice");
  expect(alice.weapons).toEqual([]);
  alice.inputs = inputs;
  engine.tick(0.05);
  expect(engine.grenades).toEqual([{ type: CSGrenadeType.HE, thrower: alice, throwStrength }]);
});

test("held fire throws once a second, and not during the victory lap", () => {
  start(["weapon_hegrenade", "weapon_knife"]);
  const alice = join("Alice");
  alice.inputs = ATTACK;
  for (let i = 0; i < 20; i++) engine.tick(0.05);
  expect(engine.grenades).toHaveLength(1);
  engine.tick(0.05);
  expect(engine.grenades).toHaveLength(2);

  const bob = join("Bob");
  bob.inputs = ATTACK;
  kill(bob, alice, KNIFE);
  kill(bob, alice, KNIFE);
  engine.tick(2);
  expect(engine.grenades).toHaveLength(2);
});

test("a bot on the grenade level carries one, and gets a new one a second after throwing", () => {
  start(["weapon_hegrenade", "weapon_knife"]);
  const player = engine.addPlayer("Bot");
  player.bot = true;
  engine.fire("OnPlayerConnect", { player });
  const bot = player.GetPlayerPawn();
  engine.fire("OnPlayerReset", { player: bot });
  expect(bot.weapons).toEqual(["weapon_knife", "weapon_hegrenade"]);
  engine.fire("OnGrenadeThrow", { weapon: { GetOwner: () => bot } });
  bot.weapons = ["weapon_knife"];

  engine.tick(0.5);
  expect(bot.weapons).toEqual(["weapon_knife"]);
  engine.tick(0.5);
  expect(bot.weapons).toEqual(["weapon_knife", "weapon_hegrenade"]);
});
