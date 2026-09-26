import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { canRead, canManage, adminOnly } from "../../middlewares/role.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { applicationController } from "./application.controller.js";
import {
  applicationListSchema,
  applicationCreateSchema,
  applicationGetSchema,
  applicationUpdateSchema,
  applicationDeleteSchema,
  applicationContentSaveSchema,
  applicationCategoryCreateSchema,
  applicationCategoryDeleteSchema,
  projectVideoCreateSchema,
  projectVideoUpdateSchema,
  projectVideoDeleteSchema,
} from "./application.validation.js";

const router = Router();

router.use(authenticate);

router.get("/index", canRead, applicationController.index);

// Phase-2 feedback §5. Before /:id, or "content" is read as an id.
router.get("/content", canRead, applicationController.listContent);
router.put(
  "/content/:application",
  canManage,
  validateRequest(applicationContentSaveSchema),
  applicationController.saveContent,
);
// New Shop by Application categories. Before /:id.
router.post(
  "/categories",
  canManage,
  validateRequest(applicationCategoryCreateSchema),
  applicationController.createCategory,
);
router.delete(
  "/categories/:slug",
  adminOnly,
  validateRequest(applicationCategoryDeleteSchema),
  applicationController.removeCategory,
);

// Phase-3 feedback — the Projects page's Videos tab. Also before /:id.
router.get("/videos", canRead, applicationController.listVideos);
router.post(
  "/videos",
  canManage,
  validateRequest(projectVideoCreateSchema),
  applicationController.createVideo,
);
router.patch(
  "/videos/:id",
  canManage,
  validateRequest(projectVideoUpdateSchema),
  applicationController.updateVideo,
);
router.delete(
  "/videos/:id",
  canManage,
  validateRequest(projectVideoDeleteSchema),
  applicationController.removeVideo,
);

router.get("/", canRead, validateRequest(applicationListSchema), applicationController.list);
router.post("/", canManage, validateRequest(applicationCreateSchema), applicationController.create);

router.get("/:id", canRead, validateRequest(applicationGetSchema), applicationController.get);
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
