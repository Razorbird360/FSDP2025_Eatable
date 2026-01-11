-- AlterTable
ALTER TABLE "stalls" ADD COLUMN     "dietary_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
