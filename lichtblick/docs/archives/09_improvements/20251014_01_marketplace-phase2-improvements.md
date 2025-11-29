# マーケットプレイス機能 追加改善提案

**作成日**: 2025年10月14日
**優先度**: Phase 2 (中期改善)
**関連文書**:

- [20251014_02_marketplace-code-issues-analysis.md](../../08_worklogs/2025_10/20251014/20251014_02_marketplace-code-issues-analysis.md)
- [20251014_03_marketplace-code-quality-improvements.md](../../08_worklogs/2025_10/20251014/20251014_03_marketplace-code-quality-improvements.md)

---

## 📋 概要

Phase 1で対応した問題（ID操作の重複、Set/配列の最適化）に続き、Phase 2として以下の改善を提案します。これらは**中期的な改善項目**であり、現在の機能に問題はありませんが、保守性・拡張性・DX（開発者体験）の向上に寄与します。

---

## 🎯 改善提案一覧

### 1. エラーハンドリングパターンの統一 🟡 MEDIUM

#### 現状の問題

`ExtensionMarketplaceSettings.tsx`と`LayoutMarketplaceSettings.tsx`で、以下のパターンが重複しています:

```typescript
// ExtensionMarketplaceSettings.tsx - handleInstall/handleUninstall
try {
  setOperationStatus((prev) => ({ ...prev, [versionedId]: OperationStatus.INSTALLING }));
  await new Promise((resolve) => setTimeout(resolve, 200)); // UX delay
  // ... operation ...
  enqueueSnackbar("Success", { variant: "success" });
} catch (error) {
  const err = error as Error;
  enqueueSnackbar(`Failed: ${err.message}`, { variant: "error" });
} finally {
  if (isMounted()) {
    setOperationStatus((prev) => ({ ...prev, [versionedId]: OperationStatus.IDLE }));
  }
}

// LayoutMarketplaceSettings.tsx - installLayout/uninstallLayout
try {
  setInstallingIds((prev) => {
    /* ... */
  });
  await installLayouts([{ detail: layout }]);
  await loadInstalledLayouts();
} finally {
  setInstallingIds((prev) => {
    /* ... */
  });
}
```

#### 問題点

1. **同じパターンの繰り返し**

   - 拡張機能：4箇所（install/uninstall × 2種類）
   - レイアウト：3箇所（install/uninstall/preview）

2. **エラーハンドリングの一貫性欠如**

   - 拡張機能は詳細なエラーメッセージ（CORS、ネットワーク等）
   - レイアウトはシンプルなエラー処理
   - 統一されたエラーハンドリング戦略がない

3. **テストの複雑さ**
   - 各関数で個別にエラーハンドリングをテストする必要
   - モックが複雑化

#### 提案する解決策

**共通Hook `useMarketplaceOperation` の作成**:

```typescript
// packages/suite-base/src/hooks/useMarketplaceOperation.ts

export interface MarketplaceOperationOptions<T> {
  operation: () => Promise<T>;
  onBefore?: () => void;
  onAfter?: () => void;
  onSuccess?: (result: T) => void;
  successMessage?: string;
  errorMessage?: string;
  delayMs?: number;
}

export function useMarketplaceOperation() {
  const { enqueueSnackbar } = useSnackbar();
  const isMounted = useMountedState();

  const executeOperation = useCallback(
    async <T>(options: MarketplaceOperationOptions<T>): Promise<T | undefined> => {
      const {
        operation,
        onBefore,
        onAfter,
        onSuccess,
        successMessage,
        errorMessage = "Operation failed",
        delayMs = 200,
      } = options;

      try {
        // Pre-operation callback
        onBefore?.();

        // UX delay to avoid button flickering
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        // Execute the operation
        const result = await operation();

        // Success callback
        onSuccess?.(result);

        // Success notification
        if (successMessage) {
          enqueueSnackbar(successMessage, { variant: "success" });
        }

        return result;
      } catch (error) {
        const err = error as Error;
        enqueueSnackbar(`${errorMessage}: ${err.message}`, {
          variant: "error",
        });
        return undefined;
      } finally {
        // Post-operation callback (only if still mounted)
        if (isMounted()) {
          onAfter?.();
        }
      }
    },
    [enqueueSnackbar, isMounted],
  );

  return { executeOperation };
}
```

**使用例**:

```typescript
// ExtensionMarketplaceSettings.tsx
const { executeOperation } = useMarketplaceOperation();

const handleInstall = useCallback(
  async (extension: GroupedExtensionData, version?: string) => {
    const versionedId = toV2Id(extension.baseId, version ?? extension.latestVersion);

    await executeOperation({
      operation: async () => {
        // Download and install logic
        const buffer = await downloadExtension(url);
        const results = await installExtensions(namespace, [{ buffer, namespace }]);
        return results[0];
      },
      onBefore: () =>
        setOperationStatus((prev) => ({ ...prev, [versionedId]: OperationStatus.INSTALLING })),
      onAfter: () =>
        setOperationStatus((prev) => ({ ...prev, [versionedId]: OperationStatus.IDLE })),
      onSuccess: () => void refreshMarketplaceEntries(),
      successMessage: `${extension.displayName} installed successfully`,
      errorMessage: `Failed to install ${extension.displayName}`,
    });
  },
  [executeOperation, downloadExtension, installExtensions, refreshMarketplaceEntries],
);

// LayoutMarketplaceSettings.tsx
const { executeOperation } = useMarketplaceOperation();

const installLayout = useCallback(
  async (layout: LayoutMarketplaceDetail) => {
    await executeOperation({
      operation: async () => {
        await installLayouts([{ detail: layout }]);
        await loadInstalledLayouts();
      },
      onBefore: () => setInstallingIds((prev) => addToSet(prev, layout.id)),
      onAfter: () => setInstallingIds((prev) => removeFromSet(prev, layout.id)),
      successMessage: `Layout "${layout.name}" installed successfully`,
      errorMessage: `Failed to install layout "${layout.name}"`,
    });
  },
  [executeOperation, installLayouts, loadInstalledLayouts],
);
```

#### 期待される効果

- ✅ **コード重複の削減**: 7箇所 → 1箇所
- ✅ **一貫したエラーハンドリング**: 統一されたパターン
- ✅ **テストの簡素化**: Hook単体でテスト可能
- ✅ **保守性向上**: エラーハンドリング変更が一箇所で済む

#### 実装工数

- 工数: **0.5日**
- 難易度: **低**

---

### 2. インストール状態管理の統一 🟡 MEDIUM

#### 現状の問題

拡張機能とレイアウトで異なる状態管理パターンを使用:

```typescript
// ExtensionMarketplaceSettings.tsx
const [operationStatus, setOperationStatus] = useState<Record<string, OperationStatus>>({});

// LayoutMarketplaceSettings.tsx
const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
```

#### 問題点

1. **一貫性の欠如**

   - 拡張機能: Record<string, OperationStatus>（詳細な状態）
   - レイアウト: Set<string>（簡易的な状態）

2. **機能の重複**

   - 両方とも「インストール中のアイテムを追跡」という同じ目的
   - 異なる実装で保守コストが2倍

3. **拡張性の問題**
   - レイアウトも将来的に詳細な状態（INSTALLING/UNINSTALLING）が必要になる可能性

#### 提案する解決策

**共通Hook `useOperationStatus` の作成**:

```typescript
// packages/suite-base/src/hooks/useOperationStatus.ts

export enum OperationStatus {
  IDLE = "idle",
  INSTALLING = "installing",
  UNINSTALLING = "uninstalling",
  UPDATING = "updating",
}

export interface UseOperationStatusOptions {
  enableDetailedStatus?: boolean;
}

export function useOperationStatus(options?: UseOperationStatusOptions) {
  const enableDetailed = options?.enableDetailedStatus ?? true;

  const [operations, setOperations] = useState<Record<string, OperationStatus>>({});

  const setStatus = useCallback((id: string, status: OperationStatus) => {
    setOperations((prev) => {
      // IDLE状態の場合は削除（メモリ節約）
      if (status === OperationStatus.IDLE) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: status };
    });
  }, []);

  const getStatus = useCallback(
    (id: string): OperationStatus => {
      return operations[id] ?? OperationStatus.IDLE;
    },
    [operations],
  );

  const isOperating = useCallback(
    (id: string): boolean => {
      const status = operations[id];
      return status !== undefined && status !== OperationStatus.IDLE;
    },
    [operations],
  );

  const isInstalling = useCallback(
    (id: string): boolean => {
      return operations[id] === OperationStatus.INSTALLING;
    },
    [operations],
  );

  const isUninstalling = useCallback(
    (id: string): boolean => {
      return operations[id] === OperationStatus.UNINSTALLING;
    },
    [operations],
  );

  return {
    setStatus,
    getStatus,
    isOperating,
    isInstalling,
    isUninstalling,
    operations,
  };
}
```

**使用例**:

```typescript
// ExtensionMarketplaceSettings.tsx
const { setStatus, isOperating, getStatus } = useOperationStatus({ enableDetailedStatus: true });

const handleInstall = useCallback(
  async (extension: GroupedExtensionData, version?: string) => {
    const versionedId = toV2Id(extension.baseId, version ?? extension.latestVersion);

    setStatus(versionedId, OperationStatus.INSTALLING);
    try {
      // ... install logic ...
    } finally {
      setStatus(versionedId, OperationStatus.IDLE);
    }
  },
  [setStatus],
);

// LayoutMarketplaceSettings.tsx
const { setStatus, isOperating } = useOperationStatus();

const installLayout = useCallback(
  async (layout: LayoutMarketplaceDetail) => {
    setStatus(layout.id, OperationStatus.INSTALLING);
    try {
      // ... install logic ...
    } finally {
      setStatus(layout.id, OperationStatus.IDLE);
    }
  },
  [setStatus],
);
```

#### 期待される効果

- ✅ **統一されたAPI**: 拡張機能とレイアウトで同じインターフェース
- ✅ **保守性向上**: 状態管理が一箇所に集約
- ✅ **拡張性**: 将来的な状態追加が容易

#### 実装工数

- 工数: **0.5日**
- 難易度: **低**

---

### 3. インストール済みチェックロジックの統一 🟢 LOW

#### 現状の問題

拡張機能とレイアウトで異なるアプローチ:

```typescript
// ExtensionMarketplaceSettings.tsx
const isAnyVersionInstalled = useCallback(
  (marketplaceId: string): boolean => {
    const installedExtensions = namespacedData.flatMap((ns) => ns.entries);
    return installedExtensions.some((ext) => {
      const baseId = extractBaseId(ext.id);
      return baseId === marketplaceId || baseId === extractBaseId(marketplaceId);
    });
  },
  [namespacedData],
);

// LayoutMarketplaceSettings.tsx
const loadInstalledLayouts = useCallback(async () => {
  const installedLayouts = await catalog.getInstalledMarketplaceLayouts();
  const installedIds = new Set<string>();
  const idMap = new Map<string, string>();

  for (const layout of installedLayouts) {
    const origin = await catalog.getMarketplaceOrigin(layout.id);
    if (origin?.marketplaceId) {
      installedIds.add(origin.marketplaceId);
      idMap.set(origin.marketplaceId, layout.id);
    }
  }

  setInstalledMarketplaceIds(installedIds);
  setMarketplaceToLayoutIdMap(idMap);
}, [catalog]);
```

#### 提案する解決策

**共通Hook `useInstalledItems` の作成**:

```typescript
// packages/suite-base/src/hooks/useInstalledItems.ts

export interface InstalledItemsState<T> {
  installedIds: Set<string>;
  itemMap: Map<string, T>;
  isInstalled: (marketplaceId: string) => boolean;
  getItem: (marketplaceId: string) => T | undefined;
  refresh: () => Promise<void>;
  loading: boolean;
}

export function useInstalledExtensions(): InstalledItemsState<ExtensionInfo> {
  const namespacedData = useExtensionCatalog((state) => state.installedExtensions);

  return useMemo(() => {
    const installedIds = new Set<string>();
    const itemMap = new Map<string, ExtensionInfo>();

    namespacedData.forEach((ext) => {
      const baseId = ExtensionIdUtils.extractBaseId(ext.id);
      installedIds.add(baseId);
      itemMap.set(baseId, ext);
    });

    return {
      installedIds,
      itemMap,
      isInstalled: (id) => installedIds.has(ExtensionIdUtils.extractBaseId(id)),
      getItem: (id) => itemMap.get(ExtensionIdUtils.extractBaseId(id)),
      refresh: async () => {
        // Handled by Zustand store
      },
      loading: false,
    };
  }, [namespacedData]);
}

export function useInstalledLayouts(): InstalledItemsState<Layout> {
  const catalog = useLayoutCatalog();
  const [state, setState] = useState<{
    installedIds: Set<string>;
    itemMap: Map<string, Layout>;
    loading: boolean;
  }>({
    installedIds: new Set(),
    itemMap: new Map(),
    loading: false,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const layouts = await catalog.getInstalledMarketplaceLayouts();
      const installedIds = new Set<string>();
      const itemMap = new Map<string, Layout>();

      for (const layout of layouts) {
        const origin = await catalog.getMarketplaceOrigin(layout.id);
        if (origin?.marketplaceId) {
          installedIds.add(origin.marketplaceId);
          itemMap.set(origin.marketplaceId, layout);
        }
      }

      setState({ installedIds, itemMap, loading: false });
    } catch (error) {
      log.error("Failed to load installed layouts:", error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [catalog]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    isInstalled: (id) => state.installedIds.has(id),
    getItem: (id) => state.itemMap.get(id),
    refresh,
  };
}
```

#### 期待される効果

- ✅ **統一されたインターフェース**: 拡張機能とレイアウトで同じAPI
- ✅ **ローディング状態の管理**: loading状態を含む
- ✅ **キャッシュ戦略の一元化**: リフレッシュロジックを統一

#### 実装工数

- 工数: **0.5日**
- 難易度: **低**

---

### 4. useMemo の連鎖を簡素化 🟢 LOW

#### 現状の問題

`ExtensionMarketplaceSettings.tsx`で複雑なuseMemo連鎖:

```typescript
const allExtensions = useMemo(() => {
  // Step 1: installedData生成
  // Step 2: hybridMarketplaceData生成
  // Step 3: 重複排除
  // 複雑なロジックが1つのuseMemoに詰め込まれている
}, [namespacedData, groupedMarketplaceData, isExtensionInstalled, marketplaceExtensions]);

const groupedExtensions = useMemo(() => {
  // allExtensionsをバージョンでグループ化
}, [allExtensions]);

const filteredExtensions = useMarketplaceSearch({
  items: groupedExtensions,
  // ...
});
```

#### 提案する解決策

**データ変換パイプラインの明確化**:

```typescript
// Step 1: インストール済み拡張機能の取得（独立したuseMemo）
const installedExtensions = useMemo(() => {
  return namespacedData.flatMap((namespace) =>
    namespace.entries.map((ext) => toExtensionData(ext, { installed: true })),
  );
}, [namespacedData]);

// Step 2: マーケットプレイス拡張機能の取得（独立したuseMemo）
const marketplaceExtensions = useMemo(() => {
  return flattenMarketplaceExtensions(marketplaceData);
}, [marketplaceData]);

// Step 3: マージと重複排除（シンプルな関数）
const allExtensions = useMemo(() => {
  return mergeAndDeduplicateExtensions(installedExtensions, marketplaceExtensions);
}, [installedExtensions, marketplaceExtensions]);

// Step 4: バージョンでグループ化
const groupedExtensions = useMemo(() => {
  return groupExtensionsByVersion(allExtensions);
}, [allExtensions]);
```

ヘルパー関数として切り出し:

```typescript
// packages/suite-base/src/util/extensionDataHelpers.ts

export function toExtensionData(
  ext: ExtensionInfo,
  options: { installed: boolean },
): ExtensionData {
  return {
    id: ext.id,
    name: ext.name,
    displayName: ext.displayName,
    description: ext.description,
    publisher: ext.publisher,
    version: ext.version,
    tags: ext.tags,
    installed: options.installed,
    homepage: ext.homepage,
    license: ext.license,
    qualifiedName: ext.qualifiedName,
    namespace: ext.namespace,
    readme: ext.readme,
    changelog: ext.changelog,
  };
}

export function mergeAndDeduplicateExtensions(
  installed: ExtensionData[],
  marketplace: ExtensionData[],
): ExtensionData[] {
  const unique = new Map<string, ExtensionData>();

  // インストール済みを優先
  installed.forEach((ext) => {
    unique.set(ext.id, ext);
  });

  // マーケットプレイスデータを追加（既存は上書きしない）
  marketplace.forEach((ext) => {
    if (!unique.has(ext.id)) {
      unique.set(ext.id, ext);
    }
  });

  return Array.from(unique.values());
}

export function groupExtensionsByVersion(extensions: ExtensionData[]): GroupedExtensionData[] {
  const groups = new Map<string, GroupedExtensionData>();

  extensions.forEach((ext) => {
    const baseId = ExtensionIdUtils.withPublisher(ext.name, ext.publisher);

    if (!groups.has(baseId)) {
      groups.set(baseId, createExtensionGroup(ext));
    }

    const group = groups.get(baseId)!;
    addVersionToGroup(group, ext);
  });

  return Array.from(groups.values());
}
```

#### 期待される効果

- ✅ **可読性向上**: 各ステップが独立して理解可能
- ✅ **テスト容易性**: 各ヘルパー関数を個別にテスト可能
- ✅ **再利用性**: ヘルパー関数を他の場所でも使用可能

#### 実装工数

- 工数: **0.5日**
- 難易度: **低**

---

## 📊 優先順位と実装計画

### Phase 2-A: 共通Hookの作成（優先度: 高）

| 項目                    | 工数  | 難易度 | 効果      |
| ----------------------- | ----- | ------ | --------- |
| useMarketplaceOperation | 0.5日 | 低     | 🟡 Medium |
| useOperationStatus      | 0.5日 | 低     | 🟡 Medium |
| **合計**                | 1日   | -      | -         |

**理由**:

- エラーハンドリングと状態管理の統一は保守性向上に直結
- 両方とも拡張機能とレイアウトで共通化可能
- 実装が比較的単純で、リスクが低い

### Phase 2-B: データ処理の改善（優先度: 中）

| 項目                | 工数  | 難易度 | 効果   |
| ------------------- | ----- | ------ | ------ |
| useInstalledItems   | 0.5日 | 低     | 🟢 Low |
| useMemo連鎖の簡素化 | 0.5日 | 低     | 🟢 Low |
| **合計**            | 1日   | -      | -      |

**理由**:

- 現状でも機能しているが、将来的な拡張性のため
- データ処理の明確化はDX向上に貢献

---

## 🎯 期待される総合効果

### コード品質の向上

**Before (Phase 1後)**:

- ✅ ID操作の重複解消
- ✅ Set/配列操作の最適化
- ⚠️ エラーハンドリングの重複
- ⚠️ 状態管理の一貫性欠如

**After (Phase 2後)**:

- ✅ ID操作の重複解消
- ✅ Set/配列操作の最適化
- ✅ エラーハンドリングの統一
- ✅ 状態管理の統一
- ✅ データ処理の明確化

### 保守性の向上

- **コード重複**: さらに削減（Phase 1: -40% → Phase 2: -60%）
- **テスト容易性**: Hook単体でテスト可能
- **一貫性**: 拡張機能とレイアウトで統一されたパターン

### 開発者体験（DX）の向上

- **学習コスト**: 統一されたAPIで理解しやすい
- **実装速度**: 共通Hookで新機能追加が容易
- **デバッグ**: 問題箇所の特定が容易

---

## 📝 実装ロードマップ

### Week 1: Phase 2-A（共通Hook作成）

```
Day 1-2: useMarketplaceOperation の実装
  - Hook作成
  - ユニットテスト作成
  - ExtensionMarketplaceSettingsに適用
  - LayoutMarketplaceSettingsに適用

Day 3-4: useOperationStatus の実装
  - Hook作成
  - ユニットテスト作成
  - ExtensionMarketplaceSettingsに適用
  - LayoutMarketplaceSettingsに適用

Day 5: 統合テストと検証
  - E2Eテスト実施
  - パフォーマンステスト
  - コードレビュー
```

### Week 2: Phase 2-B（データ処理改善）

```
Day 1-2: useInstalledItems の実装
  - Hook作成
  - ユニットテスト作成
  - 既存コードへの適用

Day 3-4: useMemo連鎖の簡素化
  - ヘルパー関数の作成
  - ユニットテスト作成
  - リファクタリング実施

Day 5: 総合テストとドキュメント更新
  - 統合テスト
  - パフォーマンステスト
  - ドキュメント更新
```

---

## ⚠️ 注意事項

### リスク

1. **後方互換性**

   - 既存のAPIは維持しつつ、段階的に移行
   - `@deprecated`マークで移行を促す

2. **パフォーマンス**

   - 新しいHookがオーバーヘッドにならないよう注意
   - ベンチマークテストで検証

3. **テスト範囲**
   - 既存の機能が壊れないよう、包括的なテストが必要
   - E2Eテストでユーザーシナリオを検証

### 成功の指標

- ✅ コード重複が60%以上削減
- ✅ ユニットテストカバレッジ80%以上
- ✅ すべてのE2Eテストがパス
- ✅ パフォーマンスの劣化がない（±5%以内）

---

## 🔗 関連ドキュメント

- [20251014_02_marketplace-code-issues-analysis.md](../../08_worklogs/2025_10/20251014/20251014_02_marketplace-code-issues-analysis.md) - 分析レポート
- [20251014_03_marketplace-code-quality-improvements.md](../../08_worklogs/2025_10/20251014/20251014_03_marketplace-code-quality-improvements.md) - Phase 1実装記録

---

**作成者**: GitHub Copilot
**レビュー推奨**: 開発チーム
**次のアクション**: Phase 2-Aの実装開始判断
