import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import type {
  BuildOptions,
  BuildPhaseId,
  BuildProgressEvent,
  BuildResult,
  ContentGraph,
  Page,
  Post,
  RouteManifestEntry,
  SiteConfig,
  ThemeSlotItem,
  ThemeSlotName,
} from "./types.ts";
import { loadConfig } from "./config.ts";
import { loadContent } from "./content.ts";
import { createDefaultHelpers, loadPlugins } from "./plugins.ts";
import { generateRoutes } from "./routes.ts";
import {
  copyThemeAssets,
  createThemeAdapter,
  resolveThemeConfig,
} from "./theme.ts";
import { buildRobotsTxt, buildSitemapXml, resolveSeo } from "./seo.ts";
import {
  buildAtomXml,
  buildRedirectArtifacts,
  buildRssXml,
  collectBuildWarnings,
  defaultFeedArtifacts,
  writeRedirectOutputs,
} from "./publishing.ts";
import { toRelativeHref, writeFileIfChanged } from "./utils.ts";

type SlotMap = Record<ThemeSlotName, Record<string, ThemeSlotItem[]> | ThemeSlotItem[]>;

const BUILD_PHASES: Array<{ id: BuildPhaseId; label: string }> = [
  { id: "config", label: "Load config" },
  { id: "content", label: "Load content" },
  { id: "transform", label: "Transform content" },
  { id: "routes", label: "Generate routes" },
  { id: "assets", label: "Prepare output" },
  { id: "render", label: "Render pages" },
  { id: "artifacts", label: "Generate artifacts" },
  { id: "warnings", label: "Collect warnings" },
  { id: "complete", label: "Complete" },
];

function createProgressEmitter(onProgress?: (event: BuildProgressEvent) => void) {
  const phaseCount = BUILD_PHASES.length;

  return (phaseId: BuildPhaseId, detail?: string) => {
    if (!onProgress) {
      return;
    }

    const phaseIndex = BUILD_PHASES.findIndex((phase) => phase.id === phaseId);
    if (phaseIndex === -1) {
      return;
    }

    onProgress({
      phaseId,
      phaseLabel: BUILD_PHASES[phaseIndex]?.label ?? phaseId,
      phaseIndex: phaseIndex + 1,
      phaseCount,
      detail,
    });
  };
}

function createEmptySlotMap(): SlotMap {
  return {
    post_meta: {},
    post_footer: {},
    page_footer: {},
    head: [],
    site_header: [],
    sidebar_primary: [],
    post_above_content: {},
    post_below_content: {},
    page_above_content: {},
    page_below_content: {},
    site_footer: [],
  };
}

function getDefaultSlotItems(
  slotName: ThemeSlotName,
  config: SiteConfig,
  post?: Post,
): ThemeSlotItem[] {
  if (slotName !== "post_meta" || !post) {
    return [];
  }

  const items: ThemeSlotItem[] = [];

  if (post.date) {
    const formattedDate = new Intl.DateTimeFormat(config.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(post.date));
    items.push({ kind: "text", text: formattedDate });
  }

  const primaryCategory = post.categories[0];
  if (primaryCategory) {
    items.push({
      kind: "text",
      text: primaryCategory,
      url: `/${config.categoriesDir}/${primaryCategory.toLowerCase().replace(/\s+/g, "-")}/`,
    });
  }

  return items;
}

async function resolveSlots(
  config: SiteConfig,
  content: ContentGraph,
  route: RouteManifestEntry,
  plugins: Awaited<ReturnType<typeof loadPlugins>>,
): Promise<SlotMap> {
  const slots = createEmptySlotMap();
  const pageData = route.pageData as {
    post?: Post;
    page?: Page;
    posts?: Post[];
    entry?: { posts?: Post[] };
    archives?: Array<{ posts?: Post[] }>;
  };

  const resolvePostSlots = async (post: Post) => {
    const context = { config, content, route, post };
    const pluginItems = await plugins.resolveSlot("post_meta", context);
    (slots.post_meta as Record<string, ThemeSlotItem[]>)[post.id] = [
      ...getDefaultSlotItems("post_meta", config, post),
      ...pluginItems,
    ];
    (slots.post_above_content as Record<string, ThemeSlotItem[]>)[post.id] =
      await plugins.resolveSlot("post_above_content", context);
    (slots.post_below_content as Record<string, ThemeSlotItem[]>)[post.id] =
      await plugins.resolveSlot("post_below_content", context);
    (slots.post_footer as Record<string, ThemeSlotItem[]>)[post.id] =
      await plugins.resolveSlot("post_footer", context);
  };

  const posts = new Map<string, Post>();
  if (pageData.post) {
    posts.set(pageData.post.id, pageData.post);
  }
  for (const post of pageData.posts ?? []) {
    posts.set(post.id, post);
  }
  for (const post of pageData.entry?.posts ?? []) {
    posts.set(post.id, post);
  }
  for (const group of pageData.archives ?? []) {
    for (const post of group.posts ?? []) {
      posts.set(post.id, post);
    }
  }

  for (const post of posts.values()) {
    await resolvePostSlots(post);
  }

  if (pageData.page) {
    const pageContext = { config, content, route, page: pageData.page };
    (slots.page_above_content as Record<string, ThemeSlotItem[]>)[pageData.page.id] =
      await plugins.resolveSlot("page_above_content", pageContext);
    (slots.page_below_content as Record<string, ThemeSlotItem[]>)[pageData.page.id] =
      await plugins.resolveSlot("page_below_content", pageContext);
    (slots.page_footer as Record<string, ThemeSlotItem[]>)[pageData.page.id] =
      await plugins.resolveSlot("page_footer", pageContext);
  }

  slots.head = await plugins.resolveSlot("head", { config, content, route });
  slots.site_header = await plugins.resolveSlot("site_header", {
    config,
    content,
    route,
  });
  slots.sidebar_primary = await plugins.resolveSlot("sidebar_primary", {
    config,
    content,
    route,
  });
  slots.site_footer = await plugins.resolveSlot("site_footer", {
    config,
    content,
    route,
  });

  return slots;
}

async function renderLocals(
  config: SiteConfig,
  content: ContentGraph,
  route: RouteManifestEntry,
  plugins: Awaited<ReturnType<typeof loadPlugins>>,
  routes: RouteManifestEntry[],
  engineAssets: Record<string, string>,
) {
  const slots = await resolveSlots(config, content, route, plugins);
  const seo = resolveSeo({ config, content, route });
  const feeds = defaultFeedArtifacts();
  const themeSeo = {
    ...seo,
    breadcrumbsRelative: seo.breadcrumbs.map((item) => {
      const itemUrl = new URL(item.url);
      return {
        ...item,
        href: toRelativeHref(
          `${itemUrl.pathname}${itemUrl.search}${itemUrl.hash}`,
          route.urlPath,
        ),
      };
    }),
  };

  return {
    site: {
      ...config,
      theme: config.themeConfig,
    },
    page: route.pageData,
    currentUrlPath: route.urlPath,
    seo: themeSeo,
    routes,
    engineAssets,
    feeds,
    slots,
    collections: {
      posts: content.posts,
      pages: content.pages,
      tags: content.tags,
      categories: content.categories,
      archives: content.archives,
    },
  };
}

export async function cleanSite(cwd: string): Promise<void> {
  const config = await loadConfig(cwd);
  await rm(config.publicRoot, { force: true, recursive: true });
}

export async function buildSite(cwd: string, options: BuildOptions = {}): Promise<BuildResult> {
  const startedAt = new Date().toISOString();
  const emitProgress = createProgressEmitter(options.onProgress);

  emitProgress("config");
  let config = await loadConfig(cwd);
  config = await resolveThemeConfig(config);

  const plugins = await loadPlugins(config);
  const helpers = createDefaultHelpers(config);
  for (const [name, helper] of plugins.helpers.entries()) {
    helpers.set(name, helper);
  }

  await plugins.run("config:resolved", { config });

  emitProgress("content");
  const content = await loadContent(config);
  await plugins.run("content:loaded", { config, content });

  emitProgress("transform");
  await plugins.run("content:transformed", { config, content });

  emitProgress("routes");
  const routes = generateRoutes(config, content);
  await plugins.run("routes:generated", { config, content, routes });

  emitProgress("assets");
  await rm(config.publicRoot, { force: true, recursive: true });
  await mkdir(config.publicRoot, { recursive: true });
  await copyThemeAssets(config);

  const theme = await createThemeAdapter({ config, helpers });
  const engineAssets: Record<string, string> = {};
  const renderedPages: Array<{ route: RouteManifestEntry; html: string }> = [];

  try {
    emitProgress("render", routes.length > 0 ? `0/${routes.length} routes` : "0 routes");
    for (const [index, route] of routes.entries()) {
      emitProgress("render", `${index + 1}/${routes.length} routes`);
      const locals = await renderLocals(
        config,
        content,
        route,
        plugins,
        routes,
        engineAssets,
      );
      const html = await theme.render(
        route.layout,
        locals,
      );
      await writeFileIfChanged(route.outputPath, html);
      renderedPages.push({ route, html });
    }

    emitProgress("artifacts");
    const redirectArtifacts = buildRedirectArtifacts(config, content, routes);
    await writeRedirectOutputs(config, redirectArtifacts.redirects);

    await writeFileIfChanged(
      path.join(config.publicRoot, "sitemap.xml"),
      buildSitemapXml(config, routes, content),
    );
    await writeFileIfChanged(
      path.join(config.publicRoot, "robots.txt"),
      buildRobotsTxt(config),
    );
    await writeFileIfChanged(
      path.join(config.publicRoot, "feed.xml"),
      buildRssXml(config, content),
    );
    await writeFileIfChanged(
      path.join(config.publicRoot, "atom.xml"),
      buildAtomXml(config, content),
    );
    if (redirectArtifacts.redirectsFile) {
      await writeFileIfChanged(
        path.join(config.publicRoot, "_redirects"),
        redirectArtifacts.redirectsFile,
      );
    }

    emitProgress("warnings");
    const warnings = await collectBuildWarnings({
      config,
      content,
      routes,
      redirects: redirectArtifacts.redirects,
      renderedPages,
    });

    const result: BuildResult = {
      outputDir: config.publicRoot,
      routes,
      content,
      engineAssets,
      redirects: redirectArtifacts.redirects,
      warnings: [...redirectArtifacts.warnings, ...warnings],
      feeds: defaultFeedArtifacts(),
      startedAt,
      endedAt: new Date().toISOString(),
    };

    await plugins.run("build:done", { config, content, routes, result });
    emitProgress("complete", `${result.routes.length} routes`);

    return result;
  } finally {
    await theme.close();
  }
}
