-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "accountId" INTEGER;

-- CreateTable
CREATE TABLE "ExpenseAccount" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "refundUserId" INTEGER,

    CONSTRAINT "ExpenseAccount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ExpenseAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAccount" ADD CONSTRAINT "ExpenseAccount_refundUserId_fkey" FOREIGN KEY ("refundUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
