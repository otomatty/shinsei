# umi-main vs main ブランチ差分調査レポート (2025年10月14日)

## 概要

このディレクトリには、`umi-main` ブランチと `main` ブランチの差分を調査した結果をまとめたドキュメントが格納されています。

## ドキュメント一覧

### 1. 全体差分分析

📄 **[umi-main-vs-main-branch-diff-analysis.md](./umi-main-vs-main-branch-diff-analysis.md)**

**内容**:

- 統計サマリー (新規495ファイル、変更1,198ファイル)
- マーケットプレイス機能関連の主要な変更
- Context/Provider/Hooks の新規追加
- Panel、Player、サービス層の変更
- ドキュメント構造の追加
- 開発ツールとスクリプト
- 国際化 (i18n) 対応

**対象読者**: 全体像を把握したい開発者

### 2. マーケットプレイス機能詳細比較

📄 **[marketplace-feature-detailed-comparison.md](./marketplace-feature-detailed-comparison.md)**

**内容**:

- Extension Marketplace の詳細
  - UIコンポーネント階層 (70以上の新規コンポーネント)
  - カスタムHooks (10以上)
  - ユーティリティ関数 (20以上)
  - Context層の拡張
- Layout Marketplace の詳細
- 開発サーバーの構成
- ID移行とバージョン管理
- 検索・フィルタリング機能
- インストール・アンインストールフロー
- セキュリティとパフォーマンス

**対象読者**: マーケットプレイス機能の実装詳細を知りたい開発者

### 3. マーケットプレイス実装構造調査

📄 **[marketplace-implementation-structure-investigation.md](./marketplace-implementation-structure-investigation.md)**

**内容**:

- 実装されている機能の一覧
- コンポーネント構造の詳細
- データフロー
- 状態管理
- API設計

**対象読者**: アーキテクチャを理解したい開発者

## 主な発見事項

### 統計

| 項目             | 件数      |
| ---------------- | --------- |
| 新規追加ファイル | 495       |
| 変更ファイル     | 1,198     |
| **合計**         | **1,693** |

### 主要な新規機能

1. ✨ **Extension Marketplace** (完全実装)

   - 拡張機能のカタログ表示
   - 検索・フィルタリング (高度な検索、タグフィルタ)
   - インストール・アンインストール
   - バージョン管理 (複数バージョン対応)
   - 詳細画面

2. ✨ **Layout Marketplace** (完全実装)

   - レイアウトカタログ
   - プレビュー機能
   - インストール管理
   - カテゴリ分類

3. 🔧 **開発サーバー**

   - モックAPIサーバー
   - サンプルデータ (拡張機能5件、レイアウト5件)
   - JSON Schema バリデーション

4. 🌐 **日本語対応**

   - 24の日本語翻訳ファイル
   - 全UI要素の日本語化

5. 🔄 **ID移行機能**

   - 旧形式から新形式への自動移行
   - バージョン管理の改善

6. 🎨 **ブランディング**
   - Umiブランディング適用スクリプト
   - カスタムロゴとテーマ

### アーキテクチャの改善

| レイヤー   | 新規追加 | 変更 |
| ---------- | -------- | ---- |
| Context    | 3        | 20+  |
| Provider   | 2        | 10+  |
| Hooks      | 10+      | 30+  |
| Components | 70+      | 50+  |
| Services   | 5+       | 10+  |
| Utils      | 20+      | 5+   |

### コンポーネント構造

```
Marketplace機能
├── shared/Marketplace/
│   ├── card/               # カード表示 (7コンポーネント)
│   ├── layouts/            # レイアウト (3コンポーネント)
│   ├── version/            # バージョン管理 (4コンポーネント)
│   ├── hooks/              # カスタムHooks (2個)
│   └── utils/              # ユーティリティ (20+ 関数)
├── ExtensionMarketplaceSettings.tsx
└── LayoutMarketplaceSettings.tsx
```

## ドキュメント体系

### 実装ドキュメント

```
docs/04_implementation/marketplace/
├── アーキテクチャ (3ファイル)
├── ガイド (2ファイル)
├── 実装ログ (20+ファイル)
├── 計画 (8ファイル)
├── バージョンタブ (4ファイル)
└── トラブルシューティング (5ファイル)
```

### 調査レポート

```
docs/07_research/
├── 2025_10/20251014/ (このディレクトリ)
├── releases/
└── reports/ (10+ファイル)
```

### 作業ログ

```
docs/08_worklogs/2025_10/20251014/
├── マーケットプレイスコード問題分析
├── コード品質改善
└── レイアウトインストール通知
```

## 技術スタック

### フロントエンド

- **React**: UIコンポーネント
- **MUI (Material-UI)**: コンポーネントライブラリ
- **TypeScript**: 型安全性
- **i18next**: 国際化

### 状態管理

- **React Context API**: グローバル状態
- **Custom Hooks**: ローカル状態とロジック
- **IndexedDB**: クライアントサイドストレージ

### バックエンド (開発サーバー)

- **Express**: HTTPサーバー
- **JSON Schema**: データバリデーション
- **CORS**: クロスオリジン対応

## 次のステップ

### 優先度: 高

1. マーケットプレイスAPIの本番実装
2. テストカバレッジの向上 (目標: 80%以上)
3. パフォーマンス最適化 (大量アイテム表示)
4. セキュリティ強化 (署名検証、サンドボックス)

### 優先度: 中

1. ユーザードキュメントの作成
2. エラーハンドリングの改善
3. アクセシビリティの向上
4. モバイル対応

### 優先度: 低

1. 評価・レビュー機能
2. ソーシャル機能 (共有、いいね)
3. 統計ダッシュボード
4. 開発者向けツール

## 関連ドキュメント

### 設計・アーキテクチャ

- [マーケットプレイスアーキテクチャ](../../04_implementation/marketplace/architecture/MARKETPLACE_ARCHITECTURE.md)
- [実装詳細](../../04_implementation/marketplace/architecture/IMPLEMENTATION_DETAILS.md)

### 実装計画

- [実装アクションプラン](../../04_implementation/marketplace/IMPLEMENTATION_ACTION_PLAN.md)
- [Phase2改善提案](../../09_improvements/20251014_01_marketplace-phase2-improvements.md)

### ガイド

- [拡張機能要件](../../04_implementation/marketplace/guides/extension-requirements.md)
- [レイアウトドキュメント](../../04_implementation/marketplace/guides/layout-documentation.md)

### トラブルシューティング

- [マーケットプレイス永続化問題](../../04_implementation/troubleshooting/marketplace-extension-persistence-issue.md)
- [日本語入力問題](../../04_implementation/troubleshooting/marketplace-japanese-input-issue.md)

## メンテナンス情報

- **作成日**: 2025年10月14日
- **最終更新**: 2025年10月14日
- **調査者**: AI開発アシスタント
- **ブランチ**: umi-main (比較対象: main)
- **コミット数**: 約100+ コミット差分

## 貢献

このドキュメントは継続的に更新されます。以下の場合は更新が必要です:

- ✅ 新機能が追加された時
- ✅ 大きなリファクタリングが実施された時
- ✅ アーキテクチャが変更された時
- ✅ 重要なバグ修正が行われた時

## ライセンス

このドキュメントは、プロジェクトのライセンスに従います。
