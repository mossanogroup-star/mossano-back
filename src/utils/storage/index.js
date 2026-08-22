/**
 * Object storage. Cloudinary in production; the local-disk provider exists so
 * a fresh clone works before credentials are configured.
 *
 *   1. STORAGE_PROVIDER, when set explicitly
 *   2. cloudinary, when all three credentials are present
 *   3. local otherwise
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

/**
 * The provider a *record* belongs to, which after a migration is not always the
 * active one. Deleting a local file through the Cloudinary provider fails
 * silently, so anything removing a stored file must dispatch on `media.provider`.
 */
function getProvider(name) {
  return PROVIDERS[name] ?? storage;
}

export { storage, getProvider, providerName as storageProviderName, UPLOAD_ROOT };
