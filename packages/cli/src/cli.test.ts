import { spawn } from "node:child_process";
import { access, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import type { BuildProgressEvent } from "@bunpress/core";
import { run } from "./run.ts";
import { BuildProgressRenderer } from "./progress.ts";

const tempDirs: string[] = [];
const builtCliPath = path.resolve(import.meta.dir, "../dist/bunpress.js");
const runtimeExecutable = process.execPath;

function withCwd(targetDir: string, callback: () => Promise<void>) {
  const previous = process.cwd();
  process.chdir(targetDir);

  return callback().finally(() => {
    process.chdir(previous);
  });
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

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
    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode });
    });
  });
}

async function runBunCommand(cwd: string, ...args: string[]) {
  if (process.platform === "win32") {
    return await runProcess(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `& '${runtimeExecutable.replace(/'/g, "''")}' ${args.join(" ")}`,
      ],
      cwd,
    );
  }

  return await runProcess(runtimeExecutable, args, cwd);
}

async function captureConsole(
  callback: () => Promise<number>,
  kind: "log" | "error",
) {
  const messages: string[] = [];
  const original = console[kind];
  console[kind] = (...args: unknown[]) => {
    messages.push(args.map((value) => String(value)).join(" "));
  };

  try {
    const exitCode = await callback();
    return { exitCode, messages };
  } finally {
    console[kind] = original;
  }
}

function createProgressEvent(overrides: Partial<BuildProgressEvent> = {}): BuildProgressEvent {
  return {
    phaseId: "content",
    phaseLabel: "Load content",
    phaseIndex: 2,
    phaseCount: 9,
    ...overrides,
  };
}

beforeAll(async () => {
  const result = await runProcess(runtimeExecutable, ["run", "build"], path.resolve(import.meta.dir, ".."));
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

describe("cli", () => {
  test("bundled bunpress artifact responds to help", async () => {
    const result = await runBunCommand(path.dirname(builtCliPath), builtCliPath, "--help");

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("bunpress");
    expect(result.stdout).toContain("publish");
  });

  test("init scaffolds a standalone site with default scaffolds", async () => {
    const siteRoot = await mkdtemp(path.join(os.tmpdir(), "bunpress-cli-init-"));
    tempDirs.push(siteRoot);

    await withCwd(siteRoot, async () => {
      const exitCode = await run(["init", "."]);
      expect(exitCode).toBe(0);
    });

    const topLevelEntries = await readdir(siteRoot);
    const packageJson = await readFile(path.join(siteRoot, "package.json"), "utf8");
    const siteConfig = await readFile(path.join(siteRoot, "site.config.ts"), "utf8");
    const draftScaffold = await readFile(path.join(siteRoot, "scaffolds/draft.md"), "utf8");

    expect(topLevelEntries).toContain("site.config.ts");
    expect(topLevelEntries).toContain("themes");
    expect(topLevelEntries).toContain("content");
    expect(topLevelEntries).toContain("scaffolds");
    expect(packageJson).toContain('"build": "bunpress build"');
    expect(packageJson).toContain('"new:draft": "bunpress new draft"');
    expect(packageJson).not.toContain("packages/cli");
    expect(siteConfig).not.toContain("headerLinks");
    expect(siteConfig).not.toContain("siteChrome");
    expect(draftScaffold).toContain("draft: true");
  });

  test("new commands create post, page, and draft content from scaffolds", async () => {
    const siteRoot = await mkdtemp(path.join(os.tmpdir(), "bunpress-cli-new-"));
    tempDirs.push(siteRoot);

    await withCwd(siteRoot, async () => {
      expect(await run(["init", "."])).toBe(0);
      expect(await run(["new", "post", "CLI Generated"])).toBe(0);
      expect(await run(["new", "page", "Docs"])).toBe(0);
      expect(await run(["new", "draft", "Future Ideas"])).toBe(0);
    });

    const generatedPost = await readFile(
      path.join(siteRoot, "content/posts", `${new Date().toISOString().slice(0, 10)}-cli-generated.md`),
      "utf8",
    );
    const generatedPage = await readFile(path.join(siteRoot, "content/pages/docs.md"), "utf8");
    const generatedDraft = await readFile(
      path.join(siteRoot, "content/drafts", `${new Date().toISOString().slice(0, 10)}-future-ideas.md`),
      "utf8",
    );

    expect(generatedPost).toContain("title: CLI Generated");
    expect(generatedPost).toContain("slug: cli-generated");
    expect(generatedPage).toContain("title: Docs");
    expect(generatedDraft).toContain("title: Future Ideas");
    expect(generatedDraft).toContain("draft: true");
  });

  test("custom scaffold selection works for content creation", async () => {
    const siteRoot = await mkdtemp(path.join(os.tmpdir(), "bunpress-cli-custom-scaffold-"));
    tempDirs.push(siteRoot);

    await withCwd(siteRoot, async () => {
      expect(await run(["init", "."])).toBe(0);
      await writeFile(
        path.join(siteRoot, "scaffolds/announcement.md"),
        `---\ntitle: {{ title }}\nslug: {{ slug }}\ncategory: announcement\n---\n\nAnnouncement body.\n`,
        "utf8",
      );
      expect(await run(["new", "post", "Launch Day", "--scaffold", "announcement"])).toBe(0);
    });

    const generatedPost = await readFile(
      path.join(siteRoot, "content/posts", `${new Date().toISOString().slice(0, 10)}-launch-day.md`),
      "utf8",
    );

    expect(generatedPost).toContain("category: announcement");
    expect(generatedPost).toContain("Announcement body.");
  });

  test("theme and plugin starters are scaffolded", async () => {
    const siteRoot = await mkdtemp(path.join(os.tmpdir(), "bunpress-cli-starters-"));
    tempDirs.push(siteRoot);

    await withCwd(siteRoot, async () => {
      expect(await run(["init", "."])).toBe(0);
      expect(await run(["init", "theme", "magazine"])).toBe(0);
      expect(await run(["init", "plugin", "reading-badge"])).toBe(0);
    });

    expect(await exists(path.join(siteRoot, "themes/magazine/layout/base.njk"))).toBe(true);
    expect(await exists(path.join(siteRoot, "themes/magazine/layout/index.njk"))).toBe(true);
    expect(await exists(path.join(siteRoot, "plugins/reading-badge/index.ts"))).toBe(true);

    const pluginSource = await readFile(path.join(siteRoot, "plugins/reading-badge/index.ts"), "utf8");
    expect(pluginSource).toContain("content:transformed");
  });

  test("generated site builds successfully with the built bunpress binary", async () => {
    const siteRoot = await mkdtemp(path.join(os.tmpdir(), "bunpress-cli-build-"));
    tempDirs.push(siteRoot);

    await withCwd(siteRoot, async () => {
      expect(await run(["init", "."])).toBe(0);
      expect(await run(["new", "post", "CLI Generated"])).toBe(0);
      expect(await run(["new", "draft", "Queued Thoughts"])).toBe(0);
    });

    const buildResult = await runBunCommand(siteRoot, builtCliPath, "build");

    expect(buildResult.exitCode).toBe(0);

    const builtIndex = await readFile(path.join(siteRoot, "public/index.html"), "utf8");
    const builtFeed = await readFile(path.join(siteRoot, "public/feed.xml"), "utf8");
    const builtAtom = await readFile(path.join(siteRoot, "public/atom.xml"), "utf8");
    const builtRedirect = await readFile(path.join(siteRoot, "public/start/index.html"), "utf8");

    expect(builtIndex).toContain("Platform Briefing");
    expect(builtIndex).not.toContain("Queued Thoughts");
    expect(builtFeed).toContain("<rss version=\"2.0\">");
    expect(builtAtom).toContain("<feed xmlns=\"http://www.w3.org/2005/Atom\">");
    expect(builtRedirect).toContain("Redirecting to");
  });

  test("build command emits progress logs before the final summary in non-tty mode", async () => {
    const siteRoot = await mkdtemp(path.join(os.tmpdir(), "bunpress-cli-progress-"));
    tempDirs.push(siteRoot);

    await withCwd(siteRoot, async () => {
      expect(await run(["init", "."])).toBe(0);
      expect(await run(["new", "post", "CLI Generated"])).toBe(0);
      const result = await captureConsole(async () => await run(["build"]), "log");
      const output = result.messages.join("\n");

      expect(result.exitCode).toBe(0);
      expect(output).toContain("[bunpress:build] 1/9 Load config");
      expect(output).toContain("[bunpress:build] 9/9 Complete");
      expect(output).toContain("Build completed (");
      expect(output).toContain("Built ");
      expect(output).not.toContain("\x1b[42m");
    });
  });

  test("interactive progress renderer uses green ansi block cells", () => {
    let written = "";
    const stream = {
      isTTY: true,
      write(chunk: string) {
        written += chunk;
        return true;
      },
    } as unknown as NodeJS.WriteStream;
    const renderer = new BuildProgressRenderer("[bunpress:build]", {
      stream,
      isTTY: true,
    });

    renderer.update(createProgressEvent());

    expect(written).toContain("\r[bunpress:build] [");
    expect(written).toContain("\x1b[42m  \x1b[0m");
    expect(written).toContain("\x1b[47m\x1b[90m  \x1b[0m");
    expect(written).toContain(" 11% Load content");
  });

  test("clean removes generated output only", async () => {
    const siteRoot = await mkdtemp(path.join(os.tmpdir(), "bunpress-cli-clean-"));
    tempDirs.push(siteRoot);

    await withCwd(siteRoot, async () => {
      expect(await run(["init", "."])).toBe(0);
      expect(await run(["build"])).toBe(0);
      expect(await run(["clean"])).toBe(0);
    });

    expect(await exists(path.join(siteRoot, "site.config.ts"))).toBe(true);
    expect(await exists(path.join(siteRoot, "public/index.html"))).toBe(false);
  });

  test("github publish dry-run validates and reports the plan", async () => {
    const siteRoot = await mkdtemp(path.join(os.tmpdir(), "bunpress-cli-gh-dry-"));
    tempDirs.push(siteRoot);

    await withCwd(siteRoot, async () => {
      expect(await run(["init", "."])).toBe(0);
      const configPath = path.join(siteRoot, "site.config.ts");
      const config = await readFile(configPath, "utf8");
      await writeFile(
        configPath,
        config.replace('repo: ""', 'repo: "owner/example-repo"'),
        "utf8",
      );

      const result = await captureConsole(async () => await run(["publish", "github", "--dry-run"]), "log");
      expect(result.exitCode).toBe(0);
      expect(result.messages.join("\n")).toContain("[dry-run] GitHub publish is configured");
    });
  });

  test("github publish validates missing repository configuration clearly", async () => {
    const siteRoot = await mkdtemp(path.join(os.tmpdir(), "bunpress-cli-gh-"));
    tempDirs.push(siteRoot);

    await withCwd(siteRoot, async () => {
      expect(await run(["init", "."])).toBe(0);
      const result = await captureConsole(async () => await run(["publish", "github"]), "error");
      expect(result.exitCode).toBe(1);
      expect(result.messages.join("\n")).toContain("No GitHub repo configured");
    });
  });

  test("vercel publish dry-run validates missing link state clearly", async () => {
    const siteRoot = await mkdtemp(path.join(os.tmpdir(), "bunpress-cli-vercel-dry-"));
    tempDirs.push(siteRoot);

    await withCwd(siteRoot, async () => {
      expect(await run(["init", "."])).toBe(0);
      await mkdir(path.join(siteRoot, ".vercel"), { recursive: true });
      await writeFile(
        path.join(siteRoot, ".vercel/project.json"),
        JSON.stringify({ projectId: "test", orgId: "org", projectName: "demo" }),
        "utf8",
      );

      const configPath = path.join(siteRoot, "site.config.ts");
      const config = await readFile(configPath, "utf8");
      await writeFile(
        configPath,
        config.replace('project: ""', 'project: "demo"'),
        "utf8",
      );

      const previousPath = process.env.PATH;
      const stubDir = path.join(siteRoot, "fake-bin");
      await mkdir(stubDir, { recursive: true });
      const vercelStub = path.join(
        stubDir,
        process.platform === "win32" ? "vercel.cmd" : "vercel",
      );
      await writeFile(
        vercelStub,
        process.platform === "win32"
          ? "@echo off\r\necho Vercel CLI 99.0.0\r\n"
          : "#!/usr/bin/env sh\necho Vercel CLI 99.0.0\n",
        "utf8",
      );
      process.env.PATH = `${stubDir}${path.delimiter}${previousPath ?? ""}`;
      if (process.platform === "win32") {
        process.env.PATHEXT = ".CMD;.EXE;.BAT;.COM";
      }

      try {
        const result = await captureConsole(async () => await run(["publish", "vercel", "--dry-run"]), "log");
        expect(result.exitCode).toBe(0);
        expect(result.messages.join("\n")).toContain("[dry-run] Vercel publish is configured");
      } finally {
        process.env.PATH = previousPath;
      }
    });
  });

  test("vercel publish validates missing CLI clearly", async () => {
    const siteRoot = await mkdtemp(path.join(os.tmpdir(), "bunpress-cli-vercel-"));
    tempDirs.push(siteRoot);

    await withCwd(siteRoot, async () => {
      expect(await run(["init", "."])).toBe(0);
      const previousPath = process.env.PATH;
      process.env.PATH = "";

      try {
        const result = await captureConsole(async () => await run(["publish", "vercel"]), "error");
        expect(result.exitCode).toBe(1);
        expect(result.messages.join("\n")).toContain("Vercel CLI is required");
      } finally {
        process.env.PATH = previousPath;
      }
    });
  });
});
