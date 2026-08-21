import { dashboardService } from "./dashboard.service.js";
import { toEnquiryDto } from "../enquiry/enquiry.dto.js";
import { toAdminStoneDto } from "../stone/stone.dto.js";
import { toPublicEditDto } from "../edit/edit.dto.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const summary = asyncHandler(async (_req, res) => {
  const data = await dashboardService.summary();
  return sendSuccess(res, {
    data: {
      ...data,
      enquiries: {
        ...data.enquiries,
        recent: data.enquiries.recent.map(toEnquiryDto),
      },
    },
  });
});

const verificationQueue = asyncHandler(async (_req, res) => {
  const stones = await dashboardService.verificationQueue();
  return sendSuccess(res, { data: stones.map(toAdminStoneDto) });
});

const editLadder = asyncHandler(async (_req, res) => {
  const edits = await dashboardService.editLadder();
  return sendSuccess(res, {
    data: edits.map((e) => toPublicEditDto(e, { stones: e.resolvedStones })),
  });
});

const dashboardController = { summary, verificationQueue, editLadder };

export { dashboardController };
