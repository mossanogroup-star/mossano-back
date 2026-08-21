/**
 * The storefront's read model — one function per page, one round of queries.
 *
 * Composed here rather than in the storefront because these run inside the SSR
 * pass: assembling the home page from six client-side requests would put six
 * waterfalls in front of a crawler.
 */
import { stoneRepository } from "../stone/stone.repository.js";
import { stoneService } from "../stone/stone.service.js";
import { editRepository } from "../edit/edit.repository.js";
import { editService } from "../edit/edit.service.js";
import { applicationRepository } from "../application/application.repository.js";
import { applicationService } from "../application/application.service.js";
import { LOOKS, APPLICATIONS, labelOf } from "../stone/stone.constants.js";
import { AppError } from "../../utils/AppError.js";
import { env } from "../../config/env.js";

/** Public queries are always narrowed to what a customer may see. */
const PUBLIC_SCOPE = { publishedOnly: true };

/** A dark colour family is a cheap proxy for "can carry ivory type". */
const HERO_COLOUR_PREFERENCE = ["black", "grey", "green", "brown"];

/**
 * Hero suitability: dark enough for full-bleed type, large enough not to blur.
 * Both thresholds come from measuring the 22 seeded slabs, whose widths run
 * 875–1443px because they were recovered from the client's PDF catalogues.
 */
function heroScore(stone) {
  const rank = HERO_COLOUR_PREFERENCE.indexOf(stone.colour);
  const darkness =
    rank === -1 ? 0 : (HERO_COLOUR_PREFERENCE.length - rank) / HERO_COLOUR_PREFERENCE.length;
  const resolution = Math.min((stone.images?.[0]?.width ?? 0) / 1600, 1);
  return darkness * 2 + resolution;
}

const publicService = {
  /**
   * Pinned by MOSSANO code, so the front page changes only when someone changes
   * it — left to sort order it moved whenever the team touched stock. The
   * fallback covers one case: the pinned lot was withdrawn.
   */
  async resolveHero() {
    if (env.HERO_STONE_CODE) {
      const pinned = await stoneRepository.findByCode(env.HERO_STONE_CODE);
      if (pinned?.isPublished) return { stone: pinned, source: "pinned" };
    }

    const { items } = await stoneRepository.findMany({
      ...PUBLIC_SCOPE,
      limit: 60,
      page: 1,
    });
    if (!items.length) return { stone: null, source: "none" };

    const best = [...items].sort((a, b) => heroScore(b) - heroScore(a))[0];
    return { stone: best, source: "ranked" };
  },

  /**
   * Website §1. Hero, featured stones, the Current Edit, Shop by Look and Shop
   * by Application — the whole page in one pass.
   */
  async home() {
    const [featured, liveEdits, lookIndex, applicationIndex, newest, hero] = await Promise.all([
      stoneRepository.findMany({
        ...PUBLIC_SCOPE,
        featured: true,
        limit: 8,
        page: 1,
      }),
      editService.live(),
      this.lookIndex(),
      applicationService.index(),
      stoneRepository.findMany({
        ...PUBLIC_SCOPE,
        sort: "newest",
        limit: 8,
        page: 1,
      }),
      this.resolveHero(),
    ]);

    const currentEdit = liveEdits.find((e) => e.status === "current") ?? null;

    return {
      // A fresh catalogue has nothing featured yet, and an empty band reads
      // worse than a relabelled one.
      featured: featured.items.length ? featured.items : newest.items.slice(0, 6),
      isFeaturedFallback: featured.items.length === 0,
      currentEdit,
      hero,
      looks: lookIndex,
      applications: applicationIndex,
    };
  },

  /** Website §3 — the Stone Shop, with the counts its filter rail needs. */
  async shop(query) {
    const [result, facets] = await Promise.all([
      stoneRepository.findMany({ ...query, ...PUBLIC_SCOPE }),
      stoneRepository.facets(),
    ]);
    return { ...result, facets };
  },

  /** Website §4 — a stone page, plus what to show underneath it. */
  async stone(slug) {
    const stone = await stoneRepository.findBySlug(slug, PUBLIC_SCOPE);
    if (!stone) throw new AppError("Stone not found", 404);

    const [related, appearsIn, projects] = await Promise.all([
      stoneService.related(stone),
      editRepository.findContainingStone(stone._id),
      applicationRepository.findMany({
        stoneId: stone._id,
        publishedOnly: true,
        limit: 6,
        page: 1,
      }),
    ]);

    return {
      stone,
      related,
      // Only Edits a customer can actually open.
      appearsIn: appearsIn.filter((e) => e.status !== "archived"),
      projects: projects.items,
    };
  },

  /** Website §2 — Current, Next and Upcoming, in that order. */
  liveEdits() {
    return editService.live();
  },

  async edit(slug) {
    const edit = await editRepository.findBySlug(slug, PUBLIC_SCOPE);
    if (!edit) throw new AppError("Edit not found", 404);
    return { edit, stones: await editService.resolveStones(edit) };
  },

  /**
   * Website §6 — Shop by Look. §6 asks for a "highly visual" page and there is
   * no look photography, so each tile borrows its lead stone's image. Empty
   * looks are returned flagged rather than dropped, so the storefront can
   * decide instead of linking to nothing.
   */
  async lookIndex() {
    const facets = await stoneRepository.facets();
    const countBy = new Map((facets.looks ?? []).map((l) => [l.value, l.count]));

    const leads = await Promise.all(
      LOOKS.map(({ slug }) =>
        stoneRepository.findMany({
          ...PUBLIC_SCOPE,
          look: [slug],
          limit: 1,
          page: 1,
        }),
      ),
    );

    return LOOKS.map(({ slug, label }, i) => {
      const lead = leads[i].items[0] ?? null;
      const count = countBy.get(slug) ?? 0;
      return {
        slug,
        label,
        count,
        isEmpty: count === 0,
        href: `/look/${slug}`,
        image: lead?.primaryImageUrl ?? null,
        imageAlt: lead ? `${lead.name} — ${label}` : null,
      };
    });
  },

  async look(slug, query = {}) {
    const label = labelOf(LOOKS, slug);
    if (!label) throw new AppError("Unknown look", 404);

    const result = await stoneRepository.findMany({
      ...query,
      ...PUBLIC_SCOPE,
      look: [slug],
      limit: query.limit ?? 48,
    });
    return { slug, label, ...result };
  },

  applicationIndex() {
    return applicationService.index();
  },

  /**
   * Projects *and* tagged stones, because the client has supplied no
   * application photography yet — without the stones the page would be empty.
   */
  async application(slug, query = {}) {
    const label = labelOf(APPLICATIONS, slug);
    if (!label) throw new AppError("Unknown application", 404);

    const [projects, stones] = await Promise.all([
      applicationRepository.findMany({
        application: [slug],
        publishedOnly: true,
        limit: 24,
        page: 1,
      }),
      stoneRepository.findMany({
        ...query,
        ...PUBLIC_SCOPE,
        application: [slug],
        limit: query.limit ?? 48,
      }),
    ]);

    return { slug, label, projects: projects.items, ...stones };
  },

  async applicationProject(slug) {
    const project = await applicationRepository.findBySlug(slug, PUBLIC_SCOPE);
    if (!project) throw new AppError("Project not found", 404);
    return { project, stones: await applicationService.resolveStones(project) };
  },

  /**
   * Website §5 — resolves the device's stored slugs into cards.
   *
   * POST, not GET: a shortlist in the query string lands in access logs and
   * browser history, and breaks once the URL grows long. Withdrawn slugs are
   * dropped silently rather than erroring on the customer's own page.
   */
  async favourites(slugs) {
    if (!slugs?.length) return [];

    const found = await Promise.all(
      slugs.slice(0, 100).map((slug) => stoneRepository.findBySlug(slug, PUBLIC_SCOPE)),
    );
    return found.filter(Boolean);
  },
};

export { publicService };
