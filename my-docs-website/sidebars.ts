import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'index',
    'getting-started',
    'features',
    'cli-reference',
    'site-structure',
    'publishing-quality',
    {
      type: 'category',
      label: 'SEO',
      items: ['seo/overview', 'seo/metadata-and-schema'],
    },
    {
      type: 'category',
      label: 'Themes',
      items: ['themes/overview', 'themes/templates-and-locals'],
    },
    {
      type: 'category',
      label: 'Plugins',
      items: ['plugins/overview', 'plugins/slots', 'plugins/examples'],
    },
    {
      type: 'category',
      label: 'Developers',
      items: ['developers/core-api', 'reference/stability'],
    },
  ],
};

export default sidebars;
