import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { createTrustedHtml, sanitizeUrl } from "./security.ts";

interface MarkdownNode {
  type?: string;
  url?: string;
  value?: string;
  alt?: string;
  children?: MarkdownNode[];
}

function sanitizeMarkdownTree(node: MarkdownNode): void {
  if (!node.children) {
    return;
  }

  const nextChildren: MarkdownNode[] = [];

  for (const child of node.children) {
    if (child.type === "html") {
      continue;
    }

    if ((child.type === "link" || child.type === "image") && typeof child.url === "string") {
      try {
        child.url = sanitizeUrl(child.url, {
          allowedSchemes: child.type === "link" ? ["http", "https", "mailto", "tel"] : ["http", "https"],
          allowRelative: true,
          allowFragment: child.type === "link",
          fieldName: `${child.type} URL`,
        });
      } catch {
        if (child.type === "link") {
          sanitizeMarkdownTree(child);
          nextChildren.push(...(child.children ?? []));
          continue;
        }

        if (child.alt?.trim()) {
          nextChildren.push({ type: "text", value: child.alt });
        }
        continue;
      }
    }

    sanitizeMarkdownTree(child);
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

export async function renderMarkdown(markdown: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(() => (tree) => {
      sanitizeMarkdownTree(tree as MarkdownNode);
    })
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);

  return createTrustedHtml(String(file));
}
