# useProcessedExtensions Hook 詳細設計書

**作成日**: 2025年10月14日
**関連ドキュメント**: [20251014_05_usememo-chain-implementation-plan.md](./20251014_05_usememo-chain-implementation-plan.md)
**関連Issue**: [20251014_04_usememo-chain-complexity.md](../../../issues/open/20251014_04_usememo-chain-complexity.md)

---

## 概要

ExtensionMarketplaceSettings.tsx の 4つのuseMemoチェーンを単一のHookに統合し、パフォーマンスと保守性を向上させる。

### 目的

1. **パフォーマンス改善**: useMemo実行回数を 4回 → 1回 に削減
2. **コードの簡素化**: 約60行のuseMemo関連コードを削減
3. **保守性向上**: データ処理ロジックを1箇所に集約
4. **再利用性**: 将来的な拡張機能追加に対応可能

---

## Hook インターフェース

### ファイルパス

```
packages/suite-base/src/hooks/marketplace/useProcessedExtensions.ts
```

### 型定義

#### CombinedExtensionInfo

```typescript
/**
 * Combined extension information
 * Represents a grouped extension with version management
 */
export interface CombinedExtensionInfo {
  /** Base ID for grouping (e.g., "publisher.extension-name") */
  baseId: string;

  /** Full extension ID (may be versioned, e.g., "publisher.extension-name@1.0.0") */
  id: string;

  /** Extension name (technical name) */
  name: string;

  /** Display name (user-friendly name) */
  displayName: string;

  /** Description of the extension */
  description: string;

  /** Publisher/author name */
  publisher: string;

  /** Latest available version */
  latestVersion: string;

  /** Tags for categorization and filtering */
  tags: readonly string[];

  /** Whether ANY version of this extension is installed */
  installed: boolean;

  /** Homepage URL */
  homepage?: string;

  /** License identifier (e.g., "MIT", "Apache-2.0") */
  license?: string;

  /** Namespace (local, official, org) */
  namespace?: string;

  /** Version information for all available versions */
  versions: VersionInfo[];

  /** Total number of versions */
  totalVersions: number;

  /** README content (from latest version) */
  readme?: string;

  /** Changelog content (from latest version) */
  changelog?: string;
}
```

#### ExtensionInput

```typescript
/**
 * Input format for installed extension data
 */
export interface InstalledExtensionInput {
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
}

/**
 * Input format for marketplace extension data
 */
export interface MarketplaceExtensionInput {
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
}
```

#### ProcessedExtensionsOptions

```typescript
/**
 * Options for processing extensions
 */
export interface ProcessedExtensionsOptions {
  /** Installed extensions from ExtensionCatalog (namespacedData) */
  installedData: InstalledExtensionInput[];

  /** Marketplace extensions from API */
  marketplaceData: MarketplaceExtensionInput[];

  /** Function to check if a specific versioned extension is installed */
  isExtensionInstalled: (id: string) => boolean;

  /** Function to check if any version of an extension is installed (by base ID) */
  isAnyVersionInstalled: (baseId: string) => boolean;
}
```

### Hook シグネチャ

````typescript
/**
 * Process and combine extension data with version grouping.
 *
 * This hook replaces the useMemo chain pattern in ExtensionMarketplaceSettings:
 * 1. Combines installed and marketplace data (replaces allExtensions)
 * 2. Groups by base ID with version management (replaces groupedExtensions)
 * 3. Removes need for mappedFilteredExtensions
 *
 * All operations are performed in a single useMemo for optimal performance.
 *
 * @param options - Processing options
 * @returns Array of grouped extension information
 *
 * @example
 * ```typescript
 * const groupedExtensions = useProcessedExtensions({
 *   installedData: namespacedData.flatMap(ns => ns.entries.map(ext => ({
 *     id: ext.id,
 *     name: ext.name,
 *     displayName: ext.displayName,
 *     // ... other fields
 *   }))),
 *   marketplaceData: marketplaceExtensions.flatMap(ext =>
 *     Object.entries(ext.versions).map(([version, _]) => ({
 *       id: ExtensionIdUtils.toVersionedId(ext.id, version),
 *       version,
 *       // ... other fields
 *     }))
 *   ),
 *   isExtensionInstalled,
 *   isAnyVersionInstalled,
 * });
 * ```
 */
export function useProcessedExtensions(
  options: ProcessedExtensionsOptions,
): CombinedExtensionInfo[];
````

---

## 内部処理フロー

### Step 1: データ結合と初期グループ化

```typescript
const groups = new Map<string, CombinedExtensionInfo>();

// Process installed extensions (higher priority)
for (const ext of installedData) {
  const baseId = ExtensionIdUtils.extractBaseId(ext.id);

  if (!groups.has(baseId)) {
    // Create new group
    groups.set(baseId, {
      baseId,
      id: ext.id,
      name: ext.name,
      displayName: ext.displayName,
      description: ext.description,
      publisher: ext.publisher,
      latestVersion: ext.version,
      tags: ext.tags,
      installed: isExtensionInstalled(ext.id),
      homepage: ext.homepage,
      license: ext.license,
      namespace: ext.namespace,
      versions: [],
      totalVersions: 0,
      readme: ext.readme,
      changelog: ext.changelog,
    });
  }

  // Add version information
  addVersionToGroup(groups.get(baseId)!, ext, isExtensionInstalled);
}
```

### Step 2: マーケットプレイスデータの追加

```typescript
// Process marketplace extensions
for (const ext of marketplaceData) {
  const baseId = ExtensionIdUtils.extractBaseId(ext.id);

  if (!groups.has(baseId)) {
    // Create new group for marketplace-only extension
    groups.set(baseId, {
      baseId,
      id: ext.id,
      name: ext.name,
      displayName: ext.displayName,
      description: ext.description,
      publisher: ext.publisher,
      latestVersion: ext.version,
      tags: ext.tags,
      installed: false,
      homepage: ext.homepage,
      license: ext.license,
      versions: [],
      totalVersions: 0,
      readme: ext.readme,
      changelog: ext.changelog,
    });
  }

  // Add version information
  addVersionToGroup(groups.get(baseId)!, ext, isExtensionInstalled);
}
```

### Step 3: バージョン処理とファイナライズ

```typescript
// Finalize all groups
for (const group of groups.values()) {
  // Sort versions (descending order - latest first)
  group.versions = sortVersions(group.versions);

  // Determine latest version
  const normalizedVersions = group.versions.map((v) => normalizeVersion(v.version));
  const latestNormalized = getLatestVersion(normalizedVersions);

  // Mark latest version and update group metadata
  group.versions = group.versions.map((v) => ({
    ...v,
    isLatest: normalizeVersion(v.version) === latestNormalized,
  }));

  // Update latest version in group
  const latestVersionInfo = group.versions.find((v) => v.isLatest);
  if (latestVersionInfo) {
    group.latestVersion = latestVersionInfo.version;

    // Update readme/changelog from latest version
    const latestExt = findExtensionByVersion(
      [...installedData, ...marketplaceData],
      group.baseId,
      latestVersionInfo.version,
    );
    if (latestExt) {
      group.readme = latestExt.readme ?? group.readme;
      group.changelog = latestExt.changelog ?? group.changelog;
    }
  }

  // Update installation status for entire group
  group.installed = group.installed || isAnyVersionInstalled(group.baseId);

  // Update total versions
  group.totalVersions = group.versions.length;
}
```

### Step 4: 結果の返却

```typescript
return Array.from(groups.values());
```

---

## ヘルパー関数

### addVersionToGroup

```typescript
/**
 * Add version information to a group
 * Handles duplicate version detection and installation status
 */
function addVersionToGroup(
  group: CombinedExtensionInfo,
  ext: InstalledExtensionInput | MarketplaceExtensionInput,
  isExtensionInstalled: (id: string) => boolean,
): void {
  const normalizedVersion = normalizeVersion(ext.version);

  // Check if this version already exists
  const existingVersion = group.versions.find(
    (v) => normalizeVersion(v.version) === normalizedVersion,
  );

  if (existingVersion) {
    // Update installation status if needed
    const versionedId = ExtensionIdUtils.toVersionedId(group.baseId, ext.version);
    if (isExtensionInstalled(versionedId)) {
      existingVersion.installed = true;
    }
    return;
  }

  // Add new version
  const versionedId = ExtensionIdUtils.toVersionedId(group.baseId, ext.version);
  const versionInfo: VersionInfo = {
    version: ext.version,
    publishedDate: new Date().toISOString(), // TODO: Get from API if available
    isLatest: false, // Will be determined later
    installed: isExtensionInstalled(versionedId),
  };

  group.versions.push(versionInfo);

  // Check if this is the latest version (preliminary check)
  const currentLatestNormalized = normalizeVersion(group.latestVersion);
  if (
    normalizedVersion === currentLatestNormalized ||
    getLatestVersion([normalizedVersion, currentLatestNormalized]) === normalizedVersion
  ) {
    group.latestVersion = ext.version;
  }

  // Update installation status for the group
  if (isExtensionInstalled(versionedId)) {
    group.installed = true;
  }
}
```

### findExtensionByVersion

```typescript
/**
 * Find extension data by base ID and version
 */
function findExtensionByVersion(
  extensions: Array<InstalledExtensionInput | MarketplaceExtensionInput>,
  baseId: string,
  version: string,
): (InstalledExtensionInput | MarketplaceExtensionInput) | undefined {
  const normalizedTargetVersion = normalizeVersion(version);

  return extensions.find((ext) => {
    const extBaseId = ExtensionIdUtils.extractBaseId(ext.id);
    const extNormalizedVersion = normalizeVersion(ext.version);
    return extBaseId === baseId && extNormalizedVersion === normalizedTargetVersion;
  });
}
```

---

## 依存関係

### インポート

```typescript
import { useMemo } from "react";
import Log from "@umi/log";
import { ExtensionIdUtils } from "@umi/suite-base/util/ExtensionIdUtils";
import {
  normalizeVersion,
  getLatestVersion,
  sortVersions,
} from "@umi/suite-base/components/shared/Marketplace";
import type { VersionInfo } from "@umi/suite-base/components/shared/Marketplace";
```

### 外部依存

- **React**: useMemo
- **ExtensionIdUtils**: baseId抽出、versioned ID生成
- **Marketplace utils**: バージョン正規化、比較、ソート
- **Log**: デバッグ用ログ出力

---

## エッジケース処理

### 1. 空配列の入力

```typescript
if (installedData.length === 0 && marketplaceData.length === 0) {
  log.warn("[useProcessedExtensions] No extensions provided");
  return [];
}
```

### 2. 無効なバージョン文字列

```typescript
// normalizeVersion handles invalid formats
// Falls back to "0.0.0" for completely invalid versions
try {
  const normalized = normalizeVersion(ext.version);
} catch (error) {
  log.error(`[useProcessedExtensions] Invalid version format: ${ext.version}`, error);
  // Skip this extension or use default version
}
```

### 3. 重複データ

```typescript
// Handled by checking existing versions in addVersionToGroup
// Only updates installation status if version already exists
const existingVersion = group.versions.find(
  (v) => normalizeVersion(v.version) === normalizedVersion,
);

if (existingVersion) {
  existingVersion.installed = existingVersion.installed || isExtensionInstalled(versionedId);
  return;
}
```

### 4. publisherが不明

```typescript
// ExtensionIdUtils handles publisher extraction
// If publisher is missing, use empty string or "unknown"
const publisher = ext.publisher || "unknown";
```

### 5. 日付情報の欠落

```typescript
// Default to current date if not provided
const versionInfo: VersionInfo = {
  version: ext.version,
  publishedDate: ext.publishedDate ?? new Date().toISOString(),
  isLatest: false,
  installed: isExtensionInstalled(versionedId),
};
```

---

## ログ出力

デバッグとパフォーマンス監視のため、適切なログを出力:

```typescript
const log = Log.getLogger(__filename);

// Input size
log.debug(
  `[useProcessedExtensions] Processing ${installedData.length} installed + ${marketplaceData.length} marketplace extensions`,
);

// Processing time
const startTime = performance.now();
// ... processing ...
const endTime = performance.now();
log.debug(
  `[useProcessedExtensions] Processed ${groups.size} extension groups in ${(endTime - startTime).toFixed(2)}ms`,
);

// Result summary
log.debug(
  `[useProcessedExtensions] Result: ${result.length} groups, ${result.reduce((sum, g) => sum + g.totalVersions, 0)} total versions`,
);
```

---

## パフォーマンス最適化

### 1. 単一パス処理

- Map を使用して O(1) でのグループアクセス
- 配列の反復回数を最小化
- 不要な中間配列を作成しない

### 2. メモ化の活用

```typescript
// useMemo with proper dependencies
return useMemo(() => {
  // ... processing ...
}, [installedData, marketplaceData, isExtensionInstalled, isAnyVersionInstalled]);
```

### 3. 早期リターン

```typescript
if (installedData.length === 0 && marketplaceData.length === 0) {
  return [];
}
```

---

## 使用例

### ExtensionMarketplaceSettings.tsx での使用

#### Before (現在の実装)

```typescript
const allExtensions = useMemo(() => {
  // ... 結合処理 ...
}, [namespacedData, groupedMarketplaceData, isExtensionInstalled, marketplaceExtensions]);

const groupedExtensions = useMemo(() => {
  // ... グループ化処理 ...
}, [allExtensions, isExtensionInstalled, isAnyVersionInstalled]);

const { filteredItems: filteredExtensions } = useMarketplaceSearch({
  items: groupedExtensions.map((ext) => ({ ...ext, author: ext.publisher })),
  // ...
});

const mappedFilteredExtensions = useMemo(() => {
  return filteredExtensions.map((item) => ({
    ...item,
    publisher: item.author,
  }));
}, [filteredExtensions]);
```

#### After (新しい実装)

```typescript
// Step 1: Process extensions
const groupedExtensions = useProcessedExtensions({
  installedData: namespacedData.flatMap((ns) =>
    ns.entries.map((ext) => ({
      id: ext.id,
      name: ext.name,
      displayName: ext.displayName,
      description: ext.description,
      publisher: ext.publisher,
      version: ext.version,
      tags: ext.tags,
      homepage: ext.homepage,
      license: ext.license,
      qualifiedName: ext.qualifiedName,
      namespace: ext.namespace,
      readme: ext.readme,
      changelog: ext.changelog,
    })),
  ),
  marketplaceData:
    marketplaceExtensions && marketplaceExtensions.length > 0
      ? marketplaceExtensions.flatMap((ext) =>
          Object.entries(ext.versions).map(([version, _versionDetail]) => ({
            id: ExtensionIdUtils.toVersionedId(ext.id, version),
            name: ext.name,
            displayName: ext.name,
            description: ext.description,
            publisher: ext.publisher,
            version,
            tags: ext.tags ?? [],
            homepage: ext.homepage,
            license: ext.license,
            readme: ext.readme,
            changelog: ext.changelog,
          })),
        )
      : groupedMarketplaceData.flatMap((namespace) =>
          namespace.entries.map((ext) => ({
            id: ext.id,
            name: ext.displayName || ext.name,
            displayName: ext.displayName || ext.name,
            description: ext.description,
            publisher: ext.publisher,
            version: ext.version || "1.0.0",
            tags: ext.tags,
            homepage: ext.homepage,
            license: ext.license,
            qualifiedName: ext.qualifiedName,
            namespace: ext.namespace,
            readme: ext.readme,
            changelog: ext.changelog,
          })),
        ),
  isExtensionInstalled,
  isAnyVersionInstalled,
});

// Step 2: Search and filter (no mapping needed!)
const { filteredItems: filteredExtensions } = useMarketplaceSearch({
  items: groupedExtensions.map((ext) => ({
    ...ext,
    author: ext.publisher, // Only mapping needed
  })),
  // ...
});

// Step 3: Use filteredExtensions directly (no more mappedFilteredExtensions!)
```

---

## テスト戦略

### ユニットテスト (useProcessedExtensions.test.ts)

#### 1. データ結合テスト

```typescript
describe("Data combination", () => {
  it("should combine installed and marketplace data", () => {
    // Test with both installed and marketplace extensions
  });

  it("should prioritize installed extensions", () => {
    // Test that installed data takes precedence
  });

  it("should handle installed-only extensions", () => {
    // Test with only installed data
  });

  it("should handle marketplace-only extensions", () => {
    // Test with only marketplace data
  });
});
```

#### 2. バージョングループ化テスト

```typescript
describe("Version grouping", () => {
  it("should group extensions by base ID", () => {
    // Test grouping of multiple versions
  });

  it("should normalize versions correctly", () => {
    // Test v1.0.0, 1.0, 1.0.0.0 are treated as same
  });

  it("should handle duplicate versions", () => {
    // Test that duplicates update installation status only
  });
});
```

#### 3. 最新バージョン決定テスト

```typescript
describe("Latest version determination", () => {
  it("should identify latest semantic version", () => {
    // Test with 1.0.0, 1.1.0, 2.0.0
  });

  it("should handle prerelease versions", () => {
    // Test with 1.0.0-alpha, 1.0.0-beta, 1.0.0
  });

  it("should update readme/changelog from latest version", () => {
    // Test metadata comes from latest version
  });
});
```

#### 4. インストール状態集約テスト

```typescript
describe("Installation status aggregation", () => {
  it("should mark group as installed if any version is installed", () => {
    // Test group.installed = true when one version installed
  });

  it("should handle all versions uninstalled", () => {
    // Test group.installed = false
  });

  it("should update individual version installation status", () => {
    // Test versions[].installed is set correctly
  });
});
```

#### 5. エッジケーステスト

```typescript
describe("Edge cases", () => {
  it("should handle empty input arrays", () => {
    // Test with [], []
  });

  it("should handle invalid version strings", () => {
    // Test with "invalid", "v", "1.x.x"
  });

  it("should handle missing publisher", () => {
    // Test with publisher = undefined
  });

  it("should handle missing dates", () => {
    // Test with publishedDate = undefined
  });
});
```

#### 6. パフォーマンステスト

```typescript
describe("Performance", () => {
  it("should handle large datasets efficiently", () => {
    const largeInstalled = generateExtensions(1000);
    const largeMarketplace = generateExtensions(5000, 10); // 10 versions each

    const start = performance.now();
    const { result } = renderHook(() =>
      useProcessedExtensions({
        installedData: largeInstalled,
        marketplaceData: largeMarketplace,
        isExtensionInstalled: () => false,
        isAnyVersionInstalled: () => false,
      }),
    );
    const end = performance.now();

    expect(end - start).toBeLessThan(100); // Should complete in < 100ms
    expect(result.current.length).toBeGreaterThan(0);
  });
});
```

---

## マイグレーションガイド

### ExtensionMarketplaceSettings.tsx の変更手順

1. **useProcessedExtensions をインポート**

```typescript
import { useProcessedExtensions } from "@umi/suite-base/hooks/marketplace/useProcessedExtensions";
```

2. **allExtensions useMemo を削除**

```diff
- const allExtensions = useMemo(() => {
-   // ... 結合処理 ...
- }, [namespacedData, groupedMarketplaceData, isExtensionInstalled, marketplaceExtensions]);
```

3. **groupedExtensions を useProcessedExtensions に置き換え**

```diff
- const groupedExtensions = useMemo((): GroupedExtensionData[] => {
-   // ... グループ化処理 ...
- }, [allExtensions, isExtensionInstalled, isAnyVersionInstalled]);
+ const groupedExtensions = useProcessedExtensions({
+   installedData: /* ... */,
+   marketplaceData: /* ... */,
+   isExtensionInstalled,
+   isAnyVersionInstalled,
+ });
```

4. **mappedFilteredExtensions を削除**

```diff
- const mappedFilteredExtensions = useMemo((): GroupedExtensionData[] => {
-   return filteredExtensions.map((item): GroupedExtensionData => ({
-     ...item,
-     tags: item.tags,
-     publisher: item.author,
-   }));
- }, [filteredExtensions]);
```

5. **レンダリング部分で filteredExtensions を直接使用**

```diff
- {mappedFilteredExtensions.map((extension) => (
+ {filteredExtensions.map((extension) => (
    <MarketplaceCard
      key={extension.baseId}
-     author={extension.publisher}
+     author={extension.author}
      // ...
    />
  ))}
```

---

## 完了基準

- [ ] 型定義が完成している
- [ ] Hook実装が完了している
- [ ] ヘルパー関数が実装されている
- [ ] JSDocコメントが充実している
- [ ] エッジケース処理が実装されている
- [ ] ログ出力が適切に配置されている
- [ ] ユニットテストが作成されている
- [ ] パフォーマンステストが通る
- [ ] ExtensionMarketplaceSettings.tsx への適用が成功している
- [ ] 既存のE2Eテストが通る

---

## 次のステップ

1. **Todo 2 を完了**: この設計書を作成
2. **Todo 3 に移行**: 実装を開始
3. **Todo 4**: ユニットテスト作成
4. **Todo 5**: ExtensionMarketplaceSettings への適用

---

## 関連ドキュメント

- [20251014_05_usememo-chain-implementation-plan.md](./20251014_05_usememo-chain-implementation-plan.md) - 実装計画
- [20251014_04_usememo-chain-complexity.md](../../../issues/open/20251014_04_usememo-chain-complexity.md) - 問題の詳細
- [ExtensionIdUtils.ts](../../../../../packages/suite-base/src/util/ExtensionIdUtils.ts) - ID操作ユーティリティ
- [Marketplace types.ts](../../../../../packages/suite-base/src/components/shared/Marketplace/types.ts) - マーケットプレイス型定義

---

**作成日**: 2025年10月14日
**次回作業**: useProcessedExtensions Hook の実装
