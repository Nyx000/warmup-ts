/**
 * Pistol gun game, headshots only: free-for-all, three kills per weapon up a ladder of nine
 * pistols, an HE grenade and the knife. A knife kill on the last weapon wins. Players spawn
 * at random deathmatch spawns after a 10 second warmup, with no freeze time.
 */

import type { GamemodeConfig } from "../../core/gamemode";
import { serverCommands, teamRules } from "../../core/rules";
import { headshotsOnly } from "../../plugins/combat/headshots-only";
import { moneyLog } from "../../plugins/economy/money-log";
import { ladder } from "./ladder";

export const pistolGunGame: GamemodeConfig = {
  name: "Pistol Gun Game",
  plugins: [
    teamRules({ damage: "all" }),
    serverCommands(["mp_warmuptime 10", "mp_freezetime 0", "mp_randomspawn 1"]),
    ladder(),
    headshotsOnly(),
    moneyLog(),
  ],
};
