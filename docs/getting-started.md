# Getting Started

## Install BunPress

Install BunPress globally with Bun:

```bash
bun install -g bunpress
```

## Create a Site

```bash
bunpress init mysite
cd mysite
```

This creates a complete BunPress site with:

- `site.config.ts`
- `content/`
- `themes/`
- `plugins/`
- `scaffolds/`
- `public/` once you build

## Create Content

```bash
bunpress new post "Hello World"
bunpress new page "About"
bunpress new draft "Roadmap Ideas"
```

You can also use a custom scaffold:

```bash
bunpress new post "Launch Day" --scaffold announcement
```

## Run Locally

```bash
bunpress dev
```

This starts the BunPress development server with rebuilds on content and theme changes.

`site.config.ts`, theme config files, and plugins execute as local code during build and dev, so only run BunPress sites you trust.

## Build Static Output

```bash
bunpress build
```

`bunpress build` automatically clears the generated output directory first, then rebuilds the site from scratch.

The built site also includes BunPress SEO defaults such as:

- canonical URLs
- Open Graph and Twitter metadata
- JSON-LD structured data
- WordPress-style permalink presets
- `sitemap.xml`
- `robots.txt`

To remove generated output without rebuilding:

```bash
bunpress clean
```

## Publish

### GitHub Pages

```bash
bunpress publish github --dry-run
bunpress publish github
```

Configure GitHub deploy settings in `site.config.ts`:

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

Before the first Vercel publish, link the site:

```bash
vercel link
```

## Read Next

- [Site Structure](D:\work\hexo-clone-node\docs\site-structure.md)
- [SEO Overview](D:\work\hexo-clone-node\docs\seo\overview.md)
- [Theme Overview](D:\work\hexo-clone-node\docs\themes\overview.md)
- [Plugin Overview](D:\work\hexo-clone-node\docs\plugins\overview.md)
