/**
 * Shared query plumbing. Every repository paginates the same way and escapes
 * search input the same way, so neither is re-derived per module.
 */

/** Neutralises regex metacharacters in user-supplied search text. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 200;

/**
 * Runs a filtered, sorted, paginated query and returns the items alongside the
 * meta block the API's `{ data, meta }` envelope expects.
 */
async function runPagedQuery({
  model,
  filter = {},
  sort = { createdAt: -1 },
  page = 1,
  limit = DEFAULT_LIMIT,
  populate,
  select,
}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT));
  const skip = (safePage - 1) * safeLimit;

  let query = model.find(filter).sort(sort).skip(skip).limit(safeLimit);
  if (select) query = query.select(select);
  if (populate) query = query.populate(populate);

  const [items, total] = await Promise.all([query.lean(), model.countDocuments(filter)]);

  return {
    items,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    hasMore: skip + items.length < total,
  };
}

/**
 * Soft delete. Records referenced elsewhere — a stone attached to a six-month-old
 * enquiry, say — must stop appearing in the catalogue without disappearing from
 * that enquiry.
 */
async function softDeleteById(model, id) {
  return model
    .findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    )
    .lean();
}

async function restoreById(model, id) {
  return model
    .findOneAndUpdate(
      { _id: id, isDeleted: true },
      { $set: { isDeleted: false }, $unset: { deletedAt: 1 } },
      { new: true },
    )
    .lean();
}

export { escapeRegex, runPagedQuery, softDeleteById, restoreById, DEFAULT_LIMIT, MAX_LIMIT };
