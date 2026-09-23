import { lookRepository } from "./look.repository.js";
import { LOOKS, labelOf } from "../stone/stone.constants.js";
import { invalidateStorefront } from "../stone/stone.service.js";
import { AppError } from "../../utils/AppError.js";

const lookService = {
  getContent(look, opts) {
    return lookRepository.findContent(look, opts);
  },

  /** Every look, written or not, so the admin can see what is missing. */
  async listContent() {
    const written = await lookRepository.findAllContent();
    const by = new Map(written.map((c) => [c.look, c]));
    return LOOKS.map(({ slug, label }) => ({
      slug,
      label,
      content: by.get(slug) ?? null,
    }));
  },

  /** Published pages only, keyed by slug — what the storefront reads. */
  async publishedContentBySlug() {
    const rows = await lookRepository.findAllContent({ publishedOnly: true });
    return new Map(rows.map((row) => [row.look, row]));
  },

  async saveContent(look, body, user) {
    if (!labelOf(LOOKS, look)) throw new AppError("Unknown look", 404);

    const patch = { ...body, updatedBy: user?.id };
    if (body.imageIds !== undefined) {
      patch.images = body.imageIds;
      delete patch.imageIds;
    }

    const saved = await lookRepository.upsertContent(look, patch);
    invalidateStorefront();
    return saved;
  },
};

export { lookService };
