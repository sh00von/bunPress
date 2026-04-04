---
title: Feature Overview
sidebar_position: 3
---

# Feature Overview

BunPress ships with a focused publishing feature set designed for product, platform, and engineering teams.

## Authoring

- Markdown posts, pages, and drafts
- front matter for metadata and publishing control
- scaffolds for posts, pages, and drafts
- `bunpress new post`, `new page`, and `new draft`
- WordPress-style permalink presets plus custom permalink patterns

## Themes

- file-based Nunjucks themes
- starter theme included in every new site
- theme assets copied into static output
- shared theme slots for plugin-driven UI
- menus configured through `site.config.ts`

## Plugins

- explicit plugin activation in `site.config.ts`
- lifecycle hooks for config, content, routes, and build completion
- theme helpers
- structured slot contributions for theme rendering
- local plugin development with zero registry dependency

## Publishing

- static HTML output
- development server with rebuilds
- GitHub Pages publish flow
- Vercel publish flow
- automatic clean builds
- redirect support from front matter aliases and config-level redirects

## Built-In SEO and Syndication

- canonical URLs
- Open Graph and Twitter metadata
- JSON-LD structured data
- `sitemap.xml`
- `robots.txt`
- favicon and app icon metadata
- RSS and Atom feeds
- build-time content and SEO warnings

## Developer Experience

- `create-bunpress` onboarding flow
- Bun-first runtime and package flow
- documented theme and plugin contract
- example site with starter theme and demo plugins
- core API for programmatic builds and dev server integration
