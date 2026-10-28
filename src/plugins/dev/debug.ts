/**
 * Logs every engine event and its fields to the console.
 */

import { Console } from "cs_script/point_script";
import { ENGINE_EVENTS, EngineEvent, Plugin } from "../../core/plugin";

export interface DebugConfig {
  /** Events to leave out, e.g. ["OnGunFire", "OnBulletImpact"] for less noise. */
  skip?: EngineEvent[];
}

export function debug({ skip = [] }: DebugConfig = {}): Plugin {
  const plugin: Plugin = {
    name: "debug",
    onFreezeTimeEnd: () => Console.Log("[Debug] FreezeTimeEnd"),
  };

  // OnModifyPlayerDamage is left out: a hook there takes part in deciding the damage
  for (const event of ENGINE_EVENTS) {
    if (event === "OnModifyPlayerDamage" || skip.includes(event)) continue;
    const label = event.slice(2);
    (plugin as unknown as Record<string, (arg?: object) => void>)[`on${label}`] = (arg) =>
      Console.Log(`[Debug] ${label} ${describe(arg)}`);
  }

  return plugin;
}

function describe(event?: object): string {
  if (!event) return "";
  return Object.entries(event)
    .map(([key, value]) => `${key}=${describeValue(value)}`)
    .join(" ");
}

interface EntityLike {
  IsValid(): boolean;
  GetClassName(): string;
  GetPlayerName?(): string;
  GetPlayerController?(): EntityLike | undefined;
}

function describeValue(value: unknown): string {
  if (typeof value !== "object" || value === null) return String(value);

  if ("IsValid" in value) {
    const entity = value as EntityLike;
    if (!entity.IsValid()) return "<invalid>";
    const controller = entity.GetPlayerController?.();
    const playerName = entity.GetPlayerName?.() ?? (controller?.IsValid() ? controller.GetPlayerName?.() : undefined);
    return playerName ? `${entity.GetClassName()}(${playerName})` : entity.GetClassName();
  }

  if ("x" in value && "y" in value && "z" in value) {
    const { x, y, z } = value as { x: number; y: number; z: number };
    return `(${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)})`;
  }

  return JSON.stringify(value);
}
