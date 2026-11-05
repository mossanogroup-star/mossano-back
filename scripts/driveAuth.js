/**
 * One-time sign-in for the nightly backup (scripts/backupToDrive.js).
 *
 *   node scripts/driveAuth.js <oauth-client.json> <output.json>
 *
 * <oauth-client.json> is the Desktop-app OAuth client downloaded from Cloud
 * Console → Google Auth Platform → Clients. The script prints a Google link;
 * open it, sign in as mossanogroup@gmail.com and allow. It then creates the
 * "Mossano Backups" folder in that Drive and writes client id, secret,
 * refresh token and folder id to <output.json> (readable only by you) — put
 * those four into the repo's GitHub secrets and delete the file.
 *
 * Run it again only if the token stops working (e.g. access was revoked at
 * myaccount.google.com/permissions). Pass --folder=<id> to keep using an
 * existing folder the same client created.
 */
import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";

const [clientPath, outPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const folderArg = process.argv.find((a) => a.startsWith("--folder="));
if (!clientPath || !outPath) {
  console.error(
    "Usage: node scripts/driveAuth.js <oauth-client.json> <output.json> [--folder=<id>]",
  );
  process.exit(1);
}

const raw = JSON.parse(await readFile(clientPath, "utf8"));
const { client_id, client_secret } = raw.installed || raw.web || raw;
const SCOPE = "https://www.googleapis.com/auth/drive.file";
let redirect;

const code = await new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const got = url.searchParams.get("code");
    const err = url.searchParams.get("error");
    if (!got && !err) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(got ? "Signed in. You can close this tab." : `Sign-in failed: ${err}`);
    server.close();
    return got ? resolve(got) : reject(new Error(err));
  });
  server.listen(0, "127.0.0.1", () => {
    redirect = `http://127.0.0.1:${server.address().port}`;
    const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    auth.search = new URLSearchParams({
      client_id,
      redirect_uri: redirect,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
    });
    console.log(`Open this link, sign in as mossanogroup@gmail.com and allow:\n\n${auth}\n`);
  });
  setTimeout(() => reject(new Error("Timed out waiting for sign-in")), 10 * 60 * 1000).unref();
}).catch((e) => {
  console.error(e.message);
  process.exit(1);
});

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id,
    client_secret,
    redirect_uri: redirect,
  }),
});
const tokens = await tokenRes.json();
if (!tokens.refresh_token) {
  console.error("No refresh token returned:", tokens.error_description || tokens.error || tokens);
  process.exit(1);
}

// Saved before anything else can fail, so a problem creating the folder
// never costs the sign-in.
const creds = {
  GDRIVE_CLIENT_ID: client_id,
  GDRIVE_CLIENT_SECRET: client_secret,
  GDRIVE_REFRESH_TOKEN: tokens.refresh_token,
  GDRIVE_FOLDER_ID: folderArg?.split("=")[1] || "",
};
const save = () => writeFile(outPath, JSON.stringify(creds, null, 2), { mode: 0o600 });
await save();
console.log(`Saved credentials to ${outPath}`);

if (!creds.GDRIVE_FOLDER_ID) {
  const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Mossano Backups",
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!res.ok) throw new Error(`Folder create failed: ${res.status} ${await res.text()}`);
  creds.GDRIVE_FOLDER_ID = (await res.json()).id;
  await save();
}

console.log(`Backup folder: https://drive.google.com/drive/folders/${creds.GDRIVE_FOLDER_ID}`);
