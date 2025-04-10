import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MIGRATION_NAME = 'migrate_receipts_once';

async function migrateReceipts() {
  const alreadyRun = await prisma.migration.findUnique({
    where: { name: MIGRATION_NAME }
  });

  if (alreadyRun) {
    console.log('Migration already completed. Skipping...');
    return;
  }

  const expenses = await prisma.expense.findMany({
    where: {
      NOT: {
        receiptPath: null
      }
    }
  });

  for (const expense of expenses) {
    if (expense.receiptFilename && expense.receiptPath) {
      await prisma.receipt.create({
        data: {
          filename: expense.receiptFilename,
          path: expense.receiptPath,
          expense: { connect: { id: expense.id } }
        }
      });
      console.log(`Migrated receipt for expense ${expense.id}`);
    }
  }

  await prisma.migration.create({
    data: { name: MIGRATION_NAME }
  });

  console.log('Migration completed.');
}

migrateReceipts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
