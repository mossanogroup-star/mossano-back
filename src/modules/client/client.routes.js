import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { canRead, canManage, adminOnly } from "../../middlewares/role.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { clientController } from "./client.controller.js";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  categoryDeleteSchema,
  clientCreateSchema,
  clientUpdateSchema,
  clientDeleteSchema,
} from "./client.validation.js";

const router = Router();

router.use(authenticate);

// Categories before /:id, or "categories" is read as an id.
router.get("/categories", canRead, clientController.listCategories);
router.post(
  "/categories",
  canManage,
  validateRequest(categoryCreateSchema),
  clientController.createCategory,
);
router.patch(
  "/categories/:id",
  canManage,
  validateRequest(categoryUpdateSchema),
  clientController.updateCategory,
);
router.delete(
  "/categories/:id",
  adminOnly,
  validateRequest(categoryDeleteSchema),
  clientController.removeCategory,
);

router.get("/", canRead, clientController.listClients);
router.post("/", canManage, validateRequest(clientCreateSchema), clientController.createClient);
router.patch("/:id", canManage, validateRequest(clientUpdateSchema), clientController.updateClient);
router.delete(
  "/:id",
  adminOnly,
  validateRequest(clientDeleteSchema),
  clientController.removeClient,
);

export default router;
