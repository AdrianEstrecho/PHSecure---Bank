#!/bin/sh
# Vercel build (see vercel.json): Prisma client, migrations on production builds, then the client bundle.
set -e

npx prisma generate --schema server/prisma/schema.prisma

if [ "$VERCEL_ENV" = production ]; then
  if [ -n "$DIRECT_URL" ]; then
    npx prisma migrate deploy --schema server/prisma/schema.prisma
  else
    echo "WARNING: DIRECT_URL is not set, so database migrations were skipped."
  fi
fi

npm run build
