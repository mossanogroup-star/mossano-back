/**
 * Removes Media records nothing references — chiefly the copies a storage
 * provider switch leaves behind, which otherwise show as duplicates in the
 * media library. Checks every collection that can hold a Media id.
 *
 *   node scripts/pruneOrphanMedia.js              # report only
 *   node scripts/pruneOrphanMedia.js --delete
 *   node scripts/pruneOrphanMedia.js --delete --provider=local
 */
import mongoose from "mongoose";
import { connectDb } from "../src/config/db.js";
import { logger } from "../src/config/logger.js";
import { MediaModel } from "../src/modules/media/media.model.js";
import { StoneModel } from "../src/modules/stone/stone.model.js";
import { EditModel } from "../src/modules/edit/edit.model.js";
import { ApplicationModel } from "../src/modules/application/application.model.js";
import { SelectionModel } from "../src/modules/selection/selection.model.js";
import { EnquiryModel } from "../src/modules/enquiry/enquiry.model.js";
import { getProvider } from "../src/utils/storage/index.js";

const DELETE = process.argv.includes("--delete");
const providerArg = process.argv.find((a) => a.startsWith("--provider="));
const ONLY_PROVIDER = providerArg ? providerArg.split("=")[1] : null;

/** Every Media id mentioned anywhere in the database. */
async function collectReferencedIds() {
  const referenced = new Set();
  const add = (v) => {
    if (v) referenced.add(String(v));
  };

  const [stones, edits, applications, selections, enquiries] = await Promise.all([
    StoneModel.find({}).select("images videos slabs.image").lean(),
    EditModel.find({}).select("images coverImage").lean(),
    ApplicationModel.find({}).select("images coverImage").lean(),
    SelectionModel.find({}).select("images").lean(),
    EnquiryModel.find({ "sourcing.referenceImages.0": { $exists: true } })
      .select("sourcing.referenceImages")
      .lean(),
  ]);

  // Soft-deleted parents are included on purpose: a restored stone must not
  // come back with its photography missing.
  for (const s of stones) {
    (s.images ?? []).forEach(add);
    (s.videos ?? []).forEach(add);
    (s.slabs ?? []).forEach((slab) => add(slab.image));
  }
  for (const e of edits) {
    (e.images ?? []).forEach(add);
    add(e.coverImage);
  }
  for (const a of applications) {
    (a.images ?? []).forEach(add);
    add(a.coverImage);
  }
  for (const s of selections) (s.images ?? []).forEach(add);
  for (const e of enquiries) (e.sourcing?.referenceImages ?? []).forEach(add);

  return referenced;
}

async function main() {
  await connectDb();

  const referenced = await collectReferencedIds();
  const filter = ONLY_PROVIDER ? { provider: ONLY_PROVIDER } : {};
  const all = await MediaModel.find(filter)
    .select("filename provider url kind storageKey resourceType")
    .lean();

  const orphans = all.filter((m) => !referenced.has(String(m._id)));

  logger.info(
    {
      total: all.length,
      referenced: all.length - orphans.length,
      orphans: orphans.length,
      provider: ONLY_PROVIDER ?? "all",
    },
    DELETE ? "Pruning orphaned media" : "Orphaned media report (dry run)",
  );

  for (const m of orphans) {
    console.log(`  ${DELETE ? "delete" : "would delete"}  ${m.provider.padEnd(10)} ${m.filename}`);
  }

  if (!orphans.length) {
    console.log("\n  Nothing to prune.");
  } else if (!DELETE) {
    console.log(`\n  Dry run. Re-run with --delete to remove these ${orphans.length}.`);
  } else {
    let removed = 0;
    for (const m of orphans) {
      // The stored file goes too, but a failure there must not stop the record
      // being cleared — an orphaned file costs storage, an orphaned record
      // shows the team a broken thumbnail.
      try {
        // Dispatched on the record's own provider, not the active one — after a
        // migration these differ, and removing a local file through Cloudinary
        // fails silently and leaves the file on disk.
        await getProvider(m.provider).remove(m.storageKey, m.resourceType);
      } catch (err) {
        logger.warn({ err: err.message, filename: m.filename }, "Could not remove the stored file");
      }
      await MediaModel.deleteOne({ _id: m._id });
      removed += 1;
    }
    logger.info({ removed }, "Pruned");
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  logger.fatal({ err }, "Prune failed");
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
