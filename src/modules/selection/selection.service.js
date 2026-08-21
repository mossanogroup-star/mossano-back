import { randomBytes } from "crypto";
import { selectionRepository } from "./selection.repository.js";
import { stoneRepository } from "../stone/stone.repository.js";
import { nextReference } from "../../utils/counter.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../config/logger.js";

/**
 * 32 bytes of CSPRNG output, base64url — 256 bits, unguessable by construction.
 *
 * The token is the only access control on a private selection, so it must not
 * be sequential, must not encode the customer's name, and must not be short
 * enough to enumerate. The existence check is belt-and-braces against the
 * unique index; at this width a collision is not a real event.
 */
async function generateToken() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = randomBytes(32).toString("base64url");
    if (!(await selectionRepository.tokenExists(token))) return token;
  }
  throw new Error("Could not generate a unique selection token");
}

function buildPatch(body) {
  const patch = { ...body };

  if (body.imageIds !== undefined) {
    patch.images = body.imageIds;
    delete patch.imageIds;
  }
  // The admin sends either a plain id list or annotated items; both land in
  // the same ordered shape.
  if (body.stoneIds !== undefined) {
    patch.items = body.stoneIds.map((stone) => ({ stone }));
    delete patch.stoneIds;
  }
  if (body.items !== undefined) {
    patch.items = body.items.map(({ stone, note }) => ({ stone, note }));
  }
  return patch;
}

const selectionService = {
  list(query) {
    return selectionRepository.findMany(query);
  },

  async get(id) {
    const selection = await selectionRepository.findById(id);
    if (!selection) throw new AppError("Selection not found", 404);
    return selection;
  },

  /**
   * Resolves the selection's stones in the curated order, each carrying its
   * per-stone note. `publishedOnly: false` on purpose — the team may curate a
   * lot that is not on the public Stone Shop yet, and the customer holding the
   * link is meant to see exactly what was chosen for them.
   */
  async resolveItems(selection) {
    const ids = (selection.items ?? []).map((i) => i.stone);
    const stones = await stoneRepository.findManyByIdsOrdered(ids, {
      publishedOnly: false,
    });

    const noteById = new Map((selection.items ?? []).map((i) => [String(i.stone), i.note ?? null]));
    return stones.map((stone) => ({
      stone,
      note: noteById.get(String(stone._id)) ?? null,
    }));
  },

  /**
   * The customer-facing lookup. Distinguishes "no such link" from "this link
   * has expired" because the two need different words in front of an architect
   * who was sent something perfectly legitimate three months ago.
   */
  async getByToken(token) {
    const selection = await selectionRepository.findLiveByToken(token);
    if (selection) {
      // Fire-and-forget: a failed analytics write must never stop the customer
      // seeing their selection.
      selectionRepository
        .recordView(selection._id)
        .catch((err) => logger.warn({ err }, "Could not record selection view"));
      return selection;
    }

    const any = await selectionRepository.findAnyByToken(token);
    if (!any) throw new AppError("This selection link is not valid", 404);
    if (any.isRevoked) {
      throw new AppError("This selection is no longer being shared. Contact MOSSANO.", 410, {
        code: "SELECTION_REVOKED",
      });
    }
    if (any.expiresAt && any.expiresAt <= new Date()) {
      throw new AppError(
        "This selection link has expired. Contact MOSSANO for an updated one.",
        410,
        {
          code: "SELECTION_EXPIRED",
        },
      );
    }
    throw new AppError("This selection is not available yet", 404);
  },

  publicUrl: (token) => `${env.PUBLIC_BASE_URL}/selection/${token}`,

  async create(body, user) {
    const patch = buildPatch(body);

    patch.token = await generateToken();
    patch.reference = await nextReference("selection", "MM-S");

    if (patch.expiresAt === undefined && env.SELECTION_LINK_TTL_DAYS) {
      patch.expiresAt = new Date(Date.now() + env.SELECTION_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
    }

    const created = await selectionRepository.create({
      ...patch,
      createdBy: user?.id,
    });
    logger.info(
      { reference: created.reference, customer: created.customerName },
      "Selection created",
    );
    return selectionRepository.findById(created._id);
  },

  async update(id, body, user) {
    const patch = buildPatch(body);
    // The link is already with the customer; regenerating it is a deliberate
    // act, not a side effect of editing a title.
    delete patch.token;
    delete patch.reference;

    const updated = await selectionRepository.findByIdAndSave(id, {
      ...patch,
      updatedBy: user?.id,
    });
    if (!updated) throw new AppError("Selection not found", 404);
    return updated;
  },

  /** Cuts off access immediately without destroying the record. */
  async revoke(id, user) {
    const updated = await selectionRepository.findByIdAndSave(id, {
      isRevoked: true,
      updatedBy: user?.id,
    });
    if (!updated) throw new AppError("Selection not found", 404);
    return updated;
  },

  async restore(id, user) {
    const updated = await selectionRepository.findByIdAndSave(id, {
      isRevoked: false,
      updatedBy: user?.id,
    });
    if (!updated) throw new AppError("Selection not found", 404);
    return updated;
  },

  /** Issues a new link and invalidates the old one in a single step. */
  async regenerateLink(id, user) {
    const token = await generateToken();
    const updated = await selectionRepository.findByIdAndSave(id, {
      token,
      isRevoked: false,
      expiresAt: env.SELECTION_LINK_TTL_DAYS
        ? new Date(Date.now() + env.SELECTION_LINK_TTL_DAYS * 24 * 60 * 60 * 1000)
        : undefined,
      updatedBy: user?.id,
    });
    if (!updated) throw new AppError("Selection not found", 404);
    return updated;
  },

  async addNote(id, body, user) {
    const updated = await selectionRepository.pushNote(id, {
      body,
      author: user.id,
      authorName: user.name,
      createdAt: new Date(),
    });
    if (!updated) throw new AppError("Selection not found", 404);
    return updated;
  },

  async remove(id) {
    const deleted = await selectionRepository.softDelete(id);
    if (!deleted) throw new AppError("Selection not found", 404);
    return { id };
  },
};

export { selectionService, generateToken };
