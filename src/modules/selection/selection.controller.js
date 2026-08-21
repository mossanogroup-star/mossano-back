import { selectionService } from "./selection.service.js";
import { toAdminSelectionDto } from "./selection.dto.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const list = asyncHandler(async (req, res) => {
  const { items, ...meta } = await selectionService.list(req.validated.query);
  return sendSuccess(res, {
    data: items.map((s) => toAdminSelectionDto(s)),
    meta,
  });
});

const get = asyncHandler(async (req, res) => {
  const selection = await selectionService.get(req.validated.params.id);
  const items = await selectionService.resolveItems(selection);
  return sendSuccess(res, { data: toAdminSelectionDto(selection, items) });
});

const create = asyncHandler(async (req, res) => {
  const selection = await selectionService.create(req.validated.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: `Selection ${selection.reference} created`,
    data: toAdminSelectionDto(selection),
  });
});

const update = asyncHandler(async (req, res) => {
  const selection = await selectionService.update(
    req.validated.params.id,
    req.validated.body,
    req.user,
  );
  return sendSuccess(res, {
    message: "Selection updated",
    data: toAdminSelectionDto(selection),
  });
});

const revoke = asyncHandler(async (req, res) => {
  const selection = await selectionService.revoke(
    req.validated.params.id,
    req.user,
  );
  return sendSuccess(res, {
    message: "Link revoked — the customer can no longer open it",
    data: toAdminSelectionDto(selection),
  });
});

const restore = asyncHandler(async (req, res) => {
  const selection = await selectionService.restore(
    req.validated.params.id,
    req.user,
  );
  return sendSuccess(res, {
    message: "Link restored",
    data: toAdminSelectionDto(selection),
  });
});

const regenerateLink = asyncHandler(async (req, res) => {
  const selection = await selectionService.regenerateLink(
    req.validated.params.id,
    req.user,
  );
  return sendSuccess(res, {
    message: "New link issued — the previous one no longer works",
    data: toAdminSelectionDto(selection),
  });
});

const addNote = asyncHandler(async (req, res) => {
  const selection = await selectionService.addNote(
    req.validated.params.id,
    req.validated.body.body,
    req.user,
  );
  return sendSuccess(res, {
    message: "Note added",
    data: toAdminSelectionDto(selection),
  });
});

const remove = asyncHandler(async (req, res) => {
  const result = await selectionService.remove(req.validated.params.id);
  return sendSuccess(res, { message: "Selection removed", data: result });
});

const selectionController = {
  list,
  get,
  create,
  update,
  revoke,
  restore,
  regenerateLink,
  addNote,
  remove,
};

export { selectionController };
