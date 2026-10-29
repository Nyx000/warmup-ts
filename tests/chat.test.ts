import { expect, test } from "bun:test";
import { commands, say } from "../src/core/chat";
import { createGamemode } from "../src/core/gamemode";
import { engine } from "./fake-point-script";

function start() {
  const calls: { slot: number; args: string[] }[] = [];
  createGamemode({
    name: "Test",
    plugins: [commands({ "!Hello": ({ player, args }) => void calls.push({ slot: player.GetPlayerSlot(), args }) })],
  });
  engine.activate();
  return calls;
}

test("a command matches its first word whatever the case or padding; the rest of the line is its args", () => {
  const calls = start();
  const player = engine.addPlayer("Alice");

  engine.fire("OnPlayerChat", { player, text: "  !HELLO  a   b " });
  engine.fire("OnPlayerChat", { player, text: "!hello" });
  engine.fire("OnPlayerChat", { player, text: "!hello2 a" });
  engine.fire("OnPlayerChat", { player, text: "constructor" });
  engine.fire("OnPlayerChat", { player, text: "" });

  expect(calls).toEqual([{ slot: 0, args: ["a", "b"] }, { slot: 0, args: [] }]);
});

test("a chat line with no player, as from console say, runs nothing", () => {
  const calls = start();
  engine.fire("OnPlayerChat", { text: "!hello" });
  expect(calls).toEqual([]);
});

test("say strips the quotes and semicolons that would end the console command", () => {
  say('He said "hi"; quit');
  expect(engine.commands).toEqual(["say He said hi quit"]);
});
