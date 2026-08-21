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

/** Cloudinary calls video and image different resource types; PDFs are "raw". */
function resourceTypeFor(mimeType) {
  if (mimeType?.startsWith("video/")) return "video";
  if (mimeType?.startsWith("image/")) return "image";
  return "raw";
}

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

const cloudinaryProvider = {
  name: "cloudinary",

  async upload(buffer, { filename, mimeType, folder }) {
    const resourceType = resourceTypeFor(mimeType);
    const result = await uploadBuffer(buffer, {
      folder: [env.CLOUDINARY_FOLDER, folder].filter(Boolean).join("/"),
      resource_type: resourceType,
      // Keep the original name as the visible part of the public id, but let
      // Cloudinary append its own suffix so re-uploading never overwrites.
      public_id: filename?.replace(/\.[^.]+$/, "").slice(0, 80) || undefined,
      unique_filename: true,
      overwrite: false,
    });

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
  derive(
    storageKey,
    resourceType = "image",
    { width, height, crop = "limit" } = {},
  ) {
    if (!env.CLOUDINARY_CONFIGURED || !storageKey) return null;
    return cloudinary.url(storageKey, {
      resource_type: resourceType,
      secure: true,
      transformation: [
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
