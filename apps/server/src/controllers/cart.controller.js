import { cartService } from '../services/cart.service.js';

export const cartController = {
  async getCart(req, res) {
    try {
    const userid = req.user.id;
      const cart = await cartService.getCartByUserId(userid);
        res.status(200).json(cart);
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: 'Failed to load cart' });
    }   
    },

    async addItemToCart(req, res) {
        try {
            const userId = req.user.id;
            const { itemId, request, qty } = req.body;
            const result = await cartService.addItemToCart({ userId, itemId, request, qty });
            res.status(200).json({ message: 'Item added to cart', data: result.data });
        }
        catch (error) {
            console.error('Add to cart error:', error);
            res.status(500).json({ error: 'Failed to add item to cart' });
        }
    },

    async updateCartItem(req, res) {
        try {
            const { cartId, request, qty } = req.body;
            const result = await cartService.updateCartItem({ cartId, request, qty });
            if (!result.success) {
                return res.status(400).json({ error: result.message });
            }
            res.status(200).json({ message: 'Cart item updated' });
        } catch (error) {
            console.error('Update cart item error:', error);
            res.status(500).json({ error: 'Failed to update cart item' });
        }
    },

    async removeItemFromCart(req, res) {
        try {
            const { cartId } = req.body;
            const result = await cartService.removeItemFromCart({ cartId });
            if (!result.success) {
                return res.status(400).json({ error: result.message });
            }
            res.status(200).json({ message: 'Cart item removed' });
        } catch (error) {
            console.error('Remove cart item error:', error);
            res.status(500).json({ error: 'Failed to remove cart item' });
        }       

    },

    async clearCart(req, res) { 
        try {
            const userId = req.user.id;
            const result = await cartService.clearCart({ userId });
            if (!result.success) {
                return res.status(400).json({ error: result.message });
            }
            res.status(200).json({ message: 'Cart cleared' });
        } catch (error) {
            console.error('Clear cart error:', error);
            res.status(500).json({ error: 'Failed to clear cart' });
        }       

    },
};

