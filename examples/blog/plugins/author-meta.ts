import type { Plugin } from "@bunpress/core";

const authorMetaPlugin: Plugin = async (api) => {
  api.slot("post_meta", ({ post }) => {
    const author = typeof post?.frontMatter.author === "string" ? post.frontMatter.author : "";
    if (!author) {
      return [];
    }

    return [
      {
        kind: "text",
        text: `By ${author}`,
      },
    ];
  });
};

export default authorMetaPlugin;
