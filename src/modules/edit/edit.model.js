/**
 * @module EditModel
 * @description A curated monthly collection — the "New Edit" of Website §2 and
 * Admin Scope §3.
 *
 * This is the mechanism behind the brief's instruction that the site should
 * read like a fashion house with rotating collections rather than a stone
 * trader's inventory. August 2026 is Current, September is Next, October is
 * Upcoming, and the three render as different things: Current offers Reserve,
 * Next offers Pre-Book, Upcoming offers Register Interest.
 *
 * An Edit references stones. It never copies them, so a stone that sells shows
 * as sold inside the Edit the moment the team changes it, with no second write.
 */
import mongoose from "mongoose";

/** Admin Scope §3: "Set the Edit as Current, Next or Upcoming". */
const EDIT_STATUSES = ["current", "next", "upcoming", "archived"];

const EDIT_STATUS_LABELS = {
  current: "Current Edit",
  next: "Next Edit",
  upcoming: "Upcoming Edit",
  archived: "Past Edit",
};

/**
 * What a customer can do with a stone in each band. Website §2 spells out the
 * progression: the Current Edit is buyable, the Next Edit is pre-bookable, the
 * Upcoming Edit is only an expression of interest.
 */
const EDIT_STATUS_CTA = {
  current: { action: "reserve", label: "Reserve" },
  next: { action: "prebook", label: "Pre-Book" },
  upcoming: { action: "register-interest", label: "Register Interest" },
  archived: { action: "enquire", label: "Enquire" },
};

const EditSchema = new mongoose.Schema(
  {
    /** The customer-facing name: "August 2026". */
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: EDIT_STATUSES,
      default: "upcoming",
      index: true,
    },

    /**
     * The month the Edit represents, stored as a real date so Edits sort
     * chronologically rather than alphabetically — "August" before "September"
     * is only true by accident.
     */
    periodStart: { type: Date, index: true },

    subtitle: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },

    coverImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    /** Admin Scope §3: "Upload/edit collection images". */
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],

    /**
     * Ordered. The sequence is the curation — the team decides what an
     * architect sees first — so it must survive a round-trip through Mongo.
     */
    stones: [{ type: mongoose.Schema.Types.ObjectId, ref: "Stone" }],

    isPublished: { type: Boolean, default: false, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

EditSchema.index({ isDeleted: 1, isPublished: 1, status: 1, periodStart: -1 });

const EditModel = mongoose.model("Edit", EditSchema);

export { EditModel, EDIT_STATUSES, EDIT_STATUS_LABELS, EDIT_STATUS_CTA };
