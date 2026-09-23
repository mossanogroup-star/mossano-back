/**
 * Moves "exotic" off `colour` and onto `looks`.
 *
 * Phase-3 feedback names the ten colours the client actually uses, and Exotic
 * is not one of them — it became a Look, because it describes how rare a stone
 * is rather than what shade it is. `colour` is an enum on the model, so a lot
 * still carrying `exotic` fails validation the next time anyone saves it. Run
 * this once, before or immediately after the new vocabulary ships.
 *
 * The colour is cleared rather than guessed: a white Exotic lot and a green one
 * both read "exotic" today, and there is nothing in the record to tell them
 * apart. The team re-files them from the admin, where they can see the slab.
 *
 *   node scripts/migrateExoticColour.js            # report only
 *   node scripts/migrateExoticColour.js --write
 */
import mongoose from "mongoose";
import { connectDb } from "../src/config/db.js";
import { logger } from "../src/config/logger.js";
import { StoneModel } from "../src/modules/stone/stone.model.js";

const WRITE = process.argv.includes("--write");

async function run() {
  await connectDb();

  // .lean() and a raw filter on purpose: "exotic" is no longer a valid enum
  // value, so anything that casts through the schema would reject the query
  // this script exists to find.
  const affected = await StoneModel.find({ colour: "exotic" })
    .select("mossanoCode name looks")
    .lean();

  if (affected.length === 0) {
    logger.info("No lot is filed under the exotic colour. Nothing to migrate.");
    return;
  }

  for (const stone of affected) {
    const hasLook = (stone.looks ?? []).includes("exotic");
    logger.info(
      `${stone.mossanoCode} ${stone.name}${hasLook ? " (already tagged Exotic)" : ""}`,
    );
  }

  if (!WRITE) {
    logger.info(`${affected.length} lot(s) would be re-tagged. Re-run with --write to apply.`);
    return;
  }

  const result = await StoneModel.updateMany(
    { colour: "exotic" },
    // $addToSet, not $push: re-running this must not tag a lot twice.
    { $unset: { colour: "" }, $addToSet: { looks: "exotic" } },
  );

  logger.info(`Re-tagged ${result.modifiedCount} lot(s) as the Exotic look.`);
}

run()
  .catch((err) => {
    logger.error({ err }, "Exotic colour migration failed");
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
