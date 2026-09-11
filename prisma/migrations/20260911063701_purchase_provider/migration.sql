-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "productId" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'stripe';

