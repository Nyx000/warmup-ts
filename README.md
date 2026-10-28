# WarmupTS

WarmupTS is a TypeScript framework for CS2 gamemodes written with Valve's `cs_script`, the JavaScript
that runs inside a map through a `point_script` entity. You write a gamemode as a list of plugins, and
WarmupTS bundles them into the one script file the map loads.

cs_script lets a script register each engine callback (`Instance.OnPlayerKill`, `Instance.OnRoundEnd`
and so on) only once. WarmupTS registers all of them and hands every event to every plugin, so a
headshot rule and a weapon ladder can both react to the same kill without knowing about each other.
Plugins can carry their state across `script_reload`, and the types come straight from the
`point_script.d.ts` Valve ships with CS2.

It's early. The script side works and comes with one complete gamemode. Per-player persistence
(SteamID, SQLite) through a small Metamod:Source extension is planned.

## Getting started

You need Windows, CS2 with the Workshop Tools DLC, and [Bun](https://bun.sh) 1.3 or newer.

```bash
git clone https://github.com/Nyx000/warmup-ts.git
cd warmup-ts
bun install
bun run tools    # starts CS2 with Workshop Tools and the addon
bun run dev      # rebuilds and copies the script into the addon on every save
```

The script lands in the `cs2_gamemode_framework` addon as `scripts/gamemode.vjs`. Your map needs a
`point_script` entity whose `cs_script` property points at that file; WarmupTS doesn't ship a map.
Load it as a custom game (`game_type 3; game_mode 0; map <your_map>`), and after each save run
`script_reload` in the console to pick up the change.

### On a dedicated server

Development needs Windows, because Workshop Tools only runs there. The finished script runs on Windows
and Linux dedicated servers alike (tested on a Linux server with 10 bots). A server loads the compiled
`.vjs_c`, so compile the script once after `bun run deploy`:

```bash
"<CS2>/game/bin/win64/resourcecompiler.exe" -i "<CS2>/content/csgo_addons/cs2_gamemode_framework/scripts/gamemode.vjs"
```

That writes `<CS2>/game/csgo_addons/cs2_gamemode_framework/scripts/gamemode.vjs_c`. Copy it to the
server's `game/csgo/scripts/`, put your map's `.vpk` in `game/csgo/maps/`, and start the server with
`+game_type 3 +game_mode 0 +map <your_map>`. Players need the same map to join.

## The included gamemode

Out of the box you get a free-for-all pistol gun game, headshots only. Three kills move you up a
ladder of nine pistols, an HE grenade and the knife. A knife kill skips you a weapon, and a knife kill
on the last weapon wins the match.

## How a gamemode is put together

A gamemode is a name and a list of plugins. This is the whole gun game,
`src/gamemodes/gun-game/gun-game.ts`:

```typescript
export const pistolGunGame: GamemodeConfig = {
  name: "Pistol Gun Game",
  plugins: [teamRules({ damage: "all" }), ladder(), headshotsOnly()],
};
```

`teamRules` makes everyone an enemy, `ladder` runs the weapon progression and the win, and
`headshotsOnly` cancels bullet damage that isn't to the head. Drop `headshotsOnly()` and it's a normal
gun game; `ladder({ weapons: [...] })` changes the weapons.

`src/gamemode.ts` picks which gamemode runs:

```typescript
createGamemode(pistolGunGame);
```

Plugins run in list order, and a plugin that throws is logged and skipped while the rest carry on.

### Making your own

1. Make a folder in `src/gamemodes/`, with a main file named after it (`my-mode/my-mode.ts`).
2. In that file, export the gamemode: its name and its plugins.
3. Point `src/gamemode.ts` at it.

Plugins only your gamemode uses go in its folder. When a second gamemode needs one, move it to
`src/plugins/`, under the category that fits (each category folder has a short README).

```
src/
├── gamemode.ts          entry point: picks the gamemode
├── core/                the framework: plugin contract, gamemode runtime, player stores, timers, rules
├── gamemodes/
│   └── gun-game/        gun-game.ts (the gamemode), ladder.ts (its main plugin)
├── plugins/             shared plugins: combat, loadout, players, economy, world, hud, dev
└── types/cs_script.d.ts Valve's API types, synced from your CS2 install
tests/                   every test, plus the fake cs_script runtime they run against
```

## Writing a plugin

A plugin is an object with a `name` and whichever hooks it needs. All hooks are optional.

```typescript
import { Console } from "cs_script/point_script";
import type { Plugin } from "../../core/plugin";

export function welcome(message: string): Plugin<{ joined: number }> {
  let state = { joined: 0 };

  return {
    name: "welcome",
    saveState: () => state, // kept across script_reload
    restoreState(saved) { state = saved; },

    onPlayerActivate({ player }) {
      state.joined++;
      Console.ClientCommand(player.GetPlayerSlot(), `echo "${message}"`);
    },
  };
}
```

Then add `welcome("Welcome!")` to your gamemode's plugin list. `src/plugins/dev/example.ts` is a
starting template, and `debug()` from `src/plugins/dev/debug.ts` logs every event as it fires.

Each hook gets Valve's event object unchanged: `Instance.OnRoundEnd` becomes
`onRoundEnd({ winningTeam, reason })`. A few behave differently:

- `onModifyPlayerDamage` is a chain. Each plugin sees the damage as the plugins before it left it, and
  returning `abort` stops it there.
- `Instance.OnScriptInput` is keyed by input name, so a plugin registers it itself in `init()`.
- `Instance.SetThink`, `SetNextThink` and every other `Instance.On*` callback belong to `createGamemode`:
  cs_script refuses a second registration, so a plugin's own would fail; the lint rejects it outside `src/core/`.
- `onFreezeTimeEnd` and `onWarmupEnd` have no engine event behind them. They fire when the think loop
  sees `GameRules.IsFreezePeriod()` or `GameRules.IsWarmupPeriod()` turn false.

### Per-player data and timers

Data kept per player goes in a `playerStore()`, a `Map` keyed by player slot. List it under `players` on
the plugin and the gamemode drops a player's entry when they disconnect and carries the rest across
`script_reload`, so there's no `saveState` to write for it. A store holding something that isn't plain
data, such as a timer, takes `{ persist: false }`. `connectedPlayers()` lists the players currently on
the server.

```typescript
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

`after(seconds, fn)` and `every(seconds, fn)` run a function later or repeatedly from the gamemode's
think loop and return a timer to `cancel()`. A reload cancels every timer, so start the ones a plugin
needs in `init()`.

Without `teamRules`, `convars` or `serverCommands`, WarmupTS leaves the server's rules alone.

`convars({ mp_freezetime: 0, mp_t_default_secondary: "" })` sets server settings and then reads each one
back. The console shows which way they were set (`Console.SetConvar`, or `Console.ServerCommand` on a CS2
build without it) and names every setting the server did not take. Use `serverCommands` for anything
that is a command rather than a convar.

## Things that will bite you

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

## Commands

| Command | What it does |
|---|---|
| `bun run tools` | Start CS2 with Workshop Tools and the addon (`-condebug` writes the console to `game/csgo/console.log`) |
| `bun run dev` | Rebuild and copy the script into the addon on every save |
| `bun run build` | Type check and build `dist/gamemode.vjs` once |
| `bun run deploy` | Build once and copy the script into the addon |
| `bun run check` | Lint, type check and run the tests |
| `bun test` | Tests only, against a fake cs_script runtime |
| `bun run sync-types` | Update `src/types/cs_script.d.ts` from your CS2 install |

Set `CS2_INSTALL_PATH` if CS2 isn't in a default Steam library.

## License

[MIT](LICENSE)
