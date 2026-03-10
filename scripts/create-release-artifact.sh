#!/bin/bash

# Exit on any error
set -e

echo "📦 Creating release artifact..."

# 1. Clean up previous artifacts if they exist
rm -f rallly-release.tar.gz
rm -rf ./release-artifact

# 2. Build the project
echo "⚙️ Building the Next.js application..."
pnpm build

# 3. Create the artifact directory
mkdir -p ./release-artifact

# 4. Copy the standalone server output
echo "🚚 Copying standalone server files..."
cp -r apps/web/.next/standalone/* ./release-artifact/

# 5. Copy the static assets
echo "🖼️ Copying static assets..."
mkdir -p ./release-artifact/apps/web/.next/
cp -r apps/web/.next/static ./release-artifact/apps/web/.next/static

# 6. Copy the public folder
echo "📁 Copying public assets..."
cp -r apps/web/public ./release-artifact/apps/web/public

# 7. Copy the Prisma schema for migrations
echo "🗄️ Copying Prisma schema and config..."
mkdir -p ./release-artifact/prisma
cp -r packages/database/prisma/* ./release-artifact/prisma
cp packages/database/prisma.config.ts ./release-artifact/

# 8. Modify prisma.config.ts in the artifact to use the production .env path
echo "🔧 Modifying prisma.config.ts for production..."
sed -i 's|../../.env|.env|' ./release-artifact/prisma.config.ts

# 9. Create the compressed tarball
echo "🗜️ Compressing the artifact..."
tar -czf rallly-release.tar.gz -C ./release-artifact .

# 10. Generate a checksum for the artifact
echo "🔐 Generating checksum file..."
sha256sum rallly-release.tar.gz > rallly-release.tar.gz.sha256

# 11. Clean up the temporary artifact directory
rm -rf ./release-artifact

echo "✅ Release artifact created: rallly-release.tar.gz"
