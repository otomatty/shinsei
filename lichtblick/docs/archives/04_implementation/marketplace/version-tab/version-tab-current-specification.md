# VERSIONタブ機能 - 現在の仕様まとめ

**作成日**: 2025年10月1日
**目的**: VERSIONタブ追加機能の実装に向けて、現在のマーケットプレイス機能の仕様を具体的にまとめる

---

## 📋 目次

1. [現在のマーケットプレイス機能概要](#1-現在のマーケットプレイス機能概要)
2. [データ構造の詳細](#2-データ構造の詳細)
3. [複数バージョン管理の仕様](#3-複数バージョン管理の仕様)
4. [現在の詳細画面の構造](#4-現在の詳細画面の構造)
5. [インストール状態管理](#5-インストール状態管理)
6. [VERSIONタブで実装すべき要件](#6-versionタブで実装すべき要件)

---

## 1. 現在のマーケットプレイス機能概要

### 1.1 機能範囲

現在のマーケットプレイス機能は以下の2つの領域をカバーしています:

#### 拡張機能（Extensions）

- **一覧画面**: `ExtensionMarketplaceSettings.tsx`
- **詳細画面**: `ExtensionDetail.tsx`
- **データコンテキスト**: `ExtensionMarketplaceContext.ts`
- **管理**: `ExtensionCatalogContext.ts`

#### レイアウト（Layouts）

- **一覧画面**: `LayoutMarketplaceSettings.tsx` (存在想定)
- **詳細画面**: `LayoutDetail.tsx`
- **データコンテキスト**: `LayoutMarketplaceContext.ts`
- **管理**: `LayoutCatalogContext.ts`

### 1.2 共通UIコンポーネント

両方の機能が共通で使用しているUIコンポーネント:

```
packages/suite-base/src/components/shared/MarketplaceUI/
├── MarketplaceDetailBase.tsx      # 詳細画面の基底コンポーネント
├── MarketplaceCard.tsx            # カード型一覧表示
├── MarketplaceGrid.tsx            # グリッドレイアウト
├── MarketplaceHeader.tsx          # ヘッダーコンポーネント
├── VersionAccordion.tsx           # バージョンアコーディオン
├── ActionButtons.tsx              # アクションボタン群
├── CardHeader.tsx                 # カードヘッダー
├── TextContent.tsx                # Markdownコンテンツ表示
├── versionUtils.ts                # バージョンユーティリティ
└── types.ts                       # 共通型定義
```

---

## 2. データ構造の詳細

### 2.1 拡張機能のデータ型

#### ExtensionMarketplaceDetail

```typescript
// packages/suite-base/src/context/ExtensionMarketplaceContext.ts
export type ExtensionMarketplaceDetail = ExtensionInfo & {
  /** ファイルの整合性検証用SHA256ハッシュ */
  sha256sum?: string;
  /** 拡張機能パッケージ（.foxe）ファイルのURL */
  foxe?: string;
  /** バージョン別のタイムスタンプ情報 */
  time?: Record<string, string>;
};
```

#### ExtensionInfo (基本型)

```typescript
// packages/suite-base/src/types/Extensions.ts
export type ExtensionInfo = {
  id: string; // 一意識別子
  description: string; // 説明
  displayName: string; // 表示名
  homepage: string; // ホームページURL
  keywords: string[]; // 検索キーワード
  license: string; // ライセンス
  name: string; // 名前
  namespace?: ExtensionNamespace; // 名前空間 ("local" | "org")
  publisher: string; // 発行者
  qualifiedName: string; // 完全修飾名
  version: string; // バージョン
  readme?: string; // README (URL or text)
  changelog?: string; // CHANGELOG (URL or text)
};
```

### 2.2 レイアウトのデータ型

#### LayoutMarketplaceDetail

```typescript
// packages/suite-base/src/context/LayoutMarketplaceContext.ts
export type LayoutMarketplaceDetail = {
  id: string; // 一意識別子
  name: string; // 表示名
  description: string; // 説明
  author: string; // 作成者
  version: string; // バージョン
  tags: string[]; // タグ
  thumbnail?: string; // サムネイルURL
  layoutUrl: string; // レイアウトファイルURL
  sha256sum?: string; // ファイルハッシュ
  downloads?: number; // ダウンロード数
  rating?: number; // 評価 (1-5)
  createdAt: string; // 作成日時 (ISO8601)
  updatedAt: string; // 更新日時 (ISO8601)
  readme?: string; // README URL
  changelog?: string; // CHANGELOG URL
  license?: string; // ライセンス
  homepage?: string; // ホームページURL
  minLichtblickVersion?: string; // 必要な最小バージョン
};
```

### 2.3 ハイブリッドデータ構造（複数バージョン対応）

現在のシステムは **Legacy（単一バージョン）** と **MultiVersion（複数バージョン）** の両方に対応するハイブリッド構造を採用しています。

#### Legacy形式 (既存のextensions.json)

```typescript
// packages/suite-base/src/types/HybridExtension.ts
export interface LegacyExtensionData {
  id: string;
  name: string;
  version: string; // 単一バージョン文字列
  publisher: string;
  description: string;
  homepage?: string;
  readme?: string;
  changelog?: string;
  license?: string;
  sha256sum?: string;
  foxe?: string;
  keywords?: string[];
}
```

#### MultiVersion形式 (新API対応)

```typescript
export interface MultiVersionExtensionData {
  id: string; // ベースID
  name: string;
  publisher: string;
  description: string;
  homepage?: string;
  license?: string;
  keywords?: string[];

  // 複数バージョン管理
  versions: {
    [version: string]: VersionDetail;
  };

  latest: string; // 最新バージョン識別子
  supported?: string[]; // サポート対象バージョン
  deprecated?: string[]; // 非推奨バージョン
}

export interface VersionDetail {
  version: string;
  publishedDate: string; // ISO8601形式
  sha256sum?: string;
  foxe?: string;
  readme?: string;
  changelog?: string;
  isLatest?: boolean;
  deprecated?: boolean;
  stability?: "stable" | "beta" | "alpha" | "experimental";
  minLichtblickVersion?: string;
}
```

#### UnifiedExtensionData (内部統一形式)

```typescript
export interface UnifiedExtensionData {
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
  version: string;
  isLatest: boolean;
  publishedDate?: string;
  stability?: "stable" | "beta" | "alpha" | "experimental";
  deprecated?: boolean;

  // リソース情報
  sha256sum?: string;
  foxe?: string;
  readme?: string;
  changelog?: string;

  // メタデータ
  dataSource: "legacy" | "multi-version";
  availableVersions?: string[];
  supportStatus?: "supported" | "deprecated" | "unsupported";

  // 状態情報
  installed?: boolean;
  enabled?: boolean;
  installedDate?: string;
  lastUpdateCheck?: string;
}
```

---

## 3. 複数バージョン管理の仕様

### 3.1 バージョン管理の基本方針

現在のシステムは **複数バージョンの同時インストールに対応** しています:

#### 重要な特徴

- ✅ 1つの拡張機能/レイアウトで **複数バージョンを同時にインストール可能**
- ✅ 各バージョンは **独立したインストール状態** を持つ
- ✅ バージョンごとに **有効/無効の切り替え** が可能
- ✅ 自動更新機能は **廃止** (ユーザーが明示的にバージョンを選択)

#### バージョンID形式

```typescript
// ExtensionVersionManager による ID 生成
// packages/suite-base/src/services/extensions/VersionManager.ts

// 基本形式
baseId = "publisher.extension-name";

// バージョン付きID
versionedId = "publisher.extension-name@1.2.0";

// 例:
// baseId: "foxglove.turtlesim"
// versionedId: "foxglove.turtlesim@1.0.0"
// versionedId: "foxglove.turtlesim@2.1.3"
```

### 3.2 バージョン状態管理

各バージョンは以下の状態を持ちます:

```typescript
interface VersionInfo {
  version: string; // バージョン番号
  publishedDate?: string; // 公開日
  isLatest: boolean; // 最新バージョンフラグ
  installed?: boolean; // インストール済みか
  enabled?: boolean; // 有効化されているか
  compatible?: boolean; // 互換性があるか
  changelog?: string; // 変更履歴
  dependencies?: string[]; // 依存関係
  fileSize?: number; // ファイルサイズ
  downloadUrl?: string; // ダウンロードURL
}
```

### 3.3 HybridExtensionLoader

複数バージョン対応のデータ取得を管理:

```typescript
// packages/suite-base/src/util/marketplace/HybridExtensionLoader.ts

export class HybridExtensionLoader implements UniversalExtensionLoader {
  // 全拡張機能を取得（すべてのバージョン）
  async getAllExtensions(): Promise<UnifiedExtensionData[]>;

  // 特定の拡張機能の全バージョンを取得
  async getExtensionVersions(baseId: string): Promise<UnifiedExtensionData[]>;

  // 最新バージョンのみを取得
  async getLatestExtensions(): Promise<UnifiedExtensionData[]>;

  // 特定バージョンを取得
  async getExtension(baseId: string, version?: string): Promise<UnifiedExtensionData | undefined>;

  // 検索
  async searchExtensions(query: string): Promise<UnifiedExtensionData[]>;
}
```

---

## 4. 現在の詳細画面の構造

### 4.1 MarketplaceDetailBase (共通基底コンポーネント)

拡張機能とレイアウトの詳細画面で共通利用される基底コンポーネント:

```typescript
// packages/suite-base/src/components/shared/MarketplaceUI/MarketplaceDetailBase.tsx

export interface MarketplaceDetailBaseProps {
  // ヘッダー情報
  title: string;
  onClose: () => void;

  // 基本情報
  id: string;
  version: string;
  license?: string;
  publisher: string;
  description: string;
  homepage?: string;

  // アクションボタン
  actionButton?: ReactNode;

  // カスタムコンテンツ
  extraInfoContent?: ReactNode;

  // タブ構成
  tabs: TabConfig[];
  defaultTab?: number;

  // スタイル
  className?: string;
}

interface TabConfig {
  label: string;
  content: ReactNode;
}
```

#### レイアウト構造

```
┌─────────────────────────────────────────────┐
│ ← Back                                      │
│ Extension/Layout Name                       │
│ by Publisher                                │
├─────────────────────────────────────────────┤
│ id • version • license                      │
│ Description text...                         │
│                                             │
│ [Extra Info Content]                        │
│ (サムネイル、タグ、統計など)                    │
│                                             │
│ [Action Button] (Install/Uninstall)        │
├─────────────────────────────────────────────┤
│ [README] [CHANGELOG]                        │  ← 現在のタブ
├─────────────────────────────────────────────┤
│                                             │
│ Tab Content (Markdown)                      │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.2 ExtensionDetail (拡張機能詳細)

```typescript
// packages/suite-base/src/components/ExtensionsSettings/ExtensionDetail.tsx

interface ExtensionDetailProps {
  installed: boolean;
  extension: Immutable<ExtensionMarketplaceDetail>;
  onClose: () => void;
}

// 現在のタブ構成
const tabs = useMemo(
  () => [
    {
      label: "README",
      content: readmeContent ?? "Loading...",
    },
    {
      label: "CHANGELOG",
      content: changelogContent ?? "Loading...",
    },
    // ここに VERSION タブを追加する予定
  ],
  [readmeContent, changelogContent],
);
```

#### README/CHANGELOG の読み込み

```typescript
// README の読み込み
const { value: readmeContent } = useAsync(
  async () =>
    readme != undefined && isValidUrl(readme)
      ? await marketplace.getMarkdown(readme)
      : DOMPurify.sanitize(readme ?? "No readme found."),
  [marketplace, readme],
);

// CHANGELOG の読み込み
const { value: changelogContent } = useAsync(
  async () =>
    changelog != undefined && isValidUrl(changelog)
      ? await marketplace.getMarkdown(changelog)
      : DOMPurify.sanitize(changelog ?? "No changelog found."),
  [marketplace, changelog],
);
```

### 4.3 LayoutDetail (レイアウト詳細)

```typescript
// packages/suite-base/src/components/LayoutSettings/LayoutDetail.tsx

interface LayoutDetailProps {
  installed: boolean;
  layout: Immutable<LayoutMarketplaceDetail>;
  onClose: () => void;
}

// 現在のタブ構成（ExtensionDetail と同様）
const tabs = useMemo(
  () => [
    {
      label: "README",
      content: readmeContent ?? "Loading...",
    },
    {
      label: "CHANGELOG",
      content: changelogContent ?? "Loading...",
    },
    // ここに VERSION タブを追加する予定
  ],
  [readmeContent, changelogContent],
);
```

#### 追加のUI要素（レイアウト特有）

```typescript
// サムネイル表示
{layout.thumbnail && (
  <img
    src={layout.thumbnail}
    alt={layout.name}
    className={classes.thumbnail}
  />
)}

// タグ表示
<div className={classes.tagsContainer}>
  {layout.tags.map((tag) => (
    <Chip key={tag} label={tag} size="small" />
  ))}
</div>

// 統計情報
<div className={classes.statsContainer}>
  {layout.downloads && (
    <Typography variant="body2">
      {layout.downloads} downloads
    </Typography>
  )}
  {layout.rating && (
    <Typography variant="body2">
      ★ {layout.rating}/5
    </Typography>
  )}
</div>
```

---

## 5. インストール状態管理

### 5.1 ExtensionCatalog

拡張機能のインストール状態を管理:

```typescript
// packages/suite-base/src/context/ExtensionCatalogContext.ts

export type ExtensionCatalog = Immutable<{
  // インストール操作
  downloadExtension: (url: string) => Promise<Uint8Array>;
  installExtensions: (
    namespace: ExtensionNamespace,
    data: Uint8Array[],
  ) => Promise<InstallExtensionsResult[]>;
  uninstallExtension: (namespace: ExtensionNamespace, id: string) => Promise<void>;

  // 状態管理
  isExtensionInstalled: (extensionId: string) => boolean;
  markExtensionAsInstalled: (extensionId: string) => void;
  unMarkExtensionAsInstalled: (extensionId: string) => void;

  // 状態更新
  mergeState: (info: ExtensionInfo, contributionPoints: ContributionPoints) => void;
  refreshAllExtensions: () => Promise<void>;

  // インストール済み拡張機能
  loadedExtensions: Set<string>;
  installedExtensions: ExtensionInfo[];
  installedPanels: Record<string, RegisteredPanel>;
  installedMessageConverters: readonly RegisterMessageConverterArgs<unknown>[];
  installedTopicAliasFunctions: TopicAliasFunctions;
  installedCameraModels: CameraModelsMap;
  panelSettings: Record<string, PanelSettings<unknown>>;
}>;
```

### 5.2 複数バージョンのインストール状態

各バージョンが独立した状態を持つ想定:

```typescript
// 例: 同じ拡張機能の異なるバージョンがインストールされている
installedExtensions = [
  {
    id: "foxglove.turtlesim@1.0.0",
    name: "turtlesim",
    version: "1.0.0",
    installed: true,
    enabled: true,
    // ...
  },
  {
    id: "foxglove.turtlesim@2.1.3",
    name: "turtlesim",
    version: "2.1.3",
    installed: true,
    enabled: false, // インストールされているが無効化
    // ...
  },
];
```

---

## 6. VERSIONタブで実装すべき要件

### 6.1 機能要件

VERSIONタブでは以下の情報を表示・操作できる必要があります:

#### 表示要件

1. **バージョン一覧**

   - すべての利用可能なバージョンを表示
   - 最新バージョンを明示的にマーク
   - 公開日時を表示
   - バージョンを新しい順にソート

2. **インストール状態表示**

   - 各バージョンがインストール済みかどうかを視覚的に表示
   - インストール済みバージョンには「Installed」バッジ
   - 有効化されているバージョンには「Active」バッジ
   - 最新バージョンには「Latest」バッジ

3. **追加情報**
   - ファイルサイズ
   - 安定性レベル (stable/beta/alpha/experimental)
   - 互換性情報 (minLichtblickVersion)
   - 非推奨マーク (deprecated)

#### 操作要件

1. **バージョンごとのインストール/アンインストール**

   - 各バージョンに個別のInstall/Uninstallボタン
   - 複数バージョンを同時にインストール可能
   - インストール中の状態表示 (ローディング)

2. **有効化/無効化切り替え**

   - インストール済みバージョンの有効/無効切り替え
   - 1つのバージョンのみアクティブにできる制限（任意）

3. **詳細情報へのアクセス**
   - 各バージョンの変更履歴 (CHANGELOG) へのリンク
   - バージョン固有のREADMEへのアクセス

### 6.2 UIデザイン案

```
┌─────────────────────────────────────────────┐
│ VERSION                                      │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ v2.1.3  [Latest]  [Installed] [Active]  │ │
│ │ Published: 2025-09-28                    │ │
│ │ Size: 2.3 MB • Stable                    │ │
│ │                                          │ │
│ │ [View Changelog] [Disable]               │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ v2.0.1  [Installed]                     │ │
│ │ Published: 2025-08-15                    │ │
│ │ Size: 2.1 MB • Stable                    │ │
│ │                                          │ │
│ │ [View Changelog] [Enable] [Uninstall]   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ v1.0.0                                  │ │
│ │ Published: 2025-05-10                    │ │
│ │ Size: 1.8 MB • Stable                    │ │
│ │                                          │ │
│ │ [View Changelog] [Install]               │ │
│ └─────────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

### 6.3 データフロー

```
1. VERSIONタブ選択
   ↓
2. baseId から全バージョン情報を取得
   HybridExtensionLoader.getExtensionVersions(baseId)
   ↓
3. インストール済みバージョンを確認
   ExtensionCatalog.installedExtensions でフィルタ
   ↓
4. バージョン一覧を表示
   - バージョン番号
   - 公開日
   - インストール状態
   - 最新フラグ
   ↓
5. ユーザー操作
   - Install → ExtensionCatalog.installExtensions()
   - Uninstall → ExtensionCatalog.uninstallExtension()
   - Enable/Disable → 新規実装が必要
```

### 6.4 技術的考慮事項

#### データ取得

```typescript
// baseId から全バージョンを取得
const loader = new HybridExtensionLoader();
const allVersions = await loader.getExtensionVersions(extension.baseId);

// インストール状態とマージ
const versionsWithStatus = allVersions.map(version => ({
  ...version,
  installed: catalog.isExtensionInstalled(version.id),
  enabled: /* 新規実装: 有効化状態の確認 */,
}));

// 公開日でソート（新しい順）
versionsWithStatus.sort((a, b) =>
  new Date(b.publishedDate ?? 0).getTime() -
  new Date(a.publishedDate ?? 0).getTime()
);
```

#### バージョンごとのインストール

```typescript
// 特定バージョンのインストール
const installVersion = async (version: string) => {
  // 1. 該当バージョンのデータを取得
  const extensionData = await loader.getExtension(baseId, version);

  // 2. foxe URL からダウンロード
  const data = await catalog.downloadExtension(extensionData.foxe);

  // 3. インストール
  await catalog.installExtensions("local", [data]);
};
```

#### 既存コンポーネントの再利用

現在実装済みの `VersionAccordion` コンポーネントを参考にできます:

```typescript
// packages/suite-base/src/components/shared/MarketplaceUI/VersionAccordion.tsx

// バージョン情報の表示
interface VersionAccordionProps {
  versions: VersionInfo[];
  onViewDetails: (version: string) => void;
  onInstall: (version: string) => void;
  onUninstall: (version: string) => void;
  maxShown?: number;
  loading?: boolean;
}
```

### 6.5 実装の優先順位

#### Phase 1: 基本表示 (必須)

- ✅ バージョン一覧の表示
- ✅ インストール状態の表示
- ✅ 最新バージョンのマーク
- ✅ 公開日の表示

#### Phase 2: インストール操作 (必須)

- ✅ バージョン別Install/Uninstallボタン
- ✅ インストール中のローディング表示
- ✅ エラーハンドリング

#### Phase 3: 追加情報 (推奨)

- ⭕ ファイルサイズ表示
- ⭕ 安定性レベル表示
- ⭕ 互換性情報
- ⭕ 非推奨マーク

#### Phase 4: 高度な機能 (オプション)

- 🔲 有効化/無効化の切り替え
- 🔲 バージョン固有のCHANGELOG表示
- 🔲 依存関係の表示
- 🔲 バージョン比較機能

---

## 7. 参考資料

### 関連ファイル

#### コアデータ型

- `packages/suite-base/src/types/Extensions.ts` - 拡張機能の基本型
- `packages/suite-base/src/types/HybridExtension.ts` - ハイブリッドバージョン型
- `packages/suite-base/src/context/ExtensionMarketplaceContext.ts` - マーケットプレイスコンテキスト
- `packages/suite-base/src/context/LayoutMarketplaceContext.ts` - レイアウトコンテキスト

#### 詳細画面

- `packages/suite-base/src/components/ExtensionsSettings/ExtensionDetail.tsx` - 拡張機能詳細
- `packages/suite-base/src/components/LayoutSettings/LayoutDetail.tsx` - レイアウト詳細
- `packages/suite-base/src/components/shared/MarketplaceUI/MarketplaceDetailBase.tsx` - 共通基底

#### バージョン管理

- `packages/suite-base/src/services/extensions/VersionManager.ts` - バージョンマネージャー
- `packages/suite-base/src/util/marketplace/HybridExtensionLoader.ts` - データローダー
- `packages/suite-base/src/components/shared/MarketplaceUI/VersionAccordion.tsx` - バージョンアコーディオン

#### インストール管理

- `packages/suite-base/src/context/ExtensionCatalogContext.ts` - 拡張機能カタログ
- `packages/suite-base/src/context/LayoutCatalogContext.ts` - レイアウトカタログ

### ドキュメント

- `docs/marketplace/planning/phase8-version-tab-implementation-plan.md` - VERSIONタブ実装計画
- `docs/marketplace/planning/marketplace-api-specification.md` - マーケットプレイスAPI仕様
- `docs/marketplace/implementation/marketplace-detail-implementation.md` - 詳細画面実装レポート
- `docs/marketplace/INCONSISTENCIES_RESOLUTION.md` - 仕様不整合解決方針

---

## 8. 次のステップ

このドキュメントに基づいて、次のステップでは以下を行います:

1. **VERSIONタブUIコンポーネントの設計**

   - 詳細なUIモックアップの作成
   - コンポーネント階層の設計
   - 状態管理の設計

2. **データフェッチング戦略の策定**

   - バージョン情報の取得方法
   - キャッシング戦略
   - エラーハンドリング

3. **既存コンポーネントとの統合計画**

   - ExtensionDetail への組み込み
   - LayoutDetail への組み込み
   - MarketplaceDetailBase の拡張

4. **実装タスクの詳細化**
   - 各機能の実装順序
   - テスト計画
   - リリース計画

---

**作成者**: GitHub Copilot
**更新履歴**:

- 2025-10-01: 初版作成 - 現在の仕様を包括的にまとめ
