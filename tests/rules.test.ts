import { expect, test } from "bun:test";
import { engine } from "./fake-point-script";
import { createGamemode } from "../src/core/gamemode";
import { teamRules, Teams } from "../src/core/rules";

test("autoAssign moves a player who ends up on the other team, and leaves spectators alone", () => {
  createGamemode({ name: "Test", plugins: [teamRules({ autoAssign: Teams.CT, damage: "all" })] });
  engine.activate();
  const bot = engine.addPlayer("Bot");
  const spectator = engine.addPlayer("Watcher");
  bot.pawn.team = Teams.TERRORIST;
  spectator.pawn.team = Teams.SPECTATOR;
  engine.fire("OnPlayerTeamChanged", { player: bot.pawn, oldTeam: Teams.UNASSIGNED });
  engine.fire("OnPlayerTeamChanged", { player: spectator.pawn, oldTeam: Teams.CT });
  expect(bot.team).toBe(Teams.CT);
  expect(spectator.team).toBe(Teams.UNASSIGNED);
});
