import { toMediaDto } from "../media/media.dto.js";
import { toStoneCardDto } from "../stone/stone.dto.js";
import { APPLICATIONS, labelOf } from "../stone/stone.constants.js";
import { PROJECT_SECTORS } from "./application.model.js";

function toPublicApplicationDto(doc, stones) {
  if (!doc) return null;

  const images = (doc.images ?? []).map(toMediaDto).filter(Boolean);
  const videos = (doc.videos ?? []).map(toMediaDto).filter(Boolean);

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

    // Phase-1 feedback §6 — the Projects page.
    videos,
    hasVideo: videos.length > 0,
    links: (doc.links ?? []).filter((l) => l?.label && l?.url),
    sector: doc.sector ?? null,
    sectorLabel: labelOf(PROJECT_SECTORS, doc.sector),
    areaSqFt: doc.areaSqFt ?? null,
    areaLabel: doc.areaSqFt ? `${doc.areaSqFt.toLocaleString("en-IN")} sq ft` : null,

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
    videoIds: (doc.videos ?? []).map((m) => String(m?._id ?? m)),
    coverImageId: doc.coverImage ? String(doc.coverImage?._id ?? doc.coverImage) : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export { toPublicApplicationDto, toAdminApplicationDto };
