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

/**
 * How the Projects page groups a project — the brochure's own headings
 * ("Landmark Projects: Residential", "Hospitality & Infrastructure").
 * Optional: an ordinary application photo is not a landmark project.
 */
const PROJECT_SECTORS = [
  { slug: "residential", label: "Residential" },
  { slug: "hospitality", label: "Hospitality" },
  { slug: "commercial", label: "Commercial" },
  { slug: "infrastructure", label: "Infrastructure" },
];

const PROJECT_SECTOR_SLUGS = PROJECT_SECTORS.map((s) => s.slug);

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

    /** Phase-1 feedback §6 — the Projects page carries video, not just stills. */
    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],

    /**
     * Phase-1 feedback §6's "entry links" — anything worth linking out to for
     * this project: the developer, a press piece, a walkthrough.
     */
    links: [
      {
        _id: false,
        label: { type: String, trim: true, required: true },
        url: { type: String, trim: true, required: true },
      },
    ],

    /** Set only on the landmark projects that appear on /projects. */
    sector: { type: String, enum: PROJECT_SECTOR_SLUGS, index: true },
    /** As the brochure quotes it — "450,000 Sq. Ft." */
    areaSqFt: { type: Number, min: 0 },

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

/** The Projects page lists by sector, newest first. */
ApplicationSchema.index({ isDeleted: 1, isPublished: 1, sector: 1, areaSqFt: -1 });

const ApplicationModel = mongoose.model("Application", ApplicationSchema);

export { ApplicationModel, PROJECT_SECTORS, PROJECT_SECTOR_SLUGS };
