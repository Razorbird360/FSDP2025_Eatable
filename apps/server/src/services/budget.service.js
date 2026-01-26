import prisma from "../lib/prisma.js";

export const budgetService = {
  async getMonthlyBudget(userId, year, month) {
    const budget = await prisma.userMonthlyBudget.findFirst({
      where: { userId, year, month },
    });

    if (budget) return budget;

    // auto create default row when missing
    return prisma.userMonthlyBudget.create({
      data: {
        userId,
        year,
        month,
        budgetCents: 200000, // $2000 default
        alertAtPercent: 80,
        notifiedThresholdAlready: false,
        notifiedLimitAlready: false,
      },
    });
  },

  async upsertMonthlyBudget(userId, year, month, budgetCents, alertAtPercent) {
    const existing = await prisma.userMonthlyBudget.findFirst({
      where: { userId, year, month },
    });

    if (existing) {
      const budgetChanged = existing.budgetCents !== budgetCents;
      const alertChanged = existing.alertAtPercent !== alertAtPercent;

      const shouldReset = budgetChanged || alertChanged;

      return prisma.userMonthlyBudget.update({
        where: { id: existing.id },
        data: {
          budgetCents,
          alertAtPercent,
          ...(shouldReset
            ? {
                notifiedThresholdAlready: false,
                notifiedLimitAlready: false,
              }
            : {}),
        },
      });
    }

    return prisma.userMonthlyBudget.create({
      data: {
        userId,
        year,
        month,
        budgetCents,
        alertAtPercent,
        notifiedThresholdAlready: false,
        notifiedLimitAlready: false,
      },
    });
  },

  // level: "threshold" | "limit"
  async setNotifiedLevel(userId, year, month, level) {
    const existing = await prisma.userMonthlyBudget.findFirst({
      where: { userId, year, month },
    });

    if (!existing) return null;

    const data =
      level === "limit"
        ? { notifiedLimitAlready: true }
        : { notifiedThresholdAlready: true };

    return prisma.userMonthlyBudget.update({
      where: { id: existing.id },
      data,
    });
  },
};
