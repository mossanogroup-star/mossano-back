import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { canRead, canManage, adminOnly } from "../../middlewares/role.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { stoneController } from "./stone.controller.js";
import {
  stoneAdminListSchema,
  stoneCreateSchema,
  stoneGetSchema,
  stoneUpdateSchema,
  stoneDeleteSchema,
  stoneAvailabilitySchema,
  stoneVerifySchema,
} from "./stone.validation.js";

const router = Router();

router.use(authenticate);

// Static paths before /:id, or "facets" is parsed as an id.
router.get("/facets", canRead, stoneController.facets);
router.get("/options", canRead, validateRequest(stoneAdminListSchema), stoneController.options);
router.get("/", canRead, validateRequest(stoneAdminListSchema), stoneController.list);

router.post("/", canManage, validateRequest(stoneCreateSchema), stoneController.create);

router.get("/:id", canRead, validateRequest(stoneGetSchema), stoneController.get);
router.patch("/:id", canManage, validateRequest(stoneUpdateSchema), stoneController.update);

// Admin Scope §2. Its own route because it is the edit the team makes dozens of
// times a day, straight from a list row.
router.patch(
  "/:id/availability",
  canManage,
  validateRequest(stoneAvailabilitySchema),
  stoneController.setAvailability,
);
router.post(
  "/:id/verify",
  canManage,
  validateRequest(stoneVerifySchema),
  stoneController.markVerified,
);

router.delete("/:id", adminOnly, validateRequest(stoneDeleteSchema), stoneController.remove);

export default router;
