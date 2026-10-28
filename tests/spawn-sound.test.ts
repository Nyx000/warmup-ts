import { expect, test } from "bun:test";
import { createGamemode } from "../src/core/gamemode";
import { engine } from "./fake-point-script";
import { spawnSound } from "../src/plugins/hud/spawn-sound";

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

test("with a sound list, every sound plays from the spawning player", () => {
  const sound = {};
  engine.entities.set("wts_spawn_sound", sound);
  createGamemode({ name: "Test", plugins: [spawnSound({ sounds: ["A.Squawk", "B.Flap"] })] });
  engine.activate();
  const alice = engine.addPlayer("Alice");

  engine.fire("OnPlayerReset", { player: alice.pawn });

  expect(engine.inputs.filter(({ input }) => input !== "SetSourceEntity")).toEqual([
    { target: sound, input: "SetSoundEventName", value: "A.Squawk" },
    { target: sound, input: "StartSound" },
    { target: sound, input: "SetSoundEventName", value: "B.Flap" },
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
