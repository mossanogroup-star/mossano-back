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
  /**
   * Phase-3 feedback — "exotic collection under Look". It was a colour, which
   * it never was: exotic describes how rare the stone is, not what shade it is,
   * and a lot can be exotic *and* white. As a look it can carry its own
   * photography, which is where the client wants to upload it.
   */
  { slug: "exotic", label: "Exotic" },
];

// Empty by the client's request (2 Oct 2026): the seven from the requirement
// document were removed with the test data. Every application is now added
// from the admin and loaded in at startup — see applicationService.loadCategories.
const APPLICATIONS = [];

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
  // Client request (24 Oct 2026) — landscape stone gets its own colour list in
  // the shop, shown in the admin while this is the material.
  { slug: "landscape", label: "Landscape" },
];

/**
 * Phase-3 feedback names the ten, in this order. "Exotic" left the list and
 * became a Look — see LOOKS above — and green, brown and red came back for the
 * same reason they were cut in Phase 1: the catalogue now has stock to put in
 * them. Exotic was added back here on 10 Oct 2026 at the client's request; the
 * Look stays too.
 */
const COLOURS = [
  { slug: "beige", label: "Beige" },
  { slug: "black", label: "Black" },
  { slug: "grey", label: "Grey" },
  { slug: "white", label: "White" },
  { slug: "blue", label: "Blue" },
  { slug: "green", label: "Green" },
  { slug: "brown", label: "Brown" },
  { slug: "red", label: "Red" },
  { slug: "onyx", label: "Onyx" },
  { slug: "travertine", label: "Travertine" },
  // Client request (10 Oct 2026) — "in colour family please add exotic". Back
  // as a colour as well as a Look: the team files rare lots under it in both.
  { slug: "exotic", label: "Exotic" },
];

/**
 * Phase-3 feedback — "in white we need sub category". White is most of what
 * MOSSANO imports, so one White filter returns half the catalogue; these are
 * the client's own names for what is actually different about those lots.
 *
 * Only meaningful on a white lot. Nothing enforces that — a sub-category on a
 * black lot is a data-entry mistake, not a security problem, and the filter
 * only ever appears underneath White.
 */
const WHITE_SUBCATEGORIES = [
  { slug: "statuario", label: "Statuario" },
  { slug: "calacatta", label: "Calacatta" },
  { slug: "michelangelo", label: "Michelangelo" },
  { slug: "volakas", label: "Volakas" },
  { slug: "angilo-white", label: "Angilo White" },
  { slug: "vietnam-white", label: "Vietnam White" },
  { slug: "swiss-white", label: "Swiss White" },
];

/**
 * Client request (22 Oct 2026) — a Granite section beneath White, carrying
 * every colour, with the colour list above it renamed "Marble Colour".
 *
 * Its own field rather than `material: granite` plus `colour`: the two lists
 * filter independently, so a customer can tick Marble Colour → White and
 * Granite → Black together and get both, not the empty intersection. The
 * options are the colour family itself, so a colour added there appears here
 * too.
 */
// Client request (24 Oct 2026) — Onyx and Travertine are stones, not granite
// colours, so the list leaves them out.
const NOT_GRANITE = ["onyx", "travertine"];
const GRANITE_COLOURS = COLOURS.filter((c) => !NOT_GRANITE.includes(c.slug));

/**
 * Client request (24 Oct 2026) — a Landscape section beneath Granite with a
 * single option, Landscape. Its own field for the same reason as Granite's.
 */
const LANDSCAPE_COLOURS = [{ slug: "landscape", label: "Landscape" }];

const FINISHES = [
  { slug: "polished", label: "Polished" },
  { slug: "honed", label: "Honed" },
  { slug: "leathered", label: "Leathered" },
  { slug: "brushed", label: "Brushed" },
  { slug: "flamed", label: "Flamed" },
  { slug: "sandblasted", label: "Sandblasted" },
  // Client request (24 Oct 2026) — the granite finishes the list above lacked.
  { slug: "lappato", label: "Lappato" },
  { slug: "bush-hammered", label: "Bush Hammered" },
  { slug: "shot-blasted", label: "Shot Blast" },
  { slug: "river-washed", label: "River Wash" },
  { slug: "cnc", label: "CNC" },
];

/**
 * Client request (24 Oct 2026) — "Application: interior / exterior". Its own
 * field rather than two more application categories: those each get a public
 * Shop by Application page, and where a stone can go is a spec, not a page.
 */
const PLACEMENTS = [
  { slug: "interior", label: "Interior" },
  { slug: "exterior", label: "Exterior" },
];

/**
 * Client request (24 Oct 2026) — what a granite lot is offered in. The admin
 * fills in the origin and narrows the finish list and thickness to these
 * while Granite is the material; the stone service holds the thickness to it.
 */
const GRANITE_SPEC = {
  origin: "Indo Italian",
  finishes: [
    "polished",
    "leathered",
    "lappato",
    "bush-hammered",
    "sandblasted",
    "shot-blasted",
    "flamed",
    "river-washed",
    "cnc",
  ],
  thicknessMm: { min: 17, max: 100 },
  /** Client request (27 Oct 2026) — what a granite lot's thickness reads. */
  thickness: "17-100",
};

/**
 * Client request (27 Oct 2026) — thickness is a single figure ("18") or a
 * range ("17-100"), in mm. Returns [low, high], or null when it is neither.
 */
function thicknessRange(value) {
  const match = /^(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?$/.exec(String(value).trim());
  if (!match) return null;
  const low = Number(match[1]);
  const high = match[2] === undefined ? low : Number(match[2]);
  return low <= high ? [low, high] : null;
}

const slugsOf = (list) => list.map((x) => x.slug);

const LOOK_SLUGS = slugsOf(LOOKS);
const APPLICATION_SLUGS = slugsOf(APPLICATIONS);
const MATERIAL_SLUGS = slugsOf(MATERIALS);
const COLOUR_SLUGS = slugsOf(COLOURS);
const WHITE_SUBCATEGORY_SLUGS = slugsOf(WHITE_SUBCATEGORIES);
const GRANITE_COLOUR_SLUGS = slugsOf(GRANITE_COLOURS);
const LANDSCAPE_COLOUR_SLUGS = slugsOf(LANDSCAPE_COLOURS);
const FINISH_SLUGS = slugsOf(FINISHES);
const PLACEMENT_SLUGS = slugsOf(PLACEMENTS);

/** Live check: APPLICATIONS grows at runtime when the team adds one. */
const isApplicationSlug = (slug) => APPLICATION_SLUGS.includes(slug);

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
  WHITE_SUBCATEGORIES,
  GRANITE_COLOURS,
  LANDSCAPE_COLOURS,
  FINISHES,
  PLACEMENTS,
  GRANITE_SPEC,
  LOOK_SLUGS,
  APPLICATION_SLUGS,
  isApplicationSlug,
  MATERIAL_SLUGS,
  COLOUR_SLUGS,
  WHITE_SUBCATEGORY_SLUGS,
  GRANITE_COLOUR_SLUGS,
  LANDSCAPE_COLOUR_SLUGS,
  FINISH_SLUGS,
  PLACEMENT_SLUGS,
  thicknessRange,
  labelOf,
};
