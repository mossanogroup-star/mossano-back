import { authService } from "./auth.service.js";
import { toUserDto, toSessionDto } from "./auth.dto.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const login = asyncHandler(async (req, res) => {
  const session = await authService.login(req.validated.body);
  return sendSuccess(res, {
    message: "Signed in",
    data: toSessionDto(session),
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.id);
  return sendSuccess(res, { data: toUserDto(user) });
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.validated.body);
  return sendSuccess(res, { message: "Password updated", data: result });
});

const authController = { login, me, changePassword };

export { authController };
