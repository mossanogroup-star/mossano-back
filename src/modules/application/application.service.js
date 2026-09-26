import { applicationRepository } from "./application.repository.js";
import {
  PROJECT_SECTORS,
  ApplicationCategoryModel,
  ApplicationModel,
} from "./application.model.js";
import { StoneModel } from "../stone/stone.model.js";
import { stoneRepository } from "../stone/stone.repository.js";
import { APPLICATIONS, APPLICATION_SLUGS, labelOf } from "../stone/stone.constants.js";
import { slugify } from "../../utils/slugify.js";

/** The seven from the requirement document; these can never be deleted. */
const BUILT_IN = new Set(APPLICATION_SLUGS);

function addToTaxonomy({ slug, label }) {
  if (APPLICATION_SLUGS.includes(slug)) return;
  APPLICATIONS.push({ slug, label });
  APPLICATION_SLUGS.push(slug);
}
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
  // --- Applications added from the admin ---

  /**
   * Called once at startup. The lists are mutated in place so every module that
   * imported them sees the additions.
   * ponytail: in-memory per process; with more than one server instance, a new
   * application reaches the others on their next restart. Move to a DB read if
   * the site ever scales out.
   */
  async loadCategories() {
    const custom = await ApplicationCategoryModel.find().sort({ createdAt: 1 }).lean();
    custom.forEach(addToTaxonomy);
  },

  async createCategory({ label }, user) {
    const slug = slugify(label, { maxLength: 60 });
    if (!slug) throw new AppError("Name the application", 400);
    if (APPLICATION_SLUGS.includes(slug))
      throw new AppError(`${label} already exists`, 409, { code: "CONFLICT" });

    await ApplicationCategoryModel.create({ slug, label, createdBy: user?.id });
    addToTaxonomy({ slug, label });
    invalidateStorefront();
    return { slug, label };
  },

  /** Only an added application, and only while nothing is tagged with it. */
  async removeCategory(slug) {
    if (BUILT_IN.has(slug)) throw new AppError("Built-in applications cannot be removed", 400);
    const [stone, project] = await Promise.all([
      StoneModel.exists({ applications: slug, isDeleted: false }),
      ApplicationModel.exists({ application: slug, isDeleted: false }),
    ]);
    if (stone || project)
      throw new AppError("Stones or projects still use this application — untag them first", 409, {
        code: "CONFLICT",
      });

    await ApplicationCategoryModel.deleteOne({ slug });
    const i = APPLICATION_SLUGS.indexOf(slug);
    if (i !== -1) {
      APPLICATION_SLUGS.splice(i, 1);
      APPLICATIONS.splice(
        APPLICATIONS.findIndex((a) => a.slug === slug),
        1,
      );
    }
    invalidateStorefront();
    return { slug };
  },

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
    const [projectCounts, stoneFacets, contents] = await Promise.all([
      applicationRepository.countsByApplication(),
      stoneRepository.facets(),
      applicationRepository.findAllContent(),
    ]);

    const projectsBy = new Map(projectCounts.map((c) => [c.application, c.count]));
    const stonesBy = new Map((stoneFacets.applications ?? []).map((c) => [c.value, c.count]));
    // The application page's own imagery also earns it a page — without this a
    // newly added application, with no stones tagged yet, was a dead tile.
    const imagesBy = new Map(
      contents
        .filter((c) => c.isPublished !== false)
        .map((c) => [c.application, (c.images ?? []).length]),
    );

    return APPLICATIONS.map(({ slug, label }) => {
      const projectCount = projectsBy.get(slug) ?? 0;
      const stoneCount = stonesBy.get(slug) ?? 0;
      const imageCount = imagesBy.get(slug) ?? 0;
      return {
        slug,
        label,
        projectCount,
        stoneCount,
        imageCount,
        href: projectCount || imageCount ? `/application/${slug}` : `/shop?application=${slug}`,
        isEmpty: projectCount === 0 && stoneCount === 0 && imageCount === 0,
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
      builtIn: BUILT_IN.has(slug),
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

  // --- Phase-3 feedback: the Projects page's Videos tab ---

  listVideos(opts) {
    return applicationRepository.findVideos(opts);
  },

  async createVideo(body, user) {
    const created = await applicationRepository.createVideo({ ...body, createdBy: user?.id });
    invalidateStorefront();
    return applicationRepository.findVideoById(created._id);
  },

  async updateVideo(id, body, user) {
    const updated = await applicationRepository.updateVideo(id, {
      instagramUrl: null,
      video: null,
      location: null,
      ...body,
      updatedBy: user?.id,
    });
    if (!updated) throw new AppError("Video not found", 404);
    invalidateStorefront();
    return updated;
  },

  async removeVideo(id) {
    const deleted = await applicationRepository.deleteVideo(id);
    if (!deleted) throw new AppError("Video not found", 404);
    invalidateStorefront();
    return { id };
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
