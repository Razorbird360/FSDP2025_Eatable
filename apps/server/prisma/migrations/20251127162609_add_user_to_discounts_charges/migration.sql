-- AlterTable
ALTER TABLE "discounts_charges" ADD COLUMN     "user_id" UUID;

-- AddForeignKey
ALTER TABLE "discounts_charges" ADD CONSTRAINT "discounts_charges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
