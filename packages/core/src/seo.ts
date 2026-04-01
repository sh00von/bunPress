import type {
  ArchiveGroup,
  ContentGraph,
  FrontMatter,
  Page,
  Post,
  ResolvedSeo,
  SeoFaviconItem,
  RouteManifestEntry,
  SeoBreadcrumbItem,
  SiteConfig,
  TaxonomyEntry,
} from "./types.ts";
import { ensureLeadingSlash, joinUrlPath, slugify, toPermalink, trimSlashes } from "./utils.ts";
import { sanitizeOptionalUrl } from "./security.ts";

interface ResolveSeoContext {
  config: SiteConfig;
  content: ContentGraph;
  route: RouteManifestEntry;
}

function absolutizeUrl(
  config: SiteConfig,
  value: unknown,
  fieldName: string,
  options: { allowRelative?: boolean } = {},
): string | undefined {
  const sanitized = sanitizeOptionalUrl(value, {
    allowedSchemes: ["http", "https"],
    allowRelative: options.allowRelative ?? true,
    allowFragment: false,
    fieldName,
  });
  if (!sanitized) {
    return undefined;
  }

  return new URL(sanitized, config.url).toString();
}

function applyTitleTemplate(
  title: string,
  siteName: string,
  titleTemplate: string,
  isHome: boolean,
): string {
  if (isHome) {
    return siteName;
  }

  if (titleTemplate.includes("%s") || titleTemplate.includes("%siteName%")) {
    return titleTemplate
      .replace(/%siteName%/g, siteName)
      .replace(/%s/g, title);
  }

  return `${title} | ${siteName}`;
}

function inferDescription(
  config: SiteConfig,
  route: RouteManifestEntry,
  post?: Post,
  page?: Page,
  taxonomyEntry?: TaxonomyEntry,
): string {
  const frontMatter = (post?.frontMatter ?? page?.frontMatter) as FrontMatter | undefined;

  if (typeof frontMatter?.description === "string" && frontMatter.description.trim()) {
    return frontMatter.description.trim();
  }

  if (post?.excerpt) {
    return post.excerpt;
  }

  if (page?.excerpt) {
    return page.excerpt;
  }

  if (taxonomyEntry) {
    return `Browse posts filed under ${taxonomyEntry.name} on ${config.seo.siteName || config.title}.`;
  }

  if (route.kind === "archive") {
    return `Browse the archives for ${config.seo.siteName || config.title}.`;
  }

  if (route.kind === "404") {
    return "The page you requested could not be found.";
  }

  return config.seo.defaultDescription || config.description || config.title;
}

function resolveImage(
  config: SiteConfig,
  frontMatter?: FrontMatter,
): { image?: string; imageAlt?: string } {
  const image = absolutizeUrl(
    config,
    typeof frontMatter?.image === "string" && frontMatter.image.trim()
      ? frontMatter.image
      : config.seo.defaultOgImage,
    "SEO image URL",
  );
  const imageAlt =
    (typeof frontMatter?.imageAlt === "string" && frontMatter.imageAlt.trim()) ||
    config.seo.defaultOgImageAlt ||
    undefined;

  return { image, imageAlt };
}

function resolveFavicons(config: SiteConfig): SeoFaviconItem[] {
  const items: SeoFaviconItem[] = [];

  if (config.seo.favicon) {
    items.push({
      rel: "icon",
      url: absolutizeUrl(config, config.seo.favicon, "SEO favicon URL") ?? config.seo.favicon,
      type: config.seo.favicon.endsWith(".svg") ? "image/svg+xml" : undefined,
    });
  }

  if (config.seo.appleTouchIcon) {
    items.push({
      rel: "apple-touch-icon",
      url:
        absolutizeUrl(config, config.seo.appleTouchIcon, "SEO apple touch icon URL") ??
        config.seo.appleTouchIcon,
    });
  }

  if (config.seo.manifest) {
    items.push({
      rel: "manifest",
      url: absolutizeUrl(config, config.seo.manifest, "SEO manifest URL") ?? config.seo.manifest,
    });
  }

  for (const favicon of config.seo.favicons ?? []) {
    items.push({
      rel: favicon.rel || "icon",
      url: absolutizeUrl(config, favicon.url, `SEO favicon URL (${favicon.rel || "icon"})`) ?? favicon.url,
      type: favicon.type,
      sizes: favicon.sizes,
      color: favicon.color,
    });
  }

  return items;
}

function robotsString({
  config,
  route,
  frontMatter,
}: {
  config: SiteConfig;
  route: RouteManifestEntry;
  frontMatter?: FrontMatter;
}): { robots: string; isIndexable: boolean } {
  const baseIndex = config.seo.robots.index !== false;
  const baseFollow = config.seo.robots.follow !== false;
  const noindex = Boolean(frontMatter?.noindex) || route.kind === "404" || (route.kind === "index" && route.urlPath !== "/");
  const nofollow = Boolean(frontMatter?.nofollow);
  const index = baseIndex && !noindex;
  const follow = baseFollow && !nofollow;

  return {
    robots: `${index ? "index" : "noindex"}, ${follow ? "follow" : "nofollow"}`,
    isIndexable: index,
  };
}

function taxonomyEntryForRoute(
  content: ContentGraph,
  route: RouteManifestEntry,
): TaxonomyEntry | undefined {
  if (route.kind === "tag") {
    return content.tags.find((entry) => entry.urlPath === route.urlPath);
  }

  if (route.kind === "category") {
    return content.categories.find((entry) => entry.urlPath === route.urlPath);
  }

  return undefined;
}

function archiveGroupForPost(content: ContentGraph, post: Post): ArchiveGroup | undefined {
  if (!post.date) {
    return undefined;
  }

  const postDate = new Date(post.date);
  return content.archives.find(
    (group) => group.year === postDate.getUTCFullYear() && group.month === postDate.getUTCMonth() + 1,
  );
}

function buildBreadcrumbs(
  config: SiteConfig,
  content: ContentGraph,
  route: RouteManifestEntry,
  post?: Post,
  page?: Page,
  taxonomyEntry?: TaxonomyEntry,
): SeoBreadcrumbItem[] {
  const items: SeoBreadcrumbItem[] = [{ name: config.seo.siteName || config.title, url: toPermalink(config.url, "/") }];

  if (route.kind === "page" && page) {
    items.push({ name: page.title, url: page.permalink });
    return items;
  }

  if (route.kind === "archive") {
    items.push({ name: "Archives", url: toPermalink(config.url, joinUrlPath(config.archivesDir)) });
    return items;
  }

  if ((route.kind === "tag" || route.kind === "category") && taxonomyEntry) {
    items.push({ name: taxonomyEntry.name, url: taxonomyEntry.permalink });
    return items;
  }

  if (route.kind === "post" && post) {
    const primaryCategory = post.categories[0];
    if (primaryCategory) {
      const categoryEntry = content.categories.find((entry) => entry.name === primaryCategory);
      if (categoryEntry) {
        items.push({ name: categoryEntry.name, url: categoryEntry.permalink });
      }
    } else {
      const archiveGroup = archiveGroupForPost(content, post);
      if (archiveGroup) {
        items.push({
          name: archiveGroup.label,
          url: toPermalink(config.url, joinUrlPath(config.archivesDir)),
        });
      }
    }
    items.push({ name: post.title, url: post.permalink });
    return items;
  }

  if (route.kind === "index" && route.urlPath !== "/") {
    items.push({ name: "Journal", url: toPermalink(config.url, "/") });
    items.push({ name: `Page ${(route.pageData as { pagination?: { currentPage?: number } }).pagination?.currentPage ?? 1}`, url: toPermalink(config.url, route.urlPath) });
    return items;
  }

  return route.kind === "index" ? [] : items;
}

function breadcrumbSchema(items: SeoBreadcrumbItem[]) {
  if (items.length < 2) {
    return undefined;
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function webSiteSchema(config: SiteConfig) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.seo.siteName || config.title,
    url: config.url,
  };

  if (config.seo.search.path && config.seo.search.queryParam) {
    const searchTarget = absolutizeUrl(
      config,
      config.seo.search.path,
      "SEO search path",
    );
    schema.potentialAction = {
      "@type": "SearchAction",
      target: `${searchTarget}?${config.seo.search.queryParam}={search_term_string}`,
      "query-input": `required name=${config.seo.search.queryParam}`,
    };
  }

  return schema;
}

function organizationSchema(config: SiteConfig) {
  const name = config.seo.organization.name || config.seo.siteName || config.title;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: config.url,
  };

  const logo = absolutizeUrl(config, config.seo.organization.logo, "SEO organization logo URL");
  if (logo) {
    schema.logo = logo;
  }

  if (config.seo.organization.sameAs?.length) {
    schema.sameAs = config.seo.organization.sameAs;
  }

  return schema;
}

function articleSchema(
  config: SiteConfig,
  post: Post,
  description: string,
  image?: string,
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.frontMatter.seoTitle || post.title,
    description,
    mainEntityOfPage: post.permalink,
    url: post.permalink,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: {
      "@type": "Person",
      name:
        (typeof post.frontMatter.author === "string" && post.frontMatter.author.trim()) ||
        (config.seo.organization.name || config.seo.siteName || config.title),
    },
    publisher: {
      "@type": "Organization",
      name: config.seo.organization.name || config.seo.siteName || config.title,
    },
  };

  if (image) {
    schema.image = [image];
  }

  return schema;
}

function pageSchema(
  canonical: string,
  title: string,
  description: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
  };
}

export function resolveSeo({
  config,
  content,
  route,
}: ResolveSeoContext): ResolvedSeo {
  const pageData = route.pageData as { post?: Post; page?: Page };
  const post = pageData.post;
  const page = pageData.page;
  const frontMatter = (post?.frontMatter ?? page?.frontMatter) as FrontMatter | undefined;
  const taxonomyEntry = taxonomyEntryForRoute(content, route);
  const pageType: ResolvedSeo["pageType"] =
    route.kind === "post"
      ? "article"
      : route.kind === "page"
        ? "page"
        : route.kind === "archive"
          ? "archive"
          : route.kind === "tag" || route.kind === "category"
            ? "taxonomy"
            : route.kind === "404"
              ? "404"
              : "website";
  const canonical =
    absolutizeUrl(config, frontMatter?.canonical, "Canonical URL", {
      allowRelative: false,
    }) ?? toPermalink(config.url, route.urlPath === "/404/" ? "/404/" : route.urlPath);
  const siteName = config.seo.siteName || config.title;
  const rawTitle = (typeof frontMatter?.seoTitle === "string" && frontMatter.seoTitle.trim())
    || (post?.title ?? page?.title ?? route.title.replace(new RegExp(`\\s*-\\s*${config.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), ""));
  const title = applyTitleTemplate(rawTitle, siteName, config.seo.titleTemplate, route.kind === "index" && route.urlPath === "/");
  const description = inferDescription(config, route, post, page, taxonomyEntry);
  const { robots, isIndexable } = robotsString({ config, route, frontMatter });
  const { image, imageAlt } = resolveImage(config, frontMatter);
  const breadcrumbs = buildBreadcrumbs(config, content, route, post, page, taxonomyEntry);
  const jsonLd: Record<string, unknown>[] = [
    organizationSchema(config),
    webSiteSchema(config),
  ];
  const breadcrumbList = breadcrumbSchema(breadcrumbs);
  if (breadcrumbList) {
    jsonLd.push(breadcrumbList);
  }
  if (post) {
    jsonLd.push(articleSchema(config, post, description, image));
  } else if (pageType !== "404") {
    jsonLd.push(pageSchema(canonical, title, description));
  }

  return {
    title,
    description,
    canonical,
    robots,
    pageType,
    isIndexable,
    image,
    imageAlt,
    openGraph: {
      title,
      description,
      type: pageType === "article" ? "article" : "website",
      url: canonical,
      image,
      imageAlt,
      siteName,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      image,
    },
    favicons: resolveFavicons(config),
    themeColor: config.seo.themeColor || undefined,
    breadcrumbs,
    jsonLd,
    verification: config.seo.verification,
  };
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemapXml(
  config: SiteConfig,
  routes: RouteManifestEntry[],
  content: ContentGraph,
): string {
  const entries = routes
    .map((route) => {
      const seo = resolveSeo({ config, content, route });
      if (!seo.isIndexable || route.kind === "404") {
        return undefined;
      }

      const pageData = route.pageData as { post?: Post; page?: Page };
      const lastmod = pageData.post?.updated || pageData.post?.date || pageData.page?.updated || pageData.page?.date;
      return [
        "  <url>",
        `    <loc>${xmlEscape(seo.canonical)}</loc>`,
        ...(lastmod ? [`    <lastmod>${xmlEscape(lastmod)}</lastmod>`] : []),
        "  </url>",
      ].join("\n");
    })
    .filter(Boolean);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

export function buildRobotsTxt(config: SiteConfig): string {
  if (config.seo.robotsTxt?.trim()) {
    return config.seo.robotsTxt.replace(/\r\n/g, "\n").replace(/\n?$/, "\n");
  }

  return [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${new URL(ensureLeadingSlash(trimSlashes("sitemap.xml") ? "sitemap.xml" : "/"), config.url).toString()}`,
    "",
  ].join("\n");
}
