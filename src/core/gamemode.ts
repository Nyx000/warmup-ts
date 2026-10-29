/**
 * Gamemode runtime: owns every Instance callback and runs the plugins, in list order.
 */

import { Console, GameRules, Instance } from "cs_script/point_script";
import type { ModfiyPlayerDamageResult, ModifyPlayerDamageEvent } from "cs_script/point_script";
import { ENGINE_EVENTS, Plugin } from "./plugin";
import { cancelAllTimers, runDueTimers } from "./timers";

export interface GamemodeConfig {
  /** Prefix for console logs. */
  name: string;
  /** Every hook runs through these in order. */
  plugins: Plugin[];
  /** Seconds between onThink calls. */
  thinkInterval?: number;
}

type Hook = Exclude<keyof Plugin, "name" | "requires" | "players">;

/** What a hot reload carries: plugin saveState results, and persistent player stores as [slot, value] pairs. */
interface Saved {
  plugins: Record<string, unknown>;
  players: Record<string, Record<string, [number, unknown][]>>;
}

/**
 * Call at the top level of the entry script, not inside a callback: a hot reload clears
 * every registered callback and OnActivate doesn't fire again (Valve's samples do the same).
 */
export function createGamemode({ name, plugins, thinkInterval = 0.05 }: GamemodeConfig): void {
  const log = (message: string) => Console.Log(`[${name}] ${message}`);
  // Timers are module state shared by every plugin, and this gamemode owns them
  cancelAllTimers();

  const names = plugins.map((plugin) => plugin.name);
  const duplicate = names.find((pluginName, index) => names.indexOf(pluginName) !== index);
  if (duplicate) throw new Error(`[${name}] Two plugins are named "${duplicate}"`);
  plugins.forEach((plugin, index) => {
    for (const required of plugin.requires ?? []) {
      const at = names.indexOf(required);
      if (at < 0) throw new Error(`[${name}] Plugin "${plugin.name}" requires "${required}", which isn't in the plugin list`);
      if (at >= index) throw new Error(`[${name}] Plugin "${plugin.name}" requires "${required}" to be listed before it`);
    }
  });

  // A throwing plugin must not stop the plugins after it or the engine callback;
  // the console is the only place a script error surfaces.
  function call(plugin: Plugin, hook: Hook, arg?: unknown): unknown {
    const fn = plugin[hook] as ((arg?: unknown) => unknown) | undefined;
    if (typeof fn !== "function") return undefined;
    try {
      return fn.call(plugin, arg);
    } catch (error) {
      log(`${plugin.name}.${hook} threw: ${error}`);
      return undefined;
    }
  }

  function dispatch(hook: Hook, arg?: unknown): void {
    for (const plugin of plugins) call(plugin, hook, arg);
  }

  for (const event of ENGINE_EVENTS) {
    if (event === "OnModifyPlayerDamage") continue;
    const hook = `on${event.slice(2)}` as Hook;
    const register = Instance[event] as ((callback: (arg: unknown) => void) => void) | undefined;
    // The synced types can be newer than the CS2 build running the script
    if (typeof register !== "function") {
      log(`Instance.${event} doesn't exist in this CS2 build; ${hook} will never fire`);
      continue;
    }
    register.call(Instance, (arg) => {
      dispatch(hook, arg);
      // After the dispatch, so a plugin can still read the player's data in onPlayerDisconnect
      if (event === "OnPlayerDisconnect") {
        const { playerSlot } = arg as { playerSlot: number };
        for (const plugin of plugins) {
          for (const store of Object.values(plugin.players ?? {})) store.delete(playerSlot);
        }
      }
    });
  }

  // Each plugin sees the damage as changed by the plugins before it; an abort ends the chain.
  Instance.OnModifyPlayerDamage((event) => {
    // Copied field by field: the engine's event object isn't guaranteed to spread
    const working: ModifyPlayerDamageEvent = {
      player: event.player,
      damage: event.damage,
      damageTypes: event.damageTypes,
      damageFlags: event.damageFlags,
      hitGroup: event.hitGroup,
      inflictor: event.inflictor,
      attacker: event.attacker,
      weapon: event.weapon,
    };
    const result: ModfiyPlayerDamageResult = {};
    for (const plugin of plugins) {
      const change = call(plugin, "onModifyPlayerDamage", working) as ModfiyPlayerDamageResult | undefined;
      if (!change) continue;
      if (change.abort) return { abort: true };
      if (change.damage !== undefined) working.damage = result.damage = change.damage;
      if (change.damageTypes !== undefined) working.damageTypes = result.damageTypes = change.damageTypes;
      if (change.damageFlags !== undefined) working.damageFlags = result.damageFlags = change.damageFlags;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  });

  // cs_script has no event for these; each hook fires when the think loop sees its state turn false
  const watchers: { hook: Hook; isOn: () => boolean; wasOn: boolean }[] = [
    { hook: "onFreezeTimeEnd", isOn: () => GameRules.IsFreezePeriod(), wasOn: false },
    { hook: "onWarmupEnd", isOn: () => GameRules.IsWarmupPeriod(), wasOn: false },
  ];

  Instance.SetThink(() => {
    // Schedule first, so nothing below can stop the loop
    const now = Instance.GetGameTime();
    Instance.SetNextThink(now + thinkInterval);

    for (const watcher of watchers) {
      const isOn = watcher.isOn();
      if (watcher.wasOn && !isOn) dispatch(watcher.hook);
      watcher.wasOn = isOn;
    }

    runDueTimers(now, (error) => log(`A timer threw: ${error}`));
    dispatch("onThink");
  });

  function startThinking(): void {
    for (const watcher of watchers) watcher.wasOn = watcher.isOn();
    Instance.SetNextThink(Instance.GetGameTime());
  }

  // before runs in the old script, after in the newly loaded one
  Instance.OnScriptReload<Saved>({
    before: () => {
      Instance.SetNextThink(-1);
      dispatch("dispose");
      cancelAllTimers();
      const saved: Saved = { plugins: {}, players: {} };
      for (const plugin of plugins) {
        if (plugin.saveState) saved.plugins[plugin.name] = call(plugin, "saveState");
        for (const [key, store] of Object.entries(plugin.players ?? {})) {
          if (store.persist) (saved.players[plugin.name] ??= {})[key] = [...store];
        }
      }
      return saved;
    },
    after: (saved) => {
      for (const plugin of plugins) {
        if (saved?.plugins?.[plugin.name] !== undefined) call(plugin, "restoreState", saved.plugins[plugin.name]);
        for (const [key, store] of Object.entries(plugin.players ?? {})) {
          for (const [slot, value] of saved?.players?.[plugin.name]?.[key] ?? []) store.set(slot, value);
        }
      }
      dispatch("init");
      startThinking();
      dispatch("onHotReloadComplete");
      log(`Hot reload complete (${names.join(", ")})`);
    },
  });

  Instance.OnActivate(() => {
    log(`Starting with ${plugins.length} plugin(s): ${names.join(", ")}`);
    dispatch("init");
    startThinking();
  });
}
