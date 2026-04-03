import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function ensureLeadingSlash(input: string): string {
  return input.startsWith("/") ? input : `/${input}`;
}

export function trimSlashes(input: string): string {
  return input.replace(/^\/+|\/+$/g, "");
}

export function joinUrlPath(...parts: string[]): string {
  const filtered = parts
    .map((part) => trimSlashes(part))
    .filter(Boolean);

  return filtered.length === 0 ? "/" : `/${filtered.join("/")}/`;
}

export function toOutputFile(urlPath: string): string {
  const clean = trimSlashes(urlPath);
  return clean ? `${clean}/index.html` : "index.html";
}

export function toPermalink(siteUrl: string, urlPath: string): string {
  return new URL(ensureLeadingSlash(trimSlashes(urlPath) ? urlPath : "/"), siteUrl).toString();
}

export function toRelativeHref(target: string, fromUrlPath: string): string {
  if (!target) {
    return target;
  }

  if (
    target.startsWith("#") ||
    target.startsWith("//") ||
    /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(target)
  ) {
    return target;
  }

  if (!target.startsWith("/")) {
    return target;
  }

  const fromDirectory = path.posix.dirname(toOutputFile(fromUrlPath));
  const targetPath = target.endsWith("/")
    ? toOutputFile(target)
    : trimSlashes(target);

  const relativePath = path.posix.relative(fromDirectory, targetPath);
  return relativePath || "index.html";
}

export function excerptFromMarkdown(markdown: string): string {
  const explicit = markdown.split("<!-- more -->")[0]?.trim();
  const source = explicit || markdown;

  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+]\([^)]*\)/g, "$1")
    .replace(/[#>*_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

export function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function parseDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatDateIso(value?: Date): string | undefined {
  return value ? value.toISOString() : undefined;
}

export function timestampParts(date: Date): Record<string, string> {
  const year = date.getUTCFullYear().toString();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");

  return { year, month, day };
}

export function applyPermalink(pattern: string, slug: string, date?: Date): string {
  const baseDate = date ?? new Date("1970-01-01T00:00:00.000Z");
  const parts = timestampParts(baseDate);

  return ensureLeadingSlash(
    trimSlashes(
      pattern
        .replace(/:slug/g, slug)
        .replace(/:year/g, parts.year)
        .replace(/:month/g, parts.month)
        .replace(/:day/g, parts.day),
    ),
  ).replace(/\/?$/, "/");
}

export async function writeFileIfChanged(
  filePath: string,
  contents: string,
): Promise<boolean> {
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    const current = await readFile(filePath, "utf8");
    if (current === contents) {
      return false;
    }
  } catch {
    // file does not exist yet
  }

  await writeFile(filePath, contents, "utf8");
  return true;
}

export async function copyFileIfChanged(
  fromPath: string,
  toPath: string,
): Promise<boolean> {
  const buffer = await readFile(fromPath);
  const contents = buffer.toString("utf8");
  return writeFileIfChanged(toPath, contents);
}

export async function safeStat(filePath: string) {
  try {
    return await stat(filePath);
  } catch {
    return undefined;
  }
}

export function hashContent(content: string): string {
  return createHash("sha1").update(content).digest("hex").slice(0, 8);
}

export function compareByDateDesc<
  TItem extends { date?: string; updated?: string; title: string },
>(left: TItem, right: TItem): number {
  const leftDate = left.date ? new Date(left.date).getTime() : 0;
  const rightDate = right.date ? new Date(right.date).getTime() : 0;

  if (leftDate !== rightDate) {
    return rightDate - leftDate;
  }

  return left.title.localeCompare(right.title);
}

export function dedupe<TValue>(values: TValue[]): TValue[] {
  return [...new Set(values)];
}

export function pathToPosix(value: string): string {
  return value.split(path.sep).join("/");
}
