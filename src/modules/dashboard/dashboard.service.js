/**
 * The admin landing screen.
 *
 * Built around the three questions the MOSSANO team actually opens the panel to
 * answer — who is waiting for a reply, which lots are claiming an availability
 * nobody has checked, and what is in the Current Edit — rather than around a
 * grid of totals. Admin Scope opens with "kept simple and easy for the MOSSANO
 * team to manage", and a dashboard of vanity counts is neither.
 */
import { enquiryRepository } from "../enquiry/enquiry.repository.js";
import { enquiryService } from "../enquiry/enquiry.service.js";
import { stoneRepository } from "../stone/stone.repository.js";
import { editRepository } from "../edit/edit.repository.js";
import { editService } from "../edit/edit.service.js";
import { selectionRepository } from "../selection/selection.repository.js";

/**
 * How long an availability claim stays credible before the team should look
 * again. Website §2 sells "verified today"; a fortnight-old check is not that.
 */
const VERIFICATION_STALE_DAYS = 14;

const dashboardService = {
  async summary() {
    const staleBefore = new Date(
      Date.now() - VERIFICATION_STALE_DAYS * 24 * 60 * 60 * 1000,
    );

    const [
      newEnquiries,
      pipeline,
      byType,
      needsVerification,
      availability,
      activeSelections,
      recent,
    ] = await Promise.all([
      enquiryRepository.countNew(),
      enquiryService.pipeline(),
      enquiryRepository.countByType(),
      stoneRepository.countNeedingVerification(staleBefore),
      stoneRepository.countByAvailability(),
      selectionRepository.countActive(),
      enquiryRepository.recent(8),
    ]);

    const currentEdit =
      (await editRepository.findLive()).find((e) => e.status === "current") ??
      null;

    return {
      enquiries: { new: newEnquiries, pipeline, byType, recent },
      stones: {
        needsVerification,
        verificationStaleDays: VERIFICATION_STALE_DAYS,
        byAvailability: availability,
        total: availability.reduce((sum, a) => sum + a.count, 0),
      },
      currentEdit: currentEdit
        ? {
            id: String(currentEdit._id),
            title: currentEdit.title,
            slug: currentEdit.slug,
            stoneCount: (currentEdit.stones ?? []).length,
            isPublished: Boolean(currentEdit.isPublished),
          }
        : null,
      selections: { active: activeSelections },
    };
  },

  /**
   * The work queue: lots whose availability has gone stale, oldest check first.
   * This is the list the team should clear each morning for the site's central
   * claim to stay true.
   */
  async verificationQueue(limit = 25) {
    const staleBefore = new Date(
      Date.now() - VERIFICATION_STALE_DAYS * 24 * 60 * 60 * 1000,
    );

    const { items } = await stoneRepository.findMany({
      availability: ["verification_required"],
      limit,
      page: 1,
      sort: "newest",
    });

    const { items: stale } = await stoneRepository.findMany({
      limit: 200,
      page: 1,
      sort: "newest",
    });
    const overdue = stale
      .filter(
        (s) =>
          s.availability !== "verification_required" &&
          s.availability !== "sold" &&
          (!s.lastVerifiedAt || new Date(s.lastVerifiedAt) < staleBefore),
      )
      .sort(
        (a, b) =>
          new Date(a.lastVerifiedAt ?? 0) - new Date(b.lastVerifiedAt ?? 0),
      );

    return [...items, ...overdue].slice(0, limit);
  },

  /** The Edit ladder, so the monthly rotation is one screen. */
  editLadder() {
    return editService.live();
  },
};

export { dashboardService, VERIFICATION_STALE_DAYS };
