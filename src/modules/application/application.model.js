/**
 * @module ApplicationModel
 * @description A photographed application of MOSSANO stone — Website §7 and
 * Admin Scope §4.
 *
 * §4's "these images can be connected to the relevant stone" is the point: a
 * customer looking at a hotel lobby can find out what the floor is and whether
 * any is left. Categories live in stone.constants.js so the two lists cannot
 * drift, per §7's own note.
 *
 * Carries a project name and location because the deferred "project page as
 * per project wise" note would extend this entity.
 */
import mongoose from "mongoose";
import { APPLICATION_SLUGS } from "../stone/stone.constants.js";

const ApplicationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    /** Which of the seven categories this belongs to. */
    application: {
      type: String,
      enum: APPLICATION_SLUGS,
      required: true,
      index: true,
    },

    /** Project context, where the client is willing to name it. */
    projectName: { type: String, trim: true },
    location: { type: String, trim: true },
    architect: { type: String, trim: true },
    description: { type: String, trim: true, default: "" },

    coverImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],

    /** The stones actually used, so a customer can go from the room to the lot. */
    stones: [{ type: mongoose.Schema.Types.ObjectId, ref: "Stone" }],

    isFeatured: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

ApplicationSchema.index({
  isDeleted: 1,
  isPublished: 1,
  application: 1,
  createdAt: -1,
});

const ApplicationModel = mongoose.model("Application", ApplicationSchema);

export { ApplicationModel };
