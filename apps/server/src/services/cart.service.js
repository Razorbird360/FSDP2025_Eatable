import prisma from '../lib/prisma.js';
import { cartAdditions } from '../monitoring/metrics.js';


export const cartService = {
    async getCartByUserId(userId) {
    return prisma.user_cart.findMany({
        where: { userid: userId },
        include: {
        menu_items: {
            include: {
            mediaUploads: {
                orderBy: { upvoteCount: "desc" },
                take: 1,
            },
            stall: true,
            },
        },
        },
    });
    },

    // cartService.js
    async addItemToCart({ userId, itemId, request, qty }) {
    return prisma.$transaction(async (tx) => {
        // 1) Get stall of the item being added
        const menuItem = await tx.menuItem.findUnique({
        where: { id: itemId },
        select: { stallId: true },
        });

        if (!menuItem) {
        throw new Error("Menu item not found");
        }

        // 2) Load existing cart with stall info
        const existingItems = await tx.user_cart.findMany({
        where: { userid: userId },
        include: {
            menu_items: {
            select: {
                stallId: true,
                name: true,
            },
            },
        },
        });

        let cleared = false;
        let clearedItems = [];

        if (existingItems.length > 0) {
        // we assume all items in cart are from the same stall if our rule is enforced
        const existingStallId = existingItems[0].menu_items?.stallId || null;

        if (existingStallId && existingStallId !== menuItem.stallId) {
            // 3) Different stall → clear this user's cart in DB
            clearedItems = existingItems.map(item => ({
            id: item.id,
            name: item.menu_items?.name,
            qty: item.qty,
            stallId: existingStallId,
            }));
            await tx.user_cart.deleteMany({
            where: { userid: userId },
            });
            cleared = true;
        }
        }

        // 4) After possible clear, check if same item+request already exists
        const existingSameLine = await tx.user_cart.findFirst({
        where: {
            userid: userId,
            itemid: itemId,
            request,          // same special instructions
        },
        });

        let cartItem;
        let merged = false;

        if (existingSameLine) {
        // 🔁 Merge: increment qty instead of creating a new row
        cartItem = await tx.user_cart.update({
            where: { id: existingSameLine.id },
            data: {
            qty: existingSameLine.qty + qty,
            },
        });
        merged = true;
        } else {
        // 🆕 Create new row
        cartItem = await tx.user_cart.create({
            data: {
            userid: userId,
            itemid: itemId,
            request,
            qty,
            },
        });
        }

        // Track cart addition metric
        cartAdditions.labels(menuItem.stallId).inc(qty);

        // 5) Return extra info if useful for FE
        return {
        cleared,   // true if we cleared a previous stall's items
        clearedItems,  // items that were removed from cart
        merged,    // true if we merged into an existing row
        cartItem,
        };
    });
    },



    async updateCartItem({ cartId, request, qty }) {
        const existingItem = await prisma.user_cart.findUnique({
            where: { id: cartId },
        });
        if (!existingItem) {
            return { success: false, message: 'Cart item not found' };
        }
        const updatedItem = await prisma.user_cart.update({
            where: { id: cartId },
            data: { request, qty },
        });
        return { success: true, data: updatedItem };
    },

    async removeItemFromCart({ cartId }) {
        const existingItem = await prisma.user_cart.findUnique({
            where: { id: cartId },
        });

        if (!existingItem) {
            return { success: false, message: 'Cart item not found' };
        }

        await prisma.user_cart.delete({
            where: { id: cartId },
        });
        return { success: true };
    },

    async clearCart({ userId }) {
        await prisma.user_cart.deleteMany({
            where: { userid: userId },
        });
        return { success: true };
    }
};
