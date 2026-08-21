import { mediaRepository } from "./media.repository.js";
import { storage } from "../../utils/storage/index.js";
import { AppError } from "../../utils/AppError.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

/** Where each kind lands in the storage bucket. */
const FOLDER_BY_KIND = {
  slab: "slabs",
  application: "applications",
  video: "videos",
  collection: "collections",
  reference: "references",
  selection: "selections",
  general: "general",
};

function assertWithinLimit(file) {
  const isVideo = file.mimetype?.startsWith("video/");
  const limitMb = isVideo ? env.MAX_VIDEO_UPLOAD_MB : env.MAX_UPLOAD_MB;
  if (file.size > limitMb * 1024 * 1024) {
    throw new AppError(
      `${file.originalname} is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit for ` +
        `${isVideo ? "video" : "images"} is ${limitMb} MB.`,
      413,
      { code: "PAYLOAD_TOO_LARGE" },
    );
  }
}

const mediaService = {
  list(query) {
    return mediaRepository.findMany(query);
  },

  async get(id) {
    const media = await mediaRepository.findById(id);
    if (!media) throw new AppError("Media not found", 404);
    return media;
  },

  /**
   * Uploads one file and records it. A video is stored as kind "video"
   * regardless of what the caller said, because the storefront branches on
   * kind to decide between an <img> and a <video>.
   */
  async uploadOne(file, { kind = "general", alt = "", caption = "" }, user) {
    assertWithinLimit(file);

    const resolvedKind = file.mimetype?.startsWith("video/") ? "video" : kind;
    const stored = await storage.upload(file.buffer, {
      filename: file.originalname,
      mimeType: file.mimetype,
      folder: FOLDER_BY_KIND[resolvedKind] || "general",
    });

    return mediaRepository.create({
      filename: file.originalname,
      mimeType: file.mimetype,
      kind: resolvedKind,
      alt,
      caption,
      uploadedBy: user?.id,
      ...stored,
    });
  },

  /**
   * Bulk upload — the admin drops a whole lot of slabs in at once.
   *
   * One bad file does not fail the batch. Uploading 40 slabs and losing all of
   * them because the 39th was a HEIC the provider rejected is the wrong
   * behaviour; the caller gets what succeeded plus a per-file error list.
   */
  async uploadMany(files, meta, user) {
    if (!files?.length) throw new AppError("No files were uploaded", 400);

    const uploaded = [];
    const errors = [];

    for (const file of files) {
      try {
        uploaded.push(await this.uploadOne(file, meta, user));
      } catch (err) {
        logger.warn(
          { err, filename: file.originalname },
          "Media upload failed",
        );
        errors.push({ filename: file.originalname, message: err.message });
      }
    }

    if (!uploaded.length) {
      throw new AppError("None of the files could be uploaded", 400, {
        details: errors,
      });
    }
    return { uploaded, errors };
  },

  async update(id, patch) {
    const media = await mediaRepository.update(id, patch);
    if (!media) throw new AppError("Media not found", 404);
    return media;
  },

  /**
   * Soft-deletes the record and removes the remote file.
   *
   * The record goes first. If the remote delete fails we have an orphaned file
   * costing storage; if it went the other way round we would have a live
   * document pointing at a 404, which shows up as a broken slab on the site.
   */
  async remove(id) {
    const media = await mediaRepository.findById(id);
    if (!media) throw new AppError("Media not found", 404);

    await mediaRepository.softDelete(id);
    try {
      await storage.remove(media.storageKey, media.resourceType);
    } catch (err) {
      logger.warn(
        { err, storageKey: media.storageKey },
        "Media removed from DB but not from storage",
      );
    }
    return { id };
  },

  facets() {
    return mediaRepository.kindCounts();
  },
};

export { mediaService, FOLDER_BY_KIND };
