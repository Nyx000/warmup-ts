import { expect, test } from "bun:test";
import type { Plugin } from "../src/core/plugin";

// tsc is the assertion here: each @ts-expect-error fails the check if the line compiles.
test("a hook whose return value the dispatcher ignores cannot return one", () => {
  const plugins: Plugin[] = [
    // @ts-expect-error onThink's result is dropped
    { name: "think", onThink: () => true },
    // @ts-expect-error so is an engine hook's
    { name: "round", onRoundStart() { return true; } },
    // onModifyPlayerDamage's result is the damage change
    { name: "damage", onModifyPlayerDamage: () => ({ abort: true }) },
    // @ts-expect-error bots connect with no player
    { name: "connect", onPlayerConnect({ player }) { player.GetPlayerName(); } },
  ];
  expect(plugins).toHaveLength(4);
});
