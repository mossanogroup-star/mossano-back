import { ClientCategoryModel, ClientModel } from "./client.model.js";
import { escapeRegex, softDeleteById } from "../../utils/repositoryHelpers.js";

const LOGO_POPULATE = {
  path: "logo",
  select: "url thumbnailUrl storageKey resourceType alt width height trimSafe",
};

function scope({ publishedOnly, includeDeleted }) {
  const filter = {};
  if (!includeDeleted) filter.isDeleted = false;
  if (publishedOnly) filter.isPublished = true;
  return filter;
}

const clientRepository = {
  /**
   * Not paged, either collection.
   *
   * The Clients page shows everything at once by design — §1 asks for logos
   * grouped under their categories, and the home carousel needs the whole
   * roster to loop through. A few dozen rows with one populated image each is
   * not a pagination problem.
   */
  findCategories: (opts = {}) =>
    ClientCategoryModel.find(scope(opts)).sort({ sortOrder: 1, name: 1 }).lean(),

  findClients: (opts = {}) =>
    ClientModel.find(scope(opts)).sort({ sortOrder: 1, name: 1 }).populate(LOGO_POPULATE).lean(),

  findCategoryById: (id) => ClientCategoryModel.findOne({ _id: id, isDeleted: false }).lean(),

  findClientById: (id) =>
    ClientModel.findOne({ _id: id, isDeleted: false }).populate(LOGO_POPULATE).lean(),

  categorySlugExists: (slug, exceptId) =>
    ClientCategoryModel.exists({
      slug: String(slug).toLowerCase(),
      ...(exceptId ? { _id: { $ne: exceptId } } : {}),
    }),

  /** Guards the delete: a category with clients still in it must not vanish. */
  countClientsInCategory: (categoryId) =>
    ClientModel.countDocuments({ category: categoryId, isDeleted: false }),

  searchClients: (search) => {
    const rx = new RegExp(escapeRegex(String(search).trim()), "i");
    return ClientModel.find({ isDeleted: false, name: rx })
      .sort({ name: 1 })
      .populate(LOGO_POPULATE)
      .lean();
  },

  createCategory: (data) => ClientCategoryModel.create(data),
  createClient: (data) => ClientModel.create(data),

  async updateCategory(id, patch) {
    await ClientCategoryModel.updateOne({ _id: id, isDeleted: false }, { $set: patch });
    return this.findCategoryById(id);
  },

  async updateClient(id, patch) {
    await ClientModel.updateOne({ _id: id, isDeleted: false }, { $set: patch });
    return this.findClientById(id);
  },

  softDeleteCategory: (id) => softDeleteById(ClientCategoryModel, id),
  softDeleteClient: (id) => softDeleteById(ClientModel, id),
};

export { clientRepository };
