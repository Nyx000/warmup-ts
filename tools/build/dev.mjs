#!/usr/bin/env bun
/**
 * Dev mode: compile on change and deploy on change, side by side.
 *
 * Bun's script shell doesn't support "&", so package.json can't background
 * one watcher itself; this spawns both and stops both when either exits. --root <dir> is handed to both.
 */

import { join } from "path";
import { rootArgs } from "../utils/root.mjs";

const procs = [
  Bun.spawn(["bun", join(import.meta.dir, "compile-all.mjs"), "--watch", ...rootArgs], { stdio: ["inherit", "inherit", "inherit"] }),
  Bun.spawn(["bun", join(import.meta.dir, "watch-deploy.mjs"), ...rootArgs], { stdio: ["inherit", "inherit", "inherit"] }),
];

const stopAll = () => procs.forEach((p) => p.kill());
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

const code = await Promise.race(procs.map((p) => p.exited));
stopAll();
process.exit(code);
