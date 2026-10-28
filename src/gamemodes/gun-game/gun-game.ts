/**
 * Pistol gun game, headshots only: free-for-all, three kills per weapon up a ladder of nine
 * pistols, an HE grenade and the knife. A knife kill on the last weapon wins.
 */

import type { GamemodeConfig } from "../../core/gamemode";
import { teamRules } from "../../core/rules";
import { headshotsOnly } from "../../plugins/combat/headshots-only";
import { ladder } from "./ladder";

export const pistolGunGame: GamemodeConfig = {
  name: "Pistol Gun Game",
  plugins: [teamRules({ damage: "all" }), ladder(), headshotsOnly()],
};
