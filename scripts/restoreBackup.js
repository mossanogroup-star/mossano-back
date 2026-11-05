/**
 * Restores a backup made by scripts/backupToDrive.js.
 *
 *   node scripts/restoreBackup.js ./mossano-db-2026-11-06T20-30-00Z.json.gz            # dry run: shows what it would do
 *   node scripts/restoreBackup.js ./mossano-db-2026-11-06T20-30-00Z.json.gz --confirm  # actually restores
 *
 * ⚠ With --confirm, every collection in the backup is EMPTIED and replaced by
 * the backup's copy, in whatever database MONGODB_URI points at. Collections
 * not in the backup are left alone. Download the file from Drive first.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import mongoose from "mongoose";

const { EJSON } = mongoose.mongo.BSON;

const file = process.argv[2];
const CONFIRM = process.argv.includes("--confirm");
if (!file || file.startsWith("--")) {
  console.error("Usage: node scripts/restoreBackup.js <backup.json.gz> [--confirm]");
  process.exit(1);
}

const dump = EJSON.parse(gunzipSync(await readFile(file)).toString("utf8"), { relaxed: false });
console.log(`Backup of "${dump.database}" taken ${dump.createdAt}`);

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
console.log(
  `Target database: "${db.databaseName}"${CONFIRM ? "" : " (dry run — add --confirm to restore)"}`,
);

for (const [name, docs] of Object.entries(dump.collections)) {
  const current = await db.collection(name).countDocuments();
  console.log(`  ${name}: ${current} now → ${docs.length} from backup`);
  if (!CONFIRM) continue;
  await db.collection(name).deleteMany({});
  if (docs.length) await db.collection(name).insertMany(docs, { ordered: false });
}

await mongoose.disconnect();
console.log(CONFIRM ? "Restore complete." : "Nothing changed.");
