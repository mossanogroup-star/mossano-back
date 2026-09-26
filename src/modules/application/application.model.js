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
     * Phase-2 feedback §3 — Instagram reels, by URL.
     *
     * Stored as the URL the team pastes, not an embed: Instagram's own endpoint
     * builds the player, so a post the client later edits or deletes stays in
     * step instead of leaving a dead copy on the project page.
     */
    instagramUrls: [{ type: String, trim: true }],

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

/**
 * Phase-2 feedback §5 — the Shop by Application pages.
 *
 * Deliberately a separate collection from the project records above. The client
 * is explicit that an application page "should not be treated as a project":
 * Bathroom Wall & Floor needs its own imagery showing the use case, which is a
 * different thing from a named development MOSSANO supplied.
 *
 * One record per application slug — `unique` enforces that, so the page can
 * never end up with two competing descriptions.
 */
const ApplicationContentSchema = new mongoose.Schema(
  {
    application: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /** Optional: blank falls back to the taxonomy label in stone.constants.js. */
    headline: { type: String, trim: true },
    description: { type: String, trim: true, default: "" },

    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],

    isPublished: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

/**
 * Phase-3 feedback — the Projects page's Videos tab.
 *
 * A video stands on its own here, not inside a project record: the team posts
 * site walkthroughs that belong to no single photographed project.
 */
const ProjectVideoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    /** Either or both. The file plays in the site's own player; a URL alone
        falls back to Instagram's embed, which Instagram may send off-site. */
    instagramUrl: { type: String, trim: true },
    video: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    location: { type: String, trim: true },
    isPublished: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

/**
 * Applications the team added from the admin, on top of the seven built into
 * stone.constants.js. Loaded into APPLICATIONS at startup, so every labelOf()
 * and validation sees them without knowing where they came from.
 */
const ApplicationCategorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const ApplicationModel = mongoose.model("Application", ApplicationSchema);
const ApplicationContentModel = mongoose.model("ApplicationContent", ApplicationContentSchema);
const ProjectVideoModel = mongoose.model("ProjectVideo", ProjectVideoSchema);
const ApplicationCategoryModel = mongoose.model("ApplicationCategory", ApplicationCategorySchema);

export {
  ApplicationModel,
  ApplicationContentModel,
  ProjectVideoModel,
  ApplicationCategoryModel,
  PROJECT_SECTORS,
  PROJECT_SECTOR_SLUGS,
};
