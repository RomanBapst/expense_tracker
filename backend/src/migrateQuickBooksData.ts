import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MIGRATION_NAME = 'migrate_quickbooks_data_once';

async function migrateQuickBooksData() {
  const alreadyRun = await prisma.migration.findUnique({
    where: { name: MIGRATION_NAME }
  });

  if (alreadyRun) {
    console.log('QuickBooks data migration already completed. Skipping...');
    return;
  }

  // Find all expenses that have been synced to QuickBooks
  const syncedExpenses = await prisma.expense.findMany({
    where: {
      OR: [
        { qbExpenseId: { not: null } },
        { qbQbId: { not: null } }
      ]
    },
    select: {
      id: true,
      qbExpenseId: true,
      qbQbId: true,
      qbEntityType: true
    }
  });

  console.log(`Found ${syncedExpenses.length} synced expenses to migrate`);

  for (const expense of syncedExpenses) {
    try {
      // For expenses that have qbExpenseId but are missing qbQbId or qbEntityType
      if (expense.qbExpenseId && (!expense.qbQbId || !expense.qbEntityType)) {
        await prisma.expense.update({
          where: { id: expense.id },
          data: {
            qbQbId: expense.qbExpenseId,
            qbEntityType: 'Expense'
          }
        });
        console.log(`Migrated expense ${expense.id}: set qbQbId=${expense.qbExpenseId}, qbEntityType=Expense`);
      }
      
      // For expenses that have qbQbId but are missing qbEntityType
      if (expense.qbQbId && !expense.qbEntityType) {
        // Default to 'Expense' if we can't determine the type
        await prisma.expense.update({
          where: { id: expense.id },
          data: {
            qbEntityType: 'Expense'
          }
        });
        console.log(`Migrated expense ${expense.id}: set qbEntityType=Expense`);
      }
    } catch (error) {
      console.error(`Failed to migrate expense ${expense.id}:`, error);
    }
  }

  await prisma.migration.create({
    data: { name: MIGRATION_NAME }
  });

  console.log('QuickBooks data migration completed.');
}

migrateQuickBooksData()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 