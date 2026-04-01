import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE_PACKAGE_JSON = `{
  "name": "my-bunpress-site",
  "private": true,
  "type": "module",
  "packageManager": "bun@1.3.10",
  "devDependencies": {
    "bunpress": "^1.0.0"
  },
  "scripts": {
    "dev": "bunpress dev",
    "build": "bunpress build",
    "serve": "bunpress serve",
    "new:post": "bunpress new post",
    "new:page": "bunpress new page",
    "new:draft": "bunpress new draft",
    "publish:github": "bunpress publish github",
    "publish:vercel": "bunpress publish vercel"
  }
}
`;

const SITE_CONFIG = `export default {
  title: "My BunPress Blog",
  url: "http://localhost:3000/",
  description: "A Bun-first static site powered by BunPress.",
  language: "en",
  // Available permalinkStyle values:
  // "day-and-name" -> "/:year/:month/:day/:slug/"
  // "month-and-name" -> "/:year/:month/:slug/"
  // "post-name" -> "/:slug/"
  // "plain" -> "/posts/:slug/"
  // "custom" -> use the explicit "permalink" field
  permalinkStyle: "day-and-name",
  theme: "starter",
  paginationSize: 5,
  seo: {
    siteName: "My BunPress Blog",
    defaultDescription: "A Bun-first static publishing site with built-in metadata, schema, and crawlable output.",
    defaultOgImage: "/assets/images/og-default.svg",
    defaultOgImageAlt: "BunPress default social preview",
    favicon: "/assets/favicon.svg",
    themeColor: "#c2410c",
    robotsTxt: \`User-agent: *
Allow: /
Sitemap: http://localhost:3000/sitemap.xml
\`,
    organization: {
      name: "BunPress Studio",
      sameAs: ["https://github.com/example/bunpress"],
    },
  },
  menus: {
    primary: [
      { text: "Home", url: "/" },
      { text: "Archives", url: "/archives/" },
      { text: "About", url: "/about/" },
    ],
    footer: [
      { text: "About", url: "/about/" },
      { text: "Archives", url: "/archives/" },
      { text: "Tag: bunpress", url: "/tags/bunpress/" },
    ],
  },
  socialLinks: [
    {
      text: "GitHub",
      url: "https://github.com/example/bunpress",
      rel: "noopener noreferrer",
      target: "_blank",
    },
    {
      text: "Archives",
      url: "/archives/",
    },
  ],
  pluginsConfig: {
    socialLinks: {
      links: [
        {
          text: "GitHub",
          url: "https://github.com/example/bunpress",
          rel: "noopener noreferrer",
          target: "_blank",
        },
        {
          text: "Archives",
          url: "/archives/",
        },
      ],
    },
    shareButtons: {
      links: [
        {
          text: "Share on X",
          icon: "X",
          shareBase: "https://twitter.com/intent/tweet?url=",
        },
        {
          text: "Share on LinkedIn",
          icon: "in",
          shareBase: "https://www.linkedin.com/sharing/share-offsite/?url=",
        },
      ],
    },
    siteChrome: {
      headerLinks: [
        { text: "Start Here", url: "/about/", kind: "button" },
      ],
    },
    authorBox: {
      heading: "Written by",
      siteLabel: "Published on BunPress",
    },
  },
  plugins: [
    "./plugins/reading-time.ts",
    "./plugins/author-meta.ts",
    "./plugins/author-box.ts",
    "./plugins/share-buttons.ts",
    "./plugins/site-chrome.ts",
    "./plugins/social-links.ts",
  ],
  deploy: {
    github: {
      // Use "owner/repo" or a full git URL.
      repo: "",
      branch: "gh-pages",
      cname: "",
    },
    vercel: {
      // Run "vercel link" in this site before your first publish.
      project: "",
      prod: true,
    },
  },
};
`;

const SITE_GITIGNORE = `node_modules
public
.vercel
*.log
`;

const SITE_README = `# BunPress Site

## Getting Started

Install BunPress globally:

\`\`\`bash
bun install -g bunpress
\`\`\`

Create content:

\`\`\`bash
bunpress new post "My First Post"
bunpress new page "About"
bunpress new draft "Ideas"
\`\`\`

Run locally:

\`\`\`bash
bunpress dev
\`\`\`

Build production output:

\`\`\`bash
bunpress build
\`\`\`

Dry-run your publish configuration:

\`\`\`bash
bunpress publish github --dry-run
bunpress publish vercel --dry-run
\`\`\`

Publish for real:

\`\`\`bash
bunpress publish github
bunpress publish vercel
\`\`\`

## Scaffolds

Edit files in \`scaffolds/\` to customize the default front matter and body for posts, pages, and drafts.
Use \`bunpress new post "Title" --scaffold custom\` to apply a custom scaffold.

## Starter Generators

\`\`\`bash
bunpress init theme my-theme
bunpress init plugin my-plugin
\`\`\`
`;

const READING_TIME_PLUGIN = `export default async function readingTimePlugin(api) {
  api.on("content:transformed", ({ content }) => {
    for (const post of content.posts) {
      const wordCount = post.raw.split(/\\s+/).filter(Boolean).length;
      post.metadata.readingTime = Math.max(1, Math.ceil(wordCount / 220));
    }
  });

  api.slot("post_meta", ({ post }) => {
    if (!post || typeof post.metadata.readingTime !== "number") {
      return [];
    }

    return [
      {
        kind: "text",
        text: \`\${post.metadata.readingTime} min read\`,
      },
    ];
  });
}
`;

const AUTHOR_META_PLUGIN = `export default async function authorMetaPlugin(api) {
  api.slot("post_meta", ({ post }) => {
    const author = typeof post?.frontMatter.author === "string" ? post.frontMatter.author : "";
    if (!author) {
      return [];
    }

    return [
      {
        kind: "text",
        text: \`By \${author}\`,
      },
    ];
  });
}
`;

const AUTHOR_BOX_PLUGIN = `export default async function authorBoxPlugin(api) {
  api.slot("post_below_content", ({ post, config }) => {
    if (!post) {
      return [];
    }

    const pluginConfig = config.pluginsConfig.authorBox ?? {};
    const author = typeof post.frontMatter.author === "string" ? post.frontMatter.author : "";
    if (!author) {
      return [];
    }

    return [
      {
        kind: "text",
        text: \`\${pluginConfig.heading ?? "Written by"} \${author}\`,
      },
      {
        kind: "text",
        text: pluginConfig.siteLabel ?? \`Published on \${config.title}\`,
      },
    ];
  });
}
`;

const SOCIAL_LINKS_PLUGIN = `export default async function socialLinksPlugin(api) {
  api.slot("site_footer", ({ config }) => {
    const pluginConfig = config.pluginsConfig.socialLinks ?? {};
    const configuredLinks = pluginConfig.links?.length ? pluginConfig.links : (config.socialLinks ?? []);
    const fallbackLinks = [
      {
        text: "GitHub",
        url: config.url,
      },
      {
        text: "Archives",
        url: "/archives/",
      },
    ];

    return (configuredLinks.length ? configuredLinks : fallbackLinks).map((link) => ({
      kind: "link",
      text: link.text,
      url: link.url,
      title: link.title,
      rel: link.rel,
      target: link.target,
    }));
  });
}
`;

const SHARE_BUTTONS_PLUGIN = `export default async function shareButtonsPlugin(api) {
  api.slot("post_footer", ({ post, config }) => {
    if (!post) {
      return [];
    }

    const pluginConfig = config.pluginsConfig.shareButtons ?? {};
    const absolutePostUrl = new URL(post.urlPath.replace(/^\\//, ""), config.url).toString();
    const links = pluginConfig.links?.length
      ? pluginConfig.links
      : [
          {
            text: "Share on X",
            icon: "X",
            shareBase: "https://twitter.com/intent/tweet?url=",
          },
          {
            text: "Share on LinkedIn",
            icon: "in",
            shareBase: "https://www.linkedin.com/sharing/share-offsite/?url=",
          },
        ];

    return links.map((link) => ({
      kind: "button",
      text: link.text,
      icon: link.icon,
      url: \`\${link.shareBase}\${encodeURIComponent(absolutePostUrl)}\`,
      title: \`Share \${post.title}\`,
      target: "_blank",
      rel: "noopener noreferrer",
    }));
  });
}
`;

const SITE_CHROME_PLUGIN = `export default async function siteChromePlugin(api) {
  api.slot("site_header", ({ config }) => {
    const pluginConfig = config.pluginsConfig.siteChrome ?? {};
    return pluginConfig.headerLinks ?? [];
  });

  api.slot("sidebar_primary", ({ config }) => {
    const pluginConfig = config.pluginsConfig.siteChrome ?? {};
    return pluginConfig.sidebarLinks ?? [];
  });
}
`;

const HOME_POST = `---
title: Hello BunPress
slug: hello-bunpress
date: 2026-04-01T10:00:00.000Z
author: BunPress Team
tags:
  - intro
  - bunpress
categories:
  - announcements
---

Welcome to your new BunPress site. This first post proves the full pipeline works: front matter, Markdown, layouts, taxonomy pages, and static output.

<!-- more -->

You can now:

- run \`bunpress dev\`
- create more posts with \`bunpress new post "My Title"\`
- draft ideas with \`bunpress new draft "Future Post"\`
- publish with \`bunpress publish github\` or \`bunpress publish vercel\`
`;

const ABOUT_PAGE = `---
title: About
description: Learn what BunPress ships with by default and how its built-in SEO works.
---

This site ships with BunPress, Nunjucks theme rendering, and a simple plugin API.
`;

const POST_SCAFFOLD = `---
title: {{ title }}
slug: {{ slug }}
date: {{ date }}
tags: []
categories: []
---

Write your post here.
`;

const PAGE_SCAFFOLD = `---
title: {{ title }}
slug: {{ slug }}
---

Write your page here.
`;

const DRAFT_SCAFFOLD = `---
title: {{ title }}
slug: {{ slug }}
date: {{ date }}
tags: []
categories: []
draft: true
---

Write your draft here.
`;

const THEME_CONFIG = `export default {
  accent: "#c2410c",
  surface: "#fff7ed",
  text: "#292524",
};
`;

const BASE_LAYOUT = `<!doctype html>
<html lang="{{ site.language }}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{ seo.title }}</title>
    <meta name="description" content="{{ seo.description }}" />
    <link rel="canonical" href="{{ seo.canonical }}" />
    {% if seo.themeColor %}<meta name="theme-color" content="{{ seo.themeColor }}" />{% endif %}
    {% for favicon in seo.favicons %}<link rel="{{ favicon.rel }}" href="{{ favicon.url }}"{% if favicon.type %} type="{{ favicon.type }}"{% endif %}{% if favicon.sizes %} sizes="{{ favicon.sizes }}"{% endif %}{% if favicon.color %} color="{{ favicon.color }}"{% endif %} />{% endfor %}
    <meta name="robots" content="{{ seo.robots }}" />
    <meta property="og:title" content="{{ seo.openGraph.title }}" />
    <meta property="og:description" content="{{ seo.openGraph.description }}" />
    <meta property="og:type" content="{{ seo.openGraph.type }}" />
    <meta property="og:url" content="{{ seo.openGraph.url }}" />
    <meta property="og:site_name" content="{{ seo.openGraph.siteName }}" />
    {% if seo.openGraph.image %}<meta property="og:image" content="{{ seo.openGraph.image }}" />{% endif %}
    {% if seo.openGraph.imageAlt %}<meta property="og:image:alt" content="{{ seo.openGraph.imageAlt }}" />{% endif %}
    <meta name="twitter:card" content="{{ seo.twitter.card }}" />
    <meta name="twitter:title" content="{{ seo.twitter.title }}" />
    <meta name="twitter:description" content="{{ seo.twitter.description }}" />
    {% if seo.twitter.image %}<meta name="twitter:image" content="{{ seo.twitter.image }}" />{% endif %}
    <link rel="stylesheet" href="/assets/css/site.css" />
    {% for schema in seo.jsonLd %}
      <script type="application/ld+json">{{ renderTrusted(json(schema)) }}</script>
    {% endfor %}
  </head>
  <body>
    {% include "header.njk" %}
    <main class="shell layout">
      <div class="layout__content">
        {% include "breadcrumbs.njk" %}
        {% block content %}{% endblock %}
      </div>
      {% if seo.pageType != "404" %}
        <aside class="layout__sidebar">
          {% include "sidebar.njk" %}
        </aside>
      {% endif %}
    </main>
    {% include "footer.njk" %}
  </body>
</html>
`;

const HEADER_PARTIAL = `<header class="masthead">
  <div class="shell masthead__inner">
    <a class="brand" href="/">{{ site.title }}</a>
    <nav class="nav">
      <a href="/">Home</a>
      <a href="/archives/">Archives</a>
      <a href="/about/">About</a>
    </nav>
  </div>
</header>
`;

const FOOTER_PARTIAL = `<footer class="footer">
  <div class="shell footer__inner">
    <p>{{ site.description }}</p>
    <p>Built with BunPress, Hono, Markdown, and Nunjucks.</p>
  </div>
</footer>
`;

const BREADCRUMBS_PARTIAL = `{% if seo.breadcrumbs.length > 1 %}
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    {% for item in seo.breadcrumbs %}
      {% if not loop.first %}<span>/</span>{% endif %}
      {% if not loop.last %}
        <a href="{{ item.url }}">{{ item.name }}</a>
      {% else %}
        <span aria-current="page">{{ item.name }}</span>
      {% endif %}
    {% endfor %}
  </nav>
{% endif %}
`;

const SIDEBAR_PARTIAL = `{% if collections.categories.length %}
  <section class="sidebar-block">
    <p class="eyebrow">Categories</p>
    <ul>
      {% for category in collections.categories %}
        <li><a href="{{ category.urlPath }}">{{ category.name }}</a></li>
      {% endfor %}
    </ul>
  </section>
{% endif %}
{% if collections.tags.length %}
  <section class="sidebar-block">
    <p class="eyebrow">Tags</p>
    <ul>
      {% for tag in collections.tags %}
        <li><a href="{{ tag.urlPath }}">{{ tag.name }}</a></li>
      {% endfor %}
    </ul>
  </section>
{% endif %}
`;

const INDEX_LAYOUT = `{% extends "base.njk" %}
{% block content %}
  <section class="hero">
    <p class="eyebrow">Bun-First Static Publishing</p>
    <h1>{{ site.title }}</h1>
    <p class="lede">{{ site.description }}</p>
  </section>

  <section class="grid">
    {% for post in page.posts %}
      <article class="card">
        <p class="meta">{{ formatDate(post.date) }}</p>
        <h2><a href="{{ post.urlPath }}">{{ post.title }}</a></h2>
        <p>{{ post.excerpt }}</p>
        {% if post.metadata.readingTime %}
          <p class="meta">{{ post.metadata.readingTime }} min read</p>
        {% endif %}
      </article>
    {% endfor %}
  </section>

  {% if page.pagination.totalPages > 1 %}
    <nav class="pagination">
      {% if page.pagination.prevUrl %}
        <a href="{{ page.pagination.prevUrl }}">Newer posts</a>
      {% endif %}
      <span>Page {{ page.pagination.currentPage }} of {{ page.pagination.totalPages }}</span>
      {% if page.pagination.nextUrl %}
        <a href="{{ page.pagination.nextUrl }}">Older posts</a>
      {% endif %}
    </nav>
  {% endif %}
{% endblock %}
`;

const POST_LAYOUT = `{% extends "base.njk" %}
{% block content %}
  <article class="prose">
    <p class="meta">{{ formatDate(page.post.date) }}</p>
    <h1>{{ page.post.title }}</h1>
    <div class="chip-row">
      {% for tag in page.post.tags %}
        <a class="chip" href="/tags/{{ tag | lower | replace(" ", "-") }}/">{{ tag }}</a>
      {% endfor %}
    </div>
    <div class="post-body">{{ renderTrusted(page.post.html) }}</div>
  </article>
{% endblock %}
`;

const PAGE_LAYOUT = `{% extends "base.njk" %}
{% block content %}
  <article class="prose">
    <h1>{{ page.page.title }}</h1>
    <div class="post-body">{{ renderTrusted(page.page.html) }}</div>
  </article>
{% endblock %}
`;

const TAXONOMY_LAYOUT = `{% extends "base.njk" %}
{% block content %}
  <section class="hero hero--compact">
    <p class="eyebrow">{{ page.taxonomyType | upper }}</p>
    <h1>{{ page.entry.name }}</h1>
  </section>
  <section class="grid">
    {% for post in page.entry.posts %}
      <article class="card">
        <p class="meta">{{ formatDate(post.date) }}</p>
        <h2><a href="{{ post.urlPath }}">{{ post.title }}</a></h2>
        <p>{{ post.excerpt }}</p>
      </article>
    {% endfor %}
  </section>
{% endblock %}
`;

const ARCHIVE_LAYOUT = `{% extends "base.njk" %}
{% block content %}
  <section class="hero hero--compact">
    <p class="eyebrow">Archive</p>
    <h1>{{ page.title }}</h1>
  </section>
  {% for group in page.archives %}
    <section class="archive-group">
      <h2>{{ group.label }}</h2>
      <ul class="archive-list">
        {% for post in group.posts %}
          <li>
            <a href="{{ post.urlPath }}">{{ post.title }}</a>
            <span>{{ formatDate(post.date) }}</span>
          </li>
        {% endfor %}
      </ul>
    </section>
  {% endfor %}
{% endblock %}
`;

const NOT_FOUND_LAYOUT = `{% extends "base.njk" %}
{% block content %}
  <section class="hero hero--compact">
    <p class="eyebrow">404</p>
    <h1>Page not found</h1>
    <p>The page you requested does not exist.</p>
    <a class="button" href="/">Back home</a>
  </section>
{% endblock %}
`;

const SITE_CSS = `:root {
  --accent: #c2410c;
  --surface: #fff7ed;
  --surface-strong: #ffedd5;
  --text: #292524;
  --muted: #78716c;
  --line: rgba(41, 37, 36, 0.12);
  --shadow: 0 20px 45px rgba(120, 53, 15, 0.12);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--text);
  background:
    radial-gradient(circle at top left, rgba(251, 191, 36, 0.2), transparent 28rem),
    linear-gradient(180deg, #fffaf5 0%, #fff 100%);
}

a {
  color: inherit;
}

.shell {
  width: min(72rem, calc(100vw - 2rem));
  margin: 0 auto;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2rem;
}

.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 1.5rem;
  color: var(--muted);
  font-size: 0.9rem;
}

.layout__sidebar {
  border-top: 1px solid var(--line);
  padding-top: 1.5rem;
}

.masthead {
  position: sticky;
  top: 0;
  backdrop-filter: blur(12px);
  background: rgba(255, 250, 245, 0.82);
  border-bottom: 1px solid var(--line);
}

.masthead__inner,
.footer__inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
}

.brand,
.nav a,
.button {
  text-decoration: none;
}

.brand {
  font-size: 1.2rem;
  font-weight: 700;
}

.nav {
  display: flex;
  gap: 1rem;
}

.hero {
  padding: 4rem 0 2rem;
}

.hero--compact {
  padding-bottom: 1rem;
}

.eyebrow,
.meta {
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.78rem;
}

.lede {
  max-width: 44rem;
  font-size: 1.15rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1.25rem;
  padding-bottom: 2rem;
}

.card,
.prose,
.archive-group {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid var(--line);
  border-radius: 1.25rem;
  box-shadow: var(--shadow);
}

.card {
  padding: 1.25rem;
}

.prose {
  padding: 2rem;
  margin: 1rem 0 2rem;
}

.post-body {
  line-height: 1.75;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.chip,
.button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.85rem;
  border-radius: 999px;
  background: var(--surface-strong);
}

.pagination,
.archive-list li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.pagination {
  padding: 1rem 0 3rem;
}

.archive-group {
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.archive-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.archive-list li {
  padding: 0.65rem 0;
  border-top: 1px solid var(--line);
}

.archive-list li:first-child {
  border-top: 0;
}

.footer {
  border-top: 1px solid var(--line);
  margin-top: 2rem;
}

.sidebar-block ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-block li + li {
  margin-top: 0.5rem;
}

@media (max-width: 720px) {
  .masthead__inner,
  .footer__inner,
  .pagination,
  .archive-list li {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero {
    padding-top: 2.5rem;
  }
}

@media (min-width: 980px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) 18rem;
  }

  .layout__sidebar {
    border-top: 0;
    border-left: 1px solid var(--line);
    padding-top: 3rem;
    padding-left: 1.5rem;
  }
}
`;

const DEFAULT_OG_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">BunPress default social preview</title>
  <desc id="desc">BunPress preview card with editorial typography and built-in SEO messaging.</desc>
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect x="56" y="56" width="1088" height="518" rx="24" fill="#fff7ed" stroke="#fed7aa"/>
  <text x="96" y="180" fill="#9a3412" font-family="Arial, sans-serif" font-size="28" letter-spacing="8">BUNPRESS</text>
  <text x="96" y="300" fill="#292524" font-family="Georgia, serif" font-size="72">Editorial publishing</text>
  <text x="96" y="388" fill="#292524" font-family="Georgia, serif" font-size="72">with built-in SEO</text>
  <text x="96" y="484" fill="#44403c" font-family="Arial, sans-serif" font-size="32">Canonical URLs, metadata, JSON-LD, sitemap.xml, and robots.txt.</text>
</svg>
`;

const DEFAULT_FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-labelledby="title">
  <title id="title">BunPress favicon</title>
  <rect width="64" height="64" rx="14" fill="#292524"/>
  <path d="M18 14h16c9 0 15 5 15 13 0 5-2 9-7 11 6 2 9 6 9 12 0 9-7 14-18 14H18V14Zm12 20c6 0 10-3 10-8 0-4-3-7-9-7h-5v15h4Zm2 23c7 0 11-3 11-9 0-5-4-8-11-8h-6v17h6Z" fill="#ffffff"/>
</svg>
`;

const THEME_STARTER_LAYOUT = `<!doctype html>
<html lang="{{ site.language }}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{ seo.title }}</title>
    <meta name="description" content="{{ seo.description }}" />
    <link rel="canonical" href="{{ seo.canonical }}" />
    {% if seo.themeColor %}<meta name="theme-color" content="{{ seo.themeColor }}" />{% endif %}
    {% for favicon in seo.favicons %}<link rel="{{ favicon.rel }}" href="{{ favicon.url }}"{% if favicon.type %} type="{{ favicon.type }}"{% endif %}{% if favicon.sizes %} sizes="{{ favicon.sizes }}"{% endif %}{% if favicon.color %} color="{{ favicon.color }}"{% endif %} />{% endfor %}
  </head>
  <body>
    <header>
      <a href="/">{{ site.title }}</a>
      {% if slots.site_header.length %}
        {% set items = slots.site_header %}
        {% set className = "slot-items slot-items--inline" %}
        {% include "slot-items.njk" %}
      {% endif %}
    </header>
    <div class="theme-layout">
      <main>
        {% if seo.breadcrumbs.length > 1 %}
          <nav aria-label="Breadcrumb">
            {% for item in seo.breadcrumbs %}
              {% if not loop.first %}<span>/</span>{% endif %}
              {% if not loop.last %}<a href="{{ item.url }}">{{ item.name }}</a>{% else %}<span>{{ item.name }}</span>{% endif %}
            {% endfor %}
          </nav>
        {% endif %}
        {% block content %}{% endblock %}
      </main>
      {% if seo.pageType != "404" %}
        <aside>
          {% include "sidebar.njk" %}
        </aside>
      {% endif %}
    </div>
    <footer>
      {% if slots.site_footer.length %}
        {% set items = slots.site_footer %}
        {% set className = "slot-items slot-items--inline" %}
        {% include "slot-items.njk" %}
      {% endif %}
    </footer>
  </body>
</html>
`;

const THEME_STARTER_INDEX = `{% extends "base.njk" %}
{% block content %}
  <h1>{{ site.title }}</h1>
  {% for post in page.posts %}
    <article>
      <h2><a href="{{ post.urlPath }}">{{ post.title }}</a></h2>
      <p>{{ post.excerpt }}</p>
    </article>
  {% endfor %}
{% endblock %}
`;

const THEME_STARTER_CONTENT = `{
  "theme.config.ts": "export default {\\n  accent: \\"#0f766e\\",\\n};\\n",
  "layout/base.njk": "__THEME_STARTER_LAYOUT__",
  "layout/index.njk": "__THEME_STARTER_INDEX__",
  "layout/post.njk": "{% extends \\"base.njk\\" %}\\n{% block content %}<article>{% set items = slots.post_meta[page.post.id] or [] %}{% set className = \\"meta\\" %}{% include \\"post-meta.njk\\" %}<h1>{{ page.post.title }}</h1>{% if (slots.post_above_content[page.post.id] or []).length %}{% set items = slots.post_above_content[page.post.id] or [] %}{% set className = \\"slot-items slot-items--inline\\" %}{% include \\"slot-items.njk\\" %}{% endif %}<div>{{ renderTrusted(page.post.html) }}</div>{% if (slots.post_below_content[page.post.id] or []).length %}{% set items = slots.post_below_content[page.post.id] or [] %}{% set className = \\"slot-items slot-items--stack\\" %}{% include \\"slot-items.njk\\" %}{% endif %}{% if (slots.post_footer[page.post.id] or []).length %}{% set items = slots.post_footer[page.post.id] or [] %}{% set className = \\"slot-items slot-items--inline\\" %}{% include \\"slot-items.njk\\" %}{% endif %}</article>{% endblock %}\\n",
  "layout/page.njk": "{% extends \\"base.njk\\" %}\\n{% block content %}<article><h1>{{ page.page.title }}</h1>{% if (slots.page_above_content[page.page.id] or []).length %}{% set items = slots.page_above_content[page.page.id] or [] %}{% set className = \\"slot-items slot-items--inline\\" %}{% include \\"slot-items.njk\\" %}{% endif %}{{ renderTrusted(page.page.html) }}{% if (slots.page_below_content[page.page.id] or []).length %}{% set items = slots.page_below_content[page.page.id] or [] %}{% set className = \\"slot-items slot-items--stack\\" %}{% include \\"slot-items.njk\\" %}{% endif %}{% if (slots.page_footer[page.page.id] or []).length %}{% set items = slots.page_footer[page.page.id] or [] %}{% set className = \\"slot-items slot-items--inline\\" %}{% include \\"slot-items.njk\\" %}{% endif %}</article>{% endblock %}\\n",
  "layout/taxonomy.njk": "{% extends \\"base.njk\\" %}\\n{% block content %}<h1>{{ page.entry.name }}</h1>{% endblock %}\\n",
  "layout/archive.njk": "{% extends \\"base.njk\\" %}\\n{% block content %}<h1>{{ page.title }}</h1>{% endblock %}\\n",
  "layout/404.njk": "{% extends \\"base.njk\\" %}\\n{% block content %}<h1>404</h1>{% endblock %}\\n",
  "partials/post-meta.njk": "{% set metaItems = items or [] %}\\n{% if metaItems.length %}<p class=\\"{{ className or 'meta' }}\\">{% for item in metaItems %}{% if not loop.first %} &bull; {% endif %}{% if item.kind == 'link' or item.url %}<a href=\\"{{ item.url or '#' }}\\">{{ item.text }}</a>{% else %}<span>{{ item.text }}</span>{% endif %}{% endfor %}</p>{% endif %}\\n",
  "partials/slot-items.njk": "{% set slotItems = items or [] %}\\n{% if slotItems.length %}<div class=\\"{{ className or 'slot-items' }}\\">{% for item in slotItems %}{% if item.kind == 'button' %}<a href=\\"{{ item.url or '#' }}\\" class=\\"{{ item.className or 'slot-items__button' }}\\"{% if item.title %} title=\\"{{ item.title }}\\"{% endif %}{% if item.rel %} rel=\\"{{ item.rel }}\\"{% endif %}{% if item.target %} target=\\"{{ item.target }}\\"{% endif %}>{% if item.icon %}<span class=\\"slot-items__icon\\">{{ item.icon }}</span>{% endif %}{{ item.text }}</a>{% elif item.kind == 'link' or item.url %}<a href=\\"{{ item.url or '#' }}\\" class=\\"{{ item.className or 'slot-items__link' }}\\"{% if item.title %} title=\\"{{ item.title }}\\"{% endif %}{% if item.rel %} rel=\\"{{ item.rel }}\\"{% endif %}{% if item.target %} target=\\"{{ item.target }}\\"{% endif %}>{% if item.icon %}<span class=\\"slot-items__icon\\">{{ item.icon }}</span>{% endif %}{{ item.text }}</a>{% else %}<span class=\\"{{ item.className or 'slot-items__text' }}\\">{% if item.icon %}<span class=\\"slot-items__icon\\">{{ item.icon }}</span>{% endif %}{{ item.text }}</span>{% endif %}{% endfor %}</div>{% endif %}\\n",
  "partials/sidebar.njk": "<section><p>Theme-owned sidebar</p><ul>{% for category in collections.categories %}<li><a href=\\"{{ category.urlPath }}\\">{{ category.name }}</a></li>{% endfor %}</ul></section>\\n",
  "assets/README.md": "Place theme-specific assets here.\\n"
}`
  .replace("__THEME_STARTER_LAYOUT__", THEME_STARTER_LAYOUT.replace(/\n/g, "\\n").replace(/"/g, '\\"'))
  .replace("__THEME_STARTER_INDEX__", THEME_STARTER_INDEX.replace(/\n/g, "\\n").replace(/"/g, '\\"'));

export function scaffoldFiles(): Map<string, string> {
  return new Map<string, string>([
    ["package.json", SITE_PACKAGE_JSON],
    [".gitignore", SITE_GITIGNORE],
    ["README.md", SITE_README],
    ["site.config.ts", SITE_CONFIG],
    ["plugins/reading-time.ts", READING_TIME_PLUGIN],
    ["plugins/author-meta.ts", AUTHOR_META_PLUGIN],
    ["plugins/author-box.ts", AUTHOR_BOX_PLUGIN],
    ["plugins/share-buttons.ts", SHARE_BUTTONS_PLUGIN],
    ["plugins/site-chrome.ts", SITE_CHROME_PLUGIN],
    ["plugins/social-links.ts", SOCIAL_LINKS_PLUGIN],
    ["content/posts/2026-04-01-hello-bunpress.md", HOME_POST],
    ["content/pages/about.md", ABOUT_PAGE],
    ["scaffolds/post.md", POST_SCAFFOLD],
    ["scaffolds/page.md", PAGE_SCAFFOLD],
    ["scaffolds/draft.md", DRAFT_SCAFFOLD],
    ["themes/starter/theme.config.ts", THEME_CONFIG],
    ["themes/starter/layout/base.njk", BASE_LAYOUT],
    ["themes/starter/layout/index.njk", INDEX_LAYOUT],
    ["themes/starter/layout/post.njk", POST_LAYOUT],
    ["themes/starter/layout/page.njk", PAGE_LAYOUT],
    ["themes/starter/layout/taxonomy.njk", TAXONOMY_LAYOUT],
    ["themes/starter/layout/archive.njk", ARCHIVE_LAYOUT],
    ["themes/starter/layout/404.njk", NOT_FOUND_LAYOUT],
    ["themes/starter/partials/header.njk", HEADER_PARTIAL],
    ["themes/starter/partials/footer.njk", FOOTER_PARTIAL],
    ["themes/starter/partials/breadcrumbs.njk", BREADCRUMBS_PARTIAL],
    ["themes/starter/partials/sidebar.njk", SIDEBAR_PARTIAL],
    ["themes/starter/assets/css/site.css", SITE_CSS],
    ["themes/starter/assets/favicon.svg", DEFAULT_FAVICON],
    ["themes/starter/assets/images/og-default.svg", DEFAULT_OG_IMAGE],
  ]);
}

export async function scaffoldSite(targetDir: string): Promise<void> {
  const files = scaffoldFiles();

  for (const [relativePath, contents] of files.entries()) {
    const filePath = path.join(targetDir, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, "utf8");
  }
}

export async function scaffoldTheme(targetDir: string): Promise<void> {
  const files = new Map<string, string>(Object.entries(JSON.parse(THEME_STARTER_CONTENT) as Record<string, string>));

  for (const [relativePath, contents] of files.entries()) {
    const filePath = path.join(targetDir, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, "utf8");
  }
}

export async function scaffoldPlugin(targetDir: string, pluginName: string): Promise<void> {
  const pluginSource = `import type { Plugin } from "@bunpress/core";

const ${pluginName.replace(/[^a-zA-Z0-9]+/g, "_")}Plugin: Plugin = async (api) => {
  api.on("content:transformed", ({ content }) => {
    for (const post of content.posts) {
      post.metadata["${pluginName}Enabled"] = true;
    }
  });

  api.helper("${pluginName.replace(/[^a-zA-Z0-9]+/g, "_")}Label", (value) => String(value));

  api.slot("post_footer", ({ post }) => {
    if (!post) {
      return [];
    }

    return [
      {
        kind: "link",
        text: "Plugin Link",
        url: post.urlPath,
      },
    ];
  });
};

export default ${pluginName.replace(/[^a-zA-Z0-9]+/g, "_")}Plugin;
`;

  const readme = `# ${pluginName}

This BunPress plugin starter demonstrates:

- a \`content:transformed\` hook
- a custom helper
- a \`post_footer\` slot contribution

Stable slots you can target include:

- \`post_meta\`
- \`post_above_content\`
- \`post_below_content\`
- \`post_footer\`
- \`page_above_content\`
- \`page_below_content\`
- \`page_footer\`
- \`site_header\`
- \`sidebar_primary\`
- \`site_footer\`

Enable the plugin by adding it to \`site.config.ts\`:

\`\`\`ts
plugins: ["./plugins/${pluginName}/index.ts"]
\`\`\`
`;

  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, "index.ts"), pluginSource, "utf8");
  await writeFile(path.join(targetDir, "README.md"), readme, "utf8");
}
