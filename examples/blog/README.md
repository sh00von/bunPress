# Example Blog

This example blog is meant to be deployable to either Vercel or GitHub Pages with the same static output.

## Before You Publish

Update [`site.config.ts`](./site.config.ts):

- set `url` to your real production URL
- set `deploy.github.repo` if you want GitHub Pages publishing
- set `deploy.github.cname` only if you use a custom domain on GitHub Pages
- run `vercel link` before the first Vercel publish

Why `url` matters:

- canonical URLs use it
- `sitemap.xml` uses it
- RSS and Atom feed links use it
- redirect pages point to it
- `robots.txt` should reference the matching sitemap URL

## Local Workflow

```bash
bun install
bun run dev
bun run build
```

## Deploy to GitHub Pages

Validate first:

```bash
bunpress publish github --dry-run
```

Publish:

```bash
bunpress publish github
```

GitHub Pages notes:

- project sites usually use `https://owner.github.io/repo/`
- custom domains should also set `deploy.github.cname`
- BunPress writes both static redirect pages and a `_redirects` manifest

## Deploy to Vercel

Link once:

```bash
vercel link
```

Validate first:

```bash
bunpress publish vercel --dry-run
```

Publish:

```bash
bunpress publish vercel
```

Vercel notes:

- keep `url` set to the production domain you want canonical URLs to use
- dry-run confirms the output directory and publish target before deployment

## Build Output

The generated `public/` directory includes:

- `index.html` and route HTML files
- `sitemap.xml`
- `robots.txt`
- `feed.xml`
- `atom.xml`
- redirect pages
- `_redirects`
