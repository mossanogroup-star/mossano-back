import { editService } from "./edit.service.js";
import { toAdminEditDto } from "./edit.dto.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const list = asyncHandler(async (req, res) => {
  const { items, ...meta } = await editService.list(req.validated.query);
  return sendSuccess(res, { data: items.map((e) => toAdminEditDto(e)), meta });
});

const get = asyncHandler(async (req, res) => {
  const edit = await editService.get(req.validated.params.id);
  const stones = await editService.resolveStones(edit, {
    publishedOnly: false,
  });
  return sendSuccess(res, { data: toAdminEditDto(edit, stones) });
});

const create = asyncHandler(async (req, res) => {
  const edit = await editService.create(req.validated.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: `${edit.title} created`,
    data: toAdminEditDto(edit),
  });
});

const update = asyncHandler(async (req, res) => {
  const edit = await editService.update(
    req.validated.params.id,
    req.validated.body,
    req.user,
  );
  return sendSuccess(res, {
    message: "Edit updated",
    data: toAdminEditDto(edit),
  });
});

const setStatus = asyncHandler(async (req, res) => {
  const edit = await editService.setStatus(
    req.validated.params.id,
    req.validated.body.status,
    req.user,
  );
  return sendSuccess(res, {
    message: `${edit.title} is now the ${edit.status} Edit`,
    data: toAdminEditDto(edit),
  });
});

const addStones = asyncHandler(async (req, res) => {
  const edit = await editService.addStones(
    req.validated.params.id,
    req.validated.body.stoneIds,
    req.user,
  );
  return sendSuccess(res, {
    message: "Stones added",
    data: toAdminEditDto(edit),
  });
});

const removeStone = asyncHandler(async (req, res) => {
  const { id, stoneId } = req.validated.params;
  const edit = await editService.removeStone(id, stoneId, req.user);
  return sendSuccess(res, {
    message: "Stone removed from Edit",
    data: toAdminEditDto(edit),
  });
});

const remove = asyncHandler(async (req, res) => {
  const result = await editService.remove(req.validated.params.id);
  return sendSuccess(res, { message: "Edit removed", data: result });
});

const editController = {
  list,
  get,
  create,
  update,
  setStatus,
  addStones,
  removeStone,
  remove,
};

export { editController };
