import { expect, test } from "bun:test";
import { createGamemode } from "../src/core/gamemode";
import { particlePool, serverPools } from "../src/core/effects";
import { engine } from "./fake-point-script";

test("the pools are declared at map load and loaded again at each round start, after the cleanup that deleted them", () => {
  const layers = particlePool("fx", 2, ["a.vpcf", "b.vpcf"], { cpoint1: "{name}" });
  createGamemode({ name: "Test", plugins: [serverPools(layers, { clear: "clear", add: "add", reload: "reload" })] });
  engine.activate();
  expect(engine.commands).toEqual([
    "clear",
    `"add" "fx" "2" "info_particle_system" "effect_name" "a.vpcf" "start_active" "false" "cpoint1" "{name}"`,
    `"add" "fx" "2" "info_particle_system" "effect_name" "b.vpcf" "start_active" "false" "cpoint1" "{name}"`,
    "reload",
  ]);
  engine.fire("OnRoundStart", {});
  engine.fire("OnRoundStart", {});
  expect(engine.commands.slice(4)).toEqual(["reload", "reload"]);
});
