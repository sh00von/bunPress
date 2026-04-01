# Plugin Overview

## Plugin Contract

Status: `Stable`

BunPress plugins are explicit site extensions. They are not auto-loaded from the `plugins/` folder. To activate a plugin, add it to `site.config.ts`.

```ts
export default {
  plugins: ["./plugins/reading-time.ts"],
}
```

You can also pass plugin-specific settings through `pluginsConfig`:

```ts
export default {
  plugins: ["./plugins/share-buttons.ts"],
  pluginsConfig: {
    shareButtons: {
      links: [
        {
          text: "Share on X",
          icon: "X",
          shareBase: "https://twitter.com/intent/tweet?url=",
        },
      ],
    },
  },
}
```

## Plugin File Shape

A plugin exports a default function:

```ts
import type { Plugin } from "@bunpress/core";

const myPlugin: Plugin = async (api) => {
  // register hooks, helpers, and slots here
};

export default myPlugin;
```

## What Plugins Can Do

Plugins can:

- react to lifecycle hooks
- mutate content metadata
- register template helpers
- contribute structured UI items into theme slots

Plugins run as local code during build and dev. BunPress validates slot URLs and escapes template output by default, but installing a plugin still means executing its code.

## Supported Hooks

These lifecycle hooks are part of the BunPress stable plugin contract:

- `config:resolved`
- `content:loaded`
- `content:transformed`
- `routes:generated`
- `build:done`

## Helpers

Plugins can register helpers for Nunjucks:

```ts
api.helper("shout", (value) => String(value).toUpperCase());
```

Then use them in a theme:

```njk
{{ shout(site.title) }}
```

## Slots

Plugins can contribute structured items to official theme slots:

```ts
api.slot("post_meta", ({ post }) => {
  if (!post) return [];
  return [{ kind: "text", text: "Featured" }];
});
```

If the active theme renders that slot, the plugin output appears automatically.

For blog-focused plugins, the most useful stable slots are:

- `post_meta`
- `post_above_content`
- `post_below_content`
- `post_footer`
- `site_header`
- `sidebar_primary`
- `site_footer`

See [Plugin Slots](D:\work\hexo-clone-node\docs\plugins\slots.md).
