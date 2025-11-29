# Lichtblick マーケットプレイス機能仕様書

> **作成日**: 2025年9月30日
> **最終更新**: 2025年9月30日
> **ステータス**: 現在開発中（Phase 1-8完了、Phase 9以降計画中）
> **対象ブランチ**: feature/marketplace-ui-components
> **関連**: [実装アクションプラン](./IMPLEMENTATION_ACTION_PLAN.md) | [不整合対応方針](./INCONSISTENCIES_RESOLUTION.md)

---

## 📋 目次

1. [概要](#概要)
2. [正式リリースに向けた方針](#正式リリースに向けた方針)
3. [機能一覧](#機能一覧)
4. [ユーザーインターフェース](#ユーザーインターフェース)
5. [技術仕様](#技術仕様)
6. [データ構造](#データ構造)
7. [実装状況](#実装状況)
8. [今後の実装計画](#今後の実装計画)

---

## 概要

Lichtblickマーケットプレイスは、拡張機能（Extensions）とレイアウト（Layouts）を統一されたインターフェースで管理・インストールできる機能です。本機能は段階的に実装が進められており、**Phase 1〜8までの基本機能実装が完了**しています。

### プロジェクトの現状

- ✅ **Phase 1-8完了**: 基本的なマーケットプレイス機能（検索、フィルタリング、インストール管理等）
- 🚧 **Phase 9以降計画中**: マルチバージョン対応、バージョン付きID、詳細機能の実装
- 📅 **正式リリース予定**: 2025年12月9日（約10週間後）

### 設計原則

- **統一されたUI**: ExtensionとLayoutで共通のUIコンポーネントを使用
- **分離されたロジック**: それぞれ独立したContext/Providerで状態管理
- **段階的な機能拡張**: フェーズごとに機能を追加し、計画的に実装
- **完全なマルチバージョン対応**: 正式リリース時には完全なマルチバージョン管理を実現
- **後方互換性**: 既存ユーザーのデータを自動変換して移行

---

## 正式リリースに向けた方針

正式リリースに向けて、以下の重要な方針が確定しました（詳細は[実装アクションプラン](./IMPLEMENTATION_ACTION_PLAN.md)参照）。

### 🎯 主要方針

#### 1. マルチバージョン完全移行

**方針**: 開発段階でマルチバージョンに完全移行し、正式リリース時には完成状態にする

- 開発サーバーでレガシー形式を完全排除
- マルチバージョン対応の`extensions.json`を使用
- ハイブリッドローダーをマルチバージョン専用に最適化

**詳細ドキュメント**: `development-server-specification.md`（作成予定）

#### 2. バージョン付きID形式への移行

**方針**: `publisher.name@version`形式に移行し、既存データを自動変換

- 正式リリース時に新ID形式を採用
- 既存ユーザーの拡張機能を自動的にバージョン付きIDに変換
- アプリケーション起動時に自動マイグレーション実行

**詳細ドキュメント**: `extension-id-auto-migration-specification.md`（作成予定）

#### 3. マーケットプレイスAPI

**方針**: 次々回リリースで実装予定、現在は仕様策定フェーズ

- 現リリース・次回リリース: 既存API継続使用
- 次々回リリース: 独立マーケットプレイスサーバー実装
- インフラ構成の検討を実施

**詳細ドキュメント**: `marketplace-api-specification.md`（作成予定）

#### 4. ExtensionSettings統一

**方針**: カスタムマーケットプレイス実装に完全統一

- `ExtensionMarketplaceSettings`を標準実装として確立
- upstream互換コードを削除
- 独自路線での開発を確定

#### 5. 追加機能実装

**VERSIONタブ**: Phase 8計画書に基づき実装
**LayoutDetails**: ExtensionDetails安定後に実装
**サムネイル画像**: README.md解析による自動取得を実装

### 📅 実装スケジュール

| フェーズ | 期間     | 主要タスク                             |
| -------- | -------- | -------------------------------------- |
| Phase 1  | Week 1-2 | 開発サーバー構築、README解析サムネイル |
| Phase 2  | Week 3-4 | マルチバージョン対応、Settings統一     |
| Phase 3  | Week 5-6 | ID変換機能実装                         |
| Phase 4  | Week 7-9 | VERSIONタブ、LayoutDetails             |
| Phase 5  | Week 10  | 統合テスト、リリース準備               |

**推定リリース日**: 2025年12月9日

---

## 機能一覧

### 1. 基本機能（Phase 1-3完了）

#### 1.1 拡張機能マーケットプレイス

- **一覧表示**: 利用可能な拡張機能をカード形式で表示
- **インストール管理**: 拡張機能のインストール/アンインストール
- **詳細表示**: 拡張機能の詳細情報を別画面で表示
- **状態管理**: インストール済み/未インストールの状態を可視化

#### 1.2 レイアウトマーケットプレイス

- **一覧表示**: 利用可能なレイアウトをカード形式で表示
- **インストール管理**: レイアウトのインストール/削除
- **詳細表示**: レイアウトの詳細情報を別画面で表示
- **状態管理**: インストール済み/未インストールの状態を可視化

#### 1.3 共通UIコンポーネント

- **MarketplaceCard**: 統一されたカードデザイン

  - サムネイル表示（120x120px）
  - アイコンフォールバック機能
  - "No Image"表示
  - バージョン情報表示
  - インストールステータス表示
  - タグ表示（最大3個 + "+" 表示）

- **MarketplaceGrid**: レスポンシブグリッドレイアウト

  - 動的グリッドサイズ調整
  - ローディング状態表示
  - エンプティ状態ハンドリング

- **MarketplaceHeader**: ヘッダーコンポーネント
  - タイトル・サブタイトル表示
  - アイコン表示
  - 検索バー統合
  - エラー表示・リトライ機能

### 2. タグフィルタリング機能（Phase 4完了）

#### 2.1 タグ表示

- カード上でのタグ表示（最大3個表示）
- 省略タグのツールチップ表示（+X more）
- 選択状態の視覚的フィードバック

#### 2.2 タグフィルタリング

- タグクリックによるフィルタリング
- OR条件でのフィルタリング（複数タグ選択可能）
- タグ統計の表示（使用数のカウント）
- 使用頻度順でのタグソート

#### 2.3 タグフィルターUI

- 検索バー右側のフィルターボタン
- 折りたたみ式のタグフィルター表示
- 選択タグのハイライト表示
- "Clear All"機能

### 3. タブナビゲーション機能（Phase 5完了）

#### 3.1 タブ機能

- **Availableタブ**: すべての利用可能なアイテムを表示
- **Installedタブ**: インストール済みアイテムのみ表示
- タブ内でのアイテム数表示（Chip形式）
- アクティブタブのハイライト表示

#### 3.2 統計情報の統合

- 検索バー上の冗長なChipタグを廃止
- タブに統計情報を統合
- よりクリーンなUI設計

### 4. 検索機能強化（Phase 6完了）

#### 4.1 オートコンプリート機能

- リアルタイム検索候補表示
- 候補タイプの視覚的分類
  - 名前（Name）
  - タグ（Tag）
  - 作成者（Author）
  - キーワード（Keyword）
- 使用頻度の表示
- freeSoloモードでカスタム入力対応

#### 4.2 検索候補の優先度システム

- **名前**: 最高優先度（1000 + マッチ度）
- **タグ**: 高優先度（800 + マッチ度）
- **作成者**: 中優先度（600 + マッチ度）
- **キーワード**: 低優先度（400 + マッチ度）

#### 4.3 マッチ度評価

- 完全一致: +300点
- 前方一致: +200点
- 部分一致: +100点

#### 4.4 高度な検索オプション

- **作成者フィルター**: ドロップダウンで作成者を選択
- **バージョン範囲指定**: 最小・最大バージョンの指定
- **ソート機能**: 6種類のソート方式
  - 名前（昇順/降順）
  - 日付（昇順/降順）
  - 作成者（昇順/降順）
- 展開/折りたたみ可能なUI
- "Clear All"機能

### 5. CRUD操作（Phase 7完了）

#### 5.1 インストール機能

- ExtensionCatalogを使用した実際のインストール
- マーケットプレイスからのファイルダウンロード
- foxe URLの存在確認
- 成功/失敗の通知（Snackbar）
- UX考慮のローディング時間調整（最低200ms）
- コンポーネントマウント状態の確認

#### 5.2 アンインストール機能

- 拡張機能の安全な削除
- システム拡張機能（org namespace）の保護
- 成功/失敗の通知
- マーケットプレイスデータの自動更新

#### 5.3 操作状態管理

- 操作状態の列挙型管理
  - IDLE: 待機状態
  - INSTALLING: インストール中
  - UNINSTALLING: アンインストール中
- 拡張機能IDごとの状態管理
- ローディングインジケーターの表示

### 6. README/CHANGELOG表示（Phase 8完了）

#### 6.1 詳細ページでのドキュメント表示

- README.mdの表示
- CHANGELOG.mdの表示
- Markdownレンダリング対応
- ドキュメント読み込みエラーハンドリング

### 7. バージョン管理機能（実装済み）

#### 7.1 ハイブリッドバージョンシステム

- **レガシー形式**: 単一バージョンデータ構造
- **マルチバージョン形式**: 複数バージョン管理
- 自動データ構造検出
- 統一内部形式への変換

#### 7.2 バージョン表示

- 複数バージョンのアコーディオン表示
- 最新バージョンのハイライト
- バージョン履歴表示
- バージョン別アクション（詳細表示/インストール）

#### 7.3 バージョン管理ユーティリティ

- セマンティックバージョニング対応
- バージョン比較機能
- バージョン正規化（`v1.0.0` → `1.0.0`）
- バージョンソート機能

---

## ユーザーインターフェース

### 1. マーケットプレイスヘッダー

```
┌────────────────────────────────────────────────────────────┐
│ 🧩 Extensions                                              │
│ Manage and discover extensions                             │
│                                                             │
│ ┌──────────────────────────┐ [Filter] [Advanced]          │
│ │ 🔍 Search...             │                               │
│ └──────────────────────────┘                               │
│                                                             │
│ ├─ Available (50) ─┤─ Installed (12) ─┤                   │
└────────────────────────────────────────────────────────────┘
```

### 2. マーケットプレイスカード（基本）

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────┐  Extension Name v2.1.0             [Details]  │
│ │          │  by Publisher                      [Install]  │
│ │Thumbnail │  This is a description of the extension...    │
│ │ 120x120px│  Tags: [tag1] [tag2] [tag3] +2 more          │
│ │          │                                                │
│ └──────────┘                                                │
└─────────────────────────────────────────────────────────────┘
```

### 3. マーケットプレイスカード（バージョン展開時）

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────┐  Extension Name v2.1.0 (Latest)    [Details]  │
│ │          │  by Publisher • 5 versions          [Install]  │
│ │Thumbnail │  This is a description...                     │
│ │ 120x120px│  Tags: [tag1] [tag2] [tag3]                   │
│ │          │                                                │
│ └──────────┘  ▼ Show 4 more versions                       │
│                                                             │
│ ┌── Accordion (展開時) ──────────────────────────────────┐ │
│ │ v2.0.0 (2024-09-01) ──────────────── [Details][Install]│ │
│ │ v1.9.0 (2024-08-15) ──────────────── [Details][Install]│ │
│ │ v1.8.2 (2024-07-30) ──────────────── [Details][Install]│ │
│ │ v1.8.1 (2024-07-20) ──────────────── [Details][Install]│ │
│ └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4. 高度な検索オプションパネル

```
┌─────────────────────────────────────────────────────────────┐
│ ▼ Advanced Search Options                                   │
│                                                              │
│ Author Filter:    [▼ All Authors    ]                       │
│                                                              │
│ Version Range:    Min: [1.0.0      ] Max: [2.0.0      ]     │
│                                                              │
│ Sort By:          [▼ Name (A-Z)    ]                        │
│                                                              │
│                                        [Clear All]           │
└─────────────────────────────────────────────────────────────┘
```

---

## 技術仕様

### 1. ディレクトリ構造

```
packages/suite-base/src/
├── components/
│   ├── ExtensionsSettings/
│   │   ├── index.tsx                         # メインコンポーネント（切り替え）
│   │   ├── ExtensionMarketplaceSettings.tsx  # 独自マーケットプレイス実装
│   │   ├── hooks/
│   │   │   └── useExtensionSettings.ts       # データ取得ロジック
│   │   └── types.ts                          # 型定義
│   │
│   ├── LayoutMarketplaceSettings.tsx         # レイアウトマーケットプレイス
│   ├── ExtensionDetails.tsx                  # 拡張機能詳細
│   ├── LayoutDetails.tsx                     # レイアウト詳細
│   │
│   └── shared/
│       └── MarketplaceUI/                    # 共通UIコンポーネント
│           ├── components/
│           │   ├── ActionButtons.tsx         # アクションボタン
│           │   ├── MarketplaceCard.tsx       # カードコンポーネント
│           │   ├── MarketplaceGrid.tsx       # グリッドレイアウト
│           │   ├── MarketplaceHeader.tsx     # ヘッダー
│           │   └── VersionAccordion.tsx      # バージョンアコーディオン
│           ├── types/
│           │   └── index.ts                  # 共通型定義
│           ├── utils/
│           │   ├── tagUtils.ts               # タグユーティリティ
│           │   └── versionUtils.ts           # バージョンユーティリティ
│           └── index.ts                      # エクスポート
│
├── context/
│   ├── ExtensionCatalogContext.ts            # 拡張機能カタログ
│   ├── ExtensionMarketplaceContext.ts        # 拡張機能マーケットプレイス
│   ├── LayoutCatalogContext.ts               # レイアウトカタログ
│   └── LayoutMarketplaceContext.ts           # レイアウトマーケットプレイス
│
├── types/
│   └── HybridExtension.ts                    # ハイブリッド拡張機能型
│
└── util/
    ├── marketplace/
    │   ├── extensionIdHelpers.ts             # ID管理ヘルパー
    │   ├── migrationUtils.ts                 # マイグレーションユーティリティ
    │   ├── HybridExtensionLoader.ts          # ハイブリッドローダー
    │   └── extensionDataConverter.ts         # データ変換
    └── ...
```

### 2. 主要コンポーネント

#### MarketplaceCard

**Props**:

```typescript
interface MarketplaceCardProps {
  // 基本情報
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags?: string[];

  // 状態
  installed?: boolean;
  loading?: boolean;

  // ビジュアル
  icon?: ReactNode;
  thumbnail?: string;

  // バージョン管理
  versions?: VersionInfo[];
  maxVersionsShown?: number;

  // イベントハンドラー
  onInstall?: (version?: string) => void;
  onUninstall?: (version?: string) => void;
  onViewDetails?: (version?: string) => void;

  // タグフィルタリング
  onTagClick?: (tag: string) => void;
  selectedTags?: string[];

  // カスタマイズ
  customActions?: ReactNode;
}
```

#### MarketplaceHeader

**Props**:

```typescript
interface MarketplaceHeaderProps {
  // ヘッダー情報
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;

  // 検索
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  // エラーハンドリング
  error?: string;
  onRetry?: () => void;

  // タグフィルタリング
  tagStats?: TagStats[];
  selectedTags?: string[];
  onTagFilterChange?: (tags: string[]) => void;

  // タブナビゲーション
  tabs?: TabConfig[];
  activeTab?: MarketplaceTab;
  onTabChange?: (tab: MarketplaceTab) => void;

  // 高度な検索
  enableSearchSuggestions?: boolean;
  searchSuggestions?: string[];
  enableAdvancedSearch?: boolean;
  advancedSearchOptions?: AdvancedSearchOptions;
  onAdvancedSearchChange?: (options: AdvancedSearchOptions) => void;
  availableAuthors?: string[];
}
```

### 3. ユーティリティ関数

#### tagUtils.ts

```typescript
// タグ統計計算
function calculateTagStats<T>(items: T[]): TagStats[];

// 検索フィルタリング
function filterBySearch<T>(items: T[], query: string): T[];

// タグフィルタリング
function filterByTags<T>(items: T[], tags: string[]): T[];

// 検索候補生成
function generateSearchSuggestions<T>(
  items: T[],
  currentQuery?: string,
  maxSuggestions?: number,
): SearchSuggestion[];

// 高度なフィルタリング・ソート
function filterAndSortWithAdvancedOptions<T>(
  items: T[],
  searchQuery: string,
  selectedTags: string[],
  advancedOptions: AdvancedSearchOptions,
): T[];
```

#### versionUtils.ts

```typescript
// バージョン比較
function compareVersions(a: string, b: string): number;

// バージョンソート
function sortVersions(versions: VersionInfo[]): VersionInfo[];

// セマンティックバージョン解析
function parseSemanticVersion(version: string): SemanticVersion;

// バージョン正規化
function normalizeVersion(version: string): string;

// 最新バージョン取得
function getLatestVersion(versions: VersionInfo[]): string;

// ベースID生成
function generateBaseId(id: string, version: string): string;
```

---

## データ構造

### 1. レガシー拡張機能データ（単一バージョン）

```typescript
interface LegacyExtensionData {
  id: string; // "publisher.extension-name"
  name: string;
  version: string; // 単一バージョン文字列
  publisher: string;
  description: string;
  homepage?: string;
  readme?: string;
  changelog?: string;
  license?: string;
  sha256sum?: string;
  foxe?: string; // ダウンロードURL
  keywords?: string[];
}
```

### 2. マルチバージョン拡張機能データ

```typescript
interface MultiVersionExtensionData {
  id: string; // baseId として機能
  name: string;
  publisher: string;
  description: string;
  homepage?: string;
  license?: string;
  keywords?: string[];

  // 複数バージョン情報
  versions: {
    [version: string]: {
      version: string;
      publishedDate: string;
      sha256sum?: string;
      foxe?: string;
      readme?: string;
      changelog?: string;
      isLatest?: boolean;
      deprecated?: boolean;
    };
  };

  // メタデータ
  latest: string; // 最新バージョン識別子
  supported: string[]; // サポート対象バージョン一覧
}
```

### 3. 統一内部形式

```typescript
interface UnifiedExtensionData {
  // 基本情報
  baseId: string; // グループ識別子
  id: string; // 個別バージョン識別子 (baseId@version)
  name: string;
  publisher: string;
  description: string;
  homepage?: string;
  license?: string;
  keywords?: string[];

  // バージョン情報
  version: string; // 現在のバージョン
  isLatest: boolean;
  publishedDate?: string;

  // リソース
  sha256sum?: string;
  foxe?: string;
  readme?: string;
  changelog?: string;

  // メタデータ
  dataSource: "legacy" | "multi-version";
  availableVersions?: string[]; // このbaseIdで利用可能な全バージョン
}
```

### 4. グループ化された拡張機能データ

```typescript
interface GroupedExtensionData {
  baseId: string;
  id: string; // 最新バージョンのID
  namespace: string;
  displayName: string;
  description: string;
  publisher: string;
  homepage?: string;
  license?: string;
  keywords: string[];
  installed: boolean;
  latestVersion: string;
  versions: VersionInfo[];
  extension: ExtensionMarketplaceDetail;
}
```

### 5. バージョン情報

```typescript
interface VersionInfo {
  version: string;
  publishedDate?: string;
  isLatest?: boolean;
  installed?: boolean;
}
```

### 6. タグ統計

```typescript
interface TagStats {
  tag: string;
  count: number;
}
```

### 7. 検索候補

```typescript
interface SearchSuggestion {
  value: string;
  type: "tag" | "author" | "keyword" | "name";
  count: number;
  priority: number;
}
```

### 8. 高度な検索オプション

```typescript
interface AdvancedSearchOptions {
  authorFilter?: string;
  versionRange?: {
    min?: string;
    max?: string;
  };
  sortOrder?: SortOrder;
}

type SortOrder = "name-asc" | "name-desc" | "date-asc" | "date-desc" | "author-asc" | "author-desc";
```

---

## 実装状況

### ✅ 完了済み（Phase 1-8）

| フェーズ  | 機能                               | 状態    | 完了日        |
| --------- | ---------------------------------- | ------- | ------------- |
| Phase 1-3 | 基本マーケットプレイス機能         | ✅ 完了 | 2025年9月28日 |
| Phase 4   | タグフィルタリング機能             | ✅ 完了 | 2025年9月28日 |
| Phase 5   | タブナビゲーション機能             | ✅ 完了 | 2025年9月28日 |
| Phase 6   | 検索機能強化                       | ✅ 完了 | 2025年9月28日 |
| Phase 7   | CRUD操作実装                       | ✅ 完了 | 2025年9月     |
| Phase 8   | README/CHANGELOG表示               | ✅ 完了 | 2025年9月28日 |
| -         | ハイブリッド拡張機能ローダー       | ✅ 完了 | 2025年9月29日 |
| -         | バージョン正規化                   | ✅ 完了 | 2025年9月28日 |
| -         | ExtensionSettings リファクタリング | ✅ 完了 | 2025年9月29日 |

### 🔄 正式リリースに向けた実装計画

詳細な実装計画は[実装アクションプラン](./IMPLEMENTATION_ACTION_PLAN.md)を参照してください。

| フェーズ | 期間       | 主要機能                           | 工数見積          |
| -------- | ---------- | ---------------------------------- | ----------------- |
| Phase 1  | Week 1-2   | 開発環境整備、マルチバージョン基盤 | 7-9人日           |
| Phase 2  | Week 3-4   | マルチバージョン対応完全移行       | 10-12人日         |
| Phase 3  | Week 5-6   | バージョン付きID自動変換機能       | 12-15人日         |
| Phase 4  | Week 7-9   | VERSIONタブ、LayoutDetails実装     | 18-21人日         |
| Phase 5  | Week 10    | 統合テスト、リリース準備           | 6.5-7.5人日       |
| **合計** | **10週間** | **正式リリース完了**               | **53.5-63.5人日** |

**推定リリース日**: 2025年12月9日

---

## 以前の仕様検討事項について

**注**: 以下の内容は[実装アクションプラン](./IMPLEMENTATION_ACTION_PLAN.md)と[不整合対応方針書](./INCONSISTENCIES_RESOLUTION.md)に詳細な対応方針が記載されています。

### 過去に確認された検討課題

1. **バージョン管理方式** → **解決**: 開発期間中に完全マルチバージョン移行
2. **拡張機能ID形式** → **解決**: `publisher.name@version`形式に移行、自動変換実装
3. **マーケットプレイスAPI** → **解決**: 次々回リリース向け仕様策定
4. **ExtensionSettings実装** → **解決**: カスタム実装に統一
5. **VERSIONタブ機能** → **解決**: Phase 4で実装予定
6. **LayoutDetails** → **解決**: Phase 4で実装予定
7. **テストサムネイル** → **解決**: README解析実装、テストコード削除

これらの課題に対する具体的な対応方針と実装計画は、以下のドキュメントを参照してください:

- [実装アクションプラン](./IMPLEMENTATION_ACTION_PLAN.md) - 確定した実装方針と詳細スケジュール
- [不整合対応方針書](./INCONSISTENCIES_RESOLUTION.md) - 各課題の選択肢検討

---

## 今後の実装計画

正式リリースに向けた詳細な実装計画は[実装アクションプラン](./IMPLEMENTATION_ACTION_PLAN.md)を参照してください。

### 📅 実装ロードマップ

#### Phase 1: 基盤整備（Week 1-2）

**目標**: 開発環境とマルチバージョン対応の基盤確立

- 開発サーバー実装仕様書作成
- ローカル開発サーバー構築
- マルチバージョン対応`extensions.json`作成
- README解析サムネイル機能実装

**成果物**:

- ✅ 開発サーバー稼働
- ✅ マルチバージョン対応環境
- ✅ 自動サムネイル取得機能

#### Phase 2: マルチバージョン対応（Week 3-4）

**目標**: マルチバージョン機能の完全実装

- マルチバージョン選択UI実装
- HybridExtensionLoaderの最適化（マルチバージョン専用化）
- ExtensionSettings統一（カスタム実装に一本化）
- マーケットプレイスAPI仕様書作成

**成果物**:

- ✅ マルチバージョン対応完了
- ✅ レガシー形式サポート終了
- ✅ API仕様書（次々回リリース用）

#### Phase 3: ID変換機能（Week 5-6）

**目標**: バージョン付きIDへの移行機能実装

- 拡張機能ID自動変換仕様書作成
- ID変換ユーティリティ実装
- 自動マイグレーション機能実装
- ロールバック機能実装

**成果物**:

- ✅ `publisher.name@version`形式対応
- ✅ 既存データ自動変換機能
- ✅ 安全なマイグレーション機能

#### Phase 4: 詳細機能実装（Week 7-9）

**目標**: VERSIONタブとLayoutDetails実装

- ExtensionDetails安定化
- VERSIONタブ実装（Phase 8計画書ベース）
- LayoutDetails実装（ExtensionDetailsと同様の構造）

**成果物**:

- ✅ VERSIONタブ機能
- ✅ ExtensionDetails完成版
- ✅ LayoutDetails完成版

#### Phase 5: 統合テストとリリース準備（Week 10）

**目標**: 全機能の統合テストと正式リリース準備

- 統合テスト実施
- パフォーマンステスト
- ドキュメント最終更新
- リリースノート作成

**成果物**:

- ✅ 正式リリース準備完了

### 🎯 正式リリース時の到達目標

- ✅ 完全なマルチバージョン対応
- ✅ バージョン付きID形式（`publisher.name@version`）
- ✅ 既存ユーザーデータの自動マイグレーション
- ✅ VERSIONタブ機能
- ✅ ExtensionDetails/LayoutDetails完成
- ✅ README解析による自動サムネイル
- ✅ 次々回リリース用API仕様準備完了

**推定リリース日**: 2025年12月9日

### 📝 作成予定の詳細ドキュメント

1. **`development-server-specification.md`** 🔴 最優先

   - ローカル開発サーバー構築手順
   - マルチバージョン対応`extensions.json`の構造
   - 配置: `/docs/marketplace/implementation/`

2. **`extension-id-auto-migration-specification.md`** 🔴 高優先

   - ID自動変換のトリガータイミング
   - 解析対象データと変換アルゴリズム
   - ロールバック手順
   - 配置: `/docs/marketplace/implementation/`

3. **`marketplace-api-specification.md`** 🟡 中優先
   - API エンドポイント設計
   - インフラ構成の検討事項
   - 配置: `/docs/marketplace/planning/`

---

## 関連ドキュメント

### 📚 主要ドキュメント

- [実装アクションプラン](./IMPLEMENTATION_ACTION_PLAN.md) - 詳細な実装計画とスケジュール
- [不整合対応方針書](./INCONSISTENCIES_RESOLUTION.md) - 仕様不整合の対応選択肢
- [マーケットプレイス目次](./INDEX.md) - 全ドキュメントの索引

### 🏗️ アーキテクチャ

- [MARKETPLACE_ARCHITECTURE.md](./architecture/MARKETPLACE_ARCHITECTURE.md) - システム全体設計
- [IMPLEMENTATION_DETAILS.md](./architecture/IMPLEMENTATION_DETAILS.md) - コンポーネント詳細
- [hybrid-version-data-structure.md](./architecture/hybrid-version-data-structure.md) - データ構造設計

### 🔧 実装ログ

- [implementation-log.md](./implementation/implementation-log.md) - Phase 1-3実装記録
- [unified-phase4-tag-filtering-log.md](./implementation/unified-phase4-tag-filtering-log.md) - Phase 4実装記録
- [unified-phase5-tab-navigation-log.md](./implementation/unified-phase5-tab-navigation-log.md) - Phase 5実装記録
- [unified-phase6-search-enhancement-log.md](./implementation/unified-phase6-search-enhancement-log.md) - Phase 6実装記録
- [phase7-implementation-log.md](./implementation/phase7-implementation-log.md) - Phase 7実装記録
- [phase8-readme-changelog-fix-log.md](./implementation/phase8-readme-changelog-fix-log.md) - Phase 8実装記録

### 📋 計画書

- [version-ui-plan.md](./planning/version-ui-plan.md) - バージョンUI計画
- [phase8-version-tab-implementation-plan.md](./planning/phase8-version-tab-implementation-plan.md) - VERSIONタブ計画
- [future-implementation-roadmap.md](./planning/future-implementation-roadmap.md) - 将来の改善計画

---

## まとめ

Lichtblickマーケットプレイス機能は、Phase 1-8の基本機能実装を完了し、正式リリースに向けた準備段階に入っています。

### ✅ 現在の状態

- **Phase 1-8完了**: 検索、フィルタリング、インストール管理等の基本機能が稼働中
- **ハイブリッド対応**: レガシー形式とマルチバージョン形式の両方に対応
- **安定稼働**: 開発環境で動作確認済み

### 🎯 正式リリースに向けて

- **完全なマルチバージョン対応**: レガシー形式を排除し、マルチバージョン専用に最適化
- **バージョン付きID**: `publisher.name@version`形式への移行と既存データの自動変換
- **機能完成**: VERSIONタブ、LayoutDetails等の追加機能実装
- **品質保証**: 統合テスト、パフォーマンステストの実施

### 📅 スケジュール

- **現在**: Phase 1-8完了
- **Week 1-2**: 開発サーバー構築、基盤整備
- **Week 3-4**: マルチバージョン対応実装
- **Week 5-6**: ID変換機能実装
- **Week 7-9**: 詳細機能実装
- **Week 10**: 統合テスト、リリース準備
- **推定リリース**: 2025年12月9日

詳細な実装計画、タスク順序、工数見積もりについては[実装アクションプラン](./IMPLEMENTATION_ACTION_PLAN.md)を参照してください。

---

**Document Version**: 2.0.0
**Last Updated**: 2025年9月30日
**Maintained by**: Lichtblick Development Team

### 5. ⚠️ VERSIONタブ機能（削除済み）

**注**: このセクションは最新の実装計画に統合されました。詳細は「今後の実装計画」セクションを参照してください。

**旧状況**:

- `phase8-version-tab-implementation-plan.md`: VERSIONタブ追加の計画
- 実装コード: 現在は詳細ページでのバージョン表示のみ

**ドキュメント間の差異**:

- 計画書ではタブとしてのVERSION表示を想定
- 現在はREADME/CHANGELOGタブのみ実装

**推奨対応**:

- Phase 8はREADME/CHANGELOG表示で完了
- VERSIONタブは別フェーズとして実装予定
- 計画書を更新して明確化が必要

### 6. ⚠️ LayoutDetails実装状況

**状況**:

- `hybrid-extension-loader-integration-log.md`: LayoutDetailsコンポーネント実装完了と記載
- 実装コード: LayoutDetailsの実装状況が不明瞭

**ドキュメント間の差異**:

- 実装ログでは完成と記載
- アーキテクチャ図では存在を想定

**推奨対応**:

- LayoutDetailsコンポーネントの実装状況を確認
- 未実装の場合は実装ログを修正

### 7. ℹ️ テスト用サムネイル画像

**状況**:

- 実装コードで`https://picsum.photos/`を使用したテスト画像を生成
- 本番では実際のサムネイル画像URLを使用する想定

**推奨対応**:

- テストコードであることを明確化
- 本番環境での画像URL仕様を文書化

---

## まとめ

Lichtblickマーケットプレイス機能は、Phase 1〜8までの実装を通じて、基本的な機能から高度な検索・フィルタリング機能まで幅広い機能を提供しています。現在は移行期にあり、レガシーシステムとの互換性を保ちながら、段階的に新機能を追加しています。

### 主な成果

- ✅ 統一されたUIデザインシステム
- ✅ Extension/Layoutの独立したマーケットプレイス
- ✅ 高度な検索・フィルタリング機能
- ✅ ハイブリッドバージョン管理システム
- ✅ 実際のCRUD操作

### 今後の課題

- 📋 VERSIONタブ実装
- 📋 バージョン付きID完全移行
- 📋 独立マーケットプレイスサーバー構築
- 📋 ドキュメント間の不整合解消

---

**参考ドキュメント**:

- [マーケットプレイス目次](./INDEX.md)
- [アーキテクチャ設計書](./architecture/MARKETPLACE_ARCHITECTURE.md)
- [実装詳細](./architecture/IMPLEMENTATION_DETAILS.md)
- [ハイブリッドバージョンデータ構造](./architecture/hybrid-version-data-structure.md)
- [今後の実装ロードマップ](./planning/future-implementation-roadmap.md)
