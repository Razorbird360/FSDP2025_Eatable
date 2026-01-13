-- AlterTable
ALTER TABLE "user_monthly_budgets" ADD COLUMN     "alerted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifiedAlready" BOOLEAN NOT NULL DEFAULT false;
