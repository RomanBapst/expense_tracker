#!/bin/sh
npx prisma migrate deploy
npx prisma generate
exec "$@"


