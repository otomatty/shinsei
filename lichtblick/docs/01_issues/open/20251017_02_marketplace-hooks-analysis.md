# マーケットプレイス機能: カスタムフック分析レポート

**作成日**: 2025-10-17
**分析対象**: `packages/suite-base/src/hooks/marketplace/` 配下の5つのカスタムフック
**目的**: 各フックの役割、相互関係、問題点の把握

## 目次

1. [フック一覧](#フック一覧)
2. [各フックの詳細分析](#各フックの詳細分析)
3. [アーキテクチャ図](#アーキテクチャ図)
4. [問題点サマリー](#問題点サマリー)
5. [改善提案](#改善提案)

---

## フック一覧

| フック名                     | 責務                               | 型安全性  | メモ化対応     |
| ---------------------------- | ---------------------------------- | --------- | -------------- |
| `useSoraMarketplaceActions`  | 操作実行・エラーハンドリング       | ✅ Strong | ✅ useCallback |
| `useSoraOperationStatus`     | 操作ステータス管理                 | ✅ Strong | ✅ useCallback |
| `useSoraMarketplaceSearch`   | 検索・フィルタリング               | ✅ Strong | ⚠️ 複雑        |
| `useSoraOperationState`      | ローディング状態管理               | ✅ Strong | ✅ useCallback |
| `useSoraProcessedExtensions` | 拡張機能グループ化・バージョン管理 | ✅ Strong | ❌ 危険        |

---

## 各フックの詳細分析

### 1. useSoraMarketplaceActions (✅ 健全)

**ファイル**: `useSoraMarketplaceActions.ts`
**行数**: ~60行
**責務**: マーケットプレイス操作の実行と一貫したエラーハンドリング

#### 実装品質

```typescript
✅ 長所:
  - useCallback で memoization（行24-55）
  - 明確なエラーハンドリング
  - UX の配慮（200ms 遅延で UI ちらつき回避）
  - 成功・失敗時のコールバック対応

⚠️ 留意点:
  - 依存配列が [enqueueSnackbar] のみ（十分）
  - 副作用が控えめで安全
```

**役割**: 他フックが生成した操作をサポート

---

### 2. useSoraOperationStatus (✅ 健全)

**ファイル**: `useSoraOperationStatus.ts`
**行数**: ~161行
**責務**: 個別アイテムの操作ステータス（Installing/Uninstalling/Updating）追跡

#### 実装品質

```typescript
✅ 長所:
  - IDLE 状態で自動クリーンアップ（行49-51）
  - メモリ効率的（不要なエントリを削除）
  - useCallback で全メソッドを保護
  - Clear な API設計

⚠️ 留意点:
  - 状態更新は同期的（非同期操作との整合性に注意）
```

**役割**: UI の button disabled 状態や loading indicator を制御

**使用例**:

```typescript
const { setStatus, isOperating } = useSoraOperationStatus();
setStatus(layoutId, OperationStatus.INSTALLING);  // UI を locked
await installLayout(...);
setStatus(layoutId, OperationStatus.IDLE);        // UI を unlock
```

---

### 3. useSoraMarketplaceSearch (⚠️ 複雑・問題有り)

**ファイル**: `useSoraMarketplaceSearch.ts`
**行数**: ~325行
**責務**: テキスト検索、キーワードフィルタリング、タブ管理、提案機能

#### 実装品質

```typescript
⚠️ 複雑性:
  - 複数段階のmemoization（行155-221）
  - 依存配列が深い（4-5個の依存）
  - 段階的フィルタリング（tab → keyword → search → advanced）

問題:
  1. normalizedItems の再計算（行107-120）
     - fieldMapping があるたびに新配列を生成
     - 依存配列: [items, fieldMapping] が毎フレーム変化

  2. getFilteredCountForTab が useCallback で保護されていない
     - 毎フレーム新規生成
     - tabs useMemo が毎回実行

  3. searchSuggestions の計算コスト
     - generateSearchSuggestions() の実装未確認
     - tabFilteredItems が毎フレーム変化時に負荷高
```

#### 依存関係グラフ

```
items (props)
  ↓
normalizedItems (useMemo) ← fieldMapping が毎フレーム新規生成
  ↓
tabFilteredItems (useMemo)
  ├─ tagStats (useMemo)
  ├─ searchSuggestions (useMemo)
  └─ filteredItems (useMemo)
       ↓
getFilteredCountForTab (useCallback)
  ↓
tabs (useMemo) ⚠️ 毎フレーム実行
```

#### 実装上の懸念

```typescript
// 行167-171: fieldMapping があると毎回新配列
const normalizedItems = useMemo(() => {
  if (!fieldMapping) {
    return items;
  }
  return items.map((item) => ({...}));  // 毎回新配列
}, [items, fieldMapping]);

// 行213-220: getFilteredCountForTab が毎フレーム新規生成？
const tabs: TabConfig[] = useMemo(() => {
  return [
    {
      key: "available",
      label: "Available",
      count: getFilteredCountForTab("available")  // 呼び出してその場で計算
    }
  ];
}, [getFilteredCountForTab]);
```

---

### 4. useSoraOperationState (✅ 健全)

**ファイル**: `useSoraOperationState.ts`
**行数**: ~45行
**責務**: 複数アイテムのローディング状態管理（Set で効率化）

#### 実装品質

```typescript
✅ 長所:
  - Set<string> でメモリ効率（配列より高速検索）
  - isMounted チェック（メモリリーク防止）
  - useCallback で全メソッド保護
  - 非同期操作の完了を guarantee

⚠️ 留意点:
  - useSoraOperationStatus と役割が重複している可能性
```

**役割**: グローバルなローディング state の管理

---

### 5. useSoraProcessedExtensions (❌ 問題あり - 最優先修正)

**ファイル**: `useSoraProcessedExtensions.ts`
**行数**: ~335行
**責務**: インストール済み + マーケットプレイス拡張機能のグループ化・バージョン管理

#### 実装品質

```typescript
❌ 重大問題:

1. 無限ループの危険性（行170-215）
   const useMemo(() => {
     // ... 複雑な処理 ...
   }, [installedData, marketplaceData, isExtensionInstalled, isAnyVersionInstalled]);

   問題:
   - installedData: 親で毎フレーム flatMap で新配列生成
   - marketplaceData: 毎フレーム新配列生成
   - isExtensionInstalled: 関数参照が毎フレーム変化
   - isAnyVersionInstalled: 関数参照が毎フレーム変化

   結果: useMemo が機能していない（毎フレーム実行）

2. addVersionToGroup の複数呼び出し
   - ループ内で複数回 push されるリスク
   - 同じバージョンの重複登録チェック（行305）は存在

3. normalizeVersion と toVersionedId の呼び出し頻度
   - processedExtensions.ts 内で多数回呼び出し
   - 最適化の余地あり

⚠️ パフォーマンス警告:
  - 1000個以上の拡張機能がある場合、処理時間が著しく増加
  - ログにはパフォーマンス計測が入っているが本番環境で出力
```

#### コード分析

```typescript
// 問題ケース 1: 親での配列生成
SoraExtensionsMarketplaceSettings.tsx (行107-130):
  const groupedExtensions = useGroupedExtensionsByVersion({
    installedData: namespacedData.flatMap((namespace) =>
      namespace.entries.map((ext) => ({...}))  // ✗ 毎フレーム新配列
    ),
    marketplaceData: marketplaceExtensions?.length > 0
      ? marketplaceExtensions.map((ext) => ({...}))  // ✗ 毎フレーム新配列
      : groupedMarketplaceData.flatMap(...),         // ✗ 毎フレーム新配列
    isExtensionInstalled,    // ✗ 関数参照が毎フレーム新規生成
    isAnyVersionInstalled,   // ✗ 関数参照が毎フレーム新規生成
  });

// 問題ケース 2: 複数段階の map()
SoraExtensionsMarketplaceSettings.tsx (行160-167):
  const {...} = useSoraMarketplaceSearch({
    items: groupedExtensions.map((ext) => ({  // ✗ 毎フレーム新配列
      ...ext,
      id: ext.versionedId,
      keywords: ext.keywords,
      publisher: ext.publisher,
    })),
    ...
  });
```

#### 処理フロー図

```
Input Data:
  - installedData (namespacedData.flatMap で毎フレーム新配列)
  - marketplaceData (毎フレーム新配列)
  - isExtensionInstalled (毎フレーム新参照)
  - isAnyVersionInstalled (毎フレーム新参照)
        ↓
useGroupedExtensionsByVersion useMemo
        ↓
Step 1: 両データを結合してグループ化 (Map で管理)
        ↓
Step 2: 各グループのバージョン情報を追加
        ↓
Step 3: バージョンをソート＆LatestVersion を決定
        ↓
Output: ExtensionWithVersions[]
        ↓
親で再び .map() で加工（useSoraMarketplaceSearch へ）
        ↓
useSoraMarketplaceSearch 内での複数段階のmemoization
        ↓
結果: 数段階の依存チェーンで無限再計算のリスク
```

---

## アーキテクチャ図

### データフロー

```
┌─────────────────────────────────────────────────────────┐
│ SoraExtensionsMarketplaceSettings Component             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  useExtensionSettings()                                  │
│    ├─ namespacedData (毎フレーム新配列?) ⚠️            │
│    └─ groupedMarketplaceData (毎フレーム新配列?) ⚠️    │
│                                                           │
│  useExtensionCatalog()                                   │
│    ├─ installExtensions                                  │
│    ├─ uninstallExtension                                 │
│    └─ isExtensionInstalled (毎フレーム新参照) ⚠️       │
│                                                           │
│  useSoraOperationStatus()                                │
│    └─ operations state (安全) ✅                        │
│                                                           │
│  useGroupedExtensionsByVersion() ⚠️ 無限ループリスク   │
│    │ (namespacedData の flatMap 結果)                  │
│    └─ groupedExtensions []                              │
│         ↓                                                │
│  useSoraMarketplaceSearch()                              │
│    │ (groupedExtensions の map 結果)                    │
│    ├─ filteredExtensions []                             │
│    ├─ tagStats (複数段階のmemo)                         │
│    └─ searchSuggestions (複雑計算)                     │
│         ↓                                                │
│  Render: SoraMarketplaceCard[] (filtered items)         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 状態管理の責務分離

```
操作追跡:
  useSoraOperationStatus  ← ステータス定義（INSTALLING/IDLE等）
  useSoraOperationState   ← ローディング状態（Set<string>）
  useSoraMarketplaceActions ← 実行エラーハンドリング

操作対象:
  useSoraProcessedExtensions ← グループ化・バージョン管理 ⚠️
  useSoraMarketplaceSearch   ← フィルタリング・検索 ⚠️

結果:
  責務分離は明確だが、依存関係がネストしすぎている
```

---

## 問題点サマリー

### Critical (即時対応必要)

| #   | 問題                             | 原因                     | 影響                                     | 優先度 |
| --- | -------------------------------- | ------------------------ | ---------------------------------------- | ------ |
| 1   | 無限ループの可能性               | 依存配列の毎フレーム変化 | CPU 100%, ブラウザハング                 | **P0** |
| 2   | flatMap による毎フレーム配列生成 | 親での メモ化不足        | useGroupedExtensionsByVersion が機能せず | **P0** |
| 3   | 関数参照の毎フレーム新規生成     | useCallback 不使用       | 依存配列検証の失敗                       | **P0** |

### High (優先的に対応)

| #   | 問題                                  | 原因                      | 影響                     | 優先度 |
| --- | ------------------------------------- | ------------------------- | ------------------------ | ------ |
| 4   | normalizedItems の条件分岐            | fieldMapping 毎回チェック | useMemo 最適化不十分     | **P1** |
| 5   | getFilteredCountForTab の重複呼び出し | ライン213での直接呼び出し | tabs が毎フレーム再計算  | **P1** |
| 6   | 複雑な段階的memoization               | チェーン設計              | デバッグ困難、保守性低下 | **P1** |

### Medium (改善推奨)

| #   | 問題                                                       | 原因               | 影響                 | 優先度 |
| --- | ---------------------------------------------------------- | ------------------ | -------------------- | ------ |
| 7   | ログ出力がパフォーマンス計測                               | 毎フレーム出力     | コンソール汚染       | **P2** |
| 8   | useSoraOperationState と useSoraOperationStatus の役割重複 | 設計段階の検討不足 | メンテナンス負担増加 | **P2** |

---

## 改善提案

### 優先順位 1: 依存配列の最適化

#### 現在の問題コード

```typescript
// SoraExtensionsMarketplaceSettings.tsx (110-130)
const groupedExtensions = useGroupedExtensionsByVersion({
  installedData: namespacedData.flatMap((namespace) =>
    namespace.entries.map((ext) => ({...}))  // ❌ 毎フレーム新配列
  ),
  marketplaceData: marketplaceExtensions?.length > 0 ? ... : ...,
  isExtensionInstalled,    // ❌ 毎フレーム新参照
  isAnyVersionInstalled,   // ❌ 毎フレーム新参照
});
```

#### 改善案

```typescript
// ステップ 1: データの安定化（useMemo で括る）
const installedExtensionData = useMemo(
  () => namespacedData.flatMap((namespace) =>
    namespace.entries.map((ext) => ({
      id: ext.id,
      name: ext.name,
      description: ext.description,
      publisher: ext.publisher,
      version: ext.version,
      keywords: ext.keywords,
      homepage: ext.homepage,
      license: ext.license,
      qualifiedName: ext.qualifiedName,
      namespace: ext.namespace,
      readme: ext.readme,
      changelog: ext.changelog,
    }))
  ),
  [namespacedData]  // ← namespacedData 自体が安定してなければ意味ない
);

const marketplaceExtensionData = useMemo(
  () => marketplaceExtensions?.length > 0
    ? marketplaceExtensions.map((ext) => ({...}))
    : groupedMarketplaceData.flatMap((ns) => ns.entries.map((ext) => ({...}))),
  [marketplaceExtensions, groupedMarketplaceData]
);

// ステップ 2: 関数参照の安定化（useCallback で括る）
const stableIsExtensionInstalled = useCallback(
  (id: string) => isExtensionInstalled(id),
  [isExtensionInstalled]
);

const stableIsAnyVersionInstalled = useCallback(
  (baseId: string) => isAnyVersionInstalled(baseId),
  [isAnyVersionInstalled]
);

// ステップ 3: 結果は毎フレーム安定
const groupedExtensions = useGroupedExtensionsByVersion({
  installedData: installedExtensionData,
  marketplaceData: marketplaceExtensionData,
  isExtensionInstalled: stableIsExtensionInstalled,
  isAnyVersionInstalled: stableIsAnyVersionInstalled,
});
```

### 優先順位 2: useSoraMarketplaceSearch の簡素化

```typescript
// 改善前
const {items: groupedExtensions.map(...)} = useSoraMarketplaceSearch({...})

// 改善後 - 親で一度だけ map して安定化
const searchItems = useMemo(
  () => groupedExtensions.map((ext) => ({
    ...ext,
    id: ext.versionedId,
  })),
  [groupedExtensions]
);

const {...} = useSoraMarketplaceSearch({
  items: searchItems,  // ← 安定した参照
  ...
});
```

### 優先順位 3: ログ出力の制御

```typescript
// 改善前
log.debug(`[useGroupedExtensionsByVersion] Processed...`); // 毎フレーム出力

// 改善後
if (process.env.NODE_ENV === "development" && performance.now() > 100) {
  log.debug(`[useGroupedExtensionsByVersion] Slow processing...`);
}
```

---

## 実装チェックリスト

### Phase 1: 緊急対応 (1-2日)

- [ ] 親コンポーネントで flatMap を useMemo で括る
- [ ] isExtensionInstalled と isAnyVersionInstalled を useCallback で括る
- [ ] React DevTools Profiler で再レンダリング確認

### Phase 2: 中期改善 (3-5日)

- [ ] useSoraMarketplaceSearch の段階的memoization を簡素化
- [ ] getFilteredCountForTab の最適化
- [ ] パフォーマンステストの実装

### Phase 3: リファクタリング (1週間)

- [ ] useSoraOperationState と useSoraOperationStatus の統合検討
- [ ] ログ出力の制御
- [ ] テストケースの充実

---

## 参考資料

### React Hooks のベストプラクティス

1. **依存配列の安定性**: 参照が毎フレーム変わらないようにする
2. **メモ化の階層化**: useMemo → useCallback の順で対応
3. **デバッグ方法**: React DevTools Profiler で再レンダリング追跡

### パフォーマンス計測

```typescript
const startTime = performance.now();
// ... 処理 ...
const endTime = performance.now();
console.log(`処理時間: ${endTime - startTime}ms`);
```

---

**作成日**: 2025-10-17
**ステータス**: 分析完了、改善待ち
