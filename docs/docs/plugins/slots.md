# Plugin Slots

## Slot System

Status: `Stable`

BunPress slots are the official bridge between plugins and themes. They let plugins contribute visible UI without editing every template manually.

## Official Slot Names

Current supported slots:

- `post_meta`
- `post_above_content`
- `post_below_content`
- `post_footer`
- `page_above_content`
- `page_below_content`
- `page_footer`
- `head`
- `site_header`
- `sidebar_primary`
- `site_footer`

## Slot Item Shape

Current BunPress v1 slot items are structured items.

```ts
type ThemeSlotItem = {
  kind: "text" | "link" | "button";
  text: string;
  url?: string;
  className?: string;
  title?: string;
  rel?: string;
  target?: string;
  icon?: string;
}
```

Raw HTML slot injection is not supported in the official BunPress contract.

## Registering a Slot

```ts
api.slot("post_meta", ({ post }) => {
  if (!post) return [];

  return [
    {
      kind: "text",
      text: "5 min read",
    },
  ];
});
```

## Slot Render Context

Slot producers receive:

```ts
{
  config,
  content,
  route,
  post?,
  page?,
}
```

Use `post` for post-level slots and `page` for page-level slots.

## Default Theme Behavior

The starter theme renders:

- `post_meta` on index, post, archive, and taxonomy templates
- `post_above_content` on single posts
- `post_below_content` on single posts
- `post_footer` on single posts
- `page_above_content` on standalone pages
- `page_below_content` on standalone pages
- `page_footer` on standalone pages
- `site_footer` in the footer area

The starter theme does not render `site_header` or `sidebar_primary` by default. Those slots remain available for custom themes that intentionally expose header or sidebar extension areas.

This means a plugin that contributes a `post_meta` item automatically appears in those views.

## Slot Rendering Pattern

Starter theme shared partial:

```njk
{% set metaItems = items or [] %}
{% if metaItems.length %}
  <p class="{{ className or 'post-card__meta' }}">
    {% for item in metaItems %}
      {% if not loop.first %}
        <span>&bull;</span>
      {% endif %}
      {% if item.kind == "link" or item.url %}
        <a href="{{ item.url or '#' }}">{{ item.text }}</a>
      {% else %}
        <span>{{ item.text }}</span>
      {% endif %}
    {% endfor %}
  </p>
{% endif %}
```

Themes that do not render slots will not show plugin slot output.
