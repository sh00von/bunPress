import type { Plugin } from "@bunpress/core";

const readingTimePlugin: Plugin = async (api) => {
  api.on("content:transformed", ({ content }) => {
    for (const post of content.posts) {
      const wordCount = post.raw.split(/\s+/).filter(Boolean).length;
      post.metadata.readingTime = Math.max(1, Math.ceil(wordCount / 220));
    }
  });

  api.slot("post_meta", ({ post }) => {
    if (!post || typeof post.metadata.readingTime !== "number") {
      return [];
    }

    return [
      {
        kind: "text",
        text: `${post.metadata.readingTime} min read`,
      },
    ];
  });
};

export default readingTimePlugin;
