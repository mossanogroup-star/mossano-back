import { AppError } from "../utils/AppError.js";

/**
 * Route-level authorisation. Runs after authenticate().
 *
 *   admin   everything, including team accounts
 *   editor  the catalogue: stones, edits, applications, enquiries, selections
 *   viewer  read-only
 */
function authorizeRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Not authenticated", 401, { code: "UNAUTHORIZED" }));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have access to this action", 403, {
          code: "FORBIDDEN",
        }),
      );
    }
    next();
  };
}

/** Anyone signed in may read. */
const canRead = authorizeRoles("admin", "editor", "viewer");
/** Editors and admins may change the catalogue. */
const canManage = authorizeRoles("admin", "editor");
/** Admin only: team accounts and destructive actions. */
const adminOnly = authorizeRoles("admin");

export { authorizeRoles, canRead, canManage, adminOnly };
