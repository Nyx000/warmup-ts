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

It's early. The script side works and comes with a small example gamemode, free-for-all. PistolGG, the
headshot-only gun game on the public WarmupTS server, is a separate gamemode built on it. Per-player persistence
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
from your copy. The free-for-all example is in it as a starting point; follow [Making your own](#making-your-own).

To keep a gamemode in a repo of its own instead, add WarmupTS to it as a git submodule, keep the entry
point at `src/gamemode.ts`, and run the build tools with `--root .`, for example
`bun vendor/warmup-ts/tools/build/dev.mjs --root .`; they use that repo's `src/`, `dist/` and
`server.config.json`.

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

Out of the box you get free-for-all: everyone joins CT with no team pick, everyone can damage everyone,
there is no freeze time, and on de_inferno players spawn at random points away from each other. It
lives in `src/gamemodes/free-for-all/` and is kept small on purpose: it is the example to copy, not a
finished game.

### What plugins need from a map

A plugin that plays something from a player looks its entity up by name, and the map provides it:

| Entity name | Class | Settings | Used by |
|---|---|---|---|
| `wts_spawn_sound` | `point_soundevent` | "Re-trigger Stops Last" off, "Entity Index Selection" set to "Use Entity Index" | `spawnSound` |

The sound needs "Use Entity Index" so it plays from the player instead of the map origin, and for
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
`src/gamemodes/free-for-all/free-for-all.ts`, with its imports left out:

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
};

// ── The gamemode: its name and its plugins, which run in this order ──

export const freeForAll: GamemodeConfig = {
  name: "Free-for-all",
  plugins: [
    teamRules(TEAMS),
    convars(SERVER),
    welcome((name) => `Welcome ${name}, running on WarmupTS`),
    randomSpawns({ maps: { de_inferno: deInferno } }),
    example(),
  ],
};
```

`teamRules` makes everyone an enemy and `convars` applies the `SERVER` settings. `welcome` greets each
human player in chat, `randomSpawns` places players, and `example` is the plugin template from
`src/plugins/example.ts`. The other plugins in `src/plugins/` slot into the same list: `money` pays
in-game money for kills and logs each payment to a human as a `[money] slot=N +5 kill` line,
`mapRotation` moves to another Active Duty map after each match or when most players type `!rtv`,
`spawnSound` plays sounds from each player as they spawn, `repeatMessage` posts a chat line on a timer,
and `debug` logs every event as it fires.

`src/gamemode.ts` picks which gamemode runs:

```typescript
createGamemode(freeForAll);
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

When one plugin needs something from another, the gamemode file passes it in as a setting: a plugin
that scales an effect by kill count takes a `pick: (killer) => number` option, and the gamemode hands it
the function from the plugin that counts. The link is typed and sits in the plugin list where you can
see it, and neither plugin imports the other.

### Making your own

1. Make a folder in `src/gamemodes/`, with a main file named after it (`my-mode/my-mode.ts`). Copying
   `free-for-all/` is the quickest start.
2. In that file, put the settings first, one commented value each, then export the gamemode: its
   name and its plugins, built from those settings.
3. Point `src/gamemode.ts` at it.
4. Run `bun run check`, then `bun run dev` to try it in the game.

Plugins only your gamemode uses go in its folder; [Shared or one gamemode's own](#shared-or-one-gamemodes-own)
says which go where.

```
src/
├── gamemode.ts          entry point: picks the gamemode
├── core/                the framework: plugin contract, gamemode runtime, player stores, timers, convars, rules, chat commands and `say`
├── gamemodes/
│   └── free-for-all/    free-for-all.ts, the example gamemode
├── plugins/             shared plugins, one file each
├── spawns/              per-map spawn lists for randomSpawns
└── types/cs_script.d.ts Valve's API types, synced from your CS2 install
docs/plugins.md          the plugin reference: every hook, per-player data, timers, settings
tests/                   every test, plus the fake cs_script runtime they run against
tools/                   build, deploy, launch and type-sync scripts behind the bun run commands
dist/                    build output (gamemode.vjs), not committed
```

## Writing a plugin

A plugin is an object with a `name` and whichever hooks it needs. All hooks are optional. The smallest
useful one announces each kill in chat; put it in `src/plugins/kill-feed.ts`:

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
commands({ "!rules": ({ player }) => say(`${player.GetPlayerName()}: free-for-all, no teams`) }),
```

The engine can't hide a chat line, so everyone still sees `!rules`. `src/plugins/example.ts` is a longer template with
saved state, and `debug()` from `src/plugins/debug.ts` logs every event as it fires.

### Shared or one gamemode's own

A plugin belongs in `src/plugins/` when it knows nothing about any one gamemode: everything it needs
comes in through its options. One that only makes sense in one gamemode, like a gun game's weapon
ladder, stays in that gamemode's folder, and a few lines used in one place, like a chat command for
testing, can sit right in the gamemode file.

Every hook and how it behaves, per-player data, timers, server settings, team rules, and a table for
readers coming from GMod, SourceMod or FiveM: [docs/plugins.md](docs/plugins.md).

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
import { createGamemode } from "../src/core/gamemode";
import { teamRules, Teams } from "../src/core/rules";
import { engine } from "./fake-point-script";

test("autoAssign moves a bot that picked the other team", () => {
  createGamemode({ name: "Test", plugins: [teamRules({ autoAssign: Teams.CT, damage: "all" })] });
  engine.activate();
  const bot = engine.addPlayer("Bot");
  bot.pawn.team = Teams.TERRORIST;
  engine.fire("OnPlayerTeamChanged", { player: bot.pawn, oldTeam: Teams.UNASSIGNED });
  expect(bot.team).toBe(Teams.CT);
});
```

| `engine` member | Use |
|---|---|
| `activate()` | Fires `OnActivate`, which runs every plugin's `init()`. |
| `fire(event, arg)` | Runs the callback the gamemode registered for an `Instance.On*` event and returns its result. |
| `tick(seconds)` | Moves game time forward and runs the think loop once if it is due. |
| `addPlayer(name)` | Adds a connected player and returns its controller (`.pawn` is the pawn). |
| `reload(load)` | A `script_reload`: the old script's save step, a fresh `load()`, then the new script's restore step. |
| `logs`, `commands`, `convars`, `roundEnds` | What the script logged, ran and set. |
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
