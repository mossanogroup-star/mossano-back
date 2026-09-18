import { applicationService } from "./application.service.js";
import { toAdminApplicationDto, toApplicationContentDto } from "./application.dto.js";
import { APPLICATIONS, labelOf } from "../stone/stone.constants.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const list = asyncHandler(async (req, res) => {
  const { items, ...meta } = await applicationService.list(req.validated.query);
  return sendSuccess(res, {
    data: items.map((a) => toAdminApplicationDto(a)),
    meta,
  });
});

const index = asyncHandler(async (_req, res) =>
  sendSuccess(res, { data: await applicationService.index() }),
);

const get = asyncHandler(async (req, res) => {
  const application = await applicationService.get(req.validated.params.id);
  const stones = await applicationService.resolveStones(application, {
    publishedOnly: false,
  });
  return sendSuccess(res, { data: toAdminApplicationDto(application, stones) });
});

const create = asyncHandler(async (req, res) => {
  const application = await applicationService.create(req.validated.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: `${application.title} added`,
    data: toAdminApplicationDto(application),
  });
});

const update = asyncHandler(async (req, res) => {
  const application = await applicationService.update(
    req.validated.params.id,
    req.validated.body,
    req.user,
  );
  return sendSuccess(res, {
    message: "Updated",
    data: toAdminApplicationDto(application),
  });
});

const remove = asyncHandler(async (req, res) => {
  const result = await applicationService.remove(req.validated.params.id);
  return sendSuccess(res, { message: "Removed", data: result });
});

/** Phase-2 feedback §5 — every application page, written or not. */
const listContent = asyncHandler(async (_req, res) => {
  const rows = await applicationService.listContent();
  return sendSuccess(res, {
    data: rows.map(({ slug, label, content }) => toApplicationContentDto(content, { slug, label })),
  });
});

const saveContent = asyncHandler(async (req, res) => {
  const { application } = req.validated.params;
  const saved = await applicationService.saveContent(application, req.validated.body, req.user);
  return sendSuccess(res, {
    message: "Saved",
    data: toApplicationContentDto(saved, {
      slug: application,
      label: labelOf(APPLICATIONS, application),
    }),
  });
});

const applicationController = {
  list,
  index,
  get,
  create,
  update,
  remove,
  listContent,
  saveContent,
};

export { applicationController };
