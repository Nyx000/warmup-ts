/**
 * Timers, run by the gamemode's think loop, so a plugin never calls Instance.SetThink itself.
 * A hot reload cancels every timer: start the ones a plugin needs in init().
 */

import { Instance } from "cs_script/point_script";

export interface Timer {
  cancel(): void;
}

interface Entry {
  run: () => void;
  due: number;
  /** Seconds between runs; absent for a timer that runs once. */
  interval?: number;
  cancelled: boolean;
}

let entries: Entry[] = [];

function start(seconds: number, run: () => void, interval?: number): Timer {
  const entry: Entry = { run, due: Instance.GetGameTime() + seconds, interval, cancelled: false };
  entries.push(entry);
  return {
    cancel() {
      entry.cancelled = true;
      entries = entries.filter((other) => other !== entry);
    },
  };
}

/** Runs `run` once, `seconds` from now. */
export function after(seconds: number, run: () => void): Timer {
  return start(seconds, run);
}

/** Runs `run` every `seconds` until cancelled; the first run is `seconds` from now. */
export function every(seconds: number, run: () => void): Timer {
  return start(seconds, run, seconds);
}

/** For the gamemode's think loop. A repeating timer that fell behind runs once, not once per missed interval. */
export function runDueTimers(now: number, onError: (error: unknown) => void): void {
  for (const entry of [...entries]) {
    if (entry.cancelled || entry.due > now) continue;
    if (entry.interval === undefined) {
      entry.cancelled = true;
    } else {
      entry.due += entry.interval;
      if (entry.due <= now) entry.due = now + entry.interval;
    }
    try {
      entry.run();
    } catch (error) {
      onError(error);
    }
  }
  entries = entries.filter((entry) => !entry.cancelled);
}

export function cancelAllTimers(): void {
  for (const entry of entries) entry.cancelled = true;
  entries = [];
}
