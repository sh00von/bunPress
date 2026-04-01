# Templates and Locals

## Template Engine

Status: `Stable`

BunPress themes use Nunjucks templates.

Each layout receives shared locals from the BunPress core render pipeline.

## Common Template Locals

### `site`

Resolved site configuration, including theme config under `site.theme`.

Example:

```njk
<title>{{ page.title or site.title }}</title>
```

### `page`

Route-specific page data.

Examples:

- `page.posts` on index pages
- `page.post` on single post pages
- `page.page` on standalone pages
- `page.entry` on taxonomy pages
- `page.archives` on archive pages

### `collections`

Whole-site collections:

- `collections.posts`
- `collections.pages`
- `collections.tags`
- `collections.categories`
- `collections.archives`

### `routes`

The route manifest generated for the build.

### `engineAssets`

Hashed engine-owned assets emitted by BunPress.

### `slots`

Resolved theme slot output for the current route.

Current structure:

- `slots.post_meta[post.id]`
- `slots.post_footer[post.id]`
- `slots.page_footer[page.id]`
- `slots.head`

### `seo`

Normalized SEO data for the current route.

High-value fields:

- `seo.title`
- `seo.description`
- `seo.canonical`
- `seo.robots`
- `seo.openGraph`
- `seo.twitter`
- `seo.breadcrumbs`
- `seo.jsonLd`
- `seo.verification`

## Route Shapes

### `index`

```ts
page: {
  title: string
  posts: Post[]
  pagination: PaginationInfo
}
```

### `post`

```ts
page: {
  title: string
  post: Post
}
```

### `page`

```ts
page: {
  title: string
  page: Page
}
```

### `taxonomy`

```ts
page: {
  title: string
  taxonomyType: "tag" | "category"
  entry: TaxonomyEntry
}
```

### `archive`

```ts
page: {
  title: string
  archives: ArchiveGroup[]
}
```

## Helpers

Default helpers available to themes:

- `formatDate(value, locale?)`
- `absoluteUrl(value)`
- `json(value)`

Plugins can also register custom helpers through `api.helper(...)`.

## Shared Slot Partial Example

Starter theme pattern:

```njk
{% set items = slots.post_meta[post.id] or [] %}
{% set className = "post-card__meta" %}
{% include "post-meta.njk" %}
```

This is the preferred BunPress pattern for reusable metadata rendering.
