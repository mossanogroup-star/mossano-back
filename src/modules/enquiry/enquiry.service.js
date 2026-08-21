import { enquiryRepository } from "./enquiry.repository.js";
import { stoneRepository } from "../stone/stone.repository.js";
import { nextReference } from "../../utils/counter.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../config/logger.js";
import { notifyEnquiry } from "../../utils/notify/index.js";
import { ENQUIRY_PIPELINE } from "./enquiry.constants.js";

/**
 * Turns a public form submission into an enquiry.
 *
 * The stone is resolved from its slug rather than trusted as an id, and its
 * code and name are snapshotted at the same moment. That snapshot is what makes
 * the record readable a year later: lots get renamed, and a deleted lot would
 * otherwise leave an enquiry that says only "a stone".
 */
async function attachStone(body) {
  if (!body.stoneSlug && !body.stoneId) return {};

  const stone = body.stoneSlug
    ? await stoneRepository.findBySlug(body.stoneSlug, { publishedOnly: false })
    : await stoneRepository.findById(body.stoneId);

  // A stale link should not lose the enquiry — the message still matters, and
  // the team can work out which lot it was from what the customer wrote.
  if (!stone) {
    logger.warn(
      { stoneSlug: body.stoneSlug, stoneId: body.stoneId },
      "Enquiry names an unknown stone",
    );
    return {};
  }

  return {
    stone: stone._id,
    stoneSnapshot: { mossanoCode: stone.mossanoCode, name: stone.name },
  };
}

const enquiryService = {
  list(query) {
    return enquiryRepository.findMany(query);
  },

  async get(id) {
    const enquiry = await enquiryRepository.findById(id);
    if (!enquiry) throw new AppError("Enquiry not found", 404);
    return enquiry;
  },

  /**
   * The single entry point for every public form: contact, stone enquiry,
   * reserve, slab video, sourcing brief, pre-book, register interest, and a
   * message raised from inside a private selection.
   */
  async submit(body, context = {}) {
    const reference = await nextReference("enquiry", "MM-E");

    const created = await enquiryRepository.create({
      ...body,
      ...(await attachStone(body)),
      reference,
      status: "new",
      sourcePath: context.sourcePath,
      userAgent: context.userAgent,
    });

    logger.info(
      {
        reference,
        type: created.type,
        stone: created.stoneSnapshot?.mossanoCode,
      },
      "Enquiry received",
    );

    const enquiry = await enquiryRepository.findById(created._id);

    /**
     * Alert the team — the client's "Backend automatically → Executive ko
     * WhatsApp".
     *
     * Deliberately not awaited. The customer's confirmation should not wait on
     * an SMTP handshake or Meta's Graph API, and it must not fail if either is
     * down: the enquiry is already committed, and losing the lead because a
     * notification channel hiccuped would invert the priority completely.
     * notifyEnquiry never throws, but .catch() guards the promise itself.
     */
    notifyEnquiry(enquiry).catch((err) =>
      logger.error({ err, reference }, "Enquiry alert threw unexpectedly"),
    );

    return enquiry;
  },

  /**
   * Moving the lead along the pipeline. `firstRespondedAt` is stamped the first
   * time it leaves "new" and never overwritten, so response time stays a
   * measurement of the first reply rather than the most recent edit.
   */
  async setStatus(id, status) {
    const enquiry = await enquiryRepository.findById(id);
    if (!enquiry) throw new AppError("Enquiry not found", 404);

    const patch = { status };
    if (status !== "new" && !enquiry.firstRespondedAt) patch.firstRespondedAt = new Date();

    return enquiryRepository.findByIdAndSave(id, patch);
  },

  async update(id, patch) {
    const updated = await enquiryRepository.findByIdAndSave(id, patch);
    if (!updated) throw new AppError("Enquiry not found", 404);
    return updated;
  },

  async addNote(id, body, user) {
    const updated = await enquiryRepository.pushNote(id, {
      body,
      author: user.id,
      authorName: user.name,
      createdAt: new Date(),
    });
    if (!updated) throw new AppError("Enquiry not found", 404);
    return updated;
  },

  async assign(id, userId) {
    const updated = await enquiryRepository.findByIdAndSave(id, {
      assignedTo: userId || null,
    });
    if (!updated) throw new AppError("Enquiry not found", 404);
    return updated;
  },

  async remove(id) {
    const deleted = await enquiryRepository.softDelete(id);
    if (!deleted) throw new AppError("Enquiry not found", 404);
    return { id };
  },

  /** The pipeline board, with every stage present even at zero. */
  async pipeline() {
    const counts = await enquiryRepository.countByStatus();
    const byStatus = new Map(counts.map((c) => [c.status, c.count]));
    return ENQUIRY_PIPELINE.map((status) => ({
      status,
      count: byStatus.get(status) ?? 0,
    }));
  },

  stats() {
    return Promise.all([
      enquiryRepository.countByStatus(),
      enquiryRepository.countByType(),
      enquiryRepository.countNew(),
    ]).then(([byStatus, byType, newCount]) => ({ byStatus, byType, newCount }));
  },
};

export { enquiryService };
