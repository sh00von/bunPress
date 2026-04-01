# BunPress

BunPress is a Bun-first static site generator and publishing CLI with a file-based content model, Nunjucks themes, built-in SEO defaults including favicon support, and an official plugin/theme extension contract.

Open-source project by [Shovon](https://shovon.bd/).

## Install

```bash
bun install -g bunpress
```

## Quick Start

```bash
bunpress init mysite
cd mysite
bunpress new post "Hello World"
bunpress dev
```

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

- [Getting Started](D:\work\hexo-clone-node\docs\getting-started.md)
- [Site Structure](D:\work\hexo-clone-node\docs\site-structure.md)
- [SEO Overview](D:\work\hexo-clone-node\docs\seo\overview.md)
- [SEO Metadata and Schema](D:\work\hexo-clone-node\docs\seo\metadata-and-schema.md)
- [Theme Overview](D:\work\hexo-clone-node\docs\themes\overview.md)
- [Templates and Locals](D:\work\hexo-clone-node\docs\themes\templates-and-locals.md)
- [Plugin Overview](D:\work\hexo-clone-node\docs\plugins\overview.md)
- [Plugin Slots](D:\work\hexo-clone-node\docs\plugins\slots.md)
- [Plugin Examples](D:\work\hexo-clone-node\docs\plugins\examples.md)
- [Stability Reference](D:\work\hexo-clone-node\docs\reference\stability.md)

## Official Contract

BunPress now documents its extension system as an official contract:

- themes use required layouts like `index`, `post`, `page`, `taxonomy`, `archive`, and `404`
- plugins are enabled explicitly in `site.config.ts`
- plugins can register lifecycle hooks, helpers, and theme slots
- the starter theme automatically renders supported slot output such as `post_meta`

Stable and experimental support levels are documented in the reference guide.
