# SEO Overview

## Built-In SEO

Status: `Stable`

BunPress ships with a built-in SEO foundation for blog posts and standalone pages. This is part of core rendering and build output, not a plugin requirement.

## What BunPress Generates

By default, BunPress can generate:

- normalized page titles
- meta descriptions
- canonical URLs
- robots meta tags
- favicon and app icon links
- Open Graph metadata
- Twitter card metadata
- JSON-LD structured data
- `sitemap.xml`
- `robots.txt`

## Site-Level SEO Config

Configure SEO in `site.config.ts`:

```ts
export default {
  seo: {
    siteName: "My BunPress Blog",
    titleTemplate: "%s | %siteName%",
    defaultDescription: "A Bun-first publishing site with built-in SEO.",
    defaultOgImage: "/assets/images/og-default.svg",
    defaultOgImageAlt: "BunPress default social preview",
    favicon: "/assets/favicon.svg",
    themeColor: "#111111",
    robotsTxt: "User-agent: *\\nAllow: /\\nSitemap: https://example.com/sitemap.xml\\n",
    organization: {
      name: "BunPress Studio",
      sameAs: ["https://github.com/example/bunpress"],
    },
    verification: {
      google: "your-token",
    },
  },
}
```

## Content-Level Overrides

Posts and pages can override SEO through front matter:

```md
---
title: Hello BunPress
seoTitle: BunPress SEO Demo
description: A short page description for search and social previews.
image: /images/hello-cover.jpg
imageAlt: Editorial desk with notebook and coffee
canonical: https://example.com/custom-url/
noindex: false
nofollow: false
---
```

## Indexation Defaults

BunPress defaults are conservative:

- main home page is indexable
- posts are indexable
- standalone pages are indexable unless explicitly marked otherwise
- 404 pages are noindex
- paginated home pages after page 1 are noindex to avoid low-value duplicate listing pages

## robots.txt

If you want BunPress to emit a fully custom `robots.txt`, set `seo.robotsTxt` in `site.config.ts`. If it is empty, BunPress generates the default robots file automatically.

## Read Next

- [SEO Metadata and Schema](D:\work\hexo-clone-node\docs\seo\metadata-and-schema.md)
- [Theme Overview](D:\work\hexo-clone-node\docs\themes\overview.md)
