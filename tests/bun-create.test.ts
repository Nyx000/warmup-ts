import { expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// `bun create` splits the command on spaces and runs it in the new project's folder with no shell.
test("the bun-create postinstall drops the template's repository links and nothing else", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const dir = mkdtempSync(join(tmpdir(), "bun-create-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify(pkg));

  const command: string[] = pkg["bun-create"].postinstall.split(" ");
  const script = command[1];
  mkdirSync(join(dir, dirname(script)), { recursive: true });
  cpSync(script, join(dir, script));

  const run = Bun.spawnSync(command, { cwd: dir });
  expect(run.exitCode).toBe(0);

  const { repository, bugs, homepage, ...rest } = pkg;
  expect(JSON.parse(readFileSync(join(dir, "package.json"), "utf8"))).toEqual(rest);
  expect([repository, bugs, homepage]).not.toContain(undefined);
});
