import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connects to MongoDB with exponential-backoff retry, exiting if the retries
 * are exhausted — a server that is up but cannot reach its database would
 * serve empty catalogue pages, which is worse than being down.
 */
async function connectDb(maxRetries = 5) {
  mongoose.set("strictQuery", true);

  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
      });
      logger.info({ db: mongoose.connection.name }, "MongoDB connected");
      return;
    } catch (error) {
      attempt += 1;
      const delay = Math.min(1000 * 2 ** attempt, 10_000);
      logger.warn(
        { attempt, delayMs: delay, err: error.message },
        "MongoDB connection failed, will retry",
      );
      if (attempt >= maxRetries) {
        logger.fatal("Max MongoDB retries reached. Exiting.");
        process.exit(1);
      }
      await wait(delay);
    }
  }
}

export { connectDb };
