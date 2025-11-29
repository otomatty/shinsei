# Layout実装をExtension方式にリファクタリング - 修正プラン

**作成日**: 2025年10月15日
**目的**: LayoutMarketplaceProviderをExtensionMarketplaceProviderのシンプルなパターンに合わせる

## 📋 現状分析

### Extension方式の特徴（目標とする実装）

```typescript
// ExtensionMarketplaceProvider - シンプル
interface ExtensionMarketplace {
  getAvailableExtensions(): Promise<ExtensionMarketplaceDetail[]>;
  getMarkdown(url: string): Promise<string>;
}
```

**特徴:**

- ✅ マーケットプレースからのデータ取得のみ
- ✅ 2つのメソッドのみ
- ✅ ダウンロード・検証・インストールは別Provider

### Layout方式の問題点（現状）

```typescript
// LayoutMarketplaceProvider - 複雑
interface LayoutMarketplace {
  getAvailableLayouts(): Promise<LayoutMarketplaceDetail[]>;
  searchLayouts(query: string): Promise<LayoutMarketplaceDetail[]>;
  getLayoutDetail(id: string): Promise<LayoutMarketplaceDetail | undefined>;
  downloadLayout(url: string): Promise<LayoutData>;           // ← 移動対象
  verifyLayoutHash(data: LayoutData, hash: string): Promise<boolean>; // ← 移動対象
}

// LayoutCatalogProvider
interface LayoutCatalog {
  downloadLayoutFromMarketplace(...): Promise<LayoutData>;    // ← 冗長
  installLayoutFromMarketplace(...): Promise<InstallLayoutResult>;
  verifyLayoutHash(...): Promise<boolean>;                     // ← 冗長
  // ... 他のメソッド
}
```

**問題点:**

- ❌ `downloadLayout`と`verifyLayoutHash`がMarketplaceProviderに存在
- ❌ LayoutCatalogProviderで`downloadLayoutFromMarketplace`が`marketplace.downloadLayout`を呼ぶだけの薄いラッパー
- ❌ `verifyLayoutHash`が2つのProviderで重複

---

## 🎯 リファクタリング目標

### ✅ リファクタリング後の構成

```typescript
// LayoutMarketplaceProvider - シンプル（Extensionと同じパターン）
interface LayoutMarketplace {
  getAvailableLayouts(): Promise<LayoutMarketplaceDetail[]>;
  searchLayouts(query: string): Promise<LayoutMarketplaceDetail[]>;
  getLayoutDetail(id: string): Promise<LayoutMarketplaceDetail | undefined>;
  // downloadLayout と verifyLayoutHash は削除
}

// LayoutCatalogProvider - 機能を統合
interface LayoutCatalog {
  downloadLayoutFromMarketplace(...): Promise<LayoutData>;      // ← 直接実装
  installLayoutFromMarketplace(...): Promise<InstallLayoutResult>;
  validateLayoutData(data: LayoutData): Promise<boolean>;
  verifyLayoutHash(data: LayoutData, hash: string): Promise<boolean>; // ← 直接実装
  // ... 他のメソッド
}
```

---

## 📝 修正プラン

### Phase 1: LayoutCatalogProviderの修正

#### 1.1 `downloadLayoutFromMarketplace`メソッドの直接実装

**現在:**

```typescript
const downloadLayoutFromMarketplace = useCallback(
  async (detail: LayoutMarketplaceDetail): Promise<LayoutData> => {
    const layoutData = await marketplace.downloadLayout(detail.layout); // ← marketplaceに依存
    if (detail.sha256sum) {
      const isValid = await marketplace.verifyLayoutHash(layoutData, detail.sha256sum); // ← marketplaceに依存
      // ...
    }
    return layoutData;
  },
  [marketplace],
);
```

**変更後:**

```typescript
const downloadLayoutFromMarketplace = useCallback(
  async (detail: LayoutMarketplaceDetail): Promise<LayoutData> => {
    try {
      // 直接fetchでダウンロード
      const response = await fetch(detail.layout);
      if (!response.ok) {
        throw new Error(`Failed to download layout: ${response.status}`);
      }

      const layoutData = (await response.json()) as LayoutData;

      // データ構造の検証
      if (!validateLayoutDataStructure(layoutData)) {
        throw new Error("Invalid layout data structure");
      }

      // ハッシュ検証（利用可能な場合）
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
  [verifyLayoutHash], // marketplaceへの依存を削除
);
```

#### 1.2 `verifyLayoutHash`メソッドの直接実装

**現在:**

```typescript
const verifyLayoutHash = useCallback(
  async (data: LayoutData, expectedHash: string): Promise<boolean> => {
    return await marketplace.verifyLayoutHash(data, expectedHash); // ← marketplaceに依存
  },
  [marketplace],
);
```

**変更後:**

```typescript
const verifyLayoutHash = useCallback(
  async (data: LayoutData, expectedHash: string): Promise<boolean> => {
    try {
      const dataString = JSON.stringify(data);
      const actualHash = await calculateSHA256(dataString);
      return actualHash === expectedHash;
    } catch (error) {
      console.error("Error verifying layout hash:", error);
      return false;
    }
  },
  [],
);
```

#### 1.3 `calculateSHA256`ヘルパー関数の追加

LayoutMarketplaceProviderから移動:

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

---

### Phase 2: LayoutMarketplaceProviderの簡素化

#### 2.1 `downloadLayout`メソッドの削除

**削除対象:**

```typescript
const downloadLayout = useCallback(async (url: string): Promise<LayoutData> => {
  // ... 実装を削除
}, []);
```

#### 2.2 `verifyLayoutHash`メソッドの削除

**削除対象:**

```typescript
const verifyLayoutHash = useCallback(
  async (data: LayoutData, expectedHash: string): Promise<boolean> => {
    // ... 実装を削除
  },
  [],
);
```

#### 2.3 `validateLayoutData`ヘルパー関数の削除または移動

LayoutCatalogProviderに既に存在するため、LayoutMarketplaceProviderから削除。

#### 2.4 Providerの返却値を更新

**現在:**

```typescript
const marketplace = useShallowMemo({
  getAvailableLayouts,
  searchLayouts,
  getLayoutDetail,
  downloadLayout, // ← 削除
  verifyLayoutHash, // ← 削除
});
```

**変更後:**

```typescript
const marketplace = useShallowMemo({
  getAvailableLayouts,
  searchLayouts,
  getLayoutDetail,
  // downloadLayout と verifyLayoutHash を削除
});
```

---

### Phase 3: LayoutMarketplaceContextの更新

#### 3.1 インターフェース定義の更新

**ファイル:** `packages/suite-base/src/context/LayoutMarketplaceContext.ts`

**削除するメソッド:**

```typescript
// 削除
downloadLayout(url: string): Promise<LayoutData>;
verifyLayoutHash(data: LayoutData, expectedHash: string): Promise<boolean>;
```

**変更後のインターフェース:**

```typescript
export interface LayoutMarketplace {
  getAvailableLayouts(): Promise<LayoutMarketplaceDetail[]>;
  searchLayouts(query: string): Promise<LayoutMarketplaceDetail[]>;
  getLayoutDetail(id: string): Promise<LayoutMarketplaceDetail | undefined>;
}
```

---

### Phase 4: LayoutCatalogContextの更新（不要）

`downloadLayoutFromMarketplace`と`verifyLayoutHash`は既に存在しているため、インターフェース変更は不要。

---

## 📂 影響を受けるファイル

### 修正が必要なファイル

1. ✏️ `packages/suite-base/src/providers/LayoutCatalogProvider.tsx`

   - `downloadLayoutFromMarketplace`の直接実装
   - `verifyLayoutHash`の直接実装
   - `calculateSHA256`ヘルパー関数の追加

2. ✏️ `packages/suite-base/src/providers/LayoutMarketplaceProvider.tsx`

   - `downloadLayout`メソッドの削除
   - `verifyLayoutHash`メソッドの削除
   - `calculateSHA256`ヘルパー関数の削除（LayoutCatalogProviderへ移動）
   - `validateLayoutData`の削除
   - 返却値の更新

3. ✏️ `packages/suite-base/src/context/LayoutMarketplaceContext.ts`
   - `downloadLayout`メソッドの削除
   - `verifyLayoutHash`メソッドの削除
   - ドキュメントコメントの更新

### 影響を受けないファイル

- ✅ `packages/suite-base/src/context/LayoutCatalogContext.ts` - 変更不要
- ✅ `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx` - LayoutCatalogのみを使用
- ✅ その他のUIコンポーネント - 影響なし

---

## 🔍 検証ポイント

### 機能テスト

1. **レイアウトのダウンロード**

   - マーケットプレイスからのレイアウトダウンロードが正常に動作すること
   - ネットワークエラー時のエラーハンドリングが適切であること

2. **ハッシュ検証**

   - SHA256ハッシュ検証が正常に動作すること
   - ハッシュが一致しない場合にエラーが返されること

3. **レイアウトインストール**

   - `installLayoutFromMarketplace`が正常に動作すること
   - 重複インストールの検出が機能すること

4. **レイアウト一覧の取得**
   - `getAvailableLayouts`が正常に動作すること
   - 検索機能が正常に動作すること

### コードレビューポイント

1. **依存関係の確認**

   - LayoutCatalogProviderがLayoutMarketplaceProviderに過度に依存していないこと
   - 循環依存が発生していないこと

2. **エラーハンドリング**

   - すべての非同期処理で適切なエラーハンドリングがされていること
   - エラーメッセージが明確であること

3. **型安全性**
   - TypeScriptの型チェックがすべて通ること
   - `any`型の使用がないこと

---

## 🎯 期待される効果

### メリット

1. **✅ 単一責任原則の遵守**

   - LayoutMarketplaceProvider: マーケットプレースデータの取得のみ
   - LayoutCatalogProvider: ダウンロード、検証、インストールの統合管理

2. **✅ コードの簡潔性**

   - LayoutMarketplaceProviderがExtensionMarketplaceProviderと同じくシンプルに
   - 薄いラッパーメソッドの削除

3. **✅ 保守性の向上**

   - 機能の所在が明確
   - 将来的な拡張が容易

4. **✅ 一貫性の向上**
   - ExtensionとLayoutで同じアーキテクチャパターン
   - チーム全体での理解が容易

### デメリット（考慮事項）

1. **⚠️ LayoutCatalogProviderの責務増加**

   - 対応: 各メソッドの役割を明確にドキュメント化

2. **⚠️ SHA256計算処理の重複**
   - 対応: ヘルパー関数として適切に配置

---

## 📅 実装スケジュール

### 推奨実施順序

1. **Phase 1** (30分)

   - LayoutCatalogProviderの修正
   - calculateSHA256の追加
   - downloadLayoutFromMarketplaceの直接実装
   - verifyLayoutHashの直接実装

2. **Phase 2** (20分)

   - LayoutMarketplaceProviderの簡素化
   - 不要なメソッドとヘルパー関数の削除

3. **Phase 3** (10分)

   - LayoutMarketplaceContextの更新
   - インターフェース定義の修正

4. **Phase 4** (20分)
   - 動作確認とテスト
   - エラーチェック

**合計所要時間: 約1.5時間**

---

## ✅ チェックリスト

### 実装前

- [ ] 現在のコードの動作を確認
- [ ] 関連するテストの実行
- [ ] ブランチの作成

### 実装中

- [ ] Phase 1: LayoutCatalogProviderの修正完了
- [ ] Phase 2: LayoutMarketplaceProviderの簡素化完了
- [ ] Phase 3: LayoutMarketplaceContextの更新完了
- [ ] TypeScriptコンパイルエラーなし
- [ ] ESLintエラーなし

### 実装後

- [ ] マーケットプレイスからのレイアウト一覧取得の動作確認
- [ ] レイアウトダウンロードの動作確認
- [ ] ハッシュ検証の動作確認
- [ ] レイアウトインストールの動作確認
- [ ] エラーケースの動作確認
- [ ] コードレビュー
- [ ] 作業ログの記録
- [ ] コミット

---

## 📚 関連ドキュメント

- [ExtensionMarketplaceProvider実装](../../packages/suite-base/src/providers/ExtensionMarketplaceProvider.tsx)
- [LayoutCatalogProvider実装](../../packages/suite-base/src/providers/LayoutCatalogProvider.tsx)
- [LayoutMarketplaceProvider実装](../../packages/suite-base/src/providers/LayoutMarketplaceProvider.tsx)
- [マーケットプレイス機能 仕様修正作業ログ](../../08_worklogs/2025_10/20251015/20251015_01_remove-layouts-api-and-version-management.md)

---

## 🔄 ロールバック計画

問題が発生した場合:

1. **即座にロールバック**: 修正前のコミットに戻す
2. **問題の特定**: エラーログとスタックトレースの確認
3. **修正と再実装**: 問題箇所を特定して修正
4. **段階的な適用**: Phase単位で適用してテスト

---

## 💡 将来的な改善案

1. **共通ユーティリティの抽出**

   - `calculateSHA256`を`@lichtblick/suite-base/util/crypto`に移動
   - ExtensionとLayoutで共有

2. **検証ロジックの統一**

   - マーケットプレイスアイテムの検証を共通化
   - `MarketplaceItemValidator`のような共通クラスの作成

3. **キャッシュ機構の追加**
   - ダウンロードしたレイアウトのキャッシュ
   - ネットワーク負荷の軽減
