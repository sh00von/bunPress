import { createJiti } from "jiti";
import type {
  HelperContext,
  HookHandlerMap,
  HookName,
  Plugin,
  PluginAPI,
  SiteConfig,
  ThemeSlotItem,
  ThemeSlotName,
  ThemeSlotRenderContext,
  ThemeHelper,
} from "./types.ts";
import {
  sanitizeOptionalUrl,
  stringifyJsonForHtml,
  validateClassName,
} from "./security.ts";
import { toRelativeHref } from "./utils.ts";

type HookRegistry = {
  [TName in HookName]: Array<
    (payload: HookHandlerMap[TName]) => void | Promise<void>
  >;
};

type SlotRegistry = {
  [TName in ThemeSlotName]: Array<
    (
      context: ThemeSlotRenderContext,
    ) => ThemeSlotItem[] | Promise<ThemeSlotItem[]>
  >;
};

export interface PluginContainer {
  helpers: Map<string, ThemeHelper>;
  run<TName extends HookName>(
    hookName: TName,
    payload: HookHandlerMap[TName],
  ): Promise<void>;
  resolveSlot(
    slotName: ThemeSlotName,
    context: ThemeSlotRenderContext,
  ): Promise<ThemeSlotItem[]>;
}

function validateSlotItem(
  item: ThemeSlotItem,
  slotName: ThemeSlotName,
  index: number,
): ThemeSlotItem {
  return {
    ...item,
    url: sanitizeOptionalUrl(item.url, {
      allowedSchemes: ["http", "https", "mailto", "tel"],
      allowRelative: true,
      allowFragment: true,
      fieldName: `slot ${slotName}[${index}] url`,
    }),
    className: validateClassName(item.className, `slot ${slotName}[${index}] className`),
  };
}

function createHookRegistry(): HookRegistry {
  return {
    "config:resolved": [],
    "content:loaded": [],
    "content:transformed": [],
    "routes:generated": [],
    "build:done": [],
  };
}

function createSlotRegistry(): SlotRegistry {
  return {
    post_meta: [],
    post_footer: [],
    page_footer: [],
    head: [],
    site_header: [],
    sidebar_primary: [],
    post_above_content: [],
    post_below_content: [],
    page_above_content: [],
    page_below_content: [],
    site_footer: [],
  };
}

export async function loadPlugins(config: SiteConfig): Promise<PluginContainer> {
  const hooks = createHookRegistry();
  const slots = createSlotRegistry();
  const helpers = new Map<string, ThemeHelper>();
  const jiti = createJiti(import.meta.url);

  const api: PluginAPI = {
    on(hookName, handler) {
      hooks[hookName].push(handler as never);
    },
    helper(name, helper) {
      helpers.set(name, helper);
    },
    slot(slotName, producer) {
      slots[slotName].push(producer);
    },
  };

  for (const pluginPath of config.plugins) {
    const pluginModule = (await jiti.import(pluginPath)) as Record<string, unknown>;
    const plugin = (pluginModule.default ?? pluginModule.plugin) as Plugin;

    if (typeof plugin !== "function") {
      throw new Error(`Plugin at ${pluginPath} must export a default function`);
    }

    await plugin(api);
  }

  return {
    helpers,
    async run(hookName, payload) {
      for (const handler of hooks[hookName]) {
        await handler(payload as never);
      }
    },
    async resolveSlot(slotName, context) {
      const items: ThemeSlotItem[] = [];

      for (const producer of slots[slotName]) {
        const produced = await producer(context);
        if (produced.length > 0) {
          items.push(
            ...produced.map((item, index) => validateSlotItem(item, slotName, index)),
          );
        }
      }

      return items;
    },
  };
}

export function createDefaultHelpers(config: SiteConfig): Map<string, ThemeHelper> {
  const helpers = new Map<string, ThemeHelper>();

  helpers.set("formatDate", (value: unknown, locale = config.language) => {
    if (!value) {
      return "";
    }

    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const resolvedLocale =
      typeof locale === "string" || Array.isArray(locale) ? locale : config.language;

    return new Intl.DateTimeFormat(resolvedLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  });

  helpers.set("absoluteUrl", (value: unknown) => {
    const url = String(value ?? "/");
    return new URL(url, config.url).toString();
  });

  helpers.set("href", (value: unknown, fromUrlPath = "/") => {
    const rawValue = String(value ?? "#");

    try {
      const resolved = new URL(rawValue);
      const siteOrigin = new URL(config.url).origin;
      if (resolved.origin === siteOrigin) {
        return toRelativeHref(
          `${resolved.pathname}${resolved.search}${resolved.hash}`,
          String(fromUrlPath ?? "/"),
        );
      }
    } catch {
      // not an absolute URL
    }

    return toRelativeHref(rawValue, String(fromUrlPath ?? "/"));
  });

  helpers.set("json", (value: unknown) => stringifyJsonForHtml(value));

  return helpers;
}
