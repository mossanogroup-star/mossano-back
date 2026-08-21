import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const HTTP_ERROR_CODES = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  415: "UNSUPPORTED_MEDIA_TYPE",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
};

/** body-parser's own failures, which carry a status and an `entity.*` type. */
const BODY_PARSER_MESSAGES = {
  "entity.parse.failed": "Malformed request body: expected valid JSON.",
  "entity.too.large": "Request body is too large.",
  "encoding.unsupported": "Unsupported content encoding.",
  "request.aborted": "Request aborted before the body was received.",
};

function fail(res, statusCode, code, message, extra) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, ...(extra || {}) },
  });
}

function errorHandler(err, _req, res, _next) {
  // A malformed or oversized body is the caller's fault, but body-parser's
  // error is not an AppError — without this branch it falls to the 500 case
  // and leaks a stack trace for something as ordinary as bad JSON.
  if (err.type && BODY_PARSER_MESSAGES[err.type]) {
    const status = err.status || err.statusCode || 400;
    return fail(
      res,
      status,
      HTTP_ERROR_CODES[status] || "BAD_REQUEST",
      BODY_PARSER_MESSAGES[err.type],
    );
  }

  // Multer: file too large, too many files, unexpected field.
  if (err.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `File is larger than the ${env.MAX_UPLOAD_MB} MB limit.`
        : err.message;
    return fail(res, 413, "PAYLOAD_TOO_LARGE", message);
  }

  // Invalid ObjectId and friends.
  if (err.name === "CastError") {
    return fail(
      res,
      400,
      "BAD_REQUEST",
      `Invalid value for field: ${err.path}`,
    );
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return fail(res, 409, "CONFLICT", `Duplicate value for ${field}`);
  }

  if (err.name === "ValidationError") {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return fail(res, 400, "VALIDATION_ERROR", "Validation failed", { details });
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return fail(res, 401, "UNAUTHORIZED", "Invalid or expired token");
  }

  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const message = isAppError ? err.message : "Internal server error";
  const code =
    (isAppError && err.code) || HTTP_ERROR_CODES[statusCode] || "UNKNOWN_ERROR";

  if (statusCode >= 500) {
    logger.error({ err }, "Unhandled server error");
  } else if (!env.IS_PROD) {
    logger.debug({ err: err.message }, "Request error");
  }

  return fail(res, statusCode, code, message, {
    ...(isAppError && err.details ? { details: err.details } : {}),
    ...(!env.IS_PROD && !isAppError ? { stack: err.stack } : {}),
  });
}

export { errorHandler };
