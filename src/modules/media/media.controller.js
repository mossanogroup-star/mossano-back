import { mediaService } from "./media.service.js";
import { toMediaDto } from "./media.dto.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/AppError.js";

const list = asyncHandler(async (req, res) => {
  const { items, ...meta } = await mediaService.list(req.validated.query);
  return sendSuccess(res, { data: items.map(toMediaDto), meta });
});

const get = asyncHandler(async (req, res) => {
  const media = await mediaService.get(req.validated.params.id);
  return sendSuccess(res, { data: toMediaDto(media) });
});

const uploadOne = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("No file was uploaded", 400);
  const media = await mediaService.uploadOne(req.file, req.validated.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Uploaded",
    data: toMediaDto(media),
  });
});

const uploadMany = asyncHandler(async (req, res) => {
  const { uploaded, errors } = await mediaService.uploadMany(
    req.files,
    req.validated.body,
    req.user,
  );
  return sendSuccess(res, {
    statusCode: 201,
    message: `Uploaded ${uploaded.length} file${uploaded.length === 1 ? "" : "s"}`,
    data: uploaded.map(toMediaDto),
    meta: { uploaded: uploaded.length, failed: errors.length, errors },
  });
});

const update = asyncHandler(async (req, res) => {
  const media = await mediaService.update(req.validated.params.id, req.validated.body);
  return sendSuccess(res, { message: "Updated", data: toMediaDto(media) });
});

const remove = asyncHandler(async (req, res) => {
  const result = await mediaService.remove(req.validated.params.id);
  return sendSuccess(res, { message: "Deleted", data: result });
});

const facets = asyncHandler(async (_req, res) =>
  sendSuccess(res, { data: { kinds: await mediaService.facets() } }),
);

const mediaController = { list, get, uploadOne, uploadMany, update, remove, facets };

export { mediaController };
