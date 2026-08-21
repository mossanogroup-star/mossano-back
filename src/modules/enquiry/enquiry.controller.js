import { enquiryService } from "./enquiry.service.js";
import { toEnquiryDto } from "./enquiry.dto.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const list = asyncHandler(async (req, res) => {
  const { items, ...meta } = await enquiryService.list(req.validated.query);
  return sendSuccess(res, { data: items.map(toEnquiryDto), meta });
});

const get = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.get(req.validated.params.id);
  return sendSuccess(res, { data: toEnquiryDto(enquiry) });
});

const setStatus = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.setStatus(
    req.validated.params.id,
    req.validated.body.status,
  );
  return sendSuccess(res, {
    message: "Status updated",
    data: toEnquiryDto(enquiry),
  });
});

const update = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.update(req.validated.params.id, req.validated.body);
  return sendSuccess(res, {
    message: "Enquiry updated",
    data: toEnquiryDto(enquiry),
  });
});

const addNote = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.addNote(
    req.validated.params.id,
    req.validated.body.body,
    req.user,
  );
  return sendSuccess(res, {
    message: "Note added",
    data: toEnquiryDto(enquiry),
  });
});

const assign = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.assign(
    req.validated.params.id,
    req.validated.body.assignedTo ?? null,
  );
  return sendSuccess(res, { message: "Assigned", data: toEnquiryDto(enquiry) });
});

const remove = asyncHandler(async (req, res) => {
  const result = await enquiryService.remove(req.validated.params.id);
  return sendSuccess(res, { message: "Enquiry removed", data: result });
});

const pipeline = asyncHandler(async (_req, res) =>
  sendSuccess(res, { data: await enquiryService.pipeline() }),
);

const stats = asyncHandler(async (_req, res) =>
  sendSuccess(res, { data: await enquiryService.stats() }),
);

const enquiryController = {
  list,
  get,
  setStatus,
  update,
  addNote,
  assign,
  remove,
  pipeline,
  stats,
};

export { enquiryController };
