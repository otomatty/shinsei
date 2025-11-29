# 根本的な解決策: keywords と displayName の統一、サムネイルの追加

## 基本情報

- **分析日**: 2025-10-16
- **目的**: 型定義の統一とサムネイル機能の追加による根本的な問題解決
- **提案**: ベースシステムの型定義に準拠し、マーケットプレイス独自機能としてサムネイルを追加

## エグゼクティブサマリー

### 🎯 推奨アプローチ

**Soraマーケットプレイスは既存のベースシステムの型定義に準拠する**

1. ✅ `tags` → `keywords` に統一
2. ✅ `displayName` を活用
3. ✅ `thumbnail` をマーケットプレイス独自データとして追加

### 理由

- **一貫性**: システム全体で同じ用語を使用
- **保守性**: 型変換が不要でシンプル
- **拡張性**: ベースシステムとの統合が容易
- **実用性**: 既存の実装を最大限活用

## 現状分析

### 1. 既存のベースシステムでの使用状況

#### keywords の使用

**ExtensionInfo 型定義**:

```typescript
// packages/suite-base/src/types/Extensions.ts
export type ExtensionInfo = {
  id: string;
  description: string;
  displayName: string;
  homepage: string;
  keywords: string[]; // ← 既に keywords を使用
  license: string;
  name: string;
  // ...
};
```

**ExtensionDetails.stories.tsx** での使用例:

```typescript
const extension: ExtensionMarketplaceDetail = {
  id: "publisher.storyextension",
  name: "Extension Name",
  description: "Extension sample description",
  qualifiedName: "Qualified Extension Name",
  publisher: "Publisher",
  homepage: "https://github.com/lichtblick-suite",
  license: "MIT",
  version: "1.2.10",
  keywords: ["storybook", "testing"], // ← keywords を使用
  displayName: "Display Extension Name",
  // ...
};
```

#### displayName の使用

**Soraマーケットプレイスでの既存の扱い**:

```typescript
// SoraExtensionsMarketplaceSettings.tsx (Line 448)
displayName: extension.name,  // nameをdisplayNameとして使用

// 検索処理 (soraSearchFiltering.ts, Line 44)
const name = (item.displayName ?? item.name ?? "").toLowerCase();
```

**結論**: `displayName` は既にフォールバック処理で使用されている

### 2. サーバー側のデータ構造

#### 現在のスキーマ

```javascript
// server/schemas.js
export const extensionSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  publisher: { type: "string", required: true },
  description: { type: "string", required: true },
  homepage: { type: "string", required: false },
  license: { type: "string", required: false },
  tags: { type: "array", required: false }, // ← サーバーでは tags
  thumbnail: { type: "string|null", required: false }, // ← 既にサムネイル対応
  namespace: { type: "string", required: true },
  readme: { type: "string", required: false },
  changelog: { type: "string", required: false },
  versions: { type: "object", required: true },
};
```

#### 実際のデータ

```json
// server/assets/extensions/extensions.json
{
  "id": "foxglove.blank-panel-extension",
  "name": "Blank Panel",
  "publisher": "foxglove",
  "description": "Add a little space to your layout",
  "homepage": "https://github.com/foxglove/blank-panel-extension",
  "license": "MIT",
  "tags": ["blank", "panel", "empty", "logo", "spacer"],  // ← tags を使用
  "thumbnail": null,                                      // ← サムネイル対応済み
  "namespace": "marketplace",
  "readme": "https://raw.githubusercontent.com/...",
  "changelog": "https://raw.githubusercontent.com/...",
  "versions": { ... }
}
```

**重要な発見**:

- サーバー側では既に `tags` を使用
- サーバー側では既に `thumbnail` に対応済み

### 3. フロントエンドでの変換処理

**ExtensionMarketplaceProvider.tsx** での変換:

```typescript
// Line 99-120: サーバーデータ → ExtensionMarketplaceDetail への変換
const flattenedExtensions: ExtensionMarketplaceDetail[] = [];
for (const ext of rawExtensions) {
  const versions = ext.versions;
  for (const [versionKey, versionData] of Object.entries(versions)) {
    flattenedExtensions.push({
      id: ext.id,
      name: ext.name,
      publisher: ext.publisher,
      description: ext.description,
      homepage: ext.homepage ?? "",
      license: ext.license ?? "",
      tags: ext.tags ?? [], // ← tags をそのまま使用
      namespace: (ext.namespace ?? "marketplace") as "local" | "org",
      readme: ext.readme,
      changelog: ext.changelog,
      version: versionData.version,
      foxe: versionData.foxe,
      sha256sum: versionData.sha256sum,
      time: {
        [versionKey]: versionData.publishedDate,
      },
      qualifiedName: `${ext.publisher}.${ext.name}`,
      // ❌ thumbnail が変換されていない
    });
  }
}
```

**問題点**:

- サーバーから `tags` で取得しているのに、`keywords` に変換していない
- `thumbnail` がフロントエンドに伝達されていない

## 根本的な解決策

### 提案: 型定義の統一とサムネイルの追加

#### Phase 1: ExtensionInfo 型の拡張

```typescript
// packages/suite-base/src/types/Extensions.ts

/**
 * Metadata describing an extension.
 */
export type ExtensionInfo = {
  id: string;
  description: string;
  displayName: string; // 表示名 (必須)
  homepage: string;
  keywords: string[]; // タグ/キーワード (配列)
  license: string;
  name: string; // 技術名 (必須)
  namespace?: Namespace;
  publisher: string;
  qualifiedName: string;
  version: string;
  readme?: string;
  changelog?: string;
  externalId?: string;
  thumbnail?: string; // ✅ 追加: サムネイルURL
};
```

#### Phase 2: ExtensionMarketplaceDetail 型の拡張

```typescript
// packages/suite-base/src/context/ExtensionMarketplaceContext.ts

/**
 * Extension marketplace detail information
 *
 * Detailed information for extensions published in the marketplace.
 * Includes distribution and verification information in addition to basic extension info.
 * Provides metadata for security and version management.
 */
export type ExtensionMarketplaceDetail = ExtensionInfo & {
  /** SHA256 hash for file integrity verification */
  sha256sum?: string;
  /** URL of the extension package (.foxe) file */
  foxe?: string;
  /** Timestamp information per version */
  time?: Record<string, string>;
  // thumbnail は ExtensionInfo から継承
};
```

#### Phase 3: ExtensionMarketplaceProvider の修正

```typescript
// packages/suite-base/src/providers/ExtensionMarketplaceProvider.tsx

// Line 99-120: サーバーデータの変換処理を修正
const flattenedExtensions: ExtensionMarketplaceDetail[] = [];
for (const ext of rawExtensions) {
  const versions = ext.versions;
  for (const [versionKey, versionData] of Object.entries(versions)) {
    flattenedExtensions.push({
      id: ext.id,
      name: ext.name,
      displayName: ext.name, // ✅ 追加: name を displayName としても使用
      publisher: ext.publisher,
      description: ext.description,
      homepage: ext.homepage ?? "",
      license: ext.license ?? "",
      keywords: ext.tags ?? [], // ✅ 修正: tags → keywords に変換
      thumbnail: ext.thumbnail, // ✅ 追加: サムネイルを伝達
      namespace: (ext.namespace ?? "marketplace") as "local" | "org",
      readme: ext.readme,
      changelog: ext.changelog,
      version: versionData.version,
      foxe: versionData.foxe,
      sha256sum: versionData.sha256sum,
      time: {
        [versionKey]: versionData.publishedDate,
      },
      qualifiedName: `${ext.publisher}.${ext.name}`,
    });
  }
}
```

#### Phase 4: useExtensionSettings の修正

```typescript
// packages/suite-base/src/components/ExtensionsSettings/hooks/useExtensionSettings.ts

const installedEntries = useMemo(() => {
  return (installed ?? []).map((entry) => {
    const marketplaceEntry = marketplaceMap[entry.id];
    if (marketplaceEntry != undefined) {
      return { ...marketplaceEntry, namespace: entry.namespace };
    }

    return {
      id: entry.id,
      installed: true,
      name: entry.name,
      displayName: entry.displayName, // ✅ 修正: displayName を追加
      description: entry.description,
      publisher: entry.publisher,
      homepage: entry.homepage,
      license: entry.license,
      version: entry.version,
      keywords: entry.keywords, // ✅ 修正: tags → keywords
      thumbnail: entry.thumbnail, // ✅ 追加: サムネイルを伝達
      namespace: entry.namespace,
      qualifiedName: entry.qualifiedName,
      readme: entry.readme,
      changelog: entry.changelog,
      // tags プロパティは削除
    };
  });
}, [installed, marketplaceMap]);
```

#### Phase 5: Sora関連ファイルの修正

##### 5-1. useSoraProcessedExtensions の型定義修正

```typescript
// packages/suite-base/src/hooks/marketplace/useSoraProcessedExtensions.ts

/**
 * Combined extension information with version management
 */
export interface ExtensionWithVersions {
  extensionId: string;
  versionedId: string;
  name: string;
  displayName: string; // ✅ 追加
  description: string;
  publisher: string;
  latestVersion: string;
  keywords: readonly string[]; // ✅ 修正: tags → keywords
  thumbnail?: string; // ✅ 追加
  installed: boolean;
  homepage?: string;
  license?: string;
  namespace?: string;
  versions: VersionInfo[];
  totalVersions: number;
  readme?: string;
  changelog?: string;
}

/**
 * Input format for installed extension data
 */
export interface InstalledExtensionInput {
  id: string;
  name: string;
  displayName: string; // ✅ 追加
  description: string;
  publisher: string;
  version: string;
  keywords: readonly string[]; // ✅ 修正: tags → keywords
  thumbnail?: string; // ✅ 追加
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
  displayName: string; // ✅ 追加
  description: string;
  publisher: string;
  version: string;
  keywords: readonly string[]; // ✅ 修正: tags → keywords
  thumbnail?: string; // ✅ 追加
  homepage?: string;
  license?: string;
  qualifiedName?: string;
  namespace?: string;
  readme?: string;
  changelog?: string;
}
```

##### 5-2. SoraExtensionsMarketplaceSettings の修正

```typescript
// packages/suite-base/src/components/SoraExtensionsMarketplaceSettings/SoraExtensionsMarketplaceSettings.tsx

// Line 44-60: ローカル型定義を削除し、useSoraProcessedExtensions からインポート
import {
  ExtensionWithVersions,
  useGroupedExtensionsByVersion,
} from "@lichtblick/suite-base/hooks/marketplace/useSoraProcessedExtensions";

// Line 96-142: データ変換を修正
const groupedExtensions = useGroupedExtensionsByVersion({
  installedData: namespacedData.flatMap((namespace) =>
    namespace.entries.map((ext) => ({
      id: ext.id,
      name: ext.name,
      displayName: ext.displayName,      // ✅ 追加
      description: ext.description,
      publisher: ext.publisher,
      version: ext.version,
      keywords: ext.keywords,            // ✅ 修正: tags → keywords (変換不要)
      thumbnail: ext.thumbnail,          // ✅ 追加
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
      ? marketplaceExtensions.map((ext) => ({
          id: ext.id,
          name: ext.name,
          displayName: ext.displayName,  // ✅ 追加
          description: ext.description,
          publisher: ext.publisher,
          version: ext.version,
          keywords: ext.keywords,        // ✅ 修正: tags → keywords (変換不要)
          thumbnail: ext.thumbnail,      // ✅ 追加
          homepage: ext.homepage,
          license: ext.license,
          readme: ext.readme,
          changelog: ext.changelog,
          qualifiedName: ext.qualifiedName,
          namespace: ext.namespace,
        }))
      : groupedMarketplaceData.flatMap((namespace) =>
          namespace.entries.map((ext) => ({
            id: ext.id,
            name: ext.name,
            displayName: ext.displayName,  // ✅ 追加
            description: ext.description,
            publisher: ext.publisher,
            version: ext.version || "1.0.0",
            keywords: ext.keywords,        // ✅ 修正: tags → keywords (変換不要)
            thumbnail: ext.thumbnail,      // ✅ 追加
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

// Line 475: サムネイルを表示
<SoraMarketplaceCard
  key={extension.extensionId}
  name={extension.name}
  version={extension.latestVersion}
  description={extension.description}
  publisher={extension.publisher}
  tags={[...extension.keywords]}     // ✅ 修正: keywords を tags として渡す (UI表示用)
  installed={extension.installed}
  loading={isOperating(extension.extensionId)}
  onViewDetails={(version?: string) => {
    const versionToUse = version ?? extension.latestVersion;
    const originalEntry = marketplaceExtensions?.find(
      (e) => e.id === extension.extensionId && e.version === versionToUse,
    );

    const marketplaceEntry: ExtensionMarketplaceDetail = {
      id: extension.extensionId,
      name: extension.name,
      displayName: extension.displayName,  // ✅ 追加
      description: extension.description,
      publisher: extension.publisher,
      version: versionToUse,
      keywords: [...extension.keywords],   // ✅ 修正
      thumbnail: extension.thumbnail,      // ✅ 追加
      homepage: extension.homepage,
      license: extension.license,
      namespace: extension.namespace,
      qualifiedName: extension.extensionId,
      readme: originalEntry?.readme,
      changelog: originalEntry?.changelog,
    };

    setFocusedExtension({
      installed: extension.installed,
      extension: marketplaceEntry,
    });
  }}
  onInstall={(version?: string) => {
    void handleInstall(extension, version);
  }}
  onUninstall={(version?: string) => {
    void handleUninstall(extension, version);
  }}
  thumbnail={extension.thumbnail}     // ✅ 修正: 実際のサムネイルを渡す
  icon={<ExtensionIcon style={{ fontSize: "24px" }} />}
/>
```

##### 5-3. useSoraProcessedExtensions の実装修正

```typescript
// packages/suite-base/src/hooks/marketplace/useSoraProcessedExtensions.ts

// Line 177, 206: データのマージ処理を修正
const mergedData: ExtensionWithVersions = {
  extensionId: baseId,
  versionedId: installedEntry.id,
  name: installedEntry.name,
  displayName: installedEntry.displayName, // ✅ 追加
  description: installedEntry.description,
  publisher: installedEntry.publisher,
  latestVersion: installedVersion,
  keywords: installedEntry.keywords, // ✅ 修正: tags → keywords
  thumbnail: installedEntry.thumbnail, // ✅ 追加
  installed: true,
  homepage: installedEntry.homepage,
  license: installedEntry.license,
  namespace: installedEntry.namespace,
  readme: installedEntry.readme,
  changelog: installedEntry.changelog,
  versions: installedEntry ? [versionInfo] : [],
  totalVersions: 1,
};
```

#### Phase 6: サーバー側データの用語統一 (オプション)

**注意**: サーバー側のデータは `tags` のままでも問題ありません。フロントエンドで変換します。

ただし、将来的な統一のため、以下の対応を検討:

```javascript
// server/schemas.js (将来的な対応)
export const extensionSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  displayName: { type: "string", required: false }, // ✅ 追加 (オプション)
  publisher: { type: "string", required: true },
  description: { type: "string", required: true },
  homepage: { type: "string", required: false },
  license: { type: "string", required: false },
  tags: { type: "array", required: false }, // サーバー側は tags のまま
  thumbnail: { type: "string|null", required: false },
  namespace: { type: "string", required: true },
  readme: { type: "string", required: false },
  changelog: { type: "string", required: false },
  versions: { type: "object", required: true },
};
```

## 実装の詳細

### サムネイルの取得と表示

#### インストール後のサムネイル表示

**問題**: インストール後、ローカルに保存された拡張機能にはサムネイル情報がない

**解決策**: マーケットプレイスデータとマージ

```typescript
// useSoraInstalledExtensions.ts での実装例

export function useSoraInstalledExtensions(): InstalledItemsState<ExtensionInfo> {
  const { namespacedData, refreshMarketplaceEntries } = useExtensionSettings();
  const marketplace = useExtensionMarketplace();
  const marketplaceExtensions = marketplace.marketplaceExtensions;

  const { installedIds, itemMap } = useMemo(() => {
    const ids = new Set<string>();
    const map = new Map<string, ExtensionInfo>();

    // マーケットプレイスデータをマップ化
    const marketplaceMap = new Map<string, ExtensionMarketplaceDetail>();
    if (marketplaceExtensions) {
      for (const ext of marketplaceExtensions) {
        const baseId = extractBaseId(ext.id);
        marketplaceMap.set(baseId, ext);
      }
    }

    namespacedData.forEach((namespace) => {
      namespace.entries.forEach((ext) => {
        const baseId = extractBaseId(ext.id);
        ids.add(baseId);

        // マーケットプレイスデータとマージしてサムネイルを取得
        const marketplaceData = marketplaceMap.get(baseId);
        const mergedExt: ExtensionInfo = {
          ...ext,
          thumbnail: marketplaceData?.thumbnail ?? ext.thumbnail, // ✅ サムネイルをマージ
        };

        map.set(baseId, mergedExt);
      });
    });

    return { installedIds: ids, itemMap: map };
  }, [namespacedData, marketplaceExtensions]);

  // ... rest of implementation
}
```

### UI コンポーネントでの表示

**SoraMarketplaceCard** は既にサムネイル対応済み:

```typescript
// SoraMarketplaceCard.tsx (既存実装)
<ThumbnailArea
  thumbnail={thumbnail}     // サムネイルURL
  icon={icon}               // フォールバックアイコン
  name={name}               // alt テキスト用
/>
```

## メリット

### ✅ 型定義の統一

1. **一貫性**: システム全体で `keywords` と `displayName` を使用
2. **シンプル**: 型変換が不要
3. **保守性**: 1つの用語体系で統一

### ✅ サムネイルの追加

1. **視覚的**: 拡張機能を視覚的に識別しやすい
2. **ユーザビリティ**: より良いUX
3. **将来性**: アイコンやロゴの表示に対応

### ✅ 既存実装の活用

1. **効率性**: 既存のUIコンポーネントをそのまま使用
2. **互換性**: ベースシステムとの統合が容易
3. **テスト**: 既存のテストが活用できる

## デメリットと対策

### ⚠️ サーバー側の用語不一致

**問題**: サーバーは `tags`、フロントエンドは `keywords`

**対策**: ExtensionMarketplaceProvider で変換

```typescript
keywords: ext.tags ?? [],  // サーバーの tags を keywords に変換
```

### ⚠️ 既存データへの影響

**問題**: インストール済み拡張機能にサムネイル情報がない

**対策**: マーケットプレイスデータとマージして取得

## 実装ステップ

### Phase 1: 型定義の更新 (優先度: Critical)

1. ✅ `ExtensionInfo` に `thumbnail` を追加
2. ✅ `ExtensionMarketplaceDetail` の継承確認

### Phase 2: データ変換の修正 (優先度: Critical)

1. ✅ `ExtensionMarketplaceProvider` で `tags` → `keywords` 変換
2. ✅ `ExtensionMarketplaceProvider` で `thumbnail` を伝達
3. ✅ `ExtensionMarketplaceProvider` で `displayName` を設定

### Phase 3: useExtensionSettings の修正 (優先度: Critical)

1. ✅ `entry.tags` → `entry.keywords` に変更
2. ✅ `entry.displayName` を追加
3. ✅ `entry.thumbnail` を追加

### Phase 4: Sora関連ファイルの修正 (優先度: High)

1. ✅ `useSoraProcessedExtensions` の型定義を更新
2. ✅ `SoraExtensionsMarketplaceSettings` のデータ変換を削除
3. ✅ `useSoraInstalledExtensions` でサムネイルをマージ

### Phase 5: テストの更新 (優先度: High)

1. ✅ `useExtensionSettings.test.ts` の確認
2. ✅ Soraコンポーネントのテスト更新
3. ✅ 統合テストの実施

### Phase 6: ドキュメントの更新 (優先度: Medium)

1. ✅ 型定義のドキュメント更新
2. ✅ サムネイル追加ガイドの作成
3. ✅ マーケットプレイスデータ仕様の更新

## 移行計画

### ステップ1: 型定義の準備 (1日)

- `ExtensionInfo` に `thumbnail` を追加
- 関連する型定義の確認

### ステップ2: ExtensionMarketplaceProvider の修正 (1日)

- サーバーデータの変換処理を修正
- `tags` → `keywords`、`thumbnail` の伝達

### ステップ3: useExtensionSettings の修正 (1日)

- 型エラーの修正
- `displayName`、`keywords`、`thumbnail` の対応

### ステップ4: Sora関連の修正 (2日)

- 型定義の更新
- データ変換の削除
- サムネイル表示の実装

### ステップ5: テストとバグ修正 (2日)

- ユニットテストの更新
- 統合テストの実施
- バグ修正

### ステップ6: ドキュメント整備 (1日)

- ドキュメントの更新
- 移行ガイドの作成

**合計: 約8日間**

## 結論

### 🎯 推奨実装

**keywords と displayName に統一し、thumbnail を追加**

この approach により:

1. ✅ **型の一貫性**: システム全体で統一された用語
2. ✅ **シンプルさ**: 不要な型変換を削除
3. ✅ **拡張性**: サムネイルによる視覚的な識別
4. ✅ **保守性**: ベースシステムとの統合が容易
5. ✅ **ユーザビリティ**: より良いUX

### 次のアクション

1. ⬜ Phase 1: 型定義の更新
2. ⬜ Phase 2: ExtensionMarketplaceProvider の修正
3. ⬜ Phase 3: useExtensionSettings の修正
4. ⬜ Phase 4: Sora関連ファイルの修正
5. ⬜ Phase 5: テストの更新
6. ⬜ Phase 6: ドキュメントの整備

## 関連イシュー

- [20251016_01_useExtensionSettings-type-mismatch.md](./20251016_01_useExtensionSettings-type-mismatch.md)
- [20251016_02_useExtensionSettings-usage-analysis.md](./20251016_02_useExtensionSettings-usage-analysis.md)
- [20251016_03_sora-extension-type-independence-analysis.md](./20251016_03_sora-extension-type-independence-analysis.md)
