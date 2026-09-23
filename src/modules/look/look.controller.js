import { lookService } from "./look.service.js";
import { toLookContentDto } from "./look.dto.js";
import { LOOKS, labelOf } from "../stone/stone.constants.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const listContent = asyncHandler(async (_req, res) => {
  const rows = await lookService.listContent();
  return sendSuccess(res, {
    data: rows.map(({ slug, label, content }) => toLookContentDto(content, { slug, label })),
  });
});

const saveContent = asyncHandler(async (req, res) => {
  const { look } = req.validated.params;
  const saved = await lookService.saveContent(look, req.validated.body, req.user);
  return sendSuccess(res, {
    message: "Saved",
    data: toLookContentDto(saved, { slug: look, label: labelOf(LOOKS, look) }),
  });
});

const lookController = { listContent, saveContent };

export { lookController };
