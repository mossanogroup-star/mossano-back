/**
 * JWT authentication. Verifies the Bearer token, loads the user, and attaches
 * req.user. Role checks live in role.middleware.js so a route can state its
 * authentication and its authorisation separately.
 */
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { userRepository } from "../modules/user/user.repository.js";

async function authenticate(req, _res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || "").split(" ");

    if (scheme !== "Bearer" || !token) {
      return next(
        new AppError("No token provided", 401, { code: "UNAUTHORIZED" }),
      );
    }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await userRepository.findById(payload.sub);

    if (!user)
      return next(
        new AppError("User not found", 401, { code: "UNAUTHORIZED" }),
      );
    if (!user.isActive) {
      return next(
        new AppError("Account is disabled", 403, { code: "FORBIDDEN" }),
      );
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      email: user.email,
      name: user.name,
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(
        new AppError("Session expired, please sign in again", 401, {
          code: "TOKEN_EXPIRED",
        }),
      );
    }
    next(new AppError("Invalid token", 401, { code: "UNAUTHORIZED" }));
  }
}

export { authenticate };
