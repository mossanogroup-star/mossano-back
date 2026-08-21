import { MediaModel } from "./media.model.js";
import { escapeRegex, runPagedQuery, softDeleteById } from "../../utils/repositoryHelpers.js";

function buildFilter({ kind, search }) {
  const filter = { isDeleted: false };
  if (kind) filter.kind = kind;
  if (search?.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ filename: rx }, { alt: rx }, { caption: rx }];
  }
  return filter;
}

const mediaRepository = {
  findMany({ page, limit, ...rest }) {
    return runPagedQuery({
      model: MediaModel,
      filter: buildFilter(rest),
      sort: { createdAt: -1 },
      page,
      limit,
    });
  },

  findById: (id) => MediaModel.findOne({ _id: id, isDeleted: false }).lean(),

  /**
   * Used when a stone or selection resolves its image list. Ordering is the
   * caller's job — Mongo returns these in whatever order it likes, and a slab
   * gallery whose order shuffles between requests looks broken.
   */
  findManyByIds: (ids) =>
    MediaModel.find({ _id: { $in: ids || [] }, isDeleted: false }).lean(),

  create: (data) => MediaModel.create(data),

  insertMany: (docs) => MediaModel.insertMany(docs),

  update: (id, patch) =>
    MediaModel.findOneAndUpdate({ _id: id, isDeleted: false }, patch, { new: true }).lean(),

  softDelete: (id) => softDeleteById(MediaModel, id),

  kindCounts: () =>
    MediaModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$kind", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, kind: "$_id", count: 1 } },
    ]),
};

export { mediaRepository };
