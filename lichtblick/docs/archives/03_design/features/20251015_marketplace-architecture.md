# マーケットプレイス機能アーキテクチャ

**作成日**: 2025年10月15日
**最終更新**: 2025年10月15日
**ステータス**: 実装完了

## 📋 目次

1. [概要](#概要)
2. [アーキテクチャパターン](#アーキテクチャパターン)
3. [コンポーネント構成](#コンポーネント構成)
4. [データフロー](#データフロー)
5. [実装詳細](#実装詳細)
6. [セキュリティ](#セキュリティ)
7. [拡張性](#拡張性)

---

## 概要

### 目的

Lichtblickのマーケットプレイス機能は、以下の2つの主要な機能を提供します:

1. **Extension Marketplace**: カスタム拡張機能の配信・インストール
2. **Layout Marketplace**: 事前定義されたレイアウトの配信・インストール

### 設計原則

- **単一責任原則**: 各Providerは明確に分離された責務を持つ
- **一貫性**: ExtensionとLayoutで同じアーキテクチャパターンを使用
- **セキュリティ**: SHA256ハッシュによる改ざん検出
- **保守性**: 機能の所在が明確で、将来的な拡張が容易

---

## アーキテクチャパターン

### 2層Provider構造

マーケットプレイス機能は、以下の2層構造で実装されています:

```
┌─────────────────────────────────────────────────────┐
│                   UI Components                      │
│    (LayoutMarketplaceSettings, ExtensionMarketplaceSettings)   │
└─────────────────────────────────────────────────────┘
                         │
                         │ useLayoutMarketplace()
                         │ useLayoutCatalog()
                         │ useExtensionMarketplace()
                         │ useExtensionCatalog()
                         ↓
┌─────────────────────────────────────────────────────┐
│              Marketplace Layer (Layer 1)             │
│     データ取得専用 - マーケットプレースAPIとの通信     │
├─────────────────────────────────────────────────────┤
│  LayoutMarketplaceProvider | ExtensionMarketplaceProvider │
│  - getAvailableLayouts()   | - getAvailableExtensions()  │
│  - searchLayouts()         | - searchExtensions()        │
│  - getLayoutDetail()       | - getExtensionDetail()      │
└─────────────────────────────────────────────────────┘
                         │
                         │ JSON API
                         ↓
┌─────────────────────────────────────────────────────┐
│           Catalog Layer (Layer 2)                    │
│  インストール・管理専用 - ローカル状態管理とインストール処理 │
├─────────────────────────────────────────────────────┤
│   LayoutCatalogProvider    | ExtensionCatalogProvider    │
│   - downloadLayout()       | - downloadExtension()       │
│   - verifyHash()           | - verifyHash()              │
│   - installLayout()        | - installExtension()        │
│   - uninstallLayout()      | - uninstallExtension()      │
│   - getInstalled()         | - getInstalled()            │
└─────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────┐
│              Local Storage / State                   │
│         (起源情報、インストール済みアイテム)              │
└─────────────────────────────────────────────────────┘
```

### 責務の分離

| Layer                 | 責務                                                                                               | 依存関係                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Marketplace Layer** | - マーケットプレイスデータの取得<br>- 検索・フィルタリング<br>- アイテム詳細の提供                 | - 外部API<br>- ネットワーク                                                               |
| **Catalog Layer**     | - ダウンロード・検証<br>- インストール・アンインストール<br>- ローカル状態管理<br>- 起源情報の記録 | - LayoutManager/ExtensionLoader<br>- LocalStorage<br>- Marketplace Layer (データ取得のみ) |

---

## コンポーネント構成

### 1. Layout Marketplace

#### 1.1 Context & Provider

**ファイル構成**:

```
packages/suite-base/src/
├── context/
│   ├── LayoutMarketplaceContext.ts    # インターフェース定義
│   └── LayoutCatalogContext.ts        # インターフェース定義
└── providers/
    ├── LayoutMarketplaceProvider.tsx  # データ取得
    └── LayoutCatalogProvider.tsx      # インストール管理
```

**LayoutMarketplaceContext**:

```typescript
export interface LayoutMarketplace {
  getAvailableLayouts(): Promise<LayoutMarketplaceDetail[]>;
  searchLayouts(query: string): Promise<LayoutMarketplaceDetail[]>;
  getLayoutDetail(id: string): Promise<LayoutMarketplaceDetail | undefined>;
}

export type LayoutMarketplaceDetail = {
  id: string;
  name: string;
  description: string;
  author?: string;
  tags?: string[];
  thumbnail?: string;
  layout: string; // レイアウトファイルのURL
  sha256sum?: string; // セキュリティ検証用
  license?: string;
  homepage?: string;
};
```

**LayoutCatalogContext**:

```typescript
export interface LayoutCatalog {
  // ダウンロード・検証
  downloadLayoutFromMarketplace(detail: LayoutMarketplaceDetail): Promise<LayoutData>;
  verifyLayoutHash(data: LayoutData, expectedHash: string): Promise<boolean>;
  validateLayoutData(data: LayoutData): Promise<boolean>;

  // インストール・管理
  installLayoutFromMarketplace(
    detail: LayoutMarketplaceDetail,
    name?: string,
  ): Promise<InstallLayoutResult>;
  uninstallMarketplaceLayout(id: LayoutID): Promise<void>;
  getInstalledMarketplaceLayouts(): Promise<Layout[]>;

  // 起源管理
  getMarketplaceOrigin(layoutId: LayoutID): Promise<MarketplaceOrigin | undefined>;
  markAsMarketplaceLayout(layoutId: LayoutID, origin: MarketplaceOrigin): Promise<void>;
}

export type InstallLayoutResult = {
  success: boolean;
  layout?: Layout;
  error?: unknown;
};

export type MarketplaceOrigin = {
  marketplaceId: string;
  installedAt: string;
  originalUrl: string;
  author: string;
};
```

#### 1.2 実装の特徴

**LayoutMarketplaceProvider** (シンプル):

- マーケットプレイスAPIからのJSON取得
- クライアントサイドでの検索・フィルタリング
- 状態を持たない純粋なデータフェッチ層

**LayoutCatalogProvider** (統合管理):

- レイアウトのダウンロード (fetch経由)
- SHA256ハッシュ検証
- データ構造・内容のバリデーション
- 重複インストールの検出
- 起源情報のLocalStorage管理
- LayoutManagerとの連携

### 2. Extension Marketplace

#### 2.1 Context & Provider

**ファイル構成**:

```
packages/suite-base/src/
├── context/
│   ├── ExtensionMarketplaceContext.tsx  # インターフェース定義
│   └── ExtensionCatalogContext.ts       # インターフェース定義
└── providers/
    ├── ExtensionMarketplaceProvider.tsx # データ取得
    └── ExtensionCatalogProvider.tsx     # インストール管理
```

**ExtensionMarketplaceContext**:

```typescript
export interface ExtensionMarketplace {
  getAvailableExtensions(): Promise<ExtensionMarketplaceDetail[]>;
  getMarkdown(url: string): Promise<string>;
}

export type ExtensionMarketplaceDetail = {
  id: string;
  name: string;
  qualifiedName: string;
  description: string;
  publisher: string;
  homepage: string;
  license: string;
  version: string;
  keywords: string[];
  foxe: string; // 拡張機能ファイルのURL
  readme: string; // READMEのURL
  changelog: string; // CHANGELOGのURL
  sha256sum?: string; // セキュリティ検証用
};
```

**ExtensionCatalogContext**:

```typescript
export interface ExtensionCatalog {
  // ダウンロード・検証
  downloadExtension(detail: ExtensionMarketplaceDetail): Promise<Uint8Array>;

  // インストール・管理
  installExtension(foxeFileData: Uint8Array, detail: ExtensionMarketplaceDetail): Promise<string>;
  uninstallExtension(id: string): Promise<void>;

  // バージョン管理
  getInstalledVersion(namespace: string, extensionName: string): string | undefined;

  // 更新管理
  checkForUpdates(): Promise<void>;
}
```

### 3. 共通UIコンポーネント

#### 3.1 ファイル構成

```
packages/suite-base/src/components/shared/Marketplace/
├── card/
│   └── MarketplaceCard/
│       ├── MarketplaceCard.tsx        # アイテムカード
│       └── MarketplaceCard.style.ts
├── layouts/
│   ├── MarketplaceGrid/
│   │   ├── MarketplaceGrid.tsx        # グリッドレイアウト
│   │   └── MarketplaceGrid.style.ts
│   ├── MarketplaceHeader/
│   │   ├── MarketplaceHeader.tsx      # ヘッダー
│   │   ├── MarketplaceHeader.style.ts
│   │   └── MarketplaceTitleSection/
│   │       ├── MarketplaceTitleSection.tsx
│   │       └── MarketplaceTitleSection.style.ts
│   └── MarketplaceDetailBase/
│       ├── MarketplaceDetailBase.tsx  # 詳細ページベース
│       └── MarketplaceDetailBase.style.ts
└── hooks/
    └── useMarketplaceSearch.ts        # 統一された検索ロジック
```

#### 3.2 主要コンポーネント

**MarketplaceCard**:

- アイテムのサムネイル表示
- インストール状態の表示
- アクションボタン (Install/Uninstall)
- タグ表示
- 作成者情報

**MarketplaceGrid**:

- レスポンシブなグリッドレイアウト
- 動的なカラム調整
- LazyLoadのサポート

**MarketplaceHeader**:

- 検索バー
- タグフィルター
- タブ切り替え (All/Installed)
- ソート機能

**MarketplaceDetailBase**:

- 詳細情報の表示
- README/CHANGELOGの表示
- インストールボタン
- メタデータ表示

### 4. カスタムフック

#### 4.1 useMarketplaceSearch

**目的**: ExtensionとLayoutで統一された検索・フィルタリングロジックを提供

**ファイル**: `packages/suite-base/src/components/shared/Marketplace/hooks/useMarketplaceSearch.ts`

**機能**:

- テキスト検索 (名前、説明、タグ、作成者)
- タグフィルタリング (AND/OR mode)
- タブ切り替え (All/Installed)
- 検索サジェスト
- タグ統計情報
- 高度な検索オプション

**使用例**:

```typescript
const {
  searchQuery,
  setSearchQuery,
  selectedTags,
  setSelectedTags,
  activeTab,
  setActiveTab,
  filteredItems,
  tagStats,
  searchSuggestions,
} = useMarketplaceSearch({
  items: layouts,
  enableSuggestions: true,
  maxSuggestions: 15,
});
```

#### 4.2 useInstallingLayoutsState

**目的**: レイアウトのバッチインストールと進捗管理

**ファイル**: `packages/suite-base/src/hooks/useInstallingLayoutsState.tsx`

**機能**:

- 複数レイアウトの一括インストール
- 進捗状態の追跡
- 成功・失敗通知
- エラーハンドリング

#### 4.3 useMarketplaceActions

**目的**: マーケットプレイス操作の共通ロジック

**ファイル**: `packages/suite-base/src/hooks/marketplace/useMarketplaceActions.ts`

**機能**:

- 非同期操作の実行
- エラーハンドリング
- ステータス管理
- リトライロジック

---

## データフロー

### 1. レイアウトインストールフロー

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ユーザーアクション                                              │
│    LayoutMarketplaceSettings.tsx                                 │
│    - "Install" ボタンクリック                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. インストールフック                                              │
│    useInstallingLayoutsState.tsx                                 │
│    - installLayouts([{detail, name}])                           │
│    - 進捗管理の開始                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. カタログ層                                                      │
│    LayoutCatalogProvider                                         │
│    ├─ installLayoutFromMarketplace(detail, name)                │
│    ├─ 重複チェック                                                │
│    ├─ downloadLayoutFromMarketplace(detail)                     │
│    │   ├─ fetch(detail.layout)                                  │
│    │   ├─ validateLayoutDataStructure()                         │
│    │   └─ verifyLayoutHash() (if sha256sum available)          │
│    ├─ validateLayoutData()                                      │
│    ├─ layoutManager.saveNewLayout()                             │
│    └─ markAsMarketplaceLayout() - LocalStorage                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. 通知・UI更新                                                    │
│    - Success/Error スナックバー                                   │
│    - インストール済み状態の更新                                     │
│    - リスト再読み込み                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2. 拡張機能インストールフロー

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ユーザーアクション                                              │
│    ExtensionMarketplace.tsx                                      │
│    - "Install" ボタンクリック                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. カタログ層                                                      │
│    ExtensionCatalogProvider                                      │
│    ├─ downloadExtension(detail)                                 │
│    │   ├─ fetch(detail.foxe)                                    │
│    │   └─ verifyHash() (if sha256sum available)                │
│    ├─ installExtension(foxeFileData, detail)                    │
│    │   ├─ ExtensionLoader.installExtension()                    │
│    │   └─ バージョン情報の記録                                    │
│    └─ 起源情報の記録 - LocalStorage                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. 通知・UI更新                                                    │
│    - Success/Error ダイアログ                                     │
│    - インストール済み状態の更新                                     │
│    - リスト再読み込み                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 3. 検索・フィルタリングフロー

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ユーザー入力                                                    │
│    MarketplaceHeader                                             │
│    - 検索クエリ入力                                               │
│    - タグ選択                                                     │
│    - タブ切り替え                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. 検索ロジック                                                    │
│    useMarketplaceSearch                                          │
│    ├─ テキスト検索                                                │
│    │   ├─ name.includes(query)                                  │
│    │   ├─ description.includes(query)                           │
│    │   ├─ tags.includes(query)                                  │
│    │   └─ author.includes(query)                                │
│    ├─ タグフィルタリング                                          │
│    │   ├─ AND mode: すべてのタグが一致                            │
│    │   └─ OR mode: いずれかのタグが一致                           │
│    └─ タブフィルタリング                                          │
│        ├─ All: すべて表示                                         │
│        └─ Installed: インストール済みのみ                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. 結果表示                                                        │
│    MarketplaceGrid                                               │
│    - filteredItems を MarketplaceCard で表示                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 実装詳細

### 1. セキュリティ実装

#### SHA256ハッシュ検証

**目的**: ダウンロードしたファイルの改ざん検出

**実装**:

```typescript
async function calculateSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyLayoutHash(data: LayoutData, expectedHash: string): Promise<boolean> {
  const dataString = JSON.stringify(data);
  if (dataString == undefined) {
    throw new Error("Failed to serialize layout data");
  }
  const actualHash = await calculateSHA256(dataString);
  return actualHash === expectedHash.toLowerCase();
}
```

**使用箇所**:

- LayoutCatalogProvider: レイアウトダウンロード時
- ExtensionCatalogProvider: 拡張機能ダウンロード時

#### データバリデーション

**レイアウトデータの構造検証**:

```typescript
function validateLayoutDataStructure(data: unknown): data is LayoutData {
  if (typeof data !== "object" || data == undefined) {
    return false;
  }

  const layoutData = data as Record<string, unknown>;

  return (
    layoutData.configById != undefined &&
    typeof layoutData.configById === "object" &&
    layoutData.globalVariables != undefined &&
    typeof layoutData.globalVariables === "object" &&
    layoutData.playbackConfig != undefined &&
    typeof layoutData.playbackConfig === "object" &&
    layoutData.userNodes != undefined &&
    typeof layoutData.userNodes === "object"
  );
}
```

**レイアウトデータの内容検証**:

```typescript
function validateLayoutDataContent(data: LayoutData): boolean {
  try {
    // パネル設定の検証
    for (const [panelId, config] of Object.entries(data.configById)) {
      if (typeof panelId !== "string" || !panelId.trim()) {
        return false;
      }
      if (typeof config !== "object") {
        return false;
      }
    }

    // グローバル変数の検証
    for (const [varName, varValue] of Object.entries(data.globalVariables)) {
      if (typeof varName !== "string" || !varName.trim()) {
        return false;
      }
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

### 2. 起源情報管理

**目的**: マーケットプレイスからインストールされたアイテムの追跡

**LocalStorageキー**:

- Layouts: `lichtblick.layout.marketplace.origins`
- Extensions: `lichtblick.extension.marketplace.origins`

**データ構造**:

```typescript
// Layouts
type LayoutOrigins = Record<LayoutID, MarketplaceOrigin>;

type MarketplaceOrigin = {
  marketplaceId: string;
  installedAt: string;
  originalUrl: string;
  author: string;
};

// Extensions
type ExtensionOrigins = Record<ExtensionID, ExtensionMarketplaceOrigin>;

type ExtensionMarketplaceOrigin = {
  marketplaceId: string;
  version: string;
  installedAt: string;
  originalUrl: string;
};
```

**実装**:

```typescript
// 取得
function getMarketplaceOrigins(): Record<string, MarketplaceOrigin> {
  try {
    const stored = localStorage.getItem(MARKETPLACE_ORIGINS_KEY);
    if (stored) {
      return JSON.parse(stored) as Record<string, MarketplaceOrigin>;
    }
  } catch (error) {
    console.warn("Failed to load marketplace origins:", error);
  }
  return {};
}

// 保存
function saveMarketplaceOrigins(origins: Record<string, MarketplaceOrigin>): void {
  try {
    const serialized = JSON.stringify(origins);
    if (serialized != undefined) {
      localStorage.setItem(MARKETPLACE_ORIGINS_KEY, serialized);
    }
  } catch (error) {
    console.warn("Failed to save marketplace origins:", error);
  }
}
```

### 3. エラーハンドリング

**階層的なエラーハンドリング**:

```
Layer 1: Provider Level
├─ try-catch でエラーをキャッチ
├─ console.error でログ記録
└─ エラーオブジェクトを上位に伝播

Layer 2: Hook Level
├─ Providerからのエラーをキャッチ
├─ ユーザーフレンドリーなメッセージに変換
└─ スナックバー通知

Layer 3: Component Level
├─ エラー状態の表示
├─ リトライボタンの提供
└─ フォールバックUI
```

**実装例**:

```typescript
// Provider Level
const downloadLayoutFromMarketplace = useCallback(
  async (detail: LayoutMarketplaceDetail): Promise<LayoutData> => {
    try {
      const response = await fetch(detail.layout);
      if (!response.ok) {
        throw new Error(`Failed to download layout: ${response.status}`);
      }
      // ...
    } catch (error) {
      console.error(`Error downloading layout ${detail.id}:`, error);
      throw error; // 上位に伝播
    }
  },
  [verifyLayoutHash],
);

// Hook Level
const installLayouts = useCallback(
  async (layoutsData: LayoutInstallData[]): Promise<LayoutInstallResult[]> => {
    // ...
    try {
      const result = await installLayoutFromMarketplace(detail, name);
      if (result.success) {
        enqueueSnackbar("Installation successful", { variant: "success" });
      } else {
        const errorMessage =
          result.error instanceof Error ? result.error.message : "Installation failed";
        enqueueSnackbar(errorMessage, { variant: "error" });
      }
    } catch (error) {
      enqueueSnackbar("Unexpected error occurred", { variant: "error" });
    }
  },
  [installLayoutFromMarketplace, enqueueSnackbar],
);
```

---

## セキュリティ

### 1. 脅威モデル

| 脅威                 | 対策                   | 実装                                 |
| -------------------- | ---------------------- | ------------------------------------ |
| **ファイル改ざん**   | SHA256ハッシュ検証     | `verifyLayoutHash()`, `verifyHash()` |
| **不正なデータ構造** | スキーマバリデーション | `validateLayoutDataStructure()`      |
| **悪意のある内容**   | 内容検証               | `validateLayoutDataContent()`        |
| **XSS攻撃**          | サニタイゼーション     | React標準のエスケープ機能            |
| **プロトタイプ汚染** | オブジェクト検証       | 厳密な型チェック                     |

### 2. セキュリティベストプラクティス

#### 入力検証

- すべての外部データを検証
- 型安全性の確保
- nullチェックの徹底

#### エラーハンドリング

- 詳細なエラー情報はログのみ
- ユーザーには一般的なメッセージ
- スタックトレースの非表示

#### データ保護

- LocalStorageの暗号化は不要（公開情報のみ）
- 機密情報の保存を避ける
- ユーザーデータの最小化

---

## 拡張性

### 1. 新しいマーケットプレイスタイプの追加

**手順**:

1. **Contextの作成**:

```typescript
// context/NewItemMarketplaceContext.ts
export interface NewItemMarketplace {
  getAvailableItems(): Promise<NewItemMarketplaceDetail[]>;
  searchItems(query: string): Promise<NewItemMarketplaceDetail[]>;
  getItemDetail(id: string): Promise<NewItemMarketplaceDetail | undefined>;
}

// context/NewItemCatalogContext.ts
export interface NewItemCatalog {
  downloadItem(detail: NewItemMarketplaceDetail): Promise<NewItemData>;
  installItem(detail: NewItemMarketplaceDetail): Promise<InstallResult>;
  uninstallItem(id: string): Promise<void>;
}
```

2. **Providerの実装**:

```typescript
// providers/NewItemMarketplaceProvider.tsx
export default function NewItemMarketplaceProvider({ children }) {
  const getAvailableItems = useCallback(async () => {
    // 実装
  }, []);

  const marketplace = useShallowMemo({
    getAvailableItems,
    searchItems,
    getItemDetail,
  });

  return (
    <NewItemMarketplaceContext.Provider value={marketplace}>
      {children}
    </NewItemMarketplaceContext.Provider>
  );
}

// providers/NewItemCatalogProvider.tsx
export default function NewItemCatalogProvider({ children }) {
  const downloadItem = useCallback(async (detail) => {
    // ダウンロードロジック
  }, []);

  const installItem = useCallback(async (detail) => {
    // インストールロジック
  }, []);

  const catalog = useShallowMemo({
    downloadItem,
    installItem,
    uninstallItem,
  });

  return (
    <NewItemCatalogContext.Provider value={catalog}>
      {children}
    </NewItemCatalogContext.Provider>
  );
}
```

3. **UIコンポーネントの作成**:

```typescript
// components/NewItemMarketplaceSettings.tsx
export default function NewItemMarketplaceSettings() {
  const marketplace = useNewItemMarketplace();
  const catalog = useNewItemCatalog();

  const { filteredItems } = useMarketplaceSearch({
    items: items,
    enableSuggestions: true,
  });

  return (
    <MarketplaceGrid items={filteredItems}>
      {(item) => (
        <MarketplaceCard
          item={item}
          onInstall={() => catalog.installItem(item)}
          onUninstall={() => catalog.uninstallItem(item.id)}
        />
      )}
    </MarketplaceGrid>
  );
}
```

### 2. 共通機能の活用

新しいマーケットプレイスタイプでも、以下の共通コンポーネント・フックを活用できます:

- `useMarketplaceSearch`: 統一された検索・フィルタリング
- `MarketplaceCard`: アイテムカード表示
- `MarketplaceGrid`: グリッドレイアウト
- `MarketplaceHeader`: ヘッダーとフィルター
- `MarketplaceDetailBase`: 詳細ページベース
- `useMarketplaceActions`: 共通操作ロジック

### 3. カスタマイズポイント

各マーケットプレイスタイプで以下をカスタマイズ可能:

- **データ構造**: `MarketplaceDetail`型
- **ダウンロード方法**: fetchロジック
- **検証方法**: バリデーションロジック
- **インストール先**: ストレージロケーション
- **UI表示**: コンポーネントの見た目

---

## まとめ

### 設計の利点

1. **✅ 単一責任原則**

   - MarketplaceProvider: データ取得のみ
   - CatalogProvider: インストール・管理のみ

2. **✅ 一貫性**

   - ExtensionとLayoutで同じパターン
   - 学習コストの低減

3. **✅ 保守性**

   - 機能の所在が明確
   - 依存関係の簡素化

4. **✅ 拡張性**

   - 新しいマーケットプレイスタイプを容易に追加
   - 共通コンポーネントの再利用

5. **✅ セキュリティ**
   - SHA256検証
   - データバリデーション
   - エラーハンドリング

### 今後の改善案

1. **パフォーマンス最適化**

   - レイアウト/拡張機能のキャッシュ
   - Lazy loading
   - 仮想スクロール

2. **テストカバレッジ向上**

   - ユニットテスト
   - 統合テスト
   - E2Eテスト

3. **ユーザーエクスペリエンス向上**

   - プレビュー機能
   - レビュー・評価システム
   - おすすめアルゴリズム

4. **共通ユーティリティの拡充**
   - `calculateSHA256`を共通utilへ移動
   - バリデーションロジックの共通化
   - エラーハンドリングの標準化

---

## 関連ドキュメント

- [実装計画](../../04_implementation/plans/20251015_01_refactor-layout-to-extension-pattern.md)
- [リファクタリング作業ログ](../../08_worklogs/2025_10/20251015/20251015_02_refactor-layout-marketplace-to-simple-pattern.md)
- [検証レポート](../../08_worklogs/2025_10/20251015/20251015_03_verification-install-function-migration.md)

---

**最終更新日**: 2025年10月15日
