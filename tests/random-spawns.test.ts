import { expect, test } from "bun:test";
import { createGamemode } from "../src/core/gamemode";
import { randomSpawns } from "../src/plugins/players/random-spawns";
import { engine } from "./fake-point-script";

const at = (x: number) => ({ position: { x, y: 0, z: 0 }, yaw: 0 });

test("a spawning player goes to the current map's point farthest from the other living players", () => {
  engine.mapName = "de_test";
  createGamemode({ name: "Test", plugins: [randomSpawns({ maps: { de_test: [at(100), at(5000)], de_other: [at(9000)] } })] });
  engine.activate();
  engine.addPlayer("Alice").pawn.position = { x: 120, y: 0, z: 0 };
  const bob = engine.addPlayer("Bob").pawn;

  engine.fire("OnPlayerReset", { player: bob });

  expect(bob.position).toEqual({ x: 5000, y: 0, z: 0 });
});

test("a map with no list falls back to its deathmatch spawn entities", () => {
  engine.classes.set("info_deathmatch_spawn", [{ GetAbsOrigin: () => ({ x: 42, y: 0, z: 0 }), GetAbsAngles: () => ({ pitch: 0, yaw: 0, roll: 0 }) }]);
  createGamemode({ name: "Test", plugins: [randomSpawns()] });
  engine.activate();
  const bob = engine.addPlayer("Bob").pawn;

  engine.fire("OnPlayerReset", { player: bob });

  expect(bob.position).toEqual({ x: 42, y: 0, z: 0 });
});
