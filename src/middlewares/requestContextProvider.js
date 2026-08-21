import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

/**
 * Per-request store. Currently carries only the request id, which the pino
 * mixin in config/logger.js reads so every log line is attributable without
 * passing an id down through services.
 */
const requestContext = new AsyncLocalStorage();

function requestContextProvider(req, res, next) {
  const reqId = req.headers["x-request-id"] || randomUUID();
  req.id = reqId;
  res.setHeader("X-Request-Id", reqId);

  const store = new Map([["reqId", reqId]]);
  requestContext.run(store, () => next());
}

export { requestContext, requestContextProvider };
