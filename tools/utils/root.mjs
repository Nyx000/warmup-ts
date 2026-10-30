/**
 * The repo a build tool works on: the one named by --root <dir>, for a gamemode kept in its own repo
 * with WarmupTS as a dependency, or else this one.
 */

import { join, resolve } from "path";

const flag = process.argv.indexOf("--root");

export const root = flag >= 0 ? resolve(process.argv[flag + 1]) : join(import.meta.dir, "../..");

/** The --root arguments as given, to hand on to another tool. */
export const rootArgs = flag >= 0 ? ["--root", process.argv[flag + 1]] : [];
