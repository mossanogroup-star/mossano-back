import { logger } from "./logger.js";
import { env } from "./env.js";
import { UserModel } from "../modules/user/user.model.js";

/**
 * Startup checks. These do not fix anything — they surface the two states that
 * otherwise present as a mystery: an admin panel nobody can sign in to, and a
 * production deploy quietly writing slab photography to a container's
 * ephemeral disk.
 */
async function runStartupChecks() {
  const userCount = await UserModel.estimatedDocumentCount();
  if (userCount === 0) {
    logger.warn(
      "No admin users exist. Run `npm run seed:admin` before opening /admin, " +
        "or nobody can sign in.",
    );
  }

  if (env.IS_PROD && !env.CLOUDINARY_CONFIGURED) {
    logger.error(
      "Running in production without Cloudinary credentials. Uploads are going to " +
        "local disk and will be lost on the next deploy.",
    );
  }
}

export { runStartupChecks };
