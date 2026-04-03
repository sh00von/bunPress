import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE_PACKAGE_JSON = `{
  "name": "my-bunpress-site",
  "private": true,
  "type": "module",
  "packageManager": "bun@1.3.10",
  "devDependencies": {
      "bunpress-kit": "^1.0.5"
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
  title: "Platform Briefing",
  url: "http://localhost:3000/",
  description: "Clear updates on product direction, platform decisions, and engineering execution.",
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
  redirects: {
    "/start/": "/about/",
  },
  seo: {
    siteName: "Platform Briefing",
    defaultDescription: "A Bun-first publishing system for product, platform, and engineering communication.",
    defaultOgImage: "/assets/images/og-default.svg",
    defaultOgImageAlt: "BunPress product publishing preview",
    favicon: "/assets/favicon.svg",
    themeColor: "#111111",
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
    authorBox: {
      heading: "Written by",
      siteLabel: "Prepared for product and engineering teams",
    },
  },
  plugins: [
    "./plugins/reading-time.ts",
    "./plugins/author-meta.ts",
    "./plugins/author-box.ts",
    "./plugins/share-buttons.ts",
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

\`\`\`bash
npx create-bunpress@latest mysite
\`\`\`

Then:

\`\`\`bash
cd mysite
bun install
bunpress dev
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

const HOME_POST = `---
title: Building a publishing system for product and engineering teams
slug: hello-bunpress
date: 2026-04-01T10:00:00.000Z
description: Why BunPress is designed for teams that need clear product and engineering communication.
author: BunPress Team
aliases:
  - /hello-bunpress-launch/
tags:
  - platform
  - bunpress
categories:
  - announcements
---

BunPress is designed for teams that need a fast, controlled way to publish product updates, engineering notes, and platform decisions.

<!-- more -->

The starter site is intentionally minimal so teams can ship clear writing without rebuilding the publishing stack.

- Run \`bunpress dev\` for a local review loop.
- Create new entries with \`bunpress new post "Title"\`.
- Publish a static build to GitHub Pages or Vercel when the site is ready.
`;

const ABOUT_PAGE = `---
title: About
description: What BunPress is built for and how the starter site is intended to be used by product and engineering teams.
---

BunPress is a Bun-first static publishing engine for product, platform, and engineering communication. The default starter favors strong defaults, clean presentation, and fast deployment.
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
  accent: "#111111",
  surface: "#ffffff",
  text: "#111111",
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
    <meta name="robots" content="{{ seo.robots }}" />
    {% if seo.themeColor %}
      <meta name="theme-color" content="{{ seo.themeColor }}" />
    {% endif %}
    {% for favicon in seo.favicons %}
      <link rel="{{ favicon.rel }}" href="{{ favicon.url }}"{% if favicon.type %} type="{{ favicon.type }}"{% endif %}{% if favicon.sizes %} sizes="{{ favicon.sizes }}"{% endif %}{% if favicon.color %} color="{{ favicon.color }}"{% endif %} />
    {% endfor %}
    <meta property="og:title" content="{{ seo.openGraph.title }}" />
    <meta property="og:description" content="{{ seo.openGraph.description }}" />
    <meta property="og:type" content="{{ seo.openGraph.type }}" />
    <meta property="og:url" content="{{ seo.openGraph.url }}" />
    <meta property="og:site_name" content="{{ seo.openGraph.siteName }}" />
    {% if seo.openGraph.image %}
      <meta property="og:image" content="{{ seo.openGraph.image }}" />
    {% endif %}
    {% if seo.openGraph.imageAlt %}
      <meta property="og:image:alt" content="{{ seo.openGraph.imageAlt }}" />
    {% endif %}
    <meta name="twitter:card" content="{{ seo.twitter.card }}" />
    <meta name="twitter:title" content="{{ seo.twitter.title }}" />
    <meta name="twitter:description" content="{{ seo.twitter.description }}" />
    {% if seo.twitter.image %}
      <meta name="twitter:image" content="{{ seo.twitter.image }}" />
    {% endif %}
    <link rel="alternate" type="application/rss+xml" title="{{ site.title }} RSS" href="{{ href(feeds.rssPath, currentUrlPath) }}" />
    <link rel="alternate" type="application/atom+xml" title="{{ site.title }} Atom" href="{{ href(feeds.atomPath, currentUrlPath) }}" />
    {% if seo.verification.google %}
      <meta name="google-site-verification" content="{{ seo.verification.google }}" />
    {% endif %}
    {% if seo.verification.bing %}
      <meta name="msvalidate.01" content="{{ seo.verification.bing }}" />
    {% endif %}
    {% if seo.verification.yandex %}
      <meta name="yandex-verification" content="{{ seo.verification.yandex }}" />
    {% endif %}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="{{ href('/assets/css/site.css', currentUrlPath) }}" />
    {% for schema in seo.jsonLd %}
      <script type="application/ld+json">{{ renderTrusted(json(schema)) }}</script>
    {% endfor %}
  </head>
  <body class="theme-body">
    {% include "header.njk" %}
    <main class="site-shell site-shell--page">
      <div class="site-layout{% if seo.pageType != "404" %} site-layout--with-sidebar{% endif %}">
        <div class="site-layout__content">
          {% include "breadcrumbs.njk" %}
          {% block content %}{% endblock %}
        </div>
        {% if seo.pageType != "404" %}
          <aside class="site-layout__sidebar" aria-label="Sidebar">
            {% include "sidebar.njk" %}
          </aside>
        {% endif %}
      </div>
    </main>
    {% include "footer.njk" %}
  </body>
</html>
`;

const HEADER_PARTIAL = `<header class="site-header">
  <div class="site-shell site-header__inner">
    <a class="site-brand" href="{{ href('/', currentUrlPath) }}">{{ site.title }}</a>
    <nav class="site-nav" aria-label="Primary">
      {% if site.menus and site.menus.primary and site.menus.primary.length %}
        {% for item in site.menus.primary %}
          <a class="site-nav__link" href="{{ href(item.url, currentUrlPath) }}">{{ item.text }}</a>
        {% endfor %}
      {% else %}
        <a class="site-nav__link" href="{{ href('/', currentUrlPath) }}">Home</a>
        <a class="site-nav__link" href="{{ href('/archives/', currentUrlPath) }}">Archives</a>
        <a class="site-nav__link" href="{{ href('/about/', currentUrlPath) }}">About</a>
      {% endif %}
    </nav>
  </div>
</header>
`;

const FOOTER_PARTIAL = `<footer class="site-footer">
  <div class="site-shell site-footer__inner">
    <div>
      <a class="site-footer__title" href="{{ href('/', currentUrlPath) }}">{{ site.title }}</a>
      <p class="site-footer__copy">&copy; 2026 <a href="https://shovon.bd/" target="_blank" rel="noopener noreferrer">Shovon</a>. {{ site.title }}. Strategy, product, and engineering communication.</p>
    </div>
    <nav class="site-footer__nav" aria-label="Footer">
      {% if site.menus and site.menus.footer and site.menus.footer.length %}
        {% for item in site.menus.footer %}
          <a href="{{ href(item.url, currentUrlPath) }}">{{ item.text }}</a>
        {% endfor %}
      {% else %}
        <a href="{{ href('/about/', currentUrlPath) }}">About</a>
        <a href="{{ href('/archives/', currentUrlPath) }}">Archives</a>
        <a href="{{ href('/tags/intro/', currentUrlPath) }}">Tags</a>
      {% endif %}
    </nav>
  </div>
  {% if slots.site_footer.length %}
    <div class="site-shell site-footer__extras">
      {% set items = slots.site_footer %}
      {% set className = "slot-items slot-items--inline site-footer__slot-links" %}
      {% include "slot-items.njk" %}
    </div>
  {% endif %}
</footer>
`;

const BREADCRUMBS_PARTIAL = `{% if seo.breadcrumbs.length > 1 %}
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol class="breadcrumbs__list">
      {% for item in seo.breadcrumbsRelative or seo.breadcrumbs %}
        <li class="breadcrumbs__item">
          {% if not loop.last %}
            <a href="{{ item.href or href(item.url, currentUrlPath) }}">{{ item.name }}</a>
          {% else %}
            <span aria-current="page">{{ item.name }}</span>
          {% endif %}
        </li>
      {% endfor %}
    </ol>
  </nav>
{% endif %}
`;

const SIDEBAR_PARTIAL = `<div class="sidebar-panel">
  <p class="sidebar-panel__eyebrow">Navigate</p>
  <h2 class="sidebar-panel__title">Platform overview</h2>
  <p class="sidebar-panel__text">{{ site.description }}</p>
</div>

{% if collections.categories.length %}
  <section class="sidebar-section" aria-labelledby="sidebar-categories">
    <h2 id="sidebar-categories" class="sidebar-section__title">Categories</h2>
    <ul class="sidebar-list">
      {% for category in collections.categories %}
        <li><a href="{{ href(category.urlPath, currentUrlPath) }}">{{ category.name }}</a></li>
      {% endfor %}
    </ul>
  </section>
{% endif %}

{% if collections.tags.length %}
  <section class="sidebar-section" aria-labelledby="sidebar-tags">
    <h2 id="sidebar-tags" class="sidebar-section__title">Tags</h2>
    <ul class="sidebar-list sidebar-list--tags">
      {% for tag in collections.tags %}
        <li><a href="{{ href(tag.urlPath, currentUrlPath) }}">{{ tag.name }}</a></li>
      {% endfor %}
    </ul>
  </section>
{% endif %}

{% if collections.posts.length %}
  <section class="sidebar-section" aria-labelledby="sidebar-recent">
    <h2 id="sidebar-recent" class="sidebar-section__title">Latest updates</h2>
    <ul class="sidebar-list">
      {% for post in collections.posts %}
        {% if loop.index <= 5 %}
          <li><a href="{{ href(post.urlPath, currentUrlPath) }}">{{ post.title }}</a></li>
        {% endif %}
      {% endfor %}
    </ul>
  </section>
{% endif %}
`;

const SLOT_ITEMS_PARTIAL = `{% set slotItems = items or [] %}
{% if slotItems.length %}
  <div class="{{ className or 'slot-items' }}">
    {% for item in slotItems %}
      {% if item.kind == "button" %}
        <a
          class="{{ item.className or itemClassName or 'slot-items__button' }}"
          href="{{ href(item.url or '#', currentUrlPath) }}"
          {% if item.title %}title="{{ item.title }}"{% endif %}
          {% if item.rel %}rel="{{ item.rel }}"{% endif %}
          {% if item.target %}target="{{ item.target }}"{% endif %}
        >{% if item.icon %}<span class="slot-items__icon">{{ item.icon }}</span>{% endif %}{{ item.text }}</a>
      {% elif item.kind == "link" or item.url %}
        <a
          class="{{ item.className or itemClassName or 'slot-items__link' }}"
          href="{{ href(item.url or '#', currentUrlPath) }}"
          {% if item.title %}title="{{ item.title }}"{% endif %}
          {% if item.rel %}rel="{{ item.rel }}"{% endif %}
          {% if item.target %}target="{{ item.target }}"{% endif %}
        >{% if item.icon %}<span class="slot-items__icon">{{ item.icon }}</span>{% endif %}{{ item.text }}</a>
      {% else %}
        <span class="{{ item.className or itemClassName or 'slot-items__text' }}">{% if item.icon %}<span class="slot-items__icon">{{ item.icon }}</span>{% endif %}{{ item.text }}</span>
      {% endif %}
    {% endfor %}
  </div>
{% endif %}
`;

const POST_META_PARTIAL = `{% set metaItems = items or [] %}
{% if metaItems.length %}
  <p class="{{ className or 'post-card__meta' }}">
    {% for item in metaItems %}
      {% if not loop.first %}
        <span>&bull;</span>
      {% endif %}
      {% if item.kind == "button" %}
        <a
          class="{{ item.className or itemClassName or 'entry__tag' }}"
          href="{{ href(item.url or '#', currentUrlPath) }}"
          {% if item.title %}title="{{ item.title }}"{% endif %}
          {% if item.rel %}rel="{{ item.rel }}"{% endif %}
          {% if item.target %}target="{{ item.target }}"{% endif %}
        >{% if item.icon %}<span class="slot-items__icon">{{ item.icon }}</span>{% endif %}{{ item.text }}</a>
      {% elif item.kind == "link" or item.url %}
        <a
          class="{{ item.className or itemClassName or '' }}"
          href="{{ href(item.url or '#', currentUrlPath) }}"
          {% if item.title %}title="{{ item.title }}"{% endif %}
          {% if item.rel %}rel="{{ item.rel }}"{% endif %}
          {% if item.target %}target="{{ item.target }}"{% endif %}
        >{% if item.icon %}<span class="slot-items__icon">{{ item.icon }}</span>{% endif %}{{ item.text }}</a>
      {% else %}
        <span class="{{ item.className or itemClassName or '' }}">{% if item.icon %}<span class="slot-items__icon">{{ item.icon }}</span>{% endif %}{{ item.text }}</span>
      {% endif %}
    {% endfor %}
  </p>
{% endif %}
`;

const INDEX_LAYOUT = `{% extends "base.njk" %}
{% block content %}
  <section class="page-intro">
    <p class="page-intro__eyebrow">Technical leadership</p>
    <h1 class="page-intro__title">{{ site.title }}</h1>
    <p class="page-intro__text">{{ site.description }}</p>
  </section>

  <section class="post-feed" aria-label="Posts">
    {% for post in page.posts %}
      <article class="post-card">
        <a class="post-card__media" href="{{ href(post.urlPath, currentUrlPath) }}" aria-label="{{ post.title }}">
          {% if post.frontMatter.image %}
            <img src="{{ post.frontMatter.image }}" alt="{{ post.frontMatter.imageAlt or post.title }}" />
          {% else %}
            <span class="placeholder-media placeholder-media--{{ loop.index }}"></span>
          {% endif %}
        </a>
        <div class="post-card__content">
          {% set items = slots.post_meta[post.id] or [] %}
          {% set className = "post-card__meta" %}
          {% include "post-meta.njk" %}
          <h2 class="post-card__title"><a href="{{ href(post.urlPath, currentUrlPath) }}">{{ post.title }}</a></h2>
          <p class="post-card__excerpt">{{ post.excerpt }}</p>
          <a class="post-card__link" href="{{ href(post.urlPath, currentUrlPath) }}">Read briefing</a>
        </div>
      </article>
    {% endfor %}
  </section>

  {% if page.pagination.totalPages > 1 %}
    <nav class="pagination pagination--minimal" aria-label="Pagination">
      <a class="pagination__link{% if not page.pagination.prevUrl %} is-disabled{% endif %}" href="{{ href(page.pagination.prevUrl or '#', currentUrlPath) }}">Previous</a>
      <span class="pagination__status">Page {{ page.pagination.currentPage }} of {{ page.pagination.totalPages }}</span>
      <a class="pagination__link{% if not page.pagination.nextUrl %} is-disabled{% endif %}" href="{{ href(page.pagination.nextUrl or '#', currentUrlPath) }}">Next</a>
    </nav>
  {% endif %}
{% endblock %}
`;

const POST_LAYOUT = `{% extends "base.njk" %}
{% block content %}
  <article class="entry entry--post">
    <header class="entry__header">
      {% set items = slots.post_meta[page.post.id] or [] %}
      {% set className = "entry__meta" %}
      {% include "post-meta.njk" %}
      <h1 class="entry__title">{{ page.post.title }}</h1>
    </header>

    <div class="entry__media">
      {% if page.post.frontMatter.image %}
        <img src="{{ page.post.frontMatter.image }}" alt="{{ page.post.frontMatter.imageAlt or page.post.title }}" />
      {% else %}
        <div class="placeholder-media placeholder-media--feature"></div>
      {% endif %}
    </div>

    {% if (slots.post_above_content[page.post.id] or []).length %}
      {% set items = slots.post_above_content[page.post.id] or [] %}
      {% set className = "slot-items slot-items--inline" %}
      {% include "slot-items.njk" %}
    {% endif %}

    {% if page.post.tags.length %}
      <div class="entry__tags">
        {% for tag in page.post.tags %}
          <a class="entry__tag" href="{{ href('/tags/' + (tag | lower | replace(' ', '-')) + '/', currentUrlPath) }}">{{ tag }}</a>
        {% endfor %}
      </div>
    {% endif %}

    <div class="entry__body">{{ renderTrusted(page.post.html) }}</div>

    {% if (slots.post_below_content[page.post.id] or []).length %}
      {% set items = slots.post_below_content[page.post.id] or [] %}
      {% set className = "slot-items slot-items--stack" %}
      {% include "slot-items.njk" %}
    {% endif %}

    {% if (slots.post_footer[page.post.id] or []).length %}
      {% set items = slots.post_footer[page.post.id] or [] %}
      {% set className = "slot-items slot-items--inline entry__footer-links" %}
      {% include "slot-items.njk" %}
    {% endif %}

    {% if page.adjacent and (page.adjacent.previous or page.adjacent.next) %}
      <nav class="entry__adjacent" aria-label="Adjacent posts">
        <div class="entry__adjacent-card entry__adjacent-card--previous">
          {% if page.adjacent.previous %}
            <p class="entry__adjacent-label">Previous post</p>
            <a class="entry__adjacent-link" href="{{ href(page.adjacent.previous.urlPath, currentUrlPath) }}">{{ page.adjacent.previous.title }}</a>
          {% endif %}
        </div>
        <div class="entry__adjacent-card entry__adjacent-card--next">
          {% if page.adjacent.next %}
            <p class="entry__adjacent-label">Next post</p>
            <a class="entry__adjacent-link" href="{{ href(page.adjacent.next.urlPath, currentUrlPath) }}">{{ page.adjacent.next.title }}</a>
          {% endif %}
        </div>
      </nav>
    {% endif %}
  </article>
{% endblock %}
`;

const PAGE_LAYOUT = `{% extends "base.njk" %}
{% block content %}
  <article class="entry entry--page">
    <header class="entry__header">
      <p class="entry__meta">Overview</p>
      <h1 class="entry__title">{{ page.page.title }}</h1>
    </header>

    {% if (slots.page_above_content[page.page.id] or []).length %}
      {% set items = slots.page_above_content[page.page.id] or [] %}
      {% set className = "slot-items slot-items--inline" %}
      {% include "slot-items.njk" %}
    {% endif %}

    <div class="entry__body">{{ renderTrusted(page.page.html) }}</div>

    {% if (slots.page_below_content[page.page.id] or []).length %}
      {% set items = slots.page_below_content[page.page.id] or [] %}
      {% set className = "slot-items slot-items--stack" %}
      {% include "slot-items.njk" %}
    {% endif %}

    {% if (slots.page_footer[page.page.id] or []).length %}
      {% set items = slots.page_footer[page.page.id] or [] %}
      {% set className = "slot-items slot-items--inline entry__footer-links" %}
      {% include "slot-items.njk" %}
    {% endif %}
  </article>
{% endblock %}
`;

const TAXONOMY_LAYOUT = `{% extends "base.njk" %}
{% block content %}
  <section class="page-intro page-intro--compact">
    <p class="page-intro__eyebrow">{{ page.taxonomyType | upper }}</p>
    <h1 class="page-intro__title">{{ page.entry.name }}</h1>
  </section>
  <section class="post-feed post-feed--compact" aria-label="{{ page.entry.name }}">
    {% for post in page.entry.posts %}
      <article class="post-card post-card--compact">
        <a class="post-card__media" href="{{ href(post.urlPath, currentUrlPath) }}" aria-label="{{ post.title }}">
          {% if post.frontMatter.image %}
            <img src="{{ post.frontMatter.image }}" alt="{{ post.frontMatter.imageAlt or post.title }}" />
          {% else %}
            <span class="placeholder-media placeholder-media--{{ loop.index }}"></span>
          {% endif %}
        </a>
        <div class="post-card__content">
          {% set items = slots.post_meta[post.id] or [] %}
          {% set className = "post-card__meta" %}
          {% include "post-meta.njk" %}
          <h2 class="post-card__title"><a href="{{ href(post.urlPath, currentUrlPath) }}">{{ post.title }}</a></h2>
          <p class="post-card__excerpt">{{ post.excerpt }}</p>
          <a class="post-card__link" href="{{ href(post.urlPath, currentUrlPath) }}">Read briefing</a>
        </div>
      </article>
    {% endfor %}
  </section>
{% endblock %}
`;

const ARCHIVE_LAYOUT = `{% extends "base.njk" %}
{% block content %}
  <section class="page-intro page-intro--compact">
    <p class="page-intro__eyebrow">Archive</p>
    <h1 class="page-intro__title">{{ page.title }}</h1>
  </section>

  <div class="archive-stack">
    {% for group in page.archives %}
      <section class="archive-group">
        <h2 class="archive-group__title">{{ group.label }}</h2>
        <div class="post-feed post-feed--compact">
          {% for post in group.posts %}
            <article class="post-card post-card--compact">
              <a class="post-card__media" href="{{ href(post.urlPath, currentUrlPath) }}" aria-label="{{ post.title }}">
                {% if post.frontMatter.image %}
                  <img src="{{ post.frontMatter.image }}" alt="{{ post.frontMatter.imageAlt or post.title }}" />
                {% else %}
                  <span class="placeholder-media placeholder-media--{{ loop.index }}"></span>
                {% endif %}
              </a>
              <div class="post-card__content">
                {% set items = slots.post_meta[post.id] or [] %}
                {% set className = "post-card__meta" %}
                {% include "post-meta.njk" %}
                <h3 class="post-card__title"><a href="{{ href(post.urlPath, currentUrlPath) }}">{{ post.title }}</a></h3>
                <p class="post-card__excerpt">{{ post.excerpt }}</p>
              </div>
            </article>
          {% endfor %}
        </div>
      </section>
    {% endfor %}
  </div>
{% endblock %}
`;

const NOT_FOUND_LAYOUT = `{% extends "base.njk" %}
{% block content %}
  <section class="empty-state">
    <p class="empty-state__eyebrow">404</p>
    <h1 class="empty-state__title">Resource unavailable</h1>
    <p class="empty-state__text">The requested page is not available at this address or is no longer published.</p>
    <a class="empty-state__link" href="{{ href('/', currentUrlPath) }}">Return to home</a>
  </section>
{% endblock %}
`;

const SITE_CSS = `:root {
  --bg: #ffffff;
  --surface: #fafafa;
  --text: #111111;
  --muted: #666666;
  --border: #e6e6e6;
  --border-strong: #d4d4d4;
  --max-width: 1120px;
  --content-width: 760px;
  --ui-font: "Work Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
}

body.theme-body {
  font-family: "Work Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.7;
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  display: block;
  max-width: 100%;
}

.site-shell {
  width: min(var(--max-width), calc(100vw - 48px));
  margin: 0 auto;
}

.site-shell--page {
  min-height: 70vh;
}

.breadcrumbs {
  padding-top: 24px;
}

.breadcrumbs__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.82rem;
  color: var(--muted);
}

.breadcrumbs__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.breadcrumbs__item:not(:last-child)::after {
  content: "/";
  opacity: 0.5;
}

.site-header {
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.site-header__inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 24px 0 18px;
}

.site-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 40px;
}

.site-brand {
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.site-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  font-family: var(--ui-font);
  font-size: 0.95rem;
  color: var(--muted);
}

.site-nav__link:hover,
.site-footer__nav a:hover,
.post-card__title a:hover,
.post-card__link:hover,
.entry__tag:hover,
.empty-state__link:hover {
  color: var(--text);
}

.page-intro {
  max-width: 760px;
  padding: 48px 0 28px;
}

.page-intro--compact {
  padding-bottom: 16px;
}

.page-intro__eyebrow,
.empty-state__eyebrow,
.entry__meta,
.post-card__meta,
.site-footer__copy {
  margin: 0;
  font-family: var(--ui-font);
  color: var(--muted);
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.page-intro__title,
.entry__title,
.empty-state__title {
  margin: 12px 0 14px;
  font-size: clamp(2.4rem, 5vw, 4.4rem);
  line-height: 1.05;
  font-weight: 400;
  letter-spacing: -0.04em;
}

.page-intro__text,
.empty-state__text,
.post-card__excerpt,
.entry__body {
  font-size: 1.06rem;
  color: #262626;
}

.post-feed,
.post-feed--compact {
  display: flex;
  flex-direction: column;
  gap: 48px;
  padding-bottom: 52px;
}

.post-card {
  display: grid;
  grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
  padding-bottom: 36px;
  border-bottom: 1px solid var(--border);
}

.post-card--compact {
  gap: 24px;
}

.post-card__media {
  display: block;
  background: #0f0f0f;
}

.post-card__media img,
.placeholder-media {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.placeholder-media {
  display: block;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0)),
    linear-gradient(145deg, #3b3b3b, #121212 60%, #050505);
  position: relative;
  overflow: hidden;
  filter: grayscale(1);
}

.placeholder-media::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 28% 30%, rgba(255, 255, 255, 0.12), transparent 0 20%),
    linear-gradient(135deg, transparent 0 36%, rgba(255, 255, 255, 0.08) 37%, transparent 38%),
    linear-gradient(0deg, rgba(255, 255, 255, 0.05), transparent 42%);
}

.placeholder-media--2::before {
  background:
    radial-gradient(circle at 50% 72%, rgba(255, 255, 255, 0.35), transparent 0 18%),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 2px, transparent 2px 30px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 45%);
}

.placeholder-media--3::before {
  background:
    radial-gradient(circle at 26% 24%, rgba(255, 255, 255, 0.12), transparent 0 8%),
    radial-gradient(circle at 52% 44%, rgba(255, 255, 255, 0.14), transparent 0 6%),
    radial-gradient(circle at 75% 68%, rgba(255, 255, 255, 0.12), transparent 0 8%),
    linear-gradient(140deg, transparent 0 35%, rgba(255, 255, 255, 0.08) 36%, transparent 37%);
}

.placeholder-media--feature {
  aspect-ratio: 16 / 9;
}

.placeholder-media--feature::before {
  background:
    radial-gradient(circle at 48% 44%, rgba(255, 255, 255, 0.22), transparent 0 14%),
    linear-gradient(160deg, transparent 0 46%, rgba(255, 255, 255, 0.08) 47%, transparent 48%),
    linear-gradient(0deg, rgba(255, 255, 255, 0.05), transparent 52%);
}

.post-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.post-card__title {
  margin: 10px 0 12px;
  font-size: clamp(2rem, 3.4vw, 3rem);
  line-height: 1.08;
  font-weight: 400;
  letter-spacing: -0.04em;
}

.post-card__excerpt {
  margin: 0 0 14px;
}

.post-card__link,
.empty-state__link {
  display: inline-block;
  font-family: var(--ui-font);
  font-size: 0.95rem;
  border-bottom: 1px solid var(--border-strong);
  padding-bottom: 4px;
}

.pagination--minimal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 18px 0 72px;
  font-family: var(--ui-font);
  font-size: 0.9rem;
  color: var(--muted);
}

.pagination__link.is-disabled {
  opacity: 0.35;
  pointer-events: none;
}

.pagination__status {
  text-align: center;
}

.entry {
  max-width: var(--content-width);
  margin: 0;
  padding: 56px 0 72px;
}

.entry--post {
  margin: 0 auto;
}

.entry--page {
  margin: 0 auto;
  padding: 40px 0 56px;
}

.entry--page .entry__header {
  margin-bottom: 20px;
}

.entry__header {
  margin-bottom: 28px;
}

.entry__media {
  margin-bottom: 28px;
  background: #0f0f0f;
}

.entry__media img,
.entry__media .placeholder-media {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.entry__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 0 24px;
}

.entry__tag {
  font-family: var(--ui-font);
  font-size: 0.85rem;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  padding-bottom: 2px;
}

.entry__body p,
.entry__body ul,
.entry__body ol,
.entry__body blockquote {
  margin: 0 0 1.15em;
}

.entry__body h2,
.entry__body h3,
.entry__body h4 {
  margin: 2em 0 0.6em;
  line-height: 1.2;
  font-weight: 400;
}

.entry__body a {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.slot-items {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 20px 0;
  font-family: var(--ui-font);
  font-size: 0.92rem;
  color: var(--muted);
}

.slot-items--stack {
  flex-direction: column;
  align-items: flex-start;
  padding: 18px 0 0;
  border-top: 1px solid var(--border);
}

.slot-items__link {
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.slot-items__text {
  color: var(--muted);
}

.slot-items__button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  color: var(--text);
  text-decoration: none;
}

.slot-items__button--share {
  background: var(--surface);
}

.slot-items__icon {
  opacity: 0.7;
}

.slot-items__text--author-box {
  color: var(--text);
  font-weight: 500;
}

.slot-items__text--author-box-note {
  font-size: 0.86rem;
}

.entry__footer-links {
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.entry__adjacent {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 28px;
  padding-top: 22px;
  border-top: 1px solid var(--border);
}

.entry__adjacent-card {
  min-height: 84px;
}

.entry__adjacent-card--next {
  text-align: right;
}

.entry__adjacent-label {
  margin: 0 0 8px;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.entry__adjacent-link {
  font-size: 1rem;
  line-height: 1.4;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.archive-stack {
  display: flex;
  flex-direction: column;
  gap: 36px;
  padding-bottom: 56px;
}

.archive-group__title {
  margin: 0 0 24px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  font-size: 1.15rem;
  font-family: var(--ui-font);
  font-weight: 600;
  color: var(--muted);
}

.empty-state {
  max-width: 560px;
  margin: 0 auto;
  padding: 110px 0 140px;
  text-align: center;
}

.site-footer {
  border-top: 1px solid var(--border);
}

.site-footer__inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  padding: 24px 0 40px;
}

.site-footer__title {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 1.25rem;
}

.site-footer__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  font-family: var(--ui-font);
  font-size: 0.9rem;
  color: var(--muted);
}

.site-footer__extras {
  padding-bottom: 32px;
}

.site-footer__slot-links {
  margin-top: -6px;
}

.site-layout__sidebar {
  border-top: 1px solid var(--border);
  padding: 28px 0 0;
}

.site-sidebar__items {
  margin: 0;
}

.sidebar-panel {
  padding: 0 0 24px;
  border-bottom: 1px solid var(--border);
}

.sidebar-panel__eyebrow,
.sidebar-section__title {
  margin: 0 0 10px;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.sidebar-panel__title {
  margin: 0 0 10px;
  font-size: 1.35rem;
  line-height: 1.25;
  font-weight: 500;
}

.sidebar-panel__text {
  margin: 0;
  color: #262626;
  font-size: 0.95rem;
}

.sidebar-section {
  padding-top: 24px;
}

.sidebar-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-list a {
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.sidebar-list--tags {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 820px) {
  .site-shell {
    width: min(var(--max-width), calc(100vw - 28px));
  }

  .site-header__inner,
  .site-footer__inner,
  .post-card,
  .post-card--compact,
  .pagination--minimal {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .page-intro {
    padding-top: 36px;
  }

  .post-card {
    gap: 20px;
  }

  .entry__adjacent {
    grid-template-columns: minmax(0, 1fr);
  }

  .post-card__media,
  .entry__media {
    width: 100%;
  }
}

@media (min-width: 1024px) {
  .site-layout--with-sidebar {
    grid-template-columns: minmax(0, 1fr) 280px;
    align-items: start;
  }

  .site-layout--with-sidebar .site-layout__sidebar {
    border-top: 0;
    border-left: 1px solid var(--border);
    padding: 60px 0 0 24px;
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
      <a href="{{ href('/', currentUrlPath) }}">{{ site.title }}</a>
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
              {% if not loop.last %}<a href="{{ href(item.url, currentUrlPath) }}">{{ item.name }}</a>{% else %}<span>{{ item.name }}</span>{% endif %}
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
      <h2><a href="{{ href(post.urlPath, currentUrlPath) }}">{{ post.title }}</a></h2>
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
  "partials/post-meta.njk": "{% set metaItems = items or [] %}\\n{% if metaItems.length %}<p class=\\"{{ className or 'meta' }}\\">{% for item in metaItems %}{% if not loop.first %} &bull; {% endif %}{% if item.kind == 'link' or item.url %}<a href=\\"{{ href(item.url or '#', currentUrlPath) }}\\">{{ item.text }}</a>{% else %}<span>{{ item.text }}</span>{% endif %}{% endfor %}</p>{% endif %}\\n",
  "partials/slot-items.njk": "{% set slotItems = items or [] %}\\n{% if slotItems.length %}<div class=\\"{{ className or 'slot-items' }}\\">{% for item in slotItems %}{% if item.kind == 'button' %}<a href=\\"{{ href(item.url or '#', currentUrlPath) }}\\" class=\\"{{ item.className or 'slot-items__button' }}\\"{% if item.title %} title=\\"{{ item.title }}\\"{% endif %}{% if item.rel %} rel=\\"{{ item.rel }}\\"{% endif %}{% if item.target %} target=\\"{{ item.target }}\\"{% endif %}>{% if item.icon %}<span class=\\"slot-items__icon\\">{{ item.icon }}</span>{% endif %}{{ item.text }}</a>{% elif item.kind == 'link' or item.url %}<a href=\\"{{ href(item.url or '#', currentUrlPath) }}\\" class=\\"{{ item.className or 'slot-items__link' }}\\"{% if item.title %} title=\\"{{ item.title }}\\"{% endif %}{% if item.rel %} rel=\\"{{ item.rel }}\\"{% endif %}{% if item.target %} target=\\"{{ item.target }}\\"{% endif %}>{% if item.icon %}<span class=\\"slot-items__icon\\">{{ item.icon }}</span>{% endif %}{{ item.text }}</a>{% else %}<span class=\\"{{ item.className or 'slot-items__text' }}\\">{% if item.icon %}<span class=\\"slot-items__icon\\">{{ item.icon }}</span>{% endif %}{{ item.text }}</span>{% endif %}{% endfor %}</div>{% endif %}\\n",
  "partials/sidebar.njk": "<section><p>Theme-owned sidebar</p><ul>{% for category in collections.categories %}<li><a href=\\"{{ href(category.urlPath, currentUrlPath) }}\\">{{ category.name }}</a></li>{% endfor %}</ul></section>\\n",
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
    ["themes/starter/partials/post-meta.njk", POST_META_PARTIAL],
    ["themes/starter/partials/slot-items.njk", SLOT_ITEMS_PARTIAL],
    ["themes/starter/assets/css/site.css", SITE_CSS],
    ["themes/starter/assets/favicon.svg", DEFAULT_FAVICON],
    ["themes/starter/assets/images/og-default.svg", DEFAULT_OG_IMAGE],
  ]);
}

export async function ensureEmptyOrMissing(targetDir: string): Promise<void> {
  try {
    const entries = await readdir(targetDir);
    if (entries.length > 0) {
      throw new Error(`Refusing to init into non-empty directory: ${targetDir}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
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
