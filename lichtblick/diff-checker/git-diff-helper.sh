#!/bin/bash

# Git差分管理ヘルパースクリプト
# OSS更新の追跡と差分管理を効率化

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 設定ファイルの読み込み
CONFIG_FILE=".diff-config"
UPSTREAM_REMOTE="upstream"
CUSTOM_BRANCH="custom-main"

# 設定ファイルの作成
create_config() {
    cat > "$CONFIG_FILE" << EOF
# OSS差分管理設定ファイル
UPSTREAM_REPO="https://github.com/original/repo.git"
CUSTOM_BRANCH="custom-main"
UPSTREAM_REMOTE="upstream"
IGNORE_PATTERNS="node_modules,dist,build,.git,*.log"
EOF
    echo -e "${GREEN}設定ファイルを作成しました: $CONFIG_FILE${NC}"
    echo -e "${YELLOW}UPSTREAM_REPOを正しいOSSリポジトリURLに変更してください${NC}"
}

# 設定ファイルの読み込み
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
    else
        echo -e "${YELLOW}設定ファイルが見つかりません。作成しますか？ (y/n)${NC}"
        read -r response
        if [ "$response" = "y" ]; then
            create_config
            exit 0
        else
            echo -e "${RED}設定ファイルが必要です${NC}"
            exit 1
        fi
    fi
}

# Gitリポジトリの初期化
init_repo() {
    echo -e "${BLUE}=== Gitリポジトリの初期化 ===${NC}"

    if [ ! -d ".git" ]; then
        git init
        echo -e "${GREEN}Gitリポジトリを初期化しました${NC}"
    fi

    # 上流リポジトリの設定
    if ! git remote get-url $UPSTREAM_REMOTE >/dev/null 2>&1; then
        git remote add $UPSTREAM_REMOTE "$UPSTREAM_REPO"
        echo -e "${GREEN}上流リポジトリを追加しました: $UPSTREAM_REPO${NC}"
    else
        echo -e "${YELLOW}上流リポジトリは既に設定されています${NC}"
    fi

    # カスタムブランチの作成
    if ! git show-ref --verify --quiet refs/heads/$CUSTOM_BRANCH; then
        git checkout -b $CUSTOM_BRANCH
        echo -e "${GREEN}カスタムブランチを作成しました: $CUSTOM_BRANCH${NC}"
    else
        echo -e "${YELLOW}カスタムブランチは既に存在します: $CUSTOM_BRANCH${NC}"
    fi
}

# 上流の変更を取得
fetch_upstream() {
    echo -e "${BLUE}=== 上流の変更を取得中 ===${NC}"
    git fetch $UPSTREAM_REMOTE
    echo -e "${GREEN}上流の変更を取得しました${NC}"
}

# 差分レポートの生成
generate_diff_report() {
    local upstream_branch=${1:-"main"}
    local output_file="diff_report_$(date +%Y%m%d_%H%M%S).md"

    echo -e "${BLUE}=== 差分レポートを生成中 ===${NC}"

    cat > "$output_file" << EOF
# OSS差分レポート

**生成日時**: $(date)
**上流ブランチ**: $UPSTREAM_REMOTE/$upstream_branch
**カスタムブランチ**: $CUSTOM_BRANCH

## 概要

EOF

    # 統計情報を追加
    local stats=$(git diff --stat $UPSTREAM_REMOTE/$upstream_branch..$CUSTOM_BRANCH)
    echo "$stats" >> "$output_file"
    echo "" >> "$output_file"

    echo "## 変更されたファイル一覧" >> "$output_file"
    echo "" >> "$output_file"

    # 変更されたファイルの詳細
    git diff --name-status $UPSTREAM_REMOTE/$upstream_branch..$CUSTOM_BRANCH | while read status file; do
        case $status in
            A)
                echo "- 🆕 **追加**: \`$file\`" >> "$output_file"
                ;;
            D)
                echo "- 🗑️ **削除**: \`$file\`" >> "$output_file"
                ;;
            M)
                echo "- ✏️ **変更**: \`$file\`" >> "$output_file"
                ;;
            R*)
                echo "- 🔄 **名前変更**: \`$file\`" >> "$output_file"
                ;;
        esac
    done

    echo "" >> "$output_file"
    echo "## 主要な変更内容" >> "$output_file"
    echo "" >> "$output_file"

    # 重要なファイルの差分を追加
    local important_files=("package.json" "README.md" "tsconfig.json" "webpack.config.js")
    for file in "${important_files[@]}"; do
        if git diff --quiet $UPSTREAM_REMOTE/$upstream_branch..$CUSTOM_BRANCH -- "$file" 2>/dev/null; then
            continue
        fi

        echo "### $file" >> "$output_file"
        echo "" >> "$output_file"
        echo '```diff' >> "$output_file"
        git diff $UPSTREAM_REMOTE/$upstream_branch..$CUSTOM_BRANCH -- "$file" | head -50 >> "$output_file"
        echo '```' >> "$output_file"
        echo "" >> "$output_file"
    done

    echo -e "${GREEN}差分レポートを生成しました: $output_file${NC}"
}

# 上流の変更を確認
check_upstream_changes() {
    local upstream_branch=${1:-"main"}

    echo -e "${BLUE}=== 上流の変更を確認中 ===${NC}"

    # 最新の情報を取得
    fetch_upstream

    # 新しいコミットがあるかチェック
    local behind=$(git rev-list --count HEAD..$UPSTREAM_REMOTE/$upstream_branch 2>/dev/null || echo "0")
    local ahead=$(git rev-list --count $UPSTREAM_REMOTE/$upstream_branch..HEAD 2>/dev/null || echo "0")

    if [ "$behind" -gt 0 ]; then
        echo -e "${YELLOW}上流に$behind個の新しいコミットがあります${NC}"
        echo -e "${BLUE}最新のコミット:${NC}"
        git log --oneline -5 $UPSTREAM_REMOTE/$upstream_branch ^HEAD
        echo ""
    else
        echo -e "${GREEN}上流は最新です${NC}"
    fi

    if [ "$ahead" -gt 0 ]; then
        echo -e "${YELLOW}カスタムブランチに$ahead個のコミットがあります${NC}"
        echo -e "${BLUE}カスタムコミット:${NC}"
        git log --oneline -5 HEAD ^$UPSTREAM_REMOTE/$upstream_branch
        echo ""
    fi
}

# インタラクティブなマージ
interactive_merge() {
    local upstream_branch=${1:-"main"}

    echo -e "${BLUE}=== インタラクティブなマージ ===${NC}"

    # 変更を確認
    check_upstream_changes "$upstream_branch"

    echo -e "${YELLOW}マージを実行しますか？ (y/n)${NC}"
    read -r response

    if [ "$response" = "y" ]; then
        # バックアップブランチを作成
        local backup_branch="backup-$(date +%Y%m%d_%H%M%S)"
        git checkout -b "$backup_branch"
        git checkout "$CUSTOM_BRANCH"

        echo -e "${GREEN}バックアップブランチを作成しました: $backup_branch${NC}"

        # マージを実行
        if git merge $UPSTREAM_REMOTE/$upstream_branch --no-ff; then
            echo -e "${GREEN}マージが成功しました${NC}"
        else
            echo -e "${RED}マージでコンフリクトが発生しました${NC}"
            echo -e "${YELLOW}手動でコンフリクトを解決してください${NC}"
            echo -e "${BLUE}解決後、以下のコマンドでマージを完了してください:${NC}"
            echo "git add ."
            echo "git commit"
        fi
    else
        echo -e "${YELLOW}マージをキャンセルしました${NC}"
    fi
}

# 使用方法の表示
show_usage() {
    echo "Git差分管理ヘルパースクリプト"
    echo ""
    echo "使用方法:"
    echo "  $0 init                    # リポジトリの初期化"
    echo "  $0 fetch                   # 上流の変更を取得"
    echo "  $0 check [branch]          # 上流の変更を確認"
    echo "  $0 report [branch]         # 差分レポートの生成"
    echo "  $0 merge [branch]          # インタラクティブなマージ"
    echo "  $0 config                  # 設定ファイルの作成"
    echo ""
    echo "例:"
    echo "  $0 init                    # 初期設定"
    echo "  $0 check main              # mainブランチの変更を確認"
    echo "  $0 report main             # mainブランチとの差分レポート"
    echo "  $0 merge main              # mainブランチからマージ"
}

# メイン処理
main() {
    case "${1:-help}" in
        "init")
            load_config
            init_repo
            ;;
        "fetch")
            load_config
            fetch_upstream
            ;;
        "check")
            load_config
            check_upstream_changes "$2"
            ;;
        "report")
            load_config
            generate_diff_report "$2"
            ;;
        "merge")
            load_config
            interactive_merge "$2"
            ;;
        "config")
            create_config
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

main "$@"
