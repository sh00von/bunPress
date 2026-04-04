# create-bunpress

Create a new BunPress site with a create-app style command.

## Usage

```bash
npx create-bunpress@latest mysite
```

You can also use:

```bash
npm create bunpress@latest mysite
```

## After Scaffolding

```bash
cd mysite
bun install
bunpress dev
```

When you run `bunpress build`, BunPress generates the final static site into `public/`.
If you deploy manually, deploy only the `public/` folder.

## What You Get

- a starter BunPress site
- starter content, themes, plugins, and scaffolds
- a local workflow built around `bunpress dev`, `build`, and `publish`
