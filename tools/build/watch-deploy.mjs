/**
 * Copies dist/*.vjs into the addon's scripts folders (content/ and game/).
 *
 *   bun tools/build/watch-deploy.mjs [--once] [--root <dir>]
 */

import { existsSync } from "fs";
import { copyFile, mkdir, readdir, stat } from "fs/promises";
import { join } from "path";
import { clearCache, getAddonScriptsPaths } from "../utils/cs2-path.mjs";
import { root } from "../utils/root.mjs";

const distDir = join(root, "dist");
const dirs = Object.values(await getAddonScriptsPaths());
for (const dir of dirs) await mkdir(dir, { recursive: true });

const deployed = new Map();

async function deployChanged() {
  if (!existsSync(distDir)) return;
  for (const file of (await readdir(distDir)).filter((name) => name.endsWith(".vjs"))) {
    const modified = (await stat(join(distDir, file))).mtimeMs;
    if (deployed.get(file) === modified) continue;
    // A stale .vjs_c would keep the game on the old script
    await clearCache();
    for (const dir of dirs) await copyFile(join(distDir, file), join(dir, file));
    deployed.set(file, modified);
    console.log(`Deployed ${file}`);
  }
}

await deployChanged();
if (process.argv.includes("--once")) {
  if (deployed.size === 0) console.log("Nothing in dist/ to deploy; build first");
} else {
  console.log("Watching dist/ for changes");
  setInterval(() => deployChanged().catch((error) => console.error(error.message)), 1000);
}
