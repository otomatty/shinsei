# マーケットプレイス機能の比較分析レポート

## 実行日時

2025年10月10日

## 概要

拡張機能マーケットプレイス（Extension Marketplace）とレイアウトマーケットプレイス（Layout Marketplace）の実装を詳細に比較し、アーキテクチャと機能の違いを分析しました。

---

## 1. アーキテクチャ比較

### 1.1 全体構造

両マーケットプレイスは、以下の3層アーキテクチャを採用:

```
┌─────────────────────────────────────┐
│   UI Components (Settings)          │ ← ユーザーインターフェース
├─────────────────────────────────────┤
│   Catalog Provider                  │ ← ビジネスロジック層
├─────────────────────────────────────┤
│   Marketplace Provider              │ ← データ取得層
└─────────────────────────────────────┘
```

### 1.2 プロバイダー構成

#### 拡張機能マーケットプレイス

```typescript
ExtensionMarketplaceProvider     // データ取得のみ
  ↓
ExtensionCatalogProvider         // インストール管理
  ↓
ExtensionMarketplaceSettings     // UI
```

#### レイアウトマーケットプレイス

```typescript
LayoutMarketplaceProvider        // データ取得のみ
  ↓
LayoutCatalogProvider            // インストール管理
  ↓
LayoutMarketplaceSettings        // UI
```

**共通点**: 両者とも同じ階層構造を持つ

---

## 2. Marketplace Provider の違い

### 2.1 ExtensionMarketplaceProvider

**ファイル**: `packages/suite-base/src/providers/ExtensionMarketplaceProvider.tsx`

#### データソース

```typescript
const EXTENSIONS_JSON_URL =
  EXTENSION_MARKETPLACE_URL || "http://localhost:3001/extensions/extensions.json";
```

#### データ構造（入力）

```json
{
  "id": "publisher.extension-name",
  "name": "Extension Name",
  "publisher": "Publisher Name",
  "versions": {
    "v1.0.0": {
      "version": "v1.0.0",
      "publishedDate": "2025-10-04T01:21:25Z",
      "sha256sum": "...",
      "foxe": "https://.../.../extension.foxe"
    },
    "v1.1.0": { ... }
  }
}
```

#### データ変換処理

**重要な特徴**: **バージョンをフラット化する**

```typescript
const flattenedExtensions: ExtensionMarketplaceDetail[] = [];
for (const ext of rawExtensions) {
  const versions = ext.versions ?? {};
  for (const [versionKey, versionData] of Object.entries(versions)) {
    flattenedExtensions.push({
      id: ext.id,
      version: versionData.version,
      foxe: versionData.foxe,
      // ... その他のフィールド
    });
  }
}
```

**結果**: 1つの拡張機能エントリから複数のバージョン付きエントリを生成

#### 提供するAPI

```typescript
interface ExtensionMarketplace {
  getAvailableExtensions(): Promise<ExtensionMarketplaceDetail[]>;
  getMarkdown(url: string): Promise<string>;
}
```

**機能数**: 2つのみ（シンプル）

---

### 2.2 LayoutMarketplaceProvider

**ファイル**: `packages/suite-base/src/providers/LayoutMarketplaceProvider.tsx`

#### データソース

```typescript
const LAYOUTS_JSON_URL = LAYOUT_MARKETPLACE_URL || "http://localhost:3001/layouts/layouts.json";
```

#### データ構造（入力）

```json
{
  "id": "layout-id",
  "name": "Layout Name",
  "author": "Publisher Name",
  "layout": "http://localhost:3001/layouts/layout-file.json"
}
```

#### データ変換処理

**特徴**: **そのまま返す**（フラット化不要）

```typescript
const getAvailableLayouts = useCallback(async () => {
  const response = await fetch(LAYOUTS_JSON_URL);
  const data = await response.json();
  return data as LayoutMarketplaceDetail[];
}, []);
```

#### 提供するAPI

```typescript
interface LayoutMarketplace {
  getAvailableLayouts(): Promise<LayoutMarketplaceDetail[]>;
  searchLayouts(query: string): Promise<LayoutMarketplaceDetail[]>;
  getLayoutDetail(id: string): Promise<LayoutMarketplaceDetail | undefined>;
  downloadLayout(url: string): Promise<LayoutData>;
  getMarkdown(url: string): Promise<string>;
  verifyLayoutHash(data: LayoutData, expectedHash: string): Promise<boolean>;
}
```

**機能数**: 6つ（拡張機能より多機能）

---

## 3. 主要な違い

### 3.1 バージョン管理

| 項目                     | 拡張機能                                   | レイアウト         |
| ------------------------ | ------------------------------------------ | ------------------ |
| **バージョン情報の格納** | `versions` オブジェクト内                  | 単一のメタデータ   |
| **データ変換**           | フラット化して各バージョンを個別エントリに | そのまま使用       |
| **バージョン選択**       | UI側で複数バージョンから選択               | バージョン概念なし |

#### 拡張機能のバージョン管理の理由

1. **互換性の問題**: 異なるバージョンで動作が変わる可能性
2. **依存関係の管理**: アプリケーションバージョンとの互換性
3. **ダウングレード対応**: 古いバージョンへの切り替えが必要な場合

#### レイアウトでバージョン管理が不要な理由

1. **データのみ**: 実行コードを含まない
2. **シンプルな構造**: JSONファイルのみ
3. **互換性が高い**: レイアウト構造の変更が少ない

---

### 3.2 セキュリティ機能

| 項目                     | 拡張機能                   | レイアウト                          |
| ------------------------ | -------------------------- | ----------------------------------- |
| **SHA256検証**           | メタデータに含む           | ✅ 実装済み（`verifyLayoutHash`）   |
| **データバリデーション** | 拡張ローダー内で実施       | ✅ 実装済み（`validateLayoutData`） |
| **実行コード**           | あり（サンドボックス実行） | なし（データのみ）                  |

#### レイアウトのセキュリティ実装

```typescript
// SHA256ハッシュ計算
async function calculateSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// データバリデーション
function validateLayoutData(data: unknown): data is LayoutData {
  if (typeof data !== "object" || data == undefined) {
    return false;
  }
  const layoutData = data as Record<string, unknown>;
  return (
    typeof layoutData.configById === "object" &&
    typeof layoutData.globalVariables === "object" &&
    typeof layoutData.playbackConfig === "object" &&
    typeof layoutData.userNodes === "object"
  );
}
```

拡張機能には**これらの機能が実装されていない**（ExtensionMarketplaceProviderレベルでは）

---

### 3.3 検索機能

| 項目                 | 拡張機能                | レイアウト                      |
| -------------------- | ----------------------- | ------------------------------- |
| **Provider内の検索** | なし                    | ✅ あり（`searchLayouts`）      |
| **検索実装場所**     | UI層（Settings）        | Provider層                      |
| **検索対象**         | name, description, tags | name, description, author, tags |

#### レイアウトの検索実装

```typescript
const searchLayouts = useCallback(
  async (query: string): Promise<LayoutMarketplaceDetail[]> => {
    if (!query.trim()) {
      return await getAvailableLayouts();
    }

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

拡張機能の検索は**UI層で実装**されている（`ExtensionMarketplaceSettings.tsx`）

---

### 3.4 ダウンロード機能

| 項目                         | 拡張機能          | レイアウト                  |
| ---------------------------- | ----------------- | --------------------------- |
| **Provider内のダウンロード** | なし              | ✅ あり（`downloadLayout`） |
| **ダウンロード実装場所**     | Catalog層         | Provider層                  |
| **ファイル形式**             | `.foxe` (zip形式) | `.json`                     |
| **検証**                     | Catalog層で実施   | Provider層で実施            |

#### レイアウトのダウンロード実装

```typescript
const downloadLayout = useCallback(async (url: string): Promise<LayoutData> => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download layout: ${res.status}`);
    }

    const data = await res.json();

    if (!validateLayoutData(data)) {
      throw new Error("Invalid layout data format");
    }

    return data;
  } catch (error) {
    console.error(`Error downloading layout from ${url}:`, error);
    throw error;
  }
}, []);
```

拡張機能のダウンロードは**ExtensionCatalogProviderで実装**

---

## 4. Catalog Provider の違い

### 4.1 ExtensionCatalogProvider

**ファイル**: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`

#### 主要機能

```typescript
interface ExtensionCatalog {
  // 基本CRUD
  downloadExtension: (namespace: string, url: string) => Promise<Uint8Array>;
  installExtensions: (namespace: string, data: Uint8Array[]) => Promise<InstallResult[]>;
  uninstallExtension: (namespace: string, id: string) => Promise<void>;

  // 状態管理
  installedExtensions: ExtensionInfo[];
  isExtensionInstalled: (id: string) => boolean;

  // マーケットプレイス統合
  marketplaceExtensions: ExtensionMarketplaceDetail[];
  refreshAllExtensions: () => Promise<void>;
}
```

#### 特徴

- **複雑な状態管理**: Zustandを使用
- **マルチローダー対応**: 複数の拡張ソースをサポート
- **実行環境管理**: サンドボックス実行

---

### 4.2 LayoutCatalogProvider

**ファイル**: `packages/suite-base/src/providers/LayoutCatalogProvider.tsx`

#### 主要機能

```typescript
interface LayoutCatalog {
  // ダウンロード・インストール
  downloadLayoutFromMarketplace: (detail: LayoutMarketplaceDetail) => Promise<LayoutData>;
  installLayoutFromMarketplace: (
    detail: LayoutMarketplaceDetail,
    name?: string,
  ) => Promise<InstallLayoutResult>;

  // 更新・削除
  updateMarketplaceLayout: (
    layoutId: LayoutID,
    newDetail: LayoutMarketplaceDetail,
  ) => Promise<InstallLayoutResult>;
  uninstallMarketplaceLayout: (id: LayoutID) => Promise<void>;

  // 起源管理
  getMarketplaceOrigin: (id: LayoutID) => Promise<MarketplaceOrigin | undefined>;
  markAsMarketplaceLayout: (id: LayoutID, origin: MarketplaceOrigin) => Promise<void>;

  // バリデーション
  validateLayoutData: (data: unknown) => Promise<boolean>;
  verifyLayoutHash: (data: LayoutData, expectedHash: string) => Promise<boolean>;
}
```

#### 特徴

- **起源追跡**: マーケットプレイス由来のレイアウトを記録
- **更新管理**: 既存レイアウトの更新をサポート
- **ローカルストレージ**: LocalStorageで起源情報を管理

---

## 5. 起源管理（Origin Tracking）

### 5.1 レイアウトの起源管理

**実装**: LayoutCatalogProviderで完全実装

```typescript
export interface MarketplaceOrigin {
  marketplaceId: string; // マーケットプレイスID
  installedAt: string; // インストール日時
  version?: string; // バージョン
  originalUrl: string; // 元のURL
}

// LocalStorageに保存
const MARKETPLACE_ORIGINS_KEY = "marketplace-layout-origins";

function saveMarketplaceOrigins(origins: Record<string, MarketplaceOrigin>): void {
  localStorage.setItem(MARKETPLACE_ORIGINS_KEY, JSON.stringify(origins));
}

function getMarketplaceOrigins(): Record<string, MarketplaceOrigin> {
  const stored = localStorage.getItem(MARKETPLACE_ORIGINS_KEY);
  if (!stored) return {};
  return JSON.parse(stored);
}
```

#### 起源管理の利点

1. **更新通知**: マーケットプレイスの新バージョンを検出可能
2. **アンインストール管理**: マーケットプレイス由来のレイアウトのみ削除
3. **来歴追跡**: どこからインストールされたかを記録

---

### 5.2 拡張機能の起源管理

**状況**: **未実装**

拡張機能には起源追跡機能がありません。そのため:

- どのマーケットプレイスからインストールされたか不明
- 更新通知が困難
- バージョン管理が複雑

---

## 6. データフロー比較

### 6.1 拡張機能のインストールフロー

```
User clicks "Install"
  ↓
ExtensionMarketplaceSettings (UI)
  ↓
useExtensionCatalog().downloadExtension(url)  // ← Catalog層
  ↓
fetch(url) // .foxeファイルをダウンロード
  ↓
useExtensionCatalog().installExtensions(data)
  ↓
ExtensionLoader.installExtension()
  ↓
IndexedDBに保存
```

**特徴**:

- Marketplace Providerを経由しない
- Catalogが直接fetch

---

### 6.2 レイアウトのインストールフロー

```
User clicks "Install"
  ↓
LayoutMarketplaceSettings (UI)
  ↓
useLayoutCatalog().installLayoutFromMarketplace(detail)  // ← Catalog層
  ↓
useLayoutMarketplace().downloadLayout(url)  // ← Marketplace層
  ↓
fetch(url) // .jsonファイルをダウンロード
  ↓
validateLayoutData(data)
  ↓
layoutManager.saveNewLayout(data)
  ↓
markAsMarketplaceLayout(id, origin)  // 起源を記録
  ↓
IndexedDBに保存
```

**特徴**:

- Marketplace Providerを経由
- 起源情報を記録
- バリデーション実施

---

## 7. 環境変数の使用

### 7.1 拡張機能

```typescript
const EXTENSIONS_JSON_URL =
  typeof EXTENSION_MARKETPLACE_URL !== "undefined" && EXTENSION_MARKETPLACE_URL.length > 0
    ? EXTENSION_MARKETPLACE_URL
    : "http://localhost:3001/extensions/extensions.json";
```

### 7.2 レイアウト

```typescript
const LAYOUTS_JSON_URL =
  typeof LAYOUT_MARKETPLACE_URL !== "undefined" && LAYOUT_MARKETPLACE_URL.length > 0
    ? LAYOUT_MARKETPLACE_URL
    : "http://localhost:3001/layouts/layouts.json";
```

**共通点**: 両者とも同じパターンで環境変数を使用

---

## 8. エラーハンドリングの違い

### 8.1 拡張機能

```typescript
// シンプルなエラー処理
const getAvailableExtensions = async () => {
  const response = await fetch(EXTENSIONS_JSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return await response.json();
};
```

### 8.2 レイアウト

```typescript
// 詳細なエラー処理とログ
const downloadLayout = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (!validateLayoutData(data)) {
      throw new Error("Invalid layout data format");
    }
    return data;
  } catch (error) {
    console.error(`Error downloading layout from ${url}:`, error);
    throw error;
  }
};
```

**違い**: レイアウトの方が詳細なエラーログとバリデーションを実施

---

## 9. まとめ

### 9.1 共通点

1. **3層アーキテクチャ**: Marketplace → Catalog → UI
2. **Provider パターン**: React Contextを使用
3. **環境変数対応**: カスタマイズ可能なマーケットプレイスURL
4. **Markdown対応**: README等のドキュメント表示

### 9.2 主な違い

| 項目                 | 拡張機能              | レイアウト            |
| -------------------- | --------------------- | --------------------- |
| **バージョン管理**   | ✅ 複数バージョン対応 | ❌ 単一バージョンのみ |
| **データ変換**       | ✅ フラット化処理     | ❌ そのまま使用       |
| **検索機能**         | UI層で実装            | Provider層で実装      |
| **ダウンロード機能** | Catalog層で実装       | Provider層で実装      |
| **セキュリティ検証** | Catalog層で実装       | ✅ Provider層で実装   |
| **起源管理**         | ❌ 未実装             | ✅ 完全実装           |
| **更新機能**         | 再インストール        | ✅ 更新API提供        |
| **データ形式**       | `.foxe` (zip)         | `.json`               |
| **実行コード**       | ✅ あり               | ❌ なし               |

### 9.3 設計哲学の違い

#### 拡張機能マーケットプレイス

- **複雑性重視**: 実行コード、サンドボックス、バージョン管理
- **機能最小化**: Marketplace Providerはデータ取得のみ
- **責任分散**: 機能をCatalog層に委譲

#### レイアウトマーケットプレイス

- **シンプル性重視**: データのみ、実行コード不要
- **機能統合**: Marketplace Providerが多機能
- **セキュリティ重視**: 検証機能を統合

---

## 10. 推奨される改善点

### 10.1 拡張機能マーケットプレイスの改善

1. **起源管理の追加**

   - マーケットプレイス由来の拡張機能を追跡
   - 更新通知機能の実装

2. **セキュリティ機能の強化**

   - SHA256検証をProvider層に追加
   - ダウンロード時の検証を強化

3. **検索機能の移行**
   - UI層からProvider層に移動
   - レイアウトと同じパターンに統一

### 10.2 レイアウトマーケットプレイスの改善

1. **バージョン管理の検討**

   - 将来的にバージョン管理が必要になる可能性
   - 拡張機能と同じパターンの導入を検討

2. **リモート同期対応**
   - 起源情報のリモートサーバー同期
   - マルチデバイス対応

---

## 11. 次のステップ

1. **統一APIの設計**

   - 両マーケットプレイスで共通のインターフェース
   - 再利用可能なコンポーネント

2. **セキュリティ監査**

   - 両マーケットプレイスのセキュリティ検証
   - 脆弱性の洗い出し

3. **パフォーマンス最適化**

   - キャッシュ戦略の統一
   - ネットワークリクエストの最適化

4. **ドキュメント整備**
   - 両マーケットプレイスの統一ドキュメント
   - 開発者向けガイドの作成
