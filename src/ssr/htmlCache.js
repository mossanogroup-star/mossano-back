/**
 * Rendered-HTML cache for the storefront, with stale-while-revalidate.
 *
 * Two problems it solves at once.
 *
 * Rendering a stone page costs a Mongo round-trip plus React's
 * renderToString. Under any real traffic — a link doing the rounds on an
 * architect's WhatsApp group — that repeats per visitor for a page nobody has
 * edited.
 *
 * And Admin Scope §2 requires that flipping a stone to Sold "automatically
 * updates wherever that stone is shown". A time-based cache alone would serve
 * the old status until it expired. So writes invalidate explicitly, and the TTL
 * is only a backstop for anything an invalidation missed.
 *
 * Stale entries are served immediately and refreshed in the background, so a
 * cache expiry never becomes a slow response, and a burst of traffic on a cold
 * key triggers one render rather than one per request.
 *
 * In memory, and therefore per-process. Behind more than one instance this
 * becomes a shared store, or each instance keeps its own copy and an
 * invalidation only reaches the instance that served the write.
 */
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

const TTL_MS = env.SSR_CACHE_TTL_SECONDS * 1000;
/** Hard ceiling on entries, so a crawler hitting every filter permutation cannot exhaust memory. */
const MAX_ENTRIES = 500;

/** key → { html, renderedAt, status } */
const store = new Map();
/** key → Promise, so concurrent misses share one render. */
const inFlight = new Map();

function evictOldest() {
  // Map preserves insertion order, so the first key is the least recently added.
  const oldest = store.keys().next().value;
  if (oldest !== undefined) store.delete(oldest);
}

const htmlCache = {
  enabled: TTL_MS > 0,

  /**
   * @param {string} key      usually the request path
   * @param {Function} render async () => ({ html, status })
   */
  async get(key, render) {
    if (!this.enabled) return render();

    const hit = store.get(key);
    const now = Date.now();

    if (hit) {
      const isStale = now - hit.renderedAt > TTL_MS;
      if (isStale && !inFlight.has(key)) {
        // Refresh behind the response the caller is about to receive. The
        // catch matters: an unhandled rejection here would take the process
        // down for a page that was being served fine from cache.
        const task = render()
          .then((fresh) => {
            store.set(key, { ...fresh, renderedAt: Date.now() });
          })
          .catch((err) =>
            logger.warn({ err, key }, "Background SSR refresh failed"),
          )
          .finally(() => inFlight.delete(key));
        inFlight.set(key, task);
      }
      return {
        html: hit.html,
        status: hit.status,
        cache: isStale ? "stale" : "hit",
      };
    }

    // Cold key: collapse concurrent requests onto a single render.
    if (inFlight.has(key)) {
      await inFlight.get(key);
      const filled = store.get(key);
      if (filled)
        return { html: filled.html, status: filled.status, cache: "hit" };
    }

    const task = render()
      .then((fresh) => {
        if (store.size >= MAX_ENTRIES) evictOldest();
        // Only successful renders are cached. Caching a 500 would pin an
        // outage in place until the TTL expired.
        if (!fresh.status || fresh.status < 400) {
          store.set(key, { ...fresh, renderedAt: Date.now() });
        }
        return fresh;
      })
      .finally(() => inFlight.delete(key));

    inFlight.set(key, task);
    const result = await task;
    return { ...result, cache: "miss" };
  },

  /** Drop specific paths — what an admin write calls. */
  invalidate(paths) {
    const list = Array.isArray(paths) ? paths : [paths];
    let dropped = 0;
    for (const path of list) {
      if (store.delete(path)) dropped += 1;
    }
    if (dropped)
      logger.debug({ paths: list, dropped }, "SSR cache invalidated");
    return dropped;
  },

  /** Drop everything whose key starts with a prefix, e.g. every /shop?… variant. */
  invalidatePrefix(prefix) {
    let dropped = 0;
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) {
        store.delete(key);
        dropped += 1;
      }
    }
    return dropped;
  },

  clear() {
    store.clear();
  },

  stats: () => ({
    entries: store.size,
    inFlight: inFlight.size,
    ttlMs: TTL_MS,
  }),
};

export { htmlCache };
