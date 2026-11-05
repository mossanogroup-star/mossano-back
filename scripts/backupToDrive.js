/**
 * Full database backup → Google Drive.
 *
 * Exports every collection in the database (stones, site settings, media
 * records, enquiries, selections, users — whatever exists, discovered at run
 * time) as Extended JSON, so ObjectIds and dates survive a restore exactly.
 * The whole thing goes into one gzipped file, uploaded to a folder in the
 * mossanogroup@gmail.com Drive; anything beyond the newest BACKUP_KEEP
 * backups there is deleted.
 *
 * It signs in as that Gmail account with an OAuth refresh token, because a
 * free Gmail account has no Shared Drives and a service account has no
 * storage of its own. The token only carries the drive.file scope: it can see
 * the files this job created and nothing else in that Drive. Get a new one
 * (and the folder) with scripts/driveAuth.js.
 *
 * Runs nightly from .github/workflows/backup.yml. Locally:
 *
 *   node scripts/backupToDrive.js --local=./backup.json.gz   # export only, no upload
 *   node scripts/backupToDrive.js                            # export + upload
 *
 * Env:
 *   MONGODB_URI        the database to back up
 *   GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET   the OAuth client (Cloud Console)
 *   GDRIVE_REFRESH_TOKEN                     from scripts/driveAuth.js
 *   GDRIVE_FOLDER_ID                         the folder driveAuth.js created
 *   BACKUP_KEEP        how many backups to keep (default 30)
 *
 * Images live in Cloudinary, not here; the Media records that point at them
 * are in the backup.
 *
 * Restore with scripts/restoreBackup.js.
 */
import "dotenv/config";
import crypto from "node:crypto";
import { writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import mongoose from "mongoose";

const { EJSON } = mongoose.mongo.BSON;

const localArg = process.argv.find((a) => a.startsWith("--local="));
const LOCAL_PATH = localArg ? localArg.split("=")[1] : null;
const KEEP = Number(process.env.BACKUP_KEEP || 30);
const FILE_PREFIX = "mossano-db-";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function exportDatabase() {
  await mongoose.connect(required("MONGODB_URI"));
  const db = mongoose.connection.db;
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith("system."))
    .sort();

  const dump = {
    database: db.databaseName,
    createdAt: new Date().toISOString(),
    collections: {},
  };
  const counts = {};
  for (const name of collections) {
    const docs = await db.collection(name).find({}).toArray();
    dump.collections[name] = docs;
    counts[name] = docs.length;
  }
  await mongoose.disconnect();

  const json = EJSON.stringify(dump, { relaxed: false });
  return { gz: gzipSync(json), counts, database: db.databaseName };
}

/** Trades the long-lived refresh token for an hour's access token. */
async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: required("GDRIVE_CLIENT_ID"),
      client_secret: required("GDRIVE_CLIENT_SECRET"),
      refresh_token: required("GDRIVE_REFRESH_TOKEN"),
    }),
  });
  if (!res.ok) throw new Error(`Google token request failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function drive(token, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!res.ok)
    throw new Error(`Drive ${init.method || "GET"} failed: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function upload(token, folderId, name, body) {
  const boundary = `mossano${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name, parents: [folderId], mimeType: "application/gzip" });
  const multipart = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/gzip\r\n\r\n`,
    ),
    body,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  return drive(
    token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: multipart,
    },
  );
}

/** Deletes everything but the newest KEEP backups in the folder. */
async function prune(token, folderId) {
  const q = encodeURIComponent(
    `'${folderId}' in parents and name contains '${FILE_PREFIX}' and trashed = false`,
  );
  const { files } = await drive(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime desc&pageSize=1000` +
      "&fields=files(id,name)",
  );
  const stale = files.slice(KEEP);
  for (const file of stale) {
    await drive(token, `https://www.googleapis.com/drive/v3/files/${file.id}`, {
      method: "DELETE",
    });
  }
  return { kept: files.length - stale.length, deleted: stale.map((f) => f.name) };
}

async function main() {
  const { gz, counts, database } = await exportDatabase();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(
    `Exported ${database}: ${total} documents in ${Object.keys(counts).length} collections`,
  );
  for (const [name, n] of Object.entries(counts)) console.log(`  ${name}: ${n}`);
  console.log(`Compressed size: ${(gz.length / 1024).toFixed(1)} KB`);

  if (LOCAL_PATH) {
    await writeFile(LOCAL_PATH, gz);
    console.log(`Wrote ${LOCAL_PATH} (no upload)`);
    return;
  }

  const folderId = required("GDRIVE_FOLDER_ID");
  const stamp = new Date().toISOString().replace(/[:]/g, "-").replace(/\..+/, "");
  const name = `${FILE_PREFIX}${stamp}Z.json.gz`;

  const token = await getAccessToken();
  const file = await upload(token, folderId, name, gz);
  console.log(`Uploaded ${file.name} (${file.size} bytes) to Drive`);

  const { kept, deleted } = await prune(token, folderId);
  console.log(`Keeping ${kept} backups${deleted.length ? `; deleted ${deleted.join(", ")}` : ""}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
