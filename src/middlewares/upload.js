/**
 * Multer in memory, not on disk: the buffer goes straight to Cloudinary and is
 * never written to the server's filesystem. The local-disk storage provider
 * does its own writing, under its own root.
 */
import path from "path";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

/**
 * Extensions accepted when the declared MIME type is useless — which for a
 * phone uploading HEIC or WebP is the ordinary case, not an edge one.
 *
 * A fallback, not a security control: what really decides is Cloudinary
 * refusing the bytes, or sharp failing to parse them.
 */
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"];

/** Types a browser sends when it does not know, or will not say. */
const VAGUE_TYPES = ["", "application/octet-stream", "binary/octet-stream", "application/binary"];

function fileFilter(_req, file, cb) {
  const mime = (file.mimetype || "").toLowerCase();
  if ([...IMAGE_TYPES, ...VIDEO_TYPES].includes(mime)) return cb(null, true);

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (VAGUE_TYPES.includes(mime) && [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS].includes(ext)) {
    return cb(null, true);
  }

  cb(
    new AppError(
      `Unsupported file type: ${file.originalname || "file"}${mime ? ` (${mime})` : ""}. ` +
        `Upload a JPEG, PNG, WebP, HEIC or MP4.`,
      415,
      { code: "UNSUPPORTED_MEDIA_TYPE" },
    ),
  );
}

/** True for anything that should be stored and served as video. */
function isVideoUpload(file) {
  if ((file.mimetype || "").toLowerCase().startsWith("video/")) return true;
  return VIDEO_EXTENSIONS.includes(path.extname(file.originalname || "").toLowerCase());
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

export {
  upload,
  uploadSingle,
  uploadMany,
  isVideoUpload,
  IMAGE_TYPES,
  VIDEO_TYPES,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
};
