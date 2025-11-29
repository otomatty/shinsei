# カタログプロバイダーのアーキテクチャ比較

## 概要

Lichtblickには2種類のカタログプロバイダーが存在し、それぞれ異なる目的とアーキテクチャを持っています：

- **ExtensionCatalogProvider**: 拡張機能（実行可能なJavaScriptコード）の管理
- **LayoutCatalogProvider**: レイアウト（JSONベースの設定データ）の管理

本ドキュメントでは、両者の設計思想とアーキテクチャの違いを詳細に解説します。

**作成日**: 2025年10月15日
**最終更新日**: 2025年10月15日

---

## 目次

1. [アーキテクチャの違い](#1-アーキテクチャの違い)
2. [データ永続化戦略](#2-データ永続化戦略)
3. [なぜLayoutにはLoaderが不要なのか](#3-なぜlayoutにはloaderが不要なのか)
4. [セキュリティモデル](#4-セキュリティモデル)
5. [実装例](#5-実装例)
6. [設計の意図](#6-設計の意図)

---

## 1. アーキテクチャの違い

### 1.1 ExtensionCatalogProvider

**複数ローダーシステム**による柔軟な拡張機能管理

```typescript
interface IExtensionLoader {
  readonly namespace: Namespace; // "org" | "local"
  readonly type: TypeExtensionLoader; // "browser" | "server" | "filesystem"

  getExtension(id: string): Promise<ExtensionInfo | undefined>;
  getExtensions(): Promise<ExtensionInfo[]>;
  loadExtension(id: string): Promise<LoadedExtension>;
  installExtension(data: InstallExtensionProps): Promise<ExtensionInfo>;
  uninstallExtension(id: string): Promise<void>;
}
```

**ローダーの種類**:

| タイプ       | クラス                  | 用途               | ストレージ       |
| ------------ | ----------------------- | ------------------ | ---------------- |
| `browser`    | `IdbExtensionLoader`    | ブラウザキャッシュ | IndexedDB        |
| `server`     | `RemoteExtensionLoader` | リモート拡張       | サーバー         |
| `filesystem` | (将来実装)              | ローカルファイル   | ファイルシステム |

**使用例**:

```typescript
<ExtensionCatalogProvider loaders={[
  new IdbExtensionLoader("org"),
  new RemoteExtensionLoader("org", serverUrl),
]}>
  {children}
</ExtensionCatalogProvider>
```

### 1.2 LayoutCatalogProvider

**直接管理システム**によるシンプルなレイアウト管理

```typescript
// ローダー不要 - LayoutManager と localStorage を直接使用
export default function LayoutCatalogProvider({
  children,
}: React.PropsWithChildren): React.JSX.Element {
  const layoutManager = useLayoutManager();

  // fetch API で直接ダウンロード
  // layoutManager で直接保存
  // localStorage で Origin 情報管理
}
```

**データフロー**:

```
Marketplace → fetch → Validation → LayoutManager → IdbLayoutStorage
                ↓
            localStorage (Origin情報のみ)
```

---

## 2. データ永続化戦略

### 2.1 Extension: マルチレイヤー戦略

```typescript
// レイヤー1: IndexedDB (ブラウザキャッシュ)
class IdbExtensionLoader implements IExtensionLoader {
  private db: IDBDatabase;

  async installExtension(data: InstallExtensionProps) {
    // IndexedDB に保存
    await this.db.put("extensions", extensionData);
  }
}

// レイヤー2: Remote Server (マスターソース)
class RemoteExtensionLoader implements IExtensionLoader {
  constructor(private serverUrl: string) {}

  async loadExtension(id: string) {
    // サーバーから取得
    const response = await fetch(`${this.serverUrl}/extensions/${id}`);
  }
}

// レイヤー3: Runtime State (Zustand)
type ExtensionCatalog = {
  loadedExtensions: Set<string>; // インストール済み追跡
  installedExtensions: ExtensionInfo[]; // 拡張リスト
  installedPanels: Record<string, RegisteredPanel>;
  installedMessageConverters: RegisterMessageConverterArgs[];
  // ... その他の貢献ポイント
};
```

### 2.2 Layout: 2層シンプル戦略

```typescript
// レイヤー1: IdbLayoutStorage (メインストレージ)
class IdbLayoutStorage implements ILayoutStorage {
  async saveNewLayout(params: { name: string; data: LayoutData }): Promise<Layout> {
    // IndexedDB に保存
  }
}

// レイヤー2: localStorage (Origin情報のみ)
const MARKETPLACE_ORIGINS_KEY = "lichtblick.layout.marketplace.origins";

function saveMarketplaceOrigins(origins: Record<string, MarketplaceOrigin>): void {
  localStorage.setItem(MARKETPLACE_ORIGINS_KEY, JSON.stringify(origins));
}
```

**比較表**:

| 特徴         | Extension                          | Layout                         |
| ------------ | ---------------------------------- | ------------------------------ |
| ストレージ層 | 3層 (IndexedDB + Server + Runtime) | 2層 (IndexedDB + localStorage) |
| キャッシング | 複雑 (多段階)                      | シンプル (単一)                |
| 同期戦略     | 複数ソース間の同期                 | 不要                           |
| Origin追跡   | 不要 (namespace管理)               | 必要 (localStorage)            |

---

## 3. なぜLayoutにはLoaderが不要なのか

### 3.1 データの性質の違い

#### Extension: 実行可能コード

```typescript
// JavaScript コードを動的にロード・実行
const extensionCode = `
  export function activate(context) {
    // パネルを登録
    context.registerPanel({
      name: "MyPanel",
      component: MyPanelComponent,
    });
  }
`;

// セキュリティサンドボックスで実行
const module = new Function("context", extensionCode);
module(extensionContext);
```

**必要な機能**:

- ✅ コードのサンドボックス実行
- ✅ 依存関係の解決
- ✅ 段階的なロード（遅延ロード）
- ✅ キャッシング戦略
- ✅ バージョン管理

#### Layout: 設定データ

```typescript
// 単純なJSONデータ
type LayoutData = {
  configById: Record<string, unknown>;
  globalVariables: Record<string, unknown>;
  playbackConfig: Record<string, unknown>;
  userNodes: Record<string, unknown>;
};

// ダウンロード → パース → 検証 → 保存
const layoutData = await response.json();
if (validateLayoutData(layoutData)) {
  await layoutManager.saveNewLayout({ data: layoutData });
}
```

**必要な機能**:

- ✅ データの検証
- ✅ ハッシュ検証（改ざん防止）
- ❌ コード実行（不要）
- ❌ 複雑なキャッシング（不要）
- ❌ バージョン管理（不要）

### 3.2 インストール先の違い

#### Extension: マルチデスティネーション

```typescript
async function installExtensions(
  namespace: Namespace,
  extensions: ExtensionData[],
): Promise<InstallExtensionsResult[]> {
  const namespaceLoaders = loaders.filter((loader) => loader.namespace === namespace);

  for (const loader of namespaceLoaders) {
    // 各ローダーにインストール
    await loader.installExtension(extensionData);
  }

  // ブラウザキャッシュにも、サーバーにも保存
}
```

**インストールフロー**:

```
Extension File
    ↓
    ├→ IdbExtensionLoader (IndexedDB)
    └→ RemoteExtensionLoader (Server API)
```

#### Layout: シングルデスティネーション

```typescript
async function installLayoutFromMarketplace(
  detail: LayoutMarketplaceDetail,
  name?: string,
): Promise<InstallLayoutResult> {
  // LayoutManager に1回保存するだけ
  const layout = await layoutManager.saveNewLayout({
    name: name ?? detail.name,
    data: layoutData,
  });

  // Origin情報は別途localStorageに
  await markAsMarketplaceLayout(layout.id, origin);
}
```

**インストールフロー**:

```
Marketplace Layout
    ↓
LayoutManager → IdbLayoutStorage (IndexedDB)
    ↓
localStorage (Origin info)
```

### 3.3 管理の複雑さ

#### Extension: 複雑な貢献ポイントシステム

```typescript
type ContributionPoints = {
  // 複数の統合ポイント
  panels: Record<string, RegisteredPanel>;
  messageConverters: RegisterMessageConverterArgs[];
  topicAliasFunctions: TopicAliasFunctions[];
  cameraModels: CameraModelsMap;
  panelSettings: ExtensionSettings;
};

// 複数の拡張から貢献ポイントを統合
function mergeContributionPoints(extensions: ExtensionInfo[]): ContributionPoints {
  const merged = {
    panels: {},
    messageConverters: [],
    // ...
  };

  for (const extension of extensions) {
    // 各拡張の貢献を統合
    Object.assign(merged.panels, extension.panels);
    merged.messageConverters.push(...extension.messageConverters);
  }

  return merged;
}
```

#### Layout: シンプルな設定データ

```typescript
type LayoutData = {
  // フラットな設定構造
  configById: Record<string, unknown>;
  globalVariables: Record<string, unknown>;
  playbackConfig: Record<string, unknown>;
  userNodes: Record<string, unknown>;
};

// 単純な検証のみ
function validateLayoutData(data: LayoutData): boolean {
  return validateLayoutDataStructure(data) && validateLayoutDataContent(data);
}
```

---

## 4. セキュリティモデル

### 4.1 Extension: 実行時セキュリティ

```typescript
// コードサンドボックス
class ExtensionRunner {
  private sandbox: Sandbox;

  async runExtension(code: string): Promise<void> {
    // 隔離された環境で実行
    const result = await this.sandbox.execute(code, {
      // 制限されたAPI
      allowedAPIs: ["registerPanel", "registerMessageConverter"],
      // 権限チェック
      permissions: extensionPermissions,
    });
  }
}

// 複数ソースからの検証
async function loadExtension(id: string): Promise<LoadedExtension> {
  // ブラウザキャッシュから取得試行
  try {
    return await browserLoader.loadExtension(id);
  } catch {
    // フォールバック: サーバーから取得
    const { raw, buffer } = await serverLoader.loadExtension(id);

    // キャッシュに保存
    await browserLoader.installExtension({ buffer });

    return { raw, buffer };
  }
}
```

### 4.2 Layout: データ検証セキュリティ

```typescript
// 構造検証
function validateLayoutDataStructure(data: unknown): data is LayoutData {
  if (typeof data !== "object" || data == undefined) {
    return false;
  }

  const layoutData = data as Record<string, unknown>;

  return (
    layoutData.configById != undefined &&
    typeof layoutData.configById === "object" &&
    layoutData.globalVariables != undefined &&
    // ... 必須フィールドチェック
  );
}

// コンテンツ検証
function validateLayoutDataContent(data: LayoutData): boolean {
  for (const [panelId, config] of Object.entries(data.configById)) {
    if (typeof panelId !== "string" || !panelId.trim()) {
      return false;
    }
    if (typeof config !== "object") {
      return false;
    }
  }
  return true;
}

// ハッシュ検証（改ざん防止）
async function verifyLayoutHash(
  data: LayoutData,
  expectedHash: string
): Promise<boolean> {
  const dataString = JSON.stringify(data);
  const actualHash = await calculateSHA256(dataString);
  return actualHash === expectedHash.toLowerCase();
}
```

**比較表**:

| セキュリティ対策 | Extension          | Layout             |
| ---------------- | ------------------ | ------------------ |
| コード実行       | サンドボックス必須 | なし（実行しない） |
| データ検証       | スキーマ検証       | 構造・内容検証     |
| 改ざん検出       | 署名検証           | SHA256ハッシュ     |
| 権限管理         | API制限            | 不要               |
| ソース検証       | 複数ソース照合     | 単一ソース検証     |

---

## 5. 実装例

### 5.1 Extension のライフサイクル

```typescript
// 1. プロバイダーの初期化
<ExtensionCatalogProvider
  loaders={[
    new IdbExtensionLoader("org"),
    new RemoteExtensionLoader("org", serverUrl),
  ]}
>
  {children}
</ExtensionCatalogProvider>

// 2. 拡張のインストール
const catalog = useExtensionCatalog();

const results = await catalog.installExtensions("org", [
  {
    buffer: extensionFileData,
    file: extensionFile,
  }
]);

// 3. インストール結果の確認
for (const result of results) {
  if (result.success) {
    console.log(`Installed: ${result.info?.name}`);
    // 各ローダーの結果も確認可能
    for (const loaderResult of result.loaderResults) {
      console.log(`  ${loaderResult.loaderType}: ${loaderResult.success}`);
    }
  }
}

// 4. 拡張のアンインストール
await catalog.uninstallExtension("org", extensionId);
```

### 5.2 Layout のライフサイクル

```typescript
// 1. プロバイダーの初期化（ローダー不要）
<LayoutManagerProvider>
  <LayoutMarketplaceProvider>
    <LayoutCatalogProvider>
      {children}
    </LayoutCatalogProvider>
  </LayoutMarketplaceProvider>
</LayoutManagerProvider>

// 2. レイアウトのインストール
const catalog = useLayoutCatalog();

const result = await catalog.installLayoutFromMarketplace(
  marketplaceDetail,
  "My Layout"
);

if (result.success) {
  console.log(`Installed: ${result.layout?.name}`);
}

// 3. Origin情報の確認
const origin = await catalog.getMarketplaceOrigin(layoutId);
if (origin) {
  console.log(`From marketplace: ${origin.marketplaceId}`);
  console.log(`Installed at: ${origin.installedAt}`);
}

// 4. レイアウトのアンインストール
await catalog.uninstallMarketplaceLayout(layoutId);
```

---

## 6. 設計の意図

### 6.1 Extension: 拡張性と安全性の両立

**設計目標**:

- ✅ 複数のソースからの拡張機能提供
- ✅ プラグインエコシステムの構築
- ✅ 安全なコード実行環境
- ✅ オフライン対応（ブラウザキャッシュ）
- ✅ エンタープライズ対応（プライベートサーバー）

**トレードオフ**:

- ➕ 高い柔軟性
- ➕ 豊富な機能
- ➖ 複雑な実装
- ➖ 大きなバンドルサイズ

### 6.2 Layout: シンプルさと使いやすさ

**設計目標**:

- ✅ 簡単なレイアウト共有
- ✅ マーケットプレイス統合
- ✅ 迅速なインストール
- ✅ Origin追跡（どこから来たか）
- ✅ 改ざん検出

**トレードオフ**:

- ➕ シンプルな実装
- ➕ 高速なインストール
- ➕ 小さなバンドルサイズ
- ➖ 柔軟性は限定的

### 6.3 アーキテクチャ決定の根拠

| 観点       | Extension      | Layout                 | 理由                     |
| ---------- | -------------- | ---------------------- | ------------------------ |
| Loader     | 必要           | 不要                   | コード実行 vs 設定データ |
| ストレージ | 多層           | 2層                    | キャッシング戦略の違い   |
| 検証       | 実行時         | インストール時         | セキュリティ要件の違い   |
| 更新       | バージョン管理 | 上書き                 | データ性質の違い         |
| 配布       | 複数ソース     | マーケットプレイスのみ | 配布モデルの違い         |

---

## 7. まとめ

### 7.1 適切な使い分け

**Extension を使うべき場合**:

- カスタムパネルを提供したい
- メッセージ変換ロジックを追加したい
- システムの機能を拡張したい
- 再利用可能なコンポーネントを配布したい

**Layout を使うべき場合**:

- パネル配置を共有したい
- 設定をテンプレート化したい
- ワークスペースをエクスポートしたい
- チームで設定を統一したい

### 7.2 今後の拡張可能性

**Extension**:

- プラグインマーケットプレイスの拡充
- エンタープライズプライベートレジストリ
- バージョン管理とロールバック
- 依存関係管理

**Layout**:

- レイアウトテンプレートシステム
- バージョニング（必要に応じて）
- チーム共有機能
- クラウド同期

---

## 関連ドキュメント

- [ExtensionCatalogProvider 実装](/packages/suite-base/src/providers/ExtensionCatalogProvider.tsx)
- [LayoutCatalogProvider 実装](/packages/suite-base/src/providers/LayoutCatalogProvider.tsx)
- [IExtensionLoader インターフェース](/packages/suite-base/src/services/extension/IExtensionLoader.ts)
- [LayoutManager コンテキスト](/packages/suite-base/src/context/LayoutManagerContext.ts)

---

## 変更履歴

| 日付       | 変更内容 | 担当者       |
| ---------- | -------- | ------------ |
| 2025-10-15 | 初版作成 | AI Assistant |
