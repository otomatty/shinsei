# 型定義の不整合: useExtensionSettings における ExtensionInfo と InstalledExtension

## 基本情報

- **発見日**: 2025-10-16
- **発見場所**: `packages/suite-base/src/components/ExtensionsSettings/hooks/useExtensionSettings.ts`
- **重要度**: High
- **影響範囲**: Extension management system全体

## 問題の詳細

### 発生しているLintエラー

`useExtensionSettings.ts` で以下の型エラーが発生:

1. **Line 65, 70**: `entry.tags` プロパティが存在しない

   ```typescript
   keywords: entry.tags,  // Error: Property 'tags' does not exist
   tags: entry.tags,      // Error: Property 'tags' does not exist
   ```

2. **Line 98**: `namespacedData` の型が `EntryGroupedData[]` に割り当てできない
   - `displayName` プロパティが必須だが存在しない
   - 返されるオブジェクトの構造が期待される型と一致しない

### 根本原因

#### 1. ExtensionInfo と InstalledExtension の型定義の不一致

**ExtensionInfo 型** (`packages/suite-base/src/types/Extensions.ts`):

```typescript
export type ExtensionInfo = {
  id: string;
  description: string;
  displayName: string; // ✓ 存在
  homepage: string;
  keywords: string[]; // ✓ keywords (配列)
  license: string;
  name: string;
  namespace?: Namespace;
  publisher: string;
  qualifiedName: string;
  version: string;
  readme?: string;
  changelog?: string;
  externalId?: string;
  // tags プロパティは存在しない
};
```

**InstalledExtension 型** (`packages/suite-base/src/components/ExtensionsSettings/types.ts`):

```typescript
export type InstalledExtension = {
  id: string;
  installed: boolean;
  name: string;
  displayName: string; // ✓ 存在
  description: string;
  publisher: string;
  homepage?: string;
  license?: string;
  version: string;
  keywords?: string[]; // ✓ keywords (配列、オプショナル)
  namespace: string;
  qualifiedName: string;
  // tags プロパティは存在しない
};
```

#### 2. useExtensionSettings の実装における問題

**問題のコード** (Line 49-71):

```typescript
const installedEntries = useMemo(() => {
  return (installed ?? []).map((entry) => {
    const marketplaceEntry = marketplaceMap[entry.id];
    if (marketplaceEntry != undefined) {
      return { ...marketplaceEntry, namespace: entry.namespace };
    }

    // entry は ExtensionInfo 型だが、tags プロパティは存在しない
    return {
      id: entry.id,
      installed: true,
      name: entry.name,
      description: entry.description,
      publisher: entry.publisher,
      homepage: entry.homepage,
      license: entry.license,
      version: entry.version,
      keywords: entry.tags, // ❌ Error: tags プロパティが存在しない
      namespace: entry.namespace,
      qualifiedName: entry.qualifiedName,
      readme: entry.readme,
      changelog: entry.changelog,
      tags: entry.tags, // ❌ Error: tags プロパティが存在しない
    };
  });
}, [installed, marketplaceMap]);
```

#### 3. 返り値の型不一致

**問題のコード** (Line 89-98):

```typescript
const namespacedData = Object.entries(namespacedEntries).map(([namespace, entries]) => ({
  namespace,
  entries: entries
    .filter((entry) => entry.name.toLowerCase().includes(debouncedFilterText.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name)),
}));

return {
  // ... other properties
  namespacedData, // ❌ 型が EntryGroupedData[] と一致しない
  // ...
};
```

**期待される型** (`EntryGroupedData`):

```typescript
export type EntryGroupedData = {
  namespace: string;
  entries: Immutable<ExtensionMarketplaceDetail>[]; // displayName が必須
};
```

**実際の型**:

- `installedEntries` で生成されるオブジェクトには `displayName` が含まれていない
- `tags` プロパティを追加しようとしているが、元の型に存在しない

## 影響範囲

### 直接的な影響

- `useExtensionSettings` フックの型安全性が損なわれている
- TypeScript コンパイルエラーが発生

### 間接的な影響

以下のコンポーネント/フックが影響を受ける可能性:

1. **ExtensionsSettings** (`packages/suite-base/src/components/ExtensionsSettings/index.tsx`)

   - `namespacedData` を使用してインストール済み拡張機能を表示

2. **SoraExtensionsMarketplaceSettings** (`packages/suite-base/src/components/SoraExtensionsMarketplaceSettings/SoraExtensionsMarketplaceSettings.tsx`)

   - `namespacedData` と `groupedMarketplaceData` を使用

3. **useSoraInstalledExtensions** (`packages/suite-base/src/hooks/useSoraInstalledExtensions.ts`)

   - `useExtensionSettings` の結果を使用

4. **テストファイル**
   - `useExtensionSettings.test.ts`
   - `index.test.tsx`

## 解決策の提案

### Option 1: keywords プロパティを使用 (推奨)

`ExtensionInfo` 型には `keywords` プロパティが存在するため、これを使用する:

```typescript
return {
  id: entry.id,
  installed: true,
  name: entry.name,
  displayName: entry.displayName, // 追加
  description: entry.description,
  publisher: entry.publisher,
  homepage: entry.homepage,
  license: entry.license,
  version: entry.version,
  keywords: entry.keywords, // tags → keywords に変更
  namespace: entry.namespace,
  qualifiedName: entry.qualifiedName,
  readme: entry.readme,
  changelog: entry.changelog,
  // tags プロパティを削除
};
```

### Option 2: ExtensionInfo に tags を追加

もし `tags` が本当に必要な場合、`ExtensionInfo` 型定義を拡張:

```typescript
export type ExtensionInfo = {
  // ... existing properties
  tags?: string[]; // 追加
};
```

ただし、これは `keywords` との重複になる可能性が高いため非推奨。

### 必要な修正箇所

1. **useExtensionSettings.ts (Line 49-71)**

   - `entry.tags` → `entry.keywords` に変更
   - `tags: entry.tags` 行を削除
   - `displayName: entry.displayName` を追加

2. **型定義の確認**

   - `InstalledExtension` 型と返り値の整合性を確認
   - 必要に応じて型定義を調整

3. **関連コンポーネントの確認**
   - 影響を受けるコンポーネントで `tags` プロパティを使用していないか確認
   - 使用している場合は `keywords` に変更

## 推奨アクション

1. **即座の対応**: Option 1 を採用して型エラーを修正
2. **レビュー**: `tags` と `keywords` の意味的な違いを確認
3. **リファクタリング**: 必要に応じて型定義を統一
4. **テスト**: 修正後に全ての関連テストが通ることを確認

## 関連ドキュメント

- 型定義: `packages/suite-base/src/types/Extensions.ts`
- カスタムフック: `packages/suite-base/src/components/ExtensionsSettings/hooks/useExtensionSettings.ts`
- 型定義: `packages/suite-base/src/components/ExtensionsSettings/types.ts`
- コンテキスト: `packages/suite-base/src/context/ExtensionCatalogContext.ts`
- コンテキスト: `packages/suite-base/src/context/ExtensionMarketplaceContext.ts`

## 学んだこと

- 型定義の一貫性は極めて重要
- プロパティ名の統一 (`tags` vs `keywords`) を維持する必要がある
- 複数の型定義ファイルにまたがる場合、整合性チェックが重要
- カスタムフックの返り値型は明示的に定義すべき
