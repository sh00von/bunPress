---
title: BunPress Docs
slug: /
sidebar_position: 1
---

<div className="docs-home">
  <section className="docs-home__hero">
    <p className="docs-home__eyebrow">Bun-first publishing without the heavyweight setup</p>
    <h1>Ship docs, blogs, release notes, and product updates that feel clear from day one.</h1>
    <p className="docs-home__lede">
      BunPress keeps the structure simple: write Markdown, configure one site file, theme with Nunjucks,
      and publish static output to GitHub Pages or Vercel. It is built for teams that want polished
      publishing without turning content into a framework project.
    </p>
    <div className="docs-home__actions">
      <a className="button button--primary button--lg" href="/getting-started">Start in 5 Minutes</a>
      <a className="button button--secondary button--lg" href="/features">Explore Features</a>
    </div>
    <div className="docs-home__command-strip" role="presentation">
      <code>npx create-bunpress@latest mysite</code>
      <code>cd mysite</code>
      <code>bun install</code>
      <code>bunpress dev</code>
    </div>
  </section>

  <section className="docs-home__section">
    <div className="docs-home__section-heading">
      <p className="docs-home__eyebrow">What makes it feel easy</p>
      <h2>Less setup friction, more publishing momentum.</h2>
    </div>
    <div className="docs-home__grid docs-home__grid--three">
      <article className="docs-home__card">
        <h3>Fast first publish</h3>
        <p>Create a site, add a post, and run the dev server with a short Bun-first flow that does not ask you to wire a frontend stack first.</p>
      </article>
      <article className="docs-home__card">
        <h3>Clear extension model</h3>
        <p>Themes, plugins, slots, and lifecycle hooks are documented as an official contract, so custom work feels predictable instead of fragile.</p>
      </article>
      <article className="docs-home__card">
        <h3>Launch-ready defaults</h3>
        <p>SEO metadata, feeds, sitemaps, redirects, and clean static output are already part of the normal workflow, not release-week add-ons.</p>
      </article>
    </div>
  </section>

  <section className="docs-home__section">
    <div className="docs-home__section-heading">
      <p className="docs-home__eyebrow">Pick your path</p>
      <h2>Jump into the part that matches your job today.</h2>
    </div>
    <div className="docs-home__grid">
      <article className="docs-home__path">
        <h3>I want a site running quickly</h3>
        <p>Start with the shortest path from install to local preview and first publish.</p>
        <a href="/getting-started">Open Getting Started</a>
      </article>
      <article className="docs-home__path">
        <h3>I want to understand the product surface</h3>
        <p>See the authoring, theme, plugin, publishing, and SEO capabilities in one pass.</p>
        <a href="/features">Open Feature Overview</a>
      </article>
      <article className="docs-home__path">
        <h3>I want to customize design</h3>
        <p>Learn the file structure, required layouts, locals, and theme asset model.</p>
        <a href="/themes/overview">Open Theme Overview</a>
      </article>
      <article className="docs-home__path">
        <h3>I want to extend behavior</h3>
        <p>Use hooks, helpers, and slot output to shape publishing behavior without forking the core.</p>
        <a href="/plugins/overview">Open Plugin Overview</a>
      </article>
    </div>
  </section>

  <section className="docs-home__section">
    <div className="docs-home__section-heading">
      <p className="docs-home__eyebrow">Core release flow</p>
      <h2>The everyday commands stay small.</h2>
    </div>
    <div className="docs-home__grid docs-home__grid--two">
      <article className="docs-home__card">
        <h3>Create and write</h3>

```bash
npx create-bunpress@latest mysite
cd mysite
bun install
bunpress new post "Launch Notes"
bunpress dev
```

      </article>
      <article className="docs-home__card">
        <h3>Build and publish</h3>

```bash
bunpress build
bunpress publish github --dry-run
bunpress publish github
# or
bunpress publish vercel
```

      </article>
    </div>
  </section>

  <section className="docs-home__section docs-home__section--compact">
    <div className="docs-home__section-heading">
      <p className="docs-home__eyebrow">Read next</p>
      <h2>Useful follow-ups once the first preview is working.</h2>
    </div>
    <div className="docs-home__link-grid">
      <a href="/site-structure">Site Structure</a>
      <a href="/publishing-quality">Publishing Quality</a>
      <a href="/seo/overview">SEO Overview</a>
      <a href="/developers/core-api">Core API</a>
    </div>
  </section>
</div>
