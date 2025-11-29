# umi-main vs main ブランチ差分分析レポート

## 概要

このドキュメントは、`umi-main` ブランチと `main` ブランチの差分を分析し、特にマーケットプレイス機能に関連する変更点を詳細に記録したものです。

**作成日**: 2025年10月14日
**調査対象**:

- ベースブランチ: `main`
- 比較ブランチ: `umi-main`

## 統計サマリー

| 項目                 | 件数  |
| -------------------- | ----- |
| 新規追加ファイル (A) | 495   |
| 変更ファイル (M)     | 1,198 |
| 合計変更ファイル     | 1,693 |

## 1. マーケットプレイス機能関連の主要な変更

### 1.1 新規追加されたコンテキストとプロバイダー

#### Context層

- `packages/suite-base/src/context/LayoutCatalogContext.ts` ✨ **NEW**
- `packages/suite-base/src/context/LayoutMarketplaceContext.ts` ✨ **NEW**
- `packages/suite-base/src/context/PreviewLayoutContext.tsx` ✨ **NEW**

#### Provider層

- `packages/suite-base/src/providers/LayoutCatalogProvider.tsx` ✨ **NEW**
- `packages/suite-base/src/providers/LayoutMarketplaceProvider.tsx` ✨ **NEW**

### 1.2 マーケットプレイスUI コンポーネント (全て新規)

#### 共通Marketplaceコンポーネント構造

```
packages/suite-base/src/components/shared/Marketplace/
├── card/
│   └── MarketplaceCard/
│       ├── ActionButtons/          # アクション関連ボタン
│       ├── CardHeader/              # カードヘッダー
│       ├── TagDisplay/              # タグ表示
│       ├── ThumbnailArea/           # サムネイル領域
│       ├── VersionAccordion/        # バージョンアコーディオン
│       └── MarketplaceCard.tsx
├── layouts/
│   ├── MarketplaceDetailBase/       # 詳細画面ベース
│   ├── MarketplaceGrid/             # グリッドレイアウト
│   └── MarketplaceHeader/
│       ├── AdvancedSearchPanel/     # 高度な検索パネル
│       ├── MarketplaceTitleSection/ # タイトルセクション
│       └── TagFilterPanel/          # タグフィルターパネル
├── version/
│   └── VersionTab/                  # バージョンタブ
│       ├── VersionBadge.tsx
│       └── VersionListItem/
├── hooks/
│   └── useMarketplaceSearch.ts      # マーケットプレイス検索Hook
├── utils/
│   ├── compatibility/               # 互換性チェック
│   ├── filter/                      # フィルタリングロジック
│   ├── format/                      # フォーマット処理
│   ├── search/                      # 検索機能
│   └── version/                     # バージョン管理
└── types.ts
```

### 1.3 新規追加されたHooks (Marketplace専用)

```
packages/suite-base/src/hooks/marketplace/
├── useMarketplaceActions.ts         # マーケットプレイス操作
├── useMarketplaceActions.test.ts
├── useOperationState.ts             # オペレーション状態管理
├── useOperationState.test.ts
├── useOperationStatus.ts            # オペレーションステータス
├── useProcessedExtensions.ts        # 拡張機能処理
├── useProcessedExtensions.test.ts
└── README.md
```

#### その他の新規Hooks

- `packages/suite-base/src/hooks/useInstalledItems.ts` - インストール済みアイテム管理
- `packages/suite-base/src/hooks/useInstallingLayoutsState.tsx` - レイアウトインストール状態
- `packages/suite-base/src/hooks/useInstallingLayoutsStore.tsx` - レイアウトインストールストア
- `packages/suite-base/src/hooks/useOperationStatus.ts` - オペレーション状態

### 1.4 Extension管理の改善

#### 新規サービス層

```
packages/suite-base/src/services/extensions/
├── ExtensionAdapter.ts              # 拡張機能アダプター
├── IdMigrationHandler.ts            # ID移行ハンドラー
├── VersionManager.ts                # バージョン管理
├── types.ts
└── index.ts
```

#### ストレージ関連

- `packages/suite-base/src/services/extension/IdbExtensionStorageMigration.ts` ✨ **NEW**
  - IndexedDB拡張機能ストレージの移行処理

### 1.5 IterablePlayer関連の新規ファイル (リファクタリング)

```
packages/suite-base/src/players/IterablePlayer/
├── IterablePlayerMessageHandler.ts  ✨ **NEW**
├── IterablePlayerPlaybackController.ts ✨ **NEW**
├── IterablePlayerRefactored.ts      ✨ **NEW**
├── IterablePlayerStateMachine.ts    ✨ **NEW**
├── IterablePlayerStateMachine.test.ts ✨ **NEW**
├── IterablePlayerTypes.ts           ✨ **NEW**
└── README-Refactored.md             ✨ **NEW**
```

### 1.6 日本語対応 (i18n)

新規追加された日本語翻訳ファイル:

```
packages/suite-base/src/i18n/ja/
├── addPanel.ts
├── alertsList.ts
├── appBar.ts
├── appSettings.ts
├── dataSourceInfo.ts
├── desktopWindow.ts
├── extensionsSettings.ts
├── gauge.ts
├── general.ts
├── incompatibleLayoutVersion.ts
├── index.ts
├── log.ts
├── openDialog.ts
├── panelConfigVersionGuard.ts
├── panelSettings.ts
├── panelToolbar.ts
├── panels.ts
├── plot.ts
├── settingsEditor.ts
├── stateTransitions.ts
├── threeDee.ts
├── topicList.ts
└── workspace.ts
```

### 1.7 開発サーバー (全て新規)

```
server/
├── package.json                     ✨ **NEW**
├── README.md                        ✨ **NEW**
├── server.js                        ✨ **NEW**
├── schemas.js                       ✨ **NEW**
├── validate.js                      ✨ **NEW**
├── validator.js                     ✨ **NEW**
└── assets/
    ├── extensions/
    │   └── extensions.json
    └── layouts/
        ├── layouts.json
        ├── autonomous-vehicle-layout.json
        ├── drone-monitoring.json
        ├── minimal-debug.json
        ├── robotics-dashboard.json
        └── sample1.json
```

**目的**: マーケットプレイスのモック開発サーバー

### 1.8 ブランディングスクリプト

- `scripts/apply-umi-branding.sh` ✨ **NEW**
- `scripts/check-branding.sh` ✨ **NEW**

### 1.9 デスクトップアプリの自動更新機能

- `packages/suite-desktop/src/main/CustomMacUpdater.ts` ✨ **NEW**
  - カスタムMac自動更新機能

### 1.10 ユーティリティ関数

```
packages/suite-base/src/util/
├── ExtensionIdUtils.ts              ✨ **NEW**
└── marketplace/
    ├── extensionIdHelpers.ts        ✨ **NEW**
    └── migrationUtils.ts            ✨ **NEW**
```

## 2. 主要な変更があったファイル (M: Modified)

### 2.1 Context層の変更

以下のContext全てが更新されています:

- `CurrentUserContext.ts`
- `EventsContext.ts`
- `ExtensionCatalogContext.ts`
- `ExtensionMarketplaceContext.ts`
- `LayoutManagerContext.ts`
- `LayoutStorageContext.ts`
- `RemoteLayoutStorageContext.ts`
- `SharedRootContext.ts`
- その他多数

### 2.2 コンポーネントの変更

#### マーケットプレイス設定関連

- `packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx` ✨ **NEW**
- `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx` ✨ **NEW**

#### LayoutBrowser関連

- `LayoutRow.tsx` - 行表示の改善
- `LayoutSection.tsx` - セクション表示の改善
- `SignInPrompt.tsx` - サインインプロンプト
- `UnsavedChangesPrompt.tsx` - 未保存変更プロンプト

### 2.3 Panel関連 (全て修正)

以下のパネル全てが更新されています:

- CallService
- DataSourceInfo
- DiagnosticStatus
- DiagnosticSummary
- Gauge
- Indicator
- Log
- Map
- Parameters
- PieChart
- Plot
- Publish
- RawMessages
- StateTransitions
- Table
- Teleop
- ThreeDeeRender
- TopicGraph
- UserScriptEditor
- VariableSlider

**変更内容**: 主に国際化対応、型定義の改善、パフォーマンス最適化

## 3. ドキュメント構造の追加

### 3.1 実装ドキュメント

```
docs/04_implementation/marketplace/
├── README.md
├── MARKETPLACE_FEATURES.md
├── IMPLEMENTATION_ACTION_PLAN.md
├── INCONSISTENCIES_RESOLUTION.md
├── SEARCH_FUNCTIONALITY_SPECIFICATION.md
├── architecture/
│   ├── MARKETPLACE_ARCHITECTURE.md
│   ├── IMPLEMENTATION_DETAILS.md
│   └── hybrid-version-data-structure.md
├── guides/
│   ├── extension-requirements.md
│   └── layout-documentation.md
├── implementation/
│   ├── development-server-specification.md
│   ├── extension-id-auto-migration-specification.md
│   ├── marketplace-detail-implementation.md
│   ├── layout-preview-feature-implementation-plan.md
│   ├── unified-phase4-tag-filtering-log.md
│   ├── unified-phase5-tab-navigation-log.md
│   ├── unified-phase6-search-enhancement-log.md
│   └── (その他多数の実装ログ)
├── planning/
│   ├── marketplace-api-specification.md
│   ├── infrastructure-comparison.md
│   ├── phase8-version-tab-implementation-plan.md
│   └── unified-storage-cleanup-proposal.md
├── version-tab/
│   ├── implementation-completion-report.md
│   ├── legacy-code-removal-plan.md
│   ├── version-tab-current-specification.md
│   └── version-tab-documentation-index.md
└── (その他多数)
```

### 3.2 調査レポート

```
docs/07_research/
├── 2025_10/
│   └── 20251014/
│       └── marketplace-implementation-structure-investigation.md
├── releases/
│   └── v1.20.0-layout-api-detailed-analysis.md
├── reports/
│   ├── 2025_10/
│   │   ├── 20251010_marketplace-comparison.md
│   │   └── 20251010_marketplace-diff-analysis.md
│   ├── marketplace-404-error-investigation.md
│   ├── marketplace-architecture-investigation.md
│   ├── marketplace-file-server-implementation-plan.md
│   ├── marketplace-implementation-status.md
│   └── marketplace-install-error-investigation.md
└── technical/
    └── extension-and-layout-loading.md
```

### 3.3 作業ログ

```
docs/08_worklogs/
└── 2025_10/
    └── 20251014/
        ├── 20251014_02_marketplace-code-issues-analysis.md
        ├── 20251014_03_marketplace-code-quality-improvements.md
        └── layout-install-notification.md
```

### 3.4 改善提案

```
docs/09_improvements/
└── 20251014_01_marketplace-phase2-improvements.md
```

### 3.5 トラブルシューティング

```
docs/04_implementation/troubleshooting/
├── marketplace-available-tab-fix.md
├── marketplace-extension-persistence-fix.md
├── marketplace-extension-persistence-issue.md
├── marketplace-japanese-input-fix.md
└── marketplace-japanese-input-issue.md
```

## 4. 型定義の追加

### 4.1 Marketplace型定義

- `packages/suite-base/src/types/marketplace.ts` ✨ **NEW**
- `packages/suite-base/src/api/marketplace/types.ts` ✨ **NEW**

### 4.2 Layout API型定義の拡張

- `packages/suite-base/src/api/layouts/types.ts` (更新)

## 5. テストファイルの追加

### 5.1 Marketplace関連テスト

```
packages/suite-base/src/hooks/marketplace/
├── useMarketplaceActions.test.ts    ✨ **NEW**
├── useOperationState.test.ts        ✨ **NEW**
└── useProcessedExtensions.test.ts   ✨ **NEW**
```

### 5.2 その他の新規テスト

```
packages/suite-base/src/hooks/
├── useInstalledItems.test.ts        ✨ **NEW**
└── useOperationStatus.test.ts       ✨ **NEW**

packages/suite-base/src/players/IterablePlayer/
└── IterablePlayerStateMachine.test.ts ✨ **NEW**
```

## 6. 開発ツールとスクリプト

### 6.1 差分チェックツール

```
diff-checker/
├── diff-analyzer.py                 ✨ **NEW**
├── diff-checker.sh                  ✨ **NEW**
├── diff-tools-README.md             ✨ **NEW**
└── git-diff-helper.sh               ✨ **NEW**
```

### 6.2 Claude AI コマンド

```
.claude/commands/
├── direct-setup.md
├── direct-verify.md
├── kairo-design.md
├── kairo-implement.md
├── kairo-requirements.md
├── kairo-task-verify.md
├── kairo-tasks.md
├── rev-design.md
├── rev-requirements.md
├── rev-specs.md
├── rev-tasks.md
├── start-server.md
├── tdd-cycle-full.sh
├── tdd-green.md
├── tdd-load-context.md
├── tdd-red.md
├── tdd-refactor.md
├── tdd-requirements.md
├── tdd-testcases.md
├── tdd-todo.md
└── tdd-verify-complete.md
```

### 6.3 Cursorルール

```
.cursor/rules/
├── comments-guidelines.mdc
├── commit-message-rule.mdc
├── components-style.mdc
├── database-rules.mdc
├── error-handling-guidelines.mdc
├── logic-style.mdc
├── performance-rules.mdc
├── project-stack.mdc
├── styling-guide.mdc
├── testings-guideline.mdc
└── types-style.mdc
```

## 7. マーケットプレイス機能の実装範囲

### 7.1 Extension Marketplace

#### 主要機能

1. **カタログ表示**

   - グリッドレイアウト表示
   - カード形式での拡張機能表示
   - サムネイル、タグ、バージョン情報

2. **検索・フィルタリング**

   - 高度な検索機能 (AdvancedSearchPanel)
   - タグベースフィルタリング (TagFilterPanel)
   - AND/ORモード対応
   - リアルタイム検索

3. **バージョン管理**

   - 複数バージョン対応
   - バージョンアコーディオン表示
   - バージョンタブ
   - バージョン互換性チェック

4. **インストール・アンインストール**

   - ワンクリックインストール
   - インストール状態管理
   - 進行状況表示
   - エラーハンドリング

5. **詳細画面**
   - 拡張機能の詳細情報
   - README表示
   - バージョン履歴
   - アクションボタン

### 7.2 Layout Marketplace

#### 主要機能

1. **レイアウトカタログ**

   - レイアウトのグリッド表示
   - プレビュー機能
   - タグ・カテゴリ別表示

2. **レイアウトインストール**

   - インストール済みレイアウト管理
   - レイアウトのインポート/エクスポート
   - プレビューコンテキスト

3. **検索・フィルタ**
   - 拡張機能と同様の検索機能
   - タグフィルタリング
   - カテゴリ別表示

## 8. アーキテクチャ上の主要な変更

### 8.1 状態管理の強化

- **Context/Provider パターンの拡張**

  - LayoutCatalogContext
  - LayoutMarketplaceContext
  - PreviewLayoutContext

- **カスタムHooksの充実**
  - Marketplace専用Hooks
  - 操作状態管理Hooks
  - インストール状態管理Hooks

### 8.2 サービス層の整理

```
services/
├── extension/
│   ├── IdbExtensionLoader.ts
│   ├── IdbExtensionStorage.ts
│   └── IdbExtensionStorageMigration.ts ✨
├── extensions/                      ✨ NEW
│   ├── ExtensionAdapter.ts
│   ├── IdMigrationHandler.ts
│   ├── VersionManager.ts
│   └── index.ts
└── LayoutManager/
    ├── LayoutManager.ts (更新)
    ├── StorybookMockLayoutManager.ts ✨
    └── (その他更新ファイル)
```

### 8.3 データフロー

```
開発サーバー (server/)
    ↓ HTTP Request
ExtensionMarketplace / LayoutMarketplace Context
    ↓
Marketplace Hooks (useMarketplaceActions等)
    ↓
Services Layer (ExtensionAdapter, VersionManager等)
    ↓
IndexedDB Storage (IdbExtensionStorage)
```

## 9. 互換性と移行

### 9.1 ID移行機能

- **IdMigrationHandler.ts**: 拡張機能IDの移行処理
- **ExtensionIdUtils.ts**: 拡張機能ID操作ユーティリティ
- **migrationUtils.ts**: 汎用移行ユーティリティ

### 9.2 バージョン管理

- **VersionManager.ts**: バージョン管理ロジック
- **versionComparison.ts**: バージョン比較
- **versionSorting.ts**: バージョンソート
- **versionCompatibility.ts**: バージョン互換性チェック

## 10. 設定とブランディング

### 10.1 Umi ブランディング

- `scripts/apply-umi-branding.sh`: Umiブランディング適用スクリプト
- `scripts/check-branding.sh`: ブランディングチェックスクリプト

### 10.2 設定画面の追加

- ExtensionMarketplaceSettings.tsx
- LayoutMarketplaceSettings.tsx

## 11. パフォーマンスと最適化

### 11.1 Worker の利用

- IterablePlayerの改善 (メッセージハンドラー、プレイバックコントローラー)
- 非同期データロード

### 11.2 キャッシュとストレージ

- WriteThroughLayoutCache (更新)
- IdbExtensionStorage (移行サポート追加)

## 12. 国際化 (i18n)

### 12.1 日本語サポート

- 24の日本語翻訳ファイルを追加
- 全てのパネル、設定、ダイアログに日本語対応

### 12.2 英語翻訳の更新

- appBar.ts
- appSettings.ts
- その他多数のファイル更新

## 13. まとめ

### 13.1 主要な追加機能

1. **Extension Marketplace**: 完全な拡張機能マーケットプレイス実装
2. **Layout Marketplace**: レイアウトマーケットプレイス実装
3. **バージョン管理**: 複数バージョン対応
4. **検索・フィルタ**: 高度な検索とタグフィルタリング
5. **日本語対応**: 完全な日本語UI
6. **開発サーバー**: モック開発サーバー
7. **ID移行**: 拡張機能ID移行機能
8. **自動更新**: カスタムMac自動更新

### 13.2 技術的改善

- Context/Provider パターンの拡張
- カスタムHooksの充実
- サービス層の整理とアダプターパターン導入
- 型定義の強化
- テストカバレッジの向上
- ドキュメントの充実

### 13.3 ファイル変更サマリー

| カテゴリ             | 新規追加 | 変更       |
| -------------------- | -------- | ---------- |
| マーケットプレイスUI | 70+      | -          |
| Context/Provider     | 3        | 20+        |
| Hooks                | 10+      | 30+        |
| Services             | 5        | 10+        |
| 日本語i18n           | 24       | -          |
| ドキュメント         | 100+     | -          |
| スクリプト           | 30+      | -          |
| Panel                | -        | 15+ (全て) |
| Player               | 6        | 30+        |
| 型定義               | 5+       | 10+        |
| テスト               | 15+      | 50+        |

### 13.4 開発フロー改善

- Claudeコマンド追加 (TDD、設計、実装ガイド)
- Cursorルール追加 (コーディング規約)
- 差分チェックツール追加
- ブランディングスクリプト

## 14. 次のステップ

### 14.1 優先タスク

1. マーケットプレイスAPIの実装完了
2. テストカバレッジの向上
3. パフォーマンス最適化
4. ドキュメントの完全性確認

### 14.2 改善提案

詳細は以下を参照:

- `docs/09_improvements/20251014_01_marketplace-phase2-improvements.md`

## 関連ドキュメント

- [マーケットプレイス実装構造調査](./marketplace-implementation-structure-investigation.md)
- [マーケットプレイスアーキテクチャ](../../04_implementation/marketplace/architecture/MARKETPLACE_ARCHITECTURE.md)
- [実装アクションプラン](../../04_implementation/marketplace/IMPLEMENTATION_ACTION_PLAN.md)
- [Phase2改善提案](../../09_improvements/20251014_01_marketplace-phase2-improvements.md)
