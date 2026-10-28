/**
 * Finds the CS2 install and the addon folders the tools write to. Workshop Tools run only
 * on Windows, so only Windows Steam libraries are searched; set CS2_INSTALL_PATH otherwise.
 */

import { existsSync } from "fs";
import { readdir, readFile, unlink } from "fs/promises";
import { join } from "path";

export const ADDON_NAME = "cs2_gamemode_framework";

const STEAM_LIBRARIES = [
  "C:\\Program Files (x86)\\Steam",
  "C:\\Program Files\\Steam",
  "D:\\SteamLibrary",
  "E:\\SteamLibrary",
  "F:\\SteamLibrary",
];
const CS2_IN_LIBRARY = join("steamapps", "common", "Counter-Strike Global Offensive");

// Valve moved point_script.d.ts into the cs_script_demo addon in 2026; the old path now
// holds a short "moved" stub, which must never overwrite the real definitions
const TYPE_DEFINITION_PATHS = [
  "content/csgo_addons/cs_script_demo/maps/scripts/point_script.d.ts",
  "content/csgo/maps/editor/zoo/scripts/point_script.d.ts",
];

export async function findCS2Installation() {
  const fromEnv = process.env.CS2_INSTALL_PATH;
  if (fromEnv) {
    if (!existsSync(join(fromEnv, "game"))) throw new Error(`CS2_INSTALL_PATH has no game folder: ${fromEnv}`);
    return fromEnv;
  }
  return STEAM_LIBRARIES.map((library) => join(library, CS2_IN_LIBRARY)).find((path) => existsSync(join(path, "game"))) ?? null;
}

/** Scripts go in both trees: content/ for Workshop Tools, game/ for the running game. */
export async function getAddonScriptsPaths(addonName = ADDON_NAME) {
  const cs2 = await findCS2Installation();
  if (!cs2) throw new Error("CS2 not found. Set CS2_INSTALL_PATH to the Counter-Strike Global Offensive folder.");
  return {
    content: join(cs2, "content", "csgo_addons", addonName, "scripts"),
    game: join(cs2, "game", "csgo_addons", addonName, "scripts"),
  };
}

export async function getTypeDefinitionsPath() {
  const cs2 = await findCS2Installation();
  if (!cs2) return null;
  for (const path of TYPE_DEFINITION_PATHS.map((relative) => join(cs2, relative))) {
    if (!existsSync(path)) continue;
    if ((await readFile(path, "utf8")).includes('declare module "cs_script/point_script"')) return path;
  }
  return null;
}

/** Deletes compiled .vjs_c files so the game recompiles the deployed scripts. */
export async function clearCache(addonName = ADDON_NAME) {
  for (const dir of Object.values(await getAddonScriptsPaths(addonName))) {
    if (!existsSync(dir)) continue;
    for (const file of await readdir(dir)) {
      if (file.endsWith(".vjs_c")) await unlink(join(dir, file));
    }
  }
}
