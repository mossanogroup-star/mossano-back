/**
 * Cloudinary storage provider.
 *
 * The delivery URL carries the transformation, so one upload serves the 400px
 * card, the 2000px detail view and the social preview with no build step.
 */
import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.js";

if (env.CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Never guessed from the declared MIME type. Phones routinely send
 * `application/octet-stream` for HEIC and WebP, which stored the image as
 * `raw` — no dimensions, no transformations. `auto` inspects the bytes instead.
 */
const AUTO_RESOURCE_TYPE = "auto";

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

const cloudinaryProvider = {
  name: "cloudinary",

  async upload(buffer, { filename, folder }) {
    const result = await uploadBuffer(buffer, {
      folder: [env.CLOUDINARY_FOLDER, folder].filter(Boolean).join("/"),
      resource_type: AUTO_RESOURCE_TYPE,
      // Cloudinary appends its own suffix, so re-uploading never overwrites.
      public_id: filename?.replace(/\.[^.]+$/, "").slice(0, 80) || undefined,
      unique_filename: true,
      overwrite: false,
    });

    const resourceType = result.resource_type ?? "image";

    return {
      provider: "cloudinary",
      storageKey: result.public_id,
      resourceType,
      url: result.secure_url,
      thumbnailUrl: this.derive(result.public_id, resourceType, { width: 600 }),
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
    };
  },

  /** A delivery URL at the requested width — asked for at render time. */
  derive(
    storageKey,
    resourceType = "image",
    { width, height, crop = "limit", trim = false, upscale = false } = {},
  ) {
    if (!env.CLOUDINARY_CONFIGURED || !storageKey) return null;
    return cloudinary.url(storageKey, {
      resource_type: resourceType,
      secure: true,
      transformation: [
        // Several slabs kept a strip of the photographer's backdrop when they
        // were cropped from the catalogue — invisible on a card, glaring on a
        // full-bleed hero. Tolerance 45 was measured: 35 left a column behind,
        // 55 ate into the stone.
        ...(trim ? [{ effect: "trim:45" }] : []),
        // Hero only. The PDF pages top out near 1389px, so a full-bleed hero on
        // a retina display would be a plain scale-up; e_upscale keeps the veins
        // sharp. Cards never exceed the source width, so it would be cost with
        // no benefit there. Real fix: the photographer's originals, §5 of
        // docs/CLIENT-QUESTIONS.md.
        ...(upscale ? [{ effect: "upscale" }] : []),
        { width, height, crop },
        { quality: "auto", fetch_format: "auto" },
      ],
    });
  },

  async remove(storageKey, resourceType = "image") {
    if (!storageKey) return;
    await cloudinary.uploader.destroy(storageKey, {
      resource_type: resourceType,
    });
  },
};

export { cloudinaryProvider };
