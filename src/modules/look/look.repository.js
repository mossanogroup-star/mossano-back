import { LookContentModel } from "./look.model.js";

const POPULATE = [{ path: "images" }];

const lookRepository = {
  findContent: (look, { publishedOnly = true } = {}) =>
    LookContentModel.findOne({
      look,
      ...(publishedOnly ? { isPublished: true } : {}),
    })
      .populate(POPULATE)
      .lean(),

  findAllContent: ({ publishedOnly = false } = {}) =>
    LookContentModel.find(publishedOnly ? { isPublished: true } : {})
      .populate(POPULATE)
      .lean(),

  /**
   * Upsert, not create-or-update: the look slug is the key and there is exactly
   * one record per slug, so the admin never has to know whether this page has
   * been written before.
   */
  async upsertContent(look, patch) {
    await LookContentModel.updateOne({ look }, { $set: { ...patch, look } }, { upsert: true });
    return this.findContent(look, { publishedOnly: false });
  },
};

export { lookRepository };
