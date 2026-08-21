import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { canRead, canManage } from "../../middlewares/role.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { uploadSingle, uploadMany } from "../../middlewares/upload.js";
import { mediaController } from "./media.controller.js";
import {
  mediaListSchema,
  mediaUploadSchema,
  mediaUpdateSchema,
  mediaGetSchema,
  mediaDeleteSchema,
} from "./media.validation.js";

const router = Router();

router.use(authenticate);

router.get("/facets", canRead, mediaController.facets);
router.get("/", canRead, validateRequest(mediaListSchema), mediaController.list);

// multer runs before validateRequest: on a multipart request req.body does not
// exist until multer has parsed it, so validating first would see an empty body
// and reject every upload that carried metadata.
router.post(
  "/",
  canManage,
  uploadSingle,
  validateRequest(mediaUploadSchema),
  mediaController.uploadOne,
);
router.post(
  "/bulk",
  canManage,
  uploadMany,
  validateRequest(mediaUploadSchema),
  mediaController.uploadMany,
);

router.get("/:id", canRead, validateRequest(mediaGetSchema), mediaController.get);
router.patch("/:id", canManage, validateRequest(mediaUpdateSchema), mediaController.update);
router.delete("/:id", canManage, validateRequest(mediaDeleteSchema), mediaController.remove);

export default router;
