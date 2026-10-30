# Plugin reference

The detail behind "Writing a plugin" in the [README](../README.md): every hook and how it behaves, per-player
data, timers, and the built-in plugins for server settings and team rules.

## If you know GMod, SourceMod or FiveM

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

## Per-player data and timers

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

## Server settings and team rules

Without `teamRules`, `convars` or `serverCommands`, WarmupTS leaves the server's rules alone.

`convars({ mp_freezetime: 0, mp_t_default_secondary: "" })` sets server settings and then reads each one
back. The console shows which way they were set (`Console.SetConvar`, or `Console.ServerCommand` on a CS2
build without it) and names every setting the server did not take. Use `serverCommands` for anything
that is a command rather than a convar.

A gamemode can list `convars()` more than once: each is named after its label, first setting and
count, so two lists don't clash. A plugin with settings of its own
calls `convars(values, "myPlugin")` inside itself and forwards `init()` and `onThink()` to it, as
`teamRules` does; the second argument is the log prefix.

`teamRules` takes three options and also turns off team balancing and team limits, which would fight a
gamemode that places players itself:

| Option | Meaning |
|---|---|
| `autoAssign` | `Teams.CT` or `Teams.TERRORIST`: every connecting player joins this team, skipping team selection. |
| `damage` | `"enemies"` (the default, as in normal CS), `"all"` for free-for-all, or `"none"`. |
| `friendlyFire` | Only with `damage: "enemies"`. Defaults to `false`. |
