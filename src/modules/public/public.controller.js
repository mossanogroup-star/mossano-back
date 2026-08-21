import { publicService } from "./public.service.js";
import { enquiryService } from "../enquiry/enquiry.service.js";
import { selectionService } from "../selection/selection.service.js";
import { toPublicStoneDto, toStoneCardDto } from "../stone/stone.dto.js";
import { toPublicEditDto, toPublicEditDetailDto } from "../edit/edit.dto.js";
import { toPublicApplicationDto } from "../application/application.dto.js";
import { toPublicSelectionDto } from "../selection/selection.dto.js";
import { toHeroMediaDto } from "../media/media.dto.js";
import { toSubmissionReceiptDto } from "../enquiry/enquiry.dto.js";
import { buildSelectionPdf } from "../../utils/pdf/selectionPdf.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { brand } from "../../config/brand.js";
import {
  LOOKS,
  APPLICATIONS,
  MATERIALS,
  COLOURS,
  FINISHES,
  AVAILABILITY_LABELS,
} from "../stone/stone.constants.js";
import { whatsappLink, sourcingMessage } from "../../utils/whatsapp.js";

/**
 * Everything the storefront needs that never changes per request: brand facts,
 * the taxonomies its filter labels come from, and the default WhatsApp link.
 * Fetched once and held, so a filter chip never has to guess its own label.
 */
const config = asyncHandler(async (_req, res) =>
  sendSuccess(res, {
    data: {
      brand,
      whatsapp: {
        general: whatsappLink(sourcingMessage()),
        number: brand.whatsappNumber,
      },
      taxonomies: {
        looks: LOOKS,
        applications: APPLICATIONS,
        materials: MATERIALS,
        colours: COLOURS,
        finishes: FINISHES,
        availability: AVAILABILITY_LABELS,
      },
    },
  }),
);

const home = asyncHandler(async (_req, res) => {
  const data = await publicService.home();
  return sendSuccess(res, {
    data: {
      featured: data.featured.map(toStoneCardDto),
      isFeaturedFallback: data.isFeaturedFallback,
      currentEdit: data.currentEdit
        ? toPublicEditDto(data.currentEdit, {
            stones: data.currentEdit.resolvedStones,
          })
        : null,

      // Resolved on the server so the storefront renders what it is given
      // rather than guessing from whatever sorted first — see resolveHero.
      hero: data.hero.stone
        ? {
            source: data.hero.source,
            stone: toStoneCardDto(data.hero.stone),
            image: toHeroMediaDto(data.hero.stone.images?.[0]) ?? null,
          }
        : null,
      looks: data.looks,
      applications: data.applications,
    },
  });
});

const shop = asyncHandler(async (req, res) => {
  const { items, facets, ...meta } = await publicService.shop(req.validated.query);
  return sendSuccess(res, {
    data: items.map(toStoneCardDto),
    meta: { ...meta, facets },
  });
});

const stone = asyncHandler(async (req, res) => {
  const {
    stone: doc,
    related,
    appearsIn,
    projects,
  } = await publicService.stone(req.validated.params.slug);
  return sendSuccess(res, {
    data: {
      stone: toPublicStoneDto(doc),
      related: related.map(toStoneCardDto),
      appearsIn: appearsIn.map((e) => ({
        title: e.title,
        status: e.status,
        href: `/new-edit/${e.slug}`,
      })),
      projects: projects.map((p) => toPublicApplicationDto(p)),
    },
  });
});

const edits = asyncHandler(async (_req, res) => {
  const live = await publicService.liveEdits();
  return sendSuccess(res, {
    data: live.map((e) => toPublicEditDto(e, { stones: e.resolvedStones })),
  });
});

const edit = asyncHandler(async (req, res) => {
  const { edit: doc, stones } = await publicService.edit(req.validated.params.slug);
  return sendSuccess(res, { data: toPublicEditDetailDto(doc, stones) });
});

const looks = asyncHandler(async (_req, res) =>
  sendSuccess(res, { data: await publicService.lookIndex() }),
);

const look = asyncHandler(async (req, res) => {
  const { items, slug, label, ...meta } = await publicService.look(
    req.validated.params.slug,
    req.validated.query,
  );
  return sendSuccess(res, {
    data: items.map(toStoneCardDto),
    meta: { ...meta, slug, label },
  });
});

const applications = asyncHandler(async (_req, res) =>
  sendSuccess(res, { data: await publicService.applicationIndex() }),
);

const application = asyncHandler(async (req, res) => {
  const { items, projects, slug, label, ...meta } = await publicService.application(
    req.validated.params.slug,
    req.validated.query,
  );
  return sendSuccess(res, {
    data: {
      projects: projects.map((p) => toPublicApplicationDto(p)),
      stones: items.map(toStoneCardDto),
    },
    meta: { ...meta, slug, label },
  });
});

const applicationProject = asyncHandler(async (req, res) => {
  const { project, stones } = await publicService.applicationProject(req.validated.params.slug);
  return sendSuccess(res, { data: toPublicApplicationDto(project, stones) });
});

/** Website §5 — resolve the device's stored slugs into cards. */
const favourites = asyncHandler(async (req, res) => {
  const stones = await publicService.favourites(req.validated.body.slugs);
  return sendSuccess(res, { data: stones.map(toStoneCardDto) });
});

/**
 * The one unauthenticated write in the API. Every public form arrives here:
 * contact, stone enquiry, reserve, slab video, sourcing brief, pre-book,
 * register interest, and a message raised from a private selection.
 *
 * The response carries a reference and nothing else — see enquiry.dto.js.
 */
const submitEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.submit(req.validated.body, {
    sourcePath: req.validated.body.sourcePath || req.get("referer"),
    userAgent: req.get("user-agent"),
  });
  return sendSuccess(res, {
    statusCode: 201,
    message: "Thank you — MOSSANO will be in touch.",
    data: toSubmissionReceiptDto(enquiry),
  });
});

const selection = asyncHandler(async (req, res) => {
  const doc = await selectionService.getByToken(req.validated.params.token);
  const items = await selectionService.resolveItems(doc);
  return sendSuccess(res, { data: toPublicSelectionDto(doc, items) });
});

const selectionPdf = asyncHandler(async (req, res) => {
  const doc = await selectionService.getByToken(req.validated.params.token);
  const items = await selectionService.resolveItems(doc);

  const buffer = await buildSelectionPdf(toPublicSelectionDto(doc, items), {
    whatsappNumber: brand.whatsappNumber,
    email: brand.email,
  });

  const filename = `MOSSANO-${doc.reference}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  // A private document must not sit in a shared cache.
  res.setHeader("Cache-Control", "private, no-store");
  return res.send(buffer);
});

const publicController = {
  config,
  home,
  shop,
  stone,
  edits,
  edit,
  looks,
  look,
  applications,
  application,
  applicationProject,
  favourites,
  submitEnquiry,
  selection,
  selectionPdf,
};

export { publicController };
