import { expect, test } from "bun:test";
import { CSHitGroup } from "cs_script/point_script";
import { createGamemode } from "../src/core/gamemode";
import { headshotBlood } from "../src/plugins/combat/headshot-blood";
import { engine } from "./fake-point-script";

function effect() {
  return {
    position: undefined as unknown,
    yaw: undefined as unknown,
    Teleport({ position, angles }: { position: unknown; angles?: { yaw: number } }) {
      this.position = position;
      this.yaw = angles?.yaw;
    },
  };
}

test("a headshot sprays back at the shooter from in front of and at the head, and out beyond it; a body shot doesn't", () => {
  const effects = [effect(), effect(), effect()];
  effects.forEach((e, i) => engine.entities.set(`wts_blood_${i}`, e));
  createGamemode({ name: "Test", plugins: [headshotBlood({ pool: 3, spots: 3, step: 12, spread: 0 })] });
  engine.activate();
  const [shooter, victim] = [engine.addPlayer("Alice").pawn, engine.addPlayer("Bob").pawn];
  shooter.position = { x: 0, y: 0, z: 0 };
  victim.position = { x: 100, y: 0, z: 0 };
  const hit = (hitGroup: number) =>
    engine.fire("OnPlayerDamage", { player: victim, damage: 50, damageTypes: 0, damageFlags: 0, hitGroup, attacker: shooter });

  hit(CSHitGroup.CHEST);
  hit(CSHitGroup.HEAD);

  // Yaw 180 and -180 face the same way
  expect(effects.map(({ position, yaw }) => [position, Math.abs(yaw as number)])).toEqual([
    [{ x: 88, y: 0, z: 64 }, 180],
    [{ x: 100, y: 0, z: 64 }, 180],
    [{ x: 112, y: 0, z: 64 }, 0],
  ]);
  expect(engine.inputs.map(({ input }) => input)).toEqual(["Start", "Start", "Start"]);
});

// Players' games only show an effect going from stopped to started (seen 2026-10-28)
test("each burst stops a second later and its effect rests until then, so a restart always shows", () => {
  const only = effect();
  engine.entities.set("wts_blood_0", only);
  createGamemode({ name: "Test", plugins: [headshotBlood({ pool: 1, spots: 1 })] });
  engine.activate();
  const victim = engine.addPlayer("Bob").pawn;
  const headshot = () =>
    engine.fire("OnPlayerDamage", { player: victim, damage: 50, damageTypes: 0, damageFlags: 0, hitGroup: CSHitGroup.HEAD });

  headshot();
  headshot();
  expect(engine.inputs.map(({ input }) => input)).toEqual(["Start"]);
  engine.tick(1.5);
  headshot();
  expect(engine.inputs.map(({ input }) => input)).toEqual(["Start", "Stop", "Start"]);
});

test("a map short of effects says which name is missing, once, and that headshot stays clean", () => {
  engine.entities.set("wts_blood_0", effect());
  createGamemode({ name: "Test", plugins: [headshotBlood({ pool: 2, spots: 1 })] });
  engine.activate();
  const victim = engine.addPlayer("Bob").pawn;
  const headshot = () =>
    engine.fire("OnPlayerDamage", { player: victim, damage: 50, damageTypes: 0, damageFlags: 0, hitGroup: CSHitGroup.HEAD });

  for (let i = 0; i < 4; i++) {
    headshot();
    engine.tick(1.5);
  }

  expect(engine.inputs.filter(({ input }) => input === "Start")).toHaveLength(2);
  expect(engine.logs.filter((line) => line.includes("no info_particle_system"))).toEqual([
    "[headshotBlood] no info_particle_system named wts_blood_1; those bursts stay off",
  ]);
});
