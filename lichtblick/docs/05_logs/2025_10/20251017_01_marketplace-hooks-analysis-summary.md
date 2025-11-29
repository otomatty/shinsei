# 分析完了レポート: マーケットプレイス機能の無限ループ問題

**分析日**: 2025-10-17
**分析者**: AI Assistant
**対象ブランチ**: `feature/remove-layout-preview`

---

## 🚨 主要な発見

### 無限ループの根本原因

マーケットプレイス機能（拡張機能・レイアウト）で**複数段階の依存チェーン** が形成され、親コンポーネント側で毎フレーム新しい参照が生成されるため、メモ化（useMemo）が機能していません。

### 問題のフロー

```
親コンポーネント (SoraExtensionsMarketplaceSettings)
    ↓
namespacedData.flatMap() → 毎フレーム新配列
    ↓
useGroupedExtensionsByVersion(installedData: 新配列, ...)
    ↓
依存配列が毎フレーム変化 → useMemo が毎回実行
    ↓
groupedExtensions 毎フレーム再計算
    ↓
.map() で再度新配列生成
    ↓
useSoraMarketplaceSearch(items: 新配列, ...)
    ↓
複数段階のmemoization（tab → keyword → search → advanced）
    ↓
各段階で再計算 → 数フレームで CPU 100%
```

---

## 📊 5つのマーケットプレイスフックの分析結果

| #   | フック名                         | 状態 | 健全性   | 説明                                             |
| --- | -------------------------------- | ---- | -------- | ------------------------------------------------ |
| 1   | `useSoraMarketplaceActions`      | ✅   | 健全     | エラーハンドリングが明確で useCallback で保護    |
| 2   | `useSoraOperationStatus`         | ✅   | 健全     | 個別アイテムのステータス追跡、メモリ最適化あり   |
| 3   | **`useSoraMarketplaceSearch`**   | ⚠️   | 複雑     | 複数段階のmemoization、fieldMapping 毎回チェック |
| 4   | `useSoraOperationState`          | ✅   | 健全     | ローディング状態管理、Set で効率化               |
| 5   | **`useSoraProcessedExtensions`** | ❌   | **危険** | 依存配列が毎フレーム変化、無限ループリスク       |

---

## 🔍 詳細問題分析

### 問題 1: useSoraProcessedExtensions の依存配列

**重要度**: 🔴 Critical
**ファイル**: `useSoraProcessedExtensions.ts` (L170-215)

```typescript
return useMemo(() => {
  // ... 複雑な処理 ...
}, [installedData, marketplaceData, isExtensionInstalled, isAnyVersionInstalled]);
```

**問題点**:

- `installedData`: 親で `namespacedData.flatMap()` で**毎フレーム新配列**
- `marketplaceData`: **毎フレーム新配列**生成
- `isExtensionInstalled`: **関数参照が毎フレーム変化**
- `isAnyVersionInstalled`: **関数参照が毎フレーム変化**

**結果**: useMemo が無視される → 毎フレーム処理実行 → 無限ループ

---

### 問題 2: 親コンポーネントでの複数の map/flatMap

**重要度**: 🔴 Critical
**ファイル**: `SoraExtensionsMarketplaceSettings.tsx` (L107-130)

```typescript
const groupedExtensions = useGroupedExtensionsByVersion({
  installedData: namespacedData.flatMap((namespace) =>
    namespace.entries.map((ext) => ({...}))  // ❌ 毎フレーム新配列
  ),
  marketplaceData: marketplaceExtensions?.length > 0
    ? marketplaceExtensions.map((ext) => ({...}))  // ❌ 毎フレーム新配列
    : groupedMarketplaceData.flatMap(...),         // ❌ 毎フレーム新配列
  isExtensionInstalled,                            // ❌ 毎フレーム新参照
  isAnyVersionInstalled,                           // ❌ 毎フレーム新参照
});
```

**何が起こるか**:

1. 依存配列の要素すべてが毎フレーム変化
2. `useGroupedExtensionsByVersion` の useMemo が毎回実行
3. groupedExtensions が毎フレーム新インスタンスで生成
4. その後の useSoraMarketplaceSearch に新配列を渡す
5. searchSuggestions, tagStats 等の複数段階のmemo も毎回実行

---

### 問題 3: useSoraMarketplaceSearch の複雑な段階的memoization

**重要度**: 🟠 High
**ファイル**: `useSoraMarketplaceSearch.ts` (L150-221)

```typescript
// Stage 1
const normalizedItems = useMemo(() => {
  if (!fieldMapping) return items;
  return items.map(...);  // fieldMapping 毎回チェック
}, [items, fieldMapping]);

// Stage 2
const tabFilteredItems = useMemo(() => {
  return normalizedItems.filter(...);
}, [normalizedItems, activeTab]);

// Stage 3
const tagStats = useMemo(() => {
  if (keywordFilterMode === "AND" && selectedKeywords.length > 0) {
    const filtered = filterItemsByKeywords(tabFilteredItems, selectedKeywords, "AND");
    return calculateKeywordStats(filtered);  // 毎回新配列
  }
  return calculateKeywordStats(tabFilteredItems);
}, [tabFilteredItems, selectedKeywords, keywordFilterMode]);

// ... 複数の段階が続く ...

// Danger Zone
const tabs = useMemo(() => {
  return [
    { count: getFilteredCountForTab("available") },  // ← 直接呼び出し
    { count: getFilteredCountForTab("installed") }   // ← 直接呼び出し
  ];
}, [getFilteredCountForTab]);  // ← getFilteredCountForTab が毎フレーム新規生成
```

**問題点**:

- normalizedItems が条件分岐で毎回新配列
- getFilteredCountForTab がタブ毎に呼び出され結果の参照が不安定
- 各段階の結果が次の段階へ渡され、依存チェーンが深くなる

---

### 問題 4: 親での関数参照の不安定性

**重要度**: 🟠 High
**ファイル**: `SoraExtensionsMarketplaceSettings.tsx`

```typescript
// isExtensionInstalled と isAnyVersionInstalled は
// useExtensionCatalog() から直接取得
const isExtensionInstalled = useExtensionCatalog((state) => state.isExtensionInstalled);
const { isInstalled: isAnyVersionInstalled } = useSoraInstalledExtensions();

// これらが useCallback で保護されていない可能性が高い
// → useGroupedExtensionsByVersion に渡す際に毎フレーム新参照
```

**なぜ問題か**:

- こうした関数が依存配列に含まれると、useMemo は機能しない
- 各フレームで「新しい関数」と判定されるため、毎回処理が実行される

---

## 📈 パフォーマンスへの影響

### 観察される現象（予測）

- ✗ UI が反応しない
- ✗ CPU 使用率が 100% に急上昇
- ✗ ブラウザコンソールで「Maximum call stack size exceeded」
- ✗ スクロール時の著しいカクつき
- ✗ メモリ使用量が増加し続ける

### 計算量

```
1フレーム当たりの処理:
  - useGroupedExtensionsByVersion: O(extensions.length × 2)  [ループが2回]
  - useSoraMarketplaceSearch: O(items.length × 5) [段階的フィルタリング]

1000個の拡張機能 × 60フレーム/秒 = 毎秒 ~600,000 個の処理
→ フリーズ、クラッシュ
```

---

## ✅ 修正案（優先順位付き）

### 🔴 Priority 1: 依存配列の安定化（即座に対応）

**修正内容**: 親コンポーネントでデータを useMemo で一度括る

```typescript
// Before
const groupedExtensions = useGroupedExtensionsByVersion({
  installedData: namespacedData.flatMap(...),  // ❌ 毎フレーム新配列
  marketplaceData: ...,
  isExtensionInstalled,  // ❌ 毎フレーム新参照
  isAnyVersionInstalled, // ❌ 毎フレーム新参照
});

// After
const installedExtensionData = useMemo(
  () => namespacedData.flatMap((namespace) =>
    namespace.entries.map((ext) => ({...}))
  ),
  [namespacedData]  // ← 安定した参照
);

const stableIsExtensionInstalled = useCallback(
  (id: string) => isExtensionInstalled(id),
  [isExtensionInstalled]
);

const groupedExtensions = useGroupedExtensionsByVersion({
  installedData: installedExtensionData,         // ✅ 安定
  marketplaceData: memoizedMarketplaceData,      // ✅ 安定
  isExtensionInstalled: stableIsExtensionInstalled,   // ✅ 安定
  isAnyVersionInstalled: stableIsAnyVersionInstalled, // ✅ 安定
});
```

**期待効果**:

- useGroupedExtensionsByVersion の useMemo が機能するように
- groupedExtensions が本当に必要な時だけ再計算
- CPU 使用率が大幅に低下

---

### 🟠 Priority 2: useSoraMarketplaceSearch の簡素化

**修正内容**: 段階的memoization を整理し、不要な再計算を削除

```typescript
// Before
const {...} = useSoraMarketplaceSearch({
  items: groupedExtensions.map((ext) => ({  // ❌ 毎フレーム新配列
    ...ext,
    id: ext.versionedId,
  })),
});

// After
const searchItems = useMemo(
  () => groupedExtensions.map((ext) => ({
    ...ext,
    id: ext.versionedId,
  })),
  [groupedExtensions]  // ← groupedExtensions が安定すれば OK
);

const {...} = useSoraMarketplaceSearch({
  items: searchItems,  // ✅ 安定した参照
});
```

---

### 🟢 Priority 3: ログ出力の制御

**修正内容**: パフォーマンス計測ログを本番環境で無効化

```typescript
// Before
log.debug(`[useGroupedExtensionsByVersion] Processed...`); // 毎フレーム出力

// After
if (process.env.NODE_ENV === "development") {
  log.debug(`[useGroupedExtensionsByVersion] Processed...`);
}
```

---

## 📚 ドキュメント

詳細分析を以下のファイルに記録しました:

1. **`docs/issues/open/20251017_01_infinite-loop-useSoraProcessedExtensions.md`**

   - 無限ループの詳細メカニズム
   - 問題のフロー図
   - 修正案の実装例

2. **`docs/issues/open/20251017_02_marketplace-hooks-analysis.md`**
   - 5つのフックの詳細分析
   - アーキテクチャ図
   - 改善提案（フェーズ別）
   - 実装チェックリスト

---

## 🧪 テスト方法

### 問題が存在することを確認

```typescript
// React DevTools Profiler を使用
// 1. Chrome DevTools > Components tab を開く
// 2. Profiler タブでマーケットプレイス画面を操作
// 3. 以下の現象を観察:
//    - 60回以上の再レンダリングが1秒以内に発生
//    - useSoraProcessedExtensions のコンポーネントが常に highlight
//    - tagStats, filteredItems の不安定な参照
```

### 修正後の確認

```typescript
// 修正前後で以下を計測:
// 1. CPU 使用率: 100% → 5-10% に低下
// 2. 再レンダリング: 60回/秒 → 1-2回/秒 に低下
// 3. メモリ使用量: 安定化
// 4. UI 応答速度: 大幅に改善
```

---

## 📋 推奨アクション

### 今すぐ実施（1-2時間）

```
☐ Priority 1 修正案を SoraExtensionsMarketplaceSettings.tsx に適用
☐ 同じ修正を SoraLayoutMarketplaceSettings.tsx に適用
☐ ローカルでテストして CPU 使用率を確認
```

### 本日中（3-4時間）

```
☐ Priority 2 修正案を useSoraMarketplaceSearch.ts に適用
☐ getFilteredCountForTab を useCallback で保護
☐ useMemo チェーンの簡素化検討
```

### 明日（半日）

```
☐ Priority 3 ログ出力の制御
☐ useSoraOperationState と useSoraOperationStatus の役割整理
☐ 全体的なパフォーマンステスト実施
☐ テストケースの追加
```

---

## 🎯 結論

### 現状

マーケットプレイス機能は**実装は正しいが、依存関係管理が不十分**で、無限ループのリスクを抱えています。

### 原因

- 親コンポーネントでのメモ化不足
- 関数参照の不安定性
- 段階的memoization の複雑さ

### 解決方法

依存配列の安定化に注力することで、大幅なパフォーマンス改善が期待できます。

---

**分析完了**: 2025-10-17
**次ステップ**: 修正案の実装（優先順位 1 から開始）
