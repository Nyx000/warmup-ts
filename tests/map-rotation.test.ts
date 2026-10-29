import { expect, test } from "bun:test";
import { createGamemode } from "../src/core/gamemode";
import { mapRotation } from "../src/plugins/map-rotation";
import { engine } from "./fake-point-script";

const MAPS = ["de_inferno", "de_dust2", "de_nuke"];

function start() {
  const rotation = mapRotation({ maps: MAPS });
  createGamemode({ name: "Test", plugins: [rotation] });
  engine.mapName = "de_inferno";
  engine.activate();
  return rotation;
}

function join(name: string, bot = false) {
  const player = engine.addPlayer(name);
  player.bot = bot;
  engine.fire("OnPlayerConnect", { player });
  return player;
}

const changes = () => engine.commands.filter((command) => command.startsWith("changelevel"));

test.each([
  ["one human of one", 1, 1, true],
  ["one human of two", 2, 1, false],
  ["two humans of three", 3, 2, true],
  ["two humans of four", 4, 2, false],
])("!rtv from %s changes the map: %p", (_, humans, voters, passes) => {
  start();
  const players = Array.from({ length: humans }, (__, i) => join(`Player${i}`));
  join("Bot", true);
  for (const player of players.slice(0, voters)) engine.fire("OnPlayerChat", { player, text: "!rtv" });
  engine.tick(5);
  expect(changes()).toHaveLength(passes ? 1 : 0);
});

test("a vote counts once per player, and a leaver's vote goes with them", () => {
  start();
  const [alice, bob, carol] = ["Alice", "Bob", "Carol"].map((name) => join(name));
  engine.fire("OnPlayerChat", { player: alice, text: "rtv" });
  engine.fire("OnPlayerChat", { player: alice, text: "rtv" });
  alice.connected = false;
  engine.fire("OnPlayerDisconnect", { playerSlot: alice.GetPlayerSlot() });
  engine.fire("OnPlayerChat", { player: bob, text: "!rtv" });
  engine.tick(5);
  expect(changes()).toEqual([]);
  engine.fire("OnPlayerChat", { player: carol, text: "!rtv" });
  engine.tick(5);
  expect(changes()).toHaveLength(1);
});

test("next() changes once, after the delay, to another map on the list", () => {
  const rotation = start();
  rotation.next(10);
  rotation.next(10);
  engine.tick(9);
  expect(changes()).toEqual([]);
  engine.tick(1);
  expect(changes()).toHaveLength(1);
  expect(["changelevel de_dust2", "changelevel de_nuke"]).toContain(changes()[0]);
});
