import { expect, test } from "bun:test";
import { CSDamageTypes, CSHitGroup } from "cs_script/point_script";
import { createGamemode } from "../src/core/gamemode";
import { engine } from "./fake-point-script";
import { headshotsOnly } from "../src/plugins/combat/headshots-only";

test.each([
  ["a bullet to the head hurts", CSDamageTypes.BULLET, CSHitGroup.HEAD, undefined],
  ["a bullet to the chest doesn't", CSDamageTypes.BULLET, CSHitGroup.CHEST, { abort: true }],
  ["a grenade blast hurts anywhere", CSDamageTypes.BLAST, CSHitGroup.CHEST, undefined],
])("%s", (_, damageTypes, hitGroup, expected) => {
  createGamemode({ name: "Test", plugins: [headshotsOnly()] });
  engine.activate();
  expect(engine.fire("OnModifyPlayerDamage", { damage: 100, damageTypes, damageFlags: 0, hitGroup })).toEqual(
    expected,
  );
});
