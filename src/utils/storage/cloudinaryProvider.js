/**
 * Cloudinary storage provider.
 *
 * Cloudinary is the client's choice, and it earns its place here beyond simple
 * hosting: slab photography is the entire product, and the delivery URL carries
 * the transformation, so one upload serves the 400px card, the 2000px detail
 * view and the 1200x630 social preview without a build step.
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
 * Cloudinary stores images, video and everything else under different resource
 * types, and the delivery URL differs per type — so getting this wrong means an
 * image stored as `raw`, with no dimensions and no transformations. That is
 * exactly what happened when the browser sent `application/octet-stream`, which
 * phones do routinely for HEIC and WebP.
 *
 * So the type is not guessed from the declared MIME type at all. `auto` lets
 * Cloudinary inspect the bytes, and its answer is what gets stored.
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
      // Keep the original name as the visible part of the public id, but let
      // Cloudinary append its own suffix so re-uploading never overwrites.
      public_id: filename?.replace(/\.[^.]+$/, "").slice(0, 80) || undefined,
      unique_filename: true,
      overwrite: false,
    });

    // Whatever Cloudinary decided the bytes actually were.
    const resourceType = result.resource_type ?? "image";

    return {
      provider: "cloudinary",
      storageKey: result.public_id,
      resourceType,
      url: result.secure_url,
      // A card never needs the full slab. f_auto/q_auto lets Cloudinary pick
      // AVIF or WebP per browser without us tracking format support.
      thumbnailUrl: this.derive(result.public_id, resourceType, { width: 600 }),
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
    };
  },

  /**
   * Build a delivery URL at a given width. This is why one upload is enough:
   * the storefront asks for the size it needs at render time.
   */
  derive(storageKey, resourceType = "image", { width, height, crop = "limit", trim = false } = {}) {
    if (!env.CLOUDINARY_CONFIGURED || !storageKey) return null;
    return cloudinary.url(storageKey, {
      resource_type: resourceType,
      secure: true,
      transformation: [
        // Every slab here was cropped out of a PDF catalogue page, and several
        // kept a strip of the photographer's backdrop down one or both edges.
        // Invisible on a small card, glaring across a full-bleed hero.
        //
        // Tolerance 45 was chosen by measuring, not guessing: it clears the
        // border on both the darkest and the lightest slabs in the catalogue,
        // where 35 left a column behind and 55 began eating into the stone.
        // Applied at delivery, so the stored original is never degraded.
        ...(trim ? [{ effect: "trim:45" }] : []),
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
