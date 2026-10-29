# WarmupTS

WarmupTS is a TypeScript framework for CS2 gamemodes written with Valve's `cs_script`, the JavaScript
that runs inside a map through a `point_script` entity. You write a gamemode as a list of plugins, and
WarmupTS bundles them into the one script file the map loads.

cs_script lets a script register each engine callback (`Instance.OnPlayerKill`, `Instance.OnRoundEnd`
and so on) only once. WarmupTS registers all of them and hands every event to every plugin, so a
headshot rule and a weapon ladder can both react to the same kill without knowing about each other.
In the local game client, plugins can carry their state across `script_reload`, and the types come
straight from the `point_script.d.ts` Valve ships with CS2.

WarmupTS ships no map and no game content: it is only the script. The map you load it into provides
the `point_script` entity and every other entity a plugin looks up by name.

It's early. The script side works and comes with one complete gamemode. Per-player persistence
(SteamID, SQLite) through a small Metamod:Source extension is planned.

## Getting started

| You need | For |
|---|---|
| [Bun](https://bun.sh) 1.3 or newer (CI runs 1.3.14) | everything |
| CS2 and its Workshop Tools DLC, on Windows | running the script in the game (`tools`, `dev`, `deploy`, `sync-types`) |

Neither CS2 nor Windows is needed for `bun run check` (lint, type check, tests), which is also what CI
runs, so you can clone the repo and change plugins without the game installed.

```bash
git clone https://github.com/Nyx000/warmup-ts.git
cd warmup-ts
bun install
bun run check    # lint, type check and tests; no CS2 needed
bun run tools    # starts CS2 with Workshop Tools and the addon
bun run dev      # rebuilds and copies the script into the addon on every save
```

### Start a new gamemode

```bash
bun create Nyx000/warmup-ts my-gamemode
```

Bun downloads the repo's files without its history, starts a fresh git repo, runs `bun install`, and
the `bun-create` entry in `package.json` drops this repo's `repository`, `bugs` and `homepage` links
from your copy. PistolGG is still in it as the example; follow [Making your own](#making-your-own).

Workshop Tools mounts one addon, named `cs2_gamemode_framework` (`ADDON_NAME` in
`tools/launch-cs2.mjs` and `tools/utils/cs2-path.mjs`), and `bun run tools` assumes it exists. The
script lands in the addon's `scripts` folder as `gamemode.vjs`. Your map needs a `point_script` entity
whose `cs_script` property points at that file. Load it as a custom game
(`game_type 3; game_mode 0; map <your_map>`), and after each save run `script_reload` in the console
to pick up the change.

### On a dedicated server

Development needs Windows, because Workshop Tools only runs there. The finished script runs on Windows
and Linux dedicated servers alike (tested on a Linux server with 10 bots). A dedicated server never
hot reloads: not on a changed file, and not on `script_reload` with cheats on. A changed script takes
effect on the next map change or server restart. A server loads the compiled `.vjs_c`, and
`bun run deploy` deletes the addon's old `.vjs_c` files, so compile the script after every deploy:

```bash
"<CS2>/game/bin/win64/resourcecompiler.exe" -i "<CS2>/content/csgo_addons/cs2_gamemode_framework/scripts/gamemode.vjs"
```

That writes `<CS2>/game/csgo_addons/cs2_gamemode_framework/scripts/gamemode.vjs_c`. Copy it to the
server's `game/csgo/scripts/`, put your map's `.vpk` in `game/csgo/maps/`, and start the server with
`+game_type 3 +game_mode 0 +map <your_map>`. Players need the same map to join.

## The included gamemode

Out of the box you get PistolGG, a free-for-all pistol gun game, headshots only. Three kills move you up a
ladder of nine pistols, four kills on the HE grenade, and then the knife. A knife kill moves you up at once, whatever your
kill count on the current weapon, and a knife kill on the last weapon wins the match: everyone else is
frozen for a short victory lap, then the end screen names the winner: the team everyone plays on
scores a point and takes the winner's name.

Players spawn at random points away from each other, with no freeze time, and a sound plays from each
player as they spawn. A headshot sprays blood, and each kill rings a bell from the victim's head, a step higher
for each kill on the same weapon (wind chimes from the thrower on the grenade); a knife kill plays Arms Race's knife sting with a
chicken on top, and the winner gets a chicken chorus while the map's own chickens burst into feathers in front of
their eyes. The kill sounds and the win fanfare live in `fanfare.ts`. The gamemode
lives in `src/gamemodes/gun-game/`, a name from before it was called PistolGG, and its chat and log
prefix is `[GunGame]`.

### What PistolGG needs from a map

The map provides these entities, and each plugin looks its own up by name:

| Entity name | Class | Settings | Used by |
|---|---|---|---|
| `wts_blood_0` to `wts_blood_11` | `info_particle_system` | "Start Active" off | `headshotBlood` |
| `wts_headshot_sound` | `point_soundevent` | "Re-trigger Stops Last" off, "Entity Index Selection" set to "Use Entity Index" | the kill sounds, or `headshotSound` |
| `wts_spawn_sound` | `point_soundevent` | "Re-trigger Stops Last" off, "Entity Index Selection" set to "Use Entity Index" | `spawnSound` |

The sounds need "Use Entity Index" so they play from the player instead of the map origin, and for
that `pawnTargetName` (`src/core/players.ts`) names each player's pawn `wts_player_<slot>`. Every plugin
works without its entities: it logs the missing name once and skips.

### Spawn lists

`randomSpawns` picks each player's spawn from a list for the current map. A list is an array of
`SpawnPoint`s, a `position` and a `yaw` in degrees (0 faces +x), picked by hand or generated from the
map's nav mesh.

1. Create `src/spawns/<map>.ts` exporting a `SpawnPoint[]`; `src/spawns/de_inferno.ts` is the example.
2. Pass it to the plugin keyed by map name: `randomSpawns({ maps: { <map>: list } })`.

A map without a list falls back to its `info_deathmatch_spawn` entities, and to the normal team
spawns if it has none. `candidates` (default 4) sets how many random points are weighed per spawn.

## How a gamemode is put together

A gamemode is one file: its settings at the top, then its name and plugin list. The settings are
plain values with a comment each, so changing how a match plays never means reading plugin code.
Trimmed from `src/gamemodes/gun-game/gun-game.ts`:

```typescript
// ── Settings: edit these to change how a match plays ──

/** Who plays against whom. */
const TEAMS: TeamRulesConfig = {
  // Everyone joins this team on connect, so nobody picks one
  autoAssign: Teams.CT,
  // "all" is free-for-all, "enemies" is normal CS, "none" turns off player damage
  damage: "all",
};

/** Server settings set when the gamemode starts. Any CS2 console variable can go here. */
const SERVER: Record<string, ConvarValue> = {
  // Seconds of warmup before the match starts
  mp_warmuptime: 10,
  // Seconds everyone stands frozen at the start of a round
  mp_freezetime: 0,
  // Bots stay quiet: no radio calls or chatter
  bot_chatter: "off",
  // 1 mutes the "Fire in the hole" radio call on every grenade throw
  sv_ignoregrenaderadio: 1,
};

const WEAPONS = ["weapon_glock", "weapon_usp_silencer", /* ... */ "weapon_knife"];

/** Sounds played together from each player as they spawn. */
const SPAWN_SOUNDS = ["Player.Respawn", "Chicken.Panic", "Chicken.FlapWings", "Chicken.Fly", "Chicken.Chick.Interact"];

const KILLS_PER_WEAPON = 3;

/** Weapons that need a different number of kills. */
const KILLS_ON = { weapon_hegrenade: 4 };

/** How hard a killing headshot throws the body, one per kill on the same weapon. */
const RAGDOLL_LAUNCHES = [600, 900, 1300].map((speed) => ({ speed, lift: 0 }));

const gunLadder = ladder({
  weapons: WEAPONS,
  killsPerLevel: KILLS_PER_WEAPON,
  killsOn: KILLS_ON,
  // From fanfare.ts: kill sounds, and the chickens and feathers for the winner
  onKillCount: playKillSound,
  onWin: celebrateWin,
});

// ── The gamemode: its name and its plugins, which run in this order ──

export const pistolGG: GamemodeConfig = {
  name: "PistolGG",
  plugins: [
    teamRules(TEAMS),
    convars(SERVER),
    gunLadder,
    devSkip,
    headshotsOnly(),
    ragdollPunch({ launches: RAGDOLL_LAUNCHES, pick: (killer) => gunLadder.killsOnWeapon(killer), hold: 0.1 }),
    headshotBlood(),
    moneyLog(),
    welcome((name) => `Welcome ${name} to PistolGG, running on WarmupTS`),
    randomSpawns({ maps: { de_inferno: deInferno } }),
    spawnSound({ sounds: SPAWN_SOUNDS }),
  ],
};
```

`teamRules` makes everyone an enemy, `ladder` runs the weapon progression and the win, and
`headshotsOnly` cancels bullet damage that isn't to the head. Drop `headshotsOnly()` and it's a normal
gun game. `convars` applies the `SERVER` settings. The rest is extras: `devSkip` lets a lone player type `!grenade` to skip to the grenade, `ragdollPunch` throws a body back on a killing headshot and up on a grenade kill, harder for each kill on the weapon, `headshotBlood` is the headshot
effect, `onKillCount` and `onWin` play the fanfare, `moneyLog` logs each player's money, `welcome` greets each
human player in chat, `randomSpawns` places players and `spawnSound` layers the spawn sounds.
`ladder` also takes an optional `onMatchEnd({ winner, players })`, called after the victory lap and
before the next match starts, for saving match stats.

`src/gamemode.ts` picks which gamemode runs:

```typescript
createGamemode(pistolGG);
```

`createGamemode` takes the `GamemodeConfig`:

| Field | Meaning |
|---|---|
| `name` | Prefix for console logs. |
| `plugins` | Every hook runs through these in list order. Names must be unique: a duplicate throws at startup. |
| `thinkInterval` | Seconds between `onThink` calls and timer checks. Defaults to 0.05. |

A plugin that throws is logged and skipped for that call while the rest carry on. Order matters where
plugins build on each other: `onModifyPlayerDamage` runs as a chain, and `teamRules` goes before any
plugin that reads a player's team in `onPlayerConnect`.

When one plugin needs something from another, the gamemode file passes it in as a setting, the way
`ragdollPunch` gets `pick: (killer) => gunLadder.killsOnWeapon(killer)` above. The link is typed and
sits in the plugin list where you can see it, and neither plugin imports the other.

### Making your own

1. Make a folder in `src/gamemodes/`, with a main file named after it (`my-mode/my-mode.ts`). Copying
   `gun-game/` is the quickest start.
2. In that file, put the settings first, one commented value each, then export the gamemode: its
   name and its plugins, built from those settings.
3. Point `src/gamemode.ts` at it.
4. Run `bun run check`, then `bun run dev` to try it in the game.

Plugins only your gamemode uses go in its folder. When a second gamemode needs one, move it to
`src/plugins/`, under the category that fits (each category folder has a short README).

```
src/
├── gamemode.ts          entry point: picks the gamemode
├── core/                the framework: plugin contract, gamemode runtime, player stores, timers, convars, rules, chat commands and `say`
├── gamemodes/
│   └── gun-game/        gun-game.ts (the gamemode), ladder.ts (its main plugin)
├── plugins/             shared plugins: combat, loadout, players, economy, world, hud, dev
├── spawns/              per-map spawn lists for randomSpawns
└── types/cs_script.d.ts Valve's API types, synced from your CS2 install
tests/                   every test, plus the fake cs_script runtime they run against
tools/                   build, deploy, launch and type-sync scripts behind the bun run commands
dist/                    build output (gamemode.vjs), not committed
```

## Writing a plugin

A plugin is an object with a `name` and whichever hooks it needs. All hooks are optional. The smallest
useful one announces each kill in chat; put it in `src/plugins/hud/kill-feed.ts`:

```typescript
import { say } from "../../core/chat";
import type { Plugin } from "../../core/plugin";

export function killFeed(): Plugin {
  return {
    name: "killFeed",
    onPlayerKill({ player }) {
      const victim = player.GetPlayerController()?.GetPlayerName() ?? "someone";
      say(`${victim} was killed`);
    },
  };
}
```

Add `killFeed()` to your gamemode's `plugins` list and run `bun run dev`. `say` sends a line to
everyone and strips the quotes and semicolons that would end the console command early.

A chat command needs no plugin of your own: `commands()` from `src/core/chat.ts` builds one. It matches
the first word of a chat line case-insensitively, and the rest of the line arrives split into `args`:

```typescript
commands({ "!rules": ({ player }) => say(`${player.GetPlayerName()}: headshots only`) }),
```

The engine can't hide a chat line, so everyone still sees `!rules`. `src/plugins/dev/example.ts` is a longer template with
saved state, and `debug()` from `src/plugins/dev/debug.ts` logs every event as it fires.

### If you know GMod, SourceMod or FiveM

| When | WarmupTS | Elsewhere |
|---|---|---|
| A player connects | `onPlayerConnect` (no `player` for a bot), `onPlayerActivate` once they are in | GMod `PlayerInitialSpawn`, SourceMod `OnClientPutInServer`, FiveM `playerJoining` |
| A player leaves | `onPlayerDisconnect({ playerSlot })` | `PlayerDisconnected`, `OnClientDisconnect`, `playerDropped` |
| A player spawns | `onPlayerReset({ player })`, a pawn | `PlayerSpawn`, `player_spawn`, `playerSpawned` |
| A player dies | `onPlayerKill({ player, attacker, weapon })`; `player` is the victim | `PlayerDeath`, `player_death`, `baseevents:onPlayerDied` |
| A player takes damage | `onPlayerDamage` to observe; `onModifyPlayerDamage` to change it | `EntityTakeDamage`, SDKHooks `OnTakeDamage` |
| A player chats | `onPlayerChat({ player, text })`, or `commands()` for `!words` | `PlayerSay`, `OnClientSayCommand` or `RegConsoleCmd`, `RegisterCommand` |
| A round starts or ends | `onRoundStart`, `onRoundEnd({ winningTeam, reason })` | `round_start`, `round_end` |
| Freeze time or warmup ends | `onFreezeTimeEnd`, `onWarmupEnd` | `round_freeze_end` |
| Every tick | `onThink` (every `thinkInterval`, 0.05 s by default) | `Think`, `OnGameFrame`, a `CreateThread` loop |
| Later, or repeatedly | `after()` and `every()` from `src/core/timers.ts` | `timer.Simple`, `CreateTimer`, `SetTimeout` |

Unlike in GMod or SourceMod, a hook's return value is ignored, and returning one fails to compile.
`onModifyPlayerDamage` is the exception: return `{ abort: true }` to cancel the damage, or a new
`damage` to change it.

The hooks that belong to the plugin itself:

| Hook | When it runs |
|---|---|
| `init()` | On map load, and again after a hot reload. Start timers and apply settings here. |
| `dispose()` | Before a hot reload: stop whatever `init()` started. |
| `saveState()`, `restoreState(state)` | Plain data carried across a hot reload. Entities don't survive one; store names. |
| `onHotReloadComplete()` | After a hot reload. `onPlayerActivate` doesn't fire again for players already connected. |
| `onThink()` | Every think tick, `thinkInterval` seconds apart. |
| `onFreezeTimeEnd()`, `onWarmupEnd()` | See below. |

Every other hook is a Valve callback with `on` in front: `Instance.OnPlayerKill` becomes `onPlayerKill`.
`ENGINE_EVENTS` in `src/core/plugin.ts` lists all 37, and `cs_script.d.ts` documents each event's
fields. Each hook gets Valve's event object unchanged: `Instance.OnRoundEnd` becomes
`onRoundEnd({ winningTeam, reason })`. A few behave differently:

- `onModifyPlayerDamage` is a chain. Each plugin sees the damage as the plugins before it left it, and
  returning `abort` stops it there.
- `Instance.OnScriptInput` is keyed by input name, so a plugin registers it itself in `init()`.
- `Instance.SetThink`, `SetNextThink` and every other `Instance.On*` callback belong to `createGamemode`:
  cs_script refuses a second registration, so a plugin's own would fail; the lint rejects it outside `src/core/`.
- `onFreezeTimeEnd` and `onWarmupEnd` have no engine event behind them. They fire when the think loop
  sees `GameRules.IsFreezePeriod()` or `GameRules.IsWarmupPeriod()` turn false.
- The `player` in an event is not always the same type: `onPlayerConnect` and `onPlayerActivate` give a
  `CSPlayerController`, while `onPlayerReset` and `onPlayerTeamChanged` give a `CSPlayerPawn`. The engine
  also sends some `onPlayerConnect` events (a bot joining) with no `player`, so check before using it.

### Per-player data and timers

Data kept per player goes in a `playerStore()`, a `Map` keyed by player slot. List it under `players` on
the plugin and the gamemode drops a player's entry when they disconnect and carries the rest across
`script_reload`, so there's no `saveState` to write for it. A store holding something that isn't plain
data, such as a timer, takes `{ persist: false }`. `connectedPlayers()` lists the players currently on
the server.

```typescript
import { CSPlayerPawn } from "cs_script/point_script";
import { playerStore } from "../../core/players";
import type { Plugin } from "../../core/plugin";

export function killCount(): Plugin {
  const kills = playerStore<number>();
  return {
    name: "killCount",
    players: { kills },
    onPlayerKill({ attacker }) {
      const slot = attacker instanceof CSPlayerPawn ? attacker.GetPlayerController()?.GetPlayerSlot() : undefined;
      if (slot !== undefined) kills.set(slot, (kills.get(slot) ?? 0) + 1);
    },
  };
}
```

`after(seconds, fn)` and `every(seconds, fn)`, from `src/core/timers.ts`, run a function later or
repeatedly from the gamemode's think loop and return a timer to `cancel()`. A reload cancels every
timer, so start the ones a plugin needs in `init()`.

### Server settings and team rules

Without `teamRules`, `convars` or `serverCommands`, WarmupTS leaves the server's rules alone.

`convars({ mp_freezetime: 0, mp_t_default_secondary: "" })` sets server settings and then reads each one
back. The console shows which way they were set (`Console.SetConvar`, or `Console.ServerCommand` on a CS2
build without it) and names every setting the server did not take. Use `serverCommands` for anything
that is a command rather than a convar.

A gamemode can list `convars()` more than once: each is named after its label, first setting and
count, so two lists don't clash. A plugin with settings of its own
calls `convars(values, "myPlugin")` inside itself and forwards `init()` and `onThink()` to it, as
`ladder` does; the second argument is the log prefix.

`teamRules` takes three options and also turns off team balancing and team limits, which would fight a
gamemode that places players itself:

| Option | Meaning |
|---|---|
| `autoAssign` | `Teams.CT` or `Teams.TERRORIST`: every connecting player joins this team, skipping team selection. |
| `damage` | `"enemies"` (the default, as in normal CS), `"all"` for free-for-all, or `"none"`. |
| `friendlyFire` | Only with `damage: "enemies"`. Defaults to `false`. |

## Things that will bite you

**The map provides your entities.** A plugin that needs a door or a trigger finds it by
name, so the map has to provide an entity named `door`. Say in the plugin's top comment which names it
expects.

**Entity references don't survive a reload.** Keep names and look the entity up again when you need
it:

```typescript
const door = Instance.FindEntityByName("door");
if (door?.IsValid()) Instance.EntFireAtTarget({ target: door, input: "Open" });
```

**If it isn't in `cs_script.d.ts`, it doesn't exist.** Anything the file marks `@deprecated` fails the
lint, because Valve removes those in later updates. After a CS2 update, `bun run sync-types` pulls the
new file, and `bun run check` fails until any new `On*` callback is added to `ENGINE_EVENTS` in
`src/core/plugin.ts`.

**Use the think loop for timed work.** `Instance.Delay()` works with `await`, but a pending delay can't
be cancelled and its behaviour across a reload is undocumented. Use `after()` and `every()`, or
`onThink()`, and never call `Instance.SetThink` from a plugin: the gamemode owns it.

## Testing

`bun test` runs the files in `tests/`. `bunfig.toml` preloads `tests/preload.ts`, which swaps the
`cs_script/point_script` module for the fake in `tests/fake-point-script.ts` and resets it before every
test. A test builds a gamemode from the plugin under test, then drives the fake:

```typescript
import { expect, test } from "bun:test";
import { CSDamageTypes, CSHitGroup } from "cs_script/point_script";
import { createGamemode } from "../src/core/gamemode";
import { headshotsOnly } from "../src/plugins/combat/headshots-only";
import { engine } from "./fake-point-script";

test("a bullet to the chest does no damage", () => {
  createGamemode({ name: "Test", plugins: [headshotsOnly()] });
  engine.activate();
  const hit = { damage: 100, damageTypes: CSDamageTypes.BULLET, damageFlags: 0, hitGroup: CSHitGroup.CHEST };
  expect(engine.fire("OnModifyPlayerDamage", hit)).toEqual({ abort: true });
});
```

| `engine` member | Use |
|---|---|
| `activate()` | Fires `OnActivate`, which runs every plugin's `init()`. |
| `fire(event, arg)` | Runs the callback the gamemode registered for an `Instance.On*` event and returns its result. |
| `tick(seconds)` | Moves game time forward and runs the think loop once if it is due. |
| `addPlayer(name)` | Adds a connected player and returns its controller (`.pawn` is the pawn). |
| `reload(load)` | A `script_reload`: the old script's save step, a fresh `load()`, then the new script's restore step. |
| `logs`, `commands`, `convars`, `roundEnds`, `grenades` | What the script logged, ran and set. |
| `freezePeriod`, `warmupPeriod` | What `GameRules.IsFreezePeriod()` and `IsWarmupPeriod()` return. |
| `entities` | Map entities by name, which `Instance.FindEntityByName` and `FindEntitiesByName` find. |
| `classes` | Map entities by class name, which `Instance.FindEntitiesByClass` finds. |
| `mapName` | What `Instance.GetMapName()` returns. |
| `inputs` | Every `Instance.EntFireAtTarget` call, as `{ target, input, value }`. |
| `scores` | Every `GameRules.AddTeamScore` call, as `[team, score]`. |
| `refused`, `booleans`, `unsupported` | Make the fake behave like a server that refuses a convar, or a CS2 build that lacks an API. |

The fake is enough of the engine for the framework and its plugins to run under `bun test`, not a game
simulation. A test proves your plugin reacts correctly to an event, not that the engine sends it, so
check new behaviour in the game as well. When a plugin calls an engine method the fake lacks, add it
to the fake.

`bun run lint` runs ESLint, which also rejects `@deprecated` Valve APIs and `Instance.On*` registrations
outside `src/core/`; `bun run format` is the same run with `--fix`. There is no script of its own for
the type check: `tsc --noEmit` runs inside `bun run build` and `bun run check`, or run it directly with
`bunx tsc --noEmit`. CI runs `bun run check` on every push and pull request.

## Commands

| Command | What it does |
|---|---|
| `bun run tools` | Start CS2 with Workshop Tools and the addon (`-condebug` writes the console to `game/csgo/console.log`); Windows only |
| `bun run dev` | Rebuild and copy the script into the addon on every save |
| `bun run build` | Type check and build `dist/gamemode.vjs` once |
| `bun run deploy` | Build once without the type check, delete the addon's compiled `.vjs_c` files and copy the script into the addon |
| `bun run check` | Lint, type check and run the tests |
| `bun test` | Tests only, against a fake cs_script runtime |
| `bun run lint`, `bun run format` | ESLint on `src/` and `tests/`; `format` also fixes what it can |
| `bun run sync-types` | Update `src/types/cs_script.d.ts` from your CS2 install |
| `bun run clean` | Delete the built `.js` and `.vjs` files from `dist/` |

`tools`, `dev`, `deploy` and `sync-types` find CS2 by looking for the `Counter-Strike Global Offensive`
folder (the one with `game/` inside) under `steamapps/common` in `C:\Program Files (x86)\Steam`,
`C:\Program Files\Steam` and `D:\SteamLibrary`, `E:\SteamLibrary` and `F:\SteamLibrary`. Set
`CS2_INSTALL_PATH` to that folder if CS2 is anywhere else.

## License

[MIT](LICENSE)
