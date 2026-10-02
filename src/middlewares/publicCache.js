/**
 * In-memory cache for the storefront's read API, and the one place admin
 * writes invalidate it.
 *
 * The public endpoints are a few Mongo round-trips each, and the database is a
 * long way from the server — `/home` took 1.3 s warm. The answers change only
 * when the team saves something, so they are kept until then, with the SSR TTL
 * as a backstop.
 *
 * Private selections are never cached: they are addressed by token and count
 * their own views.
 *
 * ⚠ Per-process, like htmlCache. Behind more than one instance this needs a
 * shared store.
 */
import { env } from "../config/env.js";
import { htmlCache } from "../ssr/htmlCache.js";

const TTL_MS = env.SSR_CACHE_TTL_SECONDS * 1000;
/** Same ceiling as htmlCache — filter permutations must not exhaust memory. */
const MAX_ENTRIES = 500;

/** originalUrl → { body, at } */
const store = new Map();

function cachePublicReads(req, res, next) {
  if (!TTL_MS || req.method !== "GET" || req.path.startsWith("/selections")) return next();

  const key = req.originalUrl;
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    res.setHeader("X-API-Cache", "hit");
    return res.json(hit.body);
  }

  res.setHeader("X-API-Cache", "miss");
  const send = res.json.bind(res);
  res.json = (body) => {
    // Only successes. Caching a 404 or a 500 would pin it in place.
    if (res.statusCode === 200) {
      if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
      store.set(key, { body, at: Date.now() });
    }
    return send(body);
  };
  next();
}

/** Both caches — rendered pages and API answers — after any change. */
function clearPublicCaches() {
  store.clear();
  htmlCache.clear();
}

/**
 * Mounted on the admin API. Any successful write there may change what the
 * storefront shows — a stone, an edit, an application, a project, a video, a
 * client logo, a media caption — so all of it is dropped rather than working
 * out which pages each one touches. Writes are a few a day; a cold page is one
 * render.
 */
function clearPublicCachesOnWrite(req, res, next) {
  // Signing in changes nothing a customer sees.
  if (req.method !== "GET" && req.method !== "HEAD" && !req.path.startsWith("/auth")) {
    res.on("finish", () => {
      if (res.statusCode < 400) clearPublicCaches();
    });
  }
  next();
}

export { cachePublicReads, clearPublicCaches, clearPublicCachesOnWrite };
