import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import type {
  ArchiveGroup,
  ContentGraph,
  ContentKind,
  FrontMatter,
  Page,
  Post,
  SiteConfig,
  TaxonomyEntry,
} from "./types.ts";
import {
  applyPermalink,
  compareByDateDesc,
  excerptFromMarkdown,
  formatDateIso,
  joinUrlPath,
  normalizeStringList,
  parseDate,
  pathToPosix,
  slugify,
  toPermalink,
  trimSlashes,
} from "./utils.ts";
import { renderMarkdown } from "./markdown.ts";
import { sanitizeOptionalUrl } from "./security.ts";

interface ParsedDocumentInput {
  config: SiteConfig;
  filePath: string;
  kind: ContentKind;
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveSlug(filePath: string, frontMatter: FrontMatter): string {
  if (typeof frontMatter.slug === "string" && frontMatter.slug.trim()) {
    return slugify(frontMatter.slug);
  }

  const basename = path.basename(filePath, path.extname(filePath));
  const match = basename.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
  const source = match?.[1] ?? basename;
  return slugify(source);
}

async function parseDocument({
  config,
  filePath,
  kind,
}: ParsedDocumentInput): Promise<Post | Page> {
  const rawFile = await readFile(filePath, "utf8");
  const parsed = matter(rawFile);
  const frontMatter = {
    ...(parsed.data as FrontMatter),
  } satisfies FrontMatter;
  frontMatter.image = sanitizeOptionalUrl(frontMatter.image, {
    allowedSchemes: ["http", "https"],
    allowRelative: true,
    allowFragment: false,
    fieldName: `${filePath} front matter image`,
  });
  frontMatter.canonical = sanitizeOptionalUrl(frontMatter.canonical, {
    allowedSchemes: ["http", "https"],
    allowRelative: false,
    allowFragment: false,
    fieldName: `${filePath} front matter canonical`,
  });
  const slug = deriveSlug(filePath, frontMatter);
  const stats = await stat(filePath);
  const datedFilename = path
    .basename(filePath)
    .match(/^(\d{4}-\d{2}-\d{2})-/)?.[1];
  const sourceDate =
    parseDate(frontMatter.date) ??
    (datedFilename ? new Date(`${datedFilename}T00:00:00.000Z`) : undefined) ??
    stats.birthtime ??
    stats.mtime;
  const updated = parseDate(frontMatter.updated) ?? stats.mtime;
  const relativeSourcePath = pathToPosix(path.relative(config.rootDir, filePath));
  const title = frontMatter.title?.trim() || titleFromSlug(slug);
  const html = await renderMarkdown(parsed.content);
  const tags = normalizeStringList(frontMatter.tags);
  const categories = normalizeStringList(frontMatter.categories);
  const excerpt = frontMatter.excerpt?.toString().trim() || excerptFromMarkdown(parsed.content);
  const draft = Boolean(frontMatter.draft) || filePath.startsWith(config.draftsDir);
  const future = sourceDate.getTime() > Date.now();

  let urlPath: string;
  if (kind === "post") {
    urlPath = frontMatter.permalink
      ? joinUrlPath(frontMatter.permalink)
      : applyPermalink(config.permalink, slug, sourceDate);
  } else {
    const relative = trimSlashes(
      pathToPosix(path.relative(config.pagesDir, filePath)).replace(/\.[^.]+$/, ""),
    );
    urlPath = frontMatter.permalink
      ? joinUrlPath(frontMatter.permalink)
      : joinUrlPath(relative || slug);
  }

  const base = {
    id: relativeSourcePath,
    kind,
    sourcePath: filePath,
    relativeSourcePath,
    slug,
    title,
    urlPath,
    permalink: toPermalink(config.url, urlPath),
    raw: parsed.content,
    excerpt,
    html,
    layout:
      frontMatter.layout?.toString() ||
      (kind === "post" ? "post" : "page"),
    frontMatter,
    date: formatDateIso(sourceDate),
    updated: formatDateIso(updated),
    tags,
    categories,
    draft,
    future,
    metadata: {},
  };

  return base as Post | Page;
}

function buildTaxonomy(
  posts: Post[],
  config: SiteConfig,
  kind: "tags" | "categories",
): TaxonomyEntry[] {
  const directory = kind === "tags" ? config.tagsDir : config.categoriesDir;
  const bucket = new Map<string, Post[]>();

  for (const post of posts) {
    const values = kind === "tags" ? post.tags : post.categories;
    for (const value of values) {
      const key = value.trim();
      if (!key) {
        continue;
      }

      bucket.set(key, [...(bucket.get(key) ?? []), post]);
    }
  }

  return [...bucket.entries()]
    .map(([name, items]) => {
      const slug = slugify(name);
      const urlPath = joinUrlPath(directory, slug);
      return {
        name,
        slug,
        urlPath,
        permalink: toPermalink(config.url, urlPath),
        posts: items.sort(compareByDateDesc),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function buildArchives(posts: Post[]): ArchiveGroup[] {
  const grouped = new Map<string, Post[]>();

  for (const post of posts) {
    if (!post.date) {
      continue;
    }

    const date = new Date(post.date);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
    grouped.set(key, [...(grouped.get(key) ?? []), post]);
  }

  return [...grouped.entries()]
    .map(([key, items]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        year,
        month,
        label: new Intl.DateTimeFormat("en", {
          year: "numeric",
          month: "long",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(year, month - 1, 1))),
        posts: items.sort(compareByDateDesc),
      };
    })
    .sort((left, right) =>
      right.year === left.year ? right.month - left.month : right.year - left.year,
    );
}

export async function loadContent(config: SiteConfig): Promise<ContentGraph> {
  const patterns = ["**/*.md", "**/*.markdown"];
  const [postFiles, pageFiles, draftFiles] = await Promise.all([
    fg(patterns, { cwd: config.postsDir, absolute: true, onlyFiles: true }),
    fg(patterns, { cwd: config.pagesDir, absolute: true, onlyFiles: true }),
    fg(patterns, { cwd: config.draftsDir, absolute: true, onlyFiles: true }),
  ]);

  const allPosts = await Promise.all(
    [...postFiles, ...draftFiles].map((filePath) =>
      parseDocument({ config, filePath, kind: "post" }) as Promise<Post>,
    ),
  );
  const posts = allPosts
    .filter((post) => (config.showDrafts || !post.draft) && (config.showFuture || !post.future))
    .sort(compareByDateDesc);

  const pages = (
    await Promise.all(
      pageFiles.map((filePath) =>
        parseDocument({ config, filePath, kind: "page" }) as Promise<Page>,
      ),
    )
  ).sort((left, right) => left.title.localeCompare(right.title));

  return {
    posts,
    pages,
    tags: buildTaxonomy(posts, config, "tags"),
    categories: buildTaxonomy(posts, config, "categories"),
    archives: buildArchives(posts),
  };
}
