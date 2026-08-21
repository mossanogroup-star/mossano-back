import { editRepository } from "./edit.repository.js";
import { stoneRepository } from "../stone/stone.repository.js";
import { uniqueSlug } from "../../utils/slugify.js";
import { AppError } from "../../utils/AppError.js";
import { invalidateStorefront } from "../stone/stone.service.js";
import { EDIT_STATUSES } from "./edit.model.js";

/** Only one Edit may hold each of these at a time. */
const EXCLUSIVE_STATUSES = ["current", "next", "upcoming"];

function buildPatch(body) {
  const patch = { ...body };
  if (body.imageIds !== undefined) {
    patch.images = body.imageIds;
    delete patch.imageIds;
  }
  if (body.stoneIds !== undefined) {
    patch.stones = body.stoneIds;
    delete patch.stoneIds;
  }
  return patch;
}

const editService = {
  list(query) {
    return editRepository.findMany(query);
  },

  async get(id) {
    const edit = await editRepository.findById(id);
    if (!edit) throw new AppError("Edit not found", 404);
    return edit;
  },

  async getBySlug(slug, opts) {
    const edit = await editRepository.findBySlug(slug, opts);
    if (!edit) throw new AppError("Edit not found", 404);
    return edit;
  },

  /**
   * Resolves an Edit's stones in the curated order.
   *
   * Kept out of the repository's populate because the storefront needs the
   * stones' full DTO — availability, verification freshness, WhatsApp links —
   * and a nested populate two levels deep (edit → stone → media) is both slower
   * and harder to keep in step with the stone module's own POPULATE list.
   */
  resolveStones(edit, { publishedOnly = true } = {}) {
    return stoneRepository.findManyByIdsOrdered(edit.stones ?? [], { publishedOnly });
  },

  /** The three live bands, each with its stones, ready for Website §2. */
  async live() {
    const edits = await editRepository.findLive();

    const withStones = await Promise.all(
      edits.map(async (edit) => ({
        ...edit,
        resolvedStones: await this.resolveStones(edit),
      })),
    );

    // Ordered as the page presents them, not as Mongo returned them.
    const order = { current: 0, next: 1, upcoming: 2 };
    return withStones.sort((a, b) => order[a.status] - order[b.status]);
  },

  async create(body, user) {
    const patch = buildPatch(body);
    patch.slug = await uniqueSlug(body.title, (s) => editRepository.slugExists(s));

    const created = await editRepository.create({ ...patch, createdBy: user?.id });

    if (EXCLUSIVE_STATUSES.includes(created.status)) {
      await editRepository.demoteOthersWithStatus(created.status, created._id);
    }
    invalidateStorefront();
    return editRepository.findById(created._id);
  },

  async update(id, body, user) {
    const patch = buildPatch(body);
    // As with stones: an Edit's URL may already be circulating, so a retitle
    // does not silently move it.
    delete patch.slug;

    const updated = await editRepository.findByIdAndSave(id, { ...patch, updatedBy: user?.id });
    if (!updated) throw new AppError("Edit not found", 404);

    if (patch.status && EXCLUSIVE_STATUSES.includes(patch.status)) {
      await editRepository.demoteOthersWithStatus(patch.status, id);
    }
    invalidateStorefront();
    return editRepository.findById(id);
  },

  /**
   * The monthly rotation, as one action. Admin Scope §3's example is
   * August → Current, September → Next, October → Upcoming; each month the
   * whole ladder moves up, and doing that as three separate status edits
   * leaves the site briefly showing two Current Edits or none.
   */
  async setStatus(id, status, user) {
    if (!EDIT_STATUSES.includes(status)) throw new AppError("Unknown status", 400);

    const edit = await editRepository.findById(id);
    if (!edit) throw new AppError("Edit not found", 404);

    if (EXCLUSIVE_STATUSES.includes(status)) {
      await editRepository.demoteOthersWithStatus(status, id);
    }
    const updated = await editRepository.findByIdAndSave(id, { status, updatedBy: user?.id });

    invalidateStorefront();
    return updated;
  },

  /** Append without disturbing the curated order, and without duplicating. */
  async addStones(id, stoneIds, user) {
    const edit = await editRepository.findById(id);
    if (!edit) throw new AppError("Edit not found", 404);

    const existing = (edit.stones ?? []).map(String);
    const merged = [...existing, ...stoneIds.map(String).filter((s) => !existing.includes(s))];

    const updated = await editRepository.findByIdAndSave(id, {
      stones: merged,
      updatedBy: user?.id,
    });
    invalidateStorefront();
    return updated;
  },

  async removeStone(id, stoneId, user) {
    const edit = await editRepository.findById(id);
    if (!edit) throw new AppError("Edit not found", 404);

    const updated = await editRepository.findByIdAndSave(id, {
      stones: (edit.stones ?? []).filter((s) => String(s) !== String(stoneId)),
      updatedBy: user?.id,
    });
    invalidateStorefront();
    return updated;
  },

  async remove(id) {
    const deleted = await editRepository.softDelete(id);
    if (!deleted) throw new AppError("Edit not found", 404);
    invalidateStorefront();
    return { id };
  },
};

export { editService };
