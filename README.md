# BunPress

BunPress is a Bun-first static site generator and publishing CLI with a file-based content model, Nunjucks themes, built-in SEO defaults including favicon support, and an official plugin/theme extension contract.

Open-source project by [Shovon](https://shovon.bd/).

## Create a Site

```bash
npx create-bunpress@latest mysite
```

Then:

```bash
cd mysite
bun install
bunpress dev
```

For power users, `bunpress init mysite` still works after installing the CLI separately.

New starter sites ship with a clean product-and-engineering voice by default, so the first generated site already reads like a professional platform publication instead of a generic demo blog.

## Core Workflow

```bash
bunpress build
bunpress clean
bunpress publish github
bunpress publish vercel
```

## Security Model

BunPress escapes template output and sanitizes markdown/content URLs by default, but local extension code is still fully trusted.

- Markdown raw HTML is stripped unless it comes from BunPress trusted HTML APIs.
- Theme and plugin slot URLs are validated, and unsafe values fail the build.
- `site.config.*`, theme config files, and plugins execute as local code during build and dev.

Do not build sites, themes, or plugins from untrusted sources unless you are comfortable executing their code locally.

## Documentation

- [Getting Started](./my-docs-website/docs/getting-started.md)
- [Feature Overview](./my-docs-website/docs/features.md)
- [CLI Reference](./my-docs-website/docs/cli-reference.md)
- [Site Structure](./my-docs-website/docs/site-structure.md)
- [Publishing Quality](./my-docs-website/docs/publishing-quality.md)
- [SEO Overview](./my-docs-website/docs/seo/overview.md)
- [SEO Metadata and Schema](./my-docs-website/docs/seo/metadata-and-schema.md)
- [Theme Overview](./my-docs-website/docs/themes/overview.md)
- [Templates and Locals](./my-docs-website/docs/themes/templates-and-locals.md)
- [Plugin Overview](./my-docs-website/docs/plugins/overview.md)
- [Plugin Slots](./my-docs-website/docs/plugins/slots.md)
- [Plugin Examples](./my-docs-website/docs/plugins/examples.md)
- [Core API](./my-docs-website/docs/developers/core-api.md)
- [Stability Reference](./my-docs-website/docs/reference/stability.md)

Run the docs site locally with:

```bash
bun run docs:dev
```

## Official Contract

BunPress now documents its extension system as an official contract:

- themes use required layouts like `index`, `post`, `page`, `taxonomy`, `archive`, and `404`
- plugins are enabled explicitly in `site.config.ts`
- plugins can register lifecycle hooks, helpers, and theme slots
- the starter theme automatically renders supported slot output such as `post_meta`, `post_footer`, and `site_footer`

Stable and experimental support levels are documented in the reference guide.
