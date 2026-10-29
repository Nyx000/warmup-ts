import { expect, test } from "bun:test";
import { createGamemode } from "../src/core/gamemode";
import { welcome } from "../src/plugins/players/welcome";
import { engine } from "./fake-point-script";

test("humans are greeted by name as they join; bots aren't", () => {
  createGamemode({ name: "Test", plugins: [welcome((name) => `Welcome ${name}`)] });
  engine.activate();
  const bot = engine.addPlayer("Bot Jim");
  bot.bot = true;

  engine.fire("OnPlayerActivate", { player: engine.addPlayer("Alice") });
  engine.fire("OnPlayerActivate", { player: bot });

  expect(engine.commands).toEqual(["say Welcome Alice"]);
});
