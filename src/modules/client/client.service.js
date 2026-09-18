import { clientRepository } from "./client.repository.js";
import { uniqueSlug } from "../../utils/slugify.js";
import { AppError } from "../../utils/AppError.js";
import { invalidateStorefront } from "../stone/stone.service.js";

const clientService = {
  /**
   * Phase-2 feedback §1 — the Clients page, grouped by category.
   *
   * Categories holding nothing are dropped: an empty heading on a page whose
   * whole job is social proof reads as a gap, not as a category the team has
   * yet to fill.
   */
  async publicIndex() {
    const [categories, clients] = await Promise.all([
      clientRepository.findCategories({ publishedOnly: true }),
      clientRepository.findClients({ publishedOnly: true }),
    ]);

    const byCategory = new Map();
    for (const client of clients) {
      const key = String(client.category);
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(client);
    }

    return categories
      .map((category) => ({
        category,
        clients: byCategory.get(String(category._id)) ?? [],
      }))
      .filter((group) => group.clients.length > 0);
  },

  listCategories: () => clientRepository.findCategories({ includeDeleted: false }),
  listClients: () => clientRepository.findClients({ includeDeleted: false }),

  async createCategory(body, user) {
    const slug = await uniqueSlug(body.name, (s) => clientRepository.categorySlugExists(s));
    const created = await clientRepository.createCategory({
      ...body,
      slug,
      createdBy: user?.id,
    });
    invalidateStorefront();
    return clientRepository.findCategoryById(created._id);
  },

  async updateCategory(id, body, user) {
    const patch = { ...body, updatedBy: user?.id };
    // The slug is the category's identity in a URL; renaming must not move it.
    delete patch.slug;

    const updated = await clientRepository.updateCategory(id, patch);
    if (!updated) throw new AppError("Category not found", 404);
    invalidateStorefront();
    return updated;
  },

  async removeCategory(id) {
    const inUse = await clientRepository.countClientsInCategory(id);
    if (inUse > 0) {
      throw new AppError(
        `This category still holds ${inUse} client${inUse === 1 ? "" : "s"}. ` +
          `Move or remove them first.`,
        409,
        { code: "CATEGORY_NOT_EMPTY" },
      );
    }
    const deleted = await clientRepository.softDeleteCategory(id);
    if (!deleted) throw new AppError("Category not found", 404);
    invalidateStorefront();
    return { id };
  },

  async createClient(body, user) {
    const category = await clientRepository.findCategoryById(body.category);
    if (!category) throw new AppError("Choose a category that exists", 400);

    const created = await clientRepository.createClient({ ...body, createdBy: user?.id });
    invalidateStorefront();
    return clientRepository.findClientById(created._id);
  },

  async updateClient(id, body, user) {
    if (body.category) {
      const category = await clientRepository.findCategoryById(body.category);
      if (!category) throw new AppError("Choose a category that exists", 400);
    }

    const updated = await clientRepository.updateClient(id, { ...body, updatedBy: user?.id });
    if (!updated) throw new AppError("Client not found", 404);
    invalidateStorefront();
    return updated;
  },

  async removeClient(id) {
    const deleted = await clientRepository.softDeleteClient(id);
    if (!deleted) throw new AppError("Client not found", 404);
    invalidateStorefront();
    return { id };
  },
};

export { clientService };
