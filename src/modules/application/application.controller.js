import { applicationService } from "./application.service.js";
import { toAdminApplicationDto } from "./application.dto.js";
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
  const application = await applicationService.create(
    req.validated.body,
    req.user,
  );
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

const applicationController = { list, index, get, create, update, remove };

export { applicationController };
