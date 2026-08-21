import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { canRead, canManage, adminOnly } from "../../middlewares/role.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { editController } from "./edit.controller.js";
import {
  editListSchema,
  editCreateSchema,
  editGetSchema,
  editUpdateSchema,
  editDeleteSchema,
  editStatusSchema,
  editAddStonesSchema,
  editRemoveStoneSchema,
} from "./edit.validation.js";

const router = Router();

router.use(authenticate);

router.get("/", canRead, validateRequest(editListSchema), editController.list);
router.post("/", canManage, validateRequest(editCreateSchema), editController.create);

router.get("/:id", canRead, validateRequest(editGetSchema), editController.get);
router.patch("/:id", canManage, validateRequest(editUpdateSchema), editController.update);
router.patch("/:id/status", canManage, validateRequest(editStatusSchema), editController.setStatus);

router.post(
  "/:id/stones",
  canManage,
  validateRequest(editAddStonesSchema),
  editController.addStones,
);
router.delete(
  "/:id/stones/:stoneId",
  canManage,
  validateRequest(editRemoveStoneSchema),
  editController.removeStone,
);

router.delete("/:id", adminOnly, validateRequest(editDeleteSchema), editController.remove);

export default router;
