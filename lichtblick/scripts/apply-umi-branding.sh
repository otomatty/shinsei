#!/bin/bash

set -e

echo "🎨 Applying Lichtblick branding..."

# 確認プロンプト
read -p "Are you sure you want to apply Lichtblick branding? This will modify multiple files. (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted."
    exit 1
fi

# バックアップ作成
echo "📦 Creating backup..."
git add .
git commit -m "Backup before applying Lichtblick branding" || echo "No changes to commit"

echo "🔄 Applying branding changes..."

# 1. package.jsonの更新
echo "  - Updating package.json..."
sed -i '' 's/"name": "lichtblick"/"name": "lichtblick"/g' package.json
sed -i '' 's/"Lichtblick"/"Lichtblick"/g' package.json
sed -i '' 's/lichtblick@bmwgroup.com/lichtblick@yourcompany.com/g' package.json

# 2. アプリケーションID・プロトコルの更新
echo "  - Updating application IDs and protocols..."
find . -name "*.js" -o -name "*.ts" -o -name "*.json" | \
  grep -v node_modules | \
  grep -v ".git" | \
  grep -v dist | \
  xargs sed -i '' 's/dev\.lichtblick\.suite/dev.yourcompany.lichtblick/g'

find . -name "*.js" -o -name "*.ts" -o -name "*.json" | \
  grep -v node_modules | \
  grep -v ".git" | \
  grep -v dist | \
  xargs sed -i '' 's/lichtblick:\/\//lichtblick:\/\//g'

# 3. 表示名の更新（UIコンポーネント）
echo "  - Updating display names in UI components..."
find packages/ -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
  xargs sed -i '' 's/Lichtblick/Lichtblick/g'

# 4. 設定ファイルの更新
echo "  - Updating configuration files..."
find . -name "*.json" -o -name "*.js" | \
  grep -v node_modules | \
  grep -v ".git" | \
  grep -v dist | \
  xargs sed -i '' 's/"productName": "Lichtblick"/"productName": "Lichtblick"/g'

# 5. Electronの設定ファイル更新
echo "  - Updating Electron configuration..."
if [ -f "packages/suite-desktop/src/electronBuilderConfig.js" ]; then
    sed -i '' 's/Lichtblick/Lichtblick/g' packages/suite-desktop/src/electronBuilderConfig.js
fi

if [ -f "desktop/electronBuilderConfig.js" ]; then
    sed -i '' 's/Lichtblick/Lichtblick/g' desktop/electronBuilderConfig.js
fi

# 6. アプリケーションのメタデータ更新
echo "  - Updating application metadata..."
find . -name "*.json" | \
  grep -v node_modules | \
  grep -v ".git" | \
  grep -v dist | \
  xargs sed -i '' 's/"description": "Lichtblick Suite"/"description": "Lichtblick Suite"/g'

# 7. 特定のファイルのカスタム処理
echo "  - Applying custom file modifications..."

# README.mdの更新（コメントアウト - 必要に応じて有効化）
# if [ -f "README.md" ]; then
#     sed -i '' 's/Lichtblick/Lichtblick/g' README.md
# fi

# 8. VSCodeの設定更新
echo "  - Updating VSCode settings..."
if [ -f ".vscode/settings.json" ]; then
    sed -i '' 's/lichtblick/lichtblick/g' .vscode/settings.json
    sed -i '' 's/Lichtblick/Lichtblick/g' .vscode/settings.json
fi

# 9. 完了メッセージと次のステップの案内
echo "✅ Lichtblick branding applied successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Run './scripts/check-branding.sh' to verify changes"
echo "  2. Test build: 'yarn build'"
echo "  3. Run tests: 'yarn test'"
echo "  4. Check for any remaining 'lichtblick' references"
echo "  5. Update icons in 'packages/suite-desktop/resources/icon/' if needed"
echo ""
echo "⚠️  Manual review recommended for:"
echo "  - Icon files"
echo "  - Documentation files"
echo "  - License headers"
echo "  - External references"
