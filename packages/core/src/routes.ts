import path from "node:path";
import type {
  AdjacentPostLinks,
  ContentGraph,
  PaginationInfo,
  RouteManifestEntry,
  SiteConfig,
  TaxonomyEntry,
} from "./types.ts";
import { joinUrlPath, toOutputFile } from "./utils.ts";

function buildPagination(
  totalItems: number,
  pageSize: number,
  currentPage: number,
  basePath: string,
): PaginationInfo {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    prevUrl:
      currentPage > 1
        ? currentPage === 2
          ? basePath
          : joinUrlPath(basePath, "page", `${currentPage - 1}`)
        : undefined,
    nextUrl:
      currentPage < totalPages
        ? joinUrlPath(basePath, "page", `${currentPage + 1}`)
        : undefined,
  };
}

function paginatedRoutes(
  config: SiteConfig,
  content: ContentGraph,
): RouteManifestEntry[] {
  const routes: RouteManifestEntry[] = [];
  const pageSize = config.paginationSize;
  const totalPages = Math.max(1, Math.ceil(content.posts.length / pageSize));

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const start = (pageNumber - 1) * pageSize;
    const urlPath =
      pageNumber === 1 ? "/" : joinUrlPath("page", `${pageNumber}`);
    routes.push({
      kind: "index",
      urlPath,
      outputPath: path.join(config.publicRoot, toOutputFile(urlPath)),
      layout: "index",
      title: pageNumber === 1 ? config.title : `${config.title} - Page ${pageNumber}`,
      pageData: {
        title: pageNumber === 1 ? config.title : `Page ${pageNumber}`,
        posts: content.posts.slice(start, start + pageSize),
        pagination: buildPagination(
          content.posts.length,
          pageSize,
          pageNumber,
          "/",
        ),
      },
    });
  }

  return routes;
}

function taxonomyRoutes(
  config: SiteConfig,
  entries: TaxonomyEntry[],
  kind: "tag" | "category",
): RouteManifestEntry[] {
  return entries.map((entry) => ({
    kind,
    urlPath: entry.urlPath,
    outputPath: path.join(config.publicRoot, toOutputFile(entry.urlPath)),
    layout: "taxonomy",
    title: `${entry.name} - ${config.title}`,
    pageData: {
      title: entry.name,
      taxonomyType: kind,
      entry,
    },
  }));
}

export function generateRoutes(
  config: SiteConfig,
  content: ContentGraph,
): RouteManifestEntry[] {
  const routes: RouteManifestEntry[] = [
    ...paginatedRoutes(config, content),
    ...content.posts.map((post) => ({
      kind: "post" as const,
      urlPath: post.urlPath,
      outputPath: path.join(config.publicRoot, toOutputFile(post.urlPath)),
      layout: "post",
      title: `${post.title} - ${config.title}`,
      pageData: {
        title: post.title,
        post,
        adjacent: (content.adjacentPosts[post.id] ?? {}) satisfies AdjacentPostLinks,
      },
    })),
    ...content.pages.map((page) => ({
      kind: "page" as const,
      urlPath: page.urlPath,
      outputPath: path.join(config.publicRoot, toOutputFile(page.urlPath)),
      layout: "page",
      title: `${page.title} - ${config.title}`,
      pageData: { title: page.title, page },
    })),
    ...taxonomyRoutes(config, content.tags, "tag"),
    ...taxonomyRoutes(config, content.categories, "category"),
    {
      kind: "archive",
      urlPath: joinUrlPath(config.archivesDir),
      outputPath: path.join(
        config.publicRoot,
        toOutputFile(joinUrlPath(config.archivesDir)),
      ),
      layout: "archive",
      title: `Archives - ${config.title}`,
      pageData: { title: "Archives", archives: content.archives },
    },
    {
      kind: "404",
      urlPath: "/404/",
      outputPath: path.join(config.publicRoot, "404.html"),
      layout: "404",
      title: `Page not found - ${config.title}`,
      pageData: { title: "Page not found" },
    },
  ];

  return routes;
}
