import { userService } from "./user.service.js";
import { toUserDto } from "../auth/auth.dto.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const list = asyncHandler(async (req, res) => {
  const { items, ...meta } = await userService.list(req.validated.query);
  return sendSuccess(res, { data: items.map(toUserDto), meta });
});

const get = asyncHandler(async (req, res) => {
  const user = await userService.get(req.validated.params.id);
  return sendSuccess(res, { data: toUserDto(user) });
});

const create = asyncHandler(async (req, res) => {
  const user = await userService.create(req.validated.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Team member added",
    data: toUserDto(user),
  });
});

const update = asyncHandler(async (req, res) => {
  const user = await userService.update(req.validated.params.id, req.validated.body, req.user);
  return sendSuccess(res, { message: "Updated", data: toUserDto(user) });
});

const remove = asyncHandler(async (req, res) => {
  const result = await userService.remove(req.validated.params.id, req.user);
  return sendSuccess(res, { message: "Removed", data: result });
});

const userController = { list, get, create, update, remove };

export { userController };
