-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "invitesRewarded" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

