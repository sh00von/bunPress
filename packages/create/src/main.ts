import { mkdir } from "node:fs/promises";
import path from "node:path";
import { ensureEmptyOrMissing, scaffoldSite } from "../../cli/src/scaffold.ts";
import createPackage from "../package.json";

function helpText() {
  return `create-bunpress

Usage:
  npx create-bunpress@latest <dir>
  npm create bunpress@latest <dir>

Examples:
  npx create-bunpress@latest mysite
  npm create bunpress@latest mysite

What you get:
  - a starter BunPress site
  - starter content, theme files, plugins, and scaffolds
  - a local workflow built around bunpress dev/build/publish
`;
}

export async function run(argv: string[]): Promise<number> {
  try {
    const first = argv[0];

    if (!first || first === "--help" || first === "-h") {
      console.log(helpText());
      return 0;
    }

    if (first === "--version" || first === "-v") {
      console.log(`create-bunpress ${createPackage.version}`);
      return 0;
    }

    const targetDir = path.resolve(process.cwd(), first);
    await ensureEmptyOrMissing(targetDir);
    await mkdir(targetDir, { recursive: true });
    await scaffoldSite(targetDir);

    const relativeTarget = path.relative(process.cwd(), targetDir) || ".";
    console.log(`Scaffolded BunPress site in ${targetDir}`);
    console.log("");
    console.log("Next steps:");
    console.log(`  cd ${relativeTarget}`);
    console.log("  bun install");
    console.log("  bunpress dev");
    console.log('  bunpress new post "Launch Notes"');

    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
