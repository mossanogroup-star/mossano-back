/**
 * The catalogue's fixed vocabularies.
 *
 * Looks and applications are the client's own words, in code rather than a
 * collection because adding one is a design decision, not data entry.
 * Materials, colours and finishes are named as filters by the requirement
 * documents but never enumerated — see docs/CLIENT-QUESTIONS.md.
 */

/** Admin & Backend Scope §2. The whole site keys off this one field. */
const AVAILABILITY = ["available", "on_hold", "sold", "verification_required"];

const AVAILABILITY_LABELS = {
  available: "Available",
  on_hold: "On Hold",
  sold: "Sold",
  verification_required: "Verification Required",
};

/**
 * Only `available` lots may be reserved. Sold stock stays on the site — an
 * architect browsing a sold lot still learns what MOSSANO sources — but it
 * cannot be reserved, and it sorts last.
 */
const RESERVABLE_AVAILABILITY = ["available"];

/**
 * Catalogue ordering. Stored on the document as `availabilityRank` so the
 * default listing sorts on an index instead of an aggregation stage: what a
 * customer can buy today comes first, what is gone comes last.
 */
const AVAILABILITY_RANK = {
  available: 0,
  on_hold: 1,
  verification_required: 2,
  sold: 3,
};

/** Website §6 — Shop by Look. */
const LOOKS = [
  { slug: "quiet-luxury", label: "Quiet Luxury" },
  { slug: "dramatic", label: "Dramatic" },
  { slug: "warm-earthy", label: "Warm & Earthy" },
  { slug: "dark-moody", label: "Dark & Moody" },
  { slug: "green-statement", label: "Green Statement" },
  { slug: "bookmatch", label: "Bookmatch" },
];

/** Website §7 and Admin Scope §4 — the two lists are deliberately identical. */
const APPLICATIONS = [
  { slug: "bathroom-wall-floor", label: "Bathroom Wall & Floor" },
  { slug: "kitchen-wall-floor", label: "Kitchen Wall & Floor" },
  { slug: "reception-wall-floor", label: "Reception Wall & Floor" },
  { slug: "bar", label: "Bar" },
  { slug: "hotel-lobby", label: "Hotel Lobby" },
  { slug: "penthouse-flooring", label: "Penthouse Flooring" },
  { slug: "flooring", label: "Flooring" },
];

/**
 * ⚠️ Not from the client. The requirement documents list Material, Colour and
 * Finish as Stone Shop filters but never say what the options are. These are
 * the standard trade vocabulary and are pending confirmation — a filter whose
 * values do not match how MOSSANO actually describes stock is worse than none.
 */
const MATERIALS = [
  { slug: "marble", label: "Marble" },
  { slug: "granite", label: "Granite" },
  { slug: "onyx", label: "Onyx" },
  { slug: "travertine", label: "Travertine" },
  { slug: "quartzite", label: "Quartzite" },
  { slug: "limestone", label: "Limestone" },
  { slug: "semi-precious", label: "Semi-Precious" },
];

const COLOURS = [
  { slug: "white", label: "White" },
  { slug: "beige", label: "Beige" },
  { slug: "grey", label: "Grey" },
  { slug: "black", label: "Black" },
  { slug: "green", label: "Green" },
  { slug: "brown", label: "Brown" },
  { slug: "gold", label: "Gold" },
  { slug: "blue", label: "Blue" },
  { slug: "red", label: "Red" },
  { slug: "multi", label: "Multicolour" },
];

const FINISHES = [
  { slug: "polished", label: "Polished" },
  { slug: "honed", label: "Honed" },
  { slug: "leathered", label: "Leathered" },
  { slug: "brushed", label: "Brushed" },
  { slug: "flamed", label: "Flamed" },
  { slug: "sandblasted", label: "Sandblasted" },
];

const slugsOf = (list) => list.map((x) => x.slug);

const LOOK_SLUGS = slugsOf(LOOKS);
const APPLICATION_SLUGS = slugsOf(APPLICATIONS);
const MATERIAL_SLUGS = slugsOf(MATERIALS);
const COLOUR_SLUGS = slugsOf(COLOURS);
const FINISH_SLUGS = slugsOf(FINISHES);

const labelOf = (list, slug) => list.find((x) => x.slug === slug)?.label ?? null;

export {
  AVAILABILITY,
  AVAILABILITY_LABELS,
  AVAILABILITY_RANK,
  RESERVABLE_AVAILABILITY,
  LOOKS,
  APPLICATIONS,
  MATERIALS,
  COLOURS,
  FINISHES,
  LOOK_SLUGS,
  APPLICATION_SLUGS,
  MATERIAL_SLUGS,
  COLOUR_SLUGS,
  FINISH_SLUGS,
  labelOf,
};
