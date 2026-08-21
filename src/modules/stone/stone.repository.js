import { StoneModel } from "./stone.model.js";
import {
  escapeRegex,
  runPagedQuery,
  softDeleteById,
} from "../../utils/repositoryHelpers.js";

const POPULATE = [
  {
    path: "images",
    select:
      "url thumbnailUrl storageKey resourceType alt caption width height mimeType kind",
  },
  {
    path: "videos",
    select:
      "url thumbnailUrl storageKey resourceType alt caption mimeType kind",
  },
  {
    path: "slabs.image",
    select:
      "url thumbnailUrl storageKey resourceType alt width height mimeType kind",
  },
];

const SORTS = {
  // What a customer can buy today, first. See AVAILABILITY_RANK.
  default: { availabilityRank: 1, createdAt: -1 },
  newest: { createdAt: -1 },
  name: { name: 1 },
  "area-desc": { areaSqFt: -1 },
  "area-asc": { areaSqFt: 1 },
};

/**
 * Builds the Mongo filter for the Stone Shop's rail (Website §3).
 *
 * `publicOnly` is the storefront's guard: unpublished stones and soft-deleted
 * ones are invisible to customers but still listed in the admin. It is applied
 * here rather than in the service so no query path can forget it.
 */
function buildFilter({
  search,
  material,
  colour,
  origin,
  look,
  application,
  availability,
  finish,
  featured,
  publishedOnly,
  includeDeleted,
  ids,
  excludeId,
  minAreaSqFt,
}) {
  const filter = {};
  if (!includeDeleted) filter.isDeleted = false;
  if (publishedOnly) filter.isPublished = true;
  if (featured) filter.isFeatured = true;

  // Array filters accept one value or many: ?look=dramatic,dark-moody
  if (material?.length) filter.material = { $in: material };
  if (colour?.length) filter.colour = { $in: colour };
  if (look?.length) filter.looks = { $in: look };
  if (application?.length) filter.applications = { $in: application };
  if (availability?.length) filter.availability = { $in: availability };
  if (finish?.length) filter.finish = { $in: finish };

  if (origin) filter.origin = new RegExp(escapeRegex(origin), "i");
  if (minAreaSqFt) filter.areaSqFt = { $gte: minAreaSqFt };
  if (ids?.length) filter._id = { $in: ids };
  if (excludeId) filter._id = { ...(filter._id || {}), $ne: excludeId };

  if (search?.trim()) {
    // A regex $or rather than $text: customers search partial codes ("MM-02")
    // and partial lot numbers, and $text only matches whole tokens.
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [
      { name: rx },
      { mossanoCode: rx },
      { lotNumber: rx },
      { origin: rx },
    ];
  }

  return filter;
}

const stoneRepository = {
  findMany({ page, limit, sort, ...rest }) {
    return runPagedQuery({
      model: StoneModel,
      filter: buildFilter(rest),
      sort: SORTS[sort] || SORTS.default,
      page,
      limit,
      populate: POPULATE,
    });
  },

  findById: (id, { includeDeleted = false } = {}) =>
    StoneModel.findOne({
      _id: id,
      ...(includeDeleted ? {} : { isDeleted: false }),
    })
      .populate(POPULATE)
      .lean(),

  /** The storefront's stone page addresses a stone by slug, not id. */
  findBySlug: (slug, { publishedOnly = true } = {}) =>
    StoneModel.findOne({
      slug: String(slug).toLowerCase(),
      isDeleted: false,
      ...(publishedOnly ? { isPublished: true } : {}),
    })
      .populate(POPULATE)
      .lean(),

  findByCode: (mossanoCode) =>
    StoneModel.findOne({
      mossanoCode: String(mossanoCode).toUpperCase(),
      isDeleted: false,
    })
      .populate(POPULATE)
      .lean(),

  /**
   * Resolves a list of ids while preserving the caller's ordering. Edits and
   * private selections are curated — the order the team chose is part of the
   * curation, and `$in` returns whatever order Mongo likes.
   */
  async findManyByIdsOrdered(ids, { publishedOnly = false } = {}) {
    if (!ids?.length) return [];
    const docs = await StoneModel.find({
      _id: { $in: ids },
      isDeleted: false,
      ...(publishedOnly ? { isPublished: true } : {}),
    })
      .populate(POPULATE)
      .lean();

    const byId = new Map(docs.map((d) => [String(d._id), d]));
    return ids.map((id) => byId.get(String(id))).filter(Boolean);
  },

  slugExists: (slug, exceptId) =>
    StoneModel.exists({
      slug: String(slug).toLowerCase(),
      ...(exceptId ? { _id: { $ne: exceptId } } : {}),
    }),

  create: (data) => StoneModel.create(data),

  async findByIdAndSave(id, patch) {
    const doc = await StoneModel.findOne({ _id: id, isDeleted: false });
    if (!doc) return null;
    Object.assign(doc, patch);
    await doc.save();
    return StoneModel.findById(doc._id).populate(POPULATE).lean();
  },

  softDelete: (id) => softDeleteById(StoneModel, id),

  /**
   * The highest MOSSANO code issued so far, so the next one continues the
   * sequence. Sorted as a string because the codes are zero-padded (MM-001 …
   * MM-024), which makes lexical and numeric order the same thing.
   */
  highestCode: () =>
    StoneModel.findOne({ mossanoCode: /^MM-\d+$/ })
      .sort({ mossanoCode: -1 })
      .select("mossanoCode")
      .lean(),

  /**
   * Counts for the filter rail. A filter that returns zero results reads as a
   * broken site, so the storefront hides any option whose count is nil.
   */
  async facets(baseFilter = {}) {
    const match = { isDeleted: false, isPublished: true, ...baseFilter };
    const countBy = (field) => [
      { $match: match },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, value: "$_id", count: 1 } },
    ];
    const countByArray = (field) => [
      { $match: match },
      { $unwind: `$${field}` },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, value: "$_id", count: 1 } },
    ];

    const [
      material,
      colour,
      finish,
      availability,
      looks,
      applications,
      origin,
    ] = await Promise.all([
      StoneModel.aggregate(countBy("material")),
      StoneModel.aggregate(countBy("colour")),
      StoneModel.aggregate(countBy("finish")),
      StoneModel.aggregate(countBy("availability")),
      StoneModel.aggregate(countByArray("looks")),
      StoneModel.aggregate(countByArray("applications")),
      StoneModel.aggregate(countBy("origin")),
    ]);

    return {
      material,
      colour,
      finish,
      availability,
      looks,
      applications,
      origin,
    };
  },

  /** Admin dashboard: lots whose availability claim has gone stale. */
  countNeedingVerification: (staleBefore) =>
    StoneModel.countDocuments({
      isDeleted: false,
      $or: [
        { availability: "verification_required" },
        { lastVerifiedAt: { $lt: staleBefore } },
        { lastVerifiedAt: { $exists: false } },
      ],
    }),

  countByAvailability: () =>
    StoneModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$availability", count: { $sum: 1 } } },
      { $project: { _id: 0, availability: "$_id", count: 1 } },
    ]),

  /** Every published slug, for the sitemap. */
  allPublishedSlugs: () =>
    StoneModel.find({ isDeleted: false, isPublished: true })
      .select("slug updatedAt")
      .sort({ updatedAt: -1 })
      .lean(),
};

export { stoneRepository, buildFilter, SORTS };
