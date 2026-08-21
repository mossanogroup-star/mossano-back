/**
 * @module EnquiryModel
 * @description Everything a customer sends MOSSANO — Admin Scope §5.
 *
 * The fields the requirement names verbatim are here (customer, company,
 * project, stone, requirement, message, contact, status, notes), plus the
 * structured brief a Private Sourcing enquiry carries (Website §8 Step 1).
 *
 * Contact details are stored inline rather than against a customer account,
 * because Website §5 is explicit that Phase 1 has no accounts. A customer
 * record is a Phase 2 entity; until then an enquiry is self-contained.
 */
import mongoose from "mongoose";
import { ENQUIRY_TYPES, ENQUIRY_STATUSES } from "./enquiry.constants.js";
import { MATERIAL_SLUGS, COLOUR_SLUGS } from "../stone/stone.constants.js";

/** A dated note the team adds while working the lead. */
const NoteSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

/** Website §8 Step 1 — "Send Your Requirement". */
const SourcingBriefSchema = new mongoose.Schema(
  {
    material: { type: String, enum: MATERIAL_SLUGS },
    colour: { type: String, enum: COLOUR_SLUGS },
    /** Free text: the customer may say "20mm", "2cm" or "20-30mm". */
    thickness: { type: String, trim: true },
    quantity: { type: String, trim: true },
    budget: { type: String, trim: true },
    projectLocation: { type: String, trim: true },
    /**
     * Free text, not a Date — deliberately.
     *
     * Website §8 asks for a "required date", but nobody answers that with a
     * date. The client's own example answer in the Notes is "1mth"; real ones
     * are "within a month", "before Diwali", "Q3". Parsing that as a Date meant
     * the whole sourcing brief was rejected with "Invalid date" and the
     * customer lost the form. Stored as written, and the team reads it.
     */
    requiredBy: { type: String, trim: true },
    referenceImages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    /**
     * Website §8: the customer may instead say "please select the best options
     * for my project", which is what turns this enquiry into a private
     * selection rather than a search.
     */
    wantsMossanoToSelect: { type: Boolean, default: false },
  },
  { _id: false },
);

const EnquirySchema = new mongoose.Schema(
  {
    /** Human-readable, sequential, and what the team quotes on the phone. */
    reference: { type: String, trim: true, unique: true, index: true },

    type: {
      type: String,
      enum: ENQUIRY_TYPES,
      default: "general",
      index: true,
    },

    // ── Who ──
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true, index: true },
    company: { type: String, trim: true },
    /** Admin Scope §5 lists "Project" as its own field. */
    projectName: { type: String, trim: true },

    // ── What ──
    /** The lot they are asking about, where there is one. */
    stone: { type: mongoose.Schema.Types.ObjectId, ref: "Stone", index: true },
    /**
     * The stone's code and name at the moment of asking. Kept alongside the
     * reference on purpose: if the lot is later renamed or deleted, the team
     * must still be able to read what the customer actually enquired about.
     */
    stoneSnapshot: {
      mossanoCode: { type: String, trim: true },
      name: { type: String, trim: true },
    },
    edit: { type: mongoose.Schema.Types.ObjectId, ref: "Edit" },
    selection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Selection",
      index: true,
    },

    requirement: { type: String, trim: true },
    message: { type: String, trim: true },
    sourcing: { type: SourcingBriefSchema, default: undefined },

    // ── Pipeline ──
    status: {
      type: String,
      enum: ENQUIRY_STATUSES,
      default: "new",
      index: true,
    },
    notes: { type: [NoteSchema], default: [] },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    /** Set the first time the status leaves "new", for a response-time figure. */
    firstRespondedAt: { type: Date },

    // ── Provenance ──
    /** Which page produced it, so the team can see what the site is doing. */
    sourcePath: { type: String, trim: true },
    userAgent: { type: String, trim: true },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

EnquirySchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
EnquirySchema.index({
  name: "text",
  company: "text",
  email: "text",
  projectName: "text",
});

const EnquiryModel = mongoose.model("Enquiry", EnquirySchema);

export { EnquiryModel };
