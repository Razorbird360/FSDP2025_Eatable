-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "is_prepared" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "accepted_at" TIMESTAMPTZ(6),
ADD COLUMN     "collected_at" TIMESTAMPTZ(6),
ADD COLUMN     "estimated_minutes" INTEGER,
ADD COLUMN     "pickup_token_hash" TEXT,
ADD COLUMN     "pickup_token_used_at" TIMESTAMPTZ(6),
ADD COLUMN     "ready_at" TIMESTAMPTZ(6);
