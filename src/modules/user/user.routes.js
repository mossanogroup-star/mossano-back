import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { adminOnly } from "../../middlewares/role.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { userController } from "./user.controller.js";
import {
  userListSchema,
  userCreateSchema,
  userGetSchema,
  userUpdateSchema,
  userDeleteSchema,
} from "./user.validation.js";

const router = Router();

// Team accounts are admin-only end to end — an editor has no business seeing
// the list of who else has access.
router.use(authenticate, adminOnly);

router.get("/", validateRequest(userListSchema), userController.list);
router.post("/", validateRequest(userCreateSchema), userController.create);
router.get("/:id", validateRequest(userGetSchema), userController.get);
router.patch("/:id", validateRequest(userUpdateSchema), userController.update);
router.delete("/:id", validateRequest(userDeleteSchema), userController.remove);

export default router;
