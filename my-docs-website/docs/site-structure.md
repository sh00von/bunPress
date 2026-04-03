# Site Structure

## Standard Layout

A BunPress site uses a file-based structure:

```text
mysite/
  content/
    posts/
    pages/
    drafts/
  plugins/
  public/
  scaffolds/
  themes/
    starter/
  package.json
  site.config.ts
```

## Content

### `content/posts/`

Stores published posts written in Markdown with front matter.

Example:

```md
---
title: Hello BunPress
slug: hello-bunpress
date: 2026-04-01T10:00:00.000Z
tags:
  - intro
categories:
  - announcements
---

Welcome to BunPress.
```

### `content/pages/`

Stores standalone pages such as `About`, `Contact`, or `Privacy Policy`.

### `content/drafts/`

Stores draft posts that are not published unless BunPress is configured to show drafts.

## `site.config.ts`

This is the main site configuration file.

Typical fields:

```ts
export default {
  title: "Platform Briefing",
  url: "http://localhost:3000/",
  description: "Clear updates on product direction, platform decisions, and engineering execution.",
  language: "en",
  permalinkStyle: "day-and-name",
  theme: "starter",
  paginationSize: 5,
  redirects: {
    "/start/": "/about/",
  },
  seo: {
    siteName: "Platform Briefing",
    defaultDescription: "A Bun-first publishing system for product, platform, and engineering communication.",
    defaultOgImage: "/assets/images/og-default.svg",
    defaultOgImageAlt: "BunPress product publishing preview",
    favicon: "/assets/favicon.svg",
    themeColor: "#111111",
    robotsTxt: "User-agent: *\\nAllow: /\\nSitemap: https://example.com/sitemap.xml\\n",
  },
  menus: {
    primary: [{ text: "Home", url: "/" }],
    footer: [{ text: "Archives", url: "/archives/" }],
  },
  plugins: ["./plugins/reading-time.ts"],
  pluginsConfig: {
    shareButtons: {
      links: [{ text: "Share on X", icon: "X", shareBase: "https://twitter.com/intent/tweet?url=" }],
    },
  },
}
```

Notable config sections:

- `seo` controls built-in metadata, schema defaults, robots behavior, fallback social images, and favicon/theme-color output.
- `permalinkStyle` lets posts use WordPress-style presets like `day-and-name`, `month-and-name`, `post-name`, `plain`, or `custom`.
- `menus` gives themes a stable place to read primary and footer navigation.
- `socialLinks` is a simple global link list used by the demo social-links plugin.
- `pluginsConfig` is the preferred place for plugin-specific options.

The starter scaffold does not ship a default header call-to-action config. Header extension points still exist for custom themes, but the default starter stays intentionally restrained and product-focused.

Permalink behavior:

- `day-and-name` -> `/:year/:month/:day/:slug/`
- `month-and-name` -> `/:year/:month/:slug/`
- `post-name` -> `/:slug/`
- `plain` -> `/posts/:slug/`
- `custom` -> uses the explicit `permalink` string

Built-in SEO front matter overrides:

- `seoTitle`
- `description`
- `image`
- `imageAlt`
- `canonical`
- `aliases`
- `noindex`
- `nofollow`

## `themes/`

Stores local themes. A theme usually contains:

- `layout/`
- `partials/`
- `assets/`
- optional `theme.config.ts`

See [Theme Overview](./themes/overview.md).

## `plugins/`

Stores local plugins that are explicitly enabled in `site.config.ts`.

See [Plugin Overview](./plugins/overview.md).

## `scaffolds/`

Stores templates used by:

- `bunpress new post`
- `bunpress new page`
- `bunpress new draft`

Default scaffold files:

- `post.md`
- `page.md`
- `draft.md`

## `public/`

This is generated output. BunPress rebuilds it during `bunpress build`.

Do not edit files in `public/` manually.
