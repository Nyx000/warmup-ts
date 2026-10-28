#!/usr/bin/env bun
/**
 * Launch CS2 with Workshop Tools through Steam.
 *
 * Usage:
 *   bun run tools                     # cs2 -tools -addon cs2_gamemode_framework -condebug
 *   bun run tools -- +map cs_test1    # extra args are passed through
 *
 * -condebug writes the console to game/csgo/console.log, so script output
 * can be read without copying it out of the game.
 */

import { existsSync } from "fs";
import { join } from "path";

const CS2_APP_ID = "730";
const ADDON_NAME = "cs2_gamemode_framework";
const DEFAULT_STEAM_EXE = "C:\\Program Files (x86)\\Steam\\steam.exe";

if (process.platform !== "win32") {
  console.error("Workshop Tools only run on Windows.");
  process.exit(1);
}

async function run(cmd) {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out;
}

async function findSteamExe() {
  const out = await run(["reg", "query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamExe"]);
  const match = out.match(/SteamExe\s+REG_SZ\s+(.+)/);
  const fromRegistry = match?.[1].trim().replaceAll("/", "\\");
  if (fromRegistry && existsSync(fromRegistry)) return fromRegistry;
  if (existsSync(DEFAULT_STEAM_EXE)) return DEFAULT_STEAM_EXE;
  return null;
}

// Only the Steam-installed client counts: a dedicated server is cs2.exe too,
// but lives outside steamapps and can keep running alongside.
const cs2Paths = await run(["powershell", "-NoProfile", "-Command", "(Get-Process cs2 -ErrorAction SilentlyContinue).Path"]);
if (cs2Paths.toLowerCase().includes("steamapps\\common")) {
  console.error("CS2 is already running. Close it first to relaunch with -tools.");
  process.exit(1);
}

const steamExe = await findSteamExe();
if (!steamExe) {
  console.error(`Steam not found (checked the registry and ${DEFAULT_STEAM_EXE}).`);
  process.exit(1);
}

// Tools mode mounts exactly one addon, chosen at launch; without it the
// addon's maps (cs_test1) are an "invalid map name".
const args = ["-applaunch", CS2_APP_ID, "-tools", "-addon", ADDON_NAME, "-condebug", ...process.argv.slice(2)];
// Wait for steam.exe to hand the request to the running Steam client: exiting
// first can take the child down with us before the launch is passed on.
const steam = Bun.spawn([steamExe, ...args], { stdout: "ignore", stderr: "ignore" });
await Promise.race([steam.exited, Bun.sleep(15000)]);

console.log(`Launching CS2 Workshop Tools: ${args.slice(2).join(" ")}`);
console.log(`Console log: ${join("<CS2>", "game", "csgo", "console.log")}`);
