/**
 * Files granite lots under the shop's Granite list.
 *
 * Client request (27 Oct 2026) — "when we add granite it goes to marble". The
 * first granite lots were saved with the colour in `colour` (the field the
 * shop reads as Marble Colour) and nothing in `graniteColour`, so they showed
 * as marble and the Granite list stayed empty. This copies `colour` across.
 * `colour` is left as it is: Marble Colour now leaves granite out on its own.
 *
 *   node scripts/fillGraniteColour.js            # report only
 *   node scripts/fillGraniteColour.js --write
 */
import mongoose from "mongoose";
import { connectDb } from "../src/config/db.js";
import { logger } from "../src/config/logger.js";
import { StoneModel } from "../src/modules/stone/stone.model.js";
import { GRANITE_COLOUR_SLUGS } from "../src/modules/stone/stone.constants.js";

const WRITE = process.argv.includes("--write");

async function run() {
  await connectDb();

  const affected = await StoneModel.find({
    material: "granite",
    graniteColour: { $in: [null, ""] },
    colour: { $in: GRANITE_COLOUR_SLUGS },
  })
    .select("mossanoCode name colour")
    .lean();

  if (affected.length === 0) {
    logger.info("Every granite lot already has a Granite colour. Nothing to fill.");
    return;
  }

  for (const stone of affected) logger.info(`${stone.mossanoCode} ${stone.name} → ${stone.colour}`);

  if (!WRITE) {
    logger.info(`${affected.length} lot(s) would be filled. Re-run with --write to apply.`);
    return;
  }

  // One update per lot: each copies its own colour.
  for (const stone of affected) {
    await StoneModel.updateOne({ _id: stone._id }, { $set: { graniteColour: stone.colour } });
  }
  logger.info(`Filled the Granite colour on ${affected.length} lot(s).`);
}

run()
  .catch((err) => {
    logger.error({ err }, "Granite colour fill failed");
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
