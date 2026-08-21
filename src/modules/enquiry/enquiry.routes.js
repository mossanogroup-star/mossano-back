import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { canRead, canManage, adminOnly } from "../../middlewares/role.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { enquiryController } from "./enquiry.controller.js";
import {
  enquiryListSchema,
  enquiryGetSchema,
  enquiryStatusSchema,
  enquiryUpdateSchema,
  enquiryNoteSchema,
  enquiryAssignSchema,
  enquiryDeleteSchema,
} from "./enquiry.validation.js";

const router = Router();

// The inbox is admin-side only. Public submission lives in modules/public,
// which is the single unauthenticated write path in the whole API.
router.use(authenticate);

router.get("/pipeline", canRead, enquiryController.pipeline);
router.get("/stats", canRead, enquiryController.stats);
router.get("/", canRead, validateRequest(enquiryListSchema), enquiryController.list);

router.get("/:id", canRead, validateRequest(enquiryGetSchema), enquiryController.get);
router.patch("/:id", canManage, validateRequest(enquiryUpdateSchema), enquiryController.update);
router.patch(
  "/:id/status",
  canManage,
  validateRequest(enquiryStatusSchema),
  enquiryController.setStatus,
);
router.patch(
  "/:id/assign",
  canManage,
  validateRequest(enquiryAssignSchema),
  enquiryController.assign,
);
router.post("/:id/notes", canManage, validateRequest(enquiryNoteSchema), enquiryController.addNote);

router.delete("/:id", adminOnly, validateRequest(enquiryDeleteSchema), enquiryController.remove);

export default router;
