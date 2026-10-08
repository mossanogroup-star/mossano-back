import { SiteSettingsModel } from "./settings.model.js";
import { toMediaDto } from "../media/media.dto.js";
import { invalidateStorefront } from "../stone/stone.service.js";

const KEY = "site";

const settingsService = {
  /** The record with its hero image populated, or the defaults if never saved. */
  async get() {
    const doc = await SiteSettingsModel.findOne({ key: KEY }).populate("heroImage").lean();
    return doc ?? { showLooks: false, showApplications: false, heroImage: null };
  },

  async save(body, user) {
    const patch = { ...body, updatedBy: user?.id };
    if (body.heroImageId !== undefined) {
      patch.heroImage = body.heroImageId;
      delete patch.heroImageId;
    }
    await SiteSettingsModel.updateOne({ key: KEY }, { $set: patch }, { upsert: true });
    invalidateStorefront();
    return this.get();
  },
};

function toSettingsDto(doc) {
  return {
    showLooks: Boolean(doc.showLooks),
    showApplications: Boolean(doc.showApplications),
    heroImage: toMediaDto(doc.heroImage),
  };
}

export { settingsService, toSettingsDto };
