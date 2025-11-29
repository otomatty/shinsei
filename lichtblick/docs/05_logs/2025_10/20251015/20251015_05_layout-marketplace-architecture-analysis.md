# レイアウトマーケットプレイスのアーキテクチャ分析

**作業日**: 2025年10月15日
**作業者**: AI Assistant
**関連Issue**: [拡張機能マーケットプレイスのコード重複問題](../../../issues/open/2025_10/20251015/20251015_05_extension-marketplace-code-duplication.md)

---

## 📋 作業概要

拡張機能マーケットプレイスの重複問題を発見したことを受けて、レイアウトマーケットプレイスの実装を分析しました。結果、レイアウトマーケットプレイスは**理想的なアーキテクチャパターン**で実装されていることが判明しました。

---

## 🎯 分析目的

### 調査項目

1. **役割分担の明確性**: LayoutMarketplaceProviderとLayoutCatalogProviderの役割は明確か？
2. **重複の有無**: URL定義やマーケットプレイス機能の重複はないか？
3. **Single Responsibility**: 各Providerは単一の責任を持っているか？
4. **アーキテクチャの一貫性**: 拡張機能と比較して設計の質は？

---

## 🏗️ レイアウトマーケットプレイスのアーキテクチャ

### 全体構造

```
理想的なアーキテクチャ（実装済み）:

LayoutMarketplaceProvider (データソース層)
├── マーケットプレイスからのデータ取得 ✅
├── レイアウト検索機能 ✅
├── レイアウト詳細情報取得 ✅
└── URL定義: LAYOUTS_JSON_URL ✅

LayoutCatalogProvider (ビジネスロジック層)
├── レイアウトのダウンロード ✅
├── レイアウトのインストール ✅
├── レイアウトのアンインストール ✅
├── データ検証 (構造・内容) ✅
├── セキュリティ検証 (SHA256ハッシュ) ✅
├── 起源情報の管理 ✅
└── LayoutMarketplaceProviderからデータ取得（委譲） ✅

特徴:
✅ 役割が完全に分離
✅ 重複がゼロ
✅ 依存関係が一方向
✅ テストしやすい
✅ 拡張しやすい
```

---

## 🔍 詳細分析

### 1. LayoutMarketplaceProvider の役割

**ファイル**: `packages/suite-base/src/providers/LayoutMarketplaceProvider.tsx`

#### 責任範囲（データソース層）

```typescript
export interface LayoutMarketplace {
  // マーケットプレイスデータの取得のみ
  getAvailableLayouts(): Promise<LayoutMarketplaceDetail[]>;
  searchLayouts(query: string): Promise<LayoutMarketplaceDetail[]>;
  getLayoutDetail(id: string): Promise<LayoutMarketplaceDetail | undefined>;
}
```

**実装の特徴**:

✅ **URL定義が1箇所のみ**:

```typescript
const LAYOUTS_JSON_URL: string =
  typeof LAYOUT_MARKETPLACE_URL !== "undefined" && LAYOUT_MARKETPLACE_URL.length > 0
    ? LAYOUT_MARKETPLACE_URL
    : "http://localhost:3001/layouts/layouts.json";
```

✅ **シンプルなデータ取得**:

```typescript
const getAvailableLayouts = useCallback(async (): Promise<LayoutMarketplaceDetail[]> => {
  const response = await fetch(LAYOUTS_JSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch layouts: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data as LayoutMarketplaceDetail[];
}, []);
```

✅ **検索機能の実装**:

```typescript
const searchLayouts = useCallback(
  async (query: string): Promise<LayoutMarketplaceDetail[]> => {
    const allLayouts = await getAvailableLayouts();
    const searchTerm = query.toLowerCase();

    return allLayouts.filter((layout) => {
      const matchFields = [
        layout.name,
        layout.description,
        layout.author ?? "",
        ...(layout.tags ?? []),
      ];
      return matchFields.some((field) => field.toLowerCase().includes(searchTerm));
    });
  },
  [getAvailableLayouts],
);
```

**評価**: ⭐⭐⭐⭐⭐

- データ取得に特化
- 副作用なし
- シンプルで理解しやすい
- テストが容易

---

### 2. LayoutCatalogProvider の役割

**ファイル**: `packages/suite-base/src/providers/LayoutCatalogProvider.tsx`

#### 責任範囲（ビジネスロジック層）

```typescript
export interface LayoutCatalog {
  // マーケットプレイスからのダウンロード・インストール
  downloadLayoutFromMarketplace: (detail: LayoutMarketplaceDetail) => Promise<LayoutData>;
  installLayoutFromMarketplace: (
    detail: LayoutMarketplaceDetail,
    name?: string,
  ) => Promise<InstallLayoutResult>;

  // インストール済みレイアウトの管理
  getInstalledMarketplaceLayouts: () => Promise<Layout[]>;
  uninstallMarketplaceLayout: (id: LayoutID) => Promise<void>;

  // セキュリティとバリデーション
  validateLayoutData: (data: LayoutData) => Promise<boolean>;
  verifyLayoutHash: (data: LayoutData, expectedHash: string) => Promise<boolean>;

  // 起源情報の管理
  getMarketplaceOrigin: (layoutId: LayoutID) => Promise<MarketplaceOrigin | undefined>;
  markAsMarketplaceLayout: (layoutId: LayoutID, origin: MarketplaceOrigin) => Promise<void>;
}
```

**実装の特徴**:

✅ **セキュリティ検証機能**:

```typescript
async function calculateSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const verifyLayoutHash = useCallback(
  async (data: LayoutData, expectedHash: string): Promise<boolean> => {
    try {
      const dataString = JSON.stringify(data);
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

✅ **データ検証機能**:

```typescript
function validateLayoutDataStructure(data: unknown): data is LayoutData {
  if (typeof data !== "object" || data == undefined) {
    return false;
  }
  const layoutData = data as Record<string, unknown>;
  return (
    layoutData.configById != undefined &&
    layoutData.globalVariables != undefined &&
    layoutData.playbackConfig != undefined &&
    layoutData.userNodes != undefined
  );
}

function validateLayoutDataContent(data: LayoutData): boolean {
  try {
    // パネル設定の検証
    for (const [panelId, config] of Object.entries(data.configById)) {
      if (typeof panelId !== "string" || !panelId.trim()) return false;
      if (typeof config !== "object") return false;
    }
    // グローバル変数の検証
    for (const [varName, varValue] of Object.entries(data.globalVariables)) {
      if (typeof varName !== "string" || !varName.trim()) return false;
      // 型チェック
      if (
        varValue != undefined &&
        typeof varValue !== "string" &&
        typeof varValue !== "number" &&
        typeof varValue !== "boolean"
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
```

✅ **起源情報の管理**:

```typescript
const MARKETPLACE_ORIGINS_KEY = "lichtblick.layout.marketplace.origins";

function getMarketplaceOrigins(): Record<string, MarketplaceOrigin> {
  const stored = localStorage.getItem(MARKETPLACE_ORIGINS_KEY);
  if (stored) {
    return JSON.parse(stored) as Record<string, MarketplaceOrigin>;
  }
  return {};
}

const markAsMarketplaceLayout = useCallback(
  async (layoutId: LayoutID, origin: MarketplaceOrigin): Promise<void> => {
    const origins = getMarketplaceOrigins();
    origins[layoutId] = origin;
    saveMarketplaceOrigins(origins);
  },
  [],
);
```

✅ **インストール処理**:

```typescript
const installLayoutFromMarketplace = useCallback(
  async (detail: LayoutMarketplaceDetail, name?: string): Promise<InstallLayoutResult> => {
    try {
      // 1. 重複インストールチェック
      const allLayouts = await layoutManager.getLayouts();
      const origins = getMarketplaceOrigins();
      const alreadyInstalled = allLayouts.find((layout) => {
        const origin = origins[layout.id];
        return origin?.marketplaceId === detail.id;
      });

      if (alreadyInstalled) {
        return {
          success: false,
          error: new Error(`Layout "${detail.name}" is already installed`),
        };
      }

      // 2. ダウンロード（ハッシュ検証込み）
      const layoutData = await downloadLayoutFromMarketplace(detail);

      // 3. データ検証
      const isValid = await validateLayoutData(layoutData);
      if (!isValid) {
        return {
          success: false,
          error: new Error("Layout data validation failed"),
        };
      }

      // 4. インストール
      const layout = await layoutManager.saveNewLayout({
        name: name ?? detail.name,
        data: layoutData,
        permission: "CREATOR_WRITE",
      });

      // 5. 起源情報の記録
      const origin: MarketplaceOrigin = {
        marketplaceId: detail.id,
        installedAt: new Date().toISOString(),
        originalUrl: detail.layout,
        author: detail.author ?? "",
      };
      await markAsMarketplaceLayout(layout.id, origin);

      return { success: true, layout };
    } catch (error) {
      return { success: false, error };
    }
  },
  [downloadLayoutFromMarketplace, layoutManager, markAsMarketplaceLayout, validateLayoutData],
);
```

**評価**: ⭐⭐⭐⭐⭐

- ビジネスロジックに特化
- セキュリティを重視
- 詳細なエラーハンドリング
- 起源追跡機能

---

## 📊 拡張機能との比較

### アーキテクチャの比較

| 項目                 | レイアウトマーケットプレイス | 拡張機能マーケットプレイス |
| -------------------- | ---------------------------- | -------------------------- |
| **URL定義**          | ✅ 1箇所のみ                 | ❌ 2箇所に重複             |
| **役割分離**         | ✅ 完全に分離                | ❌ 混在している            |
| **データ取得**       | ✅ Marketplaceのみ           | ❌ 両方で実装              |
| **検索機能**         | ✅ Marketplaceで実装         | ❌ Catalogで実装（重複）   |
| **キャッシュ管理**   | ❌ なし（シンプル）          | ❌ Catalogで実装（誤配置） |
| **インストール**     | ✅ Catalogで実装             | ✅ Catalogで実装           |
| **セキュリティ検証** | ✅ Catalogで実装             | ✅ Catalogで実装           |

### 詳細比較

#### URL定義

**レイアウト** ✅:

```typescript
// LayoutMarketplaceProvider.tsx のみ
const LAYOUTS_JSON_URL: string = ...;
```

**拡張機能** ❌:

```typescript
// ExtensionCatalogProvider.tsx
const EXTENSIONS_JSON_URL = ...;

// ExtensionMarketplaceProvider.tsx
const EXTENSIONS_JSON_URL: string = ...;  // 重複！
```

#### マーケットプレイスデータ取得

**レイアウト** ✅:

```typescript
// LayoutMarketplaceProvider のみ
getAvailableLayouts(): Promise<LayoutMarketplaceDetail[]>
```

**拡張機能** ❌:

```typescript
// ExtensionCatalogProvider
getMarketplaceExtensions(): Promise<ExtensionItem[]>

// ExtensionMarketplaceProvider
getAvailableExtensions(): Promise<ExtensionMarketplaceDetail[]>  // 重複！
```

#### 検索機能

**レイアウト** ✅:

```typescript
// LayoutMarketplaceProvider のみ
searchLayouts(query: string): Promise<LayoutMarketplaceDetail[]>
```

**拡張機能** ❌:

```typescript
// ExtensionCatalogProvider のみ
searchMarketplaceExtensions(query: string): Promise<ExtensionItem[]>
// ※ Marketplaceではなく、Catalogに実装されている（誤配置）
```

---

## ✅ レイアウトマーケットプレイスの優れた点

### 1. 完全な責任分離

```
LayoutMarketplaceProvider:
- データ取得のみ
- 副作用なし
- 状態管理なし

LayoutCatalogProvider:
- インストール管理
- セキュリティ検証
- 起源追跡
- LayoutManagerとの統合
```

### 2. 明確な依存関係

```
依存の流れ（一方向）:

LayoutMarketplaceProvider
        ↓ (データ提供)
LayoutCatalogProvider
        ↓ (統合)
Components (LayoutMarketplaceSettings等)
```

### 3. テスト容易性

**LayoutMarketplaceProvider**:

```typescript
// モック不要、fetchのみモック
test('getAvailableLayouts', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ id: '1', name: 'Test Layout', ... }],
  });

  const provider = new LayoutMarketplaceProvider();
  const layouts = await provider.getAvailableLayouts();
  expect(layouts).toHaveLength(1);
});
```

**LayoutCatalogProvider**:

```typescript
// LayoutMarketplaceとLayoutManagerをモック
test("installLayoutFromMarketplace", async () => {
  const mockMarketplace = {
    getAvailableLayouts: jest.fn(),
  };
  const mockLayoutManager = {
    saveNewLayout: jest.fn(),
  };

  // インストールロジックのみテスト可能
});
```

### 4. 拡張性

新しい機能を追加する場合:

**マーケットプレイス機能追加**:

- LayoutMarketplaceProviderのみ変更
- LayoutCatalogProviderは影響を受けない

**インストール処理追加**:

- LayoutCatalogProviderのみ変更
- LayoutMarketplaceProviderは影響を受けない

---

## 💡 拡張機能マーケットプレイスへの適用

### レイアウトのパターンを適用した理想形

```typescript
// ✅ ExtensionMarketplaceProvider: データソース層
export interface ExtensionMarketplace {
  // データ取得のみ
  getAvailableExtensions(): Promise<ExtensionMarketplaceDetail[]>;
  searchExtensions(query: string): Promise<ExtensionMarketplaceDetail[]>;
  getExtensionDetail(id: string): Promise<ExtensionMarketplaceDetail | undefined>;
}

// ✅ ExtensionCatalogProvider: ビジネスロジック層
export type ExtensionCatalog = {
  // インストール管理
  downloadExtension: (url: string) => Promise<Uint8Array>;
  installExtensions: (
    namespace: Namespace,
    extensions: ExtensionData[],
  ) => Promise<InstallExtensionsResult[]>;
  uninstallExtension: (namespace: Namespace, id: string) => Promise<void>;

  // 状態管理
  installedExtensions: ExtensionInfo[] | undefined;
  installedPanels: Record<string, RegisteredPanel> | undefined;
  // ... その他の状態

  // セキュリティ検証
  validateExtensionData: (data: Uint8Array) => Promise<boolean>;
  verifyExtensionHash: (data: Uint8Array, expectedHash: string) => Promise<boolean>;

  // ❌ 削除: マーケットプレイス機能
  // getMarketplaceExtensions
  // searchMarketplaceExtensions
  // marketplaceExtensions
  // marketplaceLoading
  // marketplaceError
};
```

---

## 📚 学んだこと

### 優れたアーキテクチャの特徴

1. **Single Responsibility Principle**

   - 各Providerは単一の役割
   - 変更理由が1つだけ

2. **Separation of Concerns**

   - データ取得とビジネスロジックの分離
   - 状態管理と副作用の分離

3. **依存関係の一方向性**

   - 上位層が下位層に依存
   - 循環依存なし

4. **テスタビリティ**
   - 各層を独立してテスト可能
   - モックが容易

### レイアウトマーケットプレイスの設計判断

#### なぜ状態管理がないのか？

**理由**: シンプルさを優先

```typescript
// ❌ 不要な状態管理（拡張機能の場合）
marketplaceExtensions: ExtensionItem[] | undefined;
marketplaceLoading: boolean;
marketplaceError: string | undefined;

// ✅ シンプルな関数呼び出し（レイアウトの場合）
const layouts = await marketplace.getAvailableLayouts();
```

**メリット**:

- 実装がシンプル
- バグが少ない
- キャッシュの無効化問題がない

**デメリット**:

- 毎回fetchが発生

**結論**: レイアウトは頻繁に取得しないため、シンプルさを優先した設計が適切

#### インストール管理をCatalogに配置した理由

**理由**: ビジネスロジックの複雑性

インストール処理には以下が必要:

- LayoutManagerとの統合
- セキュリティ検証
- 起源情報の管理
- エラーハンドリング

これらはデータ取得とは異なる責任であり、Catalogに配置するのが適切。

---

## 🎓 ベストプラクティス

### Providerの設計原則

1. **データソース層 (Marketplace)**

   - 外部APIとの通信のみ
   - 純粋関数
   - 副作用なし
   - 状態管理なし（オプション）

2. **ビジネスロジック層 (Catalog)**

   - ドメインロジック
   - 状態管理
   - 他のサービスとの統合
   - セキュリティ・検証

3. **プレゼンテーション層 (Components)**
   - UI表示
   - ユーザー操作
   - 両Providerの使用

### URL設定の管理

```typescript
// ✅ 推奨: 共通設定ファイル
// config/marketplace.ts
export const MARKETPLACE_CONFIG = {
  extensionsUrl: getEnvUrl(
    "EXTENSION_MARKETPLACE_URL",
    "http://localhost:3001/extensions/extensions.json",
  ),
  layoutsUrl: getEnvUrl("LAYOUT_MARKETPLACE_URL", "http://localhost:3001/layouts/layouts.json"),
} as const;

function getEnvUrl(envVar: string, defaultUrl: string): string {
  return typeof window !== "undefined" &&
    typeof (window as any)[envVar] !== "undefined" &&
    (window as any)[envVar].length > 0
    ? (window as any)[envVar]
    : defaultUrl;
}
```

---

## 📝 結論

### レイアウトマーケットプレイスの評価

| 項目               | 評価       | コメント                   |
| ------------------ | ---------- | -------------------------- |
| **アーキテクチャ** | ⭐⭐⭐⭐⭐ | 理想的な責任分離           |
| **コード品質**     | ⭐⭐⭐⭐⭐ | 読みやすく保守しやすい     |
| **セキュリティ**   | ⭐⭐⭐⭐⭐ | SHA256検証、データ検証完備 |
| **テスタビリティ** | ⭐⭐⭐⭐⭐ | モックが容易               |
| **拡張性**         | ⭐⭐⭐⭐⭐ | 新機能追加が容易           |
| **ドキュメント**   | ⭐⭐⭐⭐⭐ | 詳細なコメント             |

### 拡張機能マーケットプレイスとの比較

- **レイアウト**: ✅ 理想的なアーキテクチャ（手本となる実装）
- **拡張機能**: ❌ 重複と役割混在（リファクタリングが必要）

### 推奨事項

1. **拡張機能マーケットプレイスのリファクタリング**

   - レイアウトのパターンを適用
   - 重複を排除
   - 役割を明確化

2. **共通パターンのドキュメント化**

   - マーケットプレイスアーキテクチャガイドの作成
   - 新しいマーケットプレイス機能追加時の参考に

3. **定期的なアーキテクチャレビュー**
   - 新機能追加時にパターンを遵守
   - 既存コードのリファクタリング機会を見逃さない

---

## 📚 関連ドキュメント

- [拡張機能マーケットプレイスの重複問題](../../../issues/open/2025_10/20251015/20251015_05_extension-marketplace-code-duplication.md)
- [マーケットプレイスアーキテクチャ統一作業](./20251015_04_unify-marketplace-architecture-pattern.md)
- [AppSettingsDialog実装の違い](../../../issues/open/2025_10/20251015/20251015_01_appsettingsdialog-marketplace-implementation-differences.md)

---

**作業完了日時**: 2025年10月15日
**ステータス**: ✅ 完了

---

## ✨ まとめ

**レイアウトマーケットプレイスは拡張機能マーケットプレイスの手本となる実装です。**

優れた点:

- ✅ 完全な責任分離（Single Responsibility）
- ✅ 重複コードゼロ（DRY原則）
- ✅ 明確な依存関係（一方向）
- ✅ テスト容易性
- ✅ 拡張性

今後の拡張機能マーケットプレイスのリファクタリングでは、このレイアウトマーケットプレイスのパターンを適用すべきです。
