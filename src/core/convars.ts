/**
 * Typed server settings. Each value is set, then read back, so a setting the server
 * refused shows up in the console instead of silently leaving the old value in place.
 */

import { Console } from "cs_script/point_script";
import type { Plugin } from "./plugin";

export type ConvarValue = number | boolean | string;

export interface ConvarsPlugin extends Plugin {
  init(): undefined;
  onThink(): undefined;
}

// The readback happens on the first think after init(), not inside it: ServerCommand may
// only queue the command, and a read right after would report the old value as a refusal.
// `label` is the log prefix. The plugin's name adds the first setting and the count, so a
// gamemode can list convars() more than once without tripping the duplicate-name check.
export function convars(values: Record<string, ConvarValue>, label = "convars"): ConvarsPlugin {
  const log = (message: string) => Console.Log(`[${label}] ${message}`);
  const entries = Object.entries(values);
  let unverified = new Set<string>();
  let path = "";

  return {
    name: `${label}:${entries[0]?.[0] ?? ""}+${entries.length}`,

    init() {
      // The synced types can be newer than the CS2 build running the script
      const direct = typeof Console.SetConvar === "function";
      path = direct ? "Console.SetConvar" : "Console.ServerCommand";
      log(`Setting ${entries.length} convars with ${path}${direct ? "" : " (Console.SetConvar doesn't exist in this CS2 build)"}`);
      unverified = new Set(Object.keys(values));
      for (const [name, value] of entries) {
        try {
          if (direct) Console.SetConvar(name, value);
          else Console.ServerCommand(`${name} ${typeof value === "string" ? `"${value}"` : Number(value)}`);
        } catch (error) {
          unverified.delete(name);
          log(`${name} was refused by ${path}: ${error}`);
        }
      }
    },

    onThink() {
      if (unverified.size === 0) return;
      const names = [...unverified];
      unverified = new Set();
      const failed = names.filter((name) => {
        const wanted = values[name];
        const actual = readBack(name, wanted);
        if (matches(wanted, actual)) return false;
        log(`${name} did not take: wanted ${JSON.stringify(wanted)}, server has ${actual === undefined ? "nothing readable" : JSON.stringify(actual)}`);
        return true;
      });
      log(failed.length === 0 ? `All ${names.length} convars read back as set (${path})` : `${failed.length} of ${names.length} convars did not take (${path})`);
    },
  };
}

function readBack(name: string, wanted: ConvarValue): ConvarValue | undefined {
  // On/off convars take 0 and 1 but read back only as booleans (measured 2026-10-28)
  if (typeof wanted === "number") return Console.GetConvarNumber(name) ?? Console.GetConvarBoolean(name);
  if (typeof wanted === "boolean") return Console.GetConvarBoolean(name);
  return Console.GetConvarString(name);
}

// Floats come back rounded to what the convar stores
function matches(wanted: ConvarValue, actual: ConvarValue | undefined): boolean {
  if (typeof wanted === "number" && typeof actual === "number") return Math.abs(wanted - actual) < 1e-4;
  if (typeof wanted === "number" && typeof actual === "boolean") return (wanted !== 0) === actual;
  return wanted === actual;
}
