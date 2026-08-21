/**
 * @module SelectionModel
 * @description A private, per-customer set of stones — Admin Scope §6 and
 * Website §9.
 *
 *   Prepared for: XYZ Architects
 *   Project: Mumbai Residence
 *
 * The team picks stones that already exist, adds a note and reference photos,
 * and shares a link. Admin Scope §6 ends with "no need to upload the same stone
 * again", which is the design constraint: a Selection holds references, so the
 * availability an architect sees in a selection sent last week is today's.
 *
 * ── On the link ──────────────────────────────────────────────────────────
 * It is unauthenticated by necessity — the customer has no account in Phase 1 —
 * so the token is the only thing standing between a private selection and
 * anyone who guesses a URL. It is 32 bytes from a CSPRNG, never sequential,
 * never derived from the customer's name, and revocable.
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
    stone: { type: mongoose.Schema.Types.ObjectId, ref: "Stone", required: true },
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

    // ── The private link ──
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, index: true },
    isRevoked: { type: Boolean, default: false, index: true },
    /** Nothing is shared until the team says so — a draft has no live link. */
    isPublished: { type: Boolean, default: false, index: true },

    // ── Engagement, so the team knows whether it landed ──
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
