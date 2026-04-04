# BunPress

BunPress is a Bun-first static site generator and publishing CLI for docs, blogs, release notes, and product communication.

## Start Fast

```bash
npx create-bunpress@latest mysite
cd mysite
bun install
bunpress dev
```

## Common Workflow

```bash
bunpress new post "Launch Notes"
bunpress build
bunpress serve
bunpress publish github --dry-run
bunpress publish vercel --dry-run
```

`bunpress build` generates your final static site into `public/`.
If you are deploying manually, deploy only the `public/` folder.

## Highlights

- Markdown authoring with front matter
- File-based Nunjucks themes
- Local plugins with documented slots and hooks
- Built-in SEO defaults including sitemap, feeds, metadata, and favicon support
- GitHub Pages and Vercel publishing flows

## Links

- GitHub: https://github.com/shovon/bunpress
- Docs: https://bunpress.dev/
- Author: https://shovon.bd/
