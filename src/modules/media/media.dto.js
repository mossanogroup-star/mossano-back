import { storage, deliveryType } from "../../utils/storage/index.js";

/**
 * A signed, watermarked rendition of this document. Nothing leaves the API
 * pointing at the original upload — see WATERMARK in cloudinaryProvider.js.
 */
function derive(doc, options) {
  return storage.derive(doc.storageKey, doc.resourceType, {
    type: deliveryType(doc.url),
    ...options,
  });
}

/** The widths the storefront actually requests, matching its `sizes` attribute. */
const SRCSET_WIDTHS = [400, 800, 1200, 2000];

/**
 * The standard widths, plus the image's own.
 *
 * Without that last entry a 1420px slab tops out at the 1200px rendition, and a
 * full-bleed hero on a retina screen upscales it needlessly — throwing away
 * detail that is actually present in the file. These images are recovered from
 * the client's PDFs and are small to begin with, so every real pixel counts.
 *
 * Nothing is ever generated above the native width: Cloudinary would happily
 * serve a 2000px version of an 875px file, and it would only be blur.
 */
/** Retina widths a full-bleed hero actually needs. */
const HERO_UPSCALE_WIDTHS = [1920, 2560, 2880];

function buildSrcset(doc, options = {}) {
  const { upscaleTo, ...deriveOptions } = options;

  const widths = SRCSET_WIDTHS.filter((w) => !doc.width || w < doc.width);
  if (doc.width) widths.push(doc.width);

  // Renditions larger than the source, for the hero. Anything at or below the
  // source width is served normally; only the ones that would otherwise be a
  // plain stretch get the AI upscale.
  if (upscaleTo && doc.width) {
    HERO_UPSCALE_WIDTHS.filter((w) => w > doc.width && w <= upscaleTo).forEach((w) =>
      widths.push(w),
    );
  }

  return [...new Set(widths)]
    .sort((a, b) => a - b)
    .map((width) => ({
      width,
      url:
        derive(doc, {
          width,
          ...deriveOptions,
          upscale: Boolean(doc.width && width > doc.width),
        }) || doc.url,
    }));
}

/**
 * A media document as the API returns it.
 *
 * `srcset` is built here rather than in the browser because only the server
 * knows which storage provider is live. On Cloudinary these are real
 * transformation URLs; on local disk they all collapse to the original, which
 * is why the local provider is a development fallback and not a deployment
 * option.
 */
function toMediaDto(doc) {
  if (!doc) return null;
  if (!doc._id) return { id: String(doc) };

  const isImage = doc.resourceType !== "video";
  // Video: a real still for the poster, and a compressed rendition to stream.
  // Players list `url` as a fallback source, since Cloudinary will not
  // transcode a very large file on the fly.
  const isCloudVideo = !isImage && /res\.cloudinary\.com/.test(doc.url ?? "");

  const streamUrl = isCloudVideo ? derive(doc, { width: 1080 }) : null;

  return {
    id: String(doc._id),
    kind: doc.kind,
    // The stored URL is the unwatermarked original; it is only a fallback for
    // the local provider, which has no transformations to offer.
    url: (isImage ? derive(doc, { width: doc.width }) : streamUrl) || doc.url,
    thumbnailUrl:
      (isCloudVideo
        ? derive(doc, { width: 800, poster: true })
        : isImage && derive(doc, { width: 600 })) ||
      doc.thumbnailUrl ||
      doc.url,
    streamUrl,
    previewUrl: isCloudVideo ? derive(doc, { width: 480, mute: true }) : null,
    // About 1 KB. Cloudinary only: the local provider would hand back the
    // full original, which defeats the point. Unwatermarked because at 32px
    // and blurred there is nothing left to protect.
    placeholderUrl:
      isImage && doc.provider === "cloudinary"
        ? derive(doc, { width: 32, placeholder: true, watermark: false })
        : null,
    alt: doc.alt || "",
    caption: doc.caption || "",
    mimeType: doc.mimeType,
    resourceType: doc.resourceType,
    width: doc.width ?? null,
    height: doc.height ?? null,
    bytes: doc.bytes ?? null,
    createdAt: doc.createdAt,
    srcset: isImage ? buildSrcset(doc) : [],
  };
}

/** Compact shape for the admin's media picker grid. */
function toMediaOptionDto(doc) {
  return {
    id: String(doc._id),
    kind: doc.kind,
    thumbnailUrl: derive(doc, { width: 600 }) || doc.thumbnailUrl || doc.url,
    alt: doc.alt || "",
    filename: doc.filename,
  };
}

/**
 * The same image, prepared for a full-bleed hero: backdrop borders trimmed.
 *
 * Kept separate from toMediaDto because the trim only earns its cost where the
 * image runs edge to edge. On a card the border is a few pixels nobody notices,
 * and trimming everywhere would generate a second set of renditions across the
 * whole catalogue for no visible gain.
 */
function toHeroMediaDto(doc) {
  const base = toMediaDto(doc);
  if (!base || doc.resourceType === "video") return base;

  return {
    ...base,
    url:
      derive(doc, {
        width: doc.width,
        trim: doc.trimSafe !== false,
      }) || base.url,
    // trim only where it is safe for this image — see Media.trimSafe.
    srcset: buildSrcset(doc, { trim: doc.trimSafe !== false, upscaleTo: 2880 }),
  };
}

export { toMediaDto, toHeroMediaDto, toMediaOptionDto, SRCSET_WIDTHS };
