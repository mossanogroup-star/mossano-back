import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { canRead, canManage, adminOnly } from "../../middlewares/role.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { selectionController } from "./selection.controller.js";
import {
  selectionListSchema,
  selectionCreateSchema,
  selectionGetSchema,
  selectionUpdateSchema,
  selectionDeleteSchema,
  selectionActionSchema,
  selectionNoteSchema,
} from "./selection.validation.js";

const router = Router();

// The customer-facing side of a selection is served by modules/public, keyed
// by token. Nothing here is reachable without a signed-in team member.
router.use(authenticate);

router.get("/", canRead, validateRequest(selectionListSchema), selectionController.list);
router.post("/", canManage, validateRequest(selectionCreateSchema), selectionController.create);

router.get("/:id", canRead, validateRequest(selectionGetSchema), selectionController.get);
router.patch("/:id", canManage, validateRequest(selectionUpdateSchema), selectionController.update);

router.post(
  "/:id/revoke",
  canManage,
  validateRequest(selectionActionSchema),
  selectionController.revoke,
);
router.post(
  "/:id/restore",
  canManage,
  validateRequest(selectionActionSchema),
  selectionController.restore,
);
router.post(
  "/:id/regenerate-link",
  canManage,
  validateRequest(selectionActionSchema),
  selectionController.regenerateLink,
);
router.post(
  "/:id/notes",
  canManage,
  validateRequest(selectionNoteSchema),
  selectionController.addNote,
);

router.delete("/:id", adminOnly, validateRequest(selectionDeleteSchema), selectionController.remove);

export default router;
