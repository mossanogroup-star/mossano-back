import { storage } from "../../utils/storage/index.js";

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
function buildSrcset(doc, options = {}) {
  const widths = SRCSET_WIDTHS.filter((w) => !doc.width || w < doc.width);
  if (doc.width) widths.push(doc.width);

  return [...new Set(widths)]
    .sort((a, b) => a - b)
    .map((width) => ({
      width,
      url:
        storage.derive(doc.storageKey, doc.resourceType, {
          width,
          ...options,
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

  return {
    id: String(doc._id),
    kind: doc.kind,
    url: doc.url,
    thumbnailUrl: doc.thumbnailUrl || doc.url,
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
    thumbnailUrl: doc.thumbnailUrl || doc.url,
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
      storage.derive(doc.storageKey, doc.resourceType, {
        width: doc.width,
        trim: true,
      }) || base.url,
    srcset: buildSrcset(doc, { trim: true }),
  };
}

export { toMediaDto, toHeroMediaDto, toMediaOptionDto, SRCSET_WIDTHS };
