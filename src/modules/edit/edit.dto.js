import { toMediaDto } from "../media/media.dto.js";
import { toStoneCardDto, toPublicStoneDto } from "../stone/stone.dto.js";
import { EDIT_STATUS_LABELS, EDIT_STATUS_CTA } from "./edit.model.js";

/**
 * The Edit as the storefront renders it.
 *
 * `cta` travels with the Edit rather than being decided in the component,
 * because Website §2 ties the customer action to the band: Current offers
 * Reserve, Next offers Pre-Book, Upcoming offers Register Interest. Keeping
 * that mapping on the server means the New Edit page and the Edit's own page
 * cannot drift apart.
 */
function toPublicEditDto(doc, { stones } = {}) {
  if (!doc) return null;

  const resolved = stones ?? doc.resolvedStones;

  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    subtitle: doc.subtitle || "",
    description: doc.description || "",
    status: doc.status,
    statusLabel: EDIT_STATUS_LABELS[doc.status] ?? doc.status,
    cta: EDIT_STATUS_CTA[doc.status] ?? EDIT_STATUS_CTA.archived,
    periodStart: doc.periodStart ?? null,
    coverImage: toMediaDto(doc.coverImage),
    images: (doc.images ?? []).map(toMediaDto).filter(Boolean),
    href: `/new-edit/${doc.slug}`,
    stoneCount: resolved?.length ?? (doc.stones ?? []).length,
    stones: resolved ? resolved.map(toStoneCardDto) : undefined,
  };
}

/** The Edit's own page needs the full stone shape, not the card shape. */
function toPublicEditDetailDto(doc, stones) {
  return {
    ...toPublicEditDto(doc, { stones: [] }),
    stoneCount: stones.length,
    stones: stones.map(toPublicStoneDto),
  };
}

function toAdminEditDto(doc, stones) {
  return {
    ...toPublicEditDto(doc, { stones: stones ?? [] }),
    isPublished: Boolean(doc.isPublished),
    stoneIds: (doc.stones ?? []).map((s) => String(s?._id ?? s)),
    imageIds: (doc.images ?? []).map((m) => String(m?._id ?? m)),
    coverImageId: doc.coverImage ? String(doc.coverImage?._id ?? doc.coverImage) : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export { toPublicEditDto, toPublicEditDetailDto, toAdminEditDto };
