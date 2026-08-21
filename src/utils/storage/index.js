/**
 * Object storage for uploaded media.
 *
 * Production is **Cloudinary**. A local-disk provider exists so the app works
 * on a fresh clone before credentials are configured.
 *
 * Selection order:
 *   1. STORAGE_PROVIDER when set explicitly ("cloudinary" | "local")
 *   2. "cloudinary" when all three credentials are present
 *   3. "local" otherwise
 *
 * Both providers implement:
 *   upload(buffer, { filename, mimeType, folder })
 *     → { provider, storageKey, resourceType, url, thumbnailUrl,
 *         width, height, bytes, format }
 *   derive(storageKey, resourceType, { width, height, crop }) → url | null
 *   remove(storageKey, resourceType) → Promise<void>
 */
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { cloudinaryProvider } from "./cloudinaryProvider.js";
import { localProvider, UPLOAD_ROOT } from "./localProvider.js";

const PROVIDERS = { cloudinary: cloudinaryProvider, local: localProvider };

function resolveProviderName() {
  if (env.STORAGE_PROVIDER) return env.STORAGE_PROVIDER;
  return env.CLOUDINARY_CONFIGURED ? "cloudinary" : "local";
}

const providerName = resolveProviderName();
const storage = PROVIDERS[providerName];

if (!storage) {
  throw new Error(
    `Unknown STORAGE_PROVIDER "${providerName}". Expected one of: ${Object.keys(PROVIDERS).join(", ")}`,
  );
}

if (providerName === "cloudinary" && !env.CLOUDINARY_CONFIGURED) {
  throw new Error(
    "STORAGE_PROVIDER=cloudinary but CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET are not all set.",
  );
}

if (providerName === "local") {
  logger.warn(
    { provider: "local", uploadRoot: UPLOAD_ROOT },
    "Media is being stored on local disk. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY " +
      "and CLOUDINARY_API_SECRET to switch to Cloudinary.",
  );
} else {
  logger.info({ provider: providerName, folder: env.CLOUDINARY_FOLDER }, "Media storage ready");
}

export { storage, providerName as storageProviderName, UPLOAD_ROOT };
