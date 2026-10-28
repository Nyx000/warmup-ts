import { expect, test } from "bun:test";
import { engine } from "./fake-point-script";
import { convars } from "../src/core/convars";
import { createGamemode } from "../src/core/gamemode";
import { teamRules, Teams } from "../src/core/rules";
import type { Plugin } from "../src/core/plugin";

function start(...plugins: Plugin[]): void {
  createGamemode({ name: "Test", plugins });
  engine.activate();
  engine.tick();
}

const values = { mp_freezetime: 0, sv_infinite_ammo: 2, mp_t_default_secondary: "", mp_roundtime: 1.92 };

test("values are set with their types and confirmed in the console", () => {
  start(convars(values));
  expect(Object.fromEntries(engine.convars)).toEqual(values);
  expect(engine.logs).toContain("[convars] All 4 convars read back as set (Console.SetConvar)");
});

test("a refused value is reported by name with what the server holds instead", () => {
  engine.convars.set("sv_infinite_ammo", 0);
  engine.refused.add("sv_infinite_ammo");
  engine.refused.add("mp_roundtime");
  start(convars(values));
  expect(engine.logs).toContain('[convars] sv_infinite_ammo did not take: wanted 2, server has 0');
  expect(engine.logs).toContain("[convars] mp_roundtime did not take: wanted 1.92, server has nothing readable");
});

test("without Console.SetConvar the settings go out as commands, strings quoted, and are still checked", () => {
  engine.unsupported.add("Console.SetConvar");
  engine.refused.add("mp_freezetime");
  start(convars(values));
  expect(engine.commands).toEqual(['mp_freezetime 0', 'sv_infinite_ammo 2', 'mp_t_default_secondary ""', 'mp_roundtime 1.92']);
  expect(engine.logs).toContain("[convars] mp_freezetime did not take: wanted 0, server has nothing readable");
});

test("an on/off convar set with 0 or 1 reads back as set", () => {
  engine.booleans.add("mp_friendlyfire");
  engine.booleans.add("mp_teammates_are_enemies");
  start(convars({ mp_friendlyfire: 0, mp_teammates_are_enemies: 1 }));
  expect(engine.logs).toContain("[convars] All 2 convars read back as set (Console.SetConvar)");
});

test("a plugin built on convars reports under its own name", () => {
  start(teamRules({ autoAssign: Teams.CT, damage: "all" }));
  expect(engine.logs.some((line) => line.startsWith("[teamRules] All "))).toBe(true);
});
