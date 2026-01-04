/*
  Warnings:

  - A unique constraint covering the columns `[stall_id,order_code]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "order_code" CHAR(4);

-- CreateIndex
CREATE UNIQUE INDEX "orders_stall_id_order_code_key" ON "orders"("stall_id", "order_code");
