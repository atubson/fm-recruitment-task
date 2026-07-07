#!/bin/sh
set -e

echo "Running database migrations..."
npx typeorm migration:run -d dist/modules/database/data-source.js

echo "Starting application..."
exec node dist/main.js
