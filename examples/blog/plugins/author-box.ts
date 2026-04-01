import type { Plugin } from "@bunpress/core";

type AuthorBoxConfig = {
  heading?: string;
  siteLabel?: string;
};

const authorBoxPlugin: Plugin = async (api) => {
  api.slot("post_below_content", ({ post, config }) => {
    if (!post) {
      return [];
    }

    const pluginConfig = (config.pluginsConfig.authorBox ?? {}) as AuthorBoxConfig;
    const author = typeof post.frontMatter.author === "string" ? post.frontMatter.author : "";
    if (!author) {
      return [];
    }

    return [
      {
        kind: "text",
        text: `${pluginConfig.heading ?? "Written by"} ${author}`,
        className: "slot-items__text slot-items__text--author-box",
      },
      {
        kind: "text",
        text: pluginConfig.siteLabel ?? `Published on ${config.title}`,
        className: "slot-items__text slot-items__text--author-box-note",
      },
    ];
  });
};

export default authorBoxPlugin;
