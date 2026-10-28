#!/usr/bin/env bun
/**
 * Dev mode: compile on change and deploy on change, side by side.
 *
 * Bun's script shell doesn't support "&", so package.json can't background
 * one watcher itself; this spawns both and stops both when either exits.
 */

const procs = [
  Bun.spawn(["bun", "tools/build/compile-all.mjs", "--watch"], { stdio: ["inherit", "inherit", "inherit"] }),
  Bun.spawn(["bun", "tools/build/watch-deploy.mjs"], { stdio: ["inherit", "inherit", "inherit"] }),
];

const stopAll = () => procs.forEach((p) => p.kill());
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

const code = await Promise.race(procs.map((p) => p.exited));
stopAll();
process.exit(code);
