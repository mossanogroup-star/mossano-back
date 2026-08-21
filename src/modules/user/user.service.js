import { userRepository } from "./user.repository.js";
import { AppError } from "../../utils/AppError.js";

const userService = {
  list(query) {
    return userRepository.findMany(query);
  },

  async get(id) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError("User not found", 404);
    return user;
  },

  async create(body) {
    if (await userRepository.findByEmail(body.email)) {
      throw new AppError("A team member with that email already exists", 409);
    }
    return userRepository.create(body);
  },

  async update(id, patch, actor) {
    const target = await userRepository.findById(id);
    if (!target) throw new AppError("User not found", 404);

    // Losing the last admin would lock the whole team out of the panel, and
    // there is no self-service recovery path in Phase 1.
    const demoting = patch.role && patch.role !== "admin" && target.role === "admin";
    const disabling = patch.isActive === false && target.isActive;
    if ((demoting || disabling) && (await userRepository.countAdmins()) <= 1) {
      throw new AppError("This is the only active admin — promote someone else first", 400);
    }

    if (String(id) === String(actor.id) && patch.isActive === false) {
      throw new AppError("You cannot disable your own account", 400);
    }

    return userRepository.update(id, patch);
  },

  async remove(id, actor) {
    if (String(id) === String(actor.id)) {
      throw new AppError("You cannot delete your own account", 400);
    }
    const target = await userRepository.findById(id);
    if (!target) throw new AppError("User not found", 404);
    if (target.role === "admin" && (await userRepository.countAdmins()) <= 1) {
      throw new AppError("This is the only active admin — promote someone else first", 400);
    }
    await userRepository.remove(id);
    return { id };
  },
};

export { userService };
