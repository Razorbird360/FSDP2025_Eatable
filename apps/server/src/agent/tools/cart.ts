import { z } from 'zod';
import { cartService } from '../../services/cart.service.js';
import { createTool, ToolContext } from './tool-base.js';

const cartIdSchema = z.object({
  cartId: z.string().min(1),
});

const addItemSchema = z.object({
  itemId: z.string().min(1).optional(),
  menuItemId: z.string().min(1).optional(),
  dishId: z.string().min(1).optional(),
  id: z.string().min(1).optional(),
  qty: z.coerce.number().int().min(1).max(99).optional().default(1),
  request: z.string().max(500).optional(),
});

const updateItemSchema = cartIdSchema.extend({
  qty: z.number().int().min(1).max(99),
  request: z.string().max(500).optional(),
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

const mapCart = (rows = []) =>
  rows.map((row) => ({
    id: row.id,
    itemId: row.itemid ?? null,
    quantity: row.qty ?? null,
    request: row.request ?? null,
    createdAt: row.created_at,
    menuItem: row.menu_items
      ? {
          id: row.menu_items.id,
          stallId: row.menu_items.stallId,
          name: row.menu_items.name,
          description: row.menu_items.description ?? null,
          priceCents: row.menu_items.priceCents,
          category: row.menu_items.category ?? null,
          prepTimeMins: row.menu_items.prepTimeMins ?? null,
          isActive: row.menu_items.isActive,
          imageUrl: row.menu_items.imageUrl ?? null,
          mediaUploads: mapUploads(row.menu_items.mediaUploads ?? []),
          stall: row.menu_items.stall
            ? {
                id: row.menu_items.stall.id,
                name: row.menu_items.stall.name,
                location: row.menu_items.stall.location ?? null,
                cuisineType: row.menu_items.stall.cuisineType ?? null,
              }
            : null,
        }
      : null,
  }));

const fetchCart = async (userId) => {
  const cart = await cartService.getCartByUserId(userId);
  return mapCart(cart ?? []);
};

export const createCartTools = (context: ToolContext) => [
  createTool(
    {
      name: 'get_cart',
      description: 'Fetch the current user cart and items.',
      schema: z.object({}).strict(),
      handler: async () => {
        return {
          cart: await fetchCart(context.userId),
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'add_to_cart',
      description: 'Add a menu item to the cart for PURCHASE. Use this tool ONLY when the user explicitly wants to ORDER, BUY, or ADD TO CART. If the user wants to VIEW or BROWSE a dish, use get_menu_item_details instead.',
      schema: addItemSchema,
      handler: async ({ itemId, menuItemId, dishId, id, qty, request }) => {
        const resolvedItemId = itemId ?? menuItemId ?? dishId ?? id;
        if (!resolvedItemId) {
          throw new Error('Missing menu item id for cart add.');
        }
        const result = await cartService.addItemToCart({
          userId: context.userId,
          itemId: resolvedItemId,
          qty,
          request,
        });

        return {
          cart: await fetchCart(context.userId),
          meta: {
            cleared: Boolean(result?.cleared),
            merged: Boolean(result?.merged),
            cartItemId: result?.cartItem?.id ?? null,
          },
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'update_cart_item',
      description: 'Update quantity or request for a cart item.',
      schema: updateItemSchema,
      handler: async ({ cartId, qty, request }) => {
        const result = await cartService.updateCartItem({ cartId, qty, request });
        if (!result?.success) {
          throw new Error(result?.message ?? 'Cart update failed');
        }
        return {
          cart: await fetchCart(context.userId),
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'remove_cart_item',
      description: 'Remove a cart item by id.',
      schema: cartIdSchema,
      handler: async ({ cartId }) => {
        const result = await cartService.removeItemFromCart({ cartId });
        if (!result?.success) {
          throw new Error(result?.message ?? 'Cart remove failed');
        }
        return {
          cart: await fetchCart(context.userId),
        };
      },
    },
    context
  ),
  createTool(
    {
      name: 'clear_cart',
      description: 'Clear all cart items for the current user.',
      schema: z.object({}).strict(),
      handler: async () => {
        const result = await cartService.clearCart({ userId: context.userId });
        if (!result?.success) {
          throw new Error(result?.message ?? 'Cart clear failed');
        }
        return {
          cart: await fetchCart(context.userId),
        };
      },
    },
    context
  ),
];
