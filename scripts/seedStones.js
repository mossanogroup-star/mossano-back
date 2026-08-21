/**
 * Seeds the catalogue from the transcription in mossano-front/src/data/stones.js.
 *
 * Those 23 records were read off the client's own catalogue pages — the captions
 * are burnt into the photographs, so the file is a transcription, not a data
 * source. This script moves it into MongoDB, uploads the matching cropped slab
 * through the storage provider, and hands the catalogue over to the admin panel.
 *
 * Two things it deliberately does not do:
 *
 *   - It does not invent origin, finish or thickness. Those appear in none of
 *     the three catalogues, so they stay absent and the site renders
 *     "On request". See docs/CLIENT-QUESTIONS.md.
 *   - It does not mark anything Available. Nobody has verified these lots since
 *     the PDFs were printed, so they seed as `verification_required` and the
 *     team confirms them from the dashboard's verification queue.
 *
 * Idempotent: a stone already seeded (matched on lot number, or on name where
 * there is no lot) is updated, not duplicated. Run it again after adding
 * Cloudinary credentials with `--reupload` to move the imagery across.
 *
 *   node scripts/seedStones.js
 *   node scripts/seedStones.js --reupload
 */
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { connectDb } from "../src/config/db.js";
import { logger } from "../src/config/logger.js";
import { StoneModel } from "../src/modules/stone/stone.model.js";
import { EditModel } from "../src/modules/edit/edit.model.js";
import { MediaModel } from "../src/modules/media/media.model.js";
import { storage, storageProviderName } from "../src/utils/storage/index.js";
import { slugify, uniqueSlug } from "../src/utils/slugify.js";
import { AVAILABILITY_RANK } from "../src/modules/stone/stone.constants.js";
import { ensureCounterAtLeast, nextSequence } from "../src/utils/counter.js";

const REUPLOAD = process.argv.includes("--reupload");
const SLAB_DIR = path.join(env.FRONTEND_DIR, "public/slabs");
const TRANSCRIPTION = path.join(env.FRONTEND_DIR, "src/data/stones.js");

/**
 * The transcription tagged each stone with a single look, using two slugs —
 * `green` and `statement` — that the requirement document later merged into
 * "Green Statement". Mapped here rather than edited in place, so the
 * transcription stays a faithful record of what was read off the pages.
 */
const LOOK_MAP = {
  "quiet-luxury": ["quiet-luxury"],
  dramatic: ["dramatic"],
  "warm-earthy": ["warm-earthy"],
  "dark-moody": ["dark-moody"],
  green: ["green-statement"],
  statement: ["green-statement"],
};

/** The transcription's collection is a colour family, not a taxonomy of its own. */
const COLOUR_MAP = { beige: "beige", black: "black", grey: "grey" };

async function loadTranscription() {
  // Imported rather than parsed: it is a real ES module, and importing it means
  // the seed cannot drift from what the file actually exports.
  const url = new URL(`file:///${TRANSCRIPTION.replace(/\\/g, "/")}`);
  const mod = await import(url.href);
  return {
    stones: mod.STONES,
    editIds: mod.NEW_EDIT_IDS,
    editMonth: mod.EDIT_MONTH,
  };
}

/**
 * Uploads a cropped slab and records it as Media.
 *
 * Reuses an existing record keyed on the original filename unless --reupload is
 * passed, so re-running after adding Cloudinary credentials is what moves the
 * imagery rather than a manual migration.
 */
async function uploadSlab(relativePath, altText) {
  const filename = path.basename(relativePath);

  if (!REUPLOAD) {
    const existing = await MediaModel.findOne({
      filename,
      kind: "slab",
      isDeleted: false,
      provider: storageProviderName,
    }).lean();
    if (existing) return existing;
  }

  const absolute = path.join(SLAB_DIR, relativePath);
  let buffer;
  try {
    buffer = await fs.readFile(absolute);
  } catch {
    logger.warn(
      { absolute },
      "Slab image missing — stone will seed without photography",
    );
    return null;
  }

  const stored = await storage.upload(buffer, {
    filename,
    mimeType: "image/webp",
    folder: "slabs",
  });

  return MediaModel.create({
    filename,
    mimeType: "image/webp",
    kind: "slab",
    alt: altText,
    ...stored,
  });
}

async function seedStone(raw, index) {
  const name = raw.name ?? `Lot ${raw.lot}`;

  // Match on the supplier's lot number where there is one — it is the only
  // stable identity in the source material. Names repeat (three lots are all
  // "Classic Beige"), so a name match alone would collapse distinct lots.
  const match = raw.lot
    ? { lotNumber: raw.lot }
    : { name, lotNumber: { $in: [null, undefined] } };
  const existing = await StoneModel.findOne({ ...match, isDeleted: false });

  const media = await uploadSlab(raw.image, `${name} — natural stone slab`);

  const fields = {
    name,
    lotNumber: raw.lot ?? undefined,
    material: "marble",
    colour: COLOUR_MAP[raw.collection],
    looks: LOOK_MAP[raw.look] ?? [],

    slabLengthIn: raw.slabL ?? undefined,
    slabWidthIn: raw.slabW ?? undefined,
    slabCount: raw.slabs ?? undefined,
    areaSqFt: raw.sqft ?? undefined,

    // Absent in the source, and left absent. The site renders "On request".
    origin: undefined,
    finish: undefined,
    thicknessMm: undefined,

    availability: "verification_required",
    availabilityRank: AVAILABILITY_RANK.verification_required,
    isPublished: true,
    internalNotes:
      "Seeded from the client's PDF catalogues. Origin, finish and thickness are " +
      "not recorded in the source material — confirm with the client before publishing them.",
  };

  if (media) {
    fields.images = [media._id];
    fields.primaryImageUrl = media.url;
    fields.primaryImageAlt = media.alt;
  }

  if (existing) {
    Object.assign(existing, fields);
    // Never rewrite an identity that may already be in circulation.
    existing.slug = existing.slug || slugify(name);
    await existing.save();
    return { stone: existing, created: false };
  }

  const slug = await uniqueSlug(
    name,
    async (s) => Boolean(await StoneModel.exists({ slug: s })),
    {
      discriminator: raw.lot,
    },
  );
  const seq = await nextSequence("stone-code");

  const stone = await StoneModel.create({
    ...fields,
    slug,
    mossanoCode: `MM-${String(seq).padStart(3, "0")}`,
    // The transcription's own ordering is the catalogue's ordering.
    isFeatured: index < 6,
  });
  return { stone, created: true };
}

/**
 * The August 2026 Edit, from the hand-picked list in the transcription. It is
 * created as a draft: Admin Scope §3 puts publishing an Edit in the team's
 * hands, and a seed script should not push a collection live on their behalf.
 */
async function seedEdit(stonesBySourceId, editIds, editMonth) {
  const stoneIds = editIds
    .map((id) => stonesBySourceId.get(id)?._id)
    .filter(Boolean);
  if (!stoneIds.length) return null;

  const slug = slugify(editMonth);
  const existing = await EditModel.findOne({ slug });

  if (existing) {
    existing.stones = stoneIds;
    await existing.save();
    return existing;
  }

  return EditModel.create({
    title: editMonth,
    slug,
    subtitle: "The current curation",
    status: "current",
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    stones: stoneIds,
    isPublished: false,
  });
}

async function main() {
  await connectDb();

  const {
    stones: transcription,
    editIds,
    editMonth,
  } = await loadTranscription();
  logger.info(
    {
      count: transcription.length,
      storage: storageProviderName,
      reupload: REUPLOAD,
    },
    "Seeding catalogue",
  );

  // Take the code counter past anything already issued, so a re-run never
  // reissues a MOSSANO code that is already on a stone.
  const highest = await StoneModel.findOne({ mossanoCode: /^MM-\d+$/ })
    .sort({ mossanoCode: -1 })
    .select("mossanoCode")
    .lean();
  await ensureCounterAtLeast(
    "stone-code",
    highest ? Number(highest.mossanoCode.replace(/^MM-/, "")) : 0,
  );

  const bySourceId = new Map();
  let created = 0;
  let updated = 0;

  for (const [index, raw] of transcription.entries()) {
    const { stone, created: isNew } = await seedStone(raw, index);
    bySourceId.set(raw.id, stone);
    if (isNew) created += 1;
    else updated += 1;
  }

  const edit = await seedEdit(bySourceId, editIds, editMonth);

  logger.info(
    { created, updated, edit: edit?.title, editStones: edit?.stones.length },
    "Catalogue seeded",
  );
  logger.info(
    "Every lot is `verification_required` — confirm availability from the admin " +
      "dashboard before the Edit goes live.",
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  logger.fatal({ err }, "Seed failed");
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
