/**
 * Registers the five quarry-to-project photographs as media records.
 *
 * The client uploaded them straight into Cloudinary — `sourcing`, `selection`,
 * `realphotography`, `verification`, `readyforproject` — which means the site
 * could not see them: everything the storefront renders comes from the Media
 * collection, because that is what carries the alt text, the dimensions and the
 * srcset. This reads each one's real metadata from Cloudinary and creates the
 * record, so the slider has responsive imagery rather than one full-size file
 * stretched across a phone.
 *
 * Idempotent: it matches on the Cloudinary public_id, so re-running it updates
 * rather than duplicating. Once a record exists the team replaces the picture
 * from the admin media library in the normal way, and this is never needed
 * again.
 *
 *   node scripts/importProcessImages.js            # report only
 *   node scripts/importProcessImages.js --write
 */
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { connectDb } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { logger } from "../src/config/logger.js";
import { MediaModel } from "../src/modules/media/media.model.js";
import { PROCESS_STEPS } from "../src/modules/public/process.constants.js";

const WRITE = process.argv.includes("--write");

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

async function run() {
  if (!env.CLOUDINARY_CONFIGURED) {
    throw new Error("Cloudinary credentials are missing — check .env.");
  }

  await connectDb();

  for (const step of PROCESS_STEPS) {
    let resource;
    try {
      resource = await cloudinary.api.resource(step.slug);
    } catch {
      logger.warn(`${step.slug} — not found in Cloudinary, skipped`);
      continue;
    }

    const doc = {
      filename: `${step.slug}.${resource.format}`,
      mimeType: `image/${resource.format}`,
      kind: "process",
      provider: "cloudinary",
      storageKey: resource.public_id,
      resourceType: "image",
      url: resource.secure_url,
      width: resource.width,
      height: resource.height,
      bytes: resource.bytes,
      format: resource.format,
      alt: `${step.title} — ${step.body}`,
      // The step it belongs to. The slider matches on this rather than on the
      // filename, so renaming the file in Cloudinary cannot silently unhook it.
      caption: step.slug,
      // e_trim is for slabs cropped out of the catalogue PDFs, not for
      // photography that was shot to frame.
      trimSafe: false,
    };

    const existing = await MediaModel.findOne({ storageKey: resource.public_id });
    logger.info(
      `${step.slug} — ${resource.width}×${resource.height}, ${(resource.bytes / 1024).toFixed(0)}KB${
        existing ? " (already imported, would update)" : ""
      }`,
    );

    if (!WRITE) continue;

    await MediaModel.updateOne({ storageKey: resource.public_id }, { $set: doc }, { upsert: true });
  }

  if (!WRITE) {
    logger.info("Report only. Re-run with --write to create the media records.");
    return;
  }

  const count = await MediaModel.countDocuments({ kind: "process", isDeleted: false });
  logger.info(`${count} process image(s) are now in the media library.`);
}

run()
  .catch((err) => {
    logger.error({ err }, "Process image import failed");
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
