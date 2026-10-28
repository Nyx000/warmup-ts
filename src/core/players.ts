/**
 * Per-player data. A PlayerStore is a Map keyed by player slot; list it in a plugin's
 * `players` and the gamemode drops a slot's entry when that player disconnects and carries
 * the rest across a hot reload.
 */

import { Instance } from "cs_script/point_script";
import type { CSPlayerController } from "cs_script/point_script";

export class PlayerStore<T> extends Map<number, T> {
  /** false for values that can't be saved as plain data across a hot reload, like a Timer. */
  readonly persist: boolean;

  constructor(persist: boolean) {
    super();
    this.persist = persist;
  }
}

export function playerStore<T>({ persist = true } = {}): PlayerStore<T> {
  return new PlayerStore<T>(persist);
}

/** Instance.GetAllPlayerControllers() also returns controllers of players who have left. */
export function connectedPlayers(): CSPlayerController[] {
  return Instance.GetAllPlayerControllers().filter((controller) => controller.IsValid() && controller.IsConnected());
}
