import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'BunPress Docs',
  tagline: 'Bun-first publishing for docs, blogs, and product communication',
  favicon: 'img/favicon.svg',
  future: {
    v4: true,
  },
  url: 'https://bunpress.dev',
  baseUrl: '/',
  organizationName: 'sh00von',
  projectName: 'bunPress',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/sh00von/bunPress/tree/main/my-docs-website/',
          showLastUpdateAuthor: false,
          showLastUpdateTime: true,
        },
        blog: false,
        pages: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.7,
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    image: 'img/og-card.svg',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'BunPress',
      logo: {
        alt: 'BunPress',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/sh00von/bunPress',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://www.npmjs.com/package/create-bunpress',
          label: 'npm',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Getting Started', to: '/getting-started'},
            {label: 'Feature Overview', to: '/features'},
            {label: 'Core API', to: '/developers/core-api'},
          ],
        },
        {
          title: 'Platform',
          items: [
            {label: 'Theme Overview', to: '/themes/overview'},
            {label: 'Plugin Overview', to: '/plugins/overview'},
            {label: 'Publishing Quality', to: '/publishing-quality'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'GitHub', href: 'https://github.com/sh00von/bunPress'},
            {label: 'Shovon', href: 'https://shovon.bd/'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Shovon. BunPress documentation.`,
    },
    prism: {
      theme: {
        plain: {
          color: '#111111',
          backgroundColor: '#f8f8f8',
        },
        styles: [],
      },
      darkTheme: {
        plain: {
          color: '#f8f8f8',
          backgroundColor: '#111111',
        },
        styles: [],
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
