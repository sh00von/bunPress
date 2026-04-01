# Plugin Examples

## Reading Time Plugin

Status: `Stable`

This is the canonical BunPress example because it uses both a lifecycle hook and a slot.

```ts
import type { Plugin } from "@bunpress/core";

const readingTimePlugin: Plugin = async (api) => {
  api.on("content:transformed", ({ content }) => {
    for (const post of content.posts) {
      const wordCount = post.raw.split(/\s+/).filter(Boolean).length;
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
        text: `${post.metadata.readingTime} min read`,
      },
    ];
  });
};

export default readingTimePlugin;
```

## Minimal Hook-Only Plugin

This plugin only mutates metadata and does not render UI:

```ts
import type { Plugin } from "@bunpress/core";

const badgePlugin: Plugin = async (api) => {
  api.on("content:transformed", ({ content }) => {
    for (const post of content.posts) {
      post.metadata.featured = true;
    }
  });
};

export default badgePlugin;
```

## Author Meta Plugin

```ts
import type { Plugin } from "@bunpress/core";

const authorMetaPlugin: Plugin = async (api) => {
  api.slot("post_meta", ({ post }) => {
    const author = typeof post?.frontMatter.author === "string" ? post.frontMatter.author : "";
    if (!author) {
      return [];
    }

    return [{ kind: "text", text: `By ${author}` }];
  });
};

export default authorMetaPlugin;
```

## Related Posts Plugin

```ts
import type { Plugin } from "@bunpress/core";

const relatedPostsPlugin: Plugin = async (api) => {
  api.slot("post_below_content", ({ post, content }) => {
    if (!post) return [];

    const related = content.posts
      .filter((candidate) => candidate.id !== post.id)
      .filter(
        (candidate) =>
          candidate.tags.some((tag) => post.tags.includes(tag)) ||
          candidate.categories.some((category) => post.categories.includes(category)),
      )
      .slice(0, 3);

    return related.map((candidate) => ({
      kind: "link",
      text: `Related: ${candidate.title}`,
      url: candidate.urlPath,
    }));
  });
};

export default relatedPostsPlugin;
```

## Author Box Plugin

```ts
import type { Plugin } from "@bunpress/core";

const authorBoxPlugin: Plugin = async (api) => {
  api.slot("post_below_content", ({ post, config }) => {
    if (!post) return [];

    const pluginConfig = config.pluginsConfig.authorBox ?? {};
    const author = typeof post.frontMatter.author === "string" ? post.frontMatter.author : "";
    if (!author) return [];

    return [
      {
        kind: "text",
        text: `${pluginConfig.heading ?? "Written by"} ${author}`,
      },
      {
        kind: "text",
        text: pluginConfig.siteLabel ?? `Published on ${config.title}`,
      },
    ];
  });
};

export default authorBoxPlugin;
```

## Share Buttons Plugin

```ts
import type { Plugin } from "@bunpress/core";

const shareButtonsPlugin: Plugin = async (api) => {
  api.slot("post_footer", ({ post, config }) => {
    if (!post) return [];

    const links = config.pluginsConfig.shareButtons?.links ?? [];
    const absolutePostUrl = new URL(post.urlPath.replace(/^\//, ""), config.url).toString();

    return links.map((link) => ({
      kind: "button",
      text: link.text,
      icon: link.icon,
      url: `${link.shareBase}${encodeURIComponent(absolutePostUrl)}`,
      target: "_blank",
      rel: "noopener noreferrer",
    }));
  });
};

export default shareButtonsPlugin;
```

Example site config:

```ts
pluginsConfig: {
  shareButtons: {
    links: [
      { text: "Share on X", icon: "X", shareBase: "https://twitter.com/intent/tweet?url=" },
      { text: "Share on LinkedIn", icon: "in", shareBase: "https://www.linkedin.com/sharing/share-offsite/?url=" },
    ],
  },
}
```

## Site Footer Links Plugin

```ts
import type { Plugin } from "@bunpress/core";

const socialLinksPlugin: Plugin = async (api) => {
  api.slot("site_footer", ({ config }) => {
    const pluginConfig = config.pluginsConfig.socialLinks ?? {};
    const configuredLinks = pluginConfig.links?.length ? pluginConfig.links : (config.socialLinks ?? []);

    return configuredLinks.map((link) => ({
      kind: "link",
      text: link.text,
      url: link.url,
      title: link.title,
      rel: link.rel,
      target: link.target,
    }));
  });
};

export default socialLinksPlugin;
```

## Site Header and Sidebar Plugin

```ts
import type { Plugin } from "@bunpress/core";

const siteChromePlugin: Plugin = async (api) => {
  api.slot("site_header", ({ config }) => {
    return config.pluginsConfig.siteChrome?.headerLinks ?? [];
  });

  api.slot("sidebar_primary", ({ config }) => {
    return config.pluginsConfig.siteChrome?.sidebarLinks ?? [];
  });
};

export default siteChromePlugin;
```

Example site config:

```ts
pluginsConfig: {
  siteChrome: {
    headerLinks: [{ text: "Start Here", url: "/about/", kind: "button" }],
    sidebarLinks: [
      { text: "Browse the site", icon: "•" },
      { text: "Announcements", url: "/categories/announcements/" },
    ],
  },
}
```

## Shared Theme Partial Pattern

Instead of editing every template manually, a BunPress theme should render shared slot partials.

Example from the starter theme:

```njk
{% set items = slots.post_meta[post.id] or [] %}
{% set className = "post-card__meta" %}
{% include "post-meta.njk" %}
```

That single pattern lets multiple plugins add post meta automatically.
