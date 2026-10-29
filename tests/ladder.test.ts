import { expect, test } from "bun:test";
import { createGamemode } from "../src/core/gamemode";
import { CSInputs, CSMoveType, CSPlayerPawn, CSRoundEndReason, CSWeaponType, engine, weapon } from "./fake-point-script";
import { ladder, type MatchResult } from "../src/gamemodes/gun-game/ladder";

const LADDER = ["weapon_glock", "weapon_deagle", "weapon_knife"];
const PISTOL = weapon(CSWeaponType.PISTOL);
const KNIFE = weapon(CSWeaponType.KNIFE);

function start(weapons = LADDER): void {
  createGamemode({ name: "Test", plugins: [ladder({ weapons })] });
  engine.activate();
}

test("the ladder's server rules are set and checked, an empty default pistol included", () => {
  start();
  engine.tick();
  expect(engine.convars.get("mp_t_default_secondary")).toBe("");
  expect(engine.convars.get("sv_infinite_ammo")).toBe(2);
  expect(engine.logs).toContain("[ladder] All 17 convars read back as set (Console.SetConvar)");
});

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

test("each kill reports the killer's weapon and count on it, the full count when it moves them up or wins", () => {
  const counts: string[] = [];
  const winners: unknown[] = [];
  const onKillCount = ({ weapon, kills, knifed }: { weapon: string; kills: number; knifed: boolean }) =>
    counts.push(`${weapon} ${kills}${knifed ? " knife" : ""}`);
  const killsOn = { weapon_deagle: 4 };
  createGamemode({ name: "Test", plugins: [ladder({ weapons: LADDER, killsOn, onKillCount, onWin: (w) => winners.push(w) })] });
  engine.activate();
  const alice = join("Alice");
  const bob = join("Bob");

  for (const killWeapon of [PISTOL, PISTOL, PISTOL, PISTOL, PISTOL, PISTOL]) kill(alice, bob, killWeapon);
  expect(alice.weapons).toEqual(["weapon_knife", "weapon_deagle"]);
  kill(alice, bob, PISTOL);
  kill(alice, bob, PISTOL);
  expect(winners).toEqual([]);
  kill(alice, bob, KNIFE);

  // The gun kill on the last weapon counts for nothing; the knife kill wins
  expect(counts).toEqual([
    "weapon_glock 1", "weapon_glock 2", "weapon_glock 3",
    "weapon_deagle 1", "weapon_deagle 2", "weapon_deagle 3", "weapon_deagle 4",
    "weapon_knife 3 knife",
  ]);
  expect(winners).toEqual([alice]);
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

test("on the knife level, the victory lap included, a player holds the knife alone", () => {
  start();
  const [alice, bob] = [join("Alice"), join("Bob")];
  kill(alice, bob, KNIFE);
  kill(alice, bob, KNIFE);
  alice.weapons.push("weapon_ak47");
  engine.tick();
  expect(alice.weapons).toEqual(["weapon_knife"]);

  kill(alice, bob, KNIFE);
  alice.weapons.push("weapon_hegrenade");
  engine.tick();
  expect(alice.weapons).toEqual(["weapon_knife"]);
});

test("with lapSpeed, the winner runs at that speed along their aim while a direction key is held", () => {
  createGamemode({ name: "Test", plugins: [ladder({ weapons: LADDER, lapSpeed: 1000 })] });
  engine.activate();
  const [alice, bob] = [join("Alice"), join("Bob")];
  for (let i = 0; i < 3; i++) kill(alice, bob, KNIFE);

  alice.velocity = { x: 0, y: 0, z: 50 };
  engine.tick();
  // No key held: the winner's own movement
  expect(alice.velocity).toEqual({ x: 0, y: 0, z: 50 });

  // Aiming along +y, strafing right runs along +x; the jump keeps its vertical speed
  alice.angles.yaw = 90;
  alice.inputs = CSInputs.RIGHT;
  engine.tick();
  expect(alice.velocity?.x).toBeCloseTo(1000);
  expect(alice.velocity?.y).toBeCloseTo(0);
  expect(alice.velocity?.z).toBe(50);
});

test("after the victory lap the match ends on the scoreboard with its stats, and the next starts everyone over", () => {
  const results: MatchResult[] = [];
  const { alice, bob } = startWithWinner((result) => results.push(result));
  engine.tick(4);
  expect(engine.roundEnds).toEqual([]);
  engine.tick(1);

  expect(results).toEqual([
    {
      winner: { slot: 0, name: "Alice" },
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
  // A 0:0 game over reads "Match Cancelled"
  expect(engine.scores).toEqual([[2, 1]]);
  // With no restart delay the engine often skips the scoreboard (measured 2026-10-27)
  expect(delay).toBeGreaterThan(0);

  engine.fire("OnRoundStart", {});
  engine.fire("OnPlayerReset", { player: alice });
  expect(alice.weapons).toEqual(["weapon_knife", "weapon_glock"]);
});

test("with a time limit the match ends in a draw when time runs out, with no winner and no victory lap", () => {
  const results: MatchResult[] = [];
  createGamemode({ name: "Test", plugins: [ladder({ weapons: LADDER, timeLimit: 60, onMatchEnd: (result) => results.push(result) })] });
  engine.activate();
  const alice = join("Alice");
  const bob = join("Bob");
  engine.fire("OnRoundStart", {});
  for (const killWeapon of [PISTOL, PISTOL, PISTOL]) kill(alice, bob, killWeapon);
  engine.tick(59);
  expect(engine.roundEnds).toEqual([]);
  engine.tick(1);

  expect(results.map((result) => result.winner)).toEqual([undefined]);
  expect(bob.moveType).toBe(CSMoveType.WALK);
  expect(engine.roundEnds).toHaveLength(1);
  // A 0:0 game over reads "Match Cancelled"
  expect(engine.scores).toHaveLength(1);
  engine.tick(60);
  expect(engine.roundEnds).toHaveLength(1);

  engine.fire("OnRoundStart", {});
  engine.fire("OnPlayerReset", { player: alice });
  expect(alice.weapons).toEqual(["weapon_knife", "weapon_glock"]);
});

test.each([
  ["a suicide", (victim: CSPlayerPawn) => victim],
  ["a death to the world", () => undefined],
])("%s drops the player a weapon, and nobody below the first", (_, attackerOf) => {
  const demotions: string[] = [];
  createGamemode({ name: "Test", plugins: [ladder({ weapons: LADDER, onDemote: ({ weapon }) => demotions.push(weapon) })] });
  engine.activate();
  const alice = join("Alice");
  const bob = join("Bob");
  for (let i = 0; i < 3; i++) kill(alice, bob);

  kill(attackerOf(alice), alice);
  engine.fire("OnPlayerReset", { player: alice });
  expect(alice.weapons).toEqual(["weapon_knife", "weapon_glock"]);
  kill(attackerOf(alice), alice);
  engine.fire("OnPlayerReset", { player: alice });
  expect(alice.weapons).toEqual(["weapon_knife", "weapon_glock"]);
  expect(demotions).toEqual(["weapon_glock"]);
});

test("a connect without a player is ignored", () => {
  start();
  expect(() => engine.fire("OnPlayerConnect", {})).not.toThrow();
  expect(engine.logs.some((line) => line.includes("threw"))).toBe(false);
});

const TWO_GRENADES = ["weapon_hegrenade", "weapon_hegrenade"];

test("on the grenade level a player holds two grenades and nothing else, and is left alone after a throw", () => {
  start(["weapon_hegrenade", "weapon_knife"]);
  const alice = join("Alice");
  expect(alice.weapons).toEqual(TWO_GRENADES);
  alice.weapons = ["weapon_hegrenade"];
  engine.fire("OnGrenadeThrow", { weapon: { GetOwner: () => alice } });
  engine.tick(2);
  expect(alice.weapons).toEqual(["weapon_hegrenade"]);
});

test("a thrower left with no grenade gets two a second later", () => {
  start(["weapon_hegrenade", "weapon_knife"]);
  const alice = join("Alice");
  engine.fire("OnGrenadeThrow", { weapon: { GetOwner: () => alice } });
  alice.weapons = [];

  engine.tick(0.5);
  expect(alice.weapons).toEqual([]);
  engine.tick(0.5);
  expect(alice.weapons).toEqual(TWO_GRENADES);
});
