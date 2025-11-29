# マーケットプレイス実装 コード品質分析レポート

**作成日**: 2025年10月14日
**分析対象**: 拡張機能・レイアウトマーケットプレイス実装
**分析目的**: 無駄な処理、重複コード、改善可能な箇所の特定

---

## 📋 目次

1. [エグゼクティブサマリー](#1-エグゼクティブサマリー)
2. [重複コードの問題](#2-重複コードの問題)
3. [無駄な処理の問題](#3-無駄な処理の問題)
4. [アーキテクチャ上の問題](#4-アーキテクチャ上の問題)
5. [パフォーマンス上の問題](#5-パフォーマンス上の問題)
6. [改善提案](#6-改善提案)

---

## 1. エグゼクティブサマリー

### 発見された問題の概要

| カテゴリ           | 深刻度   | 問題数 | 影響範囲       |
| ------------------ | -------- | ------ | -------------- |
| **重複コード**     | 🟡 中    | 5件    | 保守性         |
| **無駄な処理**     | 🟡 中    | 4件    | パフォーマンス |
| **アーキテクチャ** | 🟠 中-高 | 3件    | 拡張性・保守性 |
| **パフォーマンス** | 🟢 低    | 2件    | UX             |

### 総合評価

- **コード品質**: 🟡 良好（一部改善の余地あり）
- **重大な問題**: ❌ なし
- **推奨される対応**: ✅ リファクタリングによる改善

---

## 2. 重複コードの問題

### 2.1 ID操作ユーティリティの重複 🔴 HIGH

**問題箇所**:

- `packages/suite-base/src/services/extension/IdbExtensionStorageMigration.ts`
- `packages/suite-base/src/util/marketplace/extensionIdHelpers.ts`
- `packages/suite-base/src/components/shared/Marketplace/utils/version/versionIdentifier.ts`

**重複している機能**:

```typescript
// ❌ 重複1: IdbExtensionStorageMigration.ts
export function extractBaseId(versionedId: string): string {
  if (versionedId.includes("@")) {
    const parts = versionedId.split("@");
    return parts[0] ?? versionedId;
  }
  return versionedId;
}

export function toV2Id(baseId: string, version: string): string {
  return `${baseId}@${version}`;
}

// ❌ 重複2: extensionIdHelpers.ts
export function extractBaseId(id: string): string {
  if (isVersionedId(id)) {
    const parts = id.split("@");
    return parts[0] ?? id;
  }
  return id;
}

export function generateVersionedId(baseId: string, version: string): string {
  const cleanBaseId = extractBaseId(baseId);
  return `${cleanBaseId}@${version}`;
}

// ❌ 重複3: versionIdentifier.ts
export function generateBaseId(id: string, publisher: string): string {
  const baseId = id.replace(/(@[\d.]+.*)?$/, "");
  return `${publisher}.${baseId}`;
}
```

**影響**:

- 同じロジックが3箇所に存在
- バグ修正時に3箇所を修正する必要
- 一貫性を保つのが困難

**推奨される対応**:

```typescript
// ✅ 統一: packages/suite-base/src/utils/extensionId.ts
export class ExtensionIdUtils {
  /**
   * Extract base ID from versioned ID
   * @example "publisher.name@1.0.0" → "publisher.name"
   */
  static extractBaseId(id: string): string {
    return id.split("@")[0] ?? id;
  }

  /**
   * Generate versioned ID
   * @example ("publisher.name", "1.0.0") → "publisher.name@1.0.0"
   */
  static toVersionedId(baseId: string, version: string): string {
    const cleanBaseId = this.extractBaseId(baseId);
    return `${cleanBaseId}@${version}`;
  }

  /**
   * Check if ID is versioned
   */
  static isVersioned(id: string): boolean {
    return id.includes("@");
  }

  /**
   * Extract version from ID
   * @example "publisher.name@1.0.0" → "1.0.0"
   */
  static extractVersion(id: string): string | undefined {
    return this.isVersioned(id) ? id.split("@")[1] : undefined;
  }

  /**
   * Generate base ID with publisher
   * @example ("my-extension", "acme") → "acme.my-extension"
   */
  static withPublisher(name: string, publisher: string): string {
    return `${publisher}.${name}`;
  }
}
```

### 2.2 インストール状態管理の重複 🟡 MEDIUM

**問題箇所**:

- `ExtensionMarketplaceSettings.tsx`: `operationStatus` (Record<string, OperationStatus>)
- `LayoutMarketplaceSettings.tsx`: `installingIds` (Set<string>)

**重複パターン**:

```typescript
// ❌ ExtensionMarketplaceSettings.tsx
const [operationStatus, setOperationStatus] = useState<Record<string, OperationStatus>>({});

setOperationStatus((prev) => ({ ...prev, [versionedId]: OperationStatus.INSTALLING }));
// ... later
setOperationStatus((prev) => ({ ...prev, [versionedId]: OperationStatus.IDLE }));

// ❌ LayoutMarketplaceSettings.tsx
const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());

setInstallingIds((prev) => new Set(prev).add(layout.id));
// ... later
setInstallingIds((prev) => {
  const next = new Set(prev);
  next.delete(layout.id);
  return next;
});
```

**問題点**:

- 同じ目的（インストール中状態の管理）で異なる実装
- `Set`の作成コストが無駄（毎回`new Set(prev)`）
- 拡張機能は詳細な状態管理（INSTALLING/UNINSTALLING）、レイアウトは簡易的

**推奨される対応**:

```typescript
// ✅ 共通Hook: useInstallationState.ts
export enum OperationStatus {
  IDLE = "idle",
  INSTALLING = "installing",
  UNINSTALLING = "uninstalling",
}

export interface UseInstallationStateOptions {
  enableDetailedStatus?: boolean; // true: Record, false: Set
}

export function useInstallationState(options?: UseInstallationStateOptions) {
  const enableDetailed = options?.enableDetailedStatus ?? false;

  const [operations, setOperations] = useState<Record<string, OperationStatus>>({});

  const setOperationStatus = useCallback((id: string, status: OperationStatus) => {
    setOperations((prev) => {
      if (status === OperationStatus.IDLE) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: status };
    });
  }, []);

  const isOperating = useCallback(
    (id: string) => {
      return operations[id] !== undefined && operations[id] !== OperationStatus.IDLE;
    },
    [operations],
  );

  const getStatus = useCallback(
    (id: string) => {
      return operations[id] ?? OperationStatus.IDLE;
    },
    [operations],
  );

  return {
    setOperationStatus,
    isOperating,
    getStatus,
    operations,
  };
}

// 使用例
// ExtensionMarketplaceSettings
const { setOperationStatus, isOperating } = useInstallationState({
  enableDetailedStatus: true,
});

// LayoutMarketplaceSettings
const { setOperationStatus, isOperating } = useInstallationState();
```

### 2.3 インストール済みチェックロジックの重複 🟡 MEDIUM

**問題箇所**:

- `ExtensionMarketplaceSettings.tsx`: `isAnyVersionInstalled()`
- `LayoutMarketplaceSettings.tsx`: `loadInstalledLayouts()`

**重複パターン**:

```typescript
// ❌ ExtensionMarketplaceSettings.tsx
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

// ❌ LayoutMarketplaceSettings.tsx
const loadInstalledLayouts = useCallback(async () => {
  try {
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
  } catch (err) {
    console.error("Failed to load installed layouts:", err);
  }
}, [catalog]);
```

**問題点**:

- 拡張機能とレイアウトで異なるアプローチ
- 拡張機能: 同期的チェック、レイアウト: 非同期ロード
- 両方とも「インストール済みアイテムのマッピング」という同じ目的

**推奨される対応**:

統一されたインターフェースを持つContext/Hookで管理

```typescript
// ✅ useInstalledItems.ts
export interface InstalledItemsState<T> {
  installedIds: Set<string>;
  itemMap: Map<string, T>;
  isInstalled: (marketplaceId: string) => boolean;
  refresh: () => Promise<void>;
}

export function useInstalledExtensions(): InstalledItemsState<ExtensionInfo> {
  const namespacedData = useExtensionCatalog((state) => state.installedExtensions);

  return useMemo(() => {
    const installedIds = new Set<string>();
    const itemMap = new Map<string, ExtensionInfo>();

    namespacedData?.forEach((ext) => {
      const baseId = ExtensionIdUtils.extractBaseId(ext.id);
      installedIds.add(baseId);
      itemMap.set(baseId, ext);
    });

    return {
      installedIds,
      itemMap,
      isInstalled: (id) => installedIds.has(ExtensionIdUtils.extractBaseId(id)),
      refresh: async () => {
        // Handled by Zustand store
      },
    };
  }, [namespacedData]);
}

export function useInstalledLayouts(): InstalledItemsState<Layout> {
  const catalog = useLayoutCatalog();
  const [state, setState] = useState<{
    installedIds: Set<string>;
    itemMap: Map<string, Layout>;
  }>({
    installedIds: new Set(),
    itemMap: new Map(),
  });

  const refresh = useCallback(async () => {
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

    setState({ installedIds, itemMap });
  }, [catalog]);

  return {
    ...state,
    isInstalled: (id) => state.installedIds.has(id),
    refresh,
  };
}
```

### 2.4 エラーハンドリングパターンの重複 🟢 LOW

**問題箇所**:

- `ExtensionMarketplaceSettings.tsx`: `handleInstall()`, `handleUninstall()`
- `LayoutMarketplaceSettings.tsx`: `installLayout()`, `uninstallLayout()`

**重複パターン**:

```typescript
// ❌ 両方で同じパターン
try {
  setOperationStatus(...);
  await new Promise((resolve) => setTimeout(resolve, 200)); // UX delay
  // ... operation ...
  enqueueSnackbar("Success", { variant: "success" });
} catch (error) {
  const err = error as Error;
  enqueueSnackbar(`Failed: ${err.message}`, { variant: "error" });
} finally {
  if (isMounted()) {
    setOperationStatus(...);
  }
}
```

**推奨される対応**:

```typescript
// ✅ useMarketplaceOperation.ts
export function useMarketplaceOperation() {
  const { enqueueSnackbar } = useSnackbar();
  const isMounted = useMountedState();

  const executeOperation = useCallback(
    async <T>(
      operation: () => Promise<T>,
      options: {
        successMessage: string;
        errorMessage: string;
        onBefore?: () => void;
        onAfter?: () => void;
        delayMs?: number;
      },
    ): Promise<T | undefined> => {
      try {
        options.onBefore?.();

        // UX delay
        if (options.delayMs) {
          await new Promise((resolve) => setTimeout(resolve, options.delayMs));
        }

        const result = await operation();
        enqueueSnackbar(options.successMessage, { variant: "success" });
        return result;
      } catch (error) {
        const err = error as Error;
        enqueueSnackbar(`${options.errorMessage}: ${err.message}`, {
          variant: "error",
        });
        return undefined;
      } finally {
        if (isMounted()) {
          options.onAfter?.();
        }
      }
    },
    [enqueueSnackbar, isMounted],
  );

  return { executeOperation };
}

// 使用例
const { executeOperation } = useMarketplaceOperation();

await executeOperation(() => installExtensions(namespace, [data]), {
  successMessage: `${extension.displayName} installed successfully`,
  errorMessage: `Failed to install ${extension.displayName}`,
  onBefore: () => setOperationStatus(id, OperationStatus.INSTALLING),
  onAfter: () => setOperationStatus(id, OperationStatus.IDLE),
  delayMs: 200,
});
```

### 2.5 データ変換ロジックの重複 🟡 MEDIUM

**問題箇所**:

- `ExtensionMarketplaceSettings.tsx`: `allExtensions` useMemo
- `useExtensionSettings.ts`: `installedEntries` useMemo

**重複パターン**:

```typescript
// ❌ ExtensionMarketplaceSettings.tsx
const installedData: ExtensionData[] = namespacedData.flatMap((namespace) =>
  namespace.entries.map((ext) => ({
    id: ext.id,
    name: ext.name,
    displayName: ext.displayName,
    description: ext.description,
    publisher: ext.publisher,
    version: ext.version,
    tags: ext.tags,
    installed: isExtensionInstalled(ext.id),
    // ... more fields
  })),
);

// ❌ useExtensionSettings.ts
const installedEntries = useMemo(() => {
  return (installed ?? []).map((entry) => {
    const marketplaceEntry = marketplaceMap[entry.id];
    if (marketplaceEntry != undefined) {
      return { ...marketplaceEntry, namespace: entry.namespace };
    }

    return {
      id: entry.id,
      installed: true,
      name: entry.displayName,
      displayName: entry.displayName,
      description: entry.description,
      publisher: entry.publisher,
      // ... more fields
    };
  });
}, [installed, marketplaceMap]);
```

**問題点**:

- 同じ目的（ExtensionInfo → ExtensionData変換）で異なる実装
- マッピングロジックが分散

**推奨される対応**:

```typescript
// ✅ extensionDataMapper.ts
export class ExtensionDataMapper {
  static toExtensionData(
    ext: ExtensionInfo,
    options?: {
      installed?: boolean;
      marketplaceEntry?: ExtensionMarketplaceDetail;
    },
  ): ExtensionData {
    return {
      id: ext.id,
      name: ext.name,
      displayName: ext.displayName ?? ext.name,
      description: ext.description,
      publisher: ext.publisher,
      version: ext.version,
      tags: ext.tags ?? [],
      installed: options?.installed ?? false,
      homepage: ext.homepage ?? options?.marketplaceEntry?.homepage,
      license: ext.license ?? options?.marketplaceEntry?.license,
      qualifiedName: ext.qualifiedName,
      namespace: ext.namespace,
      readme: ext.readme ?? options?.marketplaceEntry?.readme,
      changelog: ext.changelog ?? options?.marketplaceEntry?.changelog,
    };
  }

  static fromMarketplaceEntry(
    entry: ExtensionMarketplaceDetail,
    installed: boolean = false,
  ): ExtensionData {
    return {
      id: entry.id,
      name: entry.name,
      displayName: entry.displayName ?? entry.name,
      description: entry.description,
      publisher: entry.publisher,
      version: entry.version,
      tags: entry.keywords ?? [],
      installed,
      homepage: entry.homepage,
      license: entry.license,
      readme: entry.readme,
      changelog: entry.changelog,
    };
  }
}
```

---

## 3. 無駄な処理の問題

### 3.1 Set の不要な再作成 🟡 MEDIUM

**問題箇所**: `LayoutMarketplaceSettings.tsx`

```typescript
// ❌ 無駄: 毎回新しいSetを作成
setInstallingIds((prev) => new Set(prev).add(layout.id));

// ... later
setInstallingIds((prev) => {
  const next = new Set(prev);
  next.delete(layout.id);
  return next;
});
```

**問題点**:

- `Set`のコピー作成（O(n)）が不要
- Reactの不変性は保つ必要があるが、効率的な方法がある

**推奨される対応**:

```typescript
// ✅ 最適化版
setInstallingIds((prev) => {
  // 既に含まれている場合は何もしない（不要な再レンダリング防止）
  if (prev.has(layout.id)) return prev;

  const next = new Set(prev);
  next.add(layout.id);
  return next;
});

setInstallingIds((prev) => {
  // 含まれていない場合は何もしない
  if (!prev.has(layout.id)) return prev;

  const next = new Set(prev);
  next.delete(layout.id);
  return next;
});

// ✅ さらに最適化（小規模なSetの場合）
// Setの代わりにRecord<string, boolean>を使う
const [installingIds, setInstallingIds] = useState<Record<string, boolean>>({});

setInstallingIds((prev) => ({ ...prev, [layout.id]: true }));
// ... later
setInstallingIds((prev) => {
  const { [layout.id]: _, ...rest } = prev;
  return rest;
});
```

### 3.2 不要な useMemo の連鎖 🟡 MEDIUM

**問題箇所**: `ExtensionMarketplaceSettings.tsx`

```typescript
// ❌ 過剰な useMemo 使用
const allExtensions = useMemo(() => {
  // ... 複雑な処理 ...
}, [deps]);

const groupedExtensions = useMemo(() => {
  // allExtensions を処理
}, [allExtensions, ...]);

const mappedFilteredExtensions = useMemo(() => {
  return filteredExtensions.map(/* ... */);
}, [filteredExtensions]);
```

**問題点**:

- `useMemo`の連鎖が深い（3段階以上）
- 中間データ構造が複雑で理解しづらい
- メモ化のオーバーヘッドが高い可能性

**推奨される対応**:

```typescript
// ✅ 最適化: データ変換パイプラインを明確化
const processedExtensions = useMemo(() => {
  // Step 1: Merge installed and marketplace data
  const merged = mergeExtensionData(namespacedData, marketplaceExtensions);

  // Step 2: Group by version
  const grouped = groupByVersion(merged);

  // Step 3: Apply search/filter (moved to useMarketplaceSearch)
  return grouped;
}, [namespacedData, marketplaceExtensions]);

// useMarketplaceSearch handles filtering internally
const { filteredItems } = useMarketplaceSearch({
  items: processedExtensions,
  // ...
});

// ✅ 不要な変換を削除
// mappedFilteredExtensions は削除し、直接 filteredItems を使用
```

### 3.3 重複するデータフェッチ 🟢 LOW

**問題箇所**: `LayoutMarketplaceSettings.tsx`

```typescript
// ❌ loadInstalledLayouts が複数箇所で呼ばれる
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden && layouts.length > 0) {
      void loadInstalledLayouts(); // ← 1
    }
  };

  if (layouts.length > 0) {
    void loadInstalledLayouts(); // ← 2
  }
}, [layouts.length, loadInstalledLayouts]);

// installLayout 内でも
await loadInstalledLayouts(); // ← 3

// uninstallLayout 内でも
await loadInstalledLayouts(); // ← 4
```

**問題点**:

- 同じデータを短時間に複数回フェッチ
- API呼び出しのオーバーヘッド

**推奨される対応**:

```typescript
// ✅ デバウンスされたリフレッシュ
const debouncedRefresh = useDebouncedCallback(
  () => {
    void loadInstalledLayouts();
  },
  500, // 500ms以内の連続呼び出しは無視
  { leading: false, trailing: true }
);

// 使用箇所
await installLayout(...);
debouncedRefresh(); // ← デバウンスされる

await uninstallLayout(...);
debouncedRefresh(); // ← デバウンスされる
```

### 3.4 不要な配列コピー 🟢 LOW

**問題箇所**: `ExtensionMarketplaceSettings.tsx`

```typescript
// ❌ スプレッド演算子で配列をコピー
const unique = new Map<string, ExtensionData>();
[...installedData, ...hybridMarketplaceData].forEach((ext) => {
  // ...
});
```

**問題点**:

- `installedData` と `hybridMarketplaceData` を結合して新しい配列を作成
- Mapに追加するだけなら結合不要

**推奨される対応**:

```typescript
// ✅ 直接処理
const unique = new Map<string, ExtensionData>();

// インストール済みを優先
installedData.forEach((ext) => {
  unique.set(ext.id, ext);
});

// マーケットプレイスデータを追加（既存は上書きしない）
hybridMarketplaceData.forEach((ext) => {
  if (!unique.has(ext.id)) {
    unique.set(ext.id, ext);
  }
});

return Array.from(unique.values());
```

---

## 4. アーキテクチャ上の問題

### 4.1 データソースの二重管理 🟠 HIGH

**問題箇所**: `ExtensionMarketplaceSettings.tsx`

```typescript
// ❌ 2つのデータソースを同時に使用
const marketplaceExtensions = useExtensionCatalog((state) => state.marketplaceExtensions);
const { marketplaceEntries } = useExtensionSettings();

// データの取得方法が分岐
const hybridMarketplaceData: ExtensionData[] =
  marketplaceExtensions && marketplaceExtensions.length > 0
    ? marketplaceExtensions.flatMap(/* ... */) // ← ソース1
    : groupedMarketplaceData.flatMap(/* ... */); // ← ソース2
```

**問題点**:

- `marketplaceExtensions` (ExtensionCatalog) と `marketplaceEntries` (useExtensionSettings) の2つのデータソース
- どちらを信頼すべきか不明確
- データの整合性が保証されない

**影響**:

- バグの温床
- テストの複雑化
- 保守性の低下

**推奨される対応**:

```typescript
// ✅ 統一: ExtensionCatalogContextを唯一のデータソースに
export interface ExtensionCatalog {
  // ...existing...

  // マーケットプレイス関連を強化
  getMarketplaceExtensions: () => Promise<ExtensionItem[]>;
  searchMarketplaceExtensions: (query: string) => Promise<ExtensionItem[]>;
  refreshMarketplaceData: () => Promise<void>;

  // 状態
  marketplaceExtensions: ExtensionItem[] | undefined;
  marketplaceLoading: boolean;
  marketplaceError: string | undefined;
}

// ✅ useExtensionSettings は削除または簡素化
// ExtensionCatalogから直接データを取得するようにリファクタリング
```

### 4.2 Context間の依存関係の複雑さ 🟡 MEDIUM

**問題箇所**: `LayoutMarketplaceSettings.tsx`

```typescript
// ❌ 多数のContextへの依存
const marketplace = useLayoutMarketplace(); // ← 1
const catalog = useLayoutCatalog(); // ← 2
const { actions: previewActions } = usePreviewLayout(); // ← 3
const { dialogActions } = useWorkspaceActions(); // ← 4
```

**問題点**:

- 1つのコンポーネントが4つのContextに依存
- テスタビリティの低下
- Context間の暗黙的な依存関係

**推奨される対応**:

```typescript
// ✅ Facadeパターンで依存を集約
export function useLayoutMarketplaceActions() {
  const marketplace = useLayoutMarketplace();
  const catalog = useLayoutCatalog();
  const preview = usePreviewLayout();
  const workspace = useWorkspaceActions();

  return {
    // 統合されたアクション
    async installLayout(layout: LayoutMarketplaceDetail) {
      const data = await marketplace.downloadLayout(layout.layout);
      return catalog.installLayoutFromMarketplace(layout);
    },

    async previewLayout(layout: LayoutMarketplaceDetail) {
      const data = await marketplace.downloadLayout(layout.layout);
      workspace.dialogActions.preferences.close();
      return preview.actions.startPreview(layout, data);
    },

    async uninstallLayout(layoutId: LayoutID) {
      return catalog.uninstallMarketplaceLayout(layoutId);
    },
  };
}

// 使用例
const { installLayout, previewLayout, uninstallLayout } = useLayoutMarketplaceActions();
```

### 4.3 状態管理の一貫性の欠如 🟡 MEDIUM

**問題**:

- 拡張機能: Zustandストア（ExtensionCatalogContext）
- レイアウト: React Context API + useState（LayoutMarketplaceSettings内）

**問題点**:

- 同じマーケットプレイス機能で異なる状態管理
- レイアウトは各コンポーネントで独自に状態管理
- データの一元管理ができない

**推奨される対応**:

```typescript
// ✅ レイアウトもZustandストアに移行
export interface LayoutCatalogStore {
  layouts: LayoutMarketplaceDetail[];
  installedLayouts: Layout[];
  installedMarketplaceIds: Set<string>;
  loading: boolean;
  error: string | undefined;

  // Actions
  fetchLayouts: () => Promise<void>;
  installLayout: (detail: LayoutMarketplaceDetail) => Promise<void>;
  uninstallLayout: (id: LayoutID) => Promise<void>;
  refreshInstalledLayouts: () => Promise<void>;
}

export const LayoutCatalogContext = createContext<StoreApi<LayoutCatalogStore>>(undefined);

// 使用例
const layouts = useLayoutCatalog((state) => state.layouts);
const installLayout = useLayoutCatalog((state) => state.installLayout);
```

---

## 5. パフォーマンス上の問題

### 5.1 大量のアイテム表示時のパフォーマンス 🟢 LOW

**問題箇所**: `MarketplaceGrid`

```typescript
// ❌ 全アイテムを一度にレンダリング
<MarketplaceGrid>
  {filteredLayouts.map((layout) => (
    <MarketplaceCard key={layout.id} {...} />
  ))}
</MarketplaceGrid>
```

**問題点**:

- 100+アイテムがある場合、パフォーマンス低下の可能性
- 初期レンダリングが遅い

**推奨される対応**:

```typescript
// ✅ 仮想スクロール導入
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualizedMarketplaceGrid({ items }: { items: MarketplaceItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(items.length / 3), // 3列グリッド
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // カードの高さ
    overscan: 2,
  });

  return (
    <div ref={parentRef} style={{ height: "600px", overflow: "auto" }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * 3;
          const rowItems = items.slice(startIndex, startIndex + 3);

          return (
            <div key={virtualRow.key}>
              {rowItems.map((item) => (
                <MarketplaceCard key={item.id} {...item} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 5.2 サムネイル画像の遅延ロード未実装 🟢 LOW

**問題箇所**: `MarketplaceCard`

```typescript
// ❌ サムネイルを即座にロード
<img src={thumbnail} alt={name} />
```

**推奨される対応**:

```typescript
// ✅ 遅延ロード + プレースホルダー
<img
  src={thumbnail}
  alt={name}
  loading="lazy"
  onError={(e) => {
    e.currentTarget.src = "/placeholder-thumbnail.png";
  }}
/>
```

---

## 6. 改善提案

### 優先度1: 即座に対応すべき改善 🔴

#### 1. ID操作ユーティリティの統一

- **工数**: 0.5日
- **影響**: バグ修正の効率化、保守性向上
- **実装**: `ExtensionIdUtils`クラスを作成し、既存の3箇所を置き換え

#### 2. データソースの一元化

- **工数**: 1日
- **影響**: データの整合性保証、バグ削減
- **実装**: `useExtensionSettings`を廃止し、`ExtensionCatalog`に統合

### 優先度2: 計画的に対応すべき改善 🟡

#### 3. 共通Hookの作成

- **工数**: 1日
- **影響**: コードの重複削減、保守性向上
- **実装**:
  - `useInstallationState`: インストール状態管理
  - `useMarketplaceOperation`: CRUD操作の共通化
  - `useLayoutMarketplaceActions`: Context依存の集約

#### 4. パフォーマンス最適化

- **工数**: 0.5日
- **影響**: UX向上、大量データ対応
- **実装**:
  - Set操作の最適化
  - useMemo連鎖の簡素化
  - データフェッチのデバウンス

#### 5. 状態管理の統一

- **工数**: 2日
- **影響**: アーキテクチャの一貫性、保守性向上
- **実装**: LayoutCatalogもZustandストアに移行

### 優先度3: 将来的に検討すべき改善 🟢

#### 6. 仮想スクロールの導入

- **工数**: 1日
- **影響**: 大量アイテム表示時のパフォーマンス向上
- **実装**: `@tanstack/react-virtual`の導入

#### 7. 画像の遅延ロード

- **工数**: 0.5日
- **影響**: 初期ロード時間の短縮
- **実装**: `loading="lazy"`属性の追加

---

## 7. 実装ロードマップ

### Phase 1: 緊急対応（1週間）

```
Week 1:
  Day 1-2: ID操作ユーティリティの統一
  Day 3-4: データソースの一元化
  Day 5: テスト・検証
```

### Phase 2: 中期改善（2週間）

```
Week 2:
  Day 1-2: useInstallationState Hook作成
  Day 3-4: useMarketplaceOperation Hook作成
  Day 5: useLayoutMarketplaceActions Hook作成

Week 3:
  Day 1-2: パフォーマンス最適化
  Day 3-5: 状態管理の統一（Layout → Zustand）
```

### Phase 3: 長期改善（1週間）

```
Week 4:
  Day 1-2: 仮想スクロール実装
  Day 3: 画像遅延ロード
  Day 4-5: 総合テスト・ドキュメント更新
```

---

## 8. まとめ

### コード品質評価

| 項目               | 評価  | コメント                       |
| ------------------ | ----- | ------------------------------ |
| **重複コード**     | 🟡 B  | 一部重複あり、統一が必要       |
| **無駄な処理**     | 🟡 B  | 小規模な最適化の余地あり       |
| **アーキテクチャ** | 🟡 B  | 一貫性を高める余地あり         |
| **パフォーマンス** | 🟢 A  | 現状は問題なし、将来対応を検討 |
| **総合評価**       | 🟡 B+ | **良好だが改善の余地あり**     |

### 重要なポイント

1. **重大なバグや致命的な問題はない**

   - 現在の実装は動作しており、ユーザーに問題を引き起こしていない

2. **保守性向上が最優先**

   - ID操作の統一とデータソースの一元化が最重要
   - これにより将来のバグ修正が容易になる

3. **段階的な改善が推奨**

   - 一度に全てを変更するのではなく、Phase 1 → Phase 2 → Phase 3と段階的に実施
   - 各Phaseでテストを実施し、品質を確保

4. **パフォーマンスは現状問題なし**
   - 仮想スクロール等は将来的な対応で十分
   - ただし、データ量が増加する見込みがある場合は早期対応を検討

---

**作成者**: GitHub Copilot
**レビュー推奨**: 開発チーム全員
**次のアクション**: Phase 1の実装計画策定
