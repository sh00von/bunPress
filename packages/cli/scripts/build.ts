import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve(import.meta.dir, "../dist");
await mkdir(distDir, { recursive: true });

const result = await Bun.build({
  entrypoints: [path.resolve(import.meta.dir, "../src/index.ts")],
  outdir: distDir,
  naming: {
    entry: "main.js",
  },
  target: "bun",
  format: "esm",
  minify: false,
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

const wrapper = `#!/usr/bin/env bun
import "./main.js";
`;

await writeFile(path.join(distDir, "bunpress.js"), wrapper, "utf8");

const jitiBabelPath = path.resolve(import.meta.dir, "../../core/node_modules/jiti/dist/babel.cjs");
await copyFile(jitiBabelPath, path.join(distDir, "babel.cjs"));
