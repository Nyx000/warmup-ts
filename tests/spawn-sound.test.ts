import { expect, test } from "bun:test";
import { createGamemode } from "../src/core/gamemode";
import { engine } from "./fake-point-script";
import { spawnSound } from "../src/plugins/players/spawn-sound";

test("players spawning together each get the sound played from them", () => {
  const sound = {};
  engine.entities.set("wts_spawn_sound", sound);
  createGamemode({ name: "Test", plugins: [spawnSound()] });
  engine.activate();
  const [alice, bob] = [engine.addPlayer("Alice"), engine.addPlayer("Bob")];

  engine.fire("OnPlayerReset", { player: alice.pawn });
  engine.fire("OnPlayerReset", { player: bob.pawn });

  expect(alice.pawn.name).not.toBe(bob.pawn.name);
  expect(engine.inputs).toEqual([
    { target: sound, input: "SetSourceEntity", value: alice.pawn.name },
    { target: sound, input: "StartSound" },
    { target: sound, input: "SetSourceEntity", value: bob.pawn.name },
    { target: sound, input: "StartSound" },
  ]);
});

test("a map without the sound entity says so once and stays silent", () => {
  createGamemode({ name: "Test", plugins: [spawnSound()] });
  engine.activate();
  const alice = engine.addPlayer("Alice");

  engine.fire("OnPlayerReset", { player: alice.pawn });
  engine.fire("OnPlayerReset", { player: alice.pawn });

  expect(engine.inputs).toEqual([]);
  expect(engine.logs.filter((line) => line.includes("no point_soundevent"))).toHaveLength(1);
});
