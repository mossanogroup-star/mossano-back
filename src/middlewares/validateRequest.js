import { AppError } from "../utils/AppError.js";

/**
 * Validates { body, params, query } against a Zod schema and hands the
 * controller `req.validated`. A controller never reads req.body directly —
 * that is the rule that keeps unvalidated input out of the service layer.
 */
function validateRequest(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body ?? {},
      params: req.params ?? {},
      query: req.query ?? {},
    });

    if (!result.success) {
      return next(
        new AppError("Validation error", 400, {
          code: "VALIDATION_ERROR",
          details: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        }),
      );
    }

    req.validated = result.data;
    next();
  };
}

export { validateRequest };
