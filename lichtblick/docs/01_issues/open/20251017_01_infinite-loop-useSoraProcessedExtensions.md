# 無限ループ問題: useSoraProcessedExtensions.ts

**発見日**: 2025-10-17
**発見者**: AI Assistant
**重要度**: High
**ステータス**: 未解決

## 概要

マーケットプレイス機能で、`useSoraProcessedExtensions.ts` の `useGroupedExtensionsByVersion` フックが無限ループを引き起こす可能性があります。

## 問題の詳細

### 1. **主たる問題: useMemo の依存関係チェーン**

**ファイル**: `useSoraProcessedExtensions.ts` (170-215行目)

```typescript
// このような参照がある場合：
return useMemo(() => {
  // ... 処理 ...
}, [installedData, marketplaceData, isExtensionInstalled, isAnyVersionInstalled]);
```

**問題**:

- `isExtensionInstalled` と `isAnyVersionInstalled` は **コンポーネント毎に新しいインスタンス**として生成
- 親コンポーネント (`SoraExtensionsMarketplaceSettings.tsx` など) で毎フレーム新しい関数参照が生成される
- 依存配列が常に変化 → `useMemo` が毎回実行 → 無限ループの温床

### 2. **サーキュラーな依存関係: useGroupedExtensionsByVersion**

**呼び出し元**: `SoraExtensionsMarketplaceSettings.tsx` (107-130行目)

```typescript
const groupedExtensions = useGroupedExtensionsByVersion({
  installedData: namespacedData.flatMap(...),  // 毎フレーム新しい配列
  marketplaceData: ...,                         // 毎フレーム新しい配列
  isExtensionInstalled,                         // 親の状態に依存
  isAnyVersionInstalled,                        // 親の状態に依存
});

// その後、useSoraMarketplaceSearch で groupedExtensions を使用
const {...} = useSoraMarketplaceSearch({
  items: groupedExtensions.map(...)  // 毎フレーム新しい配列を生成
});
```

**問題**:

1. `groupedExtensions` が毎フレーム再計算
2. `.map()` で新しい配列が毎回生成
3. `useSoraMarketplaceSearch` の依存配列に影響
4. 検索フィルタリング結果が毎フレーム無効化

### 3. **useSoraMarketplaceSearch のuseMemo チェーン**

**ファイル**: `useSoraMarketplaceSearch.ts` (165-180行目)

```typescript
// 複数の段階的なmemoization
const tabFilteredItems = useMemo(() => {...}, [normalizedItems, activeTab]);
const tagStats = useMemo(() => {...}, [tabFilteredItems, selectedKeywords, ...]);
const searchSuggestions = useMemo(() => {...}, [tabFilteredItems, searchQuery, ...]);
const filteredItems = useMemo(() => {...}, [tabFilteredItems, searchQuery, ...]);
const tabs = useMemo(() => {
  return [
    { key: "available", label: "Available", count: getFilteredCountForTab("available") }
  ];
}, [getFilteredCountForTab]);  // ⚠️ getFilteredCountForTab が毎フレーム新規生成
```

**問題**:

- `getFilteredCountForTab` は `useCallback` で保護されていない
- 毎フレーム新しい関数参照が生成
- `tabs` の useMemo が毎フレーム実行 → 無限再計算

### 4. **キーワード統計計算の複雑性**

**ファイル**: `useSoraMarketplaceSearch.ts` (155-163行目)

```typescript
const tagStats = useMemo(() => {
  // AND モード時のフィルタリング
  if (keywordFilterMode === "AND" && selectedKeywords.length > 0) {
    const filteredByKeywords = filterItemsByKeywords(tabFilteredItems, selectedKeywords, "AND");
    return calculateKeywordStats(filteredByKeywords); // 毎フレーム新しい配列
  }
  return calculateKeywordStats(tabFilteredItems);
}, [tabFilteredItems, selectedKeywords, keywordFilterMode]);
```

**問題**:

- `filterItemsByKeywords()` が毎回新しい配列を返す可能性
- その配列が `calculateKeywordStats()` に渡される
- 結果が毎フレーム変化 → レンダリングトリガー

## 関連するフックの役割分析

### 各フック間の依存関係図

```
SoraExtensionsMarketplaceSettings
    ↓
    ├─ useExtensionSettings()
    │   └─ namespacedData, marketplaceData (毎フレーム変化)
    │
    ├─ useSoraOperationStatus()
    │   └─ operations state
    │
    ├─ useSoraMarketplaceActions()
    │   └─ executeMarketplaceOperation (useCallback)
    │
    ├─ useGroupedExtensionsByVersion() ⚠️ 無限ループの中心
    │   ├─ Input: namespacedData.flatMap() (毎フレーム新配列)
    │   ├─ Input: marketplaceData (毎フレーム新配列)
    │   └─ Output: groupedExtensions (毎フレーム再計算)
    │
    └─ useSoraMarketplaceSearch() ⚠️ 複合効果
        ├─ Input: groupedExtensions.map() (毎フレーム新配列)
        ├─ tabFilteredItems → tagStats → searchSuggestions
        └─ filteredItems (複数段階のmemoization)
```

## 無限ループの流れ

```
フレーム1:
  - namespacedData が新しい配列で生成
  - useGroupedExtensionsByVersion の依存配列が変化
  - groupedExtensions が再計算
  - .map() で新配列生成
  - useSoraMarketplaceSearch が再実行
  - filteredItems が変化
  - コンポーネント再レンダリング

フレーム2 (新しいデータが届く):
  - namespacedData が更新
  - 同じサイクルが繰り返される

問題: namespacedData がフレーム毎に新インスタンスで返される場合、
無限再計算サイクルに入る
```

## 既知の問題点

### 1. **flatMap() による毎回の配列生成**

`SoraExtensionsMarketplaceSettings.tsx`:

```typescript
const groupedExtensions = useGroupedExtensionsByVersion({
  installedData: namespacedData.flatMap((namespace) =>
    namespace.entries.map((ext) => ({...}))  // 毎フレーム新配列
  ),
  marketplaceData: marketplaceExtensions?.length > 0 ? ... : ...,
  isExtensionInstalled,    // 毎フレーム新参照
  isAnyVersionInstalled,   // 毎フレーム新参照
});
```

**影響**: useMemo が無視される

### 2. **getFilteredCountForTab が useCallback で保護されていない**

```typescript
const getFilteredCountForTab = useCallback(
  (tab: MarketplaceTab) => {
    const tabData = tab === "installed" ? ... : ...;
    return filterItemsBySearchAndKeywords(tabData, searchQuery, selectedKeywords).length;
  },
  [normalizedItems, searchQuery, selectedKeywords],  // ✅ これは正しい
);

// しかし使用時:
const tabs: TabConfig[] = useMemo(() => {
  return [
    { key: "available", label: "Available", count: getFilteredCountForTab("available") },
    { key: "installed", label: "Installed", count: getFilteredCountForTab("installed") }
  ];
}, [getFilteredCountForTab]);  // ✅ これ自体は正しいが...
```

**実際の問題**: `normalizedItems` が毎フレーム変化する場合、
`getFilteredCountForTab` が毎フレーム新規生成 → `tabs` も毎フレーム再計算

## テスト方法

```typescript
// コンソール出力を有効化して検証
const log = Log.getLogger(__filename);

// 60回以上のログ出力が1秒以内に発生する場合、無限ループの可能性が高い
log.debug(
  `[useGroupedExtensionsByVersion] Processed ${groups.size} extension groups in ${(endTime - startTime).toFixed(2)}ms`,
);
```

## 予想される現象

- UI の反応が遅い
- CPU 使用率が高い
- ブラウザコンソールで「Maximum call stack size exceeded」エラー
- スクロール時のカクつき

## 関連ファイル

- `packages/suite-base/src/hooks/marketplace/useSoraProcessedExtensions.ts`
- `packages/suite-base/src/hooks/marketplace/useSoraMarketplaceSearch.ts`
- `packages/suite-base/src/components/SoraExtensionsMarketplaceSettings/SoraExtensionsMarketplaceSettings.tsx`
- `packages/suite-base/src/components/SoraLayoutMarketplaceSettings.tsx`

## 修正案

### 案1: 依存配列の最適化（推奨）

親コンポーネントで `useMemo` を使用してデータ引き継ぎ:

```typescript
const installedExtensionData = useMemo(
  () => namespacedData.flatMap((namespace) =>
    namespace.entries.map((ext) => ({...}))
  ),
  [namespacedData]  // namespacedData のメモ化も必要
);

const marketplaceExtensionData = useMemo(
  () => marketplaceExtensions?.length > 0 ? ... : ...,
  [marketplaceExtensions]
);

const groupedExtensions = useGroupedExtensionsByVersion({
  installedData: installedExtensionData,
  marketplaceData: marketplaceExtensionData,
  isExtensionInstalled,
  isAnyVersionInstalled,
});
```

### 案2: 参照の安定化

```typescript
const stableIsExtensionInstalled = useCallback(
  (id: string) => isExtensionInstalled(id),
  [isExtensionInstalled],
);

const stableIsAnyVersionInstalled = useCallback(
  (baseId: string) => isAnyVersionInstalled(baseId),
  [isAnyVersionInstalled],
);

const groupedExtensions = useGroupedExtensionsByVersion({
  installedData,
  marketplaceData,
  isExtensionInstalled: stableIsExtensionInstalled,
  isAnyVersionInstalled: stableIsAnyVersionInstalled,
});
```

### 案3: 検索フックの分離

useMemo チェーンを段階的に分割し、各段階での再計算トリガーを明確化

## 次のステップ

1. ⚠️ 実装段階の検証（本番環境でのテスト）
2. パフォーマンスプロファイリング実施
3. React DevTools Profiler で再レンダリング追跡
4. 修正案の実装と検証

---

**参考**: Broken Windows 理論 - 小さな問題も放置しない
