/**
 * PistolGG, a pistol gun game, headshots only: free-for-all, three kills per weapon up a ladder
 * of nine pistols, an HE grenade and the knife. A knife kill on the last weapon wins. Players
 * spawn at random points away from other players after a 10 second warmup, with no freeze time.
 * Everyone joins CT straight away, with no team pick. A sound plays from each player as they
 * spawn, and headshots spray blood and ring a random bell for the shooter.
 */

import type { GamemodeConfig } from "../../core/gamemode";
import { convars } from "../../core/convars";
import type { ConvarValue } from "../../core/convars";
import { teamRules, Teams } from "../../core/rules";
import type { TeamRulesConfig } from "../../core/rules";
import { headshotBlood } from "../../plugins/combat/headshot-blood";
import { headshotSound } from "../../plugins/combat/headshot-sound";
import { headshotsOnly } from "../../plugins/combat/headshots-only";
import { moneyLog } from "../../plugins/economy/money-log";
import { spawnSound } from "../../plugins/hud/spawn-sound";
import { randomSpawns } from "../../plugins/players/random-spawns";
import { welcome } from "../../plugins/hud/welcome";
import { deInferno } from "../../spawns/de_inferno";
import { ladder } from "./ladder";

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

/** Weapons in the order players climb them; a knife kill on the last one wins. */
const WEAPONS = [
  "weapon_glock",
  "weapon_usp_silencer",
  "weapon_p250",
  "weapon_elite",
  "weapon_fiveseven",
  "weapon_tec9",
  "weapon_cz75a",
  "weapon_revolver",
  "weapon_deagle",
  "weapon_hegrenade",
  "weapon_knife",
];

/** Sounds played together from each player as they spawn: a squawk and the loudest chicken sound. */
const SPAWN_SOUNDS = ["Chicken.Panic", "Chicken.FlapWings"];

/** Sounds played from the shooter on a headshot, one picked at random each time: every short bell in the game. */
const HEADSHOT_SOUNDS = [
  "tr.BellImpact",
  "tr.BellNormal",
  "tr.TimerBell",
  "inferno.bell_c",
  "inferno.bell_d",
  "inferno.bell_e",
  "inferno.bell_f",
  "inferno.bell_g",
];

/** Kills with one weapon before moving to the next. A knife kill always moves a player up at once. */
const KILLS_PER_WEAPON = 3;

// ── The gamemode: its name and its plugins, which run in this order ──

export const pistolGG: GamemodeConfig = {
  name: "PistolGG",
  plugins: [
    teamRules(TEAMS),
    convars(SERVER),
    ladder({ weapons: WEAPONS, killsPerLevel: KILLS_PER_WEAPON }),
    headshotsOnly(),
    headshotBlood(),
    headshotSound({ sounds: HEADSHOT_SOUNDS }),
    moneyLog(),
    welcome((name) => `Welcome ${name} to PistolGG, running on WarmupTS`),
    randomSpawns({ maps: { de_inferno: deInferno } }),
    spawnSound({ sounds: SPAWN_SOUNDS }),
  ],
};
