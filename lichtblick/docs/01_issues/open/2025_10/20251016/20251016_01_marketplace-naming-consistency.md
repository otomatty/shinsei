# マーケットプレイス実装の命名規則と一貫性の改善

## 概要

Extension と Layout のマーケットプレイス実装において、命名規則の不統一やコードの一貫性に関する問題が発見されました。このドキュメントでは、発見された問題点と具体的な改善案をまとめます。

## 発見日時・発見場所

- **発見日**: 2025-10-16
- **発見場所**:
  - `packages/suite-base/src/components/SoraExtensionsMarketplaceSettings/SoraExtensionsMarketplaceSettings.tsx`
  - `packages/suite-base/src/components/SoraLayoutsMarketplaceSettings/SoraLayoutMarketplaceSettings.tsx`
  - `packages/suite-base/src/hooks/marketplace/useSoraProcessedExtensions.ts`
  - `packages/suite-base/src/hooks/marketplace/useSoraMarketplaceActions.ts`
  - `packages/suite-base/src/hooks/useSoraInstalledItems.ts`

## 問題の分類

### 重要度: Medium

この問題は機能的には問題ないが、コードの可読性、保守性、拡張性に影響を与えます。

## 詳細な問題点

### 1. データ型名の問題

#### 問題: `GroupedExtensionData`

**現在の実装:**

```typescript
interface GroupedExtensionData {
  baseId: string;
  id: string;
  name: string;
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
```

**問題点:**

- "Grouped" だけでは何をグループ化しているのか不明確
- 実際にはバージョン管理を含む「拡張機能の完全な表現」
- Layout側には対応する型がなく、一貫性がない

**改善案:**

```typescript
// Option 1: バージョン管理を強調
interface ExtensionWithVersions {
  extensionId: string; // baseId の代わり
  versionedId: string; // id の代わり
  name: string;
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

// Option 2: より明確な命名
interface VersionedExtensionDetail {
  identifier: string; // baseId の代わり
  fullIdentifier: string; // id の代わり
  // ... 他のフィールド
}
```

### 2. フック名の問題

#### 問題: `useSoraProcessedExtensions`

**現在の実装:**

```typescript
const groupedExtensions = useProcessedExtensions({
  installedData: [...],
  marketplaceData: [...],
  isExtensionInstalled,
  isAnyVersionInstalled,
});
```

**問題点:**

- "Processed" は抽象的すぎて何を処理しているのか不明
- 実際にはバージョンごとのグループ化とマージ処理

**改善案:**

```typescript
// Option 1: 機能を明確に
const groupedExtensions = useGroupedExtensionsByVersion({
  installedData: [...],
  marketplaceData: [...],
  isExtensionInstalled,
  isAnyVersionInstalled,
});

// Option 2: より詳細な説明
const groupedExtensions = useMergedExtensionsWithVersions({
  installedData: [...],
  marketplaceData: [...],
  isExtensionInstalled,
  isAnyVersionInstalled,
});
```

### 3. プロパティ名の問題

#### 問題: `baseId` と `id` の混在

**現在の実装:**

```typescript
interface GroupedExtensionData {
  baseId: string; // "publisher.extension-name"
  id: string; // "publisher.extension-name@1.0.0"
}
```

**問題点:**

- 両方とも "ID" という単語を含み、区別しづらい
- `baseId` の用途（バージョンなしの識別子）が名前から分かりにくい

**改善案:**

```typescript
// Option 1: 役割を明確に
interface ExtensionWithVersions {
  extensionId: string; // バージョンなしの識別子
  versionedId: string; // バージョン付きの完全な識別子
}

// Option 2: より冗長だが明確
interface ExtensionWithVersions {
  packageIdentifier: string; // バージョンなし
  versionedPackageIdentifier: string; // バージョン付き
}

// Option 3: 短縮形を使用
interface ExtensionWithVersions {
  pkgId: string; // バージョンなし
  fullPkgId: string; // バージョン付き
}
```

### 4. 状態管理フック名の問題

#### 問題: `useSoraInstalledItems`

**現在の実装:**

```typescript
// ファイル名: useSoraInstalledItems.ts
export function useSoraInstalledExtensions(): InstalledItemsState<ExtensionInfo> { ... }
export function useSoraInstalledLayouts(): InstalledItemsState<Layout> { ... }
```

**問題点:**

- ファイル名は `useSoraInstalledItems` だが、実際には2つの別々のフック
- "Items" は汎用的すぎて具体性がない
- 1つのファイルに2つの異なる責務がある

**改善案:**

```typescript
// Option 1: ファイルを分割
// hooks/useSoraInstalledExtensions.ts
export function useSoraInstalledExtensions(): InstalledItemsState<ExtensionInfo> { ... }

// hooks/useSoraInstalledLayouts.ts
export function useSoraInstalledLayouts(): InstalledItemsState<Layout> { ... }

// Option 2: より具体的な名前に変更
// hooks/useSoraInstalledItems.ts
export function useInstalledExtensionTracking(): InstalledItemsState<ExtensionInfo> { ... }
export function useInstalledLayoutTracking(): InstalledItemsState<Layout> { ... }

// Option 3: ジェネリックフックと特化フックを分離
// hooks/useInstalledItemTracking.ts (ジェネリック)
export function useInstalledItemTracking<T>(...): InstalledItemsState<T> { ... }

// hooks/useSoraInstalledExtensions.ts
export function useSoraInstalledExtensions() {
  return useInstalledItemTracking<ExtensionInfo>(...);
}
```

### 5. 変数名の問題

#### 問題: `marketplaceToLayoutIdMap`

**現在の実装:**

```typescript
const { itemMap: marketplaceToLayoutIdMap } = useSoraInstalledLayouts();
```

**問題点:**

- 長すぎて冗長
- "To" は方向性を示すが、実際はマッピングの関係を表現
- 変数名からデータ構造が読み取りにくい

**改善案:**

```typescript
// Option 1: 簡潔でわかりやすい
const { itemMap: layoutsByMarketplaceId } = useSoraInstalledLayouts();

// Option 2: より説明的
const { itemMap: installedLayoutsMap } = useSoraInstalledLayouts();

// Option 3: 用途を明確に
const { itemMap: marketplaceLayoutMap } = useSoraInstalledLayouts();
```

### 6. 関数名の問題

#### 問題: `execute` (useSoraMarketplaceActions内)

**現在の実装:**

```typescript
const { execute } = useSoraMarketplaceActions();
await execute(async () => { ... }, { ... });
```

**問題点:**

- 汎用的すぎて何を実行するのか不明
- コンテキストなしでは理解しづらい
- 他の "execute" 関数と混同しやすい

**改善案:**

```typescript
// Option 1: マーケットプレイス操作を明確に
const { executeMarketplaceOperation } = useSoraMarketplaceActions();
await executeMarketplaceOperation(async () => { ... }, { ... });

// Option 2: 通知機能を強調
const { executeWithNotification } = useSoraMarketplaceActions();
await executeWithNotification(async () => { ... }, { ... });

// Option 3: アクション実行を明確に
const { performMarketplaceAction } = useSoraMarketplaceActions();
await performMarketplaceAction(async () => { ... }, { ... });

// Option 4: より短く具体的に
const { runOperation } = useSoraMarketplaceActions();
await runOperation(async () => { ... }, { ... });
```

## 実装の一貫性に関する問題

### 7. インストール済みチェックの不統一

**Extension (チェックなし):**

```typescript
const handleInstall = async (extension: GroupedExtensionData, version?: string) => {
  const targetVersion = version ?? extension.latestVersion;
  const baseId = extension.baseId;
  const versionedId = toVersionedId(baseId, targetVersion);

  setStatus(versionedId, OperationStatus.INSTALLING);
  try {
    // 直接インストール実行（重複チェックなし）
    let marketplaceEntry = marketplaceEntries.value?.find(...);
    // ...
  } finally {
    setStatus(versionedId, OperationStatus.IDLE);
  }
};
```

**Layout (チェックあり):**

```typescript
const installLayout = async (layout: LayoutMarketplaceDetail) => {
  // インストール済みチェック
  if (installedMarketplaceIds.has(layout.id)) {
    enqueueSnackbar(`Layout "${layout.name}" is already installed`, {
      variant: "info",
    });
    return;
  }

  setStatus(layout.id, OperationStatus.INSTALLING);
  try {
    await execute(
      async () => {
        await installLayouts([{ detail: layout }]);
        await refreshInstalledLayouts();
      },
      {
        successMessage: `Layout "${layout.name}" installed successfully`,
        errorMessage: `Failed to install layout "${layout.name}"`,
      },
    );
  } finally {
    setStatus(layout.id, OperationStatus.IDLE);
  }
};
```

**改善案:**

Extension側にも同様のチェックを追加して一貫性を持たせる:

```typescript
const handleInstall = async (extension: GroupedExtensionData, version?: string) => {
  const targetVersion = version ?? extension.latestVersion;
  const baseId = extension.baseId;
  const versionedId = toVersionedId(baseId, targetVersion);

  // インストール済みチェックを追加
  if (isExtensionInstalled(versionedId)) {
    enqueueSnackbar(`${extension.name} v${targetVersion} is already installed`, {
      variant: "info",
    });
    return;
  }

  setStatus(versionedId, OperationStatus.INSTALLING);
  try {
    // ... 既存のインストール処理
  } finally {
    setStatus(versionedId, OperationStatus.IDLE);
  }
};
```

### 8. エラーハンドリングの詳細度の違い

**Extension (詳細なエラー処理):**

```typescript
try {
  const buffer = await downloadExtension(foxeUrl);
  const results = await installExtensions(targetNamespace, [
    { buffer, namespace: targetNamespace },
  ]);
  // ...
} catch (downloadError) {
  const err = downloadError as Error;
  const isDesktop = isDesktopApp();

  // CORS エラー
  if (err.message.includes("CORS") || err.message.includes("Access-Control-Allow-Origin")) {
    const corsMessage = `CORS policy blocked the download from ${new URL(foxeUrl).hostname}.`;
    const suggestion = isDesktop
      ? " Please try again or contact the extension author."
      : " Consider using the desktop app for better extension compatibility, or contact the extension author.";
    throw new Error(corsMessage + suggestion);
  }

  // リダイレクトエラー
  else if (err.message.includes("302") || err.message.includes("Found")) {
    const redirectMessage = "The extension download URL redirected...";
    const suggestion = isDesktop ? "..." : "...";
    throw new Error(redirectMessage + suggestion);
  }

  // ネットワークエラー
  else if (err.message.includes("Failed to fetch")) {
    const networkMessage = "Network error occurred...";
    const suggestion = isDesktop ? "..." : "...";
    throw new Error(networkMessage + suggestion);
  }

  throw err;
}
```

**Layout (標準的なエラー処理):**

```typescript
await execute(
  async () => {
    await installLayouts([{ detail: layout }]);
    await refreshInstalledLayouts();
  },
  {
    successMessage: `Layout "${layout.name}" installed successfully`,
    errorMessage: `Failed to install layout "${layout.name}"`,
  },
);
```

**改善案:**

Layout側でもネットワークエラーの詳細なハンドリングを検討:

```typescript
await execute(
  async () => {
    try {
      await installLayouts([{ detail: layout }]);
      await refreshInstalledLayouts();
    } catch (error) {
      const err = error as Error;
      const isDesktop = isDesktopApp();

      // ネットワーク関連のエラーを特定
      if (err.message.includes("Failed to fetch") || err.message.includes("Network")) {
        const message = "Network error occurred while installing the layout.";
        const suggestion = isDesktop
          ? " Please check your internet connection and try again."
          : " Please check your internet connection. For better reliability, consider using the desktop app.";
        throw new Error(message + suggestion);
      }

      throw err;
    }
  },
  {
    successMessage: `Layout "${layout.name}" installed successfully`,
    errorMessage: `Failed to install layout "${layout.name}"`,
  },
);
```

### 9. 型定義の統一

**現在の問題:**

Extension と Layout でそれぞれ独自の `MarketplaceDetail` 型を定義しているが、共通のフィールドが多数存在する。

```typescript
// Extension
interface ExtensionMarketplaceDetail {
  id: string;
  name: string;
  displayName: string;
  description: string;
  publisher: string;
  version: string;
  tags: string[];
  homepage: string;
  license: string;
  qualifiedName: string;
  namespace: "local" | "org";
  foxe: string;
  sha256sum: string;
  time: Record<string, string>;
  readme?: string;
  changelog?: string;
}

// Layout
interface LayoutMarketplaceDetail {
  id: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  thumbnail?: string;
  // ... その他のフィールド
}
```

**改善案:**

共通インターフェースを定義して継承する:

```typescript
/**
 * Base interface for all marketplace items
 */
interface BaseMarketplaceItem {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Item description */
  description: string;

  /** Tags for categorization */
  tags: string[];

  /** Homepage URL */
  homepage?: string;

  /** License identifier */
  license?: string;

  /** README content */
  readme?: string;

  /** Changelog content */
  changelog?: string;
}

/**
 * Extension-specific marketplace detail
 */
interface ExtensionMarketplaceDetail extends BaseMarketplaceItem {
  /** Display name (may differ from technical name) */
  displayName: string;

  /** Publisher name */
  publisher: string;

  /** Current version */
  version: string;

  /** Qualified name (publisher.name) */
  qualifiedName: string;

  /** Namespace (local, marketplace, org) */
  namespace: "local" | "marketplace" | "org";

  /** Available versions */
  versions?: VersionInfo[];

  /** Extension package URL */
  foxe: string;

  /** SHA256 checksum */
  sha256sum: string;

  /** Version timestamps */
  time: Record<string, string>;
}

/**
 * Layout-specific marketplace detail
 */
interface LayoutMarketplaceDetail extends BaseMarketplaceItem {
  /** Author name */
  author: string;

  /** Thumbnail image URL */
  thumbnail?: string;

  /** Layout configuration data */
  data?: unknown;
}
```

## 影響範囲

### 直接影響を受けるファイル

1. **型定義の変更:**

   - `packages/suite-base/src/components/SoraExtensionsMarketplaceSettings/SoraExtensionsMarketplaceSettings.tsx`
   - `packages/suite-base/src/hooks/marketplace/useSoraProcessedExtensions.ts`

2. **フック名の変更:**

   - `packages/suite-base/src/hooks/marketplace/useSoraProcessedExtensions.ts`
   - `packages/suite-base/src/hooks/marketplace/useSoraMarketplaceActions.ts`
   - `packages/suite-base/src/hooks/useSoraInstalledItems.ts`

3. **ロジックの追加:**
   - `packages/suite-base/src/components/SoraExtensionsMarketplaceSettings/SoraExtensionsMarketplaceSettings.tsx` (インストール済みチェック)
   - `packages/suite-base/src/components/SoraLayoutsMarketplaceSettings/SoraLayoutMarketplaceSettings.tsx` (エラーハンドリング)

### 間接的に影響を受ける可能性のあるファイル

- Extension や Layout の詳細画面コンポーネント
- マーケットプレイス関連のテストファイル
- 型定義を参照している他のコンポーネント

## 推奨する解決策

### Phase 1: 命名規則の統一（優先度: High）

1. **型名の変更:**

   ```typescript
   // Before
   interface GroupedExtensionData { ... }

   // After
   interface ExtensionWithVersions { ... }
   ```

2. **プロパティ名の変更:**

   ```typescript
   // Before
   interface ExtensionWithVersions {
     baseId: string;
     id: string;
   }

   // After
   interface ExtensionWithVersions {
     extensionId: string;
     versionedId: string;
   }
   ```

3. **フック名の変更:**

   ```typescript
   // Before
   const groupedExtensions = useProcessedExtensions({ ... });

   // After
   const groupedExtensions = useGroupedExtensionsByVersion({ ... });
   ```

### Phase 2: 実装の一貫性向上（優先度: Medium）

1. **インストール済みチェックの追加:**

   - Extension の `handleInstall` に重複インストールチェックを追加

2. **エラーハンドリングの標準化:**
   - Layout 側でもネットワークエラーの詳細ハンドリングを検討
   - 共通のエラーハンドリングユーティリティの作成を検討

### Phase 3: 型システムの改善（優先度: Low）

1. **共通インターフェースの定義:**

   ```typescript
   interface BaseMarketplaceItem { ... }
   interface ExtensionMarketplaceDetail extends BaseMarketplaceItem { ... }
   interface LayoutMarketplaceDetail extends BaseMarketplaceItem { ... }
   ```

2. **ファイル分割の検討:**
   - `useSoraInstalledItems.ts` を `useSoraInstalledExtensions.ts` と `useSoraInstalledLayouts.ts` に分割

## 期待される効果

### コード品質の向上

- **可読性:** 命名規則の統一により、コードの意図が明確になる
- **保守性:** 一貫した実装パターンにより、メンテナンスが容易になる
- **拡張性:** 共通インターフェースにより、新しいマーケットプレイスアイテムの追加が容易になる

### 開発効率の向上

- **理解しやすさ:** 新規開発者がコードを理解するまでの時間が短縮される
- **バグの削減:** 一貫したエラーハンドリングにより、エッジケースでのバグが減少
- **テストの容易性:** 明確な命名規則により、テストコードが書きやすくなる

## 参考資料

- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [React Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)

## 次のアクション

1. **レビュー:** チームでこのドキュメントをレビューし、改善案について合意を得る
2. **優先順位付け:** Phase 1-3 の実装順序を決定
3. **実装計画:** 各 Phase の詳細な実装計画を作成
4. **実装:** 段階的にリファクタリングを実施
5. **テスト:** 各段階でテストを実施し、既存機能が壊れていないことを確認

## 関連ドキュメント

- [マーケットプレイス実装ガイド](../../04_implementation/guides/) (TBD)
- [Extension 実装仕様](../../03_design/features/) (TBD)
- [Layout 実装仕様](../../03_design/features/) (TBD)

## メタ情報

- **作成日:** 2025-10-16
- **最終更新日:** 2025-10-16
- **ステータス:** Open
- **担当者:** TBD
- **レビュアー:** TBD
