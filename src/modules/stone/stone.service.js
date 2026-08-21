import { stoneRepository } from "./stone.repository.js";
import { mediaRepository } from "../media/media.repository.js";
import { AVAILABILITY_RANK } from "./stone.constants.js";
import { uniqueSlug } from "../../utils/slugify.js";
import { nextSequence, ensureCounterAtLeast } from "../../utils/counter.js";
import { AppError } from "../../utils/AppError.js";
import { htmlCache } from "../../ssr/htmlCache.js";

const STONE_CODE_COUNTER = "stone-code";

/**
 * Drops the whole cache rather than enumerating the pages a stone appears on.
 *
 * Miss one and a customer sees a lot listed Available that sold this morning.
 * Admin writes happen a few times a day and a cold page costs one render, so
 * correctness is worth far more here than the renders it saves.
 */
function invalidateStorefront() {
  htmlCache.clear();
}

/**
 * MM-024 style, zero-padded so lexical and numeric order agree.
 *
 * From an atomic counter, not "highest + 1": the code is uniquely indexed, so
 * two stones created in the same moment must not race onto one number. The
 * counter is first nudged past any imported codes.
 */
async function nextMossanoCode() {
  const highest = await stoneRepository.highestCode();
  const existing = highest?.mossanoCode ? Number(highest.mossanoCode.replace(/^MM-/, "")) : 0;
  await ensureCounterAtLeast(STONE_CODE_COUNTER, existing);

  const seq = await nextSequence(STONE_CODE_COUNTER);
  return `MM-${String(seq).padStart(3, "0")}`;
}

/**
 * The card image: first image still live, in the caller's order. Without the
 * liveness check a card keeps pointing at a deleted file.
 */
async function resolvePrimaryImage(imageIds) {
  if (!imageIds?.length) return { primaryImageUrl: null, primaryImageAlt: null };

  const media = await mediaRepository.findManyByIds(imageIds);
  if (!media.length) return { primaryImageUrl: null, primaryImageAlt: null };

  const byId = new Map(media.map((m) => [String(m._id), m]));
  for (const id of imageIds) {
    const hit = byId.get(String(id));
    if (hit) return { primaryImageUrl: hit.url, primaryImageAlt: hit.alt || "" };
  }
  return { primaryImageUrl: null, primaryImageAlt: null };
}

/**
 * Request body to document patch.
 *
 * The rule worth stating: availability and lastVerifiedAt move together, or
 * Website §2's "verified today" claims a freshness nobody checked.
 */
function buildPatch(body, { touchVerified = true } = {}) {
  const patch = { ...body };

  if (body.imageIds !== undefined) {
    patch.images = body.imageIds;
    delete patch.imageIds;
  }
  if (body.videoIds !== undefined) {
    patch.videos = body.videoIds;
    delete patch.videoIds;
  }

  if (body.availability !== undefined) {
    patch.availabilityRank = AVAILABILITY_RANK[body.availability] ?? 2;
    if (touchVerified) patch.lastVerifiedAt = new Date();
  }

  return patch;
}

const stoneService = {
  list(query) {
    return stoneRepository.findMany(query);
  },

  async get(id) {
    const stone = await stoneRepository.findById(id);
    if (!stone) throw new AppError("Stone not found", 404);
    return stone;
  },

  async getBySlug(slug, opts) {
    const stone = await stoneRepository.findBySlug(slug, opts);
    if (!stone) throw new AppError("Stone not found", 404);
    return stone;
  },

  async create(body, user) {
    const patch = buildPatch(body);

    // The lot number beats a counter as a discriminator: two lots of Classic
    // Beige become classic-beige-16858 and classic-beige-17391.
    patch.slug = await uniqueSlug(body.name, (s) => stoneRepository.slugExists(s), {
      discriminator: body.lotNumber,
    });
    patch.mossanoCode = body.mossanoCode || (await nextMossanoCode());
    Object.assign(patch, await resolvePrimaryImage(patch.images));

    if (patch.availabilityRank === undefined) {
      patch.availabilityRank = AVAILABILITY_RANK[patch.availability || "verification_required"];
    }

    const created = await stoneRepository.create({
      ...patch,
      createdBy: user?.id,
    });
    invalidateStorefront();
    return stoneRepository.findById(created._id);
  },

  async update(id, body, user) {
    const patch = buildPatch(body);

    // A rename must not move the slug: links live in architects' notes for
    // months, and a tidier URL is not worth 404-ing all of them.
    delete patch.slug;

    if (patch.images !== undefined) {
      Object.assign(patch, await resolvePrimaryImage(patch.images));
    }

    const updated = await stoneRepository.findByIdAndSave(id, {
      ...patch,
      updatedBy: user?.id,
    });
    if (!updated) throw new AppError("Stone not found", 404);

    invalidateStorefront();
    return updated;
  },

  /**
   * Admin Scope §2, as its own action: the team makes this change constantly,
   * from a list row rather than a form.
   */
  async setAvailability(id, availability, user) {
    const updated = await stoneRepository.findByIdAndSave(id, {
      availability,
      availabilityRank: AVAILABILITY_RANK[availability],
      lastVerifiedAt: new Date(),
      updatedBy: user?.id,
    });
    if (!updated) throw new AppError("Stone not found", 404);

    invalidateStorefront();
    return updated;
  },

  /**
   * "Availability verified today" without changing the status — the team
   * confirming that what the site already claims is still true.
   */
  async markVerified(id, user) {
    const updated = await stoneRepository.findByIdAndSave(id, {
      lastVerifiedAt: new Date(),
      updatedBy: user?.id,
    });
    if (!updated) throw new AppError("Stone not found", 404);

    invalidateStorefront();
    return updated;
  },

  async remove(id) {
    const deleted = await stoneRepository.softDelete(id);
    if (!deleted) throw new AppError("Stone not found", 404);
    invalidateStorefront();
    return { id };
  },

  facets(baseFilter) {
    return stoneRepository.facets(baseFilter);
  },

  /**
   * Same look first, then same colour: someone who opened a Dark & Moody slab
   * is looking for the mood, not the mineralogy.
   */
  async related(stone, limit = 6) {
    const byLook = stone.looks?.length
      ? await stoneRepository.findMany({
          look: stone.looks,
          excludeId: stone._id,
          publishedOnly: true,
          limit,
          page: 1,
        })
      : { items: [] };

    if (byLook.items.length >= limit) return byLook.items;

    const seen = new Set(byLook.items.map((s) => String(s._id)));
    const byColour = stone.colour
      ? await stoneRepository.findMany({
          colour: [stone.colour],
          excludeId: stone._id,
          publishedOnly: true,
          limit,
          page: 1,
        })
      : { items: [] };

    return [...byLook.items, ...byColour.items.filter((s) => !seen.has(String(s._id)))].slice(
      0,
      limit,
    );
  },
};

export { stoneService, invalidateStorefront, nextMossanoCode, resolvePrimaryImage };
