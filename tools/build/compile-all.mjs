/**
 * Bundles src/gamemode.ts into dist/gamemode.vjs.
 *
 *   bun tools/build/compile-all.mjs [--watch] [--root <dir>]
 *
 * --root builds a gamemode kept in its own repo, with WarmupTS as a dependency: that repo's
 * src/gamemode.ts, server.config.json and dist/ are used in place of this one's.
 */

import { existsSync, readFileSync, watch } from "fs";
import { join, resolve } from "path";

const rootArg = process.argv.indexOf("--root");
const root = rootArg >= 0 ? resolve(process.argv[rootArg + 1]) : join(import.meta.dir, "../..");
const srcDir = join(root, "src");
// Settings for the server being deployed to (src/core/server-config.ts); gitignored, optional
const serverConfigFile = join(root, "server.config.json");

async function build() {
  const result = await Bun.build({
    entrypoints: [join(srcDir, "gamemode.ts")],
    outdir: join(root, "dist"),
    naming: "gamemode.vjs",
    format: "esm",
    target: "browser",
    external: ["cs_script/point_script"],
    define: { SERVER_CONFIG: existsSync(serverConfigFile) ? JSON.stringify(JSON.parse(readFileSync(serverConfigFile, "utf8"))) : "undefined" },
  });
  if (!result.success) console.error(result.logs.join("\n"));
  return result.success;
}

if (!process.argv.includes("--watch")) {
  if (!(await build())) process.exit(1);
  console.log("Built dist/gamemode.vjs");
} else {
  await build();
  console.log("Watching src/ for changes");
  watch(srcDir, { recursive: true }, async (_event, file) => {
    if (file?.endsWith(".ts") && !file.endsWith(".test.ts") && (await build())) console.log(`Rebuilt after ${file}`);
  });
}
