import nunjucks from "nunjucks";
import type { TrustedHtml } from "./types.ts";

const TRUSTED_HTML_BRAND = "bunpress.trustedHtml";
const SAFE_CLASS_NAME = /^[A-Za-z0-9_-]+(?:\s+[A-Za-z0-9_-]+)*$/;

interface SanitizeUrlOptions {
  allowedSchemes?: string[];
  allowRelative?: boolean;
  allowFragment?: boolean;
  fieldName?: string;
}

function errorLabel(fieldName?: string): string {
  return fieldName ? `"${fieldName}"` : "URL";
}

function hasProtocolLikePrefix(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value);
}

export function createTrustedHtml(value: string): TrustedHtml {
  return {
    [TRUSTED_HTML_BRAND]: true,
    value,
  };
}

export function isTrustedHtml(value: unknown): value is TrustedHtml {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Record<string, unknown>)[TRUSTED_HTML_BRAND] === true &&
      typeof (value as Record<string, unknown>).value === "string",
  );
}

export function renderTrustedHtml(value: unknown): nunjucks.runtime.SafeString {
  if (!isTrustedHtml(value)) {
    throw new Error("Expected trusted HTML content. Use createTrustedHtml() for vetted markup only.");
  }

  return new nunjucks.runtime.SafeString(value.value);
}

export function stringifyJsonForHtml(value: unknown): TrustedHtml {
  return createTrustedHtml(
    JSON.stringify(value)
      .replace(/</g, "\\u003C")
      .replace(/>/g, "\\u003E")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029"),
  );
}

export function sanitizeUrl(
  value: string,
  options: SanitizeUrlOptions = {},
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${errorLabel(options.fieldName)} must not be empty.`);
  }

  if (trimmed.startsWith("//")) {
    throw new Error(
      `${errorLabel(options.fieldName)} uses protocol-relative URLs, which are not allowed.`,
    );
  }

  if (trimmed.startsWith("#")) {
    if (options.allowFragment ?? true) {
      return trimmed;
    }
    throw new Error(`${errorLabel(options.fieldName)} must not use fragment-only URLs.`);
  }

  if (!hasProtocolLikePrefix(trimmed)) {
    if (options.allowRelative ?? true) {
      return trimmed;
    }
    throw new Error(`${errorLabel(options.fieldName)} must be absolute.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${errorLabel(options.fieldName)} is not a valid URL.`);
  }

  const allowedSchemes = new Set(
    (options.allowedSchemes ?? ["http", "https"]).map((scheme) => scheme.toLowerCase()),
  );
  const scheme = parsed.protocol.slice(0, -1).toLowerCase();
  if (!allowedSchemes.has(scheme)) {
    throw new Error(
      `${errorLabel(options.fieldName)} uses disallowed scheme "${scheme}:". Allowed schemes: ${[
        ...allowedSchemes,
      ].join(", ")}.`,
    );
  }

  return trimmed;
}

export function sanitizeOptionalUrl(
  value: unknown,
  options: SanitizeUrlOptions = {},
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return sanitizeUrl(trimmed, options);
}

export function validateClassName(
  value: unknown,
  fieldName = "className",
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (!SAFE_CLASS_NAME.test(trimmed)) {
    throw new Error(
      `"${fieldName}" contains unsafe characters. Only letters, numbers, hyphens, underscores, and spaces are allowed.`,
    );
  }

  return trimmed;
}
