import { describe, expect, test } from "bun:test";
import { engine } from "./fake-point-script";
import { createGamemode } from "../src/core/gamemode";
import type { Plugin } from "../src/core/plugin";

function start(...plugins: Plugin[]): void {
  createGamemode({ name: "Test", plugins });
  engine.activate();
}

test("every plugin gets the engine's event object, in list order", () => {
  const seen: [string, unknown][] = [];
  start(
    { name: "a", onPlayerChat: (event) => void seen.push(["a", event]) },
    { name: "b", onPlayerChat: (event) => void seen.push(["b", event]) },
  );
  const event = { text: "hi" };
  engine.fire("OnPlayerChat", event);
  expect(seen.map(([name]) => name)).toEqual(["a", "b"]);
  expect(seen.every(([, received]) => received === event)).toBe(true);
});

test("a throwing plugin is logged and the plugins after it still run", () => {
  const ran: string[] = [];
  start(
    { name: "broken", onRoundStart: () => { throw new Error("boom"); } },
    { name: "after", onRoundStart: () => void ran.push("after") },
  );
  engine.fire("OnRoundStart", {});
  expect(ran).toEqual(["after"]);
  expect(engine.logs).toContain("[Test] broken.onRoundStart threw: Error: boom");
});

test("two plugins with one name are refused", () => {
  expect(() => createGamemode({ name: "Test", plugins: [{ name: "x" }, { name: "x" }] })).toThrow(
    'Two plugins are named "x"',
  );
});

test("a callback missing from the running CS2 build is logged, and the rest still work", () => {
  engine.unsupported.add("OnPlayerPing");
  const ran: string[] = [];
  start({ name: "a", onRoundStart: () => void ran.push("round") });
  expect(engine.logs.some((line) => line.includes("Instance.OnPlayerPing doesn't exist"))).toBe(true);
  engine.fire("OnRoundStart", {});
  expect(ran).toEqual(["round"]);
});

describe("damage chain", () => {
  const halve = (name: string): Plugin => ({ name, onModifyPlayerDamage: ({ damage }) => ({ damage: damage / 2 }) });
  const abort = (name: string): Plugin => ({ name, onModifyPlayerDamage: () => ({ abort: true }) });
  const ignore = (name: string): Plugin => ({ name, onModifyPlayerDamage: () => undefined });

  test.each([
    ["no change leaves the damage to the engine", [ignore("a")], undefined],
    ["each plugin sees the damage as changed before it", [halve("a"), halve("b")], { damage: 25 }],
    ["an abort wins over a later change", [abort("a"), halve("b")], { abort: true }],
  ])("%s", (_, plugins, expected) => {
    start(...plugins);
    expect(engine.fire("OnModifyPlayerDamage", { damage: 100, damageTypes: 0, damageFlags: 0 })).toEqual(expected);
  });
});

test.each([
  ["fires once when the freeze period ends", true, 1],
  ["doesn't fire when the map starts after it", false, 0],
])("onFreezeTimeEnd %s", (_, startsFrozen, expected) => {
  engine.freezePeriod = startsFrozen;
  let ends = 0;
  start({ name: "a", onFreezeTimeEnd: () => void ends++ });
  engine.tick();
  engine.freezePeriod = false;
  engine.tick();
  engine.tick();
  expect(ends).toBe(expected);
});

test.each([
  ["fires once when the warmup ends", true, 1],
  ["doesn't fire when the map starts after it", false, 0],
])("onWarmupEnd %s", (_, startsInWarmup, expected) => {
  engine.warmupPeriod = startsInWarmup;
  let ends = 0;
  start({ name: "a", onWarmupEnd: () => void ends++ });
  engine.tick();
  engine.warmupPeriod = false;
  engine.tick();
  engine.tick();
  expect(ends).toBe(expected);
});

test("a hot reload carries plugin state into the newly loaded plugins and restarts thinking", () => {
  const calls: string[] = [];
  const counter = (): Plugin<number> => {
    let rounds = 0;
    return {
      name: "counter",
      init: () => void calls.push(`init ${rounds}`),
      dispose: () => void calls.push("dispose"),
      saveState: () => rounds,
      restoreState: (saved) => void (rounds = saved),
      onRoundStart: () => void rounds++,
      onHotReloadComplete: () => void calls.push(`reloaded ${rounds}`),
      onThink: () => void calls.push("think"),
    };
  };
  start(counter());
  engine.fire("OnRoundStart", {});
  engine.fire("OnRoundStart", {});
  engine.reload(() => createGamemode({ name: "Test", plugins: [counter()] }));
  engine.tick();
  expect(calls).toEqual(["init 0", "dispose", "init 2", "reloaded 2", "think"]);
});
