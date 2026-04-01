import type { Plugin, ThemeSlotItem } from "@bunpress/core";

type SiteChromeLink = {
  text: string;
  url?: string;
  kind?: "text" | "link" | "button";
  icon?: string;
  title?: string;
  target?: string;
  rel?: string;
};

type SiteChromeConfig = {
  headerLinks?: SiteChromeLink[];
};

function toSlotItems(items: SiteChromeLink[]): ThemeSlotItem[] {
  return items.map((item) => ({
    kind: item.kind ?? (item.url ? "link" : "text"),
    text: item.text,
    url: item.url,
    icon: item.icon,
    title: item.title,
    target: item.target,
    rel: item.rel,
  }));
}

const siteChromePlugin: Plugin = async (api) => {
  api.slot("site_header", ({ config }) => {
    const pluginConfig = (config.pluginsConfig.siteChrome ?? {}) as SiteChromeConfig;
    const items = pluginConfig.headerLinks ?? [];
    return toSlotItems(items);
  });
};

export default siteChromePlugin;
