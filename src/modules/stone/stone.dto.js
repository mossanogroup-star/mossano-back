import { toMediaDto } from "../media/media.dto.js";
import { countryLabel } from "../../config/countries.generated.js";
import {
  AVAILABILITY_LABELS,
  RESERVABLE_AVAILABILITY,
  LOOKS,
  APPLICATIONS,
  MATERIALS,
  COLOURS,
  WHITE_SUBCATEGORIES,
  FINISHES,
  labelOf,
} from "./stone.constants.js";
import {
  whatsappLink,
  stoneEnquiryMessage,
  slabVideoMessage,
  reserveMessage,
} from "../../utils/whatsapp.js";

/**
 * How fresh the availability claim is, as words.
 *
 * Computed on the server on purpose. The storefront is server-rendered, and a
 * relative time computed again in the browser would disagree with the HTML the
 * server produced — React reports that as a hydration mismatch and, worse, the
 * text visibly changes under the reader. One clock, one answer.
 */
function verifiedLabel(lastVerifiedAt) {
  if (!lastVerifiedAt) return null;

  const then = new Date(lastVerifiedAt).getTime();
  const hours = Math.floor((Date.now() - then) / 3_600_000);

  if (hours < 1) return "Availability verified in the last hour";
  if (hours < 24) return `Availability verified ${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Availability verified yesterday";
  if (days < 30) return `Availability verified ${days} days ago`;

  const months = Math.floor(days / 30);
  return `Availability last verified ${months} month${months === 1 ? "" : "s"} ago`;
}

/** "Verified today" is only a trust signal while it is actually recent. */
const VERIFIED_FRESH_HOURS = 48;

function isVerificationFresh(lastVerifiedAt) {
  if (!lastVerifiedAt) return false;
  return Date.now() - new Date(lastVerifiedAt).getTime() < VERIFIED_FRESH_HOURS * 3_600_000;
}

/**
 * The spec block, already resolved to display strings.
 *
 * "On request" is applied here rather than in the storefront so there is one
 * place that decides what an absent field looks like. Origin, thickness and
 * finish are in none of the client's catalogues — see docs/CLIENT-QUESTIONS.md —
 * and inventing a plausible value for any of them would undercut the only thing
 * MOSSANO sells, which is that the listing is true.
 */
const ON_REQUEST = "On request";

/**
 * Phase-3 feedback dropped the approximate slab size and approximate area rows
 * outright — a figure the customer has to treat as "approximate" is one they
 * have to confirm anyway, so it was costing a line and buying nothing. Both
 * values are still stored, still editable in the admin and still on the DTO.
 */
function buildSpecs(doc) {
  /**
   * Phase-3 feedback — the origin is a country now, with the free-text field
   * left for the quarry or region. "Carrara" + `it` reads "Carrara, Italy";
   * either alone still reads correctly on its own.
   */
  const countryName = countryLabel(doc.originCountry);
  const originValue = [doc.origin, countryName].filter(Boolean).join(", ");

  return [
    { label: "Origin", value: originValue || ON_REQUEST },
    {
      label: "Material",
      value: labelOf(MATERIALS, doc.material) || ON_REQUEST,
    },
    { label: "Finish", value: labelOf(FINISHES, doc.finish) || ON_REQUEST },
    {
      label: "Thickness",
      value: doc.thicknessMm ? `${doc.thicknessMm} mm` : ON_REQUEST,
    },
  ];
}

function mediaList(list) {
  return (list ?? []).map(toMediaDto).filter(Boolean);
}

/**
 * The storefront shape. Deliberately narrower than the admin one — internal
 * notes, the supplier's lot number, and who last touched the record never reach
 * a customer.
 */
function toPublicStoneDto(doc) {
  if (!doc) return null;

  const images = mediaList(doc.images);
  const primaryImage = images[0] ?? null;

  return {
    id: String(doc._id),
    slug: doc.slug,
    mossanoCode: doc.mossanoCode,
    name: doc.name,

    material: doc.material ?? null,
    materialLabel: labelOf(MATERIALS, doc.material),
    colour: doc.colour ?? null,
    colourLabel: labelOf(COLOURS, doc.colour),
    whiteSubcategory: doc.whiteSubcategory ?? null,
    whiteSubcategoryLabel: labelOf(WHITE_SUBCATEGORIES, doc.whiteSubcategory),
    origin: doc.origin ?? null,
    /** The flag is /flags/<code>.svg — no lookup table anywhere. */
    originCountry: doc.originCountry ?? null,
    originCountryLabel: countryLabel(doc.originCountry),
    finish: doc.finish ?? null,
    finishLabel: labelOf(FINISHES, doc.finish),
    thicknessMm: doc.thicknessMm ?? null,

    slabLengthIn: doc.slabLengthIn ?? null,
    slabWidthIn: doc.slabWidthIn ?? null,
    slabCount: doc.slabCount ?? null,
    areaSqFt: doc.areaSqFt ?? null,
    approxSlabSize: doc.approxSlabSize ?? null,

    looks: (doc.looks ?? []).map((slug) => ({
      slug,
      label: labelOf(LOOKS, slug),
    })),
    applications: (doc.applications ?? []).map((slug) => ({
      slug,
      label: labelOf(APPLICATIONS, slug),
    })),

    availability: doc.availability,
    availabilityLabel: AVAILABILITY_LABELS[doc.availability] ?? doc.availability,
    isReservable: RESERVABLE_AVAILABILITY.includes(doc.availability),
    lastVerifiedAt: doc.lastVerifiedAt ?? null,
    verifiedLabel: verifiedLabel(doc.lastVerifiedAt),
    isVerificationFresh: isVerificationFresh(doc.lastVerifiedAt),
    /** Website §2's "MOSSANO verified lot" badge — earned, not decorative. */
    isVerifiedLot: doc.availability === "available" && isVerificationFresh(doc.lastVerifiedAt),

    description: doc.description || "",
    specs: buildSpecs(doc),

    primaryImage,
    primaryImageUrl: doc.primaryImageUrl || primaryImage?.url || null,
    images,
    videos: mediaList(doc.videos),
    hasVideo: (doc.videos ?? []).length > 0,

    /** Website §4 — "individual slab images where available". */
    slabs: (doc.slabs ?? []).map((slab) => ({
      id: String(slab._id),
      reference: slab.reference ?? null,
      image: toMediaDto(slab.image),
      lengthIn: slab.lengthIn ?? null,
      widthIn: slab.widthIn ?? null,
      isSold: Boolean(slab.isSold),
    })),

    isFeatured: Boolean(doc.isFeatured),
    href: `/stone/${doc.slug}`,

    // Assembled server-side so the links are in the HTML a crawler sees and
    // work with JavaScript disabled. Admin Scope §8.
    whatsapp: {
      enquire: whatsappLink(stoneEnquiryMessage(doc)),
      requestVideo: whatsappLink(slabVideoMessage(doc)),
      reserve: whatsappLink(reserveMessage(doc)),
    },
  };
}

/** Card shape: everything a grid tile needs, nothing it does not. */
function toStoneCardDto(doc) {
  if (!doc) return null;
  const primaryImage = mediaList(doc.images)[0] ?? null;

  return {
    id: String(doc._id),
    slug: doc.slug,
    mossanoCode: doc.mossanoCode,
    name: doc.name,
    origin: doc.origin ?? null,
    originCountry: doc.originCountry ?? null,
    originCountryLabel: countryLabel(doc.originCountry),
    colour: doc.colour ?? null,
    availability: doc.availability,
    availabilityLabel: AVAILABILITY_LABELS[doc.availability] ?? doc.availability,
    isReservable: RESERVABLE_AVAILABILITY.includes(doc.availability),
    isVerifiedLot: doc.availability === "available" && isVerificationFresh(doc.lastVerifiedAt),
    verifiedLabel: verifiedLabel(doc.lastVerifiedAt),
    slabCount: doc.slabCount ?? null,
    areaSqFt: doc.areaSqFt ?? null,
    primaryImage,
    primaryImageUrl: doc.primaryImageUrl || primaryImage?.url || null,
    href: `/stone/${doc.slug}`,
    whatsapp: { enquire: whatsappLink(stoneEnquiryMessage(doc)) },
  };
}

/** Everything the team can see, including what customers must not. */
function toAdminStoneDto(doc) {
  if (!doc) return null;
  return {
    ...toPublicStoneDto(doc),
    lotNumber: doc.lotNumber ?? null,
    internalNotes: doc.internalNotes || "",
    isPublished: doc.isPublished !== false,
    imageIds: (doc.images ?? []).map((m) => String(m?._id ?? m)),
    videoIds: (doc.videos ?? []).map((m) => String(m?._id ?? m)),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export {
  toPublicStoneDto,
  toStoneCardDto,
  toAdminStoneDto,
  verifiedLabel,
  isVerificationFresh,
  ON_REQUEST,
};
