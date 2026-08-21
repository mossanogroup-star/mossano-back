/**
 * Creates (or repairs) the first admin account from SEED_ADMIN_* in .env.
 *
 * Safe to run repeatedly: an existing account is promoted and re-enabled rather
 * than duplicated, and its password is only reset when RESET_PASSWORD=1 is
 * passed — so re-running after a deploy does not silently undo a password the
 * team changed themselves.
 */
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { connectDb } from "../src/config/db.js";
import { logger } from "../src/config/logger.js";
import { UserModel, hashPassword } from "../src/modules/user/user.model.js";

async function main() {
  const { SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: password, SEED_ADMIN_NAME: name } = env;

  if (!email || !password) {
    logger.error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first.");
    process.exit(1);
  }
  if (password.length < 10) {
    logger.error("SEED_ADMIN_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }

  await connectDb();

  const existing = await UserModel.findOne({ email: email.toLowerCase() });

  if (existing) {
    const patch = { role: "admin", isActive: true };
    if (process.env.RESET_PASSWORD === "1") {
      patch.passwordHash = await hashPassword(password);
    }
    await UserModel.updateOne({ _id: existing._id }, { $set: patch });
    logger.info(
      { email, passwordReset: process.env.RESET_PASSWORD === "1" },
      "Existing account promoted to admin",
    );
  } else {
    await UserModel.create({
      name,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: "admin",
      isActive: true,
    });
    logger.info({ email }, "Admin created");
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  logger.fatal({ err }, "Seed failed");
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
