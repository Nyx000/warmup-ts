/**
 * Settings for the server a gamemode is deployed to, which aren't part of the gamemode: the build
 * reads them from `server.config.json` at the repo root when that file exists (it's gitignored),
 * and a build without it gets none, so plugins that need them stay off.
 */

import type { PoolCommands } from "./effects";

export interface ServerConfig {
  /** The server's console commands for entity pools (see serverPools). */
  pools?: PoolCommands;
}

// Replaced by the build; absent in tests
declare const SERVER_CONFIG: ServerConfig | undefined;

export const serverConfig: ServerConfig = typeof SERVER_CONFIG === "undefined" ? {} : SERVER_CONFIG;
