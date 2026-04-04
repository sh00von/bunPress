export default {
  title: "Platform Briefing",
  // Set this to your real production URL before publishing.
  // Examples:
  // - Vercel production: "https://platform-briefing.vercel.app/"
  // - GitHub Pages project site: "https://owner.github.io/repo/"
  // - Custom domain: "https://briefing.example.com/"
  url: "https://platform-briefing.example.com/",
  description: "Clear updates on product direction, platform decisions, and engineering execution.",
  language: "en",
  // Available permalinkStyle values:
  // "day-and-name" -> "/:year/:month/:day/:slug/"
  // "month-and-name" -> "/:year/:month/:slug/"
  // "post-name" -> "/:slug/"
  // "plain" -> "/posts/:slug/"
  // "custom" -> use the explicit "permalink" field
  permalinkStyle: "post-name",
  theme: "magazine",
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
    // Keep robots.txt aligned with your production URL so sitemap and canonical data stay correct after deploy.
    robotsTxt: `User-agent: *
Allow: /
Disallow: /preview/
Sitemap: https://platform-briefing.example.com/sitemap.xml
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
    authorBox: {
      heading: "Written by",
      siteLabel: "Prepared for product and engineering teams",
    },
  },
  plugins: [
    "./plugins/reading-time.ts",
    "./plugins/author-box.ts",
    "./plugins/related-posts.ts",
    "./plugins/share-buttons.ts",
    "./plugins/social-links.ts",
  ],
  deploy: {
    github: {
      // Use "owner/repo" or a full git URL.
      repo: "",
      branch: "gh-pages",
      // Set this only when you are using a custom domain on GitHub Pages.
      cname: "",
    },
    vercel: {
      // Run "vercel link" in this site before your first publish.
      project: "",
      prod: true,
    },
  },
};
