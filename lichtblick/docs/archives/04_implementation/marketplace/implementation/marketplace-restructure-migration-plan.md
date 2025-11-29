# Marketplace コンポーネント構造改善 移行計画書

## 📋 概要

**目的**: MarketplaceUIディレクトリをMarketplaceに改名し、フラットな構造から階層的な構造に段階的に移行する

**対象**: `/packages/suite-base/src/components/shared/MarketplaceUI/` → `/packages/suite-base/src/components/shared/Marketplace/`

**移行期間**: 5つのフェーズで段階的に実施

**日付**: 2025年10月7日作成

---

## 🎯 移行の目標

1. ディレクトリ名を `MarketplaceUI` → `Marketplace` に変更
2. フラットなファイル構造から階層的な構造に改善
3. コンポーネントの親子関係を明確化
4. 保守性・拡張性の向上
5. 既存機能への影響を最小限に抑える

---

## 📊 現在の構造

```
MarketplaceUI/
├── ActionButtons.style.ts
├── ActionButtons.tsx
├── AdvancedSearchPanel.style.ts
├── AdvancedSearchPanel.tsx
├── CardHeader.tsx
├── index.ts
├── MarketplaceCard.style.ts
├── MarketplaceCard.tsx
├── MarketplaceDetailBase.tsx
├── MarketplaceGrid.style.ts
├── MarketplaceGrid.tsx
├── MarketplaceHeader.style.ts
├── MarketplaceHeader.tsx
├── MarketplaceTitleSection.style.ts
├── MarketplaceTitleSection.tsx
├── TagFilterModeToggle.style.ts
├── TagFilterModeToggle.tsx
├── TagFilterPanel.style.ts
├── TagFilterPanel.tsx
├── TagsDisplay.tsx
├── tagUtils.ts
├── ThumbnailArea.tsx
├── types.ts
├── useMarketplaceSearch.ts
├── VersionAccordion.style.ts
├── VersionAccordion.tsx
├── versionUtils.ts
└── VersionTab/
    ├── index.ts
    ├── utils.ts
    ├── VersionBadge.tsx
    ├── VersionListItem.tsx
    └── VersionTab.tsx
```

---

## 🎨 目標構造

```
Marketplace/
├── index.ts                          # メインエクスポート
├── types.ts                          # 共通型定義
│
├── layouts/                          # レイアウトコンポーネント
│   ├── index.ts
│   ├── MarketplaceGrid/
│   │   ├── index.ts
│   │   ├── MarketplaceGrid.tsx
│   │   └── MarketplaceGrid.style.ts
│   │
│   ├── MarketplaceHeader/           # ヘッダー統合コンポーネント
│   │   ├── index.ts
│   │   ├── MarketplaceHeader.tsx
│   │   ├── MarketplaceHeader.style.ts
│   │   │
│   │   └── components/              # ヘッダー内のサブコンポーネント
│   │       ├── MarketplaceTitleSection.tsx
│   │       ├── MarketplaceTitleSection.style.ts
│   │       ├── TagFilterPanel.tsx
│   │       ├── TagFilterPanel.style.ts
│   │       ├── TagFilterModeToggle.tsx
│   │       ├── TagFilterModeToggle.style.ts
│   │       ├── AdvancedSearchPanel.tsx
│   │       └── AdvancedSearchPanel.style.ts
│   │
│   └── MarketplaceDetailBase/       # 詳細画面ベース
│       ├── index.ts
│       ├── MarketplaceDetailBase.tsx
│       └── MarketplaceDetailBase.style.ts
│
├── card/                            # カードコンポーネント群
│   ├── index.ts
│   └── MarketplaceCard/
│       ├── index.ts
│       ├── MarketplaceCard.tsx
│       ├── MarketplaceCard.style.ts
│       │
│       └── components/              # カード内のサブコンポーネント
│           ├── CardHeader.tsx
│           ├── ThumbnailArea.tsx
│           ├── TagsDisplay.tsx
│           ├── ActionButtons/
│           │   ├── index.ts
│           │   ├── ActionButtons.tsx
│           │   └── ActionButtons.style.ts
│           │
│           └── VersionAccordion/
│               ├── index.ts
│               ├── VersionAccordion.tsx
│               └── VersionAccordion.style.ts
│
├── version/                         # バージョン関連コンポーネント
│   ├── index.ts
│   ├── VersionTab/
│   │   ├── index.ts
│   │   ├── VersionTab.tsx
│   │   │
│   │   └── components/
│   │       ├── VersionBadge.tsx
│   │       ├── VersionListItem.tsx
│   │       └── utils.ts
│   │
│   └── utils/                       # バージョンユーティリティ
│       ├── index.ts
│       └── versionUtils.ts
│
├── hooks/                           # カスタムフック
│   ├── index.ts
│   └── useMarketplaceSearch.ts
│
└── utils/                           # ユーティリティ関数
    ├── index.ts
    └── tagUtils.ts
```

---

## 🚀 段階的移行計画

### Phase 0: 準備フェーズ (30分)

**目標**: ディレクトリ名の変更と基本構造の準備

**作業内容**:

1. ✅ 移行計画書の作成
2. MarketplaceUI → Marketplace にディレクトリをリネーム
3. 新しいディレクトリ構造の作成（空ディレクトリ）
4. インポートパスの一括検索・リスト化

**成果物**:

- [x] 移行計画書 (このドキュメント)
- [ ] 新しいディレクトリ構造
- [ ] インポートパス変更箇所のリスト

**検証**:

- [ ] 既存のインポートパスが動作すること
- [ ] ビルドエラーがないこと

---

### Phase 1: ユーティリティの移行 (1時間)

**目標**: 独立性の高いユーティリティファイルを移行

**対象ファイル**:

- `types.ts` → `Marketplace/types.ts`
- `tagUtils.ts` → `Marketplace/utils/tagUtils.ts`
- `versionUtils.ts` → `Marketplace/version/utils/versionUtils.ts`
- `useMarketplaceSearch.ts` → `Marketplace/hooks/useMarketplaceSearch.ts`

**作業手順**:

#### 1.1 utils/ ディレクトリの作成と移行

```bash
# ディレクトリ作成
mkdir -p Marketplace/utils

# ファイル移動
mv MarketplaceUI/tagUtils.ts Marketplace/utils/
```

**1.1.1 utils/index.ts の作成**

```typescript
// Marketplace/utils/index.ts
export * from "./tagUtils";
```

#### 1.2 version/utils/ の作成と移行

```bash
mkdir -p Marketplace/version/utils
mv MarketplaceUI/versionUtils.ts Marketplace/version/utils/
```

**1.2.1 version/utils/index.ts の作成**

```typescript
// Marketplace/version/utils/index.ts
export * from "./versionUtils";
```

#### 1.3 hooks/ ディレクトリの作成と移行

```bash
mkdir -p Marketplace/hooks
mv MarketplaceUI/useMarketplaceSearch.ts Marketplace/hooks/
```

**1.3.1 hooks/index.ts の作成**

```typescript
// Marketplace/hooks/index.ts
export { useMarketplaceSearch } from "./useMarketplaceSearch";
export type { MarketplaceItem, MarketplaceSearchConfig } from "./useMarketplaceSearch";
```

#### 1.4 types.ts の配置

```bash
cp MarketplaceUI/types.ts Marketplace/types.ts
```

#### 1.5 内部インポートパスの更新

**useMarketplaceSearch.ts 内のインポート更新**:

```typescript
// Before
import { calculateTagStats, ... } from "./tagUtils";
import type { MarketplaceTab, ... } from "./types";

// After
import { calculateTagStats, ... } from "../utils/tagUtils";
import type { MarketplaceTab, ... } from "../types";
```

**成果物**:

- [ ] `Marketplace/utils/` ディレクトリとファイル
- [ ] `Marketplace/version/utils/` ディレクトリとファイル
- [ ] `Marketplace/hooks/` ディレクトリとファイル
- [ ] `Marketplace/types.ts`
- [ ] 各ディレクトリの `index.ts`

**検証**:

- [ ] ユーティリティ関数が正しくエクスポートされること
- [ ] 型定義が正しくインポートできること
- [ ] 既存のインポート元から警告が出ないこと

---

### Phase 2: バージョン関連コンポーネントの移行 (1時間)

**目標**: VersionTab関連コンポーネントを整理

**対象ファイル**:

- `VersionTab/` → `Marketplace/version/VersionTab/`
- `VersionAccordion.tsx` → `Marketplace/card/MarketplaceCard/components/VersionAccordion/`

**作業手順**:

#### 2.1 VersionTab の移行

```bash
mkdir -p Marketplace/version/VersionTab/components
mv MarketplaceUI/VersionTab/VersionTab.tsx Marketplace/version/VersionTab/
mv MarketplaceUI/VersionTab/VersionBadge.tsx Marketplace/version/VersionTab/components/
mv MarketplaceUI/VersionTab/VersionListItem.tsx Marketplace/version/VersionTab/components/
mv MarketplaceUI/VersionTab/utils.ts Marketplace/version/VersionTab/components/
```

#### 2.2 VersionTab/index.ts の作成

```typescript
// Marketplace/version/VersionTab/index.ts
export { VersionTab } from "./VersionTab";
export { VersionBadge } from "./components/VersionBadge";
export { VersionListItem } from "./components/VersionListItem";
export * from "./components/utils";
```

#### 2.3 version/index.ts の作成

```typescript
// Marketplace/version/index.ts
export * from "./VersionTab";
export * from "./utils";
```

#### 2.4 内部インポートパスの更新

```typescript
// VersionTab.tsx 内
// Before
import { VersionListItem } from "./VersionListItem";
import { sortVersionsByDate } from "./utils";

// After
import { VersionListItem } from "./components/VersionListItem";
import { sortVersionsByDate } from "./components/utils";
```

**成果物**:

- [ ] `Marketplace/version/VersionTab/` ディレクトリ構造
- [ ] 更新された `index.ts` ファイル
- [ ] インポートパスの修正

**検証**:

- [ ] VersionTab コンポーネントが正しく動作すること
- [ ] サブコンポーネントが正しくインポートされること

---

### Phase 3: カード関連コンポーネントの移行 (2時間)

**目標**: MarketplaceCard と関連サブコンポーネントを整理

**対象ファイル**:

- `MarketplaceCard.tsx` → `Marketplace/card/MarketplaceCard/`
- `CardHeader.tsx` → `Marketplace/card/MarketplaceCard/components/`
- `ThumbnailArea.tsx` → `Marketplace/card/MarketplaceCard/components/`
- `TagsDisplay.tsx` → `Marketplace/card/MarketplaceCard/components/`
- `ActionButtons.tsx` → `Marketplace/card/MarketplaceCard/components/ActionButtons/`
- `VersionAccordion.tsx` → `Marketplace/card/MarketplaceCard/components/VersionAccordion/`

**作業手順**:

#### 3.1 カードディレクトリ構造の作成

```bash
mkdir -p Marketplace/card/MarketplaceCard/components/ActionButtons
mkdir -p Marketplace/card/MarketplaceCard/components/VersionAccordion
```

#### 3.2 メインコンポーネントの移行

```bash
mv MarketplaceUI/MarketplaceCard.tsx Marketplace/card/MarketplaceCard/
mv MarketplaceUI/MarketplaceCard.style.ts Marketplace/card/MarketplaceCard/
```

#### 3.3 サブコンポーネントの移行

```bash
# シンプルなサブコンポーネント
mv MarketplaceUI/CardHeader.tsx Marketplace/card/MarketplaceCard/components/
mv MarketplaceUI/ThumbnailArea.tsx Marketplace/card/MarketplaceCard/components/
mv MarketplaceUI/TagsDisplay.tsx Marketplace/card/MarketplaceCard/components/

# ActionButtons
mv MarketplaceUI/ActionButtons.tsx Marketplace/card/MarketplaceCard/components/ActionButtons/
mv MarketplaceUI/ActionButtons.style.ts Marketplace/card/MarketplaceCard/components/ActionButtons/

# VersionAccordion
mv MarketplaceUI/VersionAccordion.tsx Marketplace/card/MarketplaceCard/components/VersionAccordion/
mv MarketplaceUI/VersionAccordion.style.ts Marketplace/card/MarketplaceCard/components/VersionAccordion/
```

#### 3.4 ActionButtons/index.ts の作成

```typescript
// Marketplace/card/MarketplaceCard/components/ActionButtons/index.ts
export { default } from "./ActionButtons";
```

#### 3.5 VersionAccordion/index.ts の作成

```typescript
// Marketplace/card/MarketplaceCard/components/VersionAccordion/index.ts
export { default } from "./VersionAccordion";
```

#### 3.6 MarketplaceCard/index.ts の作成

```typescript
// Marketplace/card/MarketplaceCard/index.ts
export { default as MarketplaceCard } from "./MarketplaceCard";
export type { MarketplaceCardProps, VersionInfo } from "./MarketplaceCard";
```

#### 3.7 card/index.ts の作成

```typescript
// Marketplace/card/index.ts
export * from "./MarketplaceCard";
```

#### 3.8 MarketplaceCard.tsx 内のインポートパス更新

```typescript
// Before
import ActionButtons from "./ActionButtons";
import { CardHeader } from "./CardHeader";
import { useStyles } from "./MarketplaceCard.style";
import { TagsDisplay } from "./TagsDisplay";
import { ThumbnailArea } from "./ThumbnailArea";
import VersionAccordion from "./VersionAccordion";

// After
import ActionButtons from "./components/ActionButtons";
import { CardHeader } from "./components/CardHeader";
import { useStyles } from "./MarketplaceCard.style";
import { TagsDisplay } from "./components/TagsDisplay";
import { ThumbnailArea } from "./components/ThumbnailArea";
import VersionAccordion from "./components/VersionAccordion";
```

#### 3.9 サブコンポーネント内のインポートパス更新

**CardHeader.tsx**:

```typescript
// Before
import { useStyles } from "./MarketplaceCard.style";
import { formatVersionForDisplay } from "./versionUtils";

// After
import { useStyles } from "../MarketplaceCard.style";
import { formatVersionForDisplay } from "../../../version/utils/versionUtils";
```

**TagsDisplay.tsx**, **ThumbnailArea.tsx** も同様に更新

**ActionButtons.tsx**:

```typescript
// Before
import { useStyles } from "./ActionButtons.style";

// After (変更なし - 同じディレクトリ内)
import { useStyles } from "./ActionButtons.style";
```

**VersionAccordion.tsx**:

```typescript
// Before
import ActionButtons from "./ActionButtons";
import { VersionInfo } from "./MarketplaceCard";
import { useStyles } from "./VersionAccordion.style";
import { formatVersionForDisplay } from "./versionUtils";

// After
import ActionButtons from "../ActionButtons";
import { VersionInfo } from "../../MarketplaceCard";
import { useStyles } from "./VersionAccordion.style";
import { formatVersionForDisplay } from "../../../../version/utils/versionUtils";
```

**成果物**:

- [ ] `Marketplace/card/MarketplaceCard/` ディレクトリ構造
- [ ] 全サブコンポーネントの配置
- [ ] 全インポートパスの更新
- [ ] 各レベルの `index.ts`

**検証**:

- [ ] MarketplaceCard が正しくレンダリングされること
- [ ] 全サブコンポーネントが正しく表示されること
- [ ] アクションボタンとアコーディオンが動作すること
- [ ] スタイルが正しく適用されること

---

### Phase 4: レイアウト関連コンポーネントの移行 (2時間)

**目標**: ヘッダー、グリッド、詳細画面など大型コンポーネントを移行

**対象ファイル**:

- `MarketplaceGrid.tsx` → `Marketplace/layouts/MarketplaceGrid/`
- `MarketplaceHeader.tsx` → `Marketplace/layouts/MarketplaceHeader/`
- `MarketplaceDetailBase.tsx` → `Marketplace/layouts/MarketplaceDetailBase/`
- Header関連サブコンポーネント

**作業手順**:

#### 4.1 MarketplaceGrid の移行

```bash
mkdir -p Marketplace/layouts/MarketplaceGrid
mv MarketplaceUI/MarketplaceGrid.tsx Marketplace/layouts/MarketplaceGrid/
mv MarketplaceUI/MarketplaceGrid.style.ts Marketplace/layouts/MarketplaceGrid/
```

**4.1.1 MarketplaceGrid/index.ts**:

```typescript
// Marketplace/layouts/MarketplaceGrid/index.ts
export { default as MarketplaceGrid } from "./MarketplaceGrid";
export type { MarketplaceGridProps } from "./MarketplaceGrid";
```

#### 4.2 MarketplaceHeader の移行

```bash
mkdir -p Marketplace/layouts/MarketplaceHeader/components
mv MarketplaceUI/MarketplaceHeader.tsx Marketplace/layouts/MarketplaceHeader/
mv MarketplaceUI/MarketplaceHeader.style.ts Marketplace/layouts/MarketplaceHeader/

# サブコンポーネント
mv MarketplaceUI/MarketplaceTitleSection.tsx Marketplace/layouts/MarketplaceHeader/components/
mv MarketplaceUI/MarketplaceTitleSection.style.ts Marketplace/layouts/MarketplaceHeader/components/
mv MarketplaceUI/TagFilterPanel.tsx Marketplace/layouts/MarketplaceHeader/components/
mv MarketplaceUI/TagFilterPanel.style.ts Marketplace/layouts/MarketplaceHeader/components/
mv MarketplaceUI/TagFilterModeToggle.tsx Marketplace/layouts/MarketplaceHeader/components/
mv MarketplaceUI/TagFilterModeToggle.style.ts Marketplace/layouts/MarketplaceHeader/components/
mv MarketplaceUI/AdvancedSearchPanel.tsx Marketplace/layouts/MarketplaceHeader/components/
mv MarketplaceUI/AdvancedSearchPanel.style.ts Marketplace/layouts/MarketplaceHeader/components/
```

**4.2.1 MarketplaceHeader/index.ts**:

```typescript
// Marketplace/layouts/MarketplaceHeader/index.ts
export { default as MarketplaceHeader } from "./MarketplaceHeader";
export type { MarketplaceHeaderProps } from "./MarketplaceHeader";

// サブコンポーネントもエクスポート（必要に応じて）
export { default as MarketplaceTitleSection } from "./components/MarketplaceTitleSection";
export { default as TagFilterPanel } from "./components/TagFilterPanel";
export { default as TagFilterModeToggle } from "./components/TagFilterModeToggle";
export { default as AdvancedSearchPanel } from "./components/AdvancedSearchPanel";
```

**4.2.2 MarketplaceHeader.tsx 内のインポート更新**:

```typescript
// Before
import AdvancedSearchPanel, { type AdvancedSearchOptions } from "./AdvancedSearchPanel";
import { useStyles } from "./MarketplaceHeader.style";
import MarketplaceTitleSection from "./MarketplaceTitleSection";
import TagFilterPanel from "./TagFilterPanel";
import type { MarketplaceTab, SearchSuggestion, TabConfig, TagFilterMode, TagStats } from "./types";

// After
import AdvancedSearchPanel, { type AdvancedSearchOptions } from "./components/AdvancedSearchPanel";
import { useStyles } from "./MarketplaceHeader.style";
import MarketplaceTitleSection from "./components/MarketplaceTitleSection";
import TagFilterPanel from "./components/TagFilterPanel";
import type {
  MarketplaceTab,
  SearchSuggestion,
  TabConfig,
  TagFilterMode,
  TagStats,
} from "../../types";
```

**4.2.3 各サブコンポーネントのインポート更新**:

全てのサブコンポーネント内で:

```typescript
// Before
import { useStyles } from "./XXX.style";

// After (変更なし - 同じディレクトリ)
import { useStyles } from "./XXX.style";
```

型定義のインポート:

```typescript
// Before
import type { ... } from "./types";

// After
import type { ... } from "../../../types";
```

#### 4.3 MarketplaceDetailBase の移行

```bash
mkdir -p Marketplace/layouts/MarketplaceDetailBase
mv MarketplaceUI/MarketplaceDetailBase.tsx Marketplace/layouts/MarketplaceDetailBase/
```

**4.3.1 MarketplaceDetailBase/index.ts**:

```typescript
// Marketplace/layouts/MarketplaceDetailBase/index.ts
export { default as MarketplaceDetailBase } from "./MarketplaceDetailBase";
export type { MarketplaceDetailBaseProps } from "./MarketplaceDetailBase";
```

#### 4.4 layouts/index.ts の作成

```typescript
// Marketplace/layouts/index.ts
export * from "./MarketplaceGrid";
export * from "./MarketplaceHeader";
export * from "./MarketplaceDetailBase";
```

**成果物**:

- [ ] `Marketplace/layouts/` ディレクトリ構造
- [ ] 全レイアウトコンポーネントの移行
- [ ] ヘッダーサブコンポーネントの整理
- [ ] 全インポートパスの更新

**検証**:

- [ ] MarketplaceHeader が正しく表示されること
- [ ] タブ切り替え、検索、フィルター機能が動作すること
- [ ] MarketplaceGrid が正しくアイテムを表示すること
- [ ] MarketplaceDetailBase が正しくレンダリングされること

---

### Phase 5: メインエクスポートとインポートパスの更新 (2時間)

**目標**: メインの `index.ts` を更新し、全ての外部インポートパスを修正

**作業内容**:

#### 5.1 Marketplace/index.ts の作成

```typescript
// Marketplace/index.ts

/**
 * Common marketplace components
 * Design system shared between Extension and Layout marketplaces
 */

// Types
export type * from "./types";

// Layouts
export * from "./layouts";

// Card
export * from "./card";

// Version
export * from "./version";

// Hooks
export * from "./hooks";

// Utils
export * from "./utils";

// Legacy exports for backward compatibility (optional)
export { useMarketplaceSearch } from "./hooks/useMarketplaceSearch";
export type { MarketplaceItem, MarketplaceSearchConfig } from "./hooks/useMarketplaceSearch";
```

#### 5.2 外部ファイルのインポートパス更新

**検索対象**:

```bash
# MarketplaceUI を使用している全ファイルを検索
grep -r "from.*MarketplaceUI" packages/suite-base/src --include="*.ts" --include="*.tsx"
```

**主要な更新箇所**:

1. **ExtensionMarketplaceSettings.tsx**:

```typescript
// Before
import {
  MarketplaceCard,
  MarketplaceGrid,
  MarketplaceHeader,
  VersionInfo,
  useMarketplaceSearch,
} from "@lichtblick/suite-base/components/shared/MarketplaceUI";
import {
  generateBaseId,
  getLatestVersion,
  sortVersions,
  normalizeVersion,
} from "@lichtblick/suite-base/components/shared/MarketplaceUI/versionUtils";

// After
import {
  MarketplaceCard,
  MarketplaceGrid,
  MarketplaceHeader,
  VersionInfo,
  useMarketplaceSearch,
} from "@lichtblick/suite-base/components/shared/Marketplace";
import {
  generateBaseId,
  getLatestVersion,
  sortVersions,
  normalizeVersion,
} from "@lichtblick/suite-base/components/shared/Marketplace/version/utils";
```

2. **LayoutMarketplaceSettings.tsx**:

```typescript
// Before
import {
  MarketplaceCard,
  MarketplaceGrid,
  MarketplaceHeader,
  useMarketplaceSearch,
} from "@lichtblick/suite-base/components/shared/MarketplaceUI";

// After
import {
  MarketplaceCard,
  MarketplaceGrid,
  MarketplaceHeader,
  useMarketplaceSearch,
} from "@lichtblick/suite-base/components/shared/Marketplace";
```

3. **ExtensionDetail.tsx** (もし使用していれば):

```typescript
// Before
import { MarketplaceDetailBase } from "@lichtblick/suite-base/components/shared/MarketplaceUI";

// After
import { MarketplaceDetailBase } from "@lichtblick/suite-base/components/shared/Marketplace";
```

#### 5.3 ドキュメント内の参照更新

**対象ドキュメント**:

- `docs/marketplace/**/*.md`
- `README.md`
- コード内のコメント

**検索と更新**:

```bash
# ドキュメント内の MarketplaceUI 参照を検索
grep -r "MarketplaceUI" docs/ --include="*.md"

# 全て Marketplace に置換
```

#### 5.4 旧ディレクトリの削除

```bash
# 全ファイルが移行されたことを確認後
rm -rf packages/suite-base/src/components/shared/MarketplaceUI
```

**成果物**:

- [ ] 完全な `Marketplace/index.ts`
- [ ] 全外部インポートパスの更新
- [ ] ドキュメントの更新
- [ ] 旧ディレクトリの削除

**検証**:

- [ ] 全てのビルドが成功すること
- [ ] Extension Marketplace が正常に動作すること
- [ ] Layout Marketplace が正常に動作すること
- [ ] 型エラーがないこと
- [ ] 実行時エラーがないこと

---

## 🧪 テスト計画

各フェーズ後に以下のテストを実施:

### ビルドテスト

```bash
# 開発ビルド
npm run web:serve

# プロダクションビルド
npm run web:build:prod
```

### 機能テスト

#### Extension Marketplace

- [ ] マーケットプレイス一覧表示
- [ ] 検索機能
- [ ] タグフィルター
- [ ] 拡張機能のインストール/アンインストール
- [ ] バージョン切り替え
- [ ] 詳細画面表示

#### Layout Marketplace

- [ ] レイアウト一覧表示
- [ ] 検索機能
- [ ] タグフィルター
- [ ] レイアウトのインストール
- [ ] プレビュー機能

### 型チェック

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

---

## 📝 チェックリスト

### Phase 0: 準備

- [x] 移行計画書の作成
- [ ] ディレクトリリネーム (MarketplaceUI → Marketplace)
- [ ] 新しいディレクトリ構造の作成
- [ ] インポートパスのリスト化

### Phase 1: ユーティリティ

- [ ] `utils/` ディレクトリの作成と移行
- [ ] `version/utils/` ディレクトリの作成と移行
- [ ] `hooks/` ディレクトリの作成と移行
- [ ] `types.ts` の配置
- [ ] 内部インポートパスの更新
- [ ] ビルドテスト

### Phase 2: バージョン関連

- [ ] `version/VersionTab/` の移行
- [ ] サブコンポーネントの整理
- [ ] インポートパスの更新
- [ ] ビルドテスト

### Phase 3: カード関連

- [ ] `card/MarketplaceCard/` ディレクトリ作成
- [ ] メインコンポーネントの移行
- [ ] サブコンポーネントの移行
- [ ] ActionButtons の整理
- [ ] VersionAccordion の整理
- [ ] 全インポートパスの更新
- [ ] ビルドテスト
- [ ] 機能テスト

### Phase 4: レイアウト関連

- [ ] `layouts/MarketplaceGrid/` の移行
- [ ] `layouts/MarketplaceHeader/` の移行
- [ ] ヘッダーサブコンポーネントの整理
- [ ] `layouts/MarketplaceDetailBase/` の移行
- [ ] 全インポートパスの更新
- [ ] ビルドテスト
- [ ] 機能テスト

### Phase 5: 統合と完了

- [ ] メイン `index.ts` の作成
- [ ] 外部インポートパスの更新
- [ ] ドキュメントの更新
- [ ] 旧ディレクトリの削除
- [ ] 最終ビルドテスト
- [ ] 全機能テスト
- [ ] 型チェック
- [ ] Lint チェック

---

## 🔄 ロールバック計画

各フェーズで問題が発生した場合:

1. **Git でコミット単位でロールバック**

```bash
git revert <commit-hash>
```

2. **Phase単位でブランチを作成**

```bash
git checkout -b marketplace-restructure-phase-1
# 作業
git commit -m "Phase 1: ユーティリティの移行"

git checkout -b marketplace-restructure-phase-2
# 作業
git commit -m "Phase 2: バージョン関連の移行"
```

3. **問題箇所の特定と修正**

- ビルドエラーログの確認
- インポートパスの再確認
- 型エラーの修正

---

## 📊 進捗管理

| Phase   | 状態      | 開始日     | 完了日 | 担当者 | 備考           |
| ------- | --------- | ---------- | ------ | ------ | -------------- |
| Phase 0 | ⏳ 進行中 | 2025/10/07 | -      | -      | 計画書作成完了 |
| Phase 1 | 🔜 未着手 | -          | -      | -      | -              |
| Phase 2 | 🔜 未着手 | -          | -      | -      | -              |
| Phase 3 | 🔜 未着手 | -          | -      | -      | -              |
| Phase 4 | 🔜 未着手 | -          | -      | -      | -              |
| Phase 5 | 🔜 未着手 | -          | -      | -      | -              |

**凡例**:

- ✅ 完了
- ⏳ 進行中
- 🔜 未着手
- ⚠️ 問題あり

---

## 📚 参考資料

### 関連ドキュメント

- [Marketplace実装ガイド](./marketplace-detail-implementation.md)
- [レイアウトマーケットプレイス実装ログ](./implementation-log.md)

### 影響を受けるファイル

- `packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx`
- `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`
- `packages/suite-base/src/components/ExtensionsSettings/ExtensionDetail.tsx`

### Git戦略

```bash
# メインブランチから作業ブランチを作成
git checkout -b feature/marketplace-restructure

# 各Phase毎にコミット
git commit -m "Phase 1: ユーティリティの移行"
git commit -m "Phase 2: バージョン関連の移行"
# ...

# 最終的にマージ
git checkout main
git merge feature/marketplace-restructure
```

---

## ✅ 成功基準

1. **ビルド**: エラーなくビルドが完了すること
2. **機能**: 全てのマーケットプレイス機能が正常に動作すること
3. **型安全性**: TypeScriptの型エラーがないこと
4. **コード品質**: Lintエラーがないこと
5. **保守性**: 新しい構造がわかりやすく、拡張しやすいこと

---

## 📞 サポート

問題が発生した場合:

1. このドキュメントのトラブルシューティングセクションを確認
2. Git履歴から変更内容を確認
3. 必要に応じてロールバック

---

**作成日**: 2025年10月7日
**最終更新**: 2025年10月7日
**バージョン**: 1.0.0
