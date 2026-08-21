/**
 * @module StoneModel
 * @description A lot of stone — the central entity.
 *
 * Admin Scope §1: uploaded once, used everywhere. Every surface references
 * this document and none copies it, which is what makes §2's "changing
 * availability updates it everywhere" true with no fan-out write.
 *
 * ⚠ Origin, thickness and finish are in none of the client's catalogues. They
 * are absent by default and render "On request". Never default them.
 */
import mongoose from "mongoose";
import {
  AVAILABILITY,
  LOOK_SLUGS,
  APPLICATION_SLUGS,
  MATERIAL_SLUGS,
  COLOUR_SLUGS,
  FINISH_SLUGS,
} from "./stone.constants.js";

/**
 * One physical slab. Website §4 asks for "individual slab images where
 * available"; dimensions are per-slab because a lot is rarely uniform.
 */
const SlabSchema = new mongoose.Schema(
  {
    /** The team's own reference for this piece within the lot. */
    reference: { type: String, trim: true },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    lengthIn: { type: Number, min: 0 },
    widthIn: { type: Number, min: 0 },
    isSold: { type: Boolean, default: false },
  },
  { _id: true },
);

const StoneSchema = new mongoose.Schema(
  {
    /**
     * Customer-facing and permanent — it appears in every WhatsApp message the
     * site sends. Assigned on create and never reused.
     */
    mossanoCode: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },

    name: { type: String, required: true, trim: true, index: true },
    /** URL slug. Derived from the name on create, then frozen — changing it breaks shared links. */
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    /** The supplier's lot number, as printed in the catalogues. Not ours. */
    lotNumber: { type: String, trim: true, index: true },

    material: { type: String, enum: MATERIAL_SLUGS, index: true },
    colour: { type: String, enum: COLOUR_SLUGS, index: true },

    // Fields the client's catalogues do not contain. Absent, not guessed.
    origin: { type: String, trim: true, index: true },
    finish: { type: String, enum: FINISH_SLUGS },
    thicknessMm: { type: Number, min: 0 },

    // Lot size, decoded from the catalogue captions
    // "Size- 73*59*94NOS" + "QTY- 2800 SQ FT" = 73in x 59in slabs, 94 of them,
    // 2,800 sq ft in total. See CLIENT-FACTS.md.
    slabLengthIn: { type: Number, min: 0 },
    slabWidthIn: { type: Number, min: 0 },
    slabCount: { type: Number, min: 0 },
    areaSqFt: { type: Number, min: 0 },

    looks: { type: [String], enum: LOOK_SLUGS, default: [], index: true },
    applications: {
      type: [String],
      enum: APPLICATION_SLUGS,
      default: [],
      index: true,
    },

    /**
     * Admin Scope §2. Defaults to verification_required, not available — a
     * stone just typed in has been verified by nobody.
     */
    availability: {
      type: String,
      enum: AVAILABILITY,
      default: "verification_required",
      index: true,
    },
    /**
     * Derived from `availability` (see AVAILABILITY_RANK), denormalised so the
     * default ordering sorts on an index rather than an aggregation stage.
     * The stone service is its only writer.
     */
    availabilityRank: { type: Number, default: 2, index: true },

    /** Website §2/§4's "verified today" signal. Set whenever availability moves. */
    lastVerifiedAt: { type: Date },

    description: { type: String, trim: true, default: "" },

    // Ordered: a gallery that reshuffles between page loads reads as broken.
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    slabs: { type: [SlabSchema], default: [] },

    /** Denormalised so a card renders without a populate round-trip. */
    primaryImageUrl: { type: String, trim: true },
    primaryImageAlt: { type: String, trim: true },

    /** Home page "Featured stones" (Website §1). */
    isFeatured: { type: Boolean, default: false, index: true },
    /** Hidden from the storefront without being deleted — e.g. awaiting photography. */
    isPublished: { type: Boolean, default: true, index: true },

    /** Team-only. Never leaves the admin DTO. */
    internalNotes: { type: String, trim: true, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

// The Stone Shop's search box hits name, code and lot number together.
StoneSchema.index({
  name: "text",
  mossanoCode: "text",
  lotNumber: "text",
  origin: "text",
});
// The catalogue's default ordering: available first, newest within that.
StoneSchema.index({
  isDeleted: 1,
  isPublished: 1,
  availabilityRank: 1,
  createdAt: -1,
});

const StoneModel = mongoose.model("Stone", StoneSchema);

export { StoneModel, SlabSchema };
