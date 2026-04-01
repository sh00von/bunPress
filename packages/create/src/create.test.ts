import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test, afterEach, beforeAll } from "bun:test";
import { spawn } from "node:child_process";
import { run } from "./main.ts";

const tempDirs: string[] = [];
const builtCreatePath = path.resolve(import.meta.dir, "../dist/create-bunpress.js");
const builtCliPath = path.resolve(import.meta.dir, "../../cli/dist/bunpress.js");
const runtimeExecutable = process.execPath;

async function runProcess(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => resolve({ stdout, stderr, exitCode }));
  });
}

async function runCreateCommand(cwd: string, ...args: string[]) {
  if (process.platform === "win32") {
    return await runProcess(
      "powershell",
      ["-NoProfile", "-Command", `& '${runtimeExecutable.replace(/'/g, "''")}' ${args.join(" ")}`],
      cwd,
    );
  }

  return await runProcess(runtimeExecutable, args, cwd);
}

async function pointSiteAtLocalPackage(siteRoot: string) {
  const packageJsonPath = path.join(siteRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    devDependencies?: Record<string, string>;
  };

  packageJson.devDependencies = {
    ...(packageJson.devDependencies ?? {}),
    bunpressjs: `file:${path.resolve(import.meta.dir, "../../cli")}`,
  };

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

beforeAll(async () => {
  const result = await runCreateCommand(path.resolve(import.meta.dir, ".."), "run", "build");
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
});

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("create-bunpress", () => {
  test("bundled create-bunpress artifact responds to help", async () => {
    const result = await runCreateCommand(path.dirname(builtCreatePath), builtCreatePath, "--help");

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("create-bunpress");
    expect(result.stdout).toContain("npx create-bunpress@latest");
  });

  test("create flow scaffolds a working BunPress site", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "create-bunpress-"));
    tempDirs.push(root);
    const siteRoot = path.join(root, "mysite");

    expect(await run([siteRoot])).toBe(0);
    await pointSiteAtLocalPackage(siteRoot);

    const packageJson = await readFile(path.join(siteRoot, "package.json"), "utf8");
    const readme = await readFile(path.join(siteRoot, "README.md"), "utf8");
    const installResult = await runCreateCommand(siteRoot, "install");
    const buildResult = await runCreateCommand(siteRoot, builtCliPath, "build");

    expect(packageJson).toContain('"bunpressjs"');
    expect(readme).toContain("npx create-bunpress@latest mysite");
    expect(installResult.exitCode).toBe(0);
    expect(buildResult.exitCode).toBe(0);
  });

  test("create flow refuses non-empty directories", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "create-bunpress-non-empty-"));
    tempDirs.push(root);
    await writeFile(path.join(root, "existing.txt"), "occupied\n", "utf8");

    const result = await run([root]);
    expect(result).toBe(1);
  });
});
