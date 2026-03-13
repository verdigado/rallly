#!/bin/bash

# Exit on any error
set -e

echo "📦 Creating release artifact..."

# Clean up previous artifacts if they exist
rm -f rallly-release.tar.gz*
rm -rf ./release-artifact

echo "🏗️ Building the project..."
pnpm install --frozen-lockfile
NEXT_PUBLIC_SELF_HOSTED="true" SKIP_ENV_VALIDATION=1 pnpm build

# Create the artifact directory
mkdir -p ./release-artifact

# Copy the standalone server output
echo "🚚 Copying standalone server files..."
cp -r apps/web/.next/standalone/* ./release-artifact/

# Copy the static assets
echo "🖼️ Copying static assets..."
cp -r apps/web/.next/static ./release-artifact/apps/web/.next

# Copy the public folder
echo "📁 Copying public assets..."
cp -r apps/web/public ./release-artifact/apps/web

# Copy the Prisma schema for migrations
echo "🗄️ Copying Prisma schema and config..."
cp -r packages/database/prisma ./release-artifact/
cp packages/database/prisma.config.ts ./release-artifact/

# Modify prisma.config.ts in the artifact to use the production .env path
echo "🔧 Modifying prisma.config.ts for production..."
sed -i 's|../../.env|.env|' ./release-artifact/prisma.config.ts

echo "🗜️ Compressing the artifact..."
tar -czf rallly-release.tar.gz -C ./release-artifact .

echo "🔐 Generating checksum file..."
sha256sum rallly-release.tar.gz > rallly-release.tar.gz.sha256

echo "🧹 Cleaning up..."
rm -rf ./release-artifact

echo "✅ Release artifact created: rallly-release.tar.gz"
echo "✅ Checksum file created: rallly-release.tar.gz.sha256"
