# useExtensionSettings フックの使用箇所調査報告

## 基本情報

- **調査日**: 2025-10-16
- **対象ファイル**: `packages/suite-base/src/components/ExtensionsSettings/hooks/useExtensionSettings.ts`
- **調査目的**: `useExtensionSettings` カスタムフックの使用箇所とその依存関係を特定

## 使用箇所一覧

### 1. ExtensionsSettings コンポーネント

**ファイルパス**: `packages/suite-base/src/components/ExtensionsSettings/index.tsx`

**使用方法**:

```typescript
const {
  setUndebouncedFilterText,
  marketplaceEntries,
  refreshMarketplaceEntries,
  undebouncedFilterText,
  namespacedData, // ← 型エラーの影響を受ける
  groupedMarketplaceData,
  debouncedFilterText,
} = useExtensionSettings();
```

**役割**:

- インストール済み拡張機能の一覧表示
- マーケットプレイスの拡張機能の検索・表示
- 拡張機能の詳細表示への遷移

**影響**:

- `namespacedData` の型エラーにより、インストール済み拡張機能の表示に問題が発生する可能性

### 2. SoraExtensionsMarketplaceSettings コンポーネント

**ファイルパス**: `packages/suite-base/src/components/SoraExtensionsMarketplaceSettings/SoraExtensionsMarketplaceSettings.tsx`

**使用方法**:

```typescript
const {
  marketplaceEntries,
  refreshMarketplaceEntries,
  namespacedData, // ← 型エラーの影響を受ける
  groupedMarketplaceData, // ← 型エラーの影響を受ける
} = useExtensionSettings();
```

**役割**:

- Sora 専用のマーケットプレイス UI
- バージョン別の拡張機能管理
- インストール/アンインストール操作

**影響**:

- `namespacedData` をフラット化して使用
- `groupedMarketplaceData` をマーケットプレイスエントリの処理に使用
- 型エラーにより、拡張機能の一覧表示やバージョン管理に問題が発生

### 3. useSoraInstalledExtensions フック

**ファイルパス**: `packages/suite-base/src/hooks/useSoraInstalledExtensions.ts`

**使用方法**:

```typescript
const { namespacedData, refreshMarketplaceEntries } = useExtensionSettings();
```

**役割**:

- インストール済み拡張機能の状態管理
- 拡張機能のインストール状態チェック
- 拡張機能情報の取得

**処理内容**:

```typescript
const { installedIds, itemMap } = useMemo(() => {
  const ids = new Set<string>();
  const map = new Map<string, ExtensionInfo>();

  namespacedData.forEach((namespace) => {
    namespace.entries.forEach((ext) => {
      const baseId = extractBaseId(ext.id);
      ids.add(baseId);
      // ここで ExtensionInfo 型にキャストしている
      map.set(baseId, ext as ExtensionInfo); // ← 型エラーの影響
    });
  });

  return { installedIds: ids, itemMap: map };
}, [namespacedData]);
```

**影響**:

- `ext as ExtensionInfo` のキャストが型安全でない
- `displayName` プロパティが欠落している可能性
- インストール状態の判定に影響

### 4. テストファイル

#### 4.1. useExtensionSettings.test.ts

**ファイルパス**: `packages/suite-base/src/components/ExtensionsSettings/hooks/useExtensionSettings.test.ts`

**テスト内容**:

- フィルタリング機能のテスト
- マーケットプレイスエントリの取得テスト
- インストール済み拡張機能の表示テスト

**モックデータ**:

```typescript
const mockInstalledExtensions: InstalledExtension[] = [
  {
    id: "4",
    displayName: "Extension 4", // ✓ displayName あり
    description: "Description 4",
    publisher: "Publisher 4",
    homepage: "http://example.com",
    license: "MIT",
    version: "1.0.0",
    keywords: ["keyword4"], // ✓ keywords あり (tags ではない)
    namespace: "namespace1",
    installed: true,
    name: "Extension 4",
    qualifiedName: "Extension 4",
  },
  // ...
];
```

**影響**:

- 現在のテストは `displayName` と `keywords` を使用
- 実装が `tags` を使おうとしているため、不整合が存在

#### 4.2. index.test.tsx

**ファイルパス**: `packages/suite-base/src/components/ExtensionsSettings/index.test.tsx`

**テスト内容**:

- ExtensionsSettings コンポーネントのレンダリングテスト

## 依存関係の分析

```
useExtensionSettings
├── ExtensionCatalogContext (installedExtensions)
│   └── ExtensionInfo[] 型のデータを提供
│       ├── keywords: string[] (✓ 存在)
│       ├── displayName: string (✓ 存在)
│       └── tags: なし (❌ 存在しない)
│
├── ExtensionMarketplaceContext (marketplace)
│   └── ExtensionMarketplaceDetail[] 型のデータを提供
│       ├── keywords: string[] (✓ 存在)
│       ├── displayName: string (✓ 存在)
│       └── tags: なし (❌ 存在しない)
│
└── 返り値
    ├── namespacedData: EntryGroupedData[] (型エラー)
    │   └── entries が ExtensionMarketplaceDetail[] を期待
    │       ├── displayName が必須だが実装で欠落
    │       └── tags を使おうとしているが存在しない
    │
    └── groupedMarketplaceData: EntryGroupedData[]
        └── こちらは問題なし (marketplaceEntries から直接生成)
```

## 影響の深刻度

### Critical (即座の対応が必要)

- ✅ 型エラーによるビルド失敗の可能性
- ✅ `displayName` 欠落による UI 表示の問題
- ✅ `tags` vs `keywords` の混在による機能不全

### High (優先的な対応が必要)

- ⚠️ `useSoraInstalledExtensions` での unsafe キャスト
- ⚠️ テストと実装の不整合

### Medium (計画的な対応が必要)

- 📋 型定義の統一化
- 📋 ドキュメントの更新

## 修正が必要な箇所

### 1. useExtensionSettings.ts (優先度: Critical)

**Line 49-71: installedEntries の生成**

```typescript
// 修正前
return {
  id: entry.id,
  installed: true,
  name: entry.name,
  description: entry.description,
  publisher: entry.publisher,
  homepage: entry.homepage,
  license: entry.license,
  version: entry.version,
  keywords: entry.tags, // ❌ tags プロパティが存在しない
  namespace: entry.namespace,
  qualifiedName: entry.qualifiedName,
  readme: entry.readme,
  changelog: entry.changelog,
  tags: entry.tags, // ❌ 不要なプロパティ
};

// 修正後
return {
  id: entry.id,
  installed: true,
  name: entry.name,
  displayName: entry.displayName, // ✅ 追加
  description: entry.description,
  publisher: entry.publisher,
  homepage: entry.homepage,
  license: entry.license,
  version: entry.version,
  keywords: entry.keywords, // ✅ tags → keywords
  namespace: entry.namespace,
  qualifiedName: entry.qualifiedName,
  readme: entry.readme,
  changelog: entry.changelog,
  // tags プロパティは削除
};
```

### 2. useSoraInstalledExtensions.ts (優先度: High)

**Line 48: unsafe キャスト**

```typescript
// 修正前
map.set(baseId, ext as ExtensionInfo); // ❌ unsafe キャスト

// 修正後の選択肢:

// Option A: 型アサーションを維持 (短期的)
map.set(baseId, ext as unknown as ExtensionInfo);

// Option B: 型ガードを追加 (推奨)
if (isExtensionInfo(ext)) {
  map.set(baseId, ext);
}

// Option C: 明示的な変換関数を使用 (最も安全)
map.set(baseId, toExtensionInfo(ext));
```

### 3. 型定義の見直し (優先度: Medium)

**InstalledExtension 型の必要性を再検討**

- `ExtensionInfo` 型で統一できないか?
- `installed` プロパティの追加が必要な理由は?

## テストへの影響

### 既存のテストへの影響

1. **useExtensionSettings.test.ts**

   - モックデータは正しい (`displayName`, `keywords` を使用)
   - 実装修正後もテストは通るはず

2. **index.test.tsx**
   - コンポーネントの表示テストに影響
   - `displayName` が正しく表示されることを確認する必要

### 新規テストの追加が必要

- `namespacedData` の型整合性テスト
- `tags` → `keywords` の変換が正しく行われることの確認
- `displayName` が正しく表示されることの確認

## 修正の優先順位

1. **Phase 1: 型エラーの修正** (即座)

   - useExtensionSettings.ts の `entry.tags` → `entry.keywords` 変更
   - `displayName` プロパティの追加
   - `tags` プロパティの削除

2. **Phase 2: 型安全性の向上** (優先)

   - useSoraInstalledExtensions.ts の unsafe キャストの修正
   - 型ガードまたは変換関数の追加

3. **Phase 3: リファクタリング** (計画的)
   - `InstalledExtension` 型の必要性の再検討
   - 型定義の統一化
   - ドキュメントの更新

## 関連イシュー

- [20251016_01_useExtensionSettings-type-mismatch.md](./20251016_01_useExtensionSettings-type-mismatch.md)

## 次のアクション

1. ✅ 型エラーの修正 PR を作成
2. ⬜ useSoraInstalledExtensions の型安全性を改善
3. ⬜ テストの実行と確認
4. ⬜ 型定義の統一化を検討
5. ⬜ ドキュメントの更新
