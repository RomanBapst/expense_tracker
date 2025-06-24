-- CreateTable
CREATE TABLE "QuickBooksToken" (
    "id" SERIAL NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'bearer',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "realmId" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickBooksToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuickBooksToken_realmId_key" ON "QuickBooksToken"("realmId"); 