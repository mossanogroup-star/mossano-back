/**
 * One response shape for the whole API.
 *
 *   success  { success: true, message?, data?, meta? }
 *   failure  { success: false, error: { code, message, details? } }
 *
 * The failure shape is produced by middlewares/errorHandler.js.
 */
function sendSuccess(res, { statusCode = 200, data, meta, message } = {}) {
  const payload = { success: true };

  if (typeof message === "string" && message.length > 0)
    payload.message = message;
  if (typeof data !== "undefined") payload.data = data;
  if (typeof meta !== "undefined") payload.meta = meta;

  return res.status(statusCode).json(payload);
}

function sendNoContent(res) {
  return res.status(204).send();
}

export { sendSuccess, sendNoContent };
