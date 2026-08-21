import { UserModel, hashPassword } from "./user.model.js";
import { escapeRegex, runPagedQuery } from "../../utils/repositoryHelpers.js";

const userRepository = {
  findById: (id) => UserModel.findById(id).lean(),

  /** Login path: the hash is select:false, so it has to be asked for. */
  findByEmailWithPassword: (email) =>
    UserModel.findOne({ email: String(email).toLowerCase().trim() }).select(
      "+passwordHash",
    ),

  /** Change-password path: needs the document, not a lean object, to verify. */
  findByIdWithPassword: (id) => UserModel.findById(id).select("+passwordHash"),

  findByEmail: (email) =>
    UserModel.findOne({ email: String(email).toLowerCase().trim() }).lean(),

  findMany({ page, limit, search }) {
    const filter = {};
    if (search?.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ name: rx }, { email: rx }];
    }
    return runPagedQuery({
      model: UserModel,
      filter,
      sort: { name: 1 },
      page,
      limit,
    });
  },

  async create({ password, ...rest }) {
    const passwordHash = await hashPassword(password);
    return UserModel.create({ ...rest, passwordHash });
  },

  async update(id, { password, ...patch }) {
    if (password) patch.passwordHash = await hashPassword(password);
    return UserModel.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    }).lean();
  },

  touchLogin: (id) =>
    UserModel.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } }),

  countAdmins: () =>
    UserModel.countDocuments({ role: "admin", isActive: true }),

  remove: (id) => UserModel.findByIdAndDelete(id).lean(),
};

export { userRepository };
