/**
 * Mounts the storefront onto the API server.
 *
 *   /admin/*   the admin SPA shell — never server-rendered, never crawled
 *   /*         the public storefront, server-rendered per request
 *
 * Development runs Vite in middleware mode, production reads the two build
 * outputs, and both call the same `render()` — so an SSR bug cannot hide until
 * deploy. Why server-render at all: a forwarded link that previews blank is a
 * lost enquiry. See docs/ARCHITECTURE.md.
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import express from "express";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { htmlCache } from "./htmlCache.js";

const CLIENT_DIST = path.join(env.FRONTEND_DIR, "dist/client");
const SERVER_DIST = path.join(env.FRONTEND_DIR, "dist/server");

function frontendIsBuilt() {
  return (
    fs.existsSync(path.join(CLIENT_DIST, "index.html")) &&
    fs.existsSync(path.join(SERVER_DIST, "entry-server.js"))
  );
}

/** Server up, storefront unbuilt — states the one command that fixes it. */
function placeholderPage(reason) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MOSSANO MARMO — storefront not built</title>
<style>
 body{margin:0;min-height:100vh;display:grid;place-items:center;background:#12100e;color:#efe9e1;
      font:400 16px/1.6 ui-sans-serif,system-ui,sans-serif}
 main{max-width:34rem;padding:2rem}
 h1{font-weight:400;letter-spacing:.24em;text-transform:uppercase;font-size:1rem;margin:0 0 1.5rem}
 code{background:#211d19;padding:.2em .5em;color:#c9a227}
 p{color:#a8a09a}
</style></head><body><main>
<h1>MOSSANO MARMO</h1>
<p>The API is running, but the storefront has no build output yet.</p>
<p><code>cd mossano-front &amp;&amp; npm install &amp;&amp; npm run build</code></p>
<p style="font-size:.85rem;opacity:.6">${reason}</p>
</main></body></html>`;
}

async function mountStorefront(app) {
  let render;
  let viteServer = null;
  /** Returns the admin SPA shell for this mode. */
  let adminShell;

  if (env.IS_PROD) {
    if (!frontendIsBuilt()) {
      logger.error(
        { clientDist: CLIENT_DIST },
        "Storefront build output is missing. Run `npm run build` in mossano-front.",
      );
      app.use((_req, res) =>
        res.status(503).type("html").send(placeholderPage("No build output found.")),
      );
      return;
    }

    // Hashed filenames, so these are immutable. index.html is served by the SSR
    // handler below and never from here.
    app.use(
      express.static(CLIENT_DIST, {
        index: false,
        maxAge: "1y",
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
        },
      }),
    );

    const template = fs.readFileSync(path.join(CLIENT_DIST, "index.html"), "utf8");

    // pathToFileURL, not the raw path: Node's ESM loader rejects a Windows
    // absolute path outright — "D:\..." is read as a URL with the scheme "d:".
    // Normalising the separators is not enough, it needs the file:// scheme.
    const { render: prodRender } = await import(
      pathToFileURL(path.join(SERVER_DIST, "entry-server.js")).href
    );
    render = (url, ctx) => prodRender({ url, template, ...ctx });
    adminShell = async () => template;
  } else {
    const { createServer } = await import("vite");
    viteServer = await createServer({
      root: env.FRONTEND_DIR,
      appType: "custom",
      server: { middlewareMode: true },
    });
    app.use(viteServer.middlewares);

    render = async (url, ctx) => {
      const raw = fs.readFileSync(path.join(env.FRONTEND_DIR, "index.html"), "utf8");
      // Injects the HMR client and rewrites bare module specifiers.
      const template = await viteServer.transformIndexHtml(url, raw);
      const { render: devRender } = await viteServer.ssrLoadModule("/src/entry-server.tsx");
      return devRender({ url, template, ...ctx });
    };

    // In development there is no dist/ to serve the shell from, so it comes
    // from the source index.html put through Vite — which is also what injects
    // the module script and the HMR client. Without this the admin panel is
    // simply unreachable in dev: the request falls through to the SSR handler,
    // which knows only the public routes and answers with a 404.
    adminShell = async (url) =>
      viteServer.transformIndexHtml(
        url,
        fs.readFileSync(path.join(env.FRONTEND_DIR, "index.html"), "utf8"),
      );
  }

  // --- The admin panel -----------------------------------------------------
  // Explicitly not server-rendered: it sits behind a login, has nothing a
  // crawler should index, and its dependencies must never reach a customer's
  // phone. Mounted after Vite's middleware so /src/* and /@vite/* still resolve.
  app.get(/^\/admin(\/.*)?$/, async (req, res, next) => {
    try {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.setHeader("Cache-Control", "no-store");
      res.type("html").end(await adminShell(req.originalUrl));
    } catch (err) {
      next(err);
    }
  });

  // --- The storefront ------------------------------------------------------
  app.use(async (req, res, next) => {
    if (req.method !== "GET") return next();

    const url = req.originalUrl;

    try {
      // Query strings are part of the key — /shop?look=dramatic is a different
      // page from /shop — but only for GETs, and only up to MAX_ENTRIES.
      const { html, status, cache } = await htmlCache.get(url, async () => {
        const result = await render(url, { origin: env.PUBLIC_BASE_URL });
        return { html: result.html, status: result.status ?? 200 };
      });

      res.status(status);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-SSR-Cache", cache ?? "off");
      // The browser revalidates; the server-side cache is what absorbs load.
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      res.end(html);
    } catch (err) {
      // Let Vite rewrite the stack against the original TypeScript sources,
      // otherwise the trace points into transformed output and is unreadable.
      viteServer?.ssrFixStacktrace(err);
      next(err);
    }
  });

  logger.info(
    {
      mode: env.IS_PROD ? "build" : "vite-middleware",
      frontend: env.FRONTEND_DIR,
    },
    "Storefront mounted",
  );
}

export { mountStorefront, CLIENT_DIST, SERVER_DIST, frontendIsBuilt };
