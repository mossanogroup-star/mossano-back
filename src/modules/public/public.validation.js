import { z } from "zod";
import { stoneFilters } from "../stone/stone.validation.js";
import {
  makeSchema,
  slugParamSchema,
  tokenParamSchema,
  buildListQuery,
} from "../../utils/resourceValidationHelpers.js";

const publicShopSchema = makeSchema({ query: buildListQuery(stoneFilters) });

const publicStoneSchema = makeSchema({ params: slugParamSchema });
const publicEditSchema = makeSchema({ params: slugParamSchema });

const publicLookSchema = makeSchema({
  params: slugParamSchema,
  query: buildListQuery({ sort: stoneFilters.sort }),
});

const publicApplicationSchema = makeSchema({
  params: slugParamSchema,
  query: buildListQuery({ sort: stoneFilters.sort }),
});

const publicApplicationProjectSchema = makeSchema({
  params: z.object({ slug: z.string().trim().min(1).max(160) }),
});

const publicSelectionSchema = makeSchema({ params: tokenParamSchema });

/**
 * Favourites are POSTed rather than sent as a query string — see
 * publicService.favourites for why. Capped at 100 so a crafted body cannot turn
 * one request into a hundred database round-trips.
 */
const publicFavouritesSchema = makeSchema({
  body: z.object({
    slugs: z.array(z.string().trim().min(1).max(160)).max(100).default([]),
  }),
});

export {
  publicShopSchema,
  publicStoneSchema,
  publicEditSchema,
  publicLookSchema,
  publicApplicationSchema,
  publicApplicationProjectSchema,
  publicSelectionSchema,
  publicFavouritesSchema,
};
