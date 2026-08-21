/**
 * Multer in memory, not on disk: the buffer goes straight to Cloudinary and is
 * never written to the server's filesystem. The local-disk storage provider
 * does its own writing, under its own root.
 */
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

function fileFilter(_req, file, cb) {
  if ([...IMAGE_TYPES, ...VIDEO_TYPES].includes(file.mimetype)) return cb(null, true);
  cb(
    new AppError(
      `Unsupported file type: ${file.mimetype}. Upload a JPEG, PNG, WebP, HEIC or MP4.`,
      415,
      { code: "UNSUPPORTED_MEDIA_TYPE" },
    ),
  );
}

/**
 * One ceiling for both kinds, set by the video limit, because multer decides
 * before it knows the mimetype. The per-kind check happens in the media
 * service, where the type is known and the message can be specific.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: env.MAX_VIDEO_UPLOAD_MB * 1024 * 1024,
    files: 20,
  },
});

const uploadSingle = upload.single("file");
/** Slab uploads arrive as a whole lot at once — the admin drops in 40 at a time. */
const uploadMany = upload.array("files", 20);

export { upload, uploadSingle, uploadMany, IMAGE_TYPES, VIDEO_TYPES };
