import { applicationRepository } from "./application.repository.js";
import { PROJECT_SECTORS } from "./application.model.js";
import { stoneRepository } from "../stone/stone.repository.js";
import { APPLICATIONS, labelOf } from "../stone/stone.constants.js";
import { uniqueSlug } from "../../utils/slugify.js";
import { AppError } from "../../utils/AppError.js";
import { invalidateStorefront } from "../stone/stone.service.js";

function buildPatch(body) {
  const patch = { ...body };
  if (body.imageIds !== undefined) {
    patch.images = body.imageIds;
    delete patch.imageIds;
  }
  if (body.stoneIds !== undefined) {
    patch.stones = body.stoneIds;
    delete patch.stoneIds;
  }
  if (body.videoIds !== undefined) {
    patch.videos = body.videoIds;
    delete patch.videoIds;
  }
  return patch;
}

const applicationService = {
  list(query) {
    return applicationRepository.findMany(query);
  },

  async get(id) {
    const application = await applicationRepository.findById(id);
    if (!application) throw new AppError("Application not found", 404);
    return application;
  },

  async getBySlug(slug, opts) {
    const application = await applicationRepository.findBySlug(slug, opts);
    if (!application) throw new AppError("Application not found", 404);
    return application;
  },

  resolveStones(application, { publishedOnly = true } = {}) {
    return stoneRepository.findManyByIdsOrdered(application.stones ?? [], {
      publishedOnly,
    });
  },

  /**
   * The Shop-by-Application index (Website §7).
   *
   * Every one of the seven categories is returned, whether or not it has
   * photography, each carrying two counts: how many projects exist, and how
   * many stones are tagged for that use. The storefront needs both to decide
   * what a tile does — with project photos it opens a gallery, with only tagged
   * stones it opens a filtered Stone Shop, and with neither it is not a link at
   * all. The client has supplied no application photography yet, so most
   * categories start in the second or third state.
   */
  async index() {
    const [projectCounts, stoneFacets] = await Promise.all([
      applicationRepository.countsByApplication(),
      stoneRepository.facets(),
    ]);

    const projectsBy = new Map(projectCounts.map((c) => [c.application, c.count]));
    const stonesBy = new Map((stoneFacets.applications ?? []).map((c) => [c.value, c.count]));

    return APPLICATIONS.map(({ slug, label }) => {
      const projectCount = projectsBy.get(slug) ?? 0;
      const stoneCount = stonesBy.get(slug) ?? 0;
      return {
        slug,
        label,
        projectCount,
        stoneCount,
        href: projectCount ? `/application/${slug}` : `/shop?application=${slug}`,
        isEmpty: projectCount === 0 && stoneCount === 0,
      };
    });
  },

  /**
   * The Projects page — Phase-1 feedback §6. Grouped by sector so the page
   * reads the way the client's brochure does, and sectors with nothing in them
   * are dropped rather than rendered as empty headings.
   */
  async projects() {
    const docs = await applicationRepository.findProjects();
    return PROJECT_SECTORS.map(({ slug, label }) => ({
      slug,
      label,
      projects: docs.filter((d) => d.sector === slug),
    })).filter((group) => group.projects.length > 0);
  },

  // --- Phase-2 feedback §5: the Shop by Application pages' own content ---

  getContent(application, opts) {
    return applicationRepository.findContent(application, opts);
  },

  /** Every application, written or not, so the admin can see what is missing. */
  async listContent() {
    const written = await applicationRepository.findAllContent();
    const by = new Map(written.map((c) => [c.application, c]));
    return APPLICATIONS.map(({ slug, label }) => ({
      slug,
      label,
      content: by.get(slug) ?? null,
    }));
  },

  async saveContent(application, body, user) {
    if (!labelOf(APPLICATIONS, application)) throw new AppError("Unknown application", 404);

    const patch = { ...body, updatedBy: user?.id };
    if (body.imageIds !== undefined) {
      patch.images = body.imageIds;
      delete patch.imageIds;
    }

    const saved = await applicationRepository.upsertContent(application, patch);
    invalidateStorefront();
    return saved;
  },

  async create(body, user) {
    const patch = buildPatch(body);
    patch.slug = await uniqueSlug(
      body.projectName || body.title,
      (s) => applicationRepository.slugExists(s),
      { discriminator: labelOf(APPLICATIONS, body.application) },
    );

    const created = await applicationRepository.create({
      ...patch,
      createdBy: user?.id,
    });
    invalidateStorefront();
    return applicationRepository.findById(created._id);
  },

  async update(id, body, user) {
    const patch = buildPatch(body);
    delete patch.slug;

    const updated = await applicationRepository.findByIdAndSave(id, {
      ...patch,
      updatedBy: user?.id,
    });
    if (!updated) throw new AppError("Application not found", 404);

    invalidateStorefront();
    return updated;
  },

  async remove(id) {
    const deleted = await applicationRepository.softDelete(id);
    if (!deleted) throw new AppError("Application not found", 404);
    invalidateStorefront();
    return { id };
  },
};

export { applicationService };
