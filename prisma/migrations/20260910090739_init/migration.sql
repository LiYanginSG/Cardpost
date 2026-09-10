-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('sealed', 'wandering');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('pooled', 'in_transit', 'delivered', 'frozen');

-- CreateEnum
CREATE TYPE "FriendStatus" AS ENUM ('pending', 'accepted');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "handle" TEXT,
    "displayName" TEXT,
    "city" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "openToWandering" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnArrival" BOOLEAN NOT NULL DEFAULT true,
    "postage" INTEGER NOT NULL DEFAULT 24,
    "ownedDesigns" TEXT[] DEFAULT ARRAY['classic']::TEXT[],
    "ownedStamps" TEXT[] DEFAULT ARRAY['house']::TEXT[],
    "activeDesign" TEXT NOT NULL DEFAULT 'classic',
    "activeStamp" TEXT NOT NULL DEFAULT 'house',
    "postageGrantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "status" "FriendStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "type" "CardType" NOT NULL,
    "title" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "stampId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderCity" TEXT NOT NULL,
    "recipientId" TEXT,
    "recipientCity" TEXT,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivesAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "distanceKm" INTEGER NOT NULL DEFAULT 0,
    "status" "CardStatus" NOT NULL DEFAULT 'in_transit',
    "notifiedAt" TIMESTAMP(3),
    "hopCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WanderingHop" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WanderingHop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "postage" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LoginToken_tokenHash_key" ON "LoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LoginToken_email_idx" ON "LoginToken"("email");

-- CreateIndex
CREATE INDEX "Friendship_friendId_idx" ON "Friendship"("friendId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userId_friendId_key" ON "Friendship"("userId", "friendId");

-- CreateIndex
CREATE INDEX "Card_recipientId_arrivesAt_idx" ON "Card"("recipientId", "arrivesAt");

-- CreateIndex
CREATE INDEX "Card_senderId_idx" ON "Card"("senderId");

-- CreateIndex
CREATE INDEX "Card_type_status_idx" ON "Card"("type", "status");

-- CreateIndex
CREATE INDEX "WanderingHop_holderId_idx" ON "WanderingHop"("holderId");

-- CreateIndex
CREATE UNIQUE INDEX "WanderingHop_cardId_order_key" ON "WanderingHop"("cardId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_sessionId_key" ON "Purchase"("sessionId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WanderingHop" ADD CONSTRAINT "WanderingHop_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WanderingHop" ADD CONSTRAINT "WanderingHop_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
