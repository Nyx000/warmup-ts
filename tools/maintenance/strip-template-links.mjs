// Run by `bun create` in the new project. Bun splits that command on spaces without a shell,
// so the logic lives here rather than in a quoted `bun -e` string.
import { join } from "path";

const file = join(process.cwd(), "package.json");
const pkg = await Bun.file(file).json();
for (const key of ["repository", "bugs", "homepage"]) delete pkg[key];
await Bun.write(file, JSON.stringify(pkg, null, 2) + "\n");
