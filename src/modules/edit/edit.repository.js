import { EditModel } from "./edit.model.js";
import { escapeRegex, runPagedQuery, softDeleteById } from "../../utils/repositoryHelpers.js";

const POPULATE = [
  {
    path: "coverImage",
    select: "url thumbnailUrl storageKey resourceType alt width height trimSafe",
  },
  {
    path: "images",
    select: "url thumbnailUrl storageKey resourceType alt width height trimSafe",
  },
];

function buildFilter({ status, search, publishedOnly, includeArchived, includeDeleted }) {
  const filter = {};
  if (!includeDeleted) filter.isDeleted = false;
  if (publishedOnly) filter.isPublished = true;
  if (status?.length) filter.status = { $in: status };
  else if (!includeArchived) filter.status = { $ne: "archived" };

  if (search?.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ title: rx }, { subtitle: rx }];
  }
  return filter;
}

const editRepository = {
  findMany({ page, limit, ...rest }) {
    return runPagedQuery({
      model: EditModel,
      filter: buildFilter(rest),
      sort: { periodStart: -1, createdAt: -1 },
      page,
      limit,
      populate: POPULATE,
    });
  },

  findById: (id) => EditModel.findOne({ _id: id, isDeleted: false }).populate(POPULATE).lean(),

  findBySlug: (slug, { publishedOnly = true } = {}) =>
    EditModel.findOne({
      slug: String(slug).toLowerCase(),
      isDeleted: false,
      ...(publishedOnly ? { isPublished: true } : {}),
    })
      .populate(POPULATE)
      .lean(),

  /** The three bands the New Edit page renders, in the order it renders them. */
  findLive: () =>
    EditModel.find({
      isDeleted: false,
      isPublished: true,
      status: { $in: ["current", "next", "upcoming"] },
    })
      .populate(POPULATE)
      .lean(),

  slugExists: (slug, exceptId) =>
    EditModel.exists({
      slug: String(slug).toLowerCase(),
      ...(exceptId ? { _id: { $ne: exceptId } } : {}),
    }),

  create: (data) => EditModel.create(data),

  async findByIdAndSave(id, patch) {
    const doc = await EditModel.findOne({ _id: id, isDeleted: false });
    if (!doc) return null;
    Object.assign(doc, patch);
    await doc.save();
    return EditModel.findById(doc._id).populate(POPULATE).lean();
  },

  /**
   * Demotes whichever Edit currently holds a status, so exactly one Edit is
   * Current at a time. Website §2 shows a single Current / Next / Upcoming
   * band each — two Current Edits would render as a duplicated section.
   */
  demoteOthersWithStatus: (status, exceptId) =>
    EditModel.updateMany(
      {
        status,
        isDeleted: false,
        ...(exceptId ? { _id: { $ne: exceptId } } : {}),
      },
      { $set: { status: "archived" } },
    ),

  /** Every Edit a stone belongs to — used when a stone is deleted. */
  findContainingStone: (stoneId) =>
    EditModel.find({ stones: stoneId, isDeleted: false }).select("title slug status").lean(),

  softDelete: (id) => softDeleteById(EditModel, id),

  allPublishedSlugs: () =>
    EditModel.find({ isDeleted: false, isPublished: true }).select("slug updatedAt").lean(),
};

export { editRepository };
