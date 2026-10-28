import { expect, test } from "bun:test";
import { CSHitGroup } from "cs_script/point_script";
import { createGamemode } from "../src/core/gamemode";
import { headshotBlood } from "../src/plugins/combat/headshot-blood";
import { engine } from "./fake-point-script";

function effect() {
  return { position: undefined as unknown, Teleport({ position }: { position: unknown }) { this.position = position; } };
}

test("a headshot sprays from the victim's head, each hit on the next effect; a body shot doesn't", () => {
  const [first, second] = [effect(), effect()];
  engine.entities.set("wts_blood_0", first);
  engine.entities.set("wts_blood_1", second);
  createGamemode({ name: "Test", plugins: [headshotBlood({ pool: 2 })] });
  engine.activate();
  const victim = engine.addPlayer("Bob").pawn;
  victim.position = { x: 10, y: 20, z: 0 };
  const hit = (hitGroup: number) =>
    engine.fire("OnPlayerDamage", { player: victim, damage: 50, damageTypes: 0, damageFlags: 0, hitGroup });

  hit(CSHitGroup.CHEST);
  hit(CSHitGroup.HEAD);
  hit(CSHitGroup.HEAD);

  const head = victim.GetEyePosition();
  for (const { position } of [first, second]) {
    const { x, y, z } = position as typeof head;
    expect(Math.max(Math.abs(x - head.x), Math.abs(y - head.y), Math.abs(z - head.z))).toBeLessThanOrEqual(10);
  }
  expect(engine.inputs.map(({ target, input }) => [target === first ? "first" : "second", input])).toEqual([
    ["first", "Stop"],
    ["first", "Start"],
    ["second", "Stop"],
    ["second", "Start"],
  ]);
});
