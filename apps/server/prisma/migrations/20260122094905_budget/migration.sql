-- AlterTable
ALTER TABLE "user_monthly_budgets" ADD COLUMN     "notifiedLimitAlready" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifiedThresholdAlready" BOOLEAN NOT NULL DEFAULT false;
