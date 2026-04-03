import { spawn } from "node:child_process";
import { cp, mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import { serve } from "@hono/node-server";
import { buildSite, cleanSite, loadConfig, loadContent, type GitHubDeployConfig, type VercelDeployConfig } from "@bunpress/core";
import { createDevServer, createStaticServer } from "@bunpress/dev-server";
import { ensureEmptyOrMissing, scaffoldPlugin, scaffoldSite, scaffoldTheme } from "./scaffold.ts";

type ContentKind = "post" | "page" | "draft";

interface CreateContentOptions {
  scaffold?: string;
}

function printBuildWarnings(
  warnings: Array<{ code: string; message: string; sourcePath?: string; urlPath?: string }>,
) {
  if (!warnings.length) {
    return;
  }

  console.warn(`Warnings (${warnings.length})`);
  for (const warning of warnings) {
    const location = warning.sourcePath || warning.urlPath;
    console.warn(`- [${warning.code}] ${warning.message}${location ? ` (${location})` : ""}`);
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readScaffoldFile(
  cwd: string,
  kind: ContentKind,
  scaffoldName?: string,
): Promise<string> {
  const resolvedName = scaffoldName?.trim() || kind;
  const scaffoldPath = path.join(cwd, "scaffolds", `${resolvedName}.md`);

  if (await fileExists(scaffoldPath)) {
    return await readFile(scaffoldPath, "utf8");
  }

  throw new Error(
    `Scaffold "${resolvedName}" was not found at ${scaffoldPath}. Add it under scaffolds/ or choose a different --scaffold value.`,
  );
}

function applyScaffoldTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, token: string) => values[token] ?? "");
}

async function createContentFile(
  cwd: string,
  kind: ContentKind,
  title: string,
  options: CreateContentOptions = {},
): Promise<string> {
  const config = await loadConfig(cwd);
  const slug = slugify(title);
  const date = new Date().toISOString();
  const scaffold = await readScaffoldFile(cwd, kind, options.scaffold);
  const fileName =
    kind === "page"
      ? `${slug}.md`
      : `${date.slice(0, 10)}-${slug}.md`;
  const parentDir =
    kind === "post"
      ? config.postsDir
      : kind === "draft"
        ? config.draftsDir
        : config.pagesDir;
  const filePath = path.join(parentDir, fileName);
  const contents = applyScaffoldTemplate(scaffold, {
    title,
    slug,
    date,
    kind,
  });

  await mkdir(parentDir, { recursive: true });
  await writeFile(filePath, contents, "utf8");
  return filePath;
}

async function runCommand(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdio?: "inherit" | "pipe";
  } = {},
): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child =
      process.platform === "win32"
        ? spawn(
            "powershell",
            [
              "-NoProfile",
              "-Command",
              `& ${[command, ...args].map((value) => `'${value.replace(/'/g, "''")}'`).join(" ")}`,
            ],
            {
              cwd: options.cwd,
              env: { ...process.env, ...options.env },
              shell: false,
              stdio: options.stdio === "inherit" ? "inherit" : "pipe",
            },
          )
        : spawn(command, args, {
            cwd: options.cwd,
            env: { ...process.env, ...options.env },
            shell: false,
            stdio: options.stdio === "inherit" ? "inherit" : "pipe",
          });

    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          stderr.trim() || `${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`,
        ),
      );
    });
  });
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await runCommand(command, ["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function runServer(commandName: "dev" | "serve", cwd: string, port: number) {
  const server =
    commandName === "dev"
      ? await createDevServer(cwd)
      : await createStaticServer(cwd);

  const instance = serve({
    fetch: server.fetch,
    port,
  });

  console.log(`${commandName} server running at http://localhost:${port}`);

  const shutdown = async () => {
    await server.close();
    instance.close();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown();
  });
  process.once("SIGTERM", () => {
    void shutdown();
  });

  await new Promise(() => {});
}

function normalizeGitHubRepo(repo: string): string {
  if (repo.includes("://") || repo.startsWith("git@")) {
    return repo;
  }

  if (/^[^/]+\/[^/]+$/.test(repo)) {
    return `https://github.com/${repo}.git`;
  }

  throw new Error(`Invalid GitHub repo value "${repo}". Use "owner/repo" or a full git URL.`);
}

async function resolveGitHubRepo(cwd: string, repo?: string): Promise<string> {
  if (repo && repo.trim()) {
    return normalizeGitHubRepo(repo.trim());
  }

  try {
    const result = await runCommand("git", ["remote", "get-url", "origin"], { cwd });
    return normalizeGitHubRepo(result.stdout.trim());
  } catch {
    throw new Error(
      "No GitHub repo configured. Set deploy.github.repo in site.config.ts, add an origin remote, or pass --repo.",
    );
  }
}

async function publishGitHub(
  cwd: string,
  override: GitHubDeployConfig & { dryRun?: boolean },
): Promise<void> {
  if (!(await commandExists("git"))) {
    throw new Error("Git is required for GitHub publish, but it is not installed or not in PATH.");
  }

  const config = await loadConfig(cwd);
  const deploy = {
    ...config.deploy.github,
    ...override,
  };
  const repo = await resolveGitHubRepo(cwd, deploy.repo);
  const branch = deploy.branch?.trim() || "gh-pages";
  const result = await buildSite(cwd);
  printBuildWarnings(result.warnings);

  if (override.dryRun) {
    console.log(`[dry-run] GitHub publish is configured for ${repo}#${branch}`);
    console.log(`[dry-run] Would publish ${result.outputDir}`);
    if (deploy.cname?.trim()) {
      console.log(`[dry-run] Would write CNAME=${deploy.cname.trim()}`);
    }
    return;
  }

  const publishDir = await mkdtemp(path.join(os.tmpdir(), "bunpress-gh-pages-"));

  try {
    await cp(result.outputDir, publishDir, { recursive: true, force: true });
    if (deploy.cname?.trim()) {
      await writeFile(path.join(publishDir, "CNAME"), `${deploy.cname.trim()}\n`, "utf8");
    }

    await runCommand("git", ["init", "--initial-branch", branch], { cwd: publishDir });
    await runCommand("git", ["config", "user.email", "bunpress@local.invalid"], { cwd: publishDir });
    await runCommand("git", ["config", "user.name", "BunPress"], { cwd: publishDir });
    await runCommand("git", ["add", "."], { cwd: publishDir });
    await runCommand("git", ["commit", "-m", `Publish ${new Date().toISOString()}`], { cwd: publishDir });
    await runCommand("git", ["remote", "add", "origin", repo], { cwd: publishDir });
    await runCommand("git", ["push", "--force", "origin", `HEAD:${branch}`], {
      cwd: publishDir,
      stdio: "inherit",
    });

    console.log(`Published ${result.outputDir} to ${repo}#${branch}`);
  } finally {
    await rm(publishDir, { recursive: true, force: true });
  }
}

async function publishVercel(
  cwd: string,
  override: VercelDeployConfig & { dryRun?: boolean },
): Promise<void> {
  if (!(await commandExists("vercel"))) {
    throw new Error(
      "Vercel CLI is required for Vercel publish. Install it with `bun add -g vercel`.",
    );
  }

  const config = await loadConfig(cwd);
  const deploy = {
    ...config.deploy.vercel,
    ...override,
  };
  const result = await buildSite(cwd);
  printBuildWarnings(result.warnings);
  const args = ["deploy", result.outputDir, "--yes"];

  if (deploy.prod ?? true) {
    args.push("--prod");
  }

  const linkedProjectFile = path.join(cwd, ".vercel", "project.json");
  const isLinked = await fileExists(linkedProjectFile);
  if (deploy.project && !isLinked) {
    throw new Error(
      `This site expects the Vercel project "${deploy.project}". Run \`vercel link\` in ${cwd} before publishing.`,
    );
  }

  if (!isLinked) {
    throw new Error(
      "No Vercel project is linked for this site. Run `vercel link` before publishing, or keep deploy.vercel.project empty until linked.",
    );
  }

  if (override.dryRun) {
    console.log(`[dry-run] Vercel publish is configured${deploy.project ? ` for project ${deploy.project}` : ""}`);
    console.log(`[dry-run] Would run: vercel ${args.join(" ")}`);
    return;
  }

  await runCommand("vercel", args, {
    cwd,
    stdio: "inherit",
  });

  console.log(`Published ${result.outputDir} to Vercel`);
}

export async function run(argv: string[]): Promise<number> {
  const program = new Command();
  const initCommand = program.command("init").description("scaffold a new site, theme, or plugin");
  const newCommand = program.command("new").description("create a new post, page, or draft");
  const publishCommand = program.command("publish").alias("deploy").description("publish the current site");

  program.name("bunpress").description("Bun-first static site generator and publishing CLI");

  initCommand
    .argument("[dir]", "directory to scaffold", ".")
    .action(async (dir: string) => {
      const targetDir = path.resolve(process.cwd(), dir);
      await ensureEmptyOrMissing(targetDir);
      await mkdir(targetDir, { recursive: true });
      await scaffoldSite(targetDir);
      console.log(`Scaffolded BunPress site in ${targetDir}`);
    });

  initCommand
    .command("theme")
    .argument("<name>", "theme name")
    .action(async (name: string) => {
      const normalized = normalizeName(name);
      const targetDir = path.resolve(process.cwd(), "themes", normalized);
      await ensureEmptyOrMissing(targetDir);
      await scaffoldTheme(targetDir);
      console.log(`Scaffolded BunPress theme in ${targetDir}`);
    });

  initCommand
    .command("plugin")
    .argument("<name>", "plugin name")
    .action(async (name: string) => {
      const normalized = normalizeName(name);
      const targetDir = path.resolve(process.cwd(), "plugins", normalized);
      await ensureEmptyOrMissing(targetDir);
      await scaffoldPlugin(targetDir, normalized);
      console.log(`Scaffolded BunPress plugin in ${targetDir}`);
    });

  for (const kind of ["post", "page", "draft"] as const) {
    newCommand
      .command(kind)
      .argument("<title>", `${kind} title`)
      .option("-s, --scaffold <name>", "custom scaffold name")
      .action(async (title: string, options: CreateContentOptions) => {
        const filePath = await createContentFile(process.cwd(), kind, title, options);
        console.log(`Created ${kind}: ${filePath}`);
      });
  }

  program
    .command("build")
    .alias("generate")
    .action(async () => {
      const result = await buildSite(process.cwd());
      printBuildWarnings(result.warnings);
      console.log(`Built ${result.routes.length} routes into ${result.outputDir}`);
    });

  program
    .command("dev")
    .alias("server")
    .option("-p, --port <port>", "port to use", "3000")
    .action(async (options: { port: string }) => {
      await runServer("dev", process.cwd(), Number(options.port));
    });

  program
    .command("serve")
    .option("-p, --port <port>", "port to use", "3000")
    .action(async (options: { port: string }) => {
      await runServer("serve", process.cwd(), Number(options.port));
    });

  program
    .command("clean")
    .action(async () => {
      await cleanSite(process.cwd());
      console.log("Removed generated output");
    });

  program
    .command("list")
    .action(async () => {
      const config = await loadConfig(process.cwd());
      const content = await loadContent(config);
      console.log(`Posts (${content.posts.length})`);
      for (const post of content.posts) {
        console.log(`- ${post.title} -> ${post.urlPath}`);
      }
      console.log(`Pages (${content.pages.length})`);
      for (const page of content.pages) {
        console.log(`- ${page.title} -> ${page.urlPath}`);
      }
    });

  publishCommand
    .command("github")
    .option("--repo <repo>", "GitHub repo as owner/repo or full URL")
    .option("--branch <branch>", "branch to publish", "gh-pages")
    .option("--cname <cname>", "custom domain")
    .option("--dry-run", "validate configuration and show the publish plan")
    .action(async (options: GitHubDeployConfig & { dryRun?: boolean }) => {
      await publishGitHub(process.cwd(), options);
    });

  publishCommand
    .command("vercel")
    .option("--project <project>", "expected linked Vercel project name")
    .option("--prod", "deploy to production")
    .option("--preview", "deploy as preview instead of production")
    .option("--dry-run", "validate configuration and show the publish plan")
    .action(async (options: VercelDeployConfig & { preview?: boolean; dryRun?: boolean }) => {
      await publishVercel(process.cwd(), {
        project: options.project,
        prod: options.preview ? false : options.prod,
        dryRun: options.dryRun,
      });
    });

  try {
    await program.parseAsync(argv, { from: "user" });
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
