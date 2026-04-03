import { access, readFile } from "node:fs/promises";
import path from "node:path";
import chokidar from "chokidar";
import { Hono } from "hono";
import type { BuildResult, BuildTrigger, DevServer, DevServerOptions } from "./types.ts";
import { buildSite } from "./build.ts";
import { loadConfig } from "./config.ts";

function contentTypeFor(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return extension === ".html"
        ? "text/html; charset=utf-8"
        : "application/octet-stream";
  }
}

function injectLiveReload(html: string): string {
  const snippet = `<script type="module">
const events = new EventSource("/__engine/live-reload");
events.addEventListener("refresh", () => window.location.reload());
</script>`;

  return html.includes("</body>")
    ? html.replace("</body>", `${snippet}</body>`)
    : `${html}${snippet}`;
}

async function serveBuiltFile(
  publicRoot: string,
  routePath: string,
  injectReload: boolean,
): Promise<{ response: Response } | undefined> {
  const normalized = routePath.replace(/^\/+/, "");
  const candidateFiles = [
    normalized ? path.join(publicRoot, normalized) : path.join(publicRoot, "index.html"),
    path.join(publicRoot, normalized, "index.html"),
    normalized.endsWith(".html") ? path.join(publicRoot, normalized) : path.join(publicRoot, `${normalized}.html`),
  ];

  for (const filePath of candidateFiles) {
    try {
      await access(filePath);
      const buffer = await readFile(filePath);
      const contentType = contentTypeFor(filePath);
      const body =
        injectReload && filePath.endsWith(".html")
          ? injectLiveReload(buffer.toString("utf8"))
          : buffer;
      return {
        response: new Response(body, {
          headers: {
            "content-type": contentType,
          },
        }),
      };
    } catch {
      // try next
    }
  }

  return undefined;
}

function createApp(
  publicRoot: string,
  subscribers: Set<ReadableStreamDefaultController>,
  injectReload: boolean,
) {
  const app = new Hono();

  app.get("/__engine/live-reload", (context) => {
    const stream = new ReadableStream({
      start(controller) {
        subscribers.add(controller);
      },
      cancel() {
        subscribers.clear();
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  });

  app.get("*", async (context) => {
    const directMatch = await serveBuiltFile(publicRoot, context.req.path, injectReload);
    if (directMatch) {
      return directMatch.response;
    }

    const fallback = await serveBuiltFile(publicRoot, "/404.html", injectReload);
    if (!fallback) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(fallback.response.body, {
      headers: fallback.response.headers,
      status: 404,
    });
  });

  return app;
}

export async function createDevServer(
  cwd: string,
  options: DevServerOptions = {},
): Promise<DevServer> {
  const runBuild = async (trigger: BuildTrigger): Promise<BuildResult> => {
    try {
      const result = await buildSite(cwd, {
        onProgress: (event) => {
          options.onBuildProgress?.({ ...event, trigger });
        },
      });
      options.onBuildComplete?.(result, trigger);
      return result;
    } catch (error) {
      options.onBuildError?.(error, trigger);
      throw error;
    }
  };

  await runBuild("initial");
  const config = await loadConfig(cwd);
  const subscribers = new Set<ReadableStreamDefaultController>();

  const notify = () => {
    for (const controller of subscribers) {
      controller.enqueue("event: refresh\ndata: updated\n\n");
    }
  };

  const watcher = chokidar.watch(
    [config.contentRoot, config.themeRoot, config.configPath, ...config.plugins],
    { ignoreInitial: true },
  );

  let activeRebuild: Promise<BuildResult> | undefined;
  let rebuildQueued = false;
  let pendingResolvers: Array<{
    resolve: (result: BuildResult) => void;
    reject: (error: unknown) => void;
  }> = [];

  const flushPendingResolvers = (
    result: { value: BuildResult } | { error: unknown },
  ) => {
    const resolvers = pendingResolvers;
    pendingResolvers = [];
    for (const resolver of resolvers) {
      if ("error" in result) {
        resolver.reject(result.error);
      } else {
        resolver.resolve(result.value);
      }
    }
  };

  const rebuild = async () => {
    rebuildQueued = true;
    return await new Promise<BuildResult>((resolve, reject) => {
      pendingResolvers.push({ resolve, reject });

      if (activeRebuild) {
        return;
      }

      activeRebuild = (async () => {
        let lastResult: BuildResult | undefined;
        let lastError: unknown;

        try {
          while (rebuildQueued) {
            rebuildQueued = false;
            try {
              lastResult = await runBuild("rebuild");
              lastError = undefined;
              notify();
            } catch (error) {
              lastError = error;
            }
          }

          if (lastError !== undefined) {
            flushPendingResolvers({ error: lastError });
            throw lastError;
          }

          if (!lastResult) {
            throw new Error("Rebuild completed without producing output.");
          }

          flushPendingResolvers({ value: lastResult });
          return lastResult;
        } finally {
          activeRebuild = undefined;
        }
      })();

      void activeRebuild.catch(() => {
        // watcher-triggered rebuild failures are reported via callbacks
      });
    });
  };

  const debouncedRebuild = debounce(() => {
    void rebuild().catch(() => {
      // watcher-triggered rebuild failures are reported via callbacks
    });
  }, 120);

  watcher.on("all", debouncedRebuild);
  await new Promise<void>((resolve) => {
    watcher.once("ready", () => resolve());
  });

  const app = createApp(config.publicRoot, subscribers, true);

  return {
    fetch(request) {
      return app.fetch(request);
    },
    async close() {
      await watcher.close();
      for (const controller of subscribers) {
        controller.close();
      }
      subscribers.clear();
    },
    rebuild,
  };
}

export async function createStaticServer(cwd: string): Promise<DevServer> {
  const config = await loadConfig(cwd);
  const app = createApp(config.publicRoot, new Set(), false);

  return {
    fetch(request) {
      return app.fetch(request);
    },
    async close() {
      return Promise.resolve();
    },
    async rebuild() {
      return await buildSite(cwd);
    },
  };
}

function debounce(callback: () => void, timeoutMs: number): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(callback, timeoutMs);
  };
}
