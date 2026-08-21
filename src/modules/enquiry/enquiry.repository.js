import { EnquiryModel } from "./enquiry.model.js";
import { escapeRegex, runPagedQuery, softDeleteById } from "../../utils/repositoryHelpers.js";

const POPULATE = [
  {
    path: "stone",
    select: "name slug mossanoCode availability primaryImageUrl",
  },
  { path: "edit", select: "title slug status" },
  { path: "selection", select: "title token customerName projectName" },
  { path: "assignedTo", select: "name email" },
  {
    path: "sourcing.referenceImages",
    select: "url thumbnailUrl alt width height",
  },
];

function buildFilter({ status, type, search, assignedTo, stoneId, from, to, includeDeleted }) {
  const filter = {};
  if (!includeDeleted) filter.isDeleted = false;
  if (status?.length) filter.status = { $in: status };
  if (type?.length) filter.type = { $in: type };
  if (assignedTo) filter.assignedTo = assignedTo;
  if (stoneId) filter.stone = stoneId;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  if (search?.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [
      { name: rx },
      { company: rx },
      { email: rx },
      { phone: rx },
      { projectName: rx },
      { reference: rx },
      { "stoneSnapshot.mossanoCode": rx },
    ];
  }
  return filter;
}

const enquiryRepository = {
  findMany({ page, limit, ...rest }) {
    return runPagedQuery({
      model: EnquiryModel,
      filter: buildFilter(rest),
      // Newest first: an inbox is read from the top.
      sort: { createdAt: -1 },
      page,
      limit,
      populate: POPULATE,
    });
  },

  findById: (id) => EnquiryModel.findOne({ _id: id, isDeleted: false }).populate(POPULATE).lean(),

  create: (data) => EnquiryModel.create(data),

  async findByIdAndSave(id, patch) {
    const doc = await EnquiryModel.findOne({ _id: id, isDeleted: false });
    if (!doc) return null;
    Object.assign(doc, patch);
    await doc.save();
    return EnquiryModel.findById(doc._id).populate(POPULATE).lean();
  },

  pushNote: (id, note) =>
    EnquiryModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $push: { notes: note } },
      { new: true },
    )
      .populate(POPULATE)
      .lean(),

  softDelete: (id) => softDeleteById(EnquiryModel, id),

  countByStatus: () =>
    EnquiryModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]),

  countByType: () =>
    EnquiryModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $project: { _id: 0, type: "$_id", count: 1 } },
    ]),

  countNew: () => EnquiryModel.countDocuments({ isDeleted: false, status: "new" }),

  recent: (limit = 8) =>
    EnquiryModel.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate(POPULATE)
      .lean(),

  /**
   * The running count behind the human-readable reference. Counts every
   * enquiry ever raised, deleted ones included, so a reference is never
   * reissued — the team quotes these on the phone.
   */
  totalEverCount: () => EnquiryModel.estimatedDocumentCount(),
};

export { enquiryRepository };
