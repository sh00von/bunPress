# Getting Started

This guide is the shortest path from zero to a local BunPress site.

By the end, you will have:

- a generated site with content, themes, plugins, and scaffolds
- a local preview running with rebuilds
- the core commands you need before release

## 1. Create a site

```bash
npx create-bunpress@latest mysite
cd mysite
bun install
```

The generated site includes:

- `site.config.ts` for site-level settings
- `content/` for posts, pages, and drafts
- `themes/` for local theme files
- `plugins/` for local extensions
- `scaffolds/` for content templates
- `public/` after your first build

The starter output is intentionally professional and restrained, so a fresh site already fits release notes,
platform updates, docs-style writing, and product communication.

## 2. Add content

```bash
bunpress new post "Hello World"
bunpress new page "About"
bunpress new draft "Roadmap Ideas"
```

You can also create content from a custom scaffold:

```bash
bunpress new post "Launch Day" --scaffold announcement
```

## 3. Preview locally

```bash
bunpress dev
```

This starts the local development server and rebuilds when content or theme files change.

`site.config.ts`, theme config files, and plugins execute as local code during build and dev, so only run
BunPress sites you trust.

## 4. Build release output

```bash
bunpress build
```

`bunpress build` clears the generated output directory and rebuilds the site from scratch.

Built output includes release-friendly defaults such as:

- canonical URLs
- Open Graph and Twitter metadata
- JSON-LD structured data
- WordPress-style permalink presets
- `sitemap.xml`
- `robots.txt`
- favicon and app icon metadata

If you only want to remove generated output:

```bash
bunpress clean
```

## 5. Publish

### GitHub Pages

```bash
bunpress publish github --dry-run
bunpress publish github
```

Configure GitHub publishing in `site.config.ts`:

```ts
deploy: {
  github: {
    repo: "owner/repo",
    branch: "gh-pages",
    cname: "",
  }
}
```

### Vercel

```bash
bunpress publish vercel --dry-run
bunpress publish vercel
```

Before the first Vercel publish:

```bash
vercel link
```

## What to read next

- [Feature Overview](./features.md) for the full product surface
- [Site Structure](./site-structure.md) for the generated file model
- [SEO Overview](./seo/overview.md) for metadata, schema, and feeds
- [Theme Overview](./themes/overview.md) if you want to change the visual system
- [Plugin Overview](./plugins/overview.md) if you want to extend behavior
