/**
 * Plays a map's info_particle_system effects as one-shot bursts, for plugins that make an effect at
 * a point. The map provides the effects: entities named `<prefix>_0` up to `<prefix>_<size - 1>`,
 * "Start Active" off; entities sharing a name play together, so effects can be layered.
 *
 * Players' games start an effect only when it goes from stopped to started, and a Stop and Start
 * in one tick leave it started, so a restart never shows (seen 2026-10-28: the blood and feathers
 * showed at most once). So each name is stopped `seconds` after its burst and rests until a later
 * tick; a burst with every name still resting is skipped.
 */

import { Console, Instance } from "cs_script/point_script";
import type { QAngle, Vector } from "cs_script/point_script";
import type { Plugin } from "./plugin";
import { after } from "./timers";

/**
 * One layer of an entity pool: each name `<name>_0` up to `<name>_<count - 1>` gets one entity of
 * `classname` with these keys, so layers sharing a name play together. `{name}` in a value becomes
 * the entity's own name.
 */
export interface PoolLayer {
  name: string;
  count: number;
  classname: string;
  keys?: Record<string, string>;
}

/** A pool of info_particle_system bursts for effectPool: one layer per effect, "Start Active" off. */
export function particlePool(name: string, count: number, effects: string[], keys: Record<string, string> = {}): PoolLayer[] {
  return effects.map((effect) => ({ name, count, classname: "info_particle_system", keys: { effect_name: effect, start_active: "false", ...keys } }));
}

// Quoted, as the console splits a bare word on characters like { } ( ) ' :
const quoted = (...words: string[]) => words.map((word) => `"${word}"`).join(" ");

/**
 * Asks a server that provides entities outside the map's own for the pools a gamemode uses, so each
 * gamemode loads only what its plugins need. They're declared at map load, and loaded again at each
 * round start: the restart cleanup before every round start (warmup end, every game restart)
 * deletes them.
 */
export function serverPools(layers: PoolLayer[], { clear = "wts_pools_clear", add = "wts_pool", reload = "wts_pools_reload" } = {}): Plugin {
  return {
    name: "serverPools",
    init() {
      Console.ServerCommand(clear);
      for (const { name, count, classname, keys = {} } of layers) Console.ServerCommand(quoted(add, name, String(count), classname, ...Object.entries(keys).flat()));
      Console.ServerCommand(reload);
    },
    onRoundStart() {
      Console.ServerCommand(reload);
    },
  };
}

// Between a name's Stop and its next Start, so they land in different ticks
const REST_SECONDS = 0.1;

/** Returns a function that bursts the next free name at a point, optionally turned, and says whether it did. */
export function effectPool(pluginName: string, prefix: string, size: number, seconds = 1): (position: Vector, angles?: QAngle) => boolean {
  const restingUntil = new Map<number, number>();
  const warned = new Set<number>();
  let next = 0;

  return (position, angles) => {
    const now = Instance.GetGameTime();
    for (let tried = 0; tried < size; tried++) {
      const slot = (next + tried) % size;
      if ((restingUntil.get(slot) ?? 0) > now) continue;
      next = (slot + 1) % size;
      const name = `${prefix}_${slot}`;
      const effects = Instance.FindEntitiesByName(name);
      if (effects.length === 0) {
        // Each missing name is reported, so a map with fewer effects than `size` shows which
        if (!warned.has(slot)) Console.Log(`[${pluginName}] no info_particle_system named ${name}; those bursts stay off`);
        warned.add(slot);
        return false;
      }
      restingUntil.set(slot, now + seconds + REST_SECONDS);
      for (const effect of effects) {
        effect.Teleport({ position, angles });
        Instance.EntFireAtTarget({ target: effect, input: "Start" });
      }
      after(seconds, () => {
        for (const effect of Instance.FindEntitiesByName(name)) Instance.EntFireAtTarget({ target: effect, input: "Stop" });
      });
      return true;
    }
    return false;
  };
}
