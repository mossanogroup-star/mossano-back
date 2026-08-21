import { storage } from "../../utils/storage/index.js";

/** The widths the storefront actually requests, matching its `sizes` attribute. */
const SRCSET_WIDTHS = [400, 800, 1200, 2000];

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
    srcset: isImage
      ? SRCSET_WIDTHS.filter((w) => !doc.width || w <= doc.width * 1.2).map((width) => ({
          width,
          url: storage.derive(doc.storageKey, doc.resourceType, { width }) || doc.url,
        }))
      : [],
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

export { toMediaDto, toMediaOptionDto, SRCSET_WIDTHS };
