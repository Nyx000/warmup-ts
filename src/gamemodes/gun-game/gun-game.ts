/**
 * PistolGG, a pistol gun game, headshots only: free-for-all, three kills per pistol (four on
 * the HE grenade) up a ladder of nine pistols, an HE grenade and the knife. A knife kill on the last weapon wins. Players
 * spawn at random points away from other players after a 10 second warmup, with no freeze time.
 * Everyone joins CT straight away, with no team pick. A sound plays from each player as they
 * spawn with armor and a helmet, headshots spray blood, and each kill rings a bell from the
 * victim's head, a step higher for each kill on the same weapon. A knife kill plays Arms Race's
 * knife sting instead, and the winner gets a chicken chorus and feathers (fanfare.ts).
 */

import type { GamemodeConfig } from "../../core/gamemode";
import { convars } from "../../core/convars";
import type { ConvarValue } from "../../core/convars";
import { teamRules, Teams } from "../../core/rules";
import type { TeamRulesConfig } from "../../core/rules";
import { headshotBlood } from "../../plugins/combat/headshot-blood";
import { headshotsOnly } from "../../plugins/combat/headshots-only";
import { moneyLog } from "../../plugins/economy/money-log";
import { spawnSound } from "../../plugins/hud/spawn-sound";
import { randomSpawns } from "../../plugins/players/random-spawns";
import { welcome } from "../../plugins/hud/welcome";
import { deInferno } from "../../spawns/de_inferno";
import { celebrateWin, playKillSound } from "./fanfare";
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
  // Bots stay quiet: no radio calls or chatter
  bot_chatter: "off",
  // 1 mutes the "Fire in the hole" radio call on every grenade throw
  sv_ignoregrenaderadio: 1,
  // 2 gives everyone kevlar and a helmet; a helmet means some pistols need two headshots
  mp_free_armor: 2,
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

/**
 * Sounds played together from each player as they spawn. Player.Respawn is deathmatch's own cue:
 * loud, heard across much of the map, and blocked from repeating for only 0.2 seconds. The chicken
 * chorus on top is flavour: each chicken event blocks its repeats for 5 seconds server-wide, so on a
 * busy server most spawns get only the respawn cue.
 */
const SPAWN_SOUNDS = ["Player.Respawn", "Chicken.Panic", "Chicken.FlapWings", "Chicken.Fly", "Chicken.Chick.Interact"];

/** Kills with one weapon before moving to the next. A knife kill always moves a player up at once. */
const KILLS_PER_WEAPON = 3;

/** Weapons that need a different number of kills. */
const KILLS_ON = { weapon_hegrenade: 4 };

// ── The gamemode: its name and its plugins, which run in this order ──

export const pistolGG: GamemodeConfig = {
  name: "PistolGG",
  plugins: [
    teamRules(TEAMS),
    convars(SERVER),
    ladder({
      weapons: WEAPONS,
      killsPerLevel: KILLS_PER_WEAPON,
      killsOn: KILLS_ON,
      onKillCount: playKillSound,
      onWin: celebrateWin,
    }),
    headshotsOnly(),
    headshotBlood(),
    moneyLog(),
    welcome((name) => `Welcome ${name} to PistolGG, running on WarmupTS`),
    randomSpawns({ maps: { de_inferno: deInferno } }),
    spawnSound({ sounds: SPAWN_SOUNDS }),
  ],
};
