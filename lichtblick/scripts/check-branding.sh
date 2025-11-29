#!/bin/bash

set -e

echo "🔍 Checking for remaining 'lichtblick' references..."

# 除外すべきファイル・ディレクトリ
EXCLUDE_DIRS="node_modules|\.git|\.yarn|dist|coverage|test_dirs|e2e|benchmark"

# カウンター
LICHTBLICK_COUNT=0
LOWERCASE_COUNT=0
PROTOCOL_COUNT=0

echo ""
echo "=== 1. Lowercase 'lichtblick' references ==="
LOWERCASE_RESULTS=$(grep -r "lichtblick" . --exclude-dir={$EXCLUDE_DIRS} --exclude="*.md" --exclude="*.lock" --exclude="*.log" --exclude="*.html" --exclude="check-branding.sh" --exclude="apply-lichtblick-branding.sh" 2>/dev/null | head -20)

if [ -n "$LOWERCASE_RESULTS" ]; then
    echo "$LOWERCASE_RESULTS"
    LOWERCASE_COUNT=$(echo "$LOWERCASE_RESULTS" | wc -l)
    echo "Found $LOWERCASE_COUNT lowercase references"
else
    echo "✅ No lowercase 'lichtblick' references found"
fi

echo ""
echo "=== 2. Uppercase 'Lichtblick' references ==="
LICHTBLICK_RESULTS=$(grep -r "Lichtblick" . --exclude-dir={$EXCLUDE_DIRS} --exclude="*.md" --exclude="*.lock" --exclude="*.log" --exclude="*.html" --exclude="check-branding.sh" --exclude="apply-lichtblick-branding.sh" 2>/dev/null | head -20)

if [ -n "$LICHTBLICK_RESULTS" ]; then
    echo "$LICHTBLICK_RESULTS"
    LICHTBLICK_COUNT=$(echo "$LICHTBLICK_RESULTS" | wc -l)
    echo "Found $LICHTBLICK_COUNT uppercase references"
else
    echo "✅ No uppercase 'Lichtblick' references found"
fi

echo ""
echo "=== 3. Protocol references ==="
PROTOCOL_RESULTS=$(grep -r "lichtblick://" . --exclude-dir={$EXCLUDE_DIRS} --exclude="*.md" --exclude="*.lock" --exclude="*.log" --exclude="*.html" --exclude="check-branding.sh" --exclude="apply-lichtblick-branding.sh" 2>/dev/null | head -10)

if [ -n "$PROTOCOL_RESULTS" ]; then
    echo "$PROTOCOL_RESULTS"
    PROTOCOL_COUNT=$(echo "$PROTOCOL_RESULTS" | wc -l)
    echo "Found $PROTOCOL_COUNT protocol references"
else
    echo "✅ No 'lichtblick://' protocol references found"
fi

echo ""
echo "=== 4. Application ID references ==="
APP_ID_RESULTS=$(grep -r "dev\.lichtblick\.suite" . --exclude-dir={$EXCLUDE_DIRS} --exclude="*.md" --exclude="*.lock" --exclude="*.log" --exclude="*.html" --exclude="check-branding.sh" --exclude="apply-lichtblick-branding.sh" 2>/dev/null | head -10)

if [ -n "$APP_ID_RESULTS" ]; then
    echo "$APP_ID_RESULTS"
    APP_ID_COUNT=$(echo "$APP_ID_RESULTS" | wc -l)
    echo "Found $APP_ID_COUNT application ID references"
else
    echo "✅ No 'dev.lichtblick.suite' references found"
fi

echo ""
echo "=== 5. BMW Group email references ==="
BMW_EMAIL_RESULTS=$(grep -r "lichtblick@bmwgroup.com" . --exclude-dir={$EXCLUDE_DIRS} --exclude="*.md" --exclude="*.lock" --exclude="*.log" --exclude="*.html" --exclude="check-branding.sh" --exclude="apply-lichtblick-branding.sh" 2>/dev/null | head -10)

if [ -n "$BMW_EMAIL_RESULTS" ]; then
    echo "$BMW_EMAIL_RESULTS"
    BMW_EMAIL_COUNT=$(echo "$BMW_EMAIL_RESULTS" | wc -l)
    echo "Found $BMW_EMAIL_COUNT BMW email references"
else
    echo "✅ No 'lichtblick@bmwgroup.com' references found"
fi

# 総計
TOTAL_COUNT=$((LOWERCASE_COUNT + LICHTBLICK_COUNT + PROTOCOL_COUNT + APP_ID_COUNT + BMW_EMAIL_COUNT))

echo ""
echo "=== Summary ==="
echo "Total references found: $TOTAL_COUNT"

if [ $TOTAL_COUNT -eq 0 ]; then
    echo "🎉 All branding appears to be successfully converted to Lichtblick!"
else
    echo "⚠️  Found $TOTAL_COUNT references that may need manual review"
    echo ""
    echo "📋 Manual review checklist:"
    echo "  [ ] Check icon files in packages/suite-desktop/resources/icon/"
    echo "  [ ] Review documentation files (*.md)"
    echo "  [ ] Check license headers"
    echo "  [ ] Verify external service configurations"
    echo "  [ ] Test application startup"
    echo "  [ ] Verify custom protocol handling"
fi

echo ""
echo "🔍 Additional checks you might want to run:"
echo "  - grep -r 'BMW' . --exclude-dir={$EXCLUDE_DIRS} --exclude='*.md'"
echo "  - grep -r 'foxglove' . --exclude-dir={$EXCLUDE_DIRS} --exclude='*.md'"
echo "  - Check for hardcoded URLs or API endpoints"
