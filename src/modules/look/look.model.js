/**
 * @module LookContentModel
 * @description The photography and copy on a Shop by Look page.
 *
 * Phase-3 feedback — "for exotic marble we will upload pictures in the shop by
 * look section". Until now a look tile borrowed the lead image of whatever
 * stone was tagged to it, which is fine for Dark & Moody and wrong for Exotic:
 * the client wants to show the collection, not whichever lot sorted first.
 *
 * One record per look slug — `unique` enforces it — so a page can never end up
 * with two competing descriptions. Deliberately the same shape as
 * ApplicationContent; the two are not merged because the slugs come from two
 * different taxonomies and one enum cannot police both.
 */
import mongoose from "mongoose";
import { LOOK_SLUGS } from "../stone/stone.constants.js";

const LookContentSchema = new mongoose.Schema(
  {
    look: {
      type: String,
      enum: LOOK_SLUGS,
      required: true,
      unique: true,
      index: true,
    },

    /** Optional: blank falls back to the taxonomy label in stone.constants.js. */
    headline: { type: String, trim: true },
    description: { type: String, trim: true, default: "" },

    /** The first is the tile image on the Shop by Look index. */
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],

    isPublished: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const LookContentModel = mongoose.model("LookContent", LookContentSchema);

export { LookContentModel };
