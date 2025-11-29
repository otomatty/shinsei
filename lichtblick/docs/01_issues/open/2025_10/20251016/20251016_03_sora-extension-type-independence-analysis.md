# Sora拡張機能の独自型定義化の影響分析

## 基本情報

- **分析日**: 2025-10-16
- **目的**: Sora関連ファイルで`keywords`と`displayName`を使用しない独自型定義への移行が可能かを検証
- **対象範囲**: Soraマーケットプレイス機能全体

## エグゼクティブサマリー

### 結論: ⚠️ **部分的に可能だが、重大な制約あり**

Sora拡張機能で独自型定義を使用することは技術的に可能ですが、以下の重要な問題があります:

1. **✅ メリット**: `tags`プロパティでの統一が可能
2. **❌ 重大な問題**: ベースシステムとの完全な分離は不可能
3. **⚠️ 注意点**: 保守性とコードの重複が増加

## 現状分析

### 1. Sora独自型定義の状況

#### 既に独自型を使用している箇所

**ExtensionWithVersions 型** (複数ファイルで使用):

```typescript
// SoraExtensionsMarketplaceSettings.tsx (Line 44-60)
interface ExtensionWithVersions {
  extensionId: string;
  versionedId: string;
  name: string; // displayName ではなく name
  description: string;
  publisher: string;
  latestVersion: string;
  tags: readonly string[]; // ✓ keywords ではなく tags
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

**useSoraProcessedExtensions.ts**:

```typescript
// InstalledExtensionInput (Line 82-97)
export interface InstalledExtensionInput {
  id: string;
  name: string; // displayName ではなく name
  description: string;
  publisher: string;
  version: string;
  tags: readonly string[]; // ✓ keywords ではなく tags
  homepage?: string;
  license?: string;
  qualifiedName?: string;
  namespace?: string;
  readme?: string;
  changelog?: string;
}

// MarketplaceExtensionInput (Line 100-114)
export interface MarketplaceExtensionInput {
  id: string;
  name: string; // displayName ではなく name
  description: string;
  publisher: string;
  version: string;
  tags: readonly string[]; // ✓ keywords ではなく tags
  homepage?: string;
  license?: string;
  qualifiedName?: string;
  namespace?: string;
  readme?: string;
  changelog?: string;
}
```

### 2. 現在の`keywords` → `tags`変換パターン

**SoraExtensionsMarketplaceSettings.tsx** で変換が行われている:

```typescript
// Line 96-109: インストール済みデータの変換
installedData: namespacedData.flatMap((namespace) =>
  namespace.entries.map((ext) => ({
    id: ext.id,
    name: ext.name,
    description: ext.description,
    publisher: ext.publisher,
    version: ext.version,
    tags: ext.keywords,              // ← keywords を tags に変換
    homepage: ext.homepage,
    license: ext.license,
    qualifiedName: ext.qualifiedName,
    namespace: ext.namespace,
    readme: ext.readme,
    changelog: ext.changelog,
  })),
),

// Line 115-127: マーケットプレースデータの変換
marketplaceData:
  marketplaceExtensions && marketplaceExtensions.length > 0
    ? marketplaceExtensions.map((ext) => ({
        id: ext.id,
        name: ext.name,
        description: ext.description,
        publisher: ext.publisher,
        version: ext.version,
        tags: ext.keywords,          // ← keywords を tags に変換
        homepage: ext.homepage,
        license: ext.license,
        readme: ext.readme,
        changelog: ext.changelog,
        qualifiedName: ext.qualifiedName,
        namespace: ext.namespace,
      }))
```

### 3. 依存関係マップ

```
ExtensionInfo (Base Type)
  ↓ keywords, displayName を持つ
  ↓
useExtensionSettings
  ↓ namespacedData, groupedMarketplaceData を返す
  ↓
┌─────────────────────────────────────────┐
│ SoraExtensionsMarketplaceSettings       │
│  ↓                                      │
│  ├─ keywords → tags に変換              │
│  ├─ name をそのまま使用                 │
│  └─ displayName は使用しない            │
│                                         │
│  ↓ 独自型に変換                         │
│                                         │
│  useGroupedExtensionsByVersion          │
│   ↓ InstalledExtensionInput /           │
│   ↓ MarketplaceExtensionInput           │
│   ↓                                     │
│   └─ ExtensionWithVersions を生成       │
│                                         │
│  useSoraInstalledExtensions             │
│   ↓ namespacedData を使用               │
│   └─ ExtensionInfo にキャスト (問題)    │
└─────────────────────────────────────────┘

ExtensionDetails (Base Component)
  ↑ ExtensionMarketplaceDetail を使用
  ↑ keywords, displayName に依存
  ↑ Soraからは直接使用されていない
```

## 重大な問題点

### 🚨 Problem 1: useExtensionSettings への依存

**問題**:

```typescript
// SoraExtensionsMarketplaceSettings.tsx (Line 88-89)
const { marketplaceEntries, refreshMarketplaceEntries, namespacedData, groupedMarketplaceData } =
  useExtensionSettings();
```

- Soraコンポーネントは`useExtensionSettings`に依存している
- `useExtensionSettings`は`ExtensionInfo`型を返す
- `ExtensionInfo`は`keywords`と`displayName`を持つ
- **完全な独立は不可能**

### 🚨 Problem 2: useSoraInstalledExtensions の unsafe キャスト

**問題**:

```typescript
// useSoraInstalledExtensions.ts (Line 48)
map.set(baseId, ext as ExtensionInfo);
```

- `namespacedData.entries`を`ExtensionInfo`にキャスト
- しかし実際の型は`ExtensionMarketplaceDetail`
- 独自型を作っても、最終的に`ExtensionInfo`が必要

### 🚨 Problem 3: ExtensionCatalog との統合

**問題**:

```typescript
// ExtensionCatalogContext.ts (Line 145-146)
installedExtensions: undefined | ExtensionInfo[];
```

- ExtensionCatalogは`ExtensionInfo[]`を返す
- これを変更すると、システム全体に影響
- Soraだけの独自型定義では不十分

## 実現可能なアプローチ

### ✅ Option A: 変換レイヤーの明確化 (推奨)

**概要**: 境界で型変換を行い、内部では独自型を使用

**実装**:

1. **Soraマーケットプレイス専用の型定義を作成**

```typescript
// packages/suite-base/src/types/SoraExtension.ts (新規)

/**
 * Sora Marketplace Extension Type
 *
 * Base型(ExtensionInfo)とは独立した、Soraマーケットプレイス専用の型定義。
 * - keywords の代わりに tags を使用
 * - displayName の代わりに name のみを使用
 */
export interface SoraExtension {
  id: string;
  name: string; // 表示名としても使用
  description: string;
  publisher: string;
  version: string;
  tags: readonly string[]; // タグ (keywords ではなく)
  homepage?: string;
  license?: string;
  qualifiedName?: string;
  namespace?: string;
  readme?: string;
  changelog?: string;
}

/**
 * バージョン管理付きSora拡張機能
 */
export interface SoraExtensionWithVersions extends SoraExtension {
  extensionId: string;
  versionedId: string;
  latestVersion: string;
  installed: boolean;
  versions: VersionInfo[];
  totalVersions: number;
}
```

2. **型変換ユーティリティの作成**

```typescript
// packages/suite-base/src/util/marketplace/soraExtensionTypeConverters.ts (新規)

import type { ExtensionInfo } from "@lichtblick/suite-base/types/Extensions";
import type { ExtensionMarketplaceDetail } from "@lichtblick/suite-base/context/ExtensionMarketplaceContext";
import type { SoraExtension } from "@lichtblick/suite-base/types/SoraExtension";

/**
 * ExtensionInfo を SoraExtension に変換
 */
export function toSoraExtension(ext: ExtensionInfo): SoraExtension {
  return {
    id: ext.id,
    name: ext.name, // displayName は使用しない
    description: ext.description,
    publisher: ext.publisher,
    version: ext.version,
    tags: ext.keywords, // keywords → tags
    homepage: ext.homepage,
    license: ext.license,
    qualifiedName: ext.qualifiedName,
    namespace: ext.namespace,
    readme: ext.readme,
    changelog: ext.changelog,
  };
}

/**
 * ExtensionMarketplaceDetail を SoraExtension に変換
 */
export function marketplaceDetailToSoraExtension(ext: ExtensionMarketplaceDetail): SoraExtension {
  return {
    id: ext.id,
    name: ext.name,
    description: ext.description,
    publisher: ext.publisher,
    version: ext.version,
    tags: ext.keywords, // keywords → tags
    homepage: ext.homepage,
    license: ext.license,
    qualifiedName: ext.qualifiedName,
    namespace: ext.namespace,
    readme: ext.readme,
    changelog: ext.changelog,
  };
}

/**
 * SoraExtension を ExtensionInfo に変換 (必要な場合)
 */
export function fromSoraExtension(ext: SoraExtension): ExtensionInfo {
  return {
    id: ext.id,
    name: ext.name,
    displayName: ext.name, // name を displayName としても使用
    description: ext.description,
    publisher: ext.publisher,
    version: ext.version,
    keywords: [...ext.tags], // tags → keywords
    homepage: ext.homepage,
    license: ext.license,
    qualifiedName: ext.qualifiedName ?? `${ext.publisher}.${ext.name}`,
    namespace: ext.namespace,
    readme: ext.readme,
    changelog: ext.changelog,
  };
}
```

3. **useSoraInstalledExtensions の修正**

```typescript
// packages/suite-base/src/hooks/useSoraInstalledExtensions.ts

import { toSoraExtension } from "@lichtblick/suite-base/util/marketplace/soraExtensionTypeConverters";
import type { SoraExtension } from "@lichtblick/suite-base/types/SoraExtension";

export function useSoraInstalledExtensions(): InstalledItemsState<SoraExtension> {
  const { namespacedData, refreshMarketplaceEntries } = useExtensionSettings();

  const { installedIds, itemMap } = useMemo(() => {
    const ids = new Set<string>();
    const map = new Map<string, SoraExtension>();

    namespacedData.forEach((namespace) => {
      namespace.entries.forEach((ext) => {
        const baseId = extractBaseId(ext.id);
        ids.add(baseId);
        // 型安全な変換を使用
        map.set(baseId, toSoraExtension(ext));
      });
    });

    return { installedIds: ids, itemMap: map };
  }, [namespacedData]);

  // ... rest of implementation
}
```

4. **SoraExtensionsMarketplaceSettings の修正**

```typescript
// SoraExtensionsMarketplaceSettings.tsx

import {
  toSoraExtension,
  marketplaceDetailToSoraExtension,
} from "@lichtblick/suite-base/util/marketplace/soraExtensionTypeConverters";

// ...

const groupedExtensions = useGroupedExtensionsByVersion({
  installedData: namespacedData.flatMap((namespace) =>
    namespace.entries.map((ext) => toSoraExtension(ext)),
  ),
  marketplaceData:
    marketplaceExtensions && marketplaceExtensions.length > 0
      ? marketplaceExtensions.map((ext) => marketplaceDetailToSoraExtension(ext))
      : groupedMarketplaceData.flatMap((namespace) =>
          namespace.entries.map((ext) => marketplaceDetailToSoraExtension(ext)),
        ),
  isExtensionInstalled,
  isAnyVersionInstalled,
});
```

**メリット**:

- ✅ 型安全な変換
- ✅ Sora内部では`tags`と`name`のみを使用
- ✅ コードの意図が明確
- ✅ ベースシステムとの境界が明確

**デメリット**:

- ⚠️ 変換コードの追加が必要
- ⚠️ 多少のパフォーマンスオーバーヘッド

### ⚠️ Option B: 型エイリアスの使用

**概要**: 既存の型に対してSora専用のエイリアスを作成

```typescript
// packages/suite-base/src/types/SoraExtension.ts

import type { ExtensionInfo } from "./Extensions";

/**
 * Sora Marketplace Extension
 * ExtensionInfoのエイリアスだが、Sora内部では以下のように使用:
 * - keywords を tags として扱う
 * - displayName を無視し、name のみを使用
 */
export type SoraExtension = Omit<ExtensionInfo, "displayName"> & {
  // displayName を削除し、name を必須に
  name: string;
};
```

**メリット**:

- ✅ 実装が簡単
- ✅ 変換コードが不要

**デメリット**:

- ❌ `keywords`と`tags`の混在が解消されない
- ❌ 型レベルでの分離が不完全
- ❌ 意図が不明確

### ❌ Option C: 完全な独立 (非推奨)

**概要**: Soraマーケットプレイス専用のContext、Store、Loaderを作成

**理由**:

- システム全体の大規模リファクタリングが必要
- ExtensionCatalogとの重複が発生
- 保守コストが大幅に増加
- ベースシステムとの統合が困難

## 推奨アプローチ

### 🎯 **Option A: 変換レイヤーの明確化**

**理由**:

1. **型安全性**: 明示的な変換により型エラーを防止
2. **保守性**: 境界が明確でコードの意図が理解しやすい
3. **拡張性**: 将来的な変更に対応しやすい
4. **互換性**: ベースシステムとの統合を維持

**実装ステップ**:

1. ✅ **Phase 1**: 型定義の作成

   - `SoraExtension`型の定義
   - `SoraExtensionWithVersions`型の定義

2. ✅ **Phase 2**: 変換関数の作成

   - `toSoraExtension`
   - `marketplaceDetailToSoraExtension`
   - `fromSoraExtension` (必要に応じて)

3. ✅ **Phase 3**: useSoraInstalledExtensions の修正

   - 変換関数を使用
   - 型安全なキャストの削除

4. ✅ **Phase 4**: SoraExtensionsMarketplaceSettings の修正

   - 変換関数を使用
   - 型の明確化

5. ✅ **Phase 5**: useSoraProcessedExtensions の更新

   - `InstalledExtensionInput` → `SoraExtension`
   - `MarketplaceExtensionInput` → `SoraExtension`

6. ✅ **Phase 6**: テストの追加
   - 変換関数のユニットテスト
   - 統合テスト

## 制約事項

### 解消できない制約

1. **useExtensionSettings への依存**

   - Soraコンポーネントは`useExtensionSettings`を使用し続ける必要がある
   - ベースシステムの型(`ExtensionInfo`)が入力として必要

2. **ExtensionCatalog との統合**

   - インストール/アンインストールは`ExtensionCatalog`を使用
   - 最終的に`ExtensionInfo`形式でのデータが必要

3. **マーケットプレイスデータの形式**
   - 外部APIから取得するデータは`ExtensionMarketplaceDetail`形式
   - この形式には`keywords`と`displayName`が含まれる

### 受け入れるべき現実

- **完全な独立は不可能**: ベースシステムとの統合が必要
- **変換は必須**: 境界で型変換を行う必要がある
- **保守コスト**: 変換コードの維持が必要

## 結論

### ✅ 実現可能なこと

1. Sora内部では`tags`を使用し、`keywords`を意識しない
2. Sora内部では`name`を使用し、`displayName`を意識しない
3. 型安全な変換により、エラーを防止
4. コードの意図を明確化

### ❌ 実現不可能なこと

1. ベースシステムからの完全な独立
2. `useExtensionSettings`を使用しない実装
3. `ExtensionInfo`型を完全に排除

### 🎯 最終推奨

**Option A (変換レイヤーの明確化)** を採用し、以下を実施:

1. ✅ `SoraExtension`型の定義
2. ✅ 型変換ユーティリティの作成
3. ✅ Soraコンポーネントでの変換関数の使用
4. ✅ unsafe キャストの削除
5. ✅ ドキュメントの整備

これにより:

- Sora内部では`tags`と`name`のみを使用
- 型安全性を確保
- ベースシステムとの統合を維持
- 保守性を向上

## 次のアクション

1. ⬜ `SoraExtension`型定義の作成
2. ⬜ 型変換ユーティリティの実装
3. ⬜ `useSoraInstalledExtensions`の修正
4. ⬜ `SoraExtensionsMarketplaceSettings`の修正
5. ⬜ `useSoraProcessedExtensions`の型更新
6. ⬜ テストの追加
7. ⬜ ドキュメントの更新

## 関連イシュー

- [20251016_01_useExtensionSettings-type-mismatch.md](./20251016_01_useExtensionSettings-type-mismatch.md)
- [20251016_02_useExtensionSettings-usage-analysis.md](./20251016_02_useExtensionSettings-usage-analysis.md)
