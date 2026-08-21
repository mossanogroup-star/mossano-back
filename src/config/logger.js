/**
 * Application logger (pino).
 *
 * Pretty and colourised in development, one JSON record per line in production.
 * Every record picks up the current request id from AsyncLocalStorage, so the
 * lines a single request produced across middleware and services can be grouped
 * without threading an id through every call.
 */
import pino from "pino";
import { env } from "./env.js";
import { requestContext } from "../middlewares/requestContextProvider.js";

const logger = pino({
  level: env.IS_PROD ? "info" : "debug",
  transport: env.IS_PROD
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" },
      },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  mixin() {
    const reqId = requestContext.getStore()?.get("reqId");
    return reqId ? { reqId } : {};
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export { logger };
