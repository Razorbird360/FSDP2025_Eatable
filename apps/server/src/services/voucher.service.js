import { cartService } from './cart.service.js';
import prisma from '../lib/prisma.js';

class VoucherService {
  getEffectiveExpiry(userVoucher) {
    if (!userVoucher) return null;
    if (userVoucher.expiryDate) return userVoucher.expiryDate;

    const voucher = userVoucher.voucher;
    if (voucher?.expiryDate) return voucher.expiryDate;

    if (voucher?.expiryOnReceiveMonths && userVoucher.createdAt) {
      const expiry = new Date(userVoucher.createdAt);
      expiry.setMonth(expiry.getMonth() + voucher.expiryOnReceiveMonths);
      return expiry;
    }

    return null;
  }

  async getUserVouchers(userId) {
    try {
      const userVouchers = await prisma.userVoucher.findMany({
        where: {
          userId: userId,
        },
        include: {
          voucher: true,
        },
      });

      const now = new Date();

      // Flatten the structure to return a list of vouchers with usage info and expiry status
      return userVouchers
        .map(uv => {
          const expiryDate = this.getEffectiveExpiry(uv);
          const isExpired = expiryDate ? new Date(expiryDate) < now : false;

          return {
            ...uv.voucher,
            userVoucherId: uv.id,
            isUsed: uv.isUsed,
            used: uv.isUsed, // Add 'used' field for frontend compatibility
            expiryDate: expiryDate, // Prefer UserVoucher expiry, fallback to voucher
            isExpired: isExpired, // Calculated on backend based on server time
            acquiredAt: uv.createdAt
          };
        })
        .filter(voucher => !voucher.isExpired);
    } catch (error) {
      throw new Error(`Error fetching user vouchers: ${error.message}`);
    }
  }

  async getPendingVoucher(userId) {
    try {
      const pending = await prisma.discounts_charges.findFirst({
        where: {
          userId,
          type: 'voucher',
          orderId: null,
        },
        include: {
          userVoucher: {
            include: { voucher: true },
          },
        },
      });

      const userVoucher = pending?.userVoucher;
      if (!pending || !userVoucher) {
        return null;
      }

      const expiryDate = this.getEffectiveExpiry(userVoucher);
      const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
      if (userVoucher.userId !== userId || userVoucher.isUsed || isExpired) {
        await prisma.discounts_charges.delete({ where: { id: pending.id } });
        return null;
      }

      const cart = await cartService.getCartByUserId(userId);
      const subtotalCents = Array.isArray(cart)
        ? cart.reduce((sum, item) => {
            const price = item.menu_items?.priceCents || 0;
            const qty = item.qty || 1;
            return sum + price * qty;
          }, 0)
        : 0;

      let discountAmountCents = 0;
      let ineligibleReason = null;
      const voucher = userVoucher.voucher;

      if (!cart || cart.length === 0) {
        ineligibleReason = "Cart is empty";
      } else if (subtotalCents < voucher.minSpend) {
        ineligibleReason = `Minimum spend of $${(voucher.minSpend / 100).toFixed(2)} not met`;
      } else {
        if (voucher.discountType === 'percentage') {
          discountAmountCents = Math.round(
            subtotalCents * (voucher.discountAmount / 100)
          );
        } else {
          discountAmountCents = voucher.discountAmount;
        }

        if (discountAmountCents > subtotalCents) {
          discountAmountCents = subtotalCents;
        }
      }

      return {
        ...voucher,
        userVoucherId: userVoucher.id,
        isUsed: userVoucher.isUsed,
        used: userVoucher.isUsed,
        expiryDate,
        isExpired,
        acquiredAt: userVoucher.createdAt,
        discountAmountCents,
        ineligibleReason,
      };
    } catch (error) {
      throw new Error(`Error fetching pending voucher: ${error.message}`);
    }
  }

  async clearPendingVoucher(userId) {
    try {
      const result = await prisma.discounts_charges.deleteMany({
        where: {
          userId,
          type: 'voucher',
          orderId: null,
        },
      });

      return { cleared: result.count };
    } catch (error) {
      throw new Error(`Error clearing pending voucher: ${error.message}`);
    }
  }

  async applyVoucher(userId, voucherId) {
    try {
      // 1. Get user's cart to calculate subtotal
      const cart = await cartService.getCartByUserId(userId);
      if (!cart || cart.length === 0) {
        throw new Error("Cart is empty");
      }

      const subtotalCents = cart.reduce((sum, item) => {
        const price = item.menu_items.priceCents || 0;
        const qty = item.qty || 1;
        return sum + price * qty;
      }, 0);

      // 2. Get voucher details
      // Check if it's a UserVoucher ID or ExistingVoucher ID. 
      // The frontend passes the UserVoucher object, but let's assume voucherId is the UserVoucher ID.
      const userVoucher = await prisma.userVoucher.findUnique({
        where: { id: voucherId },
        include: { voucher: true },
      });

      if (!userVoucher) {
        throw new Error("Voucher not found");
      }

      if (userVoucher.userId !== userId) {
        throw new Error("Voucher does not belong to user");
      }

      if (userVoucher.isUsed) {
        throw new Error("Voucher already used");
      }

      const voucher = userVoucher.voucher;
      const expiryDate = this.getEffectiveExpiry(userVoucher);
      if (expiryDate && new Date(expiryDate) < new Date()) {
        throw new Error("Voucher expired");
      }

      // 3. Validate min spend
      if (subtotalCents < voucher.minSpend) {
        throw new Error(`Minimum spend of $${(voucher.minSpend / 100).toFixed(2)} not met`);
      }

      // 4. Calculate discount
      let discountAmount = 0;
      if (voucher.discountType === 'percentage') {
        discountAmount = Math.round(subtotalCents * (voucher.discountAmount / 100));
      } else {
        discountAmount = voucher.discountAmount;
      }

      // Cap discount at subtotal
      if (discountAmount > subtotalCents) {
        discountAmount = subtotalCents;
      }

      // 5. Update discounts_charges
      // Remove any existing voucher discount for this user (pending order)
      await prisma.discounts_charges.deleteMany({
        where: {
          userId: userId,
          type: 'voucher',
          orderId: null, // Only pending ones
        },
      });

      // Create new discount record
      const discount = await prisma.discounts_charges.create({
        data: {
          userId: userId,
          type: 'voucher',
          amountCents: discountAmount,
          userVoucherId: voucherId, // Store the UserVoucher ID
          // orderId is null initially
        },
      });

      return {
        success: true,
        discountAmount: discountAmount,
        voucherCode: voucher.code,
        message: "Voucher applied successfully",
      };

    } catch (error) {
      throw new Error(`Error applying voucher: ${error.message}`);
    }
  }
}

export default new VoucherService();
