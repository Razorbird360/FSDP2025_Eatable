import { z } from 'zod';
import searchService from '../../services/search.service.js';
import hawkerCentresService from '../../services/hawker-centres.service.js';
import { stallsService } from '../../services/stalls.service.js';
import { menuService } from '../../services/menu.service.js';
import { createTool, ToolContext } from './tool-base.js';

const limitSchema = z.number().int().min(1).max(20).optional();

const searchSchema = z.object({
  query: z.string().min(1),
  limit: limitSchema,
});

const hawkerSchema = z.object({
  hawkerId: z.string().min(1),
});

const stallSchema = z.object({
  stallId: z.string().min(1),
});

const menuListSchema = z.object({
  limit: limitSchema,
});

const stallListSchema = z.object({
  limit: limitSchema,
});

const hawkerListSchema = z.object({
  limit: limitSchema,
});

const featuredSchema = z.object({
  minUpvotes: z.number().int().min(1).optional(),
  cuisines: z.array(z.string().min(1)).optional(),
});

const mapUploads = (uploads = []) =>
  uploads.map((upload) => ({
    id: upload.id,
    menuItemId: upload.menuItemId,
    userId: upload.userId,
    imageUrl: upload.imageUrl,
    caption: upload.caption ?? null,
    validationStatus: upload.validationStatus,
    reviewedAt: upload.reviewedAt ?? null,
    reviewedBy: upload.reviewedBy ?? null,
    upvoteCount: upload.upvoteCount,
    downvoteCount: upload.downvoteCount,
    voteScore: upload.voteScore,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
    aspectRatio: upload.aspectRatio ?? null,
  }));

const mapMenuItemTagAggs = (aggs = []) =>
  aggs.map((agg) => ({
    id: agg.id,
    menuItemId: agg.menuItemId,
    tagId: agg.tagId,
    count: agg.count,
    avgConfidence: agg.avgConfidence ?? null,
    lastSeenAt: agg.lastSeenAt,
    tag: agg.tag
      ? {
          id: agg.tag.id,
          normalized: agg.tag.normalized,
          displayLabel: agg.tag.displayLabel,
        }
      : null,
  }));

const resolveMenuItemImage = (item) =>
  item.imageUrl ?? item.mediaUploads?.[0]?.imageUrl ?? null;

const isUuid = (value: string) => z.string().uuid().safeParse(value).success;

const normalizeStallQuery = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const withoutParen = trimmed.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const withoutDash = withoutParen.split(' - ')[0]?.trim() ?? withoutParen;
  return withoutDash;
};

const resolveStallId = async (stallIdOrName: string) => {
  if (!stallIdOrName || typeof stallIdOrName !== 'string') return null;
  if (isUuid(stallIdOrName)) return stallIdOrName;

  const candidates = Array.from(
    new Set([normalizeStallQuery(stallIdOrName), stallIdOrName].filter(Boolean))
  );

  for (const candidate of candidates) {
    const results = await searchService.search(candidate, 5);
    const lowered = candidate.toLowerCase();
    const exact = results.stalls.find(
      (stall) => stall.name?.toLowerCase() === lowered
    );
    const match = (exact ?? results.stalls[0])?.id ?? null;
    if (match) return match;

    const fallback = await stallsService.findByNameOrLocation(candidate);
    if (fallback?.id) return fallback.id;
  }

  return null;
};

const resolveHawkerId = async (hawkerIdOrName: string) => {
  if (!hawkerIdOrName || typeof hawkerIdOrName !== 'string') return null;
  if (isUuid(hawkerIdOrName)) return hawkerIdOrName;

  const results = await searchService.search(hawkerIdOrName, 5);
  const lowered = hawkerIdOrName.toLowerCase();
  const exact = results.hawkerCentres.find(
    (centre) => centre.name?.toLowerCase() === lowered
  );
  return (exact ?? results.hawkerCentres[0])?.id ?? null;
};

export const createDiscoveryTools = (context: ToolContext) => [
  createTool(
    {
      name: 'search_entities',
      description: 'Search hawker centres, stalls, and dishes by name.',
      schema: searchSchema,
      handler: async ({ query, limit }) => {
        const results = await searchService.search(query, limit);
        return {
          hawkerCentres: results.hawkerCentres.map((centre) => ({
            id: centre.id,
            name: centre.name,
            imageUrl: centre.imageUrl ?? null,
            address: centre.subtitle ?? null,
          })),
          stalls: results.stalls.map((stall) => ({
            id: stall.id,
            name: stall.name,
            image_url: stall.imageUrl ?? null,
            hawkerCentre: stall.subtitle
              ? {
                  name: stall.subtitle,
                }
              : null,
          })),
          dishes: results.dishes.map((dish) => ({
            id: dish.id,
            stallId: dish.stallId ?? null,
            name: dish.name,
            imageUrl: dish.imageUrl ?? null,
          })),
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'list_stalls',
      description:
        'List stalls for browsing when the user has no specific search query.',
      schema: stallListSchema,
      handler: async ({ limit }) => {
        const stalls = await stallsService.getAll(limit ?? undefined);
        return stalls.map((stall) => ({
          id: stall.id,
          ownerId: stall.ownerId ?? null,
          name: stall.name,
          description: stall.description ?? null,
          location: stall.location ?? null,
          cuisineType: stall.cuisineType ?? null,
          tags: stall.tags ?? [],
          dietaryTags: stall.dietaryTags ?? [],
          image_url: stall.image_url ?? null,
          hawkerCentreId: stall.hawkerCentreId ?? null,
          createdAt: stall.createdAt,
          updatedAt: stall.updatedAt,
        }));
      },
    },
    context
  ),
  createTool(
    {
      name: 'list_hawker_centres',
      description: 'List hawker centres for browsing.',
      schema: hawkerListSchema,
      handler: async ({ limit }) => {
        const centres = await hawkerCentresService.getAllHawkerCentres(
          limit ?? undefined
        );
        return centres.map((centre) => ({
          id: centre.id,
          name: centre.name,
          slug: centre.slug,
          address: centre.address ?? null,
          postalCode: centre.postalCode ?? null,
          imageUrl: centre.imageUrl ?? null,
        }));
      },
    },
    context
  ),
  createTool(
    {
      name: 'get_hawker_info',
      description: 'Fetch a hawker centre record by id.',
      schema: hawkerSchema,
      handler: async ({ hawkerId }) => {
        const resolvedId = await resolveHawkerId(hawkerId);
        if (!resolvedId) {
          throw new Error('Hawker centre not found.');
        }
        const info = await hawkerCentresService.getHawkerInfoById(resolvedId);
        if (!info) {
          return null;
        }
        return {
          id: info.id,
          name: info.name,
          slug: info.slug,
          address: info.address ?? null,
          postalCode: info.postalCode ?? null,
          latitude: info.latitude,
          longitude: info.longitude,
          imageUrl: info.imageUrl ?? null,
          createdAt: info.createdAt,
          updatedAt: info.updatedAt,
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'get_hawker_stalls',
      description: 'List stalls for a hawker centre.',
      schema: hawkerSchema,
      handler: async ({ hawkerId }) => {
        const resolvedId = await resolveHawkerId(hawkerId);
        if (!resolvedId) {
          throw new Error('Hawker centre not found.');
        }
        const stalls = await hawkerCentresService.getHawkerStallsById(resolvedId);
        return stalls.map((stall) => ({
          id: stall.id,
          ownerId: stall.ownerId ?? null,
          name: stall.name,
          description: stall.description ?? null,
          location: stall.location ?? null,
          cuisineType: stall.cuisineType ?? null,
          tags: stall.tags ?? [],
          dietaryTags: stall.dietaryTags ?? [],
          image_url: stall.image_url ?? null,
          hawkerCentreId: stall.hawkerCentreId ?? null,
          createdAt: stall.createdAt,
          updatedAt: stall.updatedAt,
        }));
      },
    },
    context
  ),
  createTool(
    {
      name: 'get_hawker_dishes',
      description: 'List dishes for a hawker centre.',
      schema: hawkerSchema,
      handler: async ({ hawkerId }) => {
        const resolvedId = await resolveHawkerId(hawkerId);
        if (!resolvedId) {
          throw new Error('Hawker centre not found.');
        }
        const dishes = await hawkerCentresService.getHawkerDishesById(resolvedId);
        return dishes.map((dish) => ({
          id: dish.id,
          stallId: dish.stallId,
          name: dish.name,
          description: dish.description ?? null,
          priceCents: dish.priceCents,
          category: dish.category ?? null,
          prepTimeMins: dish.prepTimeMins ?? null,
          isActive: dish.isActive,
          imageUrl: resolveMenuItemImage(dish),
          createdAt: dish.createdAt,
          updatedAt: dish.updatedAt,
          mediaUploads: mapUploads(dish.mediaUploads),
          menuItemTagAggs: mapMenuItemTagAggs(dish.menuItemTagAggs),
        }));
      },
    },
    context
  ),
  createTool(
    {
      name: 'get_stall_details',
      description: 'Fetch a stall and its active menu items.',
      schema: stallSchema,
      handler: async ({ stallId }) => {
        const resolvedId = await resolveStallId(stallId);
        if (!resolvedId) {
          throw new Error('Stall not found.');
        }
        const stall = await stallsService.getById(resolvedId);
        if (!stall) {
          return null;
        }
        return {
          id: stall.id,
          ownerId: stall.ownerId ?? null,
          name: stall.name,
          description: stall.description ?? null,
          location: stall.location ?? null,
          cuisineType: stall.cuisineType ?? null,
          tags: stall.tags ?? [],
          dietaryTags: stall.dietaryTags ?? [],
          image_url: stall.image_url ?? null,
          hawkerCentreId: stall.hawkerCentreId ?? null,
          createdAt: stall.createdAt,
          updatedAt: stall.updatedAt,
          owner: stall.owner
            ? {
                id: stall.owner.id,
                displayName: stall.owner.displayName,
              }
            : null,
          menuItems: (stall.menuItems ?? []).map((item) => ({
            id: item.id,
            stallId: item.stallId,
            name: item.name,
            description: item.description ?? null,
            priceCents: item.priceCents,
            category: item.category ?? null,
            prepTimeMins: item.prepTimeMins ?? null,
            isActive: item.isActive,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            imageUrl: resolveMenuItemImage(item),
            mediaUploads: mapUploads(item.mediaUploads),
            menuItemTagAggs: mapMenuItemTagAggs(item.menuItemTagAggs),
          })),
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'get_stall_gallery',
      description: 'Fetch approved community uploads for a stall.',
      schema: stallSchema,
      handler: async ({ stallId }) => {
        const resolvedId = await resolveStallId(stallId);
        if (!resolvedId) {
          throw new Error('Stall not found.');
        }
        const uploads = await stallsService.getApprovedMediaByStallId(resolvedId);
        return uploads.map((upload) => ({
          id: upload.id,
          menuItemId: upload.menuItemId,
          userId: upload.userId,
          imageUrl: upload.imageUrl,
          caption: upload.caption ?? null,
          validationStatus: upload.validationStatus,
          reviewedAt: upload.reviewedAt ?? null,
          reviewedBy: upload.reviewedBy ?? null,
          upvoteCount: upload.upvoteCount,
          downvoteCount: upload.downvoteCount,
          voteScore: upload.voteScore,
          createdAt: upload.createdAt,
          updatedAt: upload.updatedAt,
          aspectRatio: upload.aspectRatio ?? null,
          menuItem: upload.menuItem
            ? {
                id: upload.menuItem.id,
                name: upload.menuItem.name,
                stallId: upload.menuItem.stallId,
              }
            : null,
          user: upload.user
            ? {
                id: upload.user.id,
                displayName: upload.user.displayName,
                username: upload.user.username,
              }
            : null,
        }));
      },
    },
    context
  ),
  createTool(
    {
      name: 'get_top_voted_menu_items',
      description: 'Fetch top-voted menu items across stalls.',
      schema: menuListSchema,
      handler: async ({ limit }) => {
        const items = await menuService.getTopVotedMenuItems(limit);
        return items.map((item) => ({
          id: item.id,
          name: item.name,
          priceCents: item.priceCents,
          imageUrl: item.imageUrl ?? null,
          stall: item.stallId || item.stallName
            ? {
                id: item.stallId ?? null,
                name: item.stallName ?? null,
              }
            : null,
        }));
      },
    },
    context
  ),
  createTool(
    {
      name: 'get_featured_menu_items_by_cuisine',
      description: 'Fetch featured menu items grouped by cuisine.',
      schema: featuredSchema,
      handler: async ({ minUpvotes, cuisines }) => {
        const featured = await menuService.getFeaturedMenuItemsByCuisine({
          minUpvotes,
          cuisines,
        });
        return Object.entries(featured.items).map(([cuisineType, item]) => {
          if (!item) {
            return {
              cuisineType,
              menuItem: null,
              stall: null,
            };
          }
          return {
            cuisineType,
            menuItem: {
              id: item.id,
              name: item.name,
              priceCents: item.priceCents ?? null,
              imageUrl: item.imageUrl ?? null,
            },
            stall: {
              id: item.stallId ?? null,
              name: item.stallName ?? null,
              cuisineType: item.cuisine ?? null,
              location: item.stallLocation ?? null,
            },
          };
        });
      },
    },
    context
  ),
];
