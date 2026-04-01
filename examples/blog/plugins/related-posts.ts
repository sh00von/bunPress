import type { Plugin } from "@bunpress/core";

const relatedPostsPlugin: Plugin = async (api) => {
  api.slot("post_below_content", ({ post, content }) => {
    if (!post) {
      return [];
    }

    const related = content.posts
      .filter((candidate) => candidate.id !== post.id)
      .filter(
        (candidate) =>
          candidate.tags.some((tag) => post.tags.includes(tag)) ||
          candidate.categories.some((category) => post.categories.includes(category)),
      )
      .slice(0, 3);

    if (!related.length) {
      return [];
    }

    return related.map((candidate) => ({
      kind: "link" as const,
      text: `Related: ${candidate.title}`,
      url: candidate.urlPath,
      className: "slot-items__link slot-items__link--related",
      title: candidate.title,
    }));
  });
};

export default relatedPostsPlugin;
