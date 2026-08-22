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

  // --- Alerting the team when an enquiry arrives ---
  // "Backend automatically → Executive ko WhatsApp" (Website Notes, 2nd drop).
  // Leave NOTIFY_PROVIDER empty to auto-select; see utils/notify/index.js.
  NOTIFY_PROVIDER: (process.env.NOTIFY_PROVIDER || "").trim().toLowerCase() || "",
  /** Where alerts go. Digits with country code, e.g. 919619176132. */
  EXECUTIVE_WHATSAPP: (process.env.EXECUTIVE_WHATSAPP || "").replace(/\D/g, ""),
  EXECUTIVE_EMAIL: process.env.EXECUTIVE_EMAIL || "",

  // WhatsApp Business Cloud API. Not the same as WHATSAPP_NUMBER above, which is
  // only the destination for click-to-chat links and needs no account.
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || "",
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  /** Set once a template is approved by Meta; required outside a 24-hour window. */
  WHATSAPP_TEMPLATE_NAME: process.env.WHATSAPP_TEMPLATE_NAME || "",
  WHATSAPP_TEMPLATE_LANG: process.env.WHATSAPP_TEMPLATE_LANG || "en",

  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: (process.env.SMTP_SECURE || "").toLowerCase() === "true",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "",

  /**
   * The slab behind the home page's wordmark, by MOSSANO code.
   *
   * Pinned rather than derived, for two reasons.
   *
   * Left to sort order it moved as a side effect of inventory work — marking a
   * lot Available pushed it to the front of the featured list and it became the
   * front page. The brand's strongest statement should not change because
   * someone updated stock.
   *
   * And the choice is a measurement, not a preference. `npm run measure:hero`
   * scores every published lot on how readable ivory type is over the band the
   * text actually occupies. MM-001 Black Marquina wins by a distance — 21.7
   * against 101 for the runner-up, and 157 for the lot the ranked fallback had
   * been choosing. Over a pale slab the wordmark simply disappears.
   *
   * Empty falls through to that ranked fallback in public.service.js.
   */
  HERO_STONE_CODE: (process.env.HERO_STONE_CODE || "MM-001").trim().toUpperCase(),

  SELECTION_LINK_TTL_DAYS: Math.max(1, Number(process.env.SELECTION_LINK_TTL_DAYS || 90)),
});

export { env, BACK_ROOT };
