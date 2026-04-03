# SEO Metadata and Schema

## Theme Contract

The active theme should render the normalized `seo` local instead of recomputing metadata manually.

Current high-value fields:

- `seo.title`
- `seo.description`
- `seo.canonical`
- `seo.robots`
- `seo.favicons`
- `seo.themeColor`
- `seo.openGraph`
- `seo.twitter`
- `seo.breadcrumbs`
- `seo.jsonLd`
- `seo.verification`

## Example Head Output

```njk
<title>{{ seo.title }}</title>
<meta name="description" content="{{ seo.description }}" />
<link rel="canonical" href="{{ seo.canonical }}" />
<meta name="robots" content="{{ seo.robots }}" />
{% if seo.themeColor %}
  <meta name="theme-color" content="{{ seo.themeColor }}" />
{% endif %}
{% for favicon in seo.favicons %}
  <link rel="{{ favicon.rel }}" href="{{ favicon.url }}" />
{% endfor %}
<meta property="og:title" content="{{ seo.openGraph.title }}" />
<meta property="og:description" content="{{ seo.openGraph.description }}" />
<meta property="og:type" content="{{ seo.openGraph.type }}" />
<meta property="og:url" content="{{ seo.openGraph.url }}" />
<meta name="twitter:card" content="{{ seo.twitter.card }}" />
```

## Structured Data

BunPress currently emits safe structured data defaults such as:

- `Organization`
- `WebSite`
- `BreadcrumbList`
- `BlogPosting` for posts
- `WebPage` for non-post pages

Themes should render the provided `seo.jsonLd` array:

```njk
{% for schema in seo.jsonLd %}
<script type="application/ld+json">{{ renderTrusted(json(schema)) }}</script>
{% endfor %}
```

## Breadcrumb Position

Breadcrumbs should be rendered near the top of the main content column, before the visible page title when possible. This helps both usability and consistent theme structure.

## Sidebar Guidance

Sidebar content is a theme concern. BunPress SEO does not require a sidebar plugin. If your theme uses a sidebar, prefer useful internal links such as:

- category links
- tag links
- recent posts
- archive links
