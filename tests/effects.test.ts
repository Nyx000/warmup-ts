import { expect, test } from "bun:test";
import { createGamemode } from "../src/core/gamemode";
import { effectsReload } from "../src/core/effects";
import { engine } from "./fake-point-script";

test("each round start runs the effects reload command, after the cleanup that deleted them", () => {
  createGamemode({ name: "Test", plugins: [effectsReload("reload_fx")] });
  engine.activate();
  engine.fire("OnRoundStart", {});
  engine.fire("OnRoundStart", {});
  expect(engine.commands.filter((command) => command === "reload_fx")).toHaveLength(2);
});
