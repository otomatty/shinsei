#!/bin/bash

# OSSとカスタマイズ版の差分チェックツール
# 使用方法: ./diff-checker.sh <OSS_DIR> <CUSTOM_DIR> [OUTPUT_FORMAT]
# OUTPUT_FORMAT: console (default), html, json

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 使用方法の表示
show_usage() {
    echo "使用方法: $0 <OSS_DIR> <CUSTOM_DIR> [OUTPUT_FORMAT]"
    echo "  OSS_DIR: 元のOSSのディレクトリパス"
    echo "  CUSTOM_DIR: カスタマイズ版のディレクトリパス"
    echo "  OUTPUT_FORMAT: console (default), html, json"
    echo ""
    echo "例: $0 /path/to/oss /path/to/custom html"
    exit 1
}

# 引数チェック
if [ $# -lt 2 ]; then
    show_usage
fi

OSS_DIR="$1"
CUSTOM_DIR="$2"
OUTPUT_FORMAT="${3:-console}"

# ディレクトリ存在チェック
if [ ! -d "$OSS_DIR" ]; then
    echo -e "${RED}エラー: OSSディレクトリが存在しません: $OSS_DIR${NC}"
    exit 1
fi

if [ ! -d "$CUSTOM_DIR" ]; then
    echo -e "${RED}エラー: カスタムディレクトリが存在しません: $CUSTOM_DIR${NC}"
    exit 1
fi

# 出力ファイル名の生成
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="diff_report_${TIMESTAMP}"

# 除外するファイル/ディレクトリのパターン
EXCLUDE_PATTERNS=(
    "node_modules"
    ".git"
    ".DS_Store"
    "dist"
    "build"
    "*.log"
    "*.tmp"
    ".nyc_output"
    "coverage"
    ".vscode"
    ".idea"
    "*.min.js"
    "*.map"
)

# 除外パターンをgrepのオプションに変換
GREP_EXCLUDE=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    GREP_EXCLUDE="${GREP_EXCLUDE} --exclude='${pattern}'"
done

# 差分チェック関数
check_differences() {
    local format=$1

    echo -e "${BLUE}=== OSSとカスタマイズ版の差分チェック ===${NC}"
    echo -e "${BLUE}OSS Dir: $OSS_DIR${NC}"
    echo -e "${BLUE}Custom Dir: $CUSTOM_DIR${NC}"
    echo -e "${BLUE}実行時刻: $(date)${NC}"
    echo ""

    # 1. 新規追加されたファイルを確認
    echo -e "${GREEN}=== 新規追加されたファイル ===${NC}"
    find "$CUSTOM_DIR" -type f | while read -r file; do
        relative_path="${file#$CUSTOM_DIR/}"
        oss_file="$OSS_DIR/$relative_path"

        # 除外パターンにマッチするかチェック
        skip=false
        for pattern in "${EXCLUDE_PATTERNS[@]}"; do
            if [[ "$relative_path" == *"$pattern"* ]]; then
                skip=true
                break
            fi
        done

        if [ "$skip" = false ] && [ ! -f "$oss_file" ]; then
            echo -e "${GREEN}+ $relative_path${NC}"
        fi
    done
    echo ""

    # 2. 削除されたファイルを確認
    echo -e "${RED}=== 削除されたファイル ===${NC}"
    find "$OSS_DIR" -type f | while read -r file; do
        relative_path="${file#$OSS_DIR/}"
        custom_file="$CUSTOM_DIR/$relative_path"

        # 除外パターンにマッチするかチェック
        skip=false
        for pattern in "${EXCLUDE_PATTERNS[@]}"; do
            if [[ "$relative_path" == *"$pattern"* ]]; then
                skip=true
                break
            fi
        done

        if [ "$skip" = false ] && [ ! -f "$custom_file" ]; then
            echo -e "${RED}- $relative_path${NC}"
        fi
    done
    echo ""

    # 3. 変更されたファイルを確認
    echo -e "${YELLOW}=== 変更されたファイル ===${NC}"
    find "$OSS_DIR" -type f | while read -r file; do
        relative_path="${file#$OSS_DIR/}"
        custom_file="$CUSTOM_DIR/$relative_path"

        # 除外パターンにマッチするかチェック
        skip=false
        for pattern in "${EXCLUDE_PATTERNS[@]}"; do
            if [[ "$relative_path" == *"$pattern"* ]]; then
                skip=true
                break
            fi
        done

        if [ "$skip" = false ] && [ -f "$custom_file" ]; then
            if ! cmp -s "$file" "$custom_file"; then
                echo -e "${YELLOW}M $relative_path${NC}"

                # 簡単な統計情報を表示
                oss_lines=$(wc -l < "$file" 2>/dev/null || echo "0")
                custom_lines=$(wc -l < "$custom_file" 2>/dev/null || echo "0")
                line_diff=$((custom_lines - oss_lines))

                if [ $line_diff -gt 0 ]; then
                    echo -e "  ${GREEN}  +${line_diff} lines${NC}"
                elif [ $line_diff -lt 0 ]; then
                    echo -e "  ${RED}  ${line_diff} lines${NC}"
                else
                    echo -e "  ${YELLOW}  内容変更 (行数同じ)${NC}"
                fi
            fi
        fi
    done
    echo ""
}

# HTML出力関数
generate_html_report() {
    local output_file="${OUTPUT_FILE}.html"

    cat > "$output_file" << 'EOF'
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OSSカスタマイズ差分レポート</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #007acc;
            padding-bottom: 10px;
        }
        h2 {
            color: #555;
            margin-top: 30px;
            padding: 10px;
            background-color: #f8f9fa;
            border-left: 4px solid #007acc;
        }
        .info-section {
            background-color: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .file-list {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .added { color: #28a745; font-weight: bold; }
        .removed { color: #dc3545; font-weight: bold; }
        .modified { color: #ffc107; font-weight: bold; }
        .file-item {
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        .file-item:last-child {
            border-bottom: none;
        }
        .stats {
            font-size: 0.9em;
            color: #666;
            margin-left: 20px;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        .summary-box {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
        }
        .summary-item {
            text-align: center;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
            flex: 1;
            margin: 0 10px;
        }
        .summary-number {
            font-size: 2em;
            font-weight: bold;
            color: #007acc;
        }
        button {
            background-color: #007acc;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background-color: #005a9c;
        }
        .collapsible {
            cursor: pointer;
            padding: 10px;
            background-color: #f1f1f1;
            border: none;
            outline: none;
            width: 100%;
            text-align: left;
        }
        .collapsible:hover {
            background-color: #ddd;
        }
        .content {
            padding: 0 15px;
            display: none;
            overflow: hidden;
        }
        .content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 OSSカスタマイズ差分レポート</h1>

        <div class="info-section">
            <h3>📊 基本情報</h3>
            <p><strong>OSS ディレクトリ:</strong> <code>OSS_DIR_PLACEHOLDER</code></p>
            <p><strong>カスタム ディレクトリ:</strong> <code>CUSTOM_DIR_PLACEHOLDER</code></p>
            <p><strong>レポート生成日時:</strong> <code>TIMESTAMP_PLACEHOLDER</code></p>
        </div>

        <div class="summary-box">
            <div class="summary-item">
                <div class="summary-number added" id="added-count">0</div>
                <div>新規追加</div>
            </div>
            <div class="summary-item">
                <div class="summary-number removed" id="removed-count">0</div>
                <div>削除</div>
            </div>
            <div class="summary-item">
                <div class="summary-number modified" id="modified-count">0</div>
                <div>変更</div>
            </div>
        </div>

        <div id="diff-content">
            <!-- 差分内容がここに挿入されます -->
        </div>
    </div>

    <script>
        // 折りたたみ機能
        document.querySelectorAll('.collapsible').forEach(function(button) {
            button.addEventListener('click', function() {
                this.classList.toggle('active');
                var content = this.nextElementSibling;
                content.classList.toggle('active');
            });
        });

        // サマリーカウント更新
        function updateSummary() {
            document.getElementById('added-count').textContent = document.querySelectorAll('.added').length;
            document.getElementById('removed-count').textContent = document.querySelectorAll('.removed').length;
            document.getElementById('modified-count').textContent = document.querySelectorAll('.modified').length;
        }

        // フィルタリング機能
        function filterFiles(type) {
            const allItems = document.querySelectorAll('.file-item');
            allItems.forEach(item => {
                if (type === 'all' || item.classList.contains(type)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        // エクスポート機能
        function exportData(format) {
            if (format === 'csv') {
                // CSV形式でエクスポート
                console.log('CSV export not implemented yet');
            } else if (format === 'json') {
                // JSON形式でエクスポート
                console.log('JSON export not implemented yet');
            }
        }

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            updateSummary();
        });
    </script>
</body>
</html>
EOF

    # プレースホルダーを実際の値に置換
    sed -i "" "s|OSS_DIR_PLACEHOLDER|$OSS_DIR|g" "$output_file"
    sed -i "" "s|CUSTOM_DIR_PLACEHOLDER|$CUSTOM_DIR|g" "$output_file"
    sed -i "" "s|TIMESTAMP_PLACEHOLDER|$(date)|g" "$output_file"

    echo -e "${GREEN}HTMLレポートを生成しました: $output_file${NC}"
}

# 詳細な差分表示関数
show_detailed_diff() {
    local file1="$1"
    local file2="$2"
    local relative_path="$3"

    echo -e "\n${YELLOW}=== 詳細差分: $relative_path ===${NC}"

    # ファイル形式に応じた差分表示
    if command -v colordiff &> /dev/null; then
        colordiff -u "$file1" "$file2" | head -50
    else
        diff -u "$file1" "$file2" | head -50
    fi

    echo -e "${BLUE}(最初の50行のみ表示)${NC}"
}

# メイン実行
case $OUTPUT_FORMAT in
    "console")
        check_differences console
        ;;
    "html")
        check_differences html
        generate_html_report
        ;;
    "json")
        echo -e "${YELLOW}JSON形式は現在実装中です${NC}"
        check_differences console
        ;;
    *)
        echo -e "${RED}エラー: 未サポートの出力形式: $OUTPUT_FORMAT${NC}"
        show_usage
        ;;
esac

echo -e "\n${GREEN}差分チェックが完了しました！${NC}"
