import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACK_ROOT = path.resolve(HERE, "../..");

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = Number(process.env.PORT || 5000);

const env = Object.freeze({
  NODE_ENV,
  IS_PROD: NODE_ENV === "production",
  PORT,

  MONGODB_URI: required("MONGODB_URI"),

  JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET"),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "12h",

  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || "",
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || "",
  SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME || "MOSSANO Admin",

  // --- Storefront ---
  // Resolved to an absolute path so nodemon's cwd can never change what we read.
  FRONTEND_DIR: path.resolve(BACK_ROOT, process.env.FRONTEND_DIR || "../mossano-front"),
  PUBLIC_BASE_URL: (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`)
    .trim()
    .replace(/\/+$/, ""),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "",
  SSR_CACHE_TTL_SECONDS: Math.max(0, Number(process.env.SSR_CACHE_TTL_SECONDS || 300)),

  // --- Media ---
  STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER || "").trim().toLowerCase() || "",
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CONFIGURED: Boolean(
    CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET,
  ),
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || "mossano",
  UPLOAD_ROOT: path.resolve(BACK_ROOT, "uploads"),
  MAX_UPLOAD_MB: Math.max(1, Number(process.env.MAX_UPLOAD_MB || 10)),
  MAX_VIDEO_UPLOAD_MB: Math.max(1, Number(process.env.MAX_VIDEO_UPLOAD_MB || 100)),

  // --- WhatsApp ---
  // Digits only, country code included. Every wa.me link the site emits — from
  // Home, Stone Detail, Private Sourcing, Private Selection and Contact —
  // points here, so it is configuration rather than a constant in the markup.
  WHATSAPP_NUMBER: (process.env.WHATSAPP_NUMBER || "919619176132").replace(/\D/g, ""),

  SELECTION_LINK_TTL_DAYS: Math.max(1, Number(process.env.SELECTION_LINK_TTL_DAYS || 90)),
});

export { env, BACK_ROOT };
