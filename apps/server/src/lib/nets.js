/**
 * NETS Payment Gateway Service
 * TODO: Implement NETS QR payment integration
 * - generateQR(amountCents, orderId)
 * - checkPaymentStatus(transactionId)
 */

export const netsService = {
  async generateQR(_amountCents, _orderId) {
    // TODO: Integrate with NETS API
    throw new Error('NETS integration not implemented');
  },

  async checkPaymentStatus(_transactionId) {
    // TODO: Check NETS payment status
    throw new Error('NETS integration not implemented');
  },
};

export default netsService;
