import path from "node:path";
import type {
  BuildWarning,
  ContentGraph,
  FeedArtifacts,
  RedirectEntry,
  RouteManifestEntry,
  SiteConfig,
} from "./types.ts";
import {
  normalizeUrlPath,
  safeStat,
  toOutputFile,
  toPermalink,
  toRelativeHref,
  trimSlashes,
  writeFileIfChanged,
} from "./utils.ts";

interface RedirectArtifacts {
  redirects: RedirectEntry[];
  warnings: BuildWarning[];
  redirectsFile: string;
}

interface CollectWarningsContext {
  config: SiteConfig;
  content: ContentGraph;
  routes: RouteManifestEntry[];
  redirects: RedirectEntry[];
  renderedPages: Array<{ route: RouteManifestEntry; html: string }>;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toPublicFilePath(publicRoot: string, urlPath: string): string {
  const normalized = normalizeUrlPath(urlPath);
  if (normalized === "/") {
    return path.join(publicRoot, "index.html");
  }

  if (normalized === "/404/") {
    return path.join(publicRoot, "404.html");
  }

  if (/\.[a-zA-Z0-9]+$/.test(normalized)) {
    return path.join(publicRoot, trimSlashes(normalized));
  }

  return path.join(publicRoot, toOutputFile(normalized));
}

function normalizeRedirectTarget(target: string): string {
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(target) || target.startsWith("//")) {
    return target;
  }

  return normalizeUrlPath(target);
}

function redirectHtml(config: SiteConfig, redirect: RedirectEntry): string {
  const normalizedTarget = normalizeRedirectTarget(redirect.target);
  const absoluteCanonical = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(normalizedTarget)
    ? normalizedTarget
    : toPermalink(config.url, normalizedTarget);
  const destinationHref = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(normalizedTarget)
    ? normalizedTarget
    : toRelativeHref(normalizedTarget, redirect.sourcePath);

  return [
    "<!doctype html>",
    `<html lang="${htmlEscape(config.language)}">`,
    "  <head>",
    '    <meta charset="utf-8" />',
    `    <title>Redirecting to ${htmlEscape(absoluteCanonical)}</title>`,
    `    <link rel="canonical" href="${htmlEscape(absoluteCanonical)}" />`,
    '    <meta name="robots" content="noindex, follow" />',
    `    <meta http-equiv="refresh" content="0; url=${htmlEscape(destinationHref)}" />`,
    "  </head>",
    "  <body>",
    `    <p>Redirecting to <a href="${htmlEscape(destinationHref)}">${htmlEscape(absoluteCanonical)}</a>.</p>`,
    "  </body>",
    "</html>",
    "",
  ].join("\n");
}

function feedDescription(config: SiteConfig, item: { excerpt: string }): string {
  return item.excerpt || config.seo.defaultDescription || config.description || config.title;
}

export function buildRssXml(config: SiteConfig, content: ContentGraph): string {
  const items = content.posts.map((post) => [
    "    <item>",
    `      <title>${xmlEscape(post.title)}</title>`,
    `      <link>${xmlEscape(post.permalink)}</link>`,
    `      <guid>${xmlEscape(post.permalink)}</guid>`,
    ...(post.date ? [`      <pubDate>${xmlEscape(new Date(post.date).toUTCString())}</pubDate>`] : []),
    `      <description>${xmlEscape(feedDescription(config, post))}</description>`,
    "    </item>",
  ].join("\n"));

  const latestUpdate = content.posts[0]?.updated || content.posts[0]?.date || new Date().toISOString();

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    `    <title>${xmlEscape(config.seo.siteName || config.title)}</title>`,
    `    <link>${xmlEscape(config.url)}</link>`,
    `    <description>${xmlEscape(config.seo.defaultDescription || config.description || config.title)}</description>`,
    `    <lastBuildDate>${xmlEscape(new Date(latestUpdate).toUTCString())}</lastBuildDate>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

export function buildAtomXml(config: SiteConfig, content: ContentGraph): string {
  const updated = content.posts[0]?.updated || content.posts[0]?.date || new Date().toISOString();
  const entries = content.posts.map((post) => [
    "  <entry>",
    `    <title>${xmlEscape(post.title)}</title>`,
    `    <id>${xmlEscape(post.permalink)}</id>`,
    `    <link href="${xmlEscape(post.permalink)}" />`,
    ...(post.updated || post.date ? [`    <updated>${xmlEscape(post.updated || post.date || updated)}</updated>`] : []),
    `    <summary>${xmlEscape(feedDescription(config, post))}</summary>`,
    "  </entry>",
  ].join("\n"));

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <title>${xmlEscape(config.seo.siteName || config.title)}</title>`,
    `  <id>${xmlEscape(config.url)}</id>`,
    `  <link href="${xmlEscape(config.url)}" />`,
    `  <link rel="self" href="${xmlEscape(new URL("atom.xml", config.url).toString())}" />`,
    `  <updated>${xmlEscape(updated)}</updated>`,
    ...entries,
    "</feed>",
    "",
  ].join("\n");
}

export function defaultFeedArtifacts(): FeedArtifacts {
  return {
    rssPath: "/feed.xml",
    atomPath: "/atom.xml",
  };
}

export function buildRedirectArtifacts(
  config: SiteConfig,
  content: ContentGraph,
  routes: RouteManifestEntry[],
): RedirectArtifacts {
  const redirects: RedirectEntry[] = [];
  const warnings: BuildWarning[] = [];
  const canonicalPaths = new Set(routes.map((route) => normalizeUrlPath(route.urlPath)));
  const reservedPaths = new Set(["/feed.xml", "/atom.xml", "/sitemap.xml", "/robots.txt", "/404/"]);
  const seen = new Map<string, string>();

  const addRedirect = (
    sourcePath: string,
    target: string,
    reason: RedirectEntry["reason"],
    sourceFile?: string,
  ) => {
    const normalizedSource = normalizeUrlPath(sourcePath);
    const normalizedTarget = normalizeRedirectTarget(target);

    if (
      normalizedTarget === normalizedSource ||
      (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(normalizedTarget) && normalizeUrlPath(normalizedTarget) === normalizedSource)
    ) {
      warnings.push({
        code: "redirect-self-target",
        message: `Redirect source ${normalizedSource} resolves to itself and was skipped.`,
        sourcePath: sourceFile,
        urlPath: normalizedSource,
      });
      return;
    }

    if (canonicalPaths.has(normalizedSource) || reservedPaths.has(normalizedSource)) {
      warnings.push({
        code: "redirect-conflict",
        message: `Redirect source ${normalizedSource} conflicts with an existing canonical output and was skipped.`,
        sourcePath: sourceFile,
        urlPath: normalizedSource,
      });
      return;
    }

    const existingTarget = seen.get(normalizedSource);
    if (existingTarget && existingTarget !== normalizedTarget) {
      warnings.push({
        code: "redirect-duplicate",
        message: `Redirect source ${normalizedSource} was declared multiple times with different targets.`,
        sourcePath: sourceFile,
        urlPath: normalizedSource,
      });
      return;
    }

    seen.set(normalizedSource, normalizedTarget);
    redirects.push({
      sourcePath: normalizedSource,
      target: normalizedTarget,
      outputPath: toPublicFilePath(config.publicRoot, normalizedSource),
      reason,
    });
  };

  for (const post of content.posts) {
    for (const alias of post.aliases) {
      addRedirect(alias, post.urlPath, "alias", post.relativeSourcePath);
    }
  }

  for (const page of content.pages) {
    for (const alias of page.aliases) {
      addRedirect(alias, page.urlPath, "alias", page.relativeSourcePath);
    }
  }

  for (const [source, target] of Object.entries(config.redirects)) {
    addRedirect(source, target, "config", config.configPath);
  }

  const redirectsFile = redirects
    .map((redirect) => `${redirect.sourcePath} ${redirect.target} 301`)
    .join("\n");

  return {
    redirects,
    warnings,
    redirectsFile: redirectsFile ? `${redirectsFile}\n` : "",
  };
}

function detectDuplicateWarnings(
  items: Array<{ key: string; warning: BuildWarning }>,
): BuildWarning[] {
  const counts = new Map<string, BuildWarning[]>();

  for (const item of items) {
    counts.set(item.key, [...(counts.get(item.key) ?? []), item.warning]);
  }

  return [...counts.values()]
    .filter((warnings) => warnings.length > 1)
    .flatMap((warnings) =>
      warnings.map((warning) => ({
        ...warning,
        message: `${warning.message} (duplicate count: ${warnings.length})`,
      })),
    );
}

function extractInternalPathsFromHtml(
  html: string,
  route: RouteManifestEntry,
  config: SiteConfig,
): string[] {
  const values = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter(Boolean);
  const siteOrigin = new URL(config.url).origin;
  const routeBase = new URL(route.urlPath, config.url);
  const internalPaths: string[] = [];

  for (const value of values) {
    if (
      value.startsWith("#") ||
      value.startsWith("mailto:") ||
      value.startsWith("tel:") ||
      value.startsWith("data:")
    ) {
      continue;
    }

    let resolved: URL;
    try {
      resolved = new URL(value, routeBase);
    } catch {
      continue;
    }

    if (resolved.origin !== routeBase.origin && resolved.origin !== siteOrigin) {
      continue;
    }

    internalPaths.push(resolved.pathname === "/" ? "/" : normalizeUrlPath(resolved.pathname));
  }

  return internalPaths;
}

export async function collectBuildWarnings({
  config,
  content,
  routes,
  redirects,
  renderedPages,
}: CollectWarningsContext): Promise<BuildWarning[]> {
  const warnings: BuildWarning[] = [];

  const duplicateTitles = detectDuplicateWarnings(
    [...content.posts, ...content.pages].map((entry) => ({
      key: entry.title.trim().toLowerCase(),
      warning: {
        code: "duplicate-title",
        message: `Title "${entry.title}" is duplicated across published content.`,
        sourcePath: entry.relativeSourcePath,
        urlPath: entry.urlPath,
      },
    })),
  );
  warnings.push(...duplicateTitles);

  const duplicateSlugs = detectDuplicateWarnings(
    [...content.posts, ...content.pages].map((entry) => ({
      key: entry.slug,
      warning: {
        code: "duplicate-slug",
        message: `Slug "${entry.slug}" is duplicated across published content.`,
        sourcePath: entry.relativeSourcePath,
        urlPath: entry.urlPath,
      },
    })),
  );
  warnings.push(...duplicateSlugs);

  for (const entry of [...content.posts, ...content.pages]) {
    if (!entry.frontMatter.description) {
      warnings.push({
        code: "missing-description",
        message: `Content "${entry.title}" is missing an explicit front matter description.`,
        sourcePath: entry.relativeSourcePath,
        urlPath: entry.urlPath,
      });
    }

    if (!entry.frontMatter.image && !config.seo.defaultOgImage) {
      warnings.push({
        code: "missing-image",
        message: `Content "${entry.title}" has no front matter image and the site has no default OG image.`,
        sourcePath: entry.relativeSourcePath,
        urlPath: entry.urlPath,
      });
    }
  }

  for (const route of routes) {
    if ((route.kind === "tag" || route.kind === "category") && ((route.pageData as { entry?: { posts?: unknown[] } }).entry?.posts?.length ?? 0) === 0) {
      warnings.push({
        code: "empty-taxonomy",
        message: `Taxonomy page ${route.urlPath} has no posts.`,
        urlPath: route.urlPath,
      });
    }
  }

  const outputCollisions = detectDuplicateWarnings(
    [
      ...routes.map((route) => ({
        key: route.outputPath,
        warning: {
          code: "output-collision",
          message: `Multiple outputs resolve to ${route.outputPath}.`,
          urlPath: route.urlPath,
        },
      })),
      ...redirects.map((redirect) => ({
        key: redirect.outputPath,
        warning: {
          code: "output-collision",
          message: `Multiple outputs resolve to ${redirect.outputPath}.`,
          urlPath: redirect.sourcePath,
        },
      })),
    ],
  );
  warnings.push(...outputCollisions);

  for (const renderedPage of renderedPages) {
    const internalTargets = extractInternalPathsFromHtml(renderedPage.html, renderedPage.route, config);

    for (const target of internalTargets) {
      const outputPath = toPublicFilePath(config.publicRoot, target);
      const targetExists = await safeStat(outputPath);
      if (!targetExists) {
        warnings.push({
          code: "broken-internal-link",
          message: `Internal link target ${target} could not be resolved in the built output.`,
          urlPath: renderedPage.route.urlPath,
        });
      }
    }
  }

  const dedupedWarnings = new Map<string, BuildWarning>();
  for (const warning of warnings) {
    const key = `${warning.code}|${warning.sourcePath ?? ""}|${warning.urlPath ?? ""}|${warning.message}`;
    if (!dedupedWarnings.has(key)) {
      dedupedWarnings.set(key, warning);
    }
  }

  return [...dedupedWarnings.values()];
}

export async function writeRedirectOutputs(
  config: SiteConfig,
  redirects: RedirectEntry[],
): Promise<void> {
  for (const redirect of redirects) {
    await writeFileIfChanged(redirect.outputPath, redirectHtml(config, redirect));
  }
}
