import { SelectionModel } from "./selection.model.js";
import {
  escapeRegex,
  runPagedQuery,
  softDeleteById,
} from "../../utils/repositoryHelpers.js";

const POPULATE = [
  {
    path: "images",
    select: "url thumbnailUrl storageKey resourceType alt caption width height",
  },
  { path: "createdBy", select: "name" },
  { path: "sourceEnquiry", select: "reference name company" },
];

function buildFilter({
  search,
  publishedOnly,
  includeRevoked,
  includeDeleted,
}) {
  const filter = {};
  if (!includeDeleted) filter.isDeleted = false;
  if (publishedOnly) filter.isPublished = true;
  if (!includeRevoked) filter.isRevoked = false;

  if (search?.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [
      { title: rx },
      { customerName: rx },
      { projectName: rx },
      { reference: rx },
    ];
  }
  return filter;
}

const selectionRepository = {
  findMany({ page, limit, ...rest }) {
    return runPagedQuery({
      model: SelectionModel,
      filter: buildFilter(rest),
      sort: { createdAt: -1 },
      page,
      limit,
      populate: POPULATE,
    });
  },

  findById: (id) =>
    SelectionModel.findOne({ _id: id, isDeleted: false })
      .populate(POPULATE)
      .lean(),

  /**
   * The public link's lookup. Every guard is in the query rather than checked
   * afterwards, so no caller can accidentally serve a revoked, unpublished or
   * expired selection by forgetting a condition.
   */
  findLiveByToken: (token) =>
    SelectionModel.findOne({
      token,
      isDeleted: false,
      isRevoked: false,
      isPublished: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    })
      .populate(POPULATE)
      .lean(),

  /** Used only to tell "wrong token" apart from "expired or revoked". */
  findAnyByToken: (token) =>
    SelectionModel.findOne({ token, isDeleted: false }).lean(),

  tokenExists: (token) => SelectionModel.exists({ token }),

  create: (data) => SelectionModel.create(data),

  async findByIdAndSave(id, patch) {
    const doc = await SelectionModel.findOne({ _id: id, isDeleted: false });
    if (!doc) return null;
    Object.assign(doc, patch);
    await doc.save();
    return SelectionModel.findById(doc._id).populate(POPULATE).lean();
  },

  pushNote: (id, note) =>
    SelectionModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $push: { notes: note } },
      { new: true },
    )
      .populate(POPULATE)
      .lean(),

  /**
   * Records a view without a read-modify-write. `$inc` and `$max` are atomic,
   * and `$min` on firstViewedAt means the earliest view wins however many
   * requests land at once.
   */
  recordView: (id, at = new Date()) =>
    SelectionModel.updateOne(
      { _id: id },
      {
        $inc: { viewCount: 1 },
        $max: { lastViewedAt: at },
        $min: { firstViewedAt: at },
      },
    ),

  softDelete: (id) => softDeleteById(SelectionModel, id),

  countActive: () =>
    SelectionModel.countDocuments({
      isDeleted: false,
      isRevoked: false,
      isPublished: true,
    }),

  recent: (limit = 5) =>
    SelectionModel.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate(POPULATE)
      .lean(),
};

export { selectionRepository };
