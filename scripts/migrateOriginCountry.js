/**
 * Converts the free-text `origin` on existing lots into an `originCountry` code.
 *
 * Origin used to be typed. It is a country picker now, because the flag on the
 * stone page is built from the code and a typed country silently lost its flag.
 * This reads what is already stored, matches it against countries.generated.js,
 * and fills in the code — leaving anything it cannot match alone rather than
 * guessing.
 *
 * "Carrara, Italy" becomes originCountry `it` with origin "Carrara": the
 * country moves to the code and the quarry stays as text, which is exactly the
 * split the admin form now asks for.
 *
 *   node scripts/migrateOriginCountry.js            # report only
 *   node scripts/migrateOriginCountry.js --write
 */
import mongoose from "mongoose";
import { connectDb } from "../src/config/db.js";
import { logger } from "../src/config/logger.js";
import { StoneModel } from "../src/modules/stone/stone.model.js";
import { COUNTRIES } from "../src/config/countries.generated.js";

const WRITE = process.argv.includes("--write");

const byName = new Map(COUNTRIES.map((c) => [c.label.toLowerCase(), c.code]));

/**
 * Returns the country code and whatever text is left over.
 *
 * Tries the whole string first, then the segment after the last comma — the
 * order matters for "Republic of Korea" style names, which contain no comma but
 * would otherwise be tested a word at a time.
 */
function split(origin) {
  const clean = origin.trim();
  const whole = byName.get(clean.toLowerCase());
  if (whole) return { code: whole, rest: "" };

  const parts = clean.split(",").map((p) => p.trim());
  const last = parts.at(-1)?.toLowerCase() ?? "";
  const code = byName.get(last);
  if (code) return { code, rest: parts.slice(0, -1).join(", ") };

  return { code: null, rest: clean };
}

async function run() {
  await connectDb();

  const stones = await StoneModel.find({
    origin: { $nin: [null, ""] },
    originCountry: { $in: [null, undefined] },
  })
    .select("mossanoCode name origin")
    .lean();

  if (stones.length === 0) {
    logger.info("No lot has a text origin waiting to be converted.");
    return;
  }

  const matched = [];
  const unmatched = [];

  for (const stone of stones) {
    const { code, rest } = split(stone.origin);
    if (code) matched.push({ stone, code, rest });
    else unmatched.push(stone);
  }

  for (const { stone, code, rest } of matched) {
    logger.info(`${stone.mossanoCode} "${stone.origin}" → ${code}${rest ? ` + "${rest}"` : ""}`);
  }
  for (const stone of unmatched) {
    logger.warn(`${stone.mossanoCode} "${stone.origin}" — no country matched, left as text`);
  }

  if (!WRITE) {
    logger.info(
      `${matched.length} lot(s) would be converted, ${unmatched.length} left alone. Re-run with --write to apply.`,
    );
    return;
  }

  for (const { stone, code, rest } of matched) {
    await StoneModel.updateOne(
      { _id: stone._id },
      rest
        ? { $set: { originCountry: code, origin: rest } }
        : { $set: { originCountry: code }, $unset: { origin: "" } },
    );
  }

  logger.info(`Converted ${matched.length} lot(s). ${unmatched.length} still need a country.`);
}

run()
  .catch((err) => {
    logger.error({ err }, "Origin country migration failed");
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
