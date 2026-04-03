# Theme Overview

## Theme Contract

Status: `Stable`

BunPress themes are file-based Nunjucks theme packages. The starter theme is the reference implementation of the official BunPress theme contract.

Themes render with autoescaping enabled. If a theme needs intentional raw markup, it should only render BunPress trusted HTML values through the provided helper instead of using plain strings.

## Theme Structure

```text
themes/my-theme/
  assets/
  layout/
    404.njk
    archive.njk
    base.njk
    index.njk
    page.njk
    post.njk
    taxonomy.njk
  partials/
  theme.config.ts
```

## Required Layouts

These layouts are part of the BunPress stable theme contract:

- `index`
- `post`
- `page`
- `taxonomy`
- `archive`
- `404`

Each layout is resolved as `<name>.njk` inside `layout/`.

## Supported Theme Folders

### `layout/`

Contains page-level Nunjucks templates.

### `partials/`

Contains reusable theme fragments such as:

- headers
- footers
- shared meta rows
- slot rendering partials

### `assets/`

Copied into the final built site under `public/assets/`.

### `theme.config.ts`

Optional theme-level configuration merged into `site.theme` during rendering.

## Starter Theme Conventions

The starter theme demonstrates:

- shared post metadata rendering through `partials/post-meta.njk`
- shared generic slot rendering through `partials/slot-items.njk`
- theme-owned sidebar rendering through `partials/sidebar.njk`
- built-in SEO head rendering through the normalized `seo` local
- slot-based `post_meta` rendering
- explicit blog slot render positions around post/page content and site footer
- a consistent `base.njk` shell
- responsive layouts using a single site stylesheet
- a professional product-and-engineering tone without a default header CTA

## Theme Slots

Themes can render BunPress slots to expose plugin output automatically.

Current official slots:

- `post_meta`
- `post_above_content`
- `post_below_content`
- `post_footer`
- `page_above_content`
- `page_below_content`
- `page_footer`
- `head`
- `site_header`
- `sidebar_primary`
- `site_footer`

The starter theme renders:

- `post_meta` for homepage, post, archive, and taxonomy views
- `post_above_content`, `post_below_content`, and `post_footer` on single posts
- `page_above_content`, `page_below_content`, and `page_footer` on standalone pages
- `site_footer` in the footer area

The starter theme does not render `site_header` or `sidebar_primary` by default. Those slots remain available for custom themes that want a more extensible chrome or sidebar system.

See [Plugin Slots](../plugins/slots.md).
