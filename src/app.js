import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { sendSuccess } from "./utils/response.js";
import { storageProviderName, UPLOAD_ROOT } from "./utils/storage/index.js";
import { requestContextProvider } from "./middlewares/requestContextProvider.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";
import { mountStorefront } from "./ssr/mountStorefront.js";

function resolveCorsOrigins() {
  if (env.CORS_ORIGIN) {
    return env.CORS_ORIGIN.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // The storefront is same-origin, so production needs no allowance at all.
  // Development gets a wildcard so a standalone Vite server can call the API.
  return env.IS_PROD ? [] : true;
}

async function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // Trust the proxy so req.ip is the real client, not the load balancer —
  // the rate limiter keys on it.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // The storefront is server-rendered and loads slab photography from
      // Cloudinary; the default CSP would block both. A tailored policy lives
      // in ssr/mountStorefront.js where the asset origins are known.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cors({ origin: resolveCorsOrigins(), credentials: true }));
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Request context first, so every downstream log line carries the reqId.
  app.use(requestContextProvider);

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        // Asset requests would drown the log; one line per page or API call is
        // what is actually readable.
        ignore: (req) =>
          req.url.startsWith("/assets/") || req.url.startsWith("/uploads/"),
      },
      genReqId: (req) => req.id,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  // Locally-stored uploads. Inert under Cloudinary — the directory simply stays
  // empty — but needed so the local-disk fallback can serve files back.
  app.use(
    "/uploads",
    helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
    express.static(UPLOAD_ROOT, {
      maxAge: "7d",
      index: false,
      // Never let an uploaded file be interpreted as markup.
      setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
    }),
  );

  app.get("/health", (_req, res) =>
    sendSuccess(res, {
      data: {
        status: "ok",
        service: "MOSSANO MARMO API",
        env: env.NODE_ENV,
        storage: storageProviderName,
      },
    }),
  );

  app.use("/api", routes);
  // JSON 404 for the API only. Anything else falls through to the storefront,
  // which renders its own 404 page — a customer must never see a JSON error.
  app.use("/api", notFoundHandler);

  // Serves /admin/* as an SPA shell and everything else as server-rendered
  // storefront HTML. Must be mounted after /api so it cannot shadow it.
  await mountStorefront(app);

  app.use(errorHandler);

  return app;
}

export { createApp };
