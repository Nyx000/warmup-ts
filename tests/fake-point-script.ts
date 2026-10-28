/**
 * Test double for the cs_script/point_script module: enough of the engine for the framework
 * and its plugins to run under `bun test`. preload.ts installs it in place of the real
 * module; tests drive it through `engine`. It is not a game simulation.
 */

// Values from cs_script.d.ts; declared first because the pawn class reads it
export const CSMoveType = {
  INVALID: -1, NONE: 0, WALK: 1, FLYGRAVITY: 2, VPHYSICS: 3, NOCLIP: 4, OBSERVER: 5, LADDER: 6, CUSTOM: 7,
} as const;

interface ReloadHandlers {
  before?: () => unknown;
  after?: (memory: unknown) => void;
}

const callbacks = new Map<string, unknown>();
const players: CSPlayerController[] = [];
let think: (() => void) | undefined;
let nextThink = -1;
let time = 0;

export class CSPlayerPawn {
  weapons: string[] = [];
  alive = true;
  team = 2;
  moveType: number = CSMoveType.WALK;
  position = { x: 0, y: 0, z: 0 };
  glowing = false;
  /** CSInputs bits held down. */
  inputs = 0;

  constructor(private readonly controller: CSPlayerController) {}

  IsValid() { return true; }
  IsAlive() { return this.alive; }
  GetTeamNumber() { return this.team; }
  GetMoveType() { return this.moveType; }
  SetMoveType(moveType: number) { this.moveType = moveType; }
  GetAbsOrigin() { return { ...this.position }; }
  Teleport({ position }: { position?: { x: number; y: number; z: number } }) { if (position) this.position = { ...position }; }
  Glow() { this.glowing = true; }
  Unglow() { this.glowing = false; }
  GetPlayerController() { return this.controller; }
  IsInputPressed(inputs: number) { return (this.inputs & inputs) !== 0; }
  DestroyWeapons() { this.weapons = []; }
  GiveNamedItem(name: string) { this.weapons.push(name); }
}

export class CSPlayerController {
  team = 0;
  bot = false;
  readonly pawn = new CSPlayerPawn(this);

  constructor(private readonly slot: number, private readonly name: string) {}

  IsValid() { return true; }
  GetPlayerSlot() { return this.slot; }
  GetPlayerName() { return this.name; }
  IsBot() { return this.bot; }
  /** false once the player has left, though the controller stays in the list. */
  connected = true;
  IsConnected() { return this.connected; }
  GetPlayerPawn() { return this.pawn; }
  JoinTeam(team: number) { this.team = team; }
}

export const engine = {
  /** Console.Log lines, in order. */
  logs: [] as string[],
  /** Console.ServerCommand commands, in order. */
  commands: [] as string[],
  freezePeriod: false,
  warmupPeriod: false,
  /** Convar values, set by Console.SetConvar or by a "name value" Console.ServerCommand. */
  convars: new Map<string, unknown>(),
  /** Convars the server ignores writes to, as a protected one would. */
  refused: new Set<string>(),
  /** On/off convars: like the real server, GetConvarNumber can't read them. */
  booleans: new Set<string>(),
  /** GameRules.TerminateRound calls: [reason, delay]. */
  roundEnds: [] as [number, number | undefined][],
  /** Instance.SpawnGrenadeProjectile configs, in order. */
  grenades: [] as { type: number; thrower?: CSPlayerPawn; throwStrength?: number }[],
  /** Instance.On* callbacks and "Console.<method>" names to leave out, as an older CS2 build would. */
  unsupported: new Set<string>(),

  reset(): void {
    callbacks.clear();
    players.length = 0;
    think = undefined;
    nextThink = -1;
    time = 0;
    this.logs.length = 0;
    this.commands.length = 0;
    this.freezePeriod = false;
    this.warmupPeriod = false;
    this.roundEnds.length = 0;
    this.grenades.length = 0;
    this.convars.clear();
    this.refused.clear();
    this.booleans.clear();
    this.unsupported.clear();
  },

  /** Runs the callback the script registered for an Instance.On* event; returns its result. */
  fire(event: string, arg?: unknown): unknown {
    const callback = callbacks.get(event);
    if (typeof callback !== "function") throw new Error(`Nothing registered for Instance.${event}`);
    return callback(arg);
  },

  activate(): void {
    this.fire("OnActivate");
  },

  /** Moves game time forward, then runs the think callback once if it is due. */
  tick(seconds = 1): void {
    time += seconds;
    if (think && nextThink >= 0 && nextThink <= time) think();
  },

  /** script_reload: the old script's `before`, a fresh load with no callbacks, then the new `after`. */
  reload(load: () => void): void {
    const memory = (callbacks.get("OnScriptReload") as ReloadHandlers | undefined)?.before?.();
    callbacks.clear();
    think = undefined;
    load();
    (callbacks.get("OnScriptReload") as ReloadHandlers | undefined)?.after?.(memory);
  },

  addPlayer(name: string): CSPlayerController {
    const controller = new CSPlayerController(players.length, name);
    players.push(controller);
    return controller;
  },
};

const instanceMethods: Record<string, unknown> = {
  SetThink(callback: () => void) { think = callback; },
  SetNextThink(at: number) { nextThink = at; },
  GetGameTime: () => time,
  GetAllPlayerControllers: () => [...players],
  GetPlayerController: (slot: number) => players.find((player) => player.GetPlayerSlot() === slot),
  SpawnGrenadeProjectile: (config: (typeof engine.grenades)[number]) => void engine.grenades.push(config),
};

// Every Instance.On* takes one registration, as in CS2: a second one throws
export const Instance = new Proxy(instanceMethods, {
  get(target, key) {
    if (typeof key !== "string" || !key.startsWith("On")) return target[key as string];
    if (engine.unsupported.has(key)) return undefined;
    return (callback: unknown) => {
      if (callbacks.has(key)) throw new Error(`Instance.${key} is already registered`);
      callbacks.set(key, callback);
    };
  },
});

function setConvar(name: string, value: unknown): void {
  if (!engine.refused.has(name)) engine.convars.set(name, value);
}

const consoleMethods: Record<string, unknown> = {
  Log: (message: string) => void engine.logs.push(message),
  ServerCommand(command: string) {
    engine.commands.push(command);
    const [, name, value] = command.match(/^(\S+) "?(.*?)"?$/) ?? [];
    if (name) setConvar(name, value);
  },
  SetConvar: setConvar,
  GetConvarNumber: (name: string) =>
    engine.convars.has(name) && !engine.booleans.has(name) ? Number(engine.convars.get(name)) : undefined,
  GetConvarBoolean: (name: string) => (engine.convars.has(name) ? Number(engine.convars.get(name)) !== 0 : undefined),
  GetConvarString: (name: string) => (engine.convars.has(name) ? String(engine.convars.get(name)) : undefined),
};

export const Console = new Proxy(consoleMethods, {
  get: (target, key) => (engine.unsupported.has(`Console.${String(key)}`) ? undefined : target[key as string]),
});

export const GameRules = {
  IsFreezePeriod: () => engine.freezePeriod,
  IsWarmupPeriod: () => engine.warmupPeriod,
  GetRoundsPlayed: () => 0,
  SetRoundRemainingTime: () => {},
  TerminateRound: (reason: number, delay?: number) => void engine.roundEnds.push([reason, delay]),
};

/** A weapon as event objects carry it: only its type is read. */
export function weapon(type: number) {
  return { GetData: () => ({ GetType: () => type }) };
}

// Values from cs_script.d.ts
export const CSDamageTypes = {
  GENERIC: 0, CRUSH: 1 << 0, BULLET: 1 << 1, SLASH: 1 << 2, BURN: 1 << 3, VEHICLE: 1 << 4, FALL: 1 << 5,
  BLAST: 1 << 6, CLUB: 1 << 7, SHOCK: 1 << 8, SONIC: 1 << 9, BUCKSHOT: 1 << 10, DROWN: 1 << 11,
  POISON: 1 << 12, HEADSHOT: 1 << 13,
} as const;

export const CSWeaponType = {
  KNIFE: 0, PISTOL: 1, SUBMACHINEGUN: 2, RIFLE: 3, SHOTGUN: 4, SNIPER_RIFLE: 5, MACHINEGUN: 6, C4: 7, TASER: 8,
  GRENADE: 9, EQUIPMENT: 10, STACKABLEITEM: 11, UNKNOWN: 12,
} as const;

export const CSRoundEndReason = {
  UNKNOWN: -1, IN_PROGRESS: 0, GAME_COMMENCING: 1, DRAW: 2, TARGET_BOMBED: 3, TARGET_SAVED: 4, BOMB_DEFUSED: 5,
  HOSTAGES_RESCUED: 6, HOSTAGES_NOT_RESCUED: 7, CTS_WIN: 8, TERRORISTS_WIN: 9, CTS_SURRENDER: 10,
  TERRORISTS_SURRENDER: 11,
} as const;

export const CSInputs = {
  NONE: 0, FORWARD: 1 << 0, BACK: 1 << 1, LEFT: 1 << 2, RIGHT: 1 << 3, WALK: 1 << 4, DUCK: 1 << 5, JUMP: 1 << 6,
  USE: 1 << 7, ATTACK: 1 << 8, ATTACK2: 1 << 9, RELOAD: 1 << 10, SHOW_SCORES: 1 << 11, LOOK_AT_WEAPON: 1 << 12,
} as const;

export const CSGrenadeType = { HE: 0, FLASHBANG: 1, MOLOTOV: 2, INCENDIARY: 3, DECOY: 4, SMOKE: 5 } as const;

export const CSHitGroup = {
  INVALID: -1, GENERIC: 0, HEAD: 1, CHEST: 2, STOMACH: 3, LEFTARM: 4, RIGHTARM: 5, LEFTLEG: 6, RIGHTLEG: 7,
  NECK: 8,
} as const;
