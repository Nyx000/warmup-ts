/**
 * Copies Valve's point_script.d.ts from the CS2 install to src/types/cs_script.d.ts.
 *
 *   bun run sync-types
 */

import { existsSync } from "fs";
import { chmod, copyFile, readFile } from "fs/promises";
import { dirname, join } from "path";
import { getTypeDefinitionsPath } from "../utils/cs2-path.mjs";

const root = join(import.meta.dir, "../..");
const target = join(root, "src/types/cs_script.d.ts");

const source = await getTypeDefinitionsPath();
if (!source) {
  console.error("point_script.d.ts not found. Set CS2_INSTALL_PATH to the Counter-Strike Global Offensive folder.");
  process.exit(1);
}

// Valve's tsconfig beside the typings tracks the JavaScript version CS2 runs
const valveConfig = join(dirname(source), "tsconfig.json");
if (existsSync(valveConfig)) {
  const theirs = JSON.parse(await readFile(valveConfig, "utf8")).compilerOptions?.target;
  const ours = JSON.parse(await readFile(join(root, "tsconfig.json"), "utf8")).compilerOptions?.target;
  if (theirs && ours && theirs.toLowerCase() !== ours.toLowerCase()) {
    console.warn(`CS2 targets ${theirs}, tsconfig.json targets ${ours}: update target and lib, and ecmaVersion in eslint.config.js`);
  }
}

if (existsSync(target) && (await readFile(target, "utf8")) === (await readFile(source, "utf8"))) {
  console.log("cs_script.d.ts is up to date");
  process.exit(0);
}

// The copy is kept read-only so nobody edits Valve's file by hand
if (existsSync(target)) await chmod(target, 0o644);
await copyFile(source, target);
await chmod(target, 0o444);
console.log(`Updated cs_script.d.ts from ${source}; review the diff with git diff`);
