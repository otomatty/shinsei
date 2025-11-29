# インストール状態管理の一貫性欠如

**発見日**: 2025年10月14日
**解決日**: 2025年10月14日
**発見場所**: マーケットプレイス機能のコードレビュー中
**重要度**: 🟡 Medium
**ステータス**: ✅ Resolved

---

## 問題の詳細

### 影響範囲

拡張機能とレイアウトで、インストール状態の管理方法が異なっています:

1. **ExtensionMarketplaceSettings.tsx**

   ```typescript
   const [operationStatus, setOperationStatus] = useState<Record<string, OperationStatus>>({});

   enum OperationStatus {
     IDLE = "idle",
     INSTALLING = "installing",
     UNINSTALLING = "uninstalling",
   }
   ```

2. **LayoutMarketplaceSettings.tsx**
   ```typescript
   const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
   ```

### なぜ問題か

1. **一貫性の欠如**

   - 拡張機能: `Record<string, OperationStatus>` で詳細な状態管理
   - レイアウト: `Set<string>` で簡易的な状態管理
   - 同じ目的（インストール中の追跡）なのに異なるアプローチ

2. **拡張性の問題**

   - レイアウトも将来的に詳細な状態が必要になる可能性
   - 例: INSTALLING / UNINSTALLING / UPDATING の区別
   - 現在の`Set`では状態の詳細を保持できない

3. **コードの理解しにくさ**

   - 新しい開発者が2つの異なるパターンを学習する必要
   - どちらを使うべきか判断が難しい

4. **保守コストの増加**
   - 2つの異なる実装を保守する必要
   - 変更が必要な場合、2箇所を個別に修正

### 具体的なコード例

#### ExtensionMarketplaceSettings.tsx

```typescript
// 詳細な状態管理
setOperationStatus((prev) => ({
  ...prev,
  [versionedId]: OperationStatus.INSTALLING,
}));

// 状態チェック
const status = operationStatus[versionedId];
const isInstalling = status === OperationStatus.INSTALLING;
const isUninstalling = status === OperationStatus.UNINSTALLING;
```

#### LayoutMarketplaceSettings.tsx

```typescript
// 簡易的な状態管理（インストール中かどうかのみ）
setInstallingIds((prev) => {
  if (prev.has(layout.id)) return prev;
  const next = new Set(prev);
  next.add(layout.id);
  return next;
});

// 状態チェック（詳細な状態は不明）
const isInstalling = installingIds.has(layout.id);
```

---

## 解決方法

### 提案: 共通Hook `useOperationStatus` の作成

**新規ファイル**: `packages/suite-base/src/hooks/useOperationStatus.ts`

```typescript
import { useState, useCallback } from "react";

/**
 * Operation status for marketplace items (extensions and layouts)
 */
export enum OperationStatus {
  IDLE = "idle",
  INSTALLING = "installing",
  UNINSTALLING = "uninstalling",
  UPDATING = "updating",
}

export interface UseOperationStatusOptions {
  /**
   * Enable detailed status tracking
   * If false, only tracks whether an operation is in progress
   */
  enableDetailedStatus?: boolean;
}

/**
 * Hook for managing operation status (install/uninstall/update) for marketplace items.
 * Provides a consistent API for both extensions and layouts.
 *
 * @example
 * // For extensions (detailed status)
 * const { setStatus, getStatus, isInstalling } = useOperationStatus({
 *   enableDetailedStatus: true
 * });
 *
 * setStatus("extension-id@1.0.0", OperationStatus.INSTALLING);
 * console.log(getStatus("extension-id@1.0.0")); // OperationStatus.INSTALLING
 * console.log(isInstalling("extension-id@1.0.0")); // true
 *
 * @example
 * // For layouts (simple tracking)
 * const { setStatus, isOperating } = useOperationStatus();
 *
 * setStatus("layout-id", OperationStatus.INSTALLING);
 * console.log(isOperating("layout-id")); // true
 */
export function useOperationStatus(options?: UseOperationStatusOptions) {
  const enableDetailed = options?.enableDetailedStatus ?? true;

  const [operations, setOperations] = useState<Record<string, OperationStatus>>({});

  /**
   * Set operation status for an item
   * @param id Item ID
   * @param status Operation status
   */
  const setStatus = useCallback((id: string, status: OperationStatus) => {
    setOperations((prev) => {
      // Remove from tracking when IDLE (memory optimization)
      if (status === OperationStatus.IDLE) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: status };
    });
  }, []);

  /**
   * Get current operation status for an item
   * @param id Item ID
   * @returns Current status (defaults to IDLE)
   */
  const getStatus = useCallback(
    (id: string): OperationStatus => {
      return operations[id] ?? OperationStatus.IDLE;
    },
    [operations],
  );

  /**
   * Check if any operation is in progress for an item
   * @param id Item ID
   * @returns true if installing/uninstalling/updating
   */
  const isOperating = useCallback(
    (id: string): boolean => {
      const status = operations[id];
      return status !== undefined && status !== OperationStatus.IDLE;
    },
    [operations],
  );

  /**
   * Check if item is currently being installed
   * @param id Item ID
   * @returns true if status is INSTALLING
   */
  const isInstalling = useCallback(
    (id: string): boolean => {
      return operations[id] === OperationStatus.INSTALLING;
    },
    [operations],
  );

  /**
   * Check if item is currently being uninstalled
   * @param id Item ID
   * @returns true if status is UNINSTALLING
   */
  const isUninstalling = useCallback(
    (id: string): boolean => {
      return operations[id] === OperationStatus.UNINSTALLING;
    },
    [operations],
  );

  /**
   * Check if item is currently being updated
   * @param id Item ID
   * @returns true if status is UPDATING
   */
  const isUpdating = useCallback(
    (id: string): boolean => {
      return operations[id] === OperationStatus.UPDATING;
    },
    [operations],
  );

  /**
   * Reset all operation statuses
   */
  const resetAll = useCallback(() => {
    setOperations({});
  }, []);

  return {
    setStatus,
    getStatus,
    isOperating,
    isInstalling,
    isUninstalling,
    isUpdating,
    resetAll,
    operations, // Exposed for debugging or advanced use cases
  };
}
```

### 使用例

#### ExtensionMarketplaceSettings.tsx

```typescript
// Before
const [operationStatus, setOperationStatus] = useState<Record<string, OperationStatus>>({});

setOperationStatus((prev) => ({ ...prev, [versionedId]: OperationStatus.INSTALLING }));
const status = operationStatus[versionedId];

// After
const { setStatus, getStatus, isInstalling, isUninstalling } = useOperationStatus({
  enableDetailedStatus: true,
});

setStatus(versionedId, OperationStatus.INSTALLING);
const status = getStatus(versionedId);

// Usage in JSX
<Button
  disabled={isInstalling(versionedId) || isUninstalling(versionedId)}
  onClick={() => handleInstall(extension, version)}
>
  {isInstalling(versionedId) ? "Installing..." : "Install"}
</Button>
```

#### LayoutMarketplaceSettings.tsx

```typescript
// Before
const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());

setInstallingIds((prev) => {
  if (prev.has(layout.id)) return prev;
  const next = new Set(prev);
  next.add(layout.id);
  return next;
});

const isInstalling = installingIds.has(layout.id);

// After
const { setStatus, isOperating, isInstalling } = useOperationStatus();

setStatus(layout.id, OperationStatus.INSTALLING);
// ... later
setStatus(layout.id, OperationStatus.IDLE);

// Usage in JSX
<Button
  disabled={isOperating(layout.id)}
  onClick={() => installLayout(layout)}
>
  {isInstalling(layout.id) ? "Installing..." : "Install"}
</Button>
```

---

## 影響と効果

### Before

- ❌ 一貫性: 拡張機能とレイアウトで異なる実装
- ❌ 拡張性: レイアウトは詳細な状態を保持できない
- ❌ 保守性: 2つの異なるパターンを保守
- ❌ 学習コスト: 新しい開発者が2つのパターンを学習

### After

- ✅ 一貫性: 統一されたAPIで拡張機能とレイアウトを管理
- ✅ 拡張性: 将来的な状態追加が容易（UPDATING等）
- ✅ 保守性: 1つのHookで一元管理
- ✅ 学習コスト: 1つのパターンのみ理解すれば良い
- ✅ タイプセーフ: enumによる型安全性

### パフォーマンス

**Before (Set版)**:

```typescript
// Setの作成: O(n) - nは要素数
const next = new Set(prev);
next.add(layout.id);
```

**After (Record版)**:

```typescript
// オブジェクトのスプレッド: O(n) - nはプロパティ数
return { ...prev, [id]: status };

// IDLE時の削除: O(n)
const { [id]: _, ...rest } = prev;
```

通常、操作中のアイテムは少数（< 10個）なので、パフォーマンス差は無視できる範囲です。

---

## 実装計画

### Phase 1: Hook作成とテスト

**工数**: 0.5日

- [ ] `useOperationStatus.ts` ファイル作成
- [ ] TypeScript型定義の作成（enum OperationStatus）
- [ ] JSDocコメントの追加
- [ ] ユニットテスト作成
  - [ ] setStatus の動作確認
  - [ ] getStatus の動作確認
  - [ ] isOperating / isInstalling / isUninstalling のチェック
  - [ ] IDLE時の自動削除
  - [ ] resetAll の動作確認

### Phase 2: ExtensionMarketplaceSettings への適用

**工数**: 0.25日

- [ ] `operationStatus` を `useOperationStatus` に置き換え
- [ ] `setOperationStatus` を `setStatus` に置き換え
- [ ] 状態チェックを新しいAPIに置き換え
- [ ] 既存のテストが通ることを確認

### Phase 3: LayoutMarketplaceSettings への適用

**工数**: 0.25日

- [ ] `installingIds` を `useOperationStatus` に置き換え
- [ ] Set操作を `setStatus` に置き換え
- [ ] 状態チェックを `isOperating` / `isInstalling` に置き換え
- [ ] 既存のテストが通ることを確認

### Phase 4: ドキュメント更新

**工数**: 0.1日

- [ ] READMEにHookの説明を追加
- [ ] 使用例のドキュメント作成
- [ ] マイグレーションガイドの作成

**合計工数**: 1.1日

---

## テスト計画

### ユニットテスト

```typescript
// useOperationStatus.test.ts

describe("useOperationStatus", () => {
  it("should initialize with empty operations", () => {
    const { result } = renderHook(() => useOperationStatus());

    expect(result.current.operations).toEqual({});
    expect(result.current.getStatus("test-id")).toBe(OperationStatus.IDLE);
    expect(result.current.isOperating("test-id")).toBe(false);
  });

  it("should track operation status correctly", () => {
    const { result } = renderHook(() => useOperationStatus());

    act(() => {
      result.current.setStatus("test-id", OperationStatus.INSTALLING);
    });

    expect(result.current.getStatus("test-id")).toBe(OperationStatus.INSTALLING);
    expect(result.current.isInstalling("test-id")).toBe(true);
    expect(result.current.isUninstalling("test-id")).toBe(false);
    expect(result.current.isOperating("test-id")).toBe(true);
  });

  it("should remove operation when set to IDLE", () => {
    const { result } = renderHook(() => useOperationStatus());

    act(() => {
      result.current.setStatus("test-id", OperationStatus.INSTALLING);
    });

    expect(result.current.operations).toHaveProperty("test-id");

    act(() => {
      result.current.setStatus("test-id", OperationStatus.IDLE);
    });

    expect(result.current.operations).not.toHaveProperty("test-id");
    expect(result.current.isOperating("test-id")).toBe(false);
  });

  it("should reset all operations", () => {
    const { result } = renderHook(() => useOperationStatus());

    act(() => {
      result.current.setStatus("id-1", OperationStatus.INSTALLING);
      result.current.setStatus("id-2", OperationStatus.UNINSTALLING);
    });

    expect(Object.keys(result.current.operations)).toHaveLength(2);

    act(() => {
      result.current.resetAll();
    });

    expect(result.current.operations).toEqual({});
  });
});
```

### E2Eテスト

- [ ] 拡張機能インストール中にボタンが無効化されることを確認
- [ ] レイアウトインストール中にボタンが無効化されることを確認
- [ ] 複数の拡張機能を同時にインストールできることを確認
- [ ] 操作完了後にボタンが再度有効化されることを確認

---

## リスクと対策

### リスク1: パフォーマンスへの影響

**対策**:

- 通常、操作中のアイテムは少数（< 10個）
- ベンチマークテストで検証（期待値: ±5%以内）
- 必要に応じて最適化（Mapの使用等）

### リスク2: 既存機能への影響

**対策**:

- 段階的な移行（拡張機能 → レイアウト）
- 各ステップで既存のE2Eテストを実行
- 問題があれば即座にロールバック可能

### リスク3: メモリリーク

**対策**:

- IDLE状態のアイテムは自動的に削除
- `resetAll()` メソッドで強制的にクリア可能
- 開発時にメモリ使用量を監視

---

## 将来の拡張性

### 追加可能な状態

```typescript
export enum OperationStatus {
  IDLE = "idle",
  INSTALLING = "installing",
  UNINSTALLING = "uninstalling",
  UPDATING = "updating",
  DOWNLOADING = "downloading", // 追加可能
  VERIFYING = "verifying", // 追加可能
  FAILED = "failed", // 追加可能
}
```

### 追加可能な機能

```typescript
export function useOperationStatus() {
  // ... existing code ...

  /**
   * Get all items with a specific status
   */
  const getItemsByStatus = useCallback(
    (status: OperationStatus): string[] => {
      return Object.entries(operations)
        .filter(([_, s]) => s === status)
        .map(([id]) => id);
    },
    [operations],
  );

  /**
   * Check if any operation is in progress
   */
  const hasAnyOperation = useCallback((): boolean => {
    return Object.keys(operations).length > 0;
  }, [operations]);

  return {
    // ... existing returns ...
    getItemsByStatus,
    hasAnyOperation,
  };
}
```

---

## 学んだこと

1. **一貫性の重要性**

   - 同じ目的の機能は統一されたAPIで提供すべき
   - 2つの異なる実装は保守コストを2倍にする

2. **拡張性の考慮**

   - 将来的な要件変更を見越した設計
   - `Set`よりも`Record<string, Status>`の方が拡張性が高い

3. **型安全性**
   - enumを使用することで、状態の型安全性を確保
   - 誤った状態値の設定を防止

---

## 関連ドキュメント

- [20251014_02_marketplace-code-issues-analysis.md](../../08_worklogs/2025_10/20251014/20251014_02_marketplace-code-issues-analysis.md) - 分析レポート
- [20251014_01_marketplace-phase2-improvements.md](../../09_improvements/20251014_01_marketplace-phase2-improvements.md) - Phase 2改善提案
- [20251014_03_operation-status-refactoring.md](../../08_worklogs/2025_10/20251014/20251014_03_operation-status-refactoring.md) - リファクタリング作業ログ

---

## 解決内容

### 実施した対応

1. **共通Hook `useOperationStatus` の作成**

   - 場所: `packages/suite-base/src/hooks/useOperationStatus.ts`
   - 機能: 拡張機能とレイアウトの両方で使える統一API
   - 状態: IDLE / INSTALLING / UNINSTALLING / UPDATING

2. **ユニットテストの作成**

   - 場所: `packages/suite-base/src/hooks/useOperationStatus.test.ts`
   - テスト数: 14件
   - 結果: ✅ 全テスト通過

3. **ExtensionMarketplaceSettings への適用**

   - `useOperationState` → `useOperationStatus` に置き換え
   - より明示的な状態管理に変更

4. **LayoutMarketplaceSettings への適用**

   - `Set<string>` → `Record<string, OperationStatus>` に変更
   - 拡張機能と統一されたAPIを使用

5. **既存テストの修正**
   - `useOperationState.test.ts` の修正
   - React Testing Library のベストプラクティスに準拠

### 解決による効果

- ✅ **一貫性**: 拡張機能とレイアウトで同じパターンを使用
- ✅ **拡張性**: 将来的な状態追加が容易
- ✅ **保守性**: 1つのHookで一元管理
- ✅ **型安全性**: enum による型チェック
- ✅ **学習コスト**: 統一されたAPIで理解しやすい

### 変更ファイル

**新規作成**:

- `packages/suite-base/src/hooks/useOperationStatus.ts`
- `packages/suite-base/src/hooks/useOperationStatus.test.ts`

**修正**:

- `packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx`
- `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`
- `packages/suite-base/src/hooks/marketplace/useOperationState.test.ts`

---

**発見日**: 2025年10月14日
**解決日**: 2025年10月14日
**優先度**: 🟡 Medium
**実際の工数**: 約2時間
**ステータス**: ✅ Resolved
