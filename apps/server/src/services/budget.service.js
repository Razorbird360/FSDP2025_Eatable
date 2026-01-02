import prisma from '../lib/prisma.js';

export const budgetService = {
  async getMonthlyBudget(userId, year, month) {
    const budget = await prisma.userMonthlyBudget.findFirst({
      where: { userId, year, month }
    });

    if (budget) return budget;

    // auto create default row when missing
    return prisma.userMonthlyBudget.create({
      data: {
        userId,
        year,
        month,
        budgetCents: 200000, // $2000 default
        alertAtPercent: 80
      }
    });
  },

  async upsertMonthlyBudget(userId, year, month, budgetCents, alertAtPercent) {
    const existing = await prisma.userMonthlyBudget.findFirst({
      where: { userId, year, month }
    });

    if (existing) {
      // Check if budget or alert percent changed
      const budgetChanged = existing.budgetCents !== budgetCents;
      const alertChanged = existing.alertAtPercent !== alertAtPercent;
      
      // If settings changed, reset notification status to allow new alerts
      const shouldResetNotification = budgetChanged || alertChanged;

      return prisma.userMonthlyBudget.update({
        where: { id: existing.id },
        data: {
          budgetCents,
          alertAtPercent,
          ...(shouldResetNotification ? { notifiedAlready: false } : {})
        }
      });
    }

    return prisma.userMonthlyBudget.create({
      data: {
        userId,
        year,
        month,
        budgetCents,
        alertAtPercent,
        notifiedAlready: false
      }
    });
  },

  async setNotified(userId, year, month) {
    const existing = await prisma.userMonthlyBudget.findFirst({
      where: { userId, year, month }
    });

    if (!existing) return null;

    return prisma.userMonthlyBudget.update({
      where: { id: existing.id },
      data: { notifiedAlready: true }
    });
  },

};
