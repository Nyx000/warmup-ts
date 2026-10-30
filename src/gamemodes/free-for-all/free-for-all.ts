/**
 * Free-for-all, the example gamemode: everyone joins CT with no team pick, everyone can damage
 * everyone, and players spawn at random points away from each other on the maps that have a spawn
 * list. Copy this folder to start your own.
 */

import type { GamemodeConfig } from "../../core/gamemode";
import { convars } from "../../core/convars";
import type { ConvarValue } from "../../core/convars";
import { teamRules, Teams } from "../../core/rules";
import type { TeamRulesConfig } from "../../core/rules";
import { example } from "../../plugins/example";
import { randomSpawns } from "../../plugins/random-spawns";
import { welcome } from "../../plugins/welcome";
import { deInferno } from "../../spawns/de_inferno";

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
