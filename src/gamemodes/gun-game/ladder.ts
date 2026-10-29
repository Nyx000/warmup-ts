/**
 * The gun game ladder: a few kills move the killer one weapon up the ladder, and a knife kill moves
 * them up at once. A knife kill on the last weapon wins: for a short victory lap everyone
 * else is frozen, nobody respawns, and only the winner's knife hurts; then the match ends
 * on the scoreboard and the next one starts everyone on the first weapon. Otherwise
 * players respawn, nobody can buy, and the round never ends. On the grenade level a player
 * holds nothing and throws by clicking. Pair it with
 * teamRules({ damage: "all" }) for free-for-all.
 */

import {
  Console,
  CSGrenadeType,
  CSInputs,
  CSMoveType,
  CSPlayerPawn,
  CSRoundEndReason,
  CSWeaponType,
  GameRules,
  Instance,
} from "cs_script/point_script";
import type { Vector } from "cs_script/point_script";
import { convars } from "../../core/convars";
import { playerStore } from "../../core/players";
import type { Plugin } from "../../core/plugin";
import { after, type Timer } from "../../core/timers";

const RESPAWN = ["mp_respawn_on_death_t 1", "mp_respawn_on_death_ct 1"];
const NO_RESPAWN = ["mp_respawn_on_death_t 0", "mp_respawn_on_death_ct 0"];

const RULES = {
  mp_respawn_on_death_t: 1,
  mp_respawn_on_death_ct: 1,
  mp_ignore_round_win_conditions: 1,
  mp_maxrounds: 0,
  mp_give_player_c4: 0,
  mp_buytime: 0,
  // 3 means nobody can buy
  sv_buy_status_override: 3,
  mp_t_default_secondary: "",
  mp_ct_default_secondary: "",
  mp_death_drop_gun: 0,
  mp_death_drop_grenade: 0,
  sv_infinite_ammo: 2,
};

const GRENADE = "weapon_hegrenade";
// Between a player's throws, and between a bot's throw and its next grenade
const GRENADE_COOLDOWN_SECONDS = 1;
// The longest round time that holds (measured 2026-10-27)
const ENDLESS_ROUND_SECONDS = 86400;
const VICTORY_LAP_SECONDS = 5;
// Ending the last round with no restart delay raced the match end: in 9 of 13 tries the
// server skipped the scoreboard, restarted with teams switched and left the client on
// "Match Cancelled". With 5 s it held the scoreboard 6 times out of 6, and the scoreboard
// still appears at once (measured 2026-10-27)
const MATCH_END_DELAY_SECONDS = 5;
const WINNER_GLOW = { r: 255, g: 200, b: 0 };
const STILL = { x: 0, y: 0, z: 0 };

export interface MatchResult {
  winner: string;
  players: { slot: number; name: string; kills: number }[];
}

export interface LadderConfig {
  /** Weapons in order; the last one wins. */
  weapons: string[];
  /** Kills with one weapon before the next; a knife kill always counts as a whole level. */
  killsPerLevel?: number;
  /** Kills needed on particular weapons, in place of killsPerLevel. */
  killsOn?: Record<string, number>;
  /**
   * Each kill that counts toward the next weapon, with the killer's ladder weapon, their kills on it
   * (all it needs when the kill moves them up or wins) and whether it was a knife kill.
   */
  onKillCount?: (kill: { killer: CSPlayerPawn; victim: CSPlayerPawn; weapon: string; kills: number; knifed: boolean }) => void;
  /** The winning knife kill, as the victory lap starts. */
  onWin?: (winner: CSPlayerPawn) => void;
  /** After the victory lap, before the reset: where match stats get saved. */
  onMatchEnd?: (result: MatchResult) => void;
}

type Phase =
  | { kind: "playing" }
  | {
      kind: "victoryLap";
      winner: CSPlayerPawn;
      winnerName: string;
      /** Where each frozen player is held */
      frozenAt: Map<CSPlayerPawn, Vector>;
    }
  // Waiting for the match end the round end triggers
  | { kind: "ending" };

export function ladder({
  weapons,
  killsPerLevel = 3,
  killsOn = {},
  onKillCount = () => {},
  onWin = () => {},
  onMatchEnd = () => {},
}: LadderConfig): Plugin & { killsOnWeapon(pawn: CSPlayerPawn): number; setWeapon(pawn: CSPlayerPawn, weapon: string): boolean } {
  const rules = convars(RULES, "ladder");
  // Ladder index
  const levels = playerStore<number>();
  // Kills on the current level
  const kills = playerStore<number>();
  const matchKills = playerStore<number>();
  let phase: Phase = { kind: "playing" };
  // The timer that gives a bot its next grenade
  const grenadeRefills = playerStore<Timer>({ persist: false });
  // Game time a player can next throw
  const nextThrow = playerStore<number>({ persist: false });

  function equip(pawn: CSPlayerPawn): void {
    const slot = pawn.GetPlayerController()?.GetPlayerSlot();
    if (slot === undefined || !pawn.IsAlive()) return;
    const weapon = weapons[levels.get(slot) ?? 0];
    pawn.DestroyWeapons();
    // A player throws by clicking (throwGrenades); a bot can't, so it carries a real one
    if (weapon === GRENADE && !pawn.GetPlayerController()?.IsBot()) return;
    if (weapon !== "weapon_knife") pawn.GiveNamedItem("weapon_knife");
    pawn.GiveNamedItem(weapon, true);
  }

  // Left click throws overhand, right click underhand, both in between, as CS grenades do,
  // but at once: SpawnGrenadeProjectile launches from the thrower's own throw position and
  // velocity, and credits kills to them (measured 2026-10-27). Held fire throws each cooldown
  function throwGrenades(now: number): void {
    for (const pawn of livePawns()) {
      const controller = pawn.GetPlayerController();
      if (!controller || controller.IsBot()) continue;
      const slot = controller.GetPlayerSlot();
      if (weapons[levels.get(slot) ?? 0] !== GRENADE || now < (nextThrow.get(slot) ?? 0)) continue;
      const overhand = pawn.IsInputPressed(CSInputs.ATTACK);
      const underhand = pawn.IsInputPressed(CSInputs.ATTACK2);
      if (!overhand && !underhand) continue;
      nextThrow.set(slot, now + GRENADE_COOLDOWN_SECONDS);
      const throwStrength = overhand && underhand ? 0.5 : overhand ? 1 : 0;
      Instance.SpawnGrenadeProjectile({ type: CSGrenadeType.HE, thrower: pawn, throwStrength });
    }
  }

  function announce(message: string): void {
    Console.Log(`[GunGame] ${message}`);
    // On a listen server this shows in chat as said by the host player (measured 2026-10-27)
    Console.ServerCommand(`say ${message}`);
  }

  function livePawns(): CSPlayerPawn[] {
    return Instance.GetAllPlayerControllers()
      .map((controller) => controller.GetPlayerPawn())
      .filter((pawn): pawn is CSPlayerPawn => !!pawn?.IsValid() && pawn.IsAlive());
  }

  function startVictoryLap(winner: CSPlayerPawn, winnerName: string): void {
    const lap: Phase = { kind: "victoryLap", winner, winnerName, frozenAt: new Map() };
    phase = lap;
    // A round restart ends the lap early; then this has nothing left to end
    after(VICTORY_LAP_SECONDS, () => {
      if (phase === lap) endMatch(winner, winnerName);
    });
    announce(`*** ${winnerName} WINS THE GUN GAME ***`);
    winner.Glow(WINNER_GLOW);
    for (const command of NO_RESPAWN) Console.ServerCommand(command);
    // The round that ends the lap is the match's last, so its end shows the scoreboard
    Console.ServerCommand(`mp_maxrounds ${GameRules.GetRoundsPlayed() + 1}`);
    holdStill(lap);
  }

  // Every think during the lap. A move type alone didn't stop players, so each one is also
  // put back where the lap found them: bots held at 0 units of drift over 5 s against 891
  // unheld, and doing it in QueueAfterThinks instead let one drift 69 (measured 2026-10-27).
  // Frozen players can still shoot, so they are disarmed; the next match's spawn re-arms them
  function holdStill(lap: Extract<Phase, { kind: "victoryLap" }>): void {
    for (const pawn of livePawns()) {
      if (pawn === lap.winner) continue;
      let position = lap.frozenAt.get(pawn);
      if (!position) {
        lap.frozenAt.set(pawn, (position = pawn.GetAbsOrigin()));
        pawn.DestroyWeapons();
      }
      pawn.SetMoveType(CSMoveType.NONE);
      pawn.Teleport({ position, velocity: STILL });
    }
  }

  function endMatch(winner: CSPlayerPawn, winnerName: string): void {
    if (winner.IsValid()) winner.Unglow();
    phase = { kind: "ending" };
    onMatchEnd({
      winner: winnerName,
      players: Instance.GetAllPlayerControllers().map((controller) => ({
        slot: controller.GetPlayerSlot(),
        name: controller.GetPlayerName(),
        kills: matchKills.get(controller.GetPlayerSlot()) ?? 0,
      })),
    });
    for (const pawn of livePawns()) pawn.SetMoveType(CSMoveType.WALK);
    levels.clear();
    kills.clear();
    matchKills.clear();
    const team = winner.GetTeamNumber() === 2 ? 2 : 3;
    // A 0:0 game over shows "Match Cancelled" to everyone (seen 2026-10-28). Everyone plays on one
    // team, so it gets the point and the winner's name, and the banner names the winner instead.
    // mp_teamname_1 is CT, mp_teamname_2 is T (measured from the match-start log, 2026-10-28)
    GameRules.AddTeamScore(team, 1);
    const bannerName = winnerName.replace(/["';\\]/g, "");
    Console.ServerCommand(`mp_teamname_${team === 3 ? 1 : 2} "${bannerName}"`);
    GameRules.TerminateRound(team === 2 ? CSRoundEndReason.TERRORISTS_WIN : CSRoundEndReason.CTS_WIN, MATCH_END_DELAY_SECONDS);
  }

  return {
    name: "ladder",

    /** A player's kills so far on their current weapon. */
    killsOnWeapon(pawn: CSPlayerPawn) {
      const slot = pawn.GetPlayerController()?.GetPlayerSlot();
      return slot === undefined ? 0 : (kills.get(slot) ?? 0);
    },

    /** Puts a player straight onto a ladder weapon with no kills on it; false if it isn't on the ladder. */
    setWeapon(pawn: CSPlayerPawn, weapon: string) {
      const slot = pawn.GetPlayerController()?.GetPlayerSlot();
      const level = weapons.indexOf(weapon);
      if (slot === undefined || level < 0) return false;
      levels.set(slot, level);
      kills.delete(slot);
      equip(pawn);
      return true;
    },

    init() {
      rules.init();
    },

    players: { levels, kills, matchKills, grenadeRefills, nextThrow },

    onRoundStart() {
      GameRules.SetRoundRemainingTime(ENDLESS_ROUND_SECONDS);
      if (phase.kind === "ending") {
        for (const command of ["mp_maxrounds 0", 'mp_teamname_1 ""', 'mp_teamname_2 ""', ...RESPAWN]) Console.ServerCommand(command);
      }
      phase = { kind: "playing" };
    },

    // The engine sends some connects (bots joining, measured 2026-10-27) without a player
    onPlayerConnect({ player }) {
      const slot = player?.GetPlayerSlot();
      if (slot === undefined) return;
      levels.set(slot, 0);
      kills.delete(slot);
      matchKills.delete(slot);
    },

    // Fires on every spawn
    onPlayerReset({ player }) {
      equip(player);
    },

    // During the victory lap only the winner can hurt anyone
    onModifyPlayerDamage({ attacker }) {
      if (phase.kind === "victoryLap" && attacker !== phase.winner) return { abort: true };
      return undefined;
    },

    onPlayerKill({ player, attacker, weapon }) {
      if (phase.kind !== "playing" || !(attacker instanceof CSPlayerPawn) || attacker === player) return;
      const killer = attacker.GetPlayerController();
      if (!killer) return;

      const slot = killer.GetPlayerSlot();
      matchKills.set(slot, (matchKills.get(slot) ?? 0) + 1);
      const level = levels.get(slot) ?? 0;
      const ladderWeapon = weapons[level];
      const needed = killsOn[ladderWeapon] ?? killsPerLevel;
      const knifed = weapon?.GetData().GetType() === CSWeaponType.KNIFE;
      if (level === weapons.length - 1) {
        // One grenade can kill several players: the kill that moves its thrower up to the
        // last weapon must not also win (seen in game 2026-10-27), so only a knife kill wins
        if (knifed) {
          onKillCount({ killer: attacker, victim: player, weapon: ladderWeapon, kills: needed, knifed: true });
          startVictoryLap(attacker, killer.GetPlayerName());
          onWin(attacker);
        }
        return;
      }

      const killsHere = (kills.get(slot) ?? 0) + 1;
      if (!knifed && killsHere < needed) {
        kills.set(slot, killsHere);
        onKillCount({ killer: attacker, victim: player, weapon: ladderWeapon, kills: killsHere, knifed: false });
        return;
      }

      onKillCount({ killer: attacker, victim: player, weapon: ladderWeapon, kills: needed, knifed });

      kills.delete(slot);
      levels.set(slot, level + 1);
      equip(attacker);
      if (level + 1 === weapons.length - 1) announce(`${killer.GetPlayerName()} is on the last weapon`);
    },

    onGrenadeThrow({ weapon }) {
      const slot = weapon.GetOwner()?.GetPlayerController()?.GetPlayerSlot();
      if (slot === undefined || weapons[levels.get(slot) ?? 0] !== GRENADE) return;
      grenadeRefills.get(slot)?.cancel();
      grenadeRefills.set(
        slot,
        after(GRENADE_COOLDOWN_SECONDS, () => {
          // Gone if the player disconnected meanwhile
          if (!grenadeRefills.delete(slot)) return;
          const pawn = Instance.GetPlayerController(slot)?.GetPlayerPawn();
          if (pawn?.IsValid() && weapons[levels.get(slot) ?? 0] === GRENADE) equip(pawn);
        }),
      );
    },

    onThink() {
      rules.onThink();
      if (phase.kind === "victoryLap") holdStill(phase);
      if (phase.kind === "playing") throwGrenades(Instance.GetGameTime());
    },
  };
}
