import { expect, test } from "bun:test";
import { CSDamageFlags, CSDamageTypes, CSHitGroup } from "cs_script/point_script";
import { createGamemode } from "../src/core/gamemode";
import { ragdollPunch } from "../src/plugins/combat/ragdoll-punch";
import { engine } from "./fake-point-script";

test("a killing headshot spares, launches, then kills the victim for the shooter; other hits don't", () => {
  const launches = [{ speed: 100, lift: 10 }, { speed: 1000, lift: 300 }];
  createGamemode({ name: "Test", plugins: [ragdollPunch({ launches, pick: () => 5, hold: 0.2 })] });
  engine.activate();
  const [shooter, victim] = [engine.addPlayer("Alice").pawn, engine.addPlayer("Bob").pawn];
  victim.position = { x: 300, y: 500, z: 0 };
  // Aimed along +y, off the line to the victim: the push follows the aim
  shooter.angles = { pitch: 10, yaw: 90, roll: 0 };
  const gun = {};
  const hit = (hitGroup: number, damage: number) =>
    engine.fire("OnModifyPlayerDamage", { player: victim, damage, damageTypes: 0, damageFlags: 0, hitGroup, attacker: shooter, weapon: gun });

  expect(hit(CSHitGroup.HEAD, 60)).toBeUndefined();
  expect(hit(CSHitGroup.CHEST, 150)).toBeUndefined();
  expect(victim.velocity).toBeUndefined();

  expect(hit(CSHitGroup.HEAD, 120)).toEqual({ damageFlags: CSDamageFlags.PREVENT_DEATH });
  const pushed = victim.velocity!;
  expect([Math.round(pushed.x), Math.round(pushed.y), pushed.z]).toEqual([0, 1000, 300]);
  expect(victim.damageTaken).toEqual([]);
  // The pick past the end of the list gets the strongest launch
  engine.tick(0.5);
  expect(victim.damageTaken.map(({ attacker, weapon }) => [attacker, weapon])).toEqual([[shooter, gun]]);
});

test("a killing grenade tosses the victim up, out from the explosion, then kills them", () => {
  createGamemode({ name: "Test", plugins: [ragdollPunch({ launches: [{ speed: 1000, lift: 30 }], hold: 0.2 })] });
  engine.activate();
  const [thrower, victim] = [engine.addPlayer("Alice").pawn, engine.addPlayer("Bob").pawn];
  victim.position = { x: 100, y: 0, z: 0 };
  const grenade = { GetAbsOrigin: () => ({ x: 0, y: 0, z: 0 }) };

  const result = engine.fire("OnModifyPlayerDamage", { player: victim, damage: 150, damageTypes: CSDamageTypes.BLAST, damageFlags: 0, hitGroup: 0, attacker: thrower, inflictor: grenade });
  expect(result).toEqual({ damageFlags: CSDamageFlags.PREVENT_DEATH });
  expect(victim.velocity).toEqual({ x: 30, y: 0, z: 1000 });
  engine.tick(0.5);
  expect(victim.damageTaken.map(({ attacker }) => attacker)).toEqual([thrower]);
});
