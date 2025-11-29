# OSS差分管理ツールセット

このツールセットは、OSSとそのカスタマイズ版の差分を効率的に管理するためのスクリプト集です。

## 📋 概要

OSSを「単にコピー」して手動管理するのは非効率的です。このツールセットを使用することで、以下が実現できます：

- **自動差分チェック**: ファイルレベルでの追加・削除・変更を自動検出
- **視覚的レポート**: HTML、CSV、JSON形式での差分レポート生成
- **Git統合**: 適切なGitワークフローでのバージョン管理
- **継続的監視**: 上流OSSの変更を継続的に追跡

## 🛠️ ツール一覧

### 1. `diff-checker.sh` - 基本的な差分チェック

**用途**: 2つのディレクトリ間の基本的な差分を確認

```bash
# 基本的な使用方法
./diff-checker.sh /path/to/oss /path/to/custom

# HTMLレポートの生成
./diff-checker.sh /path/to/oss /path/to/custom html

# 使用例
./diff-checker.sh ~/projects/lichtblick-oss ~/projects/lichtblick-custom html
```

**出力形式**:

- `console`: カラー付きコンソール出力（デフォルト）
- `html`: インタラクティブなHTMLレポート
- `json`: JSON形式のレポート（実装中）

### 2. `diff-analyzer.py` - 高度な差分分析

**用途**: より詳細な分析とカテゴリ分け

```bash
# 基本的な使用方法
python diff-analyzer.py /path/to/oss /path/to/custom

# JSON形式での出力
python diff-analyzer.py /path/to/oss /path/to/custom --format json

# CSV形式での出力
python diff-analyzer.py /path/to/oss /path/to/custom --format csv

# HTML形式での出力
python diff-analyzer.py /path/to/oss /path/to/custom --format html --output report.html
```

**特徴**:

- ファイルカテゴリ別の分析（コード、設定、スタイル等）
- ハッシュベースの変更検出
- 行数統計とコード変更量の測定
- 複数の出力形式をサポート

### 3. `git-diff-helper.sh` - Git統合管理

**用途**: Gitを使った適切なOSS差分管理

```bash
# 初期設定
./git-diff-helper.sh config  # 設定ファイルの作成
./git-diff-helper.sh init    # リポジトリの初期化

# 日常的な使用
./git-diff-helper.sh check main    # 上流の変更を確認
./git-diff-helper.sh report main   # 差分レポートの生成
./git-diff-helper.sh merge main    # インタラクティブなマージ
```

**ワークフロー**:

1. 上流OSSリポジトリをremoteとして追加
2. カスタムブランチでの変更管理
3. 定期的な上流変更の確認とマージ
4. 自動バックアップとコンフリクト解決支援

## 🚀 推奨されるワークフロー

### 初期設定

```bash
# 1. 設定ファイルの作成
./git-diff-helper.sh config

# 2. .diff-configファイルを編集
# UPSTREAM_REPO を正しいOSSリポジトリURLに変更

# 3. Gitリポジトリの初期化
./git-diff-helper.sh init

# 4. 既存のカスタマイズをコミット
git add .
git commit -m "Initial custom version"
```

### 日常的な管理

```bash
# 1. 上流の変更を確認
./git-diff-helper.sh check main

# 2. 差分レポートを生成
./git-diff-helper.sh report main

# 3. 必要に応じてマージ
./git-diff-helper.sh merge main
```

### 定期的な詳細分析

```bash
# 詳細な差分分析（月次等）
python diff-analyzer.py /path/to/oss /path/to/custom --format html --output monthly_report.html

# カテゴリ別の統計取得
python diff-analyzer.py /path/to/oss /path/to/custom --format json | jq '.summary.categories'
```

## 📊 レポートの活用方法

### HTMLレポート

- ブラウザで開いてインタラクティブに確認
- フィルタリング機能でカテゴリ別に表示
- チーム内での共有に最適

### CSVレポート

- Excel等での数値分析
- 長期的な変更トレンドの分析
- 管理レポートの作成

### JSONレポート

- 他のツールとの連携
- 自動化されたワークフローでの使用
- プログラムでの解析

## 💡 ベストプラクティス

### 1. 定期的な確認

```bash
# 週次での上流確認
./git-diff-helper.sh check main

# 月次での詳細分析
python diff-analyzer.py /path/to/oss /path/to/custom --format html
```

### 2. 変更管理の自動化

```bash
# cronジョブで自動チェック
0 9 * * 1 /path/to/git-diff-helper.sh check main > /tmp/upstream_check.log
```

### 3. ドキュメント化

- 各カスタマイズの理由を明確に記録
- 変更ログの維持
- アップデート時の影響範囲の把握

### 4. チーム内での共有

- 定期的な差分レポートの共有
- カスタマイズの方針統一
- 知識の属人化防止

## 🔧 カスタマイズ

### 除外パターンの設定

```bash
# .diff-configファイルで設定
IGNORE_PATTERNS="node_modules,dist,build,.git,*.log,your_custom_pattern"
```

### 重要ファイルの追加

```bash
# git-diff-helper.shのimportant_files配列を編集
important_files=("package.json" "README.md" "tsconfig.json" "your_important_file.js")
```

## 🔍 トラブルシューティング

### 問題: パフォーマンスが遅い

**解決策**: 除外パターンを適切に設定し、大きなファイルや自動生成ファイルを除外

### 問題: 文字化けが発生

**解決策**: ファイルのエンコーディングを確認し、UTF-8に統一

### 問題: Git操作でエラー

**解決策**: `.diff-config`ファイルの設定を確認し、リポジトリURLが正しいか確認

## 📈 今後の改善案

1. **GitHub Actions連携**: 自動的なPR作成とレビュー
2. **Slack通知**: 重要な変更の自動通知
3. **Web UI**: ブラウザベースの管理画面
4. **AI支援**: 変更の重要度自動判定

## 🤝 使用上の注意

- 本番環境への適用前に必ずテスト環境で確認
- 重要な変更は必ず手動レビュー
- 定期的なバックアップの実施
- セキュリティ関連の変更は特に注意深く確認

## 📞 サポート

質問や改善提案がある場合は、プロジェクトチームまでお知らせください。

---

**注意**: このツールセットは効率化を目的としたものですが、最終的な判断は人間が行ってください。自動化に過度に依存せず、重要な変更は必ず手動で確認しましょう。
