/**
 * A small fixed-window rate limiter, in memory.
 *
 * Deliberately not `express-rate-limit`: two endpoints need protecting — the
 * admin login and the public enquiry forms — and both run on a single instance.
 * If the API is ever scaled horizontally this must move to a shared store,
 * because per-process counters let an attacker multiply their allowance by the
 * number of instances.
 */
import { AppError } from "../utils/AppError.js";

function createRateLimit({ windowMs, max, message, keyFn }) {
  const hits = new Map();

  // Sweep expired windows so a long-running process does not accumulate one
  // Map entry per IP that ever touched the endpoint.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  sweep.unref();

  return function rateLimit(req, res, next) {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return next(
        new AppError(message || "Too many requests. Try again shortly.", 429, {
          code: "TOO_MANY_REQUESTS",
          details: { retryAfterSeconds: retryAfter },
        }),
      );
    }
    next();
  };
}

/** Ten attempts per IP per fifteen minutes, keyed by IP and the email tried. */
const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many sign-in attempts. Wait a few minutes and try again.",
  keyFn: (req) => `${req.ip}:${String(req.body?.email || "").toLowerCase()}`,
});

/**
 * Public forms. Generous enough that a genuine customer sending an enquiry,
 * then a sourcing requirement, then a reservation request is never blocked.
 */
const publicFormRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  message: "That is a lot of enquiries in a short time. Please try again in a few minutes.",
});

/**
 * Reference-image uploads. Tighter than the form limit because this is the one
 * unauthenticated route that writes bytes to storage, and each request can carry
 * three files. Six requests still covers a customer replacing their images twice.
 */
const publicUploadRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  message: "Too many uploads in a short time. Please try again in a few minutes.",
});

export { createRateLimit, loginRateLimit, publicFormRateLimit, publicUploadRateLimit };
