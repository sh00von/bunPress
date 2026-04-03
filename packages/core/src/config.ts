import { access } from "node:fs/promises";
import path from "node:path";
import { createJiti } from "jiti";
import type { SiteConfig, SiteConfigInput } from "./types.ts";
import { sanitizeUrl } from "./security.ts";
import { ensureLeadingSlash, normalizeUrlPath, trimSlashes } from "./utils.ts";

const DEFAULTS: Omit<
  SiteConfig,
  | "rootDir"
  | "configPath"
  | "contentRoot"
  | "postsDir"
  | "pagesDir"
  | "draftsDir"
  | "publicRoot"
  | "themesRoot"
  | "themeRoot"
  | "plugins"
  | "themeConfig"
> = {
  title: "My Site",
  url: "http://localhost:3000/",
  description: "",
  language: "en",
  basePath: "/",
  permalinkStyle: "day-and-name",
  permalink: "/:year/:month/:day/:slug/",
  theme: "starter",
  paginationSize: 5,
  tagsDir: "tags",
  categoriesDir: "categories",
  archivesDir: "archives",
  showDrafts: false,
  showFuture: false,
  contentDir: "content",
  publicDir: "public",
  themesDir: "themes",
  socialLinks: [],
  menus: {
    primary: [],
    footer: [],
  },
  redirects: {},
  deploy: {},
  pluginsConfig: {},
  seo: {
    siteName: "My Site",
    titleTemplate: "%s | %siteName%",
    defaultDescription: "",
    defaultOgImage: "",
    defaultOgImageAlt: "",
    favicon: "/favicon.svg",
    appleTouchIcon: "",
    manifest: "",
    themeColor: "",
    favicons: [],
    robotsTxt: "",
    robots: {
      index: true,
      follow: true,
    },
    organization: {},
    search: {},
    verification: {},
  },
};

const CONFIG_CANDIDATES = [
  "site.config.ts",
  "site.config.js",
  "site.config.mjs",
];

async function resolveConfigPath(cwd: string): Promise<string> {
  for (const candidate of CONFIG_CANDIDATES) {
    const resolved = path.join(cwd, candidate);
    try {
      await access(resolved);
      return resolved;
    } catch {
      // keep searching
    }
  }

  throw new Error(
    `No site config found in ${cwd}. Expected one of: ${CONFIG_CANDIDATES.join(", ")}`,
  );
}

async function importConfigModule(configPath: string): Promise<SiteConfigInput> {
  const jiti = createJiti(import.meta.url);
  const imported = (await jiti.import(configPath)) as Record<string, unknown>;
  const exported = imported.default ?? imported.config ?? imported;
  const value =
    typeof exported === "function" ? await exported() : exported;

  if (!value || typeof value !== "object") {
    throw new Error(`Invalid site config export in ${configPath}`);
  }

  return value as SiteConfigInput;
}

function sanitizeMenuEntries(
  entries: Array<{ text: string; url: string }> | undefined,
  fieldName: string,
) {
  return (entries ?? []).map((entry, index) => ({
    ...entry,
    url: sanitizeUrl(entry.url, {
      allowedSchemes: ["http", "https", "mailto", "tel"],
      allowRelative: true,
      allowFragment: true,
      fieldName: `${fieldName}[${index}].url`,
    }),
  }));
}

function sanitizeSocialLinks(
  entries: SiteConfigInput["socialLinks"],
) {
  return (entries ?? []).map((entry, index) => ({
    ...entry,
    url: sanitizeUrl(entry.url, {
      allowedSchemes: ["http", "https", "mailto", "tel"],
      allowRelative: true,
      allowFragment: true,
      fieldName: `socialLinks[${index}].url`,
    }),
  }));
}

function sanitizeRedirects(entries: SiteConfigInput["redirects"]) {
  return Object.fromEntries(
    Object.entries(entries ?? {}).map(([source, target]) => [
      normalizeUrlPath(source),
      sanitizeUrl(target, {
        allowedSchemes: ["http", "https"],
        allowRelative: true,
        allowFragment: false,
        fieldName: `redirects["${source}"]`,
      }),
    ]),
  );
}

export async function loadConfig(cwd: string): Promise<SiteConfig> {
  const rootDir = path.resolve(cwd);
  const configPath = await resolveConfigPath(rootDir);
  const input = await importConfigModule(configPath);

  const basePath = ensureLeadingSlash(trimSlashes(input.basePath ?? DEFAULTS.basePath));
  const contentRoot = path.join(rootDir, input.contentDir ?? DEFAULTS.contentDir);
  const themesRoot = path.join(rootDir, input.themesDir ?? DEFAULTS.themesDir);
  const themeName = input.theme ?? DEFAULTS.theme;
  const resolvedTitle = input.title ?? DEFAULTS.title;
  const resolvedPermalinkStyle = input.permalinkStyle ?? DEFAULTS.permalinkStyle;
  const resolvedPermalink =
    resolvedPermalinkStyle === "post-name"
      ? "/:slug/"
      : resolvedPermalinkStyle === "month-and-name"
        ? "/:year/:month/:slug/"
        : resolvedPermalinkStyle === "plain"
          ? "/posts/:slug/"
          : resolvedPermalinkStyle === "custom"
            ? input.permalink ?? DEFAULTS.permalink
            : input.permalink ?? DEFAULTS.permalink;

  return {
    ...DEFAULTS,
    ...input,
    seo: {
      ...DEFAULTS.seo,
      ...(input.seo ?? {}),
      siteName: input.seo?.siteName ?? resolvedTitle,
      defaultDescription: input.seo?.defaultDescription ?? input.description ?? DEFAULTS.description,
      robots: {
        ...DEFAULTS.seo.robots,
        ...(input.seo?.robots ?? {}),
      },
      organization: {
        ...DEFAULTS.seo.organization,
        ...(input.seo?.organization ?? {}),
      },
      search: {
        ...DEFAULTS.seo.search,
        ...(input.seo?.search ?? {}),
      },
      verification: {
        ...DEFAULTS.seo.verification,
        ...(input.seo?.verification ?? {}),
      },
    },
    rootDir,
    configPath,
    basePath: basePath === "//" ? "/" : `${trimSlashes(basePath) ? basePath : "/"}`,
    permalinkStyle: resolvedPermalinkStyle,
    permalink: resolvedPermalink,
    contentRoot,
    postsDir: path.join(contentRoot, "posts"),
    pagesDir: path.join(contentRoot, "pages"),
    draftsDir: path.join(contentRoot, "drafts"),
    publicRoot: path.join(rootDir, input.publicDir ?? DEFAULTS.publicDir),
    themesRoot,
    themeRoot: path.join(themesRoot, themeName),
    plugins: (input.plugins ?? []).map((pluginPath) =>
      path.resolve(rootDir, pluginPath),
    ),
    socialLinks: sanitizeSocialLinks(input.socialLinks),
    redirects: sanitizeRedirects(input.redirects),
    menus: {
      primary: sanitizeMenuEntries(input.menus?.primary, "menus.primary"),
      footer: sanitizeMenuEntries(input.menus?.footer, "menus.footer"),
    },
    deploy: input.deploy ?? {},
    themeConfig: {},
  };
}
