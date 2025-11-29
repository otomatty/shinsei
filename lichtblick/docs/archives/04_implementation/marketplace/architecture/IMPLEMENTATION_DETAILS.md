# Lichtblick マーケットプレイス実装詳細

## ファイル別技術仕様

### Phase 1: 共通UIコンポーネント

#### `MarketplaceCard.tsx`

**概要**: エクステンションとレイアウト用の統一カードコンポーネント

**主要機能**:

- レスポンシブカードレイアウト
- バージョン情報表示
- インストール状態表示
- アクションボタン統合

**Props**:

```typescript
interface MarketplaceCardProps {
  item: MarketplaceItem;
  onInstall?: (item: MarketplaceItem) => void;
  onUninstall?: (item: MarketplaceItem) => void;
  onViewDetails?: (item: MarketplaceItem) => void;
  isInstalled?: boolean;
  isLoading?: boolean;
}
```

#### `MarketplaceGrid.tsx`

**概要**: レスポンシブなグリッドレイアウト管理

**主要機能**:

- 動的グリッドサイズ調整
- ローディング状態表示
- エンプティ状態ハンドリング
- 無限スクロール対応

#### `MarketplaceHeader.tsx`

**概要**: 検索・フィルタリング・ソート機能付きヘッダー

**主要機能**:

- リアルタイム検索
- タグベースフィルタリング
- 高度な検索オプション
- ソート機能

#### `ActionButtons.tsx`

**概要**: インストール・詳細表示ボタン群

**主要機能**:

- 状態に応じたボタン表示
- ローディング状態管理
- エラーハンドリング

#### `VersionAccordion.tsx`

**概要**: 複数バージョン表示アコーディオン

**主要機能**:

- バージョン履歴表示
- 古いバージョンの折りたたみ
- バージョン別アクション

### ユーティリティ

#### `tagUtils.ts`

**機能一覧**:

```typescript
// タグ統計計算
export function calculateTagStats(items: MarketplaceItem[]): TagStat[];

// 検索フィルタリング
export function filterBySearch(items: MarketplaceItem[], query: string): MarketplaceItem[];

// タグフィルタリング
export function filterByTags(items: MarketplaceItem[], tags: string[]): MarketplaceItem[];

// 検索候補生成
export function generateSearchSuggestions(items: MarketplaceItem[], query: string): string[];
```

#### `versionUtils.ts`

**機能一覧**:

```typescript
// バージョン比較
export function compareVersions(a: string, b: string): number;

// バージョンソート
export function sortByVersion(versions: VersionInfo[]): VersionInfo[];

// セマンティックバージョン解析
export function parseSemanticVersion(version: string): SemanticVersion;

// 表示用フォーマット
export function formatVersionForDisplay(version: string): string;
```

### Phase 2: レイアウト管理機能

#### `LayoutCatalogContext.ts`

**概要**: レイアウトカタログの状態管理

**主要状態**:

```typescript
interface LayoutCatalogState {
  layouts: LayoutInfo[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedTags: string[];
  sortOrder: SortOrder;
}
```

**主要アクション**:

- `fetchLayouts()`: レイアウト一覧取得
- `searchLayouts(query: string)`: 検索実行
- `filterByTags(tags: string[])`: タグフィルタ
- `setSortOrder(order: SortOrder)`: ソート設定

#### `LayoutMarketplaceContext.ts`

**概要**: レイアウトマーケットプレイスの状態管理

**主要機能**:

- レイアウトインストール管理
- インストール済みレイアウト追跡
- エラーハンドリング

#### `LayoutMarketplaceSettings.tsx`

**概要**: レイアウトマーケットプレイス設定画面

**特徴**:

- 共通MarketplaceUIコンポーネント活用
- レスポンシブデザイン
- リアルタイム検索・フィルタ

### Phase 3: エクステンション管理機能

#### `ExtensionMarketplaceSettings.tsx`

**概要**: エクステンションマーケットプレイス設定画面

**統合機能**:

- ハイブリッドエクステンション対応
- マーケットプレイス機能統合
- 改良されたUI/UX

#### `HybridExtension.ts`

**概要**: エクステンションとレイアウトの統合型定義

```typescript
interface HybridExtension {
  id: string;
  type: "extension" | "layout";
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  metadata: ExtensionMetadata | LayoutMetadata;
  installationInfo?: InstallationInfo;
}
```

#### `ExtensionAdapter.ts`

**概要**: 異なる形式のエクステンション統一インターフェース

**主要機能**:

- レガシー形式対応
- メタデータ標準化
- 型安全な変換処理

#### エクステンションサービス群

**`services/extensions/`**:

- `ExtensionAdapter.ts`: エクステンション形式統一
- `IdMigrationHandler.ts`: ID移行処理
- `VersionManager.ts`: バージョン管理
- `types.ts`: サービス型定義

### Phase 4: 統合と国際化

#### `AppSettingsDialog.tsx`

**統合内容**:

- マーケットプレイス設定タブ追加
- レイアウト・エクステンション設定統合
- 統一されたナビゲーション

#### 国際化リソース

**英語リソース (`i18n/en/`)**:

```typescript
// appBar.ts
export const appBar = {
  marketplace: "Marketplace",
  extensions: "Extensions",
  layouts: "Layouts",
  settings: "Settings",
};

// appSettings.ts
export const appSettings = {
  marketplace: {
    title: "Marketplace",
    extensionMarketplace: "Extension Marketplace",
    layoutMarketplace: "Layout Marketplace",
  },
};
```

**日本語リソース (`i18n/ja/`)**:

```typescript
// appBar.ts
export const appBar = {
  marketplace: "マーケットプレイス",
  extensions: "エクステンション",
  layouts: "レイアウト",
  settings: "設定",
};

// appSettings.ts
export const appSettings = {
  marketplace: {
    title: "マーケットプレイス",
    extensionMarketplace: "エクステンションマーケットプレイス",
    layoutMarketplace: "レイアウトマーケットプレイス",
  },
};
```

#### `HybridExtensionLoader.ts`

**概要**: エクステンションとレイアウトの統合ローダー

**主要機能**:

- 異なるソースからの統一ロード
- メタデータ標準化
- エラーハンドリング

#### `extensionDataConverter.ts`

**概要**: エクステンションデータ変換ユーティリティ

**機能**:

- レガシーフォーマット対応
- 型安全なデータ変換
- バージョン互換性サポート

## 実装統計

### コミット情報

```
7fcfc7740 - feat: 共通マーケットプレイスUIコンポーネントの追加 (9 files, 1926 insertions)
3701bda14 - feat: レイアウト管理機能の実装 (7 files, 2245 insertions)
4ff6b9a03 - feat: エクステンション管理機能の強化 (15 files, 1817 insertions)
3880227a9 - feat: 統合・国際化・追加ユーティリティの実装 (9 files, 678 insertions)
```

### ファイル統計

- **総ファイル数**: 40ファイル
- **総行数**: 6,666行追加
- **新規コンポーネント**: 15個
- **新規ユーティリティ**: 8個
- **新規型定義**: 20個以上

### 機能カバレッジ

- ✅ 共通UIコンポーネント (100%)
- ✅ レイアウト管理 (100%)
- ✅ エクステンション管理 (100%)
- ✅ 国際化対応 (100%)
- ✅ 統合機能 (100%)

## 品質指標

### TypeScript型カバレッジ

- **型安全性**: 100% TypeScript実装
- **型定義**: 包括的なインターフェース定義
- **型チェック**: 厳密な型チェック有効

### コード品質

- **ESLint**: 全ファイルでルール準拠
- **コード重複**: 共通コンポーネントによる最小化
- **モジュラー設計**: 高い保守性と拡張性

### パフォーマンス

- **レスポンシブ**: モバイル・デスクトップ対応
- **遅延ロード**: 大きなデータセットの効率的な処理
- **メモ化**: React.memoによる不要な再レンダリング防止

---

**技術仕様書バージョン**: 1.0.0
**最終更新**: 2025年9月30日
**対象ブランチ**: feature/marketplace-ui-components
