/**
 * Opt-in plugins that change server rules. Leave them out and the server runs stock CS.
 * Both apply their commands in init(), so they run again after a hot reload.
 */

import { Console } from "cs_script/point_script";
import type { Plugin } from "./plugin";

export const Teams = {
  UNASSIGNED: 0,
  SPECTATOR: 1,
  TERRORIST: 2,
  CT: 3,
} as const;

export type Team = (typeof Teams)[keyof typeof Teams];

/** Console commands to run on map load, e.g. "mp_roundtime 5". */
export function serverCommands(commands: string[]): Plugin {
  return {
    name: "serverCommands",
    init() {
      for (const command of commands) Console.ServerCommand(command);
    },
  };
}

export interface TeamRulesConfig {
  /** Put every connecting player on this team, skipping team selection. */
  autoAssign?: typeof Teams.TERRORIST | typeof Teams.CT;
  /** "all" is free-for-all, "enemies" is normal CS, "none" turns off player damage. */
  damage?: "all" | "enemies" | "none";
  /** Only with damage "enemies". */
  friendlyFire?: boolean;
}

/**
 * Team assignment and damage rules. Free-for-all:
 *   teamRules({ autoAssign: Teams.CT, damage: "all" })
 * List it before plugins that read a player's team in onPlayerConnect.
 */
export function teamRules({ autoAssign, damage = "enemies", friendlyFire = false }: TeamRulesConfig = {}): Plugin {
  const damageCommands = {
    all: ["mp_teammates_are_enemies 1", "mp_friendlyfire 0", "mp_solid_teammates 0"],
    enemies: ["mp_teammates_are_enemies 0", `mp_friendlyfire ${friendlyFire ? 1 : 0}`, "mp_solid_teammates 1"],
    none: ["mp_teammates_are_enemies 0", "mp_friendlyfire 0", "mp_solid_teammates 0"],
  }[damage];

  // Balancing and team limits would fight a gamemode that places players itself
  const commands = ["mp_autoteambalance 0", "mp_limitteams 0", ...damageCommands];
  if (autoAssign !== undefined) commands.push("mp_force_pick_time 0");

  return {
    ...serverCommands(commands),
    name: "teamRules",
    onPlayerConnect({ player }) {
      if (autoAssign !== undefined && player?.IsValid()) player.JoinTeam(autoAssign);
    },
    // Bots connect with no player in the event, pick a team themselves and land here
    onPlayerTeamChanged({ player }) {
      if (autoAssign === undefined || !player?.IsValid()) return;
      const team = player.GetTeamNumber();
      if (team === autoAssign || (team !== Teams.TERRORIST && team !== Teams.CT)) return;
      player.GetPlayerController()?.JoinTeam(autoAssign);
    },
  };
}
