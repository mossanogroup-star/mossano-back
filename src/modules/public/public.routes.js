/**
 * The storefront's API. No authentication anywhere in this file — every route
 * here is reachable by anyone, so each one is either a read of published data,
 * a token-addressed private selection, or the rate-limited enquiry form.
 */
import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { publicFormRateLimit, publicUploadRateLimit } from "../../middlewares/rateLimit.js";
import { uploadReferenceImages } from "../../middlewares/upload.js";
import { publicController } from "./public.controller.js";
import {
  publicShopSchema,
  publicStoneSchema,
  publicEditSchema,
  publicLookSchema,
  publicApplicationSchema,
  publicApplicationProjectSchema,
  publicSelectionSchema,
  publicFavouritesSchema,
  publicFavouritesPdfSchema,
} from "./public.validation.js";
import { enquirySubmitSchema } from "../enquiry/enquiry.validation.js";

const router = Router();

router.get("/config", publicController.config);
router.get("/home", publicController.home);

router.get("/stones", validateRequest(publicShopSchema), publicController.shop);
router.get("/stones/:slug", validateRequest(publicStoneSchema), publicController.stone);

router.get("/edits", publicController.edits);
router.get("/edits/:slug", validateRequest(publicEditSchema), publicController.edit);

router.get("/looks", publicController.looks);
router.get("/looks/:slug", validateRequest(publicLookSchema), publicController.look);

router.get("/applications", publicController.applications);
// Static segment before the category slug, or "projects" is read as a category.
router.get(
  "/applications/projects/:slug",
  validateRequest(publicApplicationProjectSchema),
  publicController.applicationProject,
);
router.get(
  "/applications/:slug",
  validateRequest(publicApplicationSchema),
  publicController.application,
);

// Phase-1 feedback §6 — the landmark Projects page.
router.get("/projects", publicController.projects);

// Phase-2 feedback §1 and §2 — the Clients page and the home logo carousel.
router.get("/clients", publicController.clients);

router.post("/favourites", validateRequest(publicFavouritesSchema), publicController.favourites);
// Phase-3 feedback — the shortlist as the PDF MOSSANO already sends.
router.post(
  "/favourites/pdf",
  validateRequest(publicFavouritesPdfSchema),
  publicController.favouritesPdf,
);

// The two unauthenticated writes. Both rate-limited per IP.
router.post(
  "/enquiries",
  publicFormRateLimit,
  validateRequest(enquirySubmitSchema),
  publicController.submitEnquiry,
);

// Phase-1 feedback §4 — reference images, uploaded before the form is sent so
// the customer learns a photograph was rejected while they can still fix it.
// Images only, three at a time, and separately rate limited: see upload.js.
router.post(
  "/enquiries/reference-images",
  publicUploadRateLimit,
  uploadReferenceImages,
  publicController.uploadReferenceImages,
);

// Private selections, addressed by their unguessable token.
router.get(
  "/selections/:token",
  validateRequest(publicSelectionSchema),
  publicController.selection,
);
router.get(
  "/selections/:token/pdf",
  validateRequest(publicSelectionSchema),
  publicController.selectionPdf,
);

export default router;
