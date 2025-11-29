# LayoutMarketplaceProviderのリファクタリング - Extension方式への統一

**作成日**: 2025年10月15日
**作業者**: AI Assistant
**関連ブランチ**: `feature/remove-layout-preview`

## 📋 作業概要

LayoutMarketplaceProviderをExtensionMarketplaceProviderと同じシンプルなパターンに統一するリファクタリングを実施しました。マーケットプレースからのデータ取得のみに責務を集中させ、ダウンロードや検証機能をLayoutCatalogProviderに統合しました。

## 🎯 作業目的

- **単一責任原則の遵守**: 各Providerの責務を明確に分離
- **アーキテクチャの一貫性**: ExtensionとLayoutで同じパターンを使用
- **コードの簡潔性**: 薄いラッパーメソッドと重複コードの削除
- **保守性の向上**: 機能の所在を明確化

## 📝 実施した変更

### Phase 1: LayoutCatalogProvider の修正

**ファイル**: `packages/suite-base/src/providers/LayoutCatalogProvider.tsx`

#### 1.1 `calculateSHA256` ヘルパー関数の追加

```typescript
/**
 * Helper function to calculate SHA256 hash
 *
 * @param data - Data to calculate hash for
 * @returns SHA256 hash as hexadecimal string
 */
async function calculateSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

#### 1.2 `verifyLayoutHash` の直接実装

**変更前**: marketplaceに委譲

```typescript
const verifyLayoutHash = useCallback(
  async (data: LayoutData, expectedHash: string): Promise<boolean> => {
    return await marketplace.verifyLayoutHash(data, expectedHash);
  },
  [marketplace],
);
```

**変更後**: 直接実装

```typescript
const verifyLayoutHash = useCallback(
  async (data: LayoutData, expectedHash: string): Promise<boolean> => {
    try {
      const dataString = JSON.stringify(data);
      if (dataString == undefined) {
        throw new Error("Failed to serialize layout data");
      }
      const actualHash = await calculateSHA256(dataString);
      return actualHash === expectedHash.toLowerCase();
    } catch (error) {
      console.error("Error verifying layout hash:", error);
      return false;
    }
  },
  [],
);
```

#### 1.3 `downloadLayoutFromMarketplace` の直接実装

**変更前**: marketplaceに委譲

```typescript
const downloadLayoutFromMarketplace = useCallback(
  async (detail: LayoutMarketplaceDetail): Promise<LayoutData> => {
    const layoutData = await marketplace.downloadLayout(detail.layout);
    if (detail.sha256sum) {
      const isValid = await marketplace.verifyLayoutHash(layoutData, detail.sha256sum);
      // ...
    }
    return layoutData;
  },
  [marketplace],
);
```

**変更後**: fetchを使った直接実装

```typescript
const downloadLayoutFromMarketplace = useCallback(
  async (detail: LayoutMarketplaceDetail): Promise<LayoutData> => {
    try {
      // Download layout data directly via fetch
      const response = await fetch(detail.layout);
      if (!response.ok) {
        throw new Error(`Failed to download layout: ${response.status}`);
      }

      const layoutData = (await response.json()) as LayoutData;

      // Validate data structure
      if (!validateLayoutDataStructure(layoutData)) {
        throw new Error("Invalid layout data structure");
      }

      // Hash verification (if available)
      if (detail.sha256sum) {
        const isValid = await verifyLayoutHash(layoutData, detail.sha256sum);
        if (!isValid) {
          throw new Error("Hash verification failed - layout may be corrupted or tampered");
        }
      }

      return layoutData;
    } catch (error) {
      console.error(`Error downloading layout ${detail.id}:`, error);
      throw error;
    }
  },
  [verifyLayoutHash],
);
```

#### 1.4 不要な依存の削除

- `useLayoutMarketplace` hookの使用を削除
- `marketplace` 定数を削除
- importから `useLayoutMarketplace` を削除

### Phase 2: LayoutMarketplaceProvider の簡素化

**ファイル**: `packages/suite-base/src/providers/LayoutMarketplaceProvider.tsx`

#### 2.1 不要なメソッドの削除

以下のメソッドを削除:

- `downloadLayout(url: string): Promise<LayoutData>`
- `verifyLayoutHash(data: LayoutData, expectedHash: string): Promise<boolean>`

#### 2.2 不要なヘルパー関数の削除

以下のヘルパー関数を削除:

- `calculateSHA256(data: string): Promise<string>`
- `validateLayoutData(data: unknown): data is LayoutData`

#### 2.3 不要なimportの削除

```typescript
// 削除
import { LayoutData } from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
```

#### 2.4 Providerの返却値を更新

**変更前**:

```typescript
const marketplace = useShallowMemo({
  getAvailableLayouts,
  searchLayouts,
  getLayoutDetail,
  downloadLayout, // 削除
  verifyLayoutHash, // 削除
});
```

**変更後**:

```typescript
const marketplace = useShallowMemo({
  getAvailableLayouts,
  searchLayouts,
  getLayoutDetail,
});
```

### Phase 3: LayoutMarketplaceContext の更新

**ファイル**: `packages/suite-base/src/context/LayoutMarketplaceContext.ts`

#### 3.1 インターフェース定義の更新

**変更前**:

```typescript
export interface LayoutMarketplace {
  getAvailableLayouts(): Promise<LayoutMarketplaceDetail[]>;
  searchLayouts(query: string): Promise<LayoutMarketplaceDetail[]>;
  getLayoutDetail(id: string): Promise<LayoutMarketplaceDetail | undefined>;
  downloadLayout(url: string): Promise<LayoutData>;
  verifyLayoutHash(data: LayoutData, expectedHash: string): Promise<boolean>;
}
```

**変更後**:

```typescript
export interface LayoutMarketplace {
  getAvailableLayouts(): Promise<LayoutMarketplaceDetail[]>;
  searchLayouts(query: string): Promise<LayoutMarketplaceDetail[]>;
  getLayoutDetail(id: string): Promise<LayoutMarketplaceDetail | undefined>;
}
```

#### 3.2 ドキュメントコメントの更新

```typescript
/**
 * LayoutMarketplace interface provides access to the layout marketplace.
 * This interface is responsible for fetching marketplace data only.
 * Layout download, verification, and installation are handled by LayoutCatalog.
 *
 * @see LayoutCatalog - For layout download, verification, and installation
 */
```

#### 3.3 不要なimportの削除

```typescript
// 削除
import { LayoutData } from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
```

## ✅ 検証結果

### TypeScript型チェック

```bash
yarn tsc --noEmit --project tsconfig.json
```

**結果**: ✅ エラーなし (Exit Code: 0)

### 影響を受けたファイル

1. ✏️ `packages/suite-base/src/providers/LayoutCatalogProvider.tsx`

   - `calculateSHA256` 追加
   - `verifyLayoutHash` 直接実装
   - `downloadLayoutFromMarketplace` 直接実装
   - `useLayoutMarketplace` 削除

2. ✏️ `packages/suite-base/src/providers/LayoutMarketplaceProvider.tsx`

   - `downloadLayout` 削除
   - `verifyLayoutHash` 削除
   - `calculateSHA256` 削除
   - `validateLayoutData` 削除

3. ✏️ `packages/suite-base/src/context/LayoutMarketplaceContext.ts`
   - インターフェースから2メソッド削除
   - ドキュメント更新

### 影響を受けなかったファイル

- ✅ `packages/suite-base/src/context/LayoutCatalogContext.ts` - 変更不要
- ✅ `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx` - LayoutCatalogのみ使用
- ✅ その他のUIコンポーネント - 影響なし

## 📊 変更の比較

### Before: 複雑な構造

```
LayoutMarketplaceProvider (5 methods)
  ├─ getAvailableLayouts()
  ├─ searchLayouts()
  ├─ getLayoutDetail()
  ├─ downloadLayout()        ← 削除
  └─ verifyLayoutHash()      ← 削除

LayoutCatalogProvider
  ├─ downloadLayoutFromMarketplace()
  │   └─ marketplace.downloadLayout()  ← 薄いラッパー
  ├─ verifyLayoutHash()
  │   └─ marketplace.verifyLayoutHash() ← 薄いラッパー
  └─ installLayoutFromMarketplace()
```

### After: シンプルな構造

```
LayoutMarketplaceProvider (3 methods) ← Extension方式と同じ
  ├─ getAvailableLayouts()
  ├─ searchLayouts()
  └─ getLayoutDetail()

LayoutCatalogProvider
  ├─ downloadLayoutFromMarketplace()  ← 直接実装
  ├─ verifyLayoutHash()               ← 直接実装
  └─ installLayoutFromMarketplace()
```

## 💡 達成した成果

### 1. 単一責任原則の遵守

- **LayoutMarketplaceProvider**: マーケットプレースデータの取得のみ
- **LayoutCatalogProvider**: ダウンロード、検証、インストールの統合管理

### 2. アーキテクチャの一貫性

- ExtensionMarketplaceProviderと同じパターン
- チーム全体での理解が容易

### 3. コードの簡潔性

- 薄いラッパーメソッドの削除
- 重複コードの削除
- メソッド数の削減 (5 → 3)

### 4. 保守性の向上

- 機能の所在が明確
- 依存関係の簡素化
- 将来的な拡張が容易

## 🎯 今後の課題

### 短期的な改善

1. **ユニットテストの追加**

   - `downloadLayoutFromMarketplace` のテスト
   - `verifyLayoutHash` のテスト
   - エラーケースのテスト

2. **エラーハンドリングの強化**
   - ネットワークエラー時のリトライ機構
   - より詳細なエラーメッセージ

### 中長期的な改善

1. **共通ユーティリティの抽出**

   - `calculateSHA256` を `@lichtblick/suite-base/util/crypto` に移動
   - ExtensionとLayoutで共有

2. **検証ロジックの統一**

   - マーケットプレイスアイテムの検証を共通化
   - `MarketplaceItemValidator` のような共通クラスの作成

3. **キャッシュ機構の追加**
   - ダウンロードしたレイアウトのキャッシュ
   - ネットワーク負荷の軽減

## 📚 関連ドキュメント

- [修正プラン](../../04_implementation/plans/20251015_01_refactor-layout-to-extension-pattern.md)
- [ExtensionMarketplaceProvider実装](../../../packages/suite-base/src/providers/ExtensionMarketplaceProvider.tsx)
- [LayoutCatalogProvider実装](../../../packages/suite-base/src/providers/LayoutCatalogProvider.tsx)
- [LayoutMarketplaceProvider実装](../../../packages/suite-base/src/providers/LayoutMarketplaceProvider.tsx)

## 🔄 変更履歴

- **2025年10月15日**: 初回作成 - LayoutMarketplaceProviderのリファクタリング完了

---

## 📝 メモ

このリファクタリングにより、LayoutとExtensionのマーケットプレイス実装が統一され、コードベース全体の一貫性が向上しました。今後は両方のパターンを参照しながら新機能を追加できます。
