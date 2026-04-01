import type { Plugin, ThemeSlotItem } from "@bunpress/core";

type ShareLinkConfig = {
  text: string;
  shareBase: string;
  icon?: string;
  title?: string;
  target?: string;
  rel?: string;
};

type ShareButtonsConfig = {
  links?: ShareLinkConfig[];
};

const defaultLinks: ShareLinkConfig[] = [
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

const shareButtonsPlugin: Plugin = async (api) => {
  api.slot("post_footer", ({ post, config }) => {
    if (!post) {
      return [];
    }

    const pluginConfig = (config.pluginsConfig.shareButtons ?? {}) as ShareButtonsConfig;
    const links = pluginConfig.links?.length ? pluginConfig.links : defaultLinks;
    const absolutePostUrl = new URL(post.urlPath.replace(/^\//, ""), config.url).toString();

    return links.map<ThemeSlotItem>((link) => ({
      kind: "button",
      text: link.text,
      url: `${link.shareBase}${encodeURIComponent(absolutePostUrl)}`,
      icon: link.icon,
      title: link.title ?? `Share ${post.title}`,
      target: link.target ?? "_blank",
      rel: link.rel ?? "noopener noreferrer",
      className: "slot-items__button slot-items__button--share",
    }));
  });
};

export default shareButtonsPlugin;
