/**
 * Plugin contract.
 *
 * A plugin is a plain object with a name and the hooks it needs. Engine hooks mirror
 * Valve's Instance.On* callbacks (`OnRoundEnd` becomes `onRoundEnd`) and receive
 * Valve's event object unchanged, so cs_script.d.ts documents every hook's argument.
 */

import type { CSPlayerController, IPointScript } from "cs_script/point_script";
import type { PlayerStore } from "./players";

/**
 * The Instance callbacks the gamemode registers once and passes to every plugin.
 * OnActivate and OnScriptReload drive the plugin lifecycle instead, and OnScriptInput
 * is keyed by input name, so plugins register it themselves in init().
 */
export const ENGINE_EVENTS = [
  "OnPlayerConnect",
  "OnPlayerActivate",
  "OnPlayerDisconnect",
  "OnPlayerReset",
  "OnPlayerTeamChanged",
  "OnPlayerJump",
  "OnPlayerLand",
  "OnPlayerChat",
  "OnPlayerPing",
  "OnPlayerDamage",
  "OnModifyPlayerDamage",
  "OnPlayerKill",
  "OnCustomHudClicked",
  "OnRoundStart",
  "OnRoundEnd",
  "OnBeginRoundRestart",
  "OnBombPlantStart",
  "OnBombPlantAbort",
  "OnBombPlant",
  "OnBombDefuseStart",
  "OnBombDefuseAbort",
  "OnBombDefuse",
  "OnBombExplode",
  "OnHostagePickUpStart",
  "OnHostagePickUpAbort",
  "OnHostagePickUp",
  "OnHostageDrop",
  "OnHostageRescue",
  "OnHostageKill",
  "OnGunReload",
  "OnGunFire",
  "OnBulletImpact",
  "OnWeaponDrop",
  "OnWeaponPickup",
  "OnGrenadeThrow",
  "OnGrenadeBounce",
  "OnKnifeAttack",
] as const satisfies readonly (keyof IPointScript)[];

export type EngineEvent = (typeof ENGINE_EVENTS)[number];

type NotDispatched =
  | "OnActivate"
  | "OnScriptReload"
  | "OnScriptInput"
  // Deprecated by Valve
  | "OnBeforePlayerDamage"
  | "OnBeforeReload"
  | "OnReload";

type Undispatched = Exclude<Extract<keyof IPointScript, `On${string}`>, EngineEvent | NotDispatched>;
type MustBeEmpty<T extends never> = T;
/** Fails to compile when a type sync brings an Instance.On* callback ENGINE_EVENTS doesn't list. */
export type EveryEngineEventDispatched = MustBeEmpty<Undispatched>;

// The dispatcher drops every return value except onModifyPlayerDamage's, so the rest
// return undefined: a stray `return true` fails to compile instead of silently doing nothing.
// The engine sends OnPlayerConnect for bots without a player (measured 2026-10-27), which Valve's typings omit.
type Handler<K extends EngineEvent> = K extends "OnModifyPlayerDamage"
  ? Parameters<IPointScript[K]>[0]
  : (...args: K extends "OnPlayerConnect" ? [event: { player?: CSPlayerController }] : Parameters<Parameters<IPointScript[K]>[0]>) => undefined;

export type EngineHooks = {
  [K in EngineEvent as Uncapitalize<K>]?: Handler<K>;
};

export interface Plugin<TState = unknown> extends EngineHooks {
  /** Unique within a gamemode; keys saved state and prefixes error logs. */
  name: string;

  /** Names of plugins that must be in the list, earlier than this one; createGamemode throws otherwise. */
  requires?: string[];

  /** Map load, and again after every hot reload. */
  init?(): undefined;

  /** Before a hot reload: stop whatever init() started. */
  dispose?(): undefined;

  /** Plain data to carry across a hot reload. Entities don't survive one; store names. */
  saveState?(): TState;
  restoreState?(state: TState): undefined;

  /**
   * Per-player data. An entry goes when its player disconnects (after onPlayerDisconnect
   * has run), and persistent stores are carried across a hot reload like saveState.
   */
  players?: Record<string, PlayerStore<unknown>>;

  /** After a hot reload. onPlayerActivate doesn't fire again for players already connected. */
  onHotReloadComplete?(): undefined;

  /** Every think tick (GamemodeConfig.thinkInterval). */
  onThink?(): undefined;

  /** cs_script has no callback for this; the think loop watches GameRules.IsFreezePeriod(). */
  onFreezeTimeEnd?(): undefined;

  /** Likewise for GameRules.IsWarmupPeriod(). */
  onWarmupEnd?(): undefined;
}
