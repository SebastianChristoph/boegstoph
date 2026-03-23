#!/bin/sh
set -e
echo "Syncing database schema..."
prisma db push --accept-data-loss
echo "Preparing directories..."
mkdir -p data/photos

echo "Starting application..."
exec node server.js
