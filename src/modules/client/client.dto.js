import { toMediaDto } from "../media/media.dto.js";

/**
 * A client tile. `logo` is null until the team uploads one, and the storefront
 * renders the name instead — see ClientsPage.
 */
function toPublicClientDto(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    name: doc.name,
    logo: toMediaDto(doc.logo),
    website: doc.website || null,
  };
}

function toPublicCategoryDto(doc, clients = []) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    clients: clients.map(toPublicClientDto),
  };
}

function toAdminCategoryDto(doc, clientCount = 0) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    sortOrder: doc.sortOrder ?? 0,
    isPublished: doc.isPublished !== false,
    clientCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toAdminClientDto(doc) {
  if (!doc) return null;
  return {
    ...toPublicClientDto(doc),
    categoryId: doc.category ? String(doc.category?._id ?? doc.category) : null,
    logoId: doc.logo ? String(doc.logo?._id ?? doc.logo) : null,
    sortOrder: doc.sortOrder ?? 0,
    isPublished: doc.isPublished !== false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export { toPublicClientDto, toPublicCategoryDto, toAdminCategoryDto, toAdminClientDto };
