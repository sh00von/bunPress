export type ContentKind = "post" | "page";

export interface SiteConfigInput {
  title?: string;
  url?: string;
  description?: string;
  language?: string;
  basePath?: string;
  permalinkStyle?: PermalinkStyle;
  permalink?: string;
  theme?: string;
  paginationSize?: number;
  tagsDir?: string;
  categoriesDir?: string;
  archivesDir?: string;
  showDrafts?: boolean;
  showFuture?: boolean;
  contentDir?: string;
  publicDir?: string;
  themesDir?: string;
  plugins?: string[];
  redirects?: Record<string, string>;
  deploy?: DeployConfigInput;
  socialLinks?: SocialLinkConfigItem[];
  menus?: SiteMenuConfig;
  pluginsConfig?: Record<string, Record<string, unknown>>;
  seo?: SiteSeoConfigInput;
}

export interface GitHubDeployConfig {
  repo?: string;
  branch?: string;
  cname?: string;
}

export interface VercelDeployConfig {
  project?: string;
  prod?: boolean;
}

export interface SocialLinkConfigItem {
  text: string;
  url: string;
  title?: string;
  rel?: string;
  target?: string;
}

export interface MenuLinkItem {
  text: string;
  url: string;
}

export interface SiteMenuConfig {
  primary?: MenuLinkItem[];
  footer?: MenuLinkItem[];
}

export interface DeployConfigInput {
  github?: GitHubDeployConfig;
  vercel?: VercelDeployConfig;
}

export interface SiteSeoRobotsConfig {
  index?: boolean;
  follow?: boolean;
}

export interface SiteSeoOrganizationConfig {
  name?: string;
  logo?: string;
  sameAs?: string[];
}

export interface SiteSeoSearchConfig {
  path?: string;
  queryParam?: string;
}

export interface SiteSeoVerificationConfig {
  google?: string;
  bing?: string;
  yandex?: string;
}

export interface SiteSeoFaviconItemInput {
  url: string;
  rel?: string;
  type?: string;
  sizes?: string;
  color?: string;
}

export interface SiteSeoConfigInput {
  siteName?: string;
  titleTemplate?: string;
  defaultDescription?: string;
  defaultOgImage?: string;
  defaultOgImageAlt?: string;
  robots?: SiteSeoRobotsConfig;
  organization?: SiteSeoOrganizationConfig;
  search?: SiteSeoSearchConfig;
  verification?: SiteSeoVerificationConfig;
  favicon?: string;
  appleTouchIcon?: string;
  manifest?: string;
  themeColor?: string;
  favicons?: SiteSeoFaviconItemInput[];
  robotsTxt?: string;
}

export interface SiteSeoConfig extends Required<Omit<SiteSeoConfigInput, "organization" | "search" | "verification">> {
  organization: SiteSeoOrganizationConfig;
  search: SiteSeoSearchConfig;
  verification: SiteSeoVerificationConfig;
}

export interface SiteConfig extends Required<Omit<SiteConfigInput, "plugins">> {
  rootDir: string;
  configPath: string;
  contentRoot: string;
  postsDir: string;
  pagesDir: string;
  draftsDir: string;
  publicRoot: string;
  themesRoot: string;
  themeRoot: string;
  plugins: string[];
  themeConfig: Record<string, unknown>;
  deploy: DeployConfigInput;
  seo: SiteSeoConfig;
}

export type PermalinkStyle =
  | "day-and-name"
  | "month-and-name"
  | "post-name"
  | "plain"
  | "custom";

export interface FrontMatter {
  title?: string;
  seoTitle?: string;
  slug?: string;
  date?: string | Date;
  updated?: string | Date;
  tags?: string | string[];
  categories?: string | string[];
  permalink?: string;
  excerpt?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  canonical?: string;
  aliases?: string | string[];
  noindex?: boolean;
  nofollow?: boolean;
  draft?: boolean;
  layout?: string;
  [key: string]: unknown;
}

export interface TrustedHtml {
  "bunpress.trustedHtml": true;
  value: string;
}

export interface ContentBase {
  id: string;
  kind: ContentKind;
  sourcePath: string;
  relativeSourcePath: string;
  slug: string;
  title: string;
  urlPath: string;
  permalink: string;
  raw: string;
  excerpt: string;
  html: TrustedHtml;
  layout: string;
  frontMatter: FrontMatter;
  aliases: string[];
  date?: string;
  updated?: string;
  tags: string[];
  categories: string[];
  draft: boolean;
  future: boolean;
  metadata: Record<string, unknown>;
}

export interface Post extends ContentBase {
  kind: "post";
}

export interface Page extends ContentBase {
  kind: "page";
}

export interface TaxonomyEntry {
  name: string;
  slug: string;
  urlPath: string;
  permalink: string;
  posts: Post[];
}

export interface ArchiveGroup {
  year: number;
  month: number;
  label: string;
  posts: Post[];
}

export interface AdjacentPostLink {
  id: string;
  title: string;
  urlPath: string;
  permalink: string;
  date?: string;
}

export interface AdjacentPostLinks {
  previous?: AdjacentPostLink;
  next?: AdjacentPostLink;
}

export interface ContentGraph {
  posts: Post[];
  pages: Page[];
  tags: TaxonomyEntry[];
  categories: TaxonomyEntry[];
  archives: ArchiveGroup[];
  adjacentPosts: Record<string, AdjacentPostLinks>;
}

export type RouteKind =
  | "index"
  | "post"
  | "page"
  | "tag"
  | "category"
  | "archive"
  | "404";

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  nextUrl?: string;
  prevUrl?: string;
}

export interface RouteManifestEntry {
  kind: RouteKind;
  urlPath: string;
  outputPath: string;
  layout: string;
  title: string;
  pageData: Record<string, unknown>;
}

export interface BuildResult {
  outputDir: string;
  routes: RouteManifestEntry[];
  content: ContentGraph;
  engineAssets: Record<string, string>;
  redirects: RedirectEntry[];
  warnings: BuildWarning[];
  feeds: FeedArtifacts;
  startedAt: string;
  endedAt: string;
}

export type BuildPhaseId =
  | "config"
  | "content"
  | "transform"
  | "routes"
  | "assets"
  | "render"
  | "artifacts"
  | "warnings"
  | "complete";

export interface BuildProgressEvent {
  phaseId: BuildPhaseId;
  phaseLabel: string;
  phaseIndex: number;
  phaseCount: number;
  detail?: string;
}

export interface BuildOptions {
  onProgress?: (event: BuildProgressEvent) => void;
}

export interface BuildWarning {
  code: string;
  message: string;
  sourcePath?: string;
  urlPath?: string;
}

export interface RedirectEntry {
  sourcePath: string;
  target: string;
  outputPath: string;
  reason: "alias" | "config";
}

export interface FeedArtifacts {
  rssPath: string;
  atomPath: string;
}

export interface SeoBreadcrumbItem {
  name: string;
  url: string;
}

export interface SeoOpenGraph {
  title: string;
  description: string;
  type: "website" | "article";
  url: string;
  image?: string;
  imageAlt?: string;
  siteName: string;
}

export interface SeoTwitter {
  card: "summary" | "summary_large_image";
  title: string;
  description: string;
  image?: string;
}

export interface SeoFaviconItem {
  url: string;
  rel: string;
  type?: string;
  sizes?: string;
  color?: string;
}

export interface ResolvedSeo {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  pageType: "website" | "article" | "archive" | "taxonomy" | "page" | "404";
  isIndexable: boolean;
  image?: string;
  imageAlt?: string;
  openGraph: SeoOpenGraph;
  twitter: SeoTwitter;
  favicons: SeoFaviconItem[];
  themeColor?: string;
  breadcrumbs: SeoBreadcrumbItem[];
  jsonLd: Record<string, unknown>[];
  verification: SiteSeoVerificationConfig;
}

export type ThemeSlotName =
  | "post_meta"
  | "post_footer"
  | "page_footer"
  | "head"
  | "site_header"
  | "sidebar_primary"
  | "post_above_content"
  | "post_below_content"
  | "page_above_content"
  | "page_below_content"
  | "site_footer";

export interface ThemeSlotItem {
  kind: "text" | "link" | "button";
  text: string;
  url?: string;
  className?: string;
  title?: string;
  rel?: string;
  target?: string;
  icon?: string;
}

export interface ThemeSlotRenderContext {
  config: SiteConfig;
  content: ContentGraph;
  route: RouteManifestEntry;
  post?: Post;
  page?: Page;
}

export type HookName =
  | "config:resolved"
  | "content:loaded"
  | "content:transformed"
  | "routes:generated"
  | "build:done";

export interface HelperContext {
  site: SiteConfig;
}

export type ThemeHelper = (...args: unknown[]) => unknown;

export type HookHandlerMap = {
  "config:resolved": { config: SiteConfig };
  "content:loaded": { config: SiteConfig; content: ContentGraph };
  "content:transformed": { config: SiteConfig; content: ContentGraph };
  "routes:generated": {
    config: SiteConfig;
    content: ContentGraph;
    routes: RouteManifestEntry[];
  };
  "build:done": {
    config: SiteConfig;
    content: ContentGraph;
    routes: RouteManifestEntry[];
    result: BuildResult;
  };
};

export interface PluginAPI {
  on<TName extends HookName>(
    hookName: TName,
    handler: (payload: HookHandlerMap[TName]) => void | Promise<void>,
  ): void;
  helper(name: string, helper: ThemeHelper): void;
  slot(
    slotName: ThemeSlotName,
    producer: (
      context: ThemeSlotRenderContext,
    ) => ThemeSlotItem[] | Promise<ThemeSlotItem[]>,
  ): void;
}

export type Plugin = (api: PluginAPI) => void | Promise<void>;

export interface BuildContext {
  config: SiteConfig;
  helpers: Map<string, ThemeHelper>;
}

export interface ThemeAdapter {
  render(
    layout: string,
    locals: Record<string, unknown>,
  ): Promise<string>;
  close(): Promise<void>;
}

export interface DevServer {
  fetch: (request: Request) => Response | Promise<Response>;
  close: () => Promise<void>;
  rebuild: () => Promise<BuildResult>;
}

export type BuildTrigger = "initial" | "rebuild";

export interface DevServerOptions {
  onBuildProgress?: (
    event: BuildProgressEvent & { trigger: BuildTrigger },
  ) => void;
  onBuildComplete?: (result: BuildResult, trigger: BuildTrigger) => void;
  onBuildError?: (error: unknown, trigger: BuildTrigger) => void;
}
