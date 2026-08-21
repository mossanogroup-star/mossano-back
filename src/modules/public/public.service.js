/**
 * The storefront's read model.
 *
 * Everything the public site renders is assembled here rather than in the
 * storefront, for one reason that matters more than tidiness: the site is
 * server-rendered, so these functions run inside the SSR pass. Composing a page
 * from six client-side requests would mean six waterfalls before a crawler sees
 * anything, and Website §1's home page alone needs featured stones, the current
 * Edit, the look index and the application index.
 *
 * Each function here is one page's worth of data, in one round of queries.
 */
import { stoneRepository } from "../stone/stone.repository.js";
import { stoneService } from "../stone/stone.service.js";
import { editRepository } from "../edit/edit.repository.js";
import { editService } from "../edit/edit.service.js";
import { applicationRepository } from "../application/application.repository.js";
import { applicationService } from "../application/application.service.js";
import { LOOKS, APPLICATIONS, labelOf } from "../stone/stone.constants.js";
import { AppError } from "../../utils/AppError.js";

/** Public queries are always narrowed to what a customer may see. */
const PUBLIC_SCOPE = { publishedOnly: true };

const publicService = {
  /**
   * Website §1. Hero, featured stones, the Current Edit, Shop by Look and Shop
   * by Application — the whole page in one pass.
   */
  async home() {
    const [featured, liveEdits, lookIndex, applicationIndex, newest] = await Promise.all([
      stoneRepository.findMany({ ...PUBLIC_SCOPE, featured: true, limit: 8, page: 1 }),
      editService.live(),
      this.lookIndex(),
      applicationService.index(),
      stoneRepository.findMany({ ...PUBLIC_SCOPE, sort: "newest", limit: 8, page: 1 }),
    ]);

    const currentEdit = liveEdits.find((e) => e.status === "current") ?? null;

    return {
      // Falls back to the newest stock when nothing has been marked featured —
      // an empty "Featured stones" band on the home page is worse than an
      // unlabelled one, and this is the state a fresh catalogue starts in.
      featured: featured.items.length ? featured.items : newest.items.slice(0, 6),
      isFeaturedFallback: featured.items.length === 0,
      currentEdit,
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
   * Website §6 — Shop by Look.
   *
   * Every look is returned with its count and a lead image taken from the first
   * stone tagged with it, because §6 says the page "should be highly visual"
   * and there is no separate look photography to draw on. A look with no stones
   * is returned too, flagged empty, so the storefront can decide whether to
   * show it rather than silently linking to nothing.
   */
  async lookIndex() {
    const facets = await stoneRepository.facets();
    const countBy = new Map((facets.looks ?? []).map((l) => [l.value, l.count]));

    const leads = await Promise.all(
      LOOKS.map(({ slug }) =>
        stoneRepository.findMany({ ...PUBLIC_SCOPE, look: [slug], limit: 1, page: 1 }),
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
   * A single application category: the projects photographed for it, and the
   * stones tagged for it. Both, because the client has supplied no application
   * photography yet — with none, the page still has the tagged stones to show,
   * and only falls back to the Stone Shop when it has neither.
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
   * Website §5 — Favourites.
   *
   * The device holds nothing but a list of slugs, so this resolves them into
   * cards. Deliberately a POST: a GET carrying an architect's whole shortlist
   * in the query string would land in access logs and in browser history, and
   * would break at a few dozen favourites when the URL got too long.
   *
   * Unknown or unpublished slugs are dropped silently. A stone that was
   * favourited and has since been withdrawn should simply not appear, not
   * produce an error on a page the customer thinks of as their own.
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
