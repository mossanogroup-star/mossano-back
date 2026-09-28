/**
 * Moves every Cloudinary upload to "authenticated" delivery.
 *
 * An asset under the public "upload" type is served to anyone who knows its
 * address, and the watermarked URL the site hands out contains that address:
 * delete the transformation segment and the original comes back. Under
 * "authenticated" only a signed URL is served, and the signature covers the
 * watermark step. New uploads already land there; this moves the ones that
 * came before.
 *
 * Run it after the code that signs URLs is deployed — the old code builds
 * unsigned addresses, which stop resolving the moment an asset moves.
 *
 * Idempotent: an asset already moved is skipped. Reversible by renaming back
 * with to_type "upload".
 *
 *   node scripts/protectMedia.js            # report only
 *   node scripts/protectMedia.js --write
 */
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { connectDb } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { logger } from "../src/config/logger.js";
import { MediaModel } from "../src/modules/media/media.model.js";
import { StoneModel } from "../src/modules/stone/stone.model.js";
import { toMediaDto } from "../src/modules/media/media.dto.js";
import { cloudinaryProvider } from "../src/utils/storage/cloudinaryProvider.js";

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

  const pending = await MediaModel.find({
    provider: "cloudinary",
    url: /\/upload\//,
  }).lean();
  logger.info(`${pending.length} media file(s) still publicly addressable.`);

  if (!WRITE) {
    logger.info("Report only. Re-run with --write to protect them.");
    return;
  }

  let failed = 0;
  for (const media of pending) {
    const resourceType = media.resourceType ?? "image";
    try {
      const result = await cloudinary.uploader.rename(media.storageKey, media.storageKey, {
        resource_type: resourceType,
        type: "upload",
        to_type: "authenticated",
        // Drop the CDN's cached copies of the old public renditions.
        invalidate: true,
      });
      await MediaModel.updateOne(
        { _id: media._id },
        {
          url: result.secure_url,
          thumbnailUrl: cloudinaryProvider.derive(media.storageKey, resourceType, {
            width: 600,
            type: "authenticated",
          }),
        },
      );
    } catch (err) {
      // Two records can share one file: the first rename moves it, and the
      // second finds nothing left under "upload". Point it at the moved file.
      const moved = await cloudinary.api
        .resource(media.storageKey, { resource_type: resourceType, type: "authenticated" })
        .catch(() => null);
      if (moved) {
        await MediaModel.updateOne(
          { _id: media._id },
          {
            url: moved.secure_url,
            thumbnailUrl: cloudinaryProvider.derive(media.storageKey, resourceType, {
              width: 600,
              type: "authenticated",
            }),
          },
        );
        continue;
      }
      failed += 1;
      logger.error({ err, storageKey: media.storageKey }, "Could not protect this file");
    }
  }

  // Stones carry a copy of their card image's URL; point it at the signed one.
  const stones = await StoneModel.find({ "images.0": { $exists: true } })
    .populate("images")
    .lean();
  for (const stone of stones) {
    const first = stone.images.find(Boolean);
    if (first) {
      await StoneModel.updateOne({ _id: stone._id }, { primaryImageUrl: toMediaDto(first).url });
    }
  }

  logger.info(
    `Protected ${pending.length - failed} file(s), ${failed} failed; ${stones.length} stone card URL(s) refreshed.`,
  );
  if (failed) process.exitCode = 1;
}

run()
  .catch((err) => {
    logger.error({ err }, "Media protection failed");
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
