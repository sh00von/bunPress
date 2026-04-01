export default {
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
  permalinkStyle: "post-name",
  theme: "starter",
  paginationSize: 5,
  seo: {
    siteName: "My BunPress Blog",
    defaultDescription: "A Bun-first static publishing site with built-in metadata, schema, and crawlable output.",
    defaultOgImage: "/assets/images/og-default.svg",
    defaultOgImageAlt: "BunPress editorial site preview",
    favicon: "/assets/favicon.svg",
    themeColor: "#111111",
    robotsTxt: `User-agent: *
Allow: /
Disallow: /preview/
Sitemap: http://localhost:3000/sitemap.xml
`,
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
      { text: "Tag: bun", url: "/tags/bun/" },
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
        // {
        //   text: "Start Here",
        //   url: "/about/",
        //   kind: "button",
        // },
      ],
    },
    authorBox: {
      heading: "Written by",
      siteLabel: "Published on BunPress",
    },
  },
  plugins: [
    "./plugins/reading-time.ts",
    "./plugins/author-box.ts",
    "./plugins/related-posts.ts",
    "./plugins/share-buttons.ts",
    "./plugins/site-chrome.ts",
    "./plugins/social-links.ts",
  ],
  deploy: {
    github: {
      repo: "",
      branch: "gh-pages",
      cname: "",
    },
    vercel: {
      project: "",
      prod: true,
    },
  },
};
