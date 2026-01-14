-- AlterTable
ALTER TABLE "existing_vouchers" ADD COLUMN     "expiry_date" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "user_vouchers" ADD COLUMN     "expiry_date" TIMESTAMPTZ(6);
