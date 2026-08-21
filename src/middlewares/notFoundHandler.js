import { AppError } from "../utils/AppError.js";

/**
 * Mounted at the end of the /api tree only. Everything outside /api falls
 * through to the SSR handler, which renders the storefront's own 404 page —
 * a JSON error there would be a blank screen for a customer.
 */
function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export { notFoundHandler };
