/**
 * @module UserModel
 * @description A member of the MOSSANO team with access to the admin panel.
 *
 * Customers are deliberately not users. The requirement document is explicit
 * that no account is needed in Phase 1 — favourites live on the device and
 * enquiries carry contact details inline. Adding customer accounts later means
 * a separate collection, not a role on this one.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const ROLES = ["admin", "editor", "viewer"];

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    // select:false so a stray .find() can never carry the hash into a DTO.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "editor", index: true },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

UserSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

const UserModel = mongoose.model("User", UserSchema);

export { UserModel, ROLES, hashPassword };
