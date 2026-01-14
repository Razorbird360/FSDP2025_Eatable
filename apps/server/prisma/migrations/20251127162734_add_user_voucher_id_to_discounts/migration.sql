-- AlterTable
ALTER TABLE "discounts_charges" ADD COLUMN     "user_voucher_id" UUID;

-- AddForeignKey
ALTER TABLE "discounts_charges" ADD CONSTRAINT "discounts_charges_user_voucher_id_fkey" FOREIGN KEY ("user_voucher_id") REFERENCES "user_vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
