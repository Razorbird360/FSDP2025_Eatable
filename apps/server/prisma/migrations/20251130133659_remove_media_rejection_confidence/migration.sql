/*
  Warnings:

  - You are about to drop the column `ai_confidence_score` on the `media_uploads` table. All the data in the column will be lost.
  - You are about to drop the column `rejection_reason` on the `media_uploads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "media_uploads" DROP COLUMN "ai_confidence_score",
DROP COLUMN "rejection_reason";
