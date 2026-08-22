/**
 * Ranks every published lot by how readable ivory type is over it, and
 * optionally pins the winner as the home page hero.
 *
 * The hero is the only place on the site where type sits directly on stone, so
 * "does it look nice" is the wrong question. A pale slab with delicate figure
 * is the worst possible hero however beautiful it is. Scoring settles it:
 * MM-001 Black Marquina takes 21.7 where the median lot is around 196.
 *
 * Only the lower-left band is measured — where the wordmark, strapline and
 * buttons actually sit. Scoring the whole frame would reward a slab that is
 * dark at the top and blinding underneath.
 *
 *   node scripts/measureHeroLegibility.js          # report
 *   node scripts/measureHeroLegibility.js --set    # write HERO_STONE_CODE hint
 */
import mongoose from "mongoose";
import sharp from "sharp";
import { connectDb } from "../src/config/db.js";
import { logger } from "../src/config/logger.js";
import { StoneModel } from "../src/modules/stone/stone.model.js";
// Side-effect import: populating `images` needs the Media schema registered.
import "../src/modules/media/media.model.js";
import { getProvider } from "../src/utils/storage/index.js";

const SET = process.argv.includes("--set");

/** The text block as a fraction of the frame, mirroring HomePage's hero. */
const REGION = { left: 0, top: 0.55, width: 0.62, height: 0.45 };

/** Highlights dominate: one bright vein through the "M" beats a dull average. */
const WEIGHT = { brightness: 1.0, variance: 0.8, highlights: 1.6 };

const SAMPLE_WIDTH = 600;

async function score(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const base = sharp(Buffer.from(await res.arrayBuffer()))
    .resize({ width: SAMPLE_WIDTH })
    .greyscale();
  const { width, height } = await base.metadata();
  if (!width || !height) throw new Error("no dimensions");

  const region = {
    left: Math.round(width * REGION.left),
    top: Math.round(height * REGION.top),
    width: Math.min(Math.round(width * REGION.width), width),
    height: Math.min(Math.round(height * REGION.height), height - Math.round(height * REGION.top)),
  };

  const { data } = await sharp(await base.toBuffer())
    .extract(region)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = Array.from(data);
  const mean = px.reduce((a, b) => a + b, 0) / px.length;
  const variance = Math.sqrt(px.reduce((a, p) => a + (p - mean) ** 2, 0) / px.length);
  // 95th percentile, not max — one hot compression pixel is not a problem.
  const highlights = px.slice().sort((a, b) => a - b)[Math.floor(px.length * 0.95)];

  return {
    brightness: +mean.toFixed(1),
    variance: +variance.toFixed(1),
    highlights,
    total: +(
      (mean / 255) * 100 * WEIGHT.brightness +
      (variance / 128) * 100 * WEIGHT.variance +
      (highlights / 255) * 100 * WEIGHT.highlights
    ).toFixed(1),
  };
}

async function main() {
  await connectDb();

  const stones = await StoneModel.find({ isDeleted: false, isPublished: true })
    .select("name mossanoCode primaryImageUrl images")
    .populate({ path: "images", select: "url storageKey resourceType" })
    .lean();

  const results = [];
  for (const stone of stones) {
    const media = stone.images?.[0];
    const url =
      getProvider("cloudinary").derive?.(media?.storageKey, media?.resourceType, {
        width: SAMPLE_WIDTH,
      }) ||
      media?.url ||
      stone.primaryImageUrl;
    if (!url) continue;

    try {
      results.push({ stone, ...(await score(url)) });
    } catch (err) {
      logger.warn({ code: stone.mossanoCode, err: err.message }, "Could not measure");
    }
  }

  results.sort((a, b) => a.total - b.total);

  console.log("\n  rank  score  bright   var   hi   stone");
  console.log("  " + "-".repeat(56));
  results.forEach((r, i) => {
    console.log(
      `  ${String(i + 1).padStart(3)}${i === 0 ? "*" : " "} ${String(r.total).padStart(6)} ` +
        `${String(r.brightness).padStart(6)} ${String(r.variance).padStart(5)} ` +
        `${String(r.highlights).padStart(4)}   ${r.stone.mossanoCode} ${r.stone.name}`,
    );
  });

  const winner = results[0];
  if (!winner) {
    console.log("\n  Nothing to measure.");
  } else if (SET) {
    // Deliberately does not write to the database. The hero is pinned by
    // HERO_STONE_CODE so it cannot drift with inventory — see config/env.js.
    console.log(
      `\n  Set this in mossano-back/.env:\n\n    HERO_STONE_CODE=${winner.stone.mossanoCode}\n`,
    );
  } else {
    console.log(
      `\n  Most legible: ${winner.stone.mossanoCode} ${winner.stone.name} (${winner.total})` +
        `\n  Re-run with --set for the line to put in .env.`,
    );
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  logger.fatal({ err }, "Measurement failed");
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
