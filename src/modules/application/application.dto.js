import { toMediaDto } from "../media/media.dto.js";
import { toStoneCardDto } from "../stone/stone.dto.js";
import { APPLICATIONS, labelOf } from "../stone/stone.constants.js";

function toPublicApplicationDto(doc, stones) {
  if (!doc) return null;

  const images = (doc.images ?? []).map(toMediaDto).filter(Boolean);

  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    application: doc.application,
    applicationLabel: labelOf(APPLICATIONS, doc.application),
    projectName: doc.projectName ?? null,
    location: doc.location ?? null,
    architect: doc.architect ?? null,
    description: doc.description || "",
    coverImage: toMediaDto(doc.coverImage) ?? images[0] ?? null,
    images,
    isFeatured: Boolean(doc.isFeatured),
    href: `/application/${doc.application}/${doc.slug}`,
    // The whole point of the module: the room leads back to the lot.
    stones: stones ? stones.map(toStoneCardDto) : undefined,
    stoneCount: stones?.length ?? (doc.stones ?? []).length,
  };
}

function toAdminApplicationDto(doc, stones) {
  return {
    ...toPublicApplicationDto(doc, stones),
    isPublished: doc.isPublished !== false,
    stoneIds: (doc.stones ?? []).map((s) => String(s?._id ?? s)),
    imageIds: (doc.images ?? []).map((m) => String(m?._id ?? m)),
    coverImageId: doc.coverImage
      ? String(doc.coverImage?._id ?? doc.coverImage)
      : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export { toPublicApplicationDto, toAdminApplicationDto };
