#!/bin/sh
set -e
echo "Syncing database schema..."
prisma db push --accept-data-loss
echo "Starting application..."
exec node server.js
