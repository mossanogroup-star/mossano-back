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

/**
 * Burnt into every delivered rendition, images and video alike. A screenshot
 * cannot be blocked by any website; a screenshot that carries the name can be.
 * Small and bottom-right at the client's request, so it does not compete with
 * the stone. Scaled to the rendition's width so a 400px card and a 2000px
 * detail view read the same.
 */
const WATERMARK = [
  {
    overlay: {
      font_family: "Arial",
      font_size: 120,
      font_weight: "bold",
      letter_spacing: 24,
      stroke: "stroke",
      text: "MOSSANO",
    },
    color: "#FFFFFF",
    // A dark outline, so the mark still reads on white marble.
    border: "3px_solid_rgb:00000080",
    opacity: 60,
    width: 0.16,
    flags: "relative",
    crop: "scale",
  },
  // x/y under 1 are fractions of the image, so the margin scales with it.
  { flags: "layer_apply", gravity: "south_east", x: 0.03, y: 0.04 },
];

/**
 * Applied to images before Cloudinary stores them, so the master itself is
 * smaller, not only what visitors download. 2880px is the widest rendition the
 * storefront ever asks for (the retina hero, HERO_UPSCALE_WIDTHS in media.dto),
 * so nothing above it is ever seen. auto:best is Cloudinary's highest automatic
 * quality — the stored file loses no visible detail, and every delivery is
 * re-encoded from it with q_auto/f_auto anyway.
 *
 * Videos are stored as uploaded: an incoming transcode runs inside the upload
 * request, and a 100 MB file would time it out. Their renditions are already
 * compressed at delivery.
 */
const SHRINK_IMAGE = {
  format: "webp",
  transformation: [{ width: 2880, height: 2880, crop: "limit", quality: "auto:best" }],
};

/** A stored delivery URL says which delivery type the asset lives under. */
function deliveryType(url) {
  return /\/authenticated\//.test(url ?? "") ? "authenticated" : "upload";
}

const cloudinaryProvider = {
  name: "cloudinary",

  async upload(buffer, { filename, folder, isVideo = false }) {
    const result = await uploadBuffer(buffer, {
      folder: [env.CLOUDINARY_FOLDER, folder].filter(Boolean).join("/"),
      resource_type: AUTO_RESOURCE_TYPE,
      // Cloudinary appends its own suffix, so re-uploading never overwrites.
      public_id: filename?.replace(/\.[^.]+$/, "").slice(0, 80) || undefined,
      unique_filename: true,
      overwrite: false,
      // Not reachable by a bare URL: every delivery must be signed, so the
      // watermark cannot be stripped by editing the address.
      type: "authenticated",
      ...(isVideo ? {} : SHRINK_IMAGE),
    });

    const resourceType = result.resource_type ?? "image";

    return {
      provider: "cloudinary",
      storageKey: result.public_id,
      resourceType,
      url: result.secure_url,
      thumbnailUrl: this.derive(result.public_id, resourceType, {
        width: 600,
        type: "authenticated",
      }),
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
    {
      width,
      height,
      crop = "limit",
      trim = false,
      upscale = false,
      poster = false,
      mute = false,
      /** A tiny blurred copy, painted while the real image loads. */
      placeholder = false,
      /** "authenticated" for anything uploaded or migrated since protection — see deliveryType(). */
      type = "upload",
      watermark = true,
      /** Returns the rendition's JSON metadata instead of the image. */
      info = false,
    } = {},
  ) {
    if (!env.CLOUDINARY_CONFIGURED || !storageKey) return null;
    return cloudinary.url(storageKey, {
      resource_type: resourceType,
      type,
      // The signature covers the transformation, so a URL with the watermark
      // step cut out is rejected rather than served.
      sign_url: true,
      secure: true,
      // A video's still frame, as a JPEG — without it `f_auto` on a video URL
      // returns another video, which a <video poster> cannot show.
      ...(poster ? { format: "jpg" } : {}),
      transformation: [
        ...(poster ? [{ start_offset: "1" }] : []),
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
        // Tile previews loop silently; dropping the track saves the bytes.
        ...(mute ? [{ audio_codec: "none" }] : []),
        ...(watermark ? WATERMARK : []),
        ...(info ? [{ flags: "getinfo" }] : []),
        ...(placeholder ? [{ effect: "blur:300" }] : []),
        { quality: placeholder ? "auto:low" : "auto", fetch_format: "auto" },
      ],
    });
  },

  async remove(storageKey, resourceType = "image", type = "upload") {
    if (!storageKey) return;
    await cloudinary.uploader.destroy(storageKey, {
      resource_type: resourceType,
      type,
      invalidate: true,
    });
  },
};

export { cloudinaryProvider, deliveryType };
