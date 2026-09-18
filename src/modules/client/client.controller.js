import { clientService } from "./client.service.js";
import { clientRepository } from "./client.repository.js";
import { toAdminCategoryDto, toAdminClientDto } from "./client.dto.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

/**
 * Categories carry their client count, so the admin can see at a glance which
 * ones are empty — and why a delete was refused.
 */
const listCategories = asyncHandler(async (_req, res) => {
  const categories = await clientService.listCategories();
  const counts = await Promise.all(
    categories.map((c) => clientRepository.countClientsInCategory(c._id)),
  );
  return sendSuccess(res, {
    data: categories.map((c, i) => toAdminCategoryDto(c, counts[i])),
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await clientService.createCategory(req.validated.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: `${category.name} created`,
    data: toAdminCategoryDto(category),
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await clientService.updateCategory(
    req.validated.params.id,
    req.validated.body,
    req.user,
  );
  return sendSuccess(res, { message: "Category updated", data: toAdminCategoryDto(category) });
});

const removeCategory = asyncHandler(async (req, res) => {
  const result = await clientService.removeCategory(req.validated.params.id);
  return sendSuccess(res, { message: "Category removed", data: result });
});

const listClients = asyncHandler(async (_req, res) => {
  const clients = await clientService.listClients();
  return sendSuccess(res, { data: clients.map(toAdminClientDto) });
});

const createClient = asyncHandler(async (req, res) => {
  const client = await clientService.createClient(req.validated.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: `${client.name} added`,
    data: toAdminClientDto(client),
  });
});

const updateClient = asyncHandler(async (req, res) => {
  const client = await clientService.updateClient(
    req.validated.params.id,
    req.validated.body,
    req.user,
  );
  return sendSuccess(res, { message: "Client updated", data: toAdminClientDto(client) });
});

const removeClient = asyncHandler(async (req, res) => {
  const result = await clientService.removeClient(req.validated.params.id);
  return sendSuccess(res, { message: "Client removed", data: result });
});

const clientController = {
  listCategories,
  createCategory,
  updateCategory,
  removeCategory,
  listClients,
  createClient,
  updateClient,
  removeClient,
};

export { clientController };
