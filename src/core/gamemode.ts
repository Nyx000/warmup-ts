/**
 * Gamemode runtime: owns every Instance callback and runs the plugins, in list order.
 */

import { Console, GameRules, Instance } from "cs_script/point_script";
import type { ModfiyPlayerDamageResult, ModifyPlayerDamageEvent } from "cs_script/point_script";
import { ENGINE_EVENTS, Plugin } from "./plugin";

export interface GamemodeConfig {
  /** Prefix for console logs. */
  name: string;
  /** Every hook runs through these in order. */
  plugins: Plugin[];
  /** Seconds between onThink calls. */
  thinkInterval?: number;
}

type Hook = Exclude<keyof Plugin, "name">;

/**
 * Call at the top level of the entry script, not inside a callback: a hot reload clears
 * every registered callback and OnActivate doesn't fire again (Valve's samples do the same).
 */
export function createGamemode({ name, plugins, thinkInterval = 0.05 }: GamemodeConfig): void {
  const log = (message: string) => Console.Log(`[${name}] ${message}`);

  const names = plugins.map((plugin) => plugin.name);
  const duplicate = names.find((pluginName, index) => names.indexOf(pluginName) !== index);
  if (duplicate) throw new Error(`[${name}] Two plugins are named "${duplicate}"`);

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
    register.call(Instance, (arg) => dispatch(hook, arg));
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

  let wasFreezePeriod = false;

  Instance.SetThink(() => {
    // Schedule first, so nothing below can stop the loop
    Instance.SetNextThink(Instance.GetGameTime() + thinkInterval);

    const isFreezePeriod = GameRules.IsFreezePeriod();
    if (wasFreezePeriod && !isFreezePeriod) dispatch("onFreezeTimeEnd");
    wasFreezePeriod = isFreezePeriod;

    dispatch("onThink");
  });

  function startThinking(): void {
    wasFreezePeriod = GameRules.IsFreezePeriod();
    Instance.SetNextThink(Instance.GetGameTime());
  }

  // before runs in the old script, after in the newly loaded one
  Instance.OnScriptReload<Record<string, unknown>>({
    before: () => {
      Instance.SetNextThink(-1);
      dispatch("dispose");
      const saved: Record<string, unknown> = {};
      for (const plugin of plugins) {
        if (plugin.saveState) saved[plugin.name] = call(plugin, "saveState");
      }
      return saved;
    },
    after: (saved) => {
      for (const plugin of plugins) {
        if (saved?.[plugin.name] !== undefined) call(plugin, "restoreState", saved[plugin.name]);
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
