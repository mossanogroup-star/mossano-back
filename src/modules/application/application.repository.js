import { ApplicationModel } from "./application.model.js";
import { escapeRegex, runPagedQuery, softDeleteById } from "../../utils/repositoryHelpers.js";

const POPULATE = [
  {
    path: "coverImage",
    select: "url thumbnailUrl storageKey resourceType alt width height trimSafe",
  },
  {
    path: "images",
    select: "url thumbnailUrl storageKey resourceType alt caption width height trimSafe",
  },
];

function buildFilter({ application, search, featured, publishedOnly, includeDeleted, stoneId }) {
  const filter = {};
  if (!includeDeleted) filter.isDeleted = false;
  if (publishedOnly) filter.isPublished = true;
  if (featured) filter.isFeatured = true;
  if (application?.length) filter.application = { $in: application };
  if (stoneId) filter.stones = stoneId;

  if (search?.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ title: rx }, { projectName: rx }, { location: rx }, { architect: rx }];
  }
  return filter;
}

const applicationRepository = {
  findMany({ page, limit, ...rest }) {
    return runPagedQuery({
      model: ApplicationModel,
      filter: buildFilter(rest),
      sort: { isFeatured: -1, createdAt: -1 },
      page,
      limit,
      populate: POPULATE,
    });
  },

  findById: (id) =>
    ApplicationModel.findOne({ _id: id, isDeleted: false }).populate(POPULATE).lean(),

  findBySlug: (slug, { publishedOnly = true } = {}) =>
    ApplicationModel.findOne({
      slug: String(slug).toLowerCase(),
      isDeleted: false,
      ...(publishedOnly ? { isPublished: true } : {}),
    })
      .populate(POPULATE)
      .lean(),

  slugExists: (slug, exceptId) =>
    ApplicationModel.exists({
      slug: String(slug).toLowerCase(),
      ...(exceptId ? { _id: { $ne: exceptId } } : {}),
    }),

  create: (data) => ApplicationModel.create(data),

  async findByIdAndSave(id, patch) {
    const doc = await ApplicationModel.findOne({ _id: id, isDeleted: false });
    if (!doc) return null;
    Object.assign(doc, patch);
    await doc.save();
    return ApplicationModel.findById(doc._id).populate(POPULATE).lean();
  },

  softDelete: (id) => softDeleteById(ApplicationModel, id),

  /**
   * How many published projects exist per category. The Shop-by-Application
   * index uses this to avoid linking to an empty category — the client has
   * supplied no application photography yet, so most counts start at zero and
   * a tile that leads nowhere reads as a broken site.
   */
  countsByApplication: () =>
    ApplicationModel.aggregate([
      { $match: { isDeleted: false, isPublished: true } },
      {
        $group: {
          _id: "$application",
          count: { $sum: 1 },
          cover: { $first: "$coverImage" },
        },
      },
      { $project: { _id: 0, application: "$_id", count: 1, cover: 1 } },
    ]),

  allPublishedSlugs: () =>
    ApplicationModel.find({ isDeleted: false, isPublished: true }).select("slug updatedAt").lean(),
};

export { applicationRepository };
