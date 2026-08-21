import http from "http";
import { createApp } from "./src/app.js";
import { env } from "./src/config/env.js";
import { logger } from "./src/config/logger.js";
import { connectDb } from "./src/config/db.js";
import { runStartupChecks } from "./src/config/bootstrap.js";

async function bootstrap() {
  await connectDb();
  await runStartupChecks();

  // createApp is async because in development it starts Vite in middleware mode
  // so the storefront hot-reloads through this same server. See src/ssr/.
  const app = await createApp();

  const server = http.createServer(app);
  server.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, storefront: env.PUBLIC_BASE_URL },
      "MOSSANO MARMO server listening",
    );
  });

  const shutdown = (signal) => {
    logger.info({ signal }, "Shutting down");
    server.close(() => process.exit(0));
    // Don't let a hung keep-alive connection hold the process open forever.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
