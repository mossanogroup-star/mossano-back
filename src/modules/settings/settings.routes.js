import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/auth.js";
import { canRead, canManage } from "../../middlewares/role.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { makeSchema } from "../../utils/resourceValidationHelpers.js";
import { objectIdSchema } from "../../utils/validationPrimitives.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { settingsService, toSettingsDto } from "./settings.service.js";

const settingsSaveSchema = makeSchema({
  body: z.object({
    showLooks: z.boolean().optional(),
    showApplications: z.boolean().optional(),
    // null clears the pick and hands the hero back to resolveHero's ranking.
    heroImageId: objectIdSchema.nullable().optional(),
  }),
});

const router = Router();

router.use(authenticate);

router.get(
  "/",
  canRead,
  asyncHandler(async (_req, res) =>
    sendSuccess(res, { data: toSettingsDto(await settingsService.get()) }),
  ),
);

router.put(
  "/",
  canManage,
  validateRequest(settingsSaveSchema),
  asyncHandler(async (req, res) =>
    sendSuccess(res, {
      message: "Saved",
      data: toSettingsDto(await settingsService.save(req.validated.body, req.user)),
    }),
  ),
);

export default router;
