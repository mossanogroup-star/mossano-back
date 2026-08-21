/**
 * Local-disk storage provider.
 *
 * Exists so a fresh clone works end to end before Cloudinary credentials are
 * configured — without it the media module, and therefore stone creation, is
 * dead weight in development. It implements the same contract as the Cloudinary
 * provider, minus on-the-fly resizing: `derive` returns the original URL, so a
 * card simply loads a larger file than it needs. Acceptable locally, which is
 * the only place this provider should ever run.
 */
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { env } from "../../config/env.js";

const UPLOAD_ROOT = env.UPLOAD_ROOT;

/**
 * sharp is only needed to read image dimensions, and only on this provider.
 * Importing it lazily keeps a 30 MB native dependency off the production
 * install, where Cloudinary reports the dimensions itself.
 */
async function readDimensions(buffer) {
  try {
    const { default: sharp } = await import("sharp");
    const { width, height } = await sharp(buffer).metadata();
    return { width, height };
  } catch {
    // No sharp installed, or a file it cannot parse. The upload still
    // succeeds — it just carries no dimensions, and the storefront falls
    // back to an aspect-ratio box.
    return {};
  }
}

function safeSegment(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

const localProvider = {
  name: "local",

  async upload(buffer, { filename, mimeType, folder }) {
    const dir = path.join(UPLOAD_ROOT, safeSegment(folder) || "misc");
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(filename || "") || "";
    const base = safeSegment(path.basename(filename || "file", ext)) || "file";
    const storageKey = path
      .join(safeSegment(folder) || "misc", `${base}-${randomUUID().slice(0, 8)}${ext}`)
      .replace(/\\/g, "/");

    await fs.writeFile(path.join(UPLOAD_ROOT, storageKey), buffer);

    const { width, height } = mimeType?.startsWith("image/")
      ? await readDimensions(buffer)
      : {};

    const url = `${env.PUBLIC_BASE_URL}/uploads/${storageKey}`;
    return {
      provider: "local",
      storageKey,
      resourceType: mimeType?.startsWith("video/") ? "video" : "image",
      url,
      thumbnailUrl: url,
      width,
      height,
      bytes: buffer.length,
      format: ext.replace(".", "") || undefined,
    };
  },

  /** No transformation pipeline on disk — callers get the original. */
  derive(storageKey) {
    if (!storageKey) return null;
    return `${env.PUBLIC_BASE_URL}/uploads/${storageKey}`;
  },

  async remove(storageKey) {
    if (!storageKey) return;
    // Refuse anything that tries to climb out of the upload root.
    const target = path.resolve(UPLOAD_ROOT, storageKey);
    if (!target.startsWith(path.resolve(UPLOAD_ROOT))) return;
    await fs.rm(target, { force: true });
  },
};

export { localProvider, UPLOAD_ROOT };
