---
title: CLI Reference
sidebar_position: 4
---

# CLI Reference

## Site Creation

```bash
npx create-bunpress@latest mysite
```

Power users can also scaffold directly:

```bash
bunpress init mysite
```

## Core Commands

```bash
bunpress dev
bunpress build
bunpress serve
bunpress clean
bunpress list
```

Aliases:

- `bunpress generate` -> `bunpress build`
- `bunpress server` -> `bunpress dev`
- `bunpress deploy` -> `bunpress publish`

## Content Commands

```bash
bunpress new post "Hello World"
bunpress new page "About"
bunpress new draft "Roadmap"
```

Custom scaffold selection:

```bash
bunpress new post "Launch Day" --scaffold announcement
```

## Starter Generators

```bash
bunpress init theme my-theme
bunpress init plugin my-plugin
```

## Publish Commands

GitHub Pages:

```bash
bunpress publish github --dry-run
bunpress publish github
```

Vercel:

```bash
bunpress publish vercel --dry-run
bunpress publish vercel
```

## Build Output

`bunpress build` produces:

- HTML routes for posts, pages, taxonomies, archives, and 404
- static assets under `public/assets/`
- `sitemap.xml`
- `robots.txt`
- `feed.xml`
- `atom.xml`
- redirect pages and `_redirects` output when configured

Warnings are printed during build for content and SEO quality issues, but they do not fail the build by default.
