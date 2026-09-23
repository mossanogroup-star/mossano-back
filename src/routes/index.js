/**
 * The API surface, in two halves.
 *
 * `/api/public/*` is what the storefront calls. No token, read-only apart from
 * the rate-limited enquiry form, and it never exposes a field a customer should
 * not see — a stone's internal notes, an enquiry's pipeline status, a private
 * selection's view count.
 *
 * Everything else requires a signed-in team member.
 */
import { Router } from "express";

import publicRoutes from "../modules/public/public.routes.js";

import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/user/user.routes.js";
import mediaRoutes from "../modules/media/media.routes.js";
import stoneRoutes from "../modules/stone/stone.routes.js";
import editRoutes from "../modules/edit/edit.routes.js";
import applicationRoutes from "../modules/application/application.routes.js";
import lookRoutes from "../modules/look/look.routes.js";
import clientRoutes from "../modules/client/client.routes.js";
import enquiryRoutes from "../modules/enquiry/enquiry.routes.js";
import selectionRoutes from "../modules/selection/selection.routes.js";
import dashboardRoutes from "../modules/dashboard/dashboard.routes.js";

const routes = Router();

// --- Storefront ---
routes.use("/public", publicRoutes);

// --- Admin panel ---
routes.use("/auth", authRoutes);
routes.use("/users", userRoutes);
routes.use("/media", mediaRoutes);
routes.use("/stones", stoneRoutes);
routes.use("/edits", editRoutes);
routes.use("/applications", applicationRoutes);
routes.use("/looks", lookRoutes);
routes.use("/clients", clientRoutes);
routes.use("/enquiries", enquiryRoutes);
routes.use("/selections", selectionRoutes);
routes.use("/dashboard", dashboardRoutes);

export default routes;
