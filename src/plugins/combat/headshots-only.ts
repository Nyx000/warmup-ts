/**
 * Bullets only hurt on a headshot. Grenades, knives and falls are untouched, since
 * they can't land one.
 */

import { CSDamageTypes, CSHitGroup } from "cs_script/point_script";
import type { Plugin } from "../../core/plugin";

export function headshotsOnly(): Plugin {
  return {
    name: "headshotsOnly",
    onModifyPlayerDamage({ damageTypes, hitGroup }) {
      if (damageTypes & CSDamageTypes.BULLET && hitGroup !== CSHitGroup.HEAD) return { abort: true };
      return undefined;
    },
  };
}
