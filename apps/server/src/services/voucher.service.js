import { PrismaClient } from '@prisma/client';
import { cartService } from './cart.service.js';

const prisma = new PrismaClient();

class VoucherService {
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
      return userVouchers.map(uv => {
        const expiryDate = uv.expiryDate || uv.voucher.expiryDate;
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
      });
    } catch (error) {
      throw new Error(`Error fetching user vouchers: ${error.message}`);
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
