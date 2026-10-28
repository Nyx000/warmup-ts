import { describe, expect, test } from "bun:test";
import { engine } from "./fake-point-script";
import { createGamemode } from "../src/core/gamemode";
import { playerStore, type PlayerStore } from "../src/core/players";
import type { Plugin } from "../src/core/plugin";
import { after, every, type Timer } from "../src/core/timers";

function start(...plugins: Plugin[]): void {
  createGamemode({ name: "Test", plugins });
  engine.activate();
}

describe("player stores", () => {
  const counter = (): Plugin & { seen: PlayerStore<number>; temp: PlayerStore<number> } => {
    const seen = playerStore<number>();
    const temp = playerStore<number>({ persist: false });
    return { name: "counter", seen, temp, players: { seen, temp } };
  };

  test("a player's entry goes when they disconnect, after plugins have seen the event", () => {
    const plugin = counter();
    let during: number | undefined;
    start({ ...plugin, onPlayerDisconnect: ({ playerSlot }) => void (during = plugin.seen.get(playerSlot)) });
    plugin.seen.set(0, 5);
    plugin.seen.set(1, 7);
    engine.fire("OnPlayerDisconnect", { playerSlot: 0 });
    expect(during).toBe(5);
    expect([...plugin.seen]).toEqual([[1, 7]]);
  });

  test("a hot reload carries persistent stores and leaves the others empty", () => {
    const before = counter();
    start(before);
    before.seen.set(3, 9);
    before.temp.set(3, 9);
    const reloaded = counter();
    engine.reload(() => createGamemode({ name: "Test", plugins: [reloaded] }));
    expect([...reloaded.seen]).toEqual([[3, 9]]);
    expect(reloaded.temp.size).toBe(0);
  });
});

describe("timers", () => {
  test("after runs once and every runs each interval, until cancelled", () => {
    const ran: string[] = [];
    let repeating: Timer | undefined;
    start({
      name: "a",
      init() {
        after(2, () => ran.push("after"));
        repeating = every(2, () => ran.push("every"));
      },
    });
    engine.tick(1);
    expect(ran).toEqual([]);
    engine.tick(1);
    expect(ran).toEqual(["after", "every"]);
    engine.tick(2);
    expect(ran).toEqual(["after", "every", "every"]);
    repeating?.cancel();
    engine.tick(4);
    expect(ran).toHaveLength(3);
  });

  test("a throwing timer is logged and the others still run", () => {
    let ran = false;
    start({
      name: "a",
      init() {
        after(1, () => { throw new Error("boom"); });
        after(1, () => (ran = true));
      },
    });
    engine.tick();
    expect(ran).toBe(true);
    expect(engine.logs).toContain("[Test] A timer threw: Error: boom");
  });

  test("a hot reload cancels the old timers, and the reloaded plugin starts its own", () => {
    let ran = 0;
    const plugin = (): Plugin => ({ name: "a", init: () => void after(5, () => ran++) });
    start(plugin());
    engine.tick(2);
    engine.reload(() => createGamemode({ name: "Test", plugins: [plugin()] }));
    engine.tick(4);
    expect(ran).toBe(0);
    engine.tick(3);
    expect(ran).toBe(1);
  });
});
