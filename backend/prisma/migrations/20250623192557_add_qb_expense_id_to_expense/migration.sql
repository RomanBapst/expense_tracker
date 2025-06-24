-- Add qbExpenseId column to Expense table for QuickBooks integration
ALTER TABLE "Expense" ADD COLUMN "qbExpenseId" TEXT; 