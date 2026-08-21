import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { authController } from "./auth.controller.js";
import { loginSchema, changePasswordSchema } from "./auth.validation.js";
import { loginRateLimit } from "../../middlewares/rateLimit.js";

const router = Router();

router.post("/login", loginRateLimit, validateRequest(loginSchema), authController.login);

router.get("/me", authenticate, authController.me);
router.post(
  "/change-password",
  authenticate,
  validateRequest(changePasswordSchema),
  authController.changePassword,
);

export default router;
