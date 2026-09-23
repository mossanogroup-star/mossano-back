import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { canRead, canManage } from "../../middlewares/role.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { lookController } from "./look.controller.js";
import { lookContentSaveSchema } from "./look.validation.js";

const router = Router();

router.use(authenticate);

// Phase-3 feedback — the photography on a Shop by Look page.
router.get("/content", canRead, lookController.listContent);
router.put(
  "/content/:look",
  canManage,
  validateRequest(lookContentSaveSchema),
  lookController.saveContent,
);

export default router;
