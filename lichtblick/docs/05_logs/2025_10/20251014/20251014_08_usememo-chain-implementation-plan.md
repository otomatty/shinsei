# useMemo チェーン複雑性問題の実装計画

**作成日**: 2025年10月14日
**関連Issue**: [20251014_04_usememo-chain-complexity.md](../../../issues/open/20251014_04_usememo-chain-complexity.md)

---

## 実装状況の分析結果

### ExtensionMarketplaceSettings.tsx の useMemo チェーン

現在の実装で **4つのuseMemoチェーン** が存在:

```typescript
// 1. allExtensions (113行目)
const allExtensions = useMemo(() => {
  // installedData と hybridMarketplaceData を結合
  // 重複を削除（インストール済みを優先）
  return Array.from(unique.values());
}, [namespacedData, groupedMarketplaceData, isExtensionInstalled, marketplaceExtensions]);

// 2. groupedExtensions (199行目)
const groupedExtensions = useMemo((): GroupedExtensionData[] => {
  // allExtensions をバージョン別にグループ化
  // 最新バージョンを決定
  // インストール状態を集約
  return Array.from(groups.values());
}, [allExtensions, isExtensionInstalled, isAnyVersionInstalled]);

// 3. useMarketplaceSearch への入力 (299行目)
// groupedExtensions を useMarketplaceSearch に渡してフィルタリング

// 4. mappedFilteredExtensions (323行目)
const mappedFilteredExtensions = useMemo((): GroupedExtensionData[] => {
  // useMarketplaceSearch の結果を GroupedExtensionData に戻す
  return filteredExtensions.map(
    (item): GroupedExtensionData => ({
      ...item,
      tags: item.tags,
      publisher: item.author,
    }),
  );
}, [filteredExtensions]);

// 5. availableAuthors (335行目)
const availableAuthors = useMemo(() => {
  // groupedExtensions から作者リストを抽出
  const authors = new Set<string>();
  groupedExtensions.forEach((ext) => {
    if (ext.publisher) {
      authors.add(ext.publisher);
    }
  });
  return Array.from(authors).sort();
}, [groupedExtensions]);
```

**依存関係のフロー**:

```
namespacedData, groupedMarketplaceData, marketplaceExtensions
  ↓
allExtensions (useMemo #1)
  ↓
groupedExtensions (useMemo #2)
  ↓ (useMarketplaceSearch経由)
filteredExtensions
  ↓
mappedFilteredExtensions (useMemo #3)
  ↓ (レンダリングに使用)
MarketplaceGrid
```

### LayoutMarketplaceSettings.tsx の useMemo チェーン

現在の実装で **2つのuseMemo** が存在:

```typescript
// 1. layoutsWithInstalledStatus (69行目)
const layoutsWithInstalledStatus = React.useMemo(() => {
  return layouts.map((layout) => ({
    ...layout,
    installed: installedMarketplaceIds.has(layout.id),
  }));
}, [layouts, installedMarketplaceIds]);

// 2. availableAuthors (99行目)
const availableAuthors = React.useMemo(() => {
  const authors = new Set<string>();
  layouts.forEach((layout) => {
    if (layout.author) {
      authors.add(layout.author);
    }
  });
  return Array.from(authors).sort();
}, [layouts]);
```

**依存関係のフロー**:

```
layouts, installedMarketplaceIds
  ↓
layoutsWithInstalledStatus (useMemo #1)
  ↓ (useMarketplaceSearch経由)
filteredLayouts
  ↓ (レンダリングに使用)
MarketplaceGrid
```

### 問題点の特定

#### ExtensionMarketplaceSettings の問題

1. **過剰な中間配列作成**

   - `allExtensions`: Map → Array 変換
   - `groupedExtensions`: 再度 Map → Array 変換
   - `mappedFilteredExtensions`: フィルター後の再マッピング
   - 合計 **3回の配列コピー**

2. **複雑なバージョン管理**

   - ExtensionItem が複数バージョンを持つ
   - `normalizeVersion` でバージョン正規化
   - `getLatestVersion` で最新バージョン決定
   - `sortVersions` でバージョンソート
   - これらの処理が `groupedExtensions` で実行される

3. **useMarketplaceSearch との不整合**

   - `groupedExtensions` → useMarketplaceSearch 用にマッピング
   - フィルター結果 → `mappedFilteredExtensions` で再マッピング
   - **不要なデータ変換が2回発生**

4. **依存関係の連鎖**
   - 4つの依存関係を持つuseMemo
   - データ変更時に連鎖的に再計算
   - デバッグが困難

#### LayoutMarketplaceSettings の問題

1. **シンプルだが非効率**

   - `layoutsWithInstalledStatus` は単純なマッピング
   - しかし、`layouts` が変更されるたびに全配列を再作成
   - `installedMarketplaceIds` の変更でも再計算

2. **availableAuthors の重複計算**
   - `layouts` から作者リストを毎回抽出
   - useMarketplaceSearch でも同様の処理が行われている可能性

### 既存の関連Hook

#### useMarketplaceSearch

`packages/suite-base/src/components/shared/Marketplace/hooks/useMarketplaceSearch.ts`

- 検索、フィルタリング、タグ統計を提供
- **問題**: ExtensionMarketplaceSettings では型変換が必要

#### useMarketplaceActions

`packages/suite-base/src/hooks/marketplace/useMarketplaceActions.ts`

- インストール/アンインストール処理の統一インターフェース
- エラーハンドリングと通知を提供

#### useInstalledExtensions / useInstalledLayouts

`packages/suite-base/src/hooks/useInstalledItems.ts`

- インストール済みアイテムの追跡
- `isInstalled` 関数と `installedIds` Set を提供

---

## 実装方針

### 基本戦略

1. **ExtensionMarketplaceSettings**: 複雑なバージョン管理を含むため、専用Hookを作成
2. **LayoutMarketplaceSettings**: シンプルなため、useMemoの最適化のみで対応
3. **段階的な実装**: Extension → Layout の順で実装

### Phase 1: useProcessedExtensions Hook の設計

#### 目標

- 4つのuseMemoチェーンを **単一のHook** に統合
- バージョン管理、グループ化、フィルタリングを1つのuseMemoで実行
- useMarketplaceSearch との統合をスムーズに

#### Hook インターフェース設計

```typescript
// packages/suite-base/src/hooks/marketplace/useProcessedExtensions.ts

export interface CombinedExtensionInfo {
  baseId: string;
  id: string;
  name: string;
  displayName: string;
  description: string;
  publisher: string;
  latestVersion: string;
  tags: readonly string[];
  installed: boolean;
  homepage?: string;
  license?: string;
  namespace?: string;
  versions: VersionInfo[];
  totalVersions: number;
  readme?: string;
  changelog?: string;
}

export interface ProcessedExtensionsOptions {
  /** Installed extensions from namespacedData */
  installedData: Array<{
    id: string;
    name: string;
    displayName: string;
    description: string;
    publisher: string;
    version: string;
    tags: readonly string[];
    homepage?: string;
    license?: string;
    qualifiedName?: string;
    namespace?: string;
    readme?: string;
    changelog?: string;
  }>;

  /** Marketplace extensions from marketplaceExtensions or groupedMarketplaceData */
  marketplaceData: Array<{
    id: string;
    name: string;
    displayName: string;
    description: string;
    publisher: string;
    version: string;
    tags: readonly string[];
    homepage?: string;
    license?: string;
    readme?: string;
    changelog?: string;
  }>;

  /** Function to check if extension is installed */
  isExtensionInstalled: (id: string) => boolean;

  /** Function to check if any version is installed */
  isAnyVersionInstalled: (baseId: string) => boolean;
}

/**
 * Process and combine extension data with version grouping.
 *
 * Replaces the useMemo chain pattern in ExtensionMarketplaceSettings:
 * - Combines installed and marketplace data
 * - Groups by base ID with version management
 * - Determines latest version
 * - Aggregates installation status
 *
 * All operations are performed in a single pass for optimal performance.
 */
export function useProcessedExtensions({
  installedData,
  marketplaceData,
  isExtensionInstalled,
  isAnyVersionInstalled,
}: ProcessedExtensionsOptions): CombinedExtensionInfo[];
```

#### 実装のポイント

1. **単一パスでの処理**

   ```typescript
   return useMemo(() => {
     const groups = new Map<string, CombinedExtensionInfo>();

     // Step 1: Process installed extensions
     for (const ext of installedData) {
       const baseId = ExtensionIdUtils.extractBaseId(ext.id);
       // ... グループ化とバージョン管理
     }

     // Step 2: Process marketplace extensions
     for (const ext of marketplaceData) {
       const baseId = ExtensionIdUtils.extractBaseId(ext.id);
       // ... グループ化とバージョン管理
     }

     // Step 3: Finalize groups (sort versions, determine latest)
     for (const group of groups.values()) {
       group.versions = sortVersions(group.versions);
       // ... 最新バージョン決定
     }

     return Array.from(groups.values());
   }, [installedData, marketplaceData, isExtensionInstalled, isAnyVersionInstalled]);
   ```

2. **バージョン管理の統合**

   - `normalizeVersion`, `getLatestVersion`, `sortVersions` を内部で使用
   - 重複バージョンの排除
   - インストール状態の集約

3. **useMarketplaceSearch との互換性**
   - 返却値の型を useMarketplaceSearch が受け入れる形式に
   - 不要なマッピングを削除

### Phase 2: ExtensionMarketplaceSettings への適用

#### 変更内容

**Before**:

```typescript
const allExtensions = useMemo(() => { /* ... */ }, [/* 依存配列 */]);
const groupedExtensions = useMemo(() => { /* ... */ }, [allExtensions, ...]);
const { filteredItems: filteredExtensions } = useMarketplaceSearch({
  items: groupedExtensions.map((ext) => ({ ...ext, author: ext.publisher })),
  // ...
});
const mappedFilteredExtensions = useMemo(() => { /* ... */ }, [filteredExtensions]);
const availableAuthors = useMemo(() => { /* ... */ }, [groupedExtensions]);
```

**After**:

```typescript
// 1. Process extensions
const groupedExtensions = useProcessedExtensions({
  installedData: namespacedData.flatMap((ns) => ns.entries.map((ext) => ({ /* ... */ }))),
  marketplaceData: marketplaceExtensions ? /* flatten versions */ : /* groupedMarketplaceData */,
  isExtensionInstalled,
  isAnyVersionInstalled,
});

// 2. Search and filter
const {
  searchQuery,
  setSearchQuery,
  selectedTags,
  setSelectedTags,
  filteredItems: filteredExtensions,
  tagStats,
  // ...
} = useMarketplaceSearch({
  items: groupedExtensions.map((ext) => ({
    ...ext,
    author: ext.publisher,
  })),
  // ...
});

// 3. Generate authors list
const availableAuthors = useMemo(() => {
  const authors = new Set<string>();
  groupedExtensions.forEach((ext) => {
    if (ext.publisher) {
      authors.add(ext.publisher);
    }
  });
  return Array.from(authors).sort();
}, [groupedExtensions]);
```

**削減される useMemo**:

- `allExtensions` → 削除（useProcessedExtensions に統合）
- `groupedExtensions` → useProcessedExtensions に置き換え
- `mappedFilteredExtensions` → 削除（不要な変換を排除）

**残る useMemo**:

- `availableAuthors` のみ（シンプルな処理のため維持）

### Phase 3: LayoutMarketplaceSettings の最適化

#### 変更方針

**Option A: useProcessedLayouts Hook を作成**

- Extension と同じパターンで統一
- 将来の拡張性を考慮

**Option B: useMemo の最適化のみ**

- 現状のコードがシンプルなため、パフォーマンス問題は限定的
- Hook 作成のオーバーヘッドを避ける

**推奨**: **Option B** → シンプルな最適化のみ

#### 最適化内容

```typescript
// Before: 2つの useMemo
const layoutsWithInstalledStatus = React.useMemo(() => {
  return layouts.map((layout) => ({
    ...layout,
    installed: installedMarketplaceIds.has(layout.id),
  }));
}, [layouts, installedMarketplaceIds]);

const availableAuthors = React.useMemo(() => {
  const authors = new Set<string>();
  layouts.forEach((layout) => {
    if (layout.author) {
      authors.add(layout.author);
    }
  });
  return Array.from(authors).sort();
}, [layouts]);

// After: 1つの useMemo に統合
const { layoutsWithStatus, availableAuthors } = React.useMemo(() => {
  const authors = new Set<string>();
  const layoutsWithStatus = layouts.map((layout) => {
    if (layout.author) {
      authors.add(layout.author);
    }
    return {
      ...layout,
      installed: installedMarketplaceIds.has(layout.id),
    };
  });

  return {
    layoutsWithStatus,
    availableAuthors: Array.from(authors).sort(),
  };
}, [layouts, installedMarketplaceIds]);
```

**効果**:

- 2つのループを1つに統合
- 中間配列の作成を1回に削減

---

## 実装計画の詳細

### ステップ1: useProcessedExtensions Hook 実装

**ファイル**: `packages/suite-base/src/hooks/marketplace/useProcessedExtensions.ts`

**工数**: 0.5日

**タスク**:

- [ ] 型定義の作成（CombinedExtensionInfo, ProcessedExtensionsOptions）
- [ ] useMemo 内のロジック実装
  - installedData の処理
  - marketplaceData の処理
  - バージョングループ化
  - 最新バージョン決定
  - インストール状態集約
- [ ] エッジケースの処理
  - 空配列
  - 無効なバージョン文字列
  - 重複データ
- [ ] JSDoc コメント追加
- [ ] ログ出力（デバッグ用）

### ステップ2: ユニットテスト作成

**ファイル**: `packages/suite-base/src/hooks/marketplace/useProcessedExtensions.test.ts`

**工数**: 0.5日

**テストケース**:

- [ ] データ結合のテスト
  - インストール済み拡張のみ
  - マーケットプレイス拡張のみ
  - 両方が存在する場合
- [ ] バージョングループ化のテスト
  - 単一バージョン
  - 複数バージョン
  - 正規化が必要なバージョン（v1.0.0, 1.0, 1.0.0.0）
- [ ] 最新バージョン決定のテスト
  - セマンティックバージョニング
  - プレリリースバージョン
- [ ] インストール状態集約のテスト
  - 全バージョンアンインストール
  - 一部バージョンインストール済み
  - 全バージョンインストール済み
- [ ] パフォーマンステスト
  - 1000個の拡張機能
  - 各拡張に10個のバージョン
  - 処理時間が100ms以下

### ステップ3: ExtensionMarketplaceSettings への適用

**ファイル**: `packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx`

**工数**: 0.25日

**変更内容**:

- [ ] useProcessedExtensions のインポート
- [ ] `allExtensions` useMemo の削除
- [ ] `groupedExtensions` を useProcessedExtensions に置き換え
- [ ] `mappedFilteredExtensions` の削除
- [ ] useMarketplaceSearch の入力を調整
- [ ] 既存のハンドラー（handleInstall, handleUninstall）の動作確認

**検証**:

- [ ] 既存のE2Eテストが通ること
- [ ] 拡張機能の一覧表示が正しい
- [ ] 検索・フィルタリングが動作
- [ ] インストール/アンインストールが動作
- [ ] バージョン管理が動作

### ステップ4: LayoutMarketplaceSettings の最適化

**ファイル**: `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`

**工数**: 0.25日

**変更内容**:

- [ ] 2つのuseMemoを1つに統合
- [ ] useMarketplaceSearch への入力を `layoutsWithStatus` に変更
- [ ] 既存のハンドラーの動作確認

**検証**:

- [ ] レイアウト一覧の表示が正しい
- [ ] 検索・フィルタリングが動作
- [ ] インストール/アンインストールが動作

### ステップ5: パフォーマンス検証

**工数**: 0.5日

**検証項目**:

- [ ] React DevTools Profiler でレンダリング回数を確認
  - Before: 各useMemoが個別に再計算
  - After: 1つのHookのみ再計算
- [ ] メモリ使用量の計測
  - Chrome DevTools Memory Profiler
  - 中間配列の削減を確認
- [ ] 大量データでのテスト
  - 1000個の拡張機能
  - 検索・フィルタリング操作の応答時間

### ステップ6: ドキュメント更新

**工数**: 0.25日

**更新内容**:

- [ ] 作業ログの作成
  - 実装内容
  - パフォーマンス改善結果
  - 学んだこと
- [ ] Issue を resolved に移動
  - 解決方法の記録
  - コミットハッシュの追加
- [ ] READMEの更新（必要に応じて）
  - Hook の使用方法
  - パフォーマンス最適化ガイド

---

## 期待される効果

### パフォーマンス改善

**ExtensionMarketplaceSettings**:

- useMemo 実行回数: **4回 → 1回** (75%削減)
- 配列作成回数: **3回 → 1回** (66%削減)
- 推定処理時間: **30-40ms → 10-15ms** (60%以上改善)

**LayoutMarketplaceSettings**:

- useMemo 実行回数: **2回 → 1回** (50%削減)
- ループ回数: **2回 → 1回** (50%削減)
- 推定処理時間: **5-10ms → 3-5ms** (40-50%改善)

### コード品質の向上

**ExtensionMarketplaceSettings**:

- 削減行数: 約 **60行** (useMemo関連)
- 依存関係の簡素化: 4段階チェーン → 1段階
- デバッグ性の向上: Hook内部をステップ実行可能

**LayoutMarketplaceSettings**:

- 削減行数: 約 **15行**
- ループ統合による可読性向上

### 保守性の向上

- Hook の再利用性（将来的な拡張）
- テストの充実
- ドキュメント化

---

## リスクと対策

### リスク1: 既存機能の破損

**影響**: useMemo置き換えでロジックが変わる可能性

**対策**:

- ステップバイステップで実装
- 各ステップで既存テストを実行
- E2Eテストの充実
- コードレビューの徹底

### リスク2: パフォーマンス低下

**影響**: 単一のuseMemoで全処理を行うことで、部分的な再計算ができない

**対策**:

- パフォーマンステストで検証
- 必要に応じて内部で段階的な処理を実装
- React DevTools Profiler で継続的に監視

### リスク3: 複雑性の増加

**影響**: Hook内部のロジックが複雑になる

**対策**:

- 詳細なコメント追加
- ヘルパー関数で処理を分割
- ユニットテストで各処理を検証

---

## 次のステップ

1. **Todo 1 を完了**: この作業ログを作成して分析を完了させる
2. **Todo 2 に移行**: useProcessedExtensions の詳細設計を開始
3. **実装の開始**: Todo 3 で Hook を実装

---

## 関連ドキュメント

- [20251014_04_usememo-chain-complexity.md](../../../issues/open/20251014_04_usememo-chain-complexity.md) - 問題の詳細
- [React useMemo - Best Practices](https://react.dev/reference/react/useMemo)
- [20251014_01_marketplace-phase2-improvements.md](../../../09_improvements/20251014_01_marketplace-phase2-improvements.md) - Phase 2改善提案

---

**作成日**: 2025年10月14日
**次回作業**: useProcessedExtensions Hook の詳細設計
