/**
 * PistolGG, a pistol gun game, headshots only: free-for-all, three kills per pistol (four on
 * the HE grenade) up a ladder of nine pistols, an HE grenade and the knife. A knife kill on the last weapon wins. Players
 * spawn at random points away from other players after a 10 second warmup, with no freeze time.
 * Everyone joins CT straight away, with no team pick. A sound plays from each player as they
 * spawn, headshots spray blood and a killing one throws the body back, and each kill rings a bell from the
 * victim's head, a step higher for each kill on the same weapon. A knife kill plays Arms Race's
 * knife sting instead, and the winner gets a chicken chorus and feathers (fanfare.ts).
 */

import type { GamemodeConfig } from "../../core/gamemode";
import { connectedPlayers } from "../../core/players";
import { Console } from "cs_script/point_script";
import type { CSPlayerController, CSPlayerPawn } from "cs_script/point_script";
import { commands, say } from "../../core/chat";
import { convars } from "../../core/convars";
import type { ConvarValue } from "../../core/convars";
import { teamRules, Teams } from "../../core/rules";
import type { TeamRulesConfig } from "../../core/rules";
import { serverPools } from "../../core/effects";
import { serverConfig } from "../../core/server-config";
import { headshotBlood, headshotBloodPool } from "../../plugins/headshot-blood";
import { headshotsOnly } from "../../plugins/headshots-only";
import { mapRotation } from "../../plugins/map-rotation";
import { ragdollPunch } from "../../plugins/ragdoll-punch";
import { money } from "../../plugins/money";
import { spawnSound } from "../../plugins/spawn-sound";
import { randomSpawns } from "../../plugins/random-spawns";
import { repeatMessage } from "../../plugins/repeat-message";
import { welcome } from "../../plugins/welcome";
import { deDust2 } from "../../spawns/de_dust2";
import { deInferno } from "../../spawns/de_inferno";
import { deMirage } from "../../spawns/de_mirage";
import { deNuke } from "../../spawns/de_nuke";
import { deOverpass } from "../../spawns/de_overpass";
import { deTrain } from "../../spawns/de_train";
import { deVertigo } from "../../spawns/de_vertigo";
import { celebrateWin, FEATHERS, playDemotion, playKillSound } from "./fanfare";
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
  // The money plugin pays instead of the engine, and money starts at 0 each map
  mp_playercashawards: 0,
  mp_startmoney: 0,
  mp_maxmoney: 200000,
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

/**
 * How hard a killing headshot throws the body, one per kill on the same weapon like the bells:
 * the third, which moves the killer up, throws hardest. Flat: even a slight lift read as a toss
 * in game, so the body is only driven backwards.
 */
const RAGDOLL_LAUNCHES = [600, 900, 1300].map((speed) => ({ speed, lift: 0 }));

/** Grenade kills: straight up by `speed`, out from the blast by `lift`. */
const GRENADE_LAUNCHES = [
  { speed: 600, lift: 25 },
  { speed: 900, lift: 30 },
  { speed: 1200, lift: 40 },
];

/**
 * The maps played, in no order: the game's Active Duty group (mg_active in gamemodes.txt, read
 * 2026-10-29). None has deathmatch spawns, so each has a spawn list in src/spawns.
 */
const MAPS = ["de_inferno", "de_train", "de_mirage", "de_nuke", "de_dust2", "de_overpass", "de_vertigo"];

/**
 * Dollars for a kill (a bot's is worth less) and for winning a match. Small, so the money a player
 * builds up over many visits stays under mp_maxmoney.
 */
const KILL_PAY = { killHuman: 5, killBot: 1 };
const WIN_PAY = 50;

/** After a match ends, how long the scoreboard shows before the next map loads. */
const SCOREBOARD_SECONDS = 12;

const rotation = mapRotation({ maps: MAPS });
const wallet = money(KILL_PAY);

const gunLadder = ladder({
  weapons: WEAPONS,
  killsPerLevel: KILLS_PER_WEAPON,
  killsOn: KILLS_ON,
  // 30 minutes on the round clock, then a draw and a new match
  timeLimit: 30 * 60,
  // Four times a knife's running speed
  lapSpeed: 1000,
  onKillCount: playKillSound,
  onWin: (winner) => {
    celebrateWin(winner);
    const controller = winner.GetPlayerController();
    if (controller) wallet.pay(controller, WIN_PAY, "win");
  },
  onDemote: playDemotion,
  // As the scoreboard comes up, after a win or a draw. The [match] line is read by the server's stats
  // service, which knows each slot's Steam ID from the engine's connect lines
  onMatchEnd: ({ winner }) => {
    Console.Log(winner ? `[match] winner slot=${winner.slot}` : "[match] draw");
    say("Powered by WarmupTS");
    rotation.next(SCOREBOARD_SECONDS);
  },
});

/**
 * For testing: "!grenade" in chat skips straight to the grenade and "!feathers" plays the win
 * celebration. Only while the one asking is the only human on the server, so it can't tilt anyone
 * else's match.
 */
function devSkipFor(command: string, skip: (pawn: CSPlayerPawn) => void) {
  return ({ player, args }: { player: CSPlayerController; args: string[] }): void => {
    // The command must be the whole line, so chatter that merely starts with it doesn't skip a match
    if (args.length > 0) return;
    const humans = connectedPlayers().filter((controller) => !controller.IsBot());
    const pawn = player.GetPlayerPawn();
    if (humans.length !== 1 || humans[0].GetPlayerSlot() !== player.GetPlayerSlot() || !pawn?.IsAlive()) return;
    Console.Log(`[devSkip] ${player.GetPlayerName()}: ${command}`);
    skip(pawn);
  };
}

const devSkip = commands(
  {
    "!grenade": devSkipFor("!grenade", (pawn) => gunLadder.setWeapon(pawn, "weapon_hegrenade")),
    "!feathers": devSkipFor("!feathers", celebrateWin),
  },
  "devSkip",
);

// ── The gamemode: its name and its plugins, which run in this order ──

export const pistolGG: GamemodeConfig = {
  name: "PistolGG",
  plugins: [
    teamRules(TEAMS),
    convars(SERVER),
    gunLadder,
    devSkip,
    rotation,
    headshotsOnly(),
    // After the plugins that can cancel damage, so only a hit that lands throws anyone
    ragdollPunch({ launches: RAGDOLL_LAUNCHES, blasts: GRENADE_LAUNCHES, pick: (killer) => gunLadder.killsOnWeapon(killer), hold: 0.1 }),
    // The blood and feathers, where the server provides entity pools
    ...(serverConfig.pools ? [serverPools([...headshotBloodPool(), ...FEATHERS], serverConfig.pools)] : []),
    headshotBlood(),
    wallet,
    welcome((name) => `Welcome ${name} to PistolGG, running on WarmupTS`),
    repeatMessage({ seconds: 15 * 60, message: "PistolGG runs on WarmupTS, a TypeScript gamemode framework for CS2: github.com/Nyx000/warmup-ts" }),
    randomSpawns({
      maps: { de_inferno: deInferno, de_train: deTrain, de_mirage: deMirage, de_nuke: deNuke, de_dust2: deDust2, de_overpass: deOverpass, de_vertigo: deVertigo },
    }),
    spawnSound({ sounds: SPAWN_SOUNDS }),
  ],
};
