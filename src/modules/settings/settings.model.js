/**
 * @module SiteSettingsModel
 * @description Storefront switches the team flips from the admin panel.
 *
 * Phase-4 feedback (8 Oct 2026) — "remove Shop by Look and Shop by Application,
 * but don't remove them completely", and "make the Black Marquina image on the
 * home page editable". One record, keyed by `key`, so there is never a second
 * copy to disagree with the first.
 */
import mongoose from "mongoose";

const SiteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "site", unique: true },

    /** Off by default: the client asked for both pages to come out of the menu. */
    showLooks: { type: Boolean, default: false },
    showApplications: { type: Boolean, default: false },

    /** The home page's first slide. Unset falls back to resolveHero's ranking. */
    heroImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const SiteSettingsModel = mongoose.model("SiteSettings", SiteSettingsSchema);

export { SiteSettingsModel };
