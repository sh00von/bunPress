import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve(import.meta.dir, "../dist");
await mkdir(distDir, { recursive: true });

const result = await Bun.build({
  entrypoints: [path.resolve(import.meta.dir, "../src/main.ts")],
  outdir: distDir,
  naming: {
    entry: "main.js",
  },
  target: "node",
  format: "esm",
  minify: false,
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

const wrapper = `#!/usr/bin/env node
import { run } from "./main.js";

const exitCode = await run(process.argv.slice(2));
process.exit(exitCode);
`;

await writeFile(path.join(distDir, "create-bunpress.js"), wrapper, "utf8");
