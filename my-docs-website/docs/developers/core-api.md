---
title: Core API
sidebar_position: 1
---

# Core API

BunPress exposes a programmatic API from `@bunpress/core` for tools, wrappers, and advanced integrations.

## Main Exports

```ts
import {
  buildSite,
  createDevServer,
  createStaticServer,
  loadConfig,
  loadContent,
} from "@bunpress/core";
```

## `loadConfig(cwd)`

Loads and resolves `site.config.ts`.

```ts
const config = await loadConfig(process.cwd());
```

Returns a normalized `SiteConfig` with resolved paths such as:

- `rootDir`
- `postsDir`
- `pagesDir`
- `draftsDir`
- `publicRoot`
- `themeRoot`

## `loadContent(config)`

Loads posts, pages, taxonomies, archives, and adjacent post relationships.

```ts
const content = await loadContent(config);
```

Returns a `ContentGraph` with:

- `posts`
- `pages`
- `tags`
- `categories`
- `archives`
- `adjacentPosts`

## `buildSite(cwd)`

Builds the site into the configured `public` directory.

```ts
const result = await buildSite(process.cwd());
```

`BuildResult` includes:

- `outputDir`
- `routes`
- `content`
- `redirects`
- `warnings`
- `feeds`
- `startedAt`
- `endedAt`

## `createDevServer(cwd)`

Creates the BunPress development server with rebuild support.

```ts
const server = await createDevServer(process.cwd());
```

Returns:

- `fetch(request)`
- `close()`
- `rebuild()`

## `createStaticServer(cwd)`

Serves the already-built output directory without watch mode.

```ts
const server = await createStaticServer(process.cwd());
```

## Stable Developer Types

Common exported types include:

- `SiteConfig`
- `Post`
- `Page`
- `ContentGraph`
- `RouteManifestEntry`
- `BuildResult`
- `Plugin`
- `PluginAPI`
- `ThemeSlotName`
- `ThemeSlotItem`

For theme and plugin contracts, continue with:

- [Theme Overview](../themes/overview.md)
- [Plugin Overview](../plugins/overview.md)
