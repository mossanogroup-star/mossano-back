/**
 * @module StoneModel
 * @description A lot of stone. The central entity of the whole system.
 *
 * Admin & Backend Scope §1 is explicit: "the same stone will be uploaded once
 * and can then be used across the website … New Edit → Stone Shop → Stone
 * Detail → Application → Private Selection". Every one of those surfaces reads
 * this document. None of them copies it.
 *
 * That is also what makes §2 work. Changing `availability` to `sold` updates
 * every surface at once because there is only one place the value lives — no
 * fan-out write, nothing to fall out of step.
 *
 * ── Unknown is a real state ──────────────────────────────────────────────
 * Origin, thickness and finish appear nowhere in the client's catalogues. They
 * are optional here and absent by default, and the storefront renders absent as
 * "On request". An architect specifying 2,800 sq ft will discover an invented
 * origin, and verified availability is the entire proposition. Never default
 * these to a plausible value.
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
 * One physical slab within the lot.
 *
 * Website §4 asks for "individual slab images where available" — a customer
 * buying six slabs of Golden Portoro wants to see those six, not a
 * representative photograph. Dimensions are per-slab because a lot is rarely
 * uniform.
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
     * site generates ("I am interested in MM-024 Calacatta Viola"). Assigned by
     * the service on create and never reused, so a code always resolves to the
     * same lot even after the lot is sold.
     */
    mossanoCode: { type: String, trim: true, uppercase: true, unique: true, index: true },

    name: { type: String, required: true, trim: true, index: true },
    /** URL slug. Derived from the name on create, then frozen — changing it breaks shared links. */
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },

    /** The supplier's lot number, as printed in the catalogues. Not ours. */
    lotNumber: { type: String, trim: true, index: true },

    material: { type: String, enum: MATERIAL_SLUGS, index: true },
    colour: { type: String, enum: COLOUR_SLUGS, index: true },

    // ── Fields the client's catalogues do not contain. Absent, not guessed. ──
    origin: { type: String, trim: true, index: true },
    finish: { type: String, enum: FINISH_SLUGS },
    thicknessMm: { type: Number, min: 0 },

    // ── Lot size, decoded from the catalogue captions ──
    // "Size- 73*59*94NOS" + "QTY- 2800 SQ FT" = 73in x 59in slabs, 94 of them,
    // 2,800 sq ft in total. See CLIENT-FACTS.md.
    slabLengthIn: { type: Number, min: 0 },
    slabWidthIn: { type: Number, min: 0 },
    slabCount: { type: Number, min: 0 },
    areaSqFt: { type: Number, min: 0 },

    looks: { type: [String], enum: LOOK_SLUGS, default: [], index: true },
    applications: { type: [String], enum: APPLICATION_SLUGS, default: [], index: true },

    /**
     * Admin Scope §2. Defaults to verification_required rather than available:
     * a stone that has just been typed in has not been verified by anyone, and
     * claiming otherwise is the one thing this business cannot afford.
     */
    availability: {
      type: String,
      enum: AVAILABILITY,
      default: "verification_required",
      index: true,
    },
    /**
     * Derived from `availability` — see AVAILABILITY_RANK. Denormalised so the
     * default catalogue ordering ("what you can buy today, first") sorts on an
     * index rather than an aggregation stage. The stone service is its only
     * writer, alongside the field it derives from.
     */
    availabilityRank: { type: Number, default: 2, index: true },

    /**
     * Website §2 and §4 want "Availability verified today" as a trust signal.
     * Set whenever availability is touched, so the site can say how fresh the
     * claim is rather than asserting it flatly.
     */
    lastVerifiedAt: { type: Date },

    description: { type: String, trim: true, default: "" },

    // ── Media. Ordered — Mongo will not preserve insertion order otherwise,
    // and a slab gallery that reshuffles between page loads reads as broken.
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
StoneSchema.index({ name: "text", mossanoCode: "text", lotNumber: "text", origin: "text" });
// The catalogue's default ordering: available first, newest within that.
StoneSchema.index({ isDeleted: 1, isPublished: 1, availabilityRank: 1, createdAt: -1 });

const StoneModel = mongoose.model("Stone", StoneSchema);

export { StoneModel, SlabSchema };
