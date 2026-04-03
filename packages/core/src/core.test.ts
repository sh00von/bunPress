import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { buildSite, createDevServer, createStaticServer, loadConfig, loadContent } from "./index.ts";
import { toRelativeHref } from "./utils.ts";

const tempDirs: string[] = [];

async function waitFor(assertion: () => Promise<void>, timeoutMs = 2500) {
  const started = Date.now();
  let lastError: unknown;

  while (Date.now() - started < timeoutMs) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  throw lastError;
}

async function createFixtureSite(): Promise<string> {
  const siteRoot = await mkdtemp(path.join(os.tmpdir(), "hexo-clone-core-"));
  tempDirs.push(siteRoot);

  const files = new Map<string, string>([
    [
      "site.config.ts",
      `export default {
  title: "Fixture Site",
  url: "http://localhost:3000/",
  description: "Fixture description",
  permalinkStyle: "post-name",
  seo: {
    siteName: "Fixture Site",
    defaultDescription: "Fixture default SEO description",
    defaultOgImage: "/assets/og-default.svg",
    defaultOgImageAlt: "Fixture OG image",
    favicon: "/assets/favicon.svg",
    themeColor: "#111111",
    robotsTxt: "User-agent: *\\nAllow: /\\nDisallow: /private/\\nSitemap: http://localhost:3000/sitemap.xml\\n",
    organization: {
      name: "Fixture Studio",
    },
    verification: {
      google: "google-token",
    },
  },
  theme: "starter",
  permalink: "/:year/:month/:day/:slug/",
  paginationSize: 1,
  redirects: {
    "/legacy-guides/": "/second-post/",
  },
  plugins: ["./plugins/tracker.ts", "./plugins/badge.ts"],
};
`,
    ],
    [
      "plugins/tracker.ts",
      `import { appendFile } from "node:fs/promises";
import path from "node:path";
export default async function tracker(api) {
  api.on("config:resolved", async ({ config }) => {
    await appendFile(path.join(config.rootDir, "hook-order.txt"), "config\\n");
  });
  api.on("content:loaded", async ({ config }) => {
    await appendFile(path.join(config.rootDir, "hook-order.txt"), "loaded\\n");
  });
  api.on("content:transformed", ({ content }) => {
    for (const post of content.posts) {
      post.metadata.readingTime = 3;
    }
  });
  api.slot("post_meta", ({ post }) => {
    if (!post) return [];
    return [{ kind: "text", text: post.metadata.readingTime + " min read" }];
  });
  api.on("routes:generated", async ({ config }) => {
    await appendFile(path.join(config.rootDir, "hook-order.txt"), "routes\\n");
  });
  api.on("build:done", async ({ config }) => {
    await appendFile(path.join(config.rootDir, "hook-order.txt"), "done\\n");
  });
}
`,
    ],
    [
      "plugins/badge.ts",
      `export default async function badge(api) {
  api.slot("post_meta", ({ post }) => {
    if (!post) return [];
    return [{ kind: "text", text: "featured" }];
  });
}
`,
    ],
    [
      "content/posts/2026-03-31-hello-world.md",
      `---
title: Hello World
date: 2026-03-29T10:00:00.000Z
description: First post description
aliases:
  - /legacy-hello/
tags: [intro, bun]
categories: [guides]
---

Hello **world** from the first post.

<!-- more -->

More body text.
`,
    ],
    [
      "content/posts/2026-03-30-second-post.md",
      `---
title: Another Post
date: 2026-03-30T10:00:00.000Z
description: Second post description
tags: [updates]
categories: [guides]
---

Second post body.
`,
    ],
    [
      "content/pages/about.md",
      `---
title: About
description: About fixture page
noindex: true
aliases:
  - /company/
---

About body.
`,
    ],
    [
      "themes/starter/layout/base.njk",
      `<!doctype html>
<html>
  <head>
    <title>{{ seo.title }}</title>
    <meta name="description" content="{{ seo.description }}" />
    <link rel="canonical" href="{{ seo.canonical }}" />
    <meta name="robots" content="{{ seo.robots }}" />
    {% if seo.themeColor %}<meta name="theme-color" content="{{ seo.themeColor }}" />{% endif %}
    {% for favicon in seo.favicons %}<link rel="{{ favicon.rel }}" href="{{ favicon.url }}" />{% endfor %}
    <meta property="og:type" content="{{ seo.openGraph.type }}" />
    {% if seo.openGraph.image %}<meta property="og:image" content="{{ seo.openGraph.image }}" />{% endif %}
    {% if seo.verification.google %}<meta name="google-site-verification" content="{{ seo.verification.google }}" />{% endif %}
    {% for schema in seo.jsonLd %}<script type="application/ld+json">{{ renderTrusted(json(schema)) }}</script>{% endfor %}
  </head>
  <body>
    {% block content %}{% endblock %}
  </body>
</html>`,
    ],
    [
      "themes/starter/layout/index.njk",
      `{% extends "base.njk" %}
{% block content %}
<h1>{{ site.title }}</h1>
{% for post in page.posts %}
<article>{{ post.title }}|{% for item in slots.post_meta[post.id] %}{{ item.text }}{% if not loop.last %}|{% endif %}{% endfor %}</article>
{% endfor %}
{% if page.pagination.nextUrl %}<a href="{{ page.pagination.nextUrl }}">Next</a>{% endif %}
{% endblock %}`,
    ],
    [
      "themes/starter/layout/post.njk",
      `{% extends "base.njk" %}
{% block content %}
<article><h1>{{ page.post.title }}</h1><p>{% for item in slots.post_meta[page.post.id] %}{{ item.text }}{% if not loop.last %}|{% endif %}{% endfor %}</p>{{ renderTrusted(page.post.html) }}{% if page.adjacent.previous %}<a href="{{ page.adjacent.previous.urlPath }}">Previous={{ page.adjacent.previous.title }}</a>{% endif %}{% if page.adjacent.next %}<a href="{{ page.adjacent.next.urlPath }}">Next={{ page.adjacent.next.title }}</a>{% endif %}</article>
{% endblock %}`,
    ],
    [
      "themes/starter/layout/page.njk",
      `{% extends "base.njk" %}
{% block content %}
<article>{{ page.page.title }}</article>
{% endblock %}`,
    ],
    [
      "themes/starter/layout/taxonomy.njk",
      `{% extends "base.njk" %}
{% block content %}
<h1>{{ page.entry.name }}</h1>
{% for post in page.entry.posts %}<span>{{ post.title }}</span>{% endfor %}
{% endblock %}`,
    ],
    [
      "themes/starter/layout/archive.njk",
      `{% extends "base.njk" %}
{% block content %}
<h1>Archives</h1>
{% for group in page.archives %}<section>{{ group.label }}</section>{% endfor %}
{% endblock %}`,
    ],
    [
      "themes/starter/layout/404.njk",
      `{% extends "base.njk" %}
{% block content %}<h1>Missing</h1>{% endblock %}`,
    ],
    ["themes/starter/partials/empty.njk", ""],
    ["themes/starter/assets/site.txt", "asset"],
    ["themes/starter/assets/favicon.svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"],
    ["themes/starter/assets/og-default.svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"],
  ]);

  for (const [relativePath, contents] of files.entries()) {
    const filePath = path.join(siteRoot, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, "utf8");
  }

  return siteRoot;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("core engine", () => {
  test("converts internal site paths to page-relative hrefs for file output", () => {
    expect(toRelativeHref("/assets/css/site.css", "/")).toBe("assets/css/site.css");
    expect(toRelativeHref("/assets/css/site.css", "/2026/04/01/hello-bunpress/")).toBe(
      "../../../../assets/css/site.css",
    );
    expect(toRelativeHref("/", "/2026/04/01/hello-bunpress/")).toBe("../../../../index.html");
    expect(toRelativeHref("https://example.com", "/2026/04/01/hello-bunpress/")).toBe(
      "https://example.com",
    );
  });

  test("loads config and normalized content graph", async () => {
    const siteRoot = await createFixtureSite();
    const config = await loadConfig(siteRoot);
    const content = await loadContent(config);

    expect(config.title).toBe("Fixture Site");
    expect(content.posts).toHaveLength(2);
    expect(content.pages).toHaveLength(1);
    expect(content.tags.map((tag) => tag.slug)).toEqual(["bun", "intro", "updates"]);
    expect(content.categories[0]?.name).toBe("guides");
    expect(content.posts[0]?.urlPath).toBe("/second-post/");
  });

  test("builds static output, taxonomy routes, assets, and plugin transforms", async () => {
    const siteRoot = await createFixtureSite();
    const result = await buildSite(siteRoot);

    expect(result.routes.some((route) => route.kind === "post")).toBe(true);
    expect(result.routes.some((route) => route.kind === "tag")).toBe(true);
    expect(result.routes.some((route) => route.kind === "archive")).toBe(true);

    const homeHtml = await readFile(path.join(siteRoot, "public/index.html"), "utf8");
    const postHtml = await readFile(
      path.join(siteRoot, "public/hello-world/index.html"),
      "utf8",
    );
    const aboutHtml = await readFile(path.join(siteRoot, "public/about/index.html"), "utf8");
    const paginatedHtml = await readFile(path.join(siteRoot, "public/page/2/index.html"), "utf8");
    const legacyRedirectHtml = await readFile(path.join(siteRoot, "public/legacy-hello/index.html"), "utf8");
    const configRedirectHtml = await readFile(path.join(siteRoot, "public/legacy-guides/index.html"), "utf8");
    const rssXml = await readFile(path.join(siteRoot, "public/feed.xml"), "utf8");
    const atomXml = await readFile(path.join(siteRoot, "public/atom.xml"), "utf8");
    const redirectsManifest = await readFile(path.join(siteRoot, "public/_redirects"), "utf8");
    const hookOrder = await readFile(path.join(siteRoot, "hook-order.txt"), "utf8");
    const copiedAsset = await readFile(path.join(siteRoot, "public/assets/site.txt"), "utf8");
    const sitemapXml = await readFile(path.join(siteRoot, "public/sitemap.xml"), "utf8");
    const robotsTxt = await readFile(path.join(siteRoot, "public/robots.txt"), "utf8");

    expect(homeHtml).toContain('href="/page/2/"');
    expect(postHtml).toContain("<strong>world</strong>");
    expect(copiedAsset).toBe("asset");
    expect(homeHtml).toContain("Another Post|Mar 30, 2026|guides|3 min read|featured");
    expect(postHtml).toContain("Mar 29, 2026|guides|3 min read|featured");
    expect(homeHtml).toContain("<title>Fixture Site</title>");
    expect(homeHtml).toContain('rel="canonical" href="http://localhost:3000/"');
    expect(homeHtml).toContain('rel="icon" href="http://localhost:3000/assets/favicon.svg"');
    expect(homeHtml).toContain('name="theme-color" content="#111111"');
    expect(homeHtml).toContain('"@type":"WebSite"');
    expect(postHtml).toContain('content="article"');
    expect(postHtml).toContain("http://localhost:3000/assets/og-default.svg");
    expect(postHtml).toContain('"@type":"BlogPosting"');
    expect(postHtml).toContain("Next=Another Post");
    expect(postHtml).toContain('google-site-verification');
    expect(aboutHtml).toContain('content="noindex, follow"');
    expect(paginatedHtml).toContain('content="noindex, follow"');
    expect(legacyRedirectHtml).toContain('content="0; url=../hello-world/index.html"');
    expect(configRedirectHtml).toContain('content="0; url=../second-post/index.html"');
    expect(rssXml).toContain("<rss version=\"2.0\">");
    expect(rssXml).toContain("<title>Another Post</title>");
    expect(atomXml).toContain("<feed xmlns=\"http://www.w3.org/2005/Atom\">");
    expect(atomXml).toContain("<title>Hello World</title>");
    expect(redirectsManifest).toContain("/legacy-hello/ /hello-world/ 301");
    expect(redirectsManifest).toContain("/legacy-guides/ /second-post/ 301");
    expect(sitemapXml).toContain("<loc>http://localhost:3000/</loc>");
    expect(sitemapXml).toContain("<loc>http://localhost:3000/hello-world/</loc>");
    expect(sitemapXml).not.toContain("<loc>http://localhost:3000/about/</loc>");
    expect(sitemapXml).not.toContain("<loc>http://localhost:3000/page/2/</loc>");
    expect(sitemapXml).not.toContain("<loc>http://localhost:3000/legacy-hello/</loc>");
    expect(robotsTxt).toContain("User-agent: *");
    expect(robotsTxt).toContain("Disallow: /private/");
    expect(robotsTxt).toContain("Sitemap: http://localhost:3000/sitemap.xml");
    expect(result.redirects).toHaveLength(3);
    expect(result.warnings).toHaveLength(0);
    expect(result.feeds.rssPath).toBe("/feed.xml");
    expect(result.feeds.atomPath).toBe("/atom.xml");
    expect(hookOrder.trim().split("\n")).toEqual(["config", "loaded", "routes", "done"]);
  });

  test("build removes stale generated routes before writing fresh output", async () => {
    const siteRoot = await createFixtureSite();

    await buildSite(siteRoot);
    await expect(
      readFile(
        path.join(siteRoot, "public/2026/03/29/hello-world/index.html"),
        "utf8",
      ),
    ).rejects.toThrow();

    expect(
      await readFile(
        path.join(siteRoot, "public/hello-world/index.html"),
        "utf8",
      ),
    ).toContain("Hello World");

    await writeFile(
      path.join(siteRoot, "content/posts/2026-03-31-hello-world.md"),
      `---
title: Hello World
slug: hello-bunpress
date: 2026-03-29T10:00:00.000Z
tags: [intro, bun]
categories: [guides]
---

Hello **world** from the renamed post.
`,
      "utf8",
    );

    await buildSite(siteRoot);

    await expect(
      readFile(
        path.join(siteRoot, "public/hello-world/index.html"),
        "utf8",
      ),
    ).rejects.toThrow();

    const renamedPostHtml = await readFile(
      path.join(siteRoot, "public/hello-bunpress/index.html"),
      "utf8",
    );

    expect(renamedPostHtml).toContain("Hello World");
    expect(await readFile(path.join(siteRoot, "public/assets/site.txt"), "utf8")).toBe("asset");
  });

  test("build escapes template values and sanitizes markdown output", async () => {
    const siteRoot = await createFixtureSite();

    await writeFile(
      path.join(siteRoot, "content/posts/2026-03-31-hello-world.md"),
      `---
title: "<img src=x onerror=alert(1)>"
date: 2026-03-29T10:00:00.000Z
tags: [intro]
categories: [guides]
---

<script>alert(1)</script>
[bad](javascript:alert(1))
![x](javascript:alert(1))

Regular **content**.
`,
      "utf8",
    );

    await buildSite(siteRoot);

    const postHtml = await readFile(
      path.join(siteRoot, "public/hello-world/index.html"),
      "utf8",
    );

    expect(postHtml).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(postHtml).not.toContain("<script>alert(1)</script>");
    expect(postHtml).not.toContain("javascript:alert(1)");
    expect(postHtml).not.toContain("<img src=\"javascript:alert(1)\"");
    expect(postHtml).toContain("<strong>content</strong>");
  });

  test("build fails fast on unsafe slot or front matter URLs", async () => {
    const siteRoot = await createFixtureSite();

    await writeFile(
      path.join(siteRoot, "plugins/badge.ts"),
      `export default async function badge(api) {
  api.slot("post_meta", ({ post }) => {
    if (!post) return [];
    return [{ kind: "link", text: "featured", url: "javascript:alert(1)" }];
  });
}
`,
      "utf8",
    );

    await expect(buildSite(siteRoot)).rejects.toThrow('slot post_meta[0] url');

    await writeFile(
      path.join(siteRoot, "plugins/badge.ts"),
      `export default async function badge(api) {
  api.slot("post_meta", ({ post }) => {
    if (!post) return [];
    return [{ kind: "text", text: "featured" }];
  });
}
`,
      "utf8",
    );
    await writeFile(
      path.join(siteRoot, "content/posts/2026-03-31-hello-world.md"),
      `---
title: Hello World
date: 2026-03-29T10:00:00.000Z
tags: [intro, bun]
categories: [guides]
image: "javascript:alert(1)"
---

Hello **world** from the first post.
`,
      "utf8",
    );

    await expect(buildSite(siteRoot)).rejects.toThrow("front matter image");
  });

  test("build reports content and SEO warnings without failing", async () => {
    const siteRoot = await createFixtureSite();

    await writeFile(
      path.join(siteRoot, "content/posts/2026-03-30-second-post.md"),
      `---
title: Hello World
slug: hello-world
date: 2026-03-30T10:00:00.000Z
aliases:
  - /about/
---

See the [missing page](/does-not-exist/).
`,
      "utf8",
    );

    const result = await buildSite(siteRoot);
    const warningCodes = result.warnings.map((warning) => warning.code);

    expect(warningCodes).toContain("duplicate-title");
    expect(warningCodes).toContain("duplicate-slug");
    expect(warningCodes).toContain("missing-description");
    expect(warningCodes).toContain("redirect-conflict");
    expect(warningCodes).toContain("broken-internal-link");
  });

  test("dev server rebuilds on file change and static server serves built output", async () => {
    const siteRoot = await createFixtureSite();
    const devServer = await createDevServer(siteRoot);

    try {
      let response = await devServer.fetch(new Request("http://localhost/"));
      let html = await response.text();
      expect(html).toContain("Another Post");

      await writeFile(
        path.join(siteRoot, "content/posts/2026-03-30-second-post.md"),
        `---
title: Renamed Post
date: 2026-03-30T10:00:00.000Z
tags: [updates]
categories: [guides]
---

Changed content.
`,
        "utf8",
      );

      await waitFor(async () => {
        response = await devServer.fetch(
          new Request("http://localhost/second-post/"),
        );
        html = await response.text();
        expect(html).toContain("Renamed Post");
      });
      await waitFor(async () => {
        response = await devServer.fetch(new Request("http://localhost/archives/"));
        html = await response.text();
        expect(html).toContain("Archives");
      });
      expect(html).toContain("EventSource");
    } finally {
      await devServer.close();
    }

    const staticServer = await createStaticServer(siteRoot);
    try {
      const response = await staticServer.fetch(new Request("http://localhost/archives/"));
      const html = await response.text();
      expect(html).toContain("Archives");
      expect(html).not.toContain("EventSource");
    } finally {
      await staticServer.close();
    }
  });
});
