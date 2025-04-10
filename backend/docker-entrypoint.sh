#!/bin/sh
npx prisma migrate deploy
npx prisma generate
echo "Running receipt migration..."
npx ts-node src/migrateReceipts.ts
exec "$@"


