#!/bin/bash
set -e
echo "Clearing Next.js cache..."
rm -rf .next
echo "Starting dev server..."
npx next dev
