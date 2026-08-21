import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { userRepository } from "../user/user.repository.js";

function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

const authService = {
  async login({ email, password }) {
    const user = await userRepository.findByEmailWithPassword(email);

    // One message for "no such user" and "wrong password" alike — telling the
    // two apart would let anyone enumerate who is on the MOSSANO team.
    const invalid = new AppError("Incorrect email or password", 401, {
      code: "INVALID_CREDENTIALS",
    });
    if (!user) throw invalid;
    if (!(await user.verifyPassword(password))) throw invalid;
    if (!user.isActive) {
      throw new AppError("This account has been disabled", 403, {
        code: "FORBIDDEN",
      });
    }

    await userRepository.touchLogin(user._id);

    return { user, token: signAccessToken(user) };
  },

  async me(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    return user;
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new AppError("User not found", 404);

    if (!(await user.verifyPassword(currentPassword))) {
      throw new AppError("Your current password is incorrect", 400, {
        code: "INVALID_CREDENTIALS",
      });
    }
    await userRepository.update(userId, { password: newPassword });
    return { id: userId };
  },
};

export { authService, signAccessToken };
