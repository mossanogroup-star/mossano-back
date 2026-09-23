import { toMediaDto } from "../media/media.dto.js";

/**
 * Always returns a shape, even where the team has written nothing: the page
 * renders its label and its stones regardless, and a null here would make every
 * consumer guard for it.
 */
function toLookContentDto(doc, { slug, label }) {
  return {
    look: slug,
    headline: doc?.headline || label,
    description: doc?.description || "",
    images: (doc?.images ?? []).map(toMediaDto).filter(Boolean),
    isPublished: doc ? doc.isPublished !== false : false,
  };
}

export { toLookContentDto };
