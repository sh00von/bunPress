# Stability Reference

## Support Levels

BunPress documentation labels extension APIs as either `Stable` or `Experimental`.

## Stable

These are the current supported BunPress extension contracts:

- theme directory structure with `layout/`, `partials/`, `assets/`, and optional `theme.config.ts`
- required layouts: `index`, `post`, `page`, `taxonomy`, `archive`, `404`
- plugin activation via `site.config.ts`
- lifecycle hooks:
  - `config:resolved`
  - `content:loaded`
  - `content:transformed`
  - `routes:generated`
  - `build:done`
- helper registration through `api.helper(...)`
- slot registration through `api.slot(...)`
- official slot names:
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
- structured slot item format:
  - `{ kind: "text" | "link" | "button", text: string, url?: string, className?: string, title?: string, rel?: string, target?: string, icon?: string }`
- top-level site navigation through `site.config.ts` `menus`
- plugin-scoped settings through `site.config.ts` `pluginsConfig`
- built-in SEO config through `site.config.ts` `seo`
- built-in front matter SEO overrides:
  - `seoTitle`
  - `description`
  - `image`
  - `imageAlt`
  - `canonical`
  - `noindex`
  - `nofollow`
- starter theme slot rendering patterns for shared post meta and shared slot item partials
- documented Nunjucks locals:
  - `site`
  - `page`
  - `seo`
  - `collections`
  - `routes`
  - `engineAssets`
  - `slots`

## Experimental

These are intentionally not part of the stable BunPress contract yet:

- raw HTML slot injection
- widget systems
- block/editor integrations
- admin dashboards
- plugin auto-discovery from the `plugins/` folder
- plugin marketplace or registry features
- richer theme config conventions beyond current documented fields
- broader head management semantics beyond current slot exposure

## Guidance

If you are building a theme or plugin for reuse:

- rely only on `Stable` APIs
- treat `Experimental` areas as subject to change
- prefer official slot names and shared partial patterns over custom ad hoc integration
