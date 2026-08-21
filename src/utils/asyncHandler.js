/**
 * Wraps an async Express handler so a rejected promise reaches next() instead
 * of becoming an unhandled rejection. Removes try/catch from every controller.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export { asyncHandler };
