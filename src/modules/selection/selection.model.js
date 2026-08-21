/**
 * @module SelectionModel
 * @description A private, per-customer set of stones — Admin Scope §6 and
 * Website §9.
 *
 *   Prepared for: XYZ Architects
 *   Project: Mumbai Residence
 *
 * Admin Scope §6's "no need to upload the same stone again" is the design
 * constraint: a Selection holds references, so availability in a link sent
 * last week is today's.
 *
 * The link is unauthenticated by necessity — no accounts in Phase 1 — so the
 * token is the only thing protecting it: 32 CSPRNG bytes, never sequential,
 * never derived from the customer's name, revocable.
 */
import mongoose from "mongoose";

const SelectionNoteSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

/** Per-stone commentary — why this lot, for this project. */
const SelectionItemSchema = new mongoose.Schema(
  {
    stone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stone",
      required: true,
    },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const SelectionSchema = new mongoose.Schema(
  {
    reference: { type: String, trim: true, unique: true, index: true },

    title: { type: String, required: true, trim: true },
    /** "Prepared for: XYZ Architects" */
    customerName: { type: String, required: true, trim: true },
    /** "Project: Mumbai Residence" */
    projectName: { type: String, trim: true },
    customerEmail: { type: String, trim: true, lowercase: true },
    customerPhone: { type: String, trim: true },

    introduction: { type: String, trim: true, default: "" },

    /** Ordered — the sequence is the recommendation. */
    items: { type: [SelectionItemSchema], default: [] },
    /** Admin Scope §6: "add photos for reference". */
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],

    /** The enquiry that prompted it, where there was one. */
    sourceEnquiry: { type: mongoose.Schema.Types.ObjectId, ref: "Enquiry" },

    // The private link
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, index: true },
    isRevoked: { type: Boolean, default: false, index: true },
    /** Nothing is shared until the team says so — a draft has no live link. */
    isPublished: { type: Boolean, default: false, index: true },

    // Engagement, so the team knows whether it landed
    viewCount: { type: Number, default: 0 },
    firstViewedAt: { type: Date },
    lastViewedAt: { type: Date },

    notes: { type: [SelectionNoteSchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

SelectionSchema.index({ isDeleted: 1, isPublished: 1, createdAt: -1 });

const SelectionModel = mongoose.model("Selection", SelectionSchema);

export { SelectionModel };
