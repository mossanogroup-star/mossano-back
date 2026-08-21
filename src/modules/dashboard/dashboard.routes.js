import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { canRead } from "../../middlewares/role.middleware.js";
import { dashboardController } from "./dashboard.controller.js";

const router = Router();

router.use(authenticate, canRead);

router.get("/", dashboardController.summary);
router.get("/verification-queue", dashboardController.verificationQueue);
router.get("/edit-ladder", dashboardController.editLadder);

export default router;
