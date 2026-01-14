import voucherService from '../services/voucher.service.js';

class VoucherController {
    async getUserVouchers(req, res) {
        try {
            const userId = req.user.id; // Assuming auth middleware populates req.user
            const vouchers = await voucherService.getUserVouchers(userId);
            res.json(vouchers);
        } catch (error) {
            console.error('Error in getUserVouchers:', error);
            res.status(500).json({ error: 'Failed to fetch vouchers' });
        }
    }

    async applyVoucher(req, res) {
        try {
            const userId = req.user.id;
            const { voucherId } = req.params;

            if (!voucherId) {
                return res.status(400).json({ error: 'Voucher ID is required' });
            }

            const result = await voucherService.applyVoucher(userId, voucherId);
            res.json(result);
        } catch (error) {
            console.error('Error in applyVoucher:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async getPendingVoucher(req, res) {
        try {
            const userId = req.user.id;
            const voucher = await voucherService.getPendingVoucher(userId);
            res.json({ voucher });
        } catch (error) {
            console.error('Error in getPendingVoucher:', error);
            res.status(500).json({ error: 'Failed to fetch pending voucher' });
        }
    }

    async clearPendingVoucher(req, res) {
        try {
            const userId = req.user.id;
            const result = await voucherService.clearPendingVoucher(userId);
            res.json(result);
        } catch (error) {
            console.error('Error in clearPendingVoucher:', error);
            res.status(500).json({ error: 'Failed to clear pending voucher' });
        }
    }
}

export default new VoucherController();
