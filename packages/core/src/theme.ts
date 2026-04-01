import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { createJiti } from "jiti";
import nunjucks from "nunjucks";
import type {
  BuildContext,
  RouteManifestEntry,
  SiteConfig,
  ThemeAdapter,
} from "./types.ts";
import { hashContent, writeFileIfChanged } from "./utils.ts";
import { renderTrustedHtml } from "./security.ts";

async function maybeImportThemeConfig(config: SiteConfig): Promise<Record<string, unknown>> {
  const candidates = ["theme.config.ts", "theme.config.js", "theme.config.mjs"];

  for (const candidate of candidates) {
    const candidatePath = path.join(config.themeRoot, candidate);
    try {
      await access(candidatePath);
      const jiti = createJiti(import.meta.url);
      const imported = (await jiti.import(candidatePath)) as Record<string, unknown>;
      const value = imported.default ?? imported.config ?? imported;
      const resolvedValue = typeof value === "function" ? await value() : value;
      return resolvedValue && typeof resolvedValue === "object"
        ? (resolvedValue as Record<string, unknown>)
        : {};
    } catch {
      // keep checking
    }
  }

  return {};
}

export async function resolveThemeConfig(config: SiteConfig): Promise<SiteConfig> {
  return {
    ...config,
    themeConfig: await maybeImportThemeConfig(config),
  };
}

export async function createThemeAdapter(
  context: BuildContext,
): Promise<ThemeAdapter> {
  const loader = new nunjucks.FileSystemLoader(
    [
      path.join(context.config.themeRoot, "layout"),
      path.join(context.config.themeRoot, "partials"),
    ],
    {
      noCache: true,
      watch: false,
    },
  );
  const env = new nunjucks.Environment(loader, {
    autoescape: true,
    throwOnUndefined: false,
  });

  for (const [name, helper] of context.helpers.entries()) {
    env.addGlobal(name, helper);
  }
  env.addGlobal("renderTrusted", renderTrustedHtml);

  return {
    async render(layout, locals) {
      return await new Promise<string>((resolve, reject) => {
        env.render(`${layout}.njk`, locals, (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result ?? "");
        });
      });
    },
    async close() {
      const loaders = (env as nunjucks.Environment & {
        loaders?: Array<{ emit: (eventName: string, payload: string) => void }>;
      }).loaders;
      loaders?.forEach((loaderInstance) => loaderInstance.emit("update", ""));
    },
  };
}

export async function copyThemeAssets(config: SiteConfig): Promise<void> {
  const assetsDir = path.join(config.themeRoot, "assets");

  try {
    await access(assetsDir);
  } catch {
    return;
  }

  await mkdir(config.publicRoot, { recursive: true });
  await cp(assetsDir, path.join(config.publicRoot, "assets"), {
    force: true,
    recursive: true,
  });
}

export async function emitEngineAsset(
  config: SiteConfig,
  assetName: string,
  contents: string,
): Promise<string> {
  const hashedName = `${assetName.replace(/\.[^.]+$/, "")}.${hashContent(contents)}${path.extname(assetName)}`;
  const assetPath = path.join(config.publicRoot, "engine", hashedName);
  await writeFileIfChanged(assetPath, contents);
  return `/engine/${hashedName}`;
}
