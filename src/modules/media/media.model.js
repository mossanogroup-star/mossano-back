/**
 * @module MediaModel
 * @description One uploaded file. Every image, slab photograph and video on the
 * site is a Media document; stones, edits, applications and selections hold
 * references to them rather than URLs.
 *
 * That indirection is what makes Admin Scope §1's "uploaded once, used across
 * the website" true. It also means a file can be replaced — a better original
 * from the photographer, say — and every surface picks it up without a
 * migration.
 */
import mongoose from "mongoose";

/** What the file is for. Drives folder placement and the admin library filter. */
const MEDIA_KINDS = [
  "slab", // a photograph of an actual slab in the lot
  "application", // a project/application photo: bathroom, bar, hotel lobby…
  "video", // a slab video the customer can request
  "collection", // an Edit's cover imagery
  "reference", // a reference image a customer attached to a sourcing enquiry
  "selection", // extra photos attached to a private selection
  "general",
];

const MediaSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    kind: { type: String, enum: MEDIA_KINDS, default: "general", index: true },

    provider: { type: String, enum: ["cloudinary", "local"], required: true },
    /** Cloudinary public_id, or the path under uploads/ for the local provider. */
    storageKey: { type: String, required: true, trim: true },
    resourceType: {
      type: String,
      enum: ["image", "video", "raw"],
      default: "image",
    },

    url: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, trim: true },

    width: { type: Number },
    /**
     * Whether `e_trim` can be applied to this image safely.
     *
     * The trim removes the backdrop strip several slabs kept when they were
     * cropped from the catalogue. On a pale slab the stone itself is within
     * tolerance of that border, so Cloudinary trims nearly all of it: MM-007
     * went from 600x470 to 2x686. Measured once at upload; the hero is the only
     * consumer, and it falls back to the untrimmed image when this is false.
     */
    trimSafe: { type: Boolean, default: true },
    height: { type: Number },
    bytes: { type: Number },
    format: { type: String, trim: true },

    /**
     * Alt text. Not decoration: the storefront is almost entirely photography,
     * so without this a screen reader gets nothing at all from a stone page.
     */
    alt: { type: String, trim: true, default: "" },
    caption: { type: String, trim: true, default: "" },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

MediaSchema.index({ kind: 1, createdAt: -1 });

const MediaModel = mongoose.model("Media", MediaSchema);

export { MediaModel, MEDIA_KINDS };
