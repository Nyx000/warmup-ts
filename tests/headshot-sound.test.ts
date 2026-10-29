import { expect, test } from "bun:test";
import { CSHitGroup } from "cs_script/point_script";
import { createGamemode } from "../src/core/gamemode";
import { headshotSound } from "../src/plugins/combat/headshot-sound";
import { mapSound } from "../src/core/sounds";
import { engine } from "./fake-point-script";

test("a headshot plays the sound from the shooter; a body shot or a world hit doesn't", () => {
  const sound = {};
  engine.entities.set("wts_headshot_sound", sound);
  createGamemode({ name: "Test", plugins: [headshotSound()] });
  engine.activate();
  const [shooter, victim] = [engine.addPlayer("Alice").pawn, engine.addPlayer("Bob").pawn];
  const hit = (hitGroup: number, attacker?: object) =>
    engine.fire("OnPlayerDamage", { player: victim, damage: 50, damageTypes: 0, damageFlags: 0, hitGroup, attacker });

  hit(CSHitGroup.CHEST, shooter);
  hit(CSHitGroup.HEAD);
  hit(CSHitGroup.HEAD, shooter);

  expect(engine.inputs).toEqual([
    { target: sound, input: "SetSourceEntity", value: shooter.name },
    { target: sound, input: "StartSound" },
  ]);
});

test("played at a point, the sound moves there and plays from itself", () => {
  const sound = { at: undefined as unknown, Teleport({ position }: { position: unknown }) { this.at = position; } };
  engine.entities.set("wts_kill_sound", sound);
  const play = mapSound("Test", "wts_kill_sound");

  play({ x: 1, y: 2, z: 3 }, "A.Bell");

  expect(sound.at).toEqual({ x: 1, y: 2, z: 3 });
  expect(engine.inputs.map(({ input, value }) => [input, value])).toEqual([
    ["SetSoundEventName", "A.Bell"],
    ["SetSourceEntity", "wts_kill_sound"],
    ["StartSound", undefined],
  ]);
});

test("with a sound list, each headshot plays one of them", () => {
  const sound = {};
  engine.entities.set("wts_headshot_sound", sound);
  createGamemode({ name: "Test", plugins: [headshotSound({ sounds: ["A.Bell", "B.Bell"] })] });
  engine.activate();
  const [shooter, victim] = [engine.addPlayer("Alice").pawn, engine.addPlayer("Bob").pawn];

  engine.fire("OnPlayerDamage", { player: victim, damage: 50, damageTypes: 0, damageFlags: 0, hitGroup: CSHitGroup.HEAD, attacker: shooter });

  const [picked] = engine.inputs;
  expect(picked.input).toBe("SetSoundEventName");
  expect(["A.Bell", "B.Bell"]).toContain(picked.value as string);
  expect(engine.inputs.at(-1)?.input).toBe("StartSound");
});
