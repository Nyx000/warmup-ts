import { expect, test } from "bun:test";
import { createGamemode } from "../src/core/gamemode";
import { repeatMessage } from "../src/plugins/repeat-message";
import { engine } from "./fake-point-script";

test("the message is said in chat once every interval", () => {
  createGamemode({ name: "Test", plugins: [repeatMessage({ seconds: 60, message: "Runs on WarmupTS" })] });
  engine.activate();

  engine.tick(59);
  expect(engine.commands).toEqual([]);
  engine.tick(1);
  engine.tick(60);
  expect(engine.commands).toEqual(["say Runs on WarmupTS", "say Runs on WarmupTS"]);
});
