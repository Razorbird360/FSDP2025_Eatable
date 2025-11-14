/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- ALTER TABLE "users" ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
-- CREATE UNIQUE INDEX "users_username_key" ON "users"("username");


ALTER TABLE "users" ADD COLUMN     "username" TEXT;

UPDATE "users"
SET "username" = lower(split_part("email", '@', 1))
WHERE "username" IS NULL;

ALTER TABLE "users"
  ALTER COLUMN "username" SET NOT NULL,
  ADD CONSTRAINT "users_username_key" UNIQUE ("username");