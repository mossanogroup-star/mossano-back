import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import {
  canRead,
  canManage,
  adminOnly,
} from "../../middlewares/role.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { applicationController } from "./application.controller.js";
import {
  applicationListSchema,
  applicationCreateSchema,
  applicationGetSchema,
  applicationUpdateSchema,
  applicationDeleteSchema,
} from "./application.validation.js";

const router = Router();

router.use(authenticate);

router.get("/index", canRead, applicationController.index);
router.get(
  "/",
  canRead,
  validateRequest(applicationListSchema),
  applicationController.list,
);
router.post(
  "/",
  canManage,
  validateRequest(applicationCreateSchema),
  applicationController.create,
);

router.get(
  "/:id",
  canRead,
  validateRequest(applicationGetSchema),
  applicationController.get,
);
router.patch(
  "/:id",
  canManage,
  validateRequest(applicationUpdateSchema),
  applicationController.update,
);
router.delete(
  "/:id",
  adminOnly,
  validateRequest(applicationDeleteSchema),
  applicationController.remove,
);

export default router;
