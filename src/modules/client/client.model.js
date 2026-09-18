/**
 * @module ClientModel
 * @description Phase-2 feedback §1 and §2 — the Clients page and the home
 * page's logo carousel.
 *
 * Two collections rather than a hardcoded list, because §"Important" is explicit
 * that the team manages categories and logos "without changing the frontend code
 * every time". The categories on the client's own site are Architects & Interior
 * Designers, Builders & Developers, Food Chains, Banks, Government, Hotels and
 * Automobiles — but none of those is written into the code, because the next one
 * they win should not need a deploy.
 *
 * A client without a logo still saves: the storefront falls back to the name, so
 * a category is never blocked on chasing an image file.
 */
import mongoose from "mongoose";

const ClientCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    /** Ascending. The client's page has a deliberate order; alphabetical is not it. */
    sortOrder: { type: Number, default: 0, index: true },

    isPublished: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

ClientCategorySchema.index({ isDeleted: 1, isPublished: 1, sortOrder: 1 });

const ClientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientCategory",
      required: true,
      index: true,
    },

    /** Optional — the name is rendered when there is no logo yet. */
    logo: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },

    /** Where the logo should link, if anywhere. */
    website: { type: String, trim: true },

    sortOrder: { type: Number, default: 0, index: true },

    isPublished: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

ClientSchema.index({ isDeleted: 1, isPublished: 1, category: 1, sortOrder: 1 });

const ClientCategoryModel = mongoose.model("ClientCategory", ClientCategorySchema);
const ClientModel = mongoose.model("Client", ClientSchema);

export { ClientCategoryModel, ClientModel };
