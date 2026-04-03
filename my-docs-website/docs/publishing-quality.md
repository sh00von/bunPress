---
title: Publishing Quality
sidebar_position: 6
---

# Publishing Quality

BunPress includes a publishing-quality layer in core so sites ship with safer output by default.

## Build-Time Warnings

BunPress warns for:

- missing front matter descriptions
- missing explicit social image coverage when no site fallback exists
- duplicate titles
- duplicate slugs
- output collisions
- broken internal links
- invalid or conflicting redirects

Warnings are reported during build, but they do not fail the build in the current default mode.

## Redirects

Content-level redirects use front matter aliases:

```md
---
title: Example Post
aliases:
  - /old-post-url/
---
```

Site-level redirects live in `site.config.ts`:

```ts
export default {
  redirects: {
    "/start/": "/about/",
  },
}
```

BunPress generates:

- static HTML redirect pages
- a `_redirects` manifest for host-level compatibility

## Adjacent Navigation

Core derives previous and next post relationships based on publish date.

The starter theme renders those links on single post pages. Custom themes can read the same data from the `page.adjacent` local on post routes.

## Feeds

BunPress generates:

- `feed.xml` for RSS
- `atom.xml` for Atom

The first pass is intentionally main-feed only. Tag, category, and archive-specific feeds are not generated yet.

## Sitemap and Canonical Behavior

Canonical output remains tied to the primary route for each post or page.

Redirect pages:

- are not canonical
- are not indexed in the sitemap
- exist to preserve old paths and external links
