import type { Plugin, SocialLinkConfigItem } from "@bunpress/core";

const socialLinksPlugin: Plugin = async (api) => {
  api.slot("site_footer", ({ config }) => {
    const pluginConfig = (config.pluginsConfig.socialLinks ?? {}) as {
      links?: SocialLinkConfigItem[];
    };
    const configuredLinks = pluginConfig.links?.length ? pluginConfig.links : (config.socialLinks ?? []);
    const fallbackLinks: SocialLinkConfigItem[] = [
      {
        text: "GitHub",
        url: new URL("/", config.url).toString(),
        rel: "noopener noreferrer",
        target: "_blank",
      },
      {
        text: "Archives",
        url: `${config.url.replace(/\/$/, "")}/archives/`,
      },
    ];

    return (configuredLinks.length ? configuredLinks : fallbackLinks).map((link) => ({
      kind: "link" as const,
      text: link.text,
      url: link.url,
      title: link.title,
      rel: link.rel,
      target: link.target,
    }));
  });
};

export default socialLinksPlugin;
