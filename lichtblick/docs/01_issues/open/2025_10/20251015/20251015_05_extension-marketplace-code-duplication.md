# 拡張機能マーケットプレイスのコード重複とアーキテクチャの問題

**発見日**: 2025年10月15日
**重要度**: High
**カテゴリ**: Architecture, Code Quality, Duplication

---

## 📋 問題の概要

拡張機能マーケットプレイス機能において、以下の3つの重大な問題が発見されました:

1. **URL定義の重複**: 同じマーケットプレイスURLが2箇所で定義されている
2. **マーケットプレイス機能の重複**: 同じ機能が異なるProviderで実装されている
3. **役割の混在**: ExtensionCatalogProviderが本来の役割を超えている

---

## 🔍 発見した問題の詳細

### 1. URL定義の重複

**場所1**: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx` (L13-16)

```typescript
const EXTENSIONS_JSON_URL =
  typeof EXTENSION_MARKETPLACE_URL !== "undefined" && EXTENSION_MARKETPLACE_URL.length > 0
    ? EXTENSION_MARKETPLACE_URL
    : "http://localhost:3001/extensions/extensions.json";
```

**場所2**: `packages/suite-base/src/providers/ExtensionMarketplaceProvider.tsx` (L24-27)

```typescript
const EXTENSIONS_JSON_URL: string =
  typeof EXTENSION_MARKETPLACE_URL !== "undefined" && EXTENSION_MARKETPLACE_URL.length > 0
    ? EXTENSION_MARKETPLACE_URL
    : "http://localhost:3001/extensions/extensions.json";
```

**問題点**:

- まったく同じURL定義が2箇所に存在
- 変更時に両方を更新する必要がある
- 保守性が低下し、バグの温床になる

---

### 2. マーケットプレイス機能の重複

#### ExtensionCatalogProvider (L472-547)

```typescript
// マーケットプレイス関連のプロパティ
return {
  // ... 既存の機能 ...

  // ========== Marketplace Extensions ==========
  getMarketplaceExtensions: async () => {
    try {
      set({ marketplaceLoading: true, marketplaceError: undefined });
      const response = await fetch(EXTENSIONS_JSON_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch extensions: ${response.status} ${response.statusText}`);
      }
      const extensions = (await response.json()) as ExtensionItem[];
      set({ marketplaceExtensions: extensions, marketplaceLoading: false });
      return extensions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to fetch extensions";
      set({ marketplaceError: errorMsg, marketplaceLoading: false });
      log.error("Failed to fetch marketplace extensions:", error);
      throw error;
    }
  },
  getExtensionVersions: async (baseId: string): Promise<ExtensionItem> => { ... },
  getLatestExtensions: async (): Promise<ExtensionItem[]> => { ... },
  searchMarketplaceExtensions: async (query: string): Promise<ExtensionItem[]> => { ... },
  refreshMarketplaceData: async () => { ... },
  marketplaceExtensions: undefined,
  marketplaceLoading: false,
  marketplaceError: undefined,
};
```

#### ExtensionMarketplaceProvider (L91-116)

```typescript
const getAvailableExtensions = useCallback(async (): Promise<ExtensionMarketplaceDetail[]> => {
  const response = await fetch(EXTENSIONS_JSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch extensions: ${response.status} ${response.statusText}`);
  }

  interface ExtensionWithVersions {
    id: string;
    name: string;
    publisher: string;
    description: string;
    // ... more fields
    versions: Record<string, { ... }>;
  }

  const rawExtensions = (await response.json()) as ExtensionWithVersions[];

  // Flatten the nested versions structure
  const flattenedExtensions: ExtensionMarketplaceDetail[] = [];
  for (const ext of rawExtensions) {
    const versions = ext.versions;
    for (const [versionKey, versionData] of Object.entries(versions)) {
      flattenedExtensions.push({
        id: ext.id,
        name: ext.name,
        // ... more fields
        version: versionData.version,
        foxe: versionData.foxe,
        // ...
      });
    }
  }

  return flattenedExtensions;
}, []);
```

**問題点**:

- 同じエンドポイントから同じデータを取得している
- データ構造の解釈が異なる (flatten処理の有無)
- どちらを使うべきか不明確
- キャッシュが分離されている

---

### 3. 役割の混在

#### ExtensionCatalogProviderの役割分析

**本来の役割** (Single Responsibility):

- ✅ インストール済み拡張機能の管理
- ✅ 拡張機能のインストール・アンインストール
- ✅ 拡張機能の状態管理
- ✅ ContributionPointsの統合

**実際に実装されている機能** (実装):

- ✅ 上記すべて
- ❌ マーケットプレイスからの拡張機能取得
- ❌ マーケットプレイス拡張機能の検索
- ❌ マーケットプレイスデータのキャッシュ管理

**結果**: Single Responsibility Principleの違反

---

## 🏗️ 現在のアーキテクチャ

```
現在の実装（問題あり）:

ExtensionCatalogProvider
├── インストール済み拡張機能の管理 ✅
├── インストール・アンインストール ✅
├── マーケットプレイス取得 ❌ (重複)
├── マーケットプレイス検索 ❌ (重複)
└── マーケットプレイスキャッシュ ❌ (重複)

ExtensionMarketplaceProvider
├── マーケットプレイス取得 ✅ (重複)
├── Markdown取得 ✅
└── データのflatten処理 ✅

問題:
- 機能が重複している
- 役割が不明確
- データ構造の解釈が異なる
```

---

## 💡 推奨される解決策

### アーキテクチャの再設計

```
理想的なアーキテクチャ:

ExtensionMarketplaceProvider (データソース層)
├── マーケットプレイス取得
├── マーケットプレイス検索
├── Markdown取得
├── キャッシュ管理
└── データの正規化

ExtensionCatalogProvider (状態管理層)
├── インストール済み拡張機能の管理
├── インストール・アンインストール
├── ExtensionMarketplaceからデータを取得 (委譲)
└── ローカル状態とマーケットプレイス状態の統合

利点:
- 役割が明確
- 重複がない
- テストしやすい
- 再利用可能
```

### 具体的な実装計画

#### Phase 1: ExtensionMarketplaceProviderの強化

1. **マーケットプレイス機能の統合**

   ```typescript
   export interface ExtensionMarketplace {
     // 既存
     getAvailableExtensions(): Promise<ExtensionMarketplaceDetail[]>;
     getMarkdown(url: string): Promise<string>;

     // 追加 (ExtensionCatalogProviderから移動)
     searchExtensions(query: string): Promise<ExtensionMarketplaceDetail[]>;
     getExtensionVersions(baseId: string): Promise<ExtensionMarketplaceDetail[]>;
     refreshMarketplaceData(): Promise<void>;

     // 状態管理
     marketplaceExtensions: ExtensionMarketplaceDetail[] | undefined;
     marketplaceLoading: boolean;
     marketplaceError: string | undefined;
   }
   ```

2. **データ正規化の統一**
   - `getAvailableExtensions`の結果を標準形式に
   - バージョンのflatten処理を統一

#### Phase 2: ExtensionCatalogProviderのリファクタリング

1. **マーケットプレイス機能の削除**

   ```typescript
   export type ExtensionCatalog = Immutable<{
     // 既存の機能はそのまま
     downloadExtension: (url: string) => Promise<Uint8Array>;
     installExtensions: (...) => Promise<InstallExtensionsResult[]>;
     uninstallExtension: (namespace: Namespace, id: string) => Promise<void>;
     // ... その他の機能

     // ❌ 削除: マーケットプレイス関連機能
     // getMarketplaceExtensions
     // searchMarketplaceExtensions
     // getExtensionVersions
     // etc.
   }>;
   ```

2. **ExtensionMarketplaceとの統合**

   ```typescript
   // ExtensionMarketplaceProviderを使用
   const marketplace = useExtensionMarketplace();

   // マーケットプレイスから取得して、インストール済みとマージ
   const allExtensions = useMemo(() => {
     const installed = catalog.installedExtensions;
     const available = marketplace.marketplaceExtensions;
     return mergeExtensions(installed, available);
   }, [catalog.installedExtensions, marketplace.marketplaceExtensions]);
   ```

#### Phase 3: URL設定の統一

1. **共通の設定ファイルを作成**

   ```typescript
   // packages/suite-base/src/config/marketplace.ts
   export const MARKETPLACE_CONFIG = {
     extensionsJsonUrl:
       typeof EXTENSION_MARKETPLACE_URL !== "undefined" && EXTENSION_MARKETPLACE_URL.length > 0
         ? EXTENSION_MARKETPLACE_URL
         : "http://localhost:3001/extensions/extensions.json",
   } as const;
   ```

2. **各Providerで使用**

   ```typescript
   import { MARKETPLACE_CONFIG } from "@lichtblick/suite-base/config/marketplace";

   const response = await fetch(MARKETPLACE_CONFIG.extensionsJsonUrl);
   ```

---

## 📊 影響範囲の分析

### 変更が必要なファイル

| ファイル                                                             | 変更内容                   | 優先度 |
| -------------------------------------------------------------------- | -------------------------- | ------ |
| `packages/suite-base/src/context/ExtensionMarketplaceContext.ts`     | インターフェース拡張       | High   |
| `packages/suite-base/src/providers/ExtensionMarketplaceProvider.tsx` | 機能追加・状態管理         | High   |
| `packages/suite-base/src/context/ExtensionCatalogContext.ts`         | マーケットプレイス機能削除 | High   |
| `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`     | マーケットプレイス機能削除 | High   |
| `packages/suite-base/src/config/marketplace.ts`                      | 新規作成 (URL統一)         | Medium |
| `packages/suite-base/src/components/ExtensionsSettings/*.tsx`        | API変更対応                | Medium |

### 破壊的変更

以下のAPIが変更されます:

```typescript
// ❌ 削除される
catalog.getMarketplaceExtensions();
catalog.searchMarketplaceExtensions(query);
catalog.marketplaceExtensions;

// ✅ 新しいAPI
marketplace.getAvailableExtensions();
marketplace.searchExtensions(query);
marketplace.marketplaceExtensions;
```

---

## ✅ 期待される効果

### コード品質の向上

- ✅ **DRY原則の遵守**: URL定義が1箇所のみ
- ✅ **Single Responsibility**: 各Providerが単一の役割
- ✅ **明確な責任分界**: データ取得 vs 状態管理
- ✅ **テスタビリティ**: モックが容易

### 保守性の向上

- ✅ **変更が局所化**: マーケットプレイス変更は1箇所のみ
- ✅ **理解しやすい**: 役割が明確
- ✅ **拡張しやすい**: 新機能追加が容易

### パフォーマンスの向上

- ✅ **重複リクエストの削減**: 同じデータを2回取得しない
- ✅ **統一されたキャッシュ**: 効率的なデータ管理

---

## 🚀 実装の優先順位

### Phase 1 (Critical): URL統一とデータ取得の統一

- [ ] `config/marketplace.ts`の作成
- [ ] URL定義の一元化
- [ ] 両Providerでの使用

### Phase 2 (High): ExtensionMarketplaceProviderの強化

- [ ] インターフェース拡張
- [ ] 検索機能の実装
- [ ] 状態管理の追加
- [ ] キャッシュ機構の実装

### Phase 3 (High): ExtensionCatalogProviderのリファクタリング

- [ ] マーケットプレイス機能の削除
- [ ] ExtensionMarketplaceとの統合

### Phase 4 (Medium): コンポーネントの更新

- [ ] ExtensionsSettings等のAPI変更対応
- [ ] テストの更新
- [ ] ドキュメントの更新

---

## 📚 参考資料

### 関連ドキュメント

- [マーケットプレイスアーキテクチャ統一作業](../../../08_worklogs/2025_10/20251015/20251015_04_unify-marketplace-architecture-pattern.md)
- [AppSettingsDialog実装の違い](./20251015_01_appsettingsdialog-marketplace-implementation-differences.md)

### 設計原則

- [Single Responsibility Principle (SOLID)](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- [DRY Principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
- [Separation of Concerns](https://en.wikipedia.org/wiki/Separation_of_concerns)

---

## 📝 メモ

### なぜこの問題が発生したか

1. **段階的な開発**: 最初はExtensionCatalogProviderのみで機能を追加
2. **後からの分離**: 後にExtensionMarketplaceProviderを作成したが、既存機能を削除しなかった
3. **レビュー不足**: 重複に気づかずにマージされた

### 今後の予防策

- [ ] アーキテクチャレビューの強化
- [ ] 責任範囲の明確化
- [ ] 重複コード検出ツールの導入
- [ ] 定期的なコードレビュー

---

**作成日時**: 2025年10月15日
**ステータス**: Open
**担当者**: 未割り当て
