import { stoneService } from "./stone.service.js";
import { toAdminStoneDto, toStoneCardDto } from "./stone.dto.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const list = asyncHandler(async (req, res) => {
  const { items, ...meta } = await stoneService.list(req.validated.query);
  return sendSuccess(res, { data: items.map(toAdminStoneDto), meta });
});

/** Compact list for pickers: adding stones to an Edit or a private selection. */
const options = asyncHandler(async (req, res) => {
  const { items, ...meta } = await stoneService.list({
    ...req.validated.query,
    limit: 50,
  });
  return sendSuccess(res, { data: items.map(toStoneCardDto), meta });
});

const get = asyncHandler(async (req, res) => {
  const stone = await stoneService.get(req.validated.params.id);
  return sendSuccess(res, { data: toAdminStoneDto(stone) });
});

const create = asyncHandler(async (req, res) => {
  const stone = await stoneService.create(req.validated.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: `${stone.name} added as ${stone.mossanoCode}`,
    data: toAdminStoneDto(stone),
  });
});

const update = asyncHandler(async (req, res) => {
  const stone = await stoneService.update(
    req.validated.params.id,
    req.validated.body,
    req.user,
  );
  return sendSuccess(res, {
    message: "Stone updated",
    data: toAdminStoneDto(stone),
  });
});

const setAvailability = asyncHandler(async (req, res) => {
  const stone = await stoneService.setAvailability(
    req.validated.params.id,
    req.validated.body.availability,
    req.user,
  );
  return sendSuccess(res, {
    message: `${stone.name} is now ${stone.availability.replace(/_/g, " ")}`,
    data: toAdminStoneDto(stone),
  });
});

const markVerified = asyncHandler(async (req, res) => {
  const stone = await stoneService.markVerified(
    req.validated.params.id,
    req.user,
  );
  return sendSuccess(res, {
    message: "Availability verified",
    data: toAdminStoneDto(stone),
  });
});

const remove = asyncHandler(async (req, res) => {
  const result = await stoneService.remove(req.validated.params.id);
  return sendSuccess(res, { message: "Stone removed", data: result });
});

const facets = asyncHandler(async (_req, res) =>
  sendSuccess(res, { data: await stoneService.facets() }),
);

const stoneController = {
  list,
  options,
  get,
  create,
  update,
  setAvailability,
  markVerified,
  remove,
  facets,
};

export { stoneController };
