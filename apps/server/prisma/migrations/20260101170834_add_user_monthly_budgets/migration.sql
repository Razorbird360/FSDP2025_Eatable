-- CreateTable
CREATE TABLE "user_monthly_budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "budget_cents" INTEGER NOT NULL,
    "alert_at_percent" INTEGER NOT NULL DEFAULT 80,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_monthly_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_monthly_budgets_user_id_year_month_key" ON "user_monthly_budgets"("user_id", "year", "month");

-- AddForeignKey
ALTER TABLE "user_monthly_budgets" ADD CONSTRAINT "user_monthly_budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
