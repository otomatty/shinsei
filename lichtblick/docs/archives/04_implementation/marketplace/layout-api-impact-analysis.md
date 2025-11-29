# Lichtblick Layout API v1.20.0 影響分析レポート

> **作成日**: 2025年10月2日
> **対象バージョン**: v1.20.0 (PR #695)
> **分析者**: AI Technical Advisor
> **ステータス**: マーケットプレイス機能との互換性分析完了

---

## 📋 エグゼクティブサマリー

### 重要な結論

**✅ マーケットプレイス機能とv1.20.0のLayout APIは基本的に互換性があります**

- 両者は異なるレイヤーで動作し、直接的な競合は発生しません
- マーケットプレイス機能は既存のLayoutManagerを活用する設計のため、v1.20.0の改善がそのまま活かされます
- 一部の機能追加（起源情報管理）は、v1.20.0の新機能と自然に統合可能です

### 影響度評価

| 項目                  | 影響度 | 詳細                                          |
| --------------------- | ------ | --------------------------------------------- |
| **データ構造の競合**  | 🟢 低  | 異なる用途で互いに補完的                      |
| **API呼び出しの重複** | 🟢 低  | レイヤーが異なるため問題なし                  |
| **同期処理の競合**    | 🟡 中  | マーケットプレイス起源情報の同期考慮が必要    |
| **実装の複雑性**      | 🟢 低  | v1.20.0の改善により実装が容易に               |
| **将来の拡張性**      | 🟢 高  | v1.20.0の基盤がマーケットプレイスの拡張を支援 |

---

## 🎯 v1.20.0 Layout APIの主要変更点

### 1. アーキテクチャの刷新

#### A. リモート・ローカルレイアウトの分離

```typescript
// v1.20.0の新しいデータフロー
Server API (LayoutApiData)
    ↕ [変換層]
Remote Layout (RemoteLayout) ←→ LayoutsAPI
    ↕ [同期層]
Local Layout (Layout) ←→ LayoutManager
    ↕ [UI層]
Current Layout Context
```

**特徴:**

- **RemoteLayout**: サーバーから取得したレイアウトデータ
- **Layout**: ローカルストレージで管理されるレイアウト
- **externalId**: リモートレイアウトとローカルレイアウトを紐づけるID

#### B. 型システムの完全再構築

```typescript
// 新しいLayout型定義 (v1.20.0)
export type Layout = {
  id: LayoutID; // ローカルID
  externalId?: string; // リモートID (新規追加)
  name: string;
  from?: string; // 既存フィールド
  permission: LayoutPermission;

  // v1.20.0で新規追加: baseline/working方式
  baseline: LayoutBaseline; // 最後に保存されたバージョン
  working: LayoutBaseline | undefined; // 編集中のバージョン

  // リモート同期情報 (新規追加)
  syncInfo: LayoutSyncInfo | undefined;
};

export type LayoutBaseline = {
  data: LayoutData;
  savedAt: ISO8601Timestamp | undefined;
};

export type LayoutSyncInfo = {
  status: LayoutSyncStatus;
  lastRemoteSavedAt: ISO8601Timestamp | undefined;
};
```

### 2. 新しいHTTP通信インフラ

```typescript
// LayoutsAPI実装 (v1.20.0)
export class LayoutsAPI implements IRemoteLayoutStorage {
  public readonly namespace: string;
  public readonly baseUrl: string = "layouts";

  // RESTful API
  public async getLayouts(): Promise<RemoteLayout[]>;
  public async getLayout(id: LayoutID): Promise<RemoteLayout | undefined>;
  public async saveNewLayout(params: SaveNewLayoutParams): Promise<RemoteLayout>;
  public async updateLayout(params: UpdateLayoutRequest): Promise<UpdateLayoutResponse>;
  public async deleteLayout(id: string): Promise<boolean>;
}
```

### 3. 自動同期メカニズム

```typescript
// LayoutManagerの自動同期 (v1.20.0)
export default class LayoutManager implements ILayoutManager {
  // 定期的なリモート同期
  public async syncWithRemote(abortSignal: AbortSignal): Promise<void> {
    const [localLayouts, remoteLayouts] = await Promise.all([
      this.local.runExclusive(async (local) => await local.list()),
      this.remote.getLayouts(),
    ]);

    const syncOperations = computeLayoutSyncOperations(localLayouts, remoteLayouts);
    // ...同期処理
  }
}
```

---

## 🏗️ マーケットプレイス機能の現在の実装

### 1. アーキテクチャ概要

```typescript
// マーケットプレイス機能のデータフロー
GitHub Repository (layouts.json)
    ↕
LayoutMarketplaceProvider
    ↕
LayoutCatalogProvider
    ↕
LayoutManager (v1.20.0) ←→ ILayoutStorage
    ↕
IndexedDB (IdbLayoutStorage)
```

### 2. 主要コンポーネント

#### A. LayoutMarketplaceContext

```typescript
// マーケットプレイスからのレイアウト情報取得
export interface LayoutMarketplace {
  getAvailableLayouts(): Promise<LayoutMarketplaceDetail[]>;
  searchLayouts(query: string): Promise<LayoutMarketplaceDetail[]>;
  downloadLayout(url: string): Promise<LayoutData>;
  verifyLayoutHash(data: LayoutData, expectedHash: string): Promise<boolean>;
}

export type LayoutMarketplaceDetail = {
  id: string;
  name: string;
  author: string;
  version: string;
  layoutUrl: string; // レイアウトJSONのURL
  sha256sum?: string; // セキュリティ検証用
  // ...その他メタデータ
};
```

#### B. LayoutCatalogContext

```typescript
// マーケットプレイスとLayoutManagerの橋渡し
export interface LayoutCatalog {
  // インストール機能
  installLayoutFromMarketplace(
    detail: LayoutMarketplaceDetail,
    name?: string,
  ): Promise<InstallLayoutResult>;

  // マーケットプレイス起源情報の管理
  getMarketplaceOrigin(layoutId: LayoutID): Promise<MarketplaceOrigin | undefined>;
  markAsMarketplaceLayout(layoutId: LayoutID, origin: MarketplaceOrigin): Promise<void>;

  // 更新・削除
  updateMarketplaceLayout(
    layoutId: LayoutID,
    newDetail: LayoutMarketplaceDetail,
  ): Promise<InstallLayoutResult>;
  uninstallMarketplaceLayout(id: LayoutID): Promise<void>;
}

// マーケットプレイス起源情報
export type MarketplaceOrigin = {
  marketplaceId: string;
  version: string;
  installedAt: string;
  originalUrl: string;
  author?: string;
};
```

### 3. ローカルストレージでの起源管理

```typescript
// localStorage を使用した起源情報の管理
const MARKETPLACE_ORIGINS_KEY = "lichtblick.layout.marketplace.origins";

function getMarketplaceOrigins(): Record<string, MarketplaceOrigin> {
  const stored = localStorage.getItem(MARKETPLACE_ORIGINS_KEY);
  return stored ? JSON.parse(stored) : {};
}

function saveMarketplaceOrigins(origins: Record<string, MarketplaceOrigin>): void {
  localStorage.setItem(MARKETPLACE_ORIGINS_KEY, JSON.stringify(origins));
}
```

---

## 🔍 詳細な差分分析

### 1. データ構造の比較

#### A. Layout型 (v1.20.0)

```typescript
// v1.20.0のLayout型
type Layout = {
  id: LayoutID;
  externalId?: string; // リモートストレージ用
  name: string;
  from?: string; // 既存: インポート元など
  permission: LayoutPermission;

  // バージョン管理
  baseline: LayoutBaseline;
  working: LayoutBaseline | undefined;

  // 同期情報
  syncInfo: LayoutSyncInfo | undefined;
};
```

**`from`フィールドの使用例:**

```typescript
// レイアウトをインポートした場合
const layout = {
  id: "layout-123",
  name: "Imported Layout",
  from: "/path/to/original.json", // インポート元ファイル
  // ...
};
```

#### B. MarketplaceOrigin型 (マーケットプレイス)

```typescript
// マーケットプレイス機能の起源情報
type MarketplaceOrigin = {
  marketplaceId: string; // マーケットプレイスのID
  version: string; // インストール時のバージョン
  installedAt: string; // インストール日時
  originalUrl: string; // ダウンロード元URL
  author?: string; // 作成者
};
```

#### C. 差分と互換性

| フィールド     | v1.20.0 Layout       | MarketplaceOrigin | 競合    | 対応方針         |
| -------------- | -------------------- | ----------------- | ------- | ---------------- |
| **id**         | LayoutID (ローカル)  | -                 | ❌ なし | 異なる用途       |
| **externalId** | リモートストレージID | -                 | ❌ なし | 異なる用途       |
| **from**       | インポート元         | originalUrl       | ⚠️ 軽度 | 併用可能（後述） |
| **version**    | -                    | version           | ❌ なし | 補完的           |
| **syncInfo**   | リモート同期状態     | -                 | ❌ なし | 異なるレイヤー   |

### 2. `from`フィールドの使用方法の差異

#### 問題点

**v1.20.0での`from`:**

- ファイルパスまたはインポート元の文字列
- 例: `"/path/to/file.json"`, `"imported from USB"`

**マーケットプレイスでの潜在的使用:**

- マーケットプレイスのメタデータを保存したい
- 例: `"marketplace:layout-id"`, `originalUrl`

#### 解決策

**推奨アプローチ: 併用方式**

```typescript
// 方式1: fromフィールドにマーケットプレイス情報を含める
const layout = await layoutManager.saveNewLayout({
  name: marketplaceDetail.name,
  data: layoutData,
  permission: "CREATOR_WRITE",
  from: `marketplace:${marketplaceDetail.id}`, // マーケットプレイス識別子
});

// 方式2: localStorageでMarketplaceOriginを別管理（現在の実装）
const origin: MarketplaceOrigin = {
  marketplaceId: marketplaceDetail.id,
  version: marketplaceDetail.version,
  installedAt: new Date().toISOString(),
  originalUrl: marketplaceDetail.layoutUrl,
  author: marketplaceDetail.author,
};
saveMarketplaceOrigins({ [layout.id]: origin });
```

**推奨**: **方式2（現在の実装）を維持**

理由:

- `from`フィールドは将来的に他の用途で使用される可能性がある
- マーケットプレイス専用の情報は独立して管理する方が柔軟性が高い
- v1.20.0の同期機能と干渉しない

---

## 💥 潜在的な競合ポイント

### 1. レイアウト更新時の同期競合

#### シナリオ

```
1. ユーザーがマーケットプレイスからレイアウトをインストール
2. LayoutManager経由でローカルに保存
3. v1.20.0の自動同期がリモートストレージに同期しようとする
4. マーケットプレイス起源情報がリモートに保存されない
```

#### 影響度: 🟡 中

#### 解決策

**A. マーケットプレイス起源情報をLayoutDataに組み込む**

```typescript
// カスタムフィールドをLayoutDataに追加
export type ExtendedLayoutData = LayoutData & {
  metadata?: {
    source?: "marketplace" | "user" | "imported";
    marketplaceId?: string;
    marketplaceVersion?: string;
    installedAt?: string;
  };
};
```

**利点:**

- リモート同期時に起源情報も一緒に同期される
- 複数デバイス間で情報を共有できる

**欠点:**

- LayoutDataの拡張が必要
- upstreamとの互換性を考慮する必要がある

**B. MarketplaceOriginをリモートストレージに別途保存（推奨）**

```typescript
// 将来的な実装案
interface IRemoteMarketplaceStorage {
  saveMarketplaceOrigin(layoutId: LayoutID, origin: MarketplaceOrigin): Promise<void>;
  getMarketplaceOrigin(layoutId: LayoutID): Promise<MarketplaceOrigin | undefined>;
  syncMarketplaceOrigins(): Promise<void>;
}
```

**利点:**

- v1.20.0のLayout構造を変更しなくて済む
- マーケットプレイス機能の独立性を保てる

**欠点:**

- 追加のAPIエンドポイントが必要
- 実装が複雑になる

**現時点での推奨**: 当面は**localStorage管理を継続**し、次回リリースでリモート同期を検討

### 2. permissionフィールドの扱い

#### 現在のマーケットプレイス実装

```typescript
// マーケットプレイスからインストールする際は常にCREATOR_WRITE
const layout = await layoutManager.saveNewLayout({
  name: detail.name,
  data: layoutData,
  permission: "CREATOR_WRITE", // 個人レイアウトとして保存
});
```

#### v1.20.0での権限管理

```typescript
export type LayoutPermission = "CREATOR_WRITE" | "ORG_READ" | "ORG_WRITE";

// CREATOR_WRITE: 個人レイアウト（リモート同期しない）
// ORG_READ: 組織レイアウト（読み取り専用）
// ORG_WRITE: 組織レイアウト（書き込み可能）
```

#### 影響度: 🟢 低

#### 結論

- マーケットプレイスから個人レイアウトとしてインストールするため、現在の実装で問題なし
- `CREATOR_WRITE`は自動的にリモート同期の対象外になるため、意図しない同期は発生しない

### 3. バージョン管理の重複

#### v1.20.0のバージョン管理

```typescript
type Layout = {
  // ...
  baseline: LayoutBaseline; // 保存済みバージョン
  working: LayoutBaseline | undefined; // 編集中バージョン
};
```

#### マーケットプレイスのバージョン管理

```typescript
type MarketplaceOrigin = {
  version: string; // マーケットプレイスでのバージョン
  // ...
};
```

#### 影響度: 🟢 低

#### 結論

- 異なる概念のバージョン管理
  - **v1.20.0**: 編集履歴の管理（baseline/working）
  - **マーケットプレイス**: リリースバージョンの追跡
- 両者は補完的で競合しない

---

## ✅ 互換性の確認ポイント

### 1. LayoutManager APIの利用

#### マーケットプレイスの実装

```typescript
// LayoutCatalogProviderでのLayoutManager利用
const installLayoutFromMarketplace = async (
  detail: LayoutMarketplaceDetail,
  name?: string,
): Promise<InstallLayoutResult> => {
  // ダウンロードと検証
  const layoutData = await downloadLayoutFromMarketplace(detail);

  // LayoutManager経由でインストール (v1.20.0対応)
  const layout = await layoutManager.saveNewLayout({
    name: name ?? detail.name,
    data: layoutData,
    permission: "CREATOR_WRITE",
  });

  // 起源情報を記録
  await markAsMarketplaceLayout(layout.id, {
    marketplaceId: detail.id,
    version: detail.version,
    installedAt: new Date().toISOString(),
    originalUrl: detail.layoutUrl,
    author: detail.author,
  });

  return { success: true, layout };
};
```

#### v1.20.0でのsaveNewLayout実装

```typescript
// LayoutManager.ts (v1.20.0)
public async saveNewLayout({
  name,
  data,
  permission,
  from,
}: {
  name: string;
  data: LayoutData;
  permission: LayoutPermission;
  from?: string;
}): Promise<Layout> {
  const now = new Date().toISOString() as ISO8601Timestamp;

  if (layoutPermissionIsShared(permission)) {
    // 共有レイアウトの場合はリモートに保存
    const newLayout = await this.remote.saveNewLayout({
      id: uuidv4() as LayoutID,
      name,
      data,
      permission,
    });
    // ...
  } else {
    // 個人レイアウト (CREATOR_WRITE)
    const layout: Layout = {
      id: uuidv4() as LayoutID,
      name,
      from,
      permission,
      baseline: { data, savedAt: now },
      working: undefined,
      syncInfo: undefined, // リモート同期しない
    };
    return await this.local.runExclusive(async (local) => await local.put(layout));
  }
}
```

#### 互換性評価: ✅ 完全互換

- マーケットプレイスは`CREATOR_WRITE`で保存
- v1.20.0では個人レイアウトとしてローカルに保存される
- リモート同期の対象外のため、意図しない同期は発生しない

### 2. レイアウト更新の互換性

#### マーケットプレイスの更新処理

```typescript
const updateMarketplaceLayout = async (
  layoutId: LayoutID,
  newDetail: LayoutMarketplaceDetail,
): Promise<InstallLayoutResult> => {
  // 新しいバージョンをダウンロード
  const newLayoutData = await downloadLayoutFromMarketplace(newDetail);

  // LayoutManager経由で更新 (v1.20.0対応)
  const updatedLayout = await layoutManager.updateLayout({
    id: layoutId,
    name: existingLayout.name, // 名前は変更しない
    data: newLayoutData,
  });

  // 起源情報を更新
  await markAsMarketplaceLayout(layoutId, {
    ...origin,
    version: newDetail.version,
    installedAt: new Date().toISOString(),
  });

  return { success: true, layout: updatedLayout };
};
```

#### v1.20.0でのupdateLayout実装

```typescript
// LayoutManager.ts (v1.20.0)
public async updateLayout({
  id,
  name,
  data,
}: {
  id: LayoutID;
  name: string | undefined;
  data: LayoutData | undefined;
}): Promise<Layout> {
  const localLayout = await this.local.runExclusive(async (local) => await local.get(id));
  // ...

  if (data != undefined) {
    // データの更新 → workingコピーを作成
    const now = new Date().toISOString() as ISO8601Timestamp;
    const result = await this.local.runExclusive(async (local) =>
      await local.put({
        ...localLayout,
        name: name ?? localLayout.name,
        working: { data, savedAt: now },
      }),
    );
    return result;
  }
  // ...
}
```

#### 互換性評価: ⚠️ 注意が必要

**問題点:**

- `updateLayout`を呼ぶとworkingコピーが作成される
- マーケットプレイスからの更新は「新しいbaselineとして保存」したい

**推奨解決策:**

```typescript
// マーケットプレイス更新時は一旦削除して再インストール
const updateMarketplaceLayout = async (
  layoutId: LayoutID,
  newDetail: LayoutMarketplaceDetail,
): Promise<InstallLayoutResult> => {
  // 既存レイアウトの情報を取得
  const existingLayout = await layoutManager.getLayout(layoutId);
  const existingName = existingLayout?.name;

  // 削除
  await layoutManager.deleteLayout({ id: layoutId });

  // 新規インストール（新しいbaselineとして保存される）
  return await installLayoutFromMarketplace(newDetail, existingName);
};
```

**または:**

```typescript
// overwriteLayoutを使用してbaselineを更新
const updateMarketplaceLayout = async (
  layoutId: LayoutID,
  newDetail: LayoutMarketplaceDetail,
): Promise<InstallLayoutResult> => {
  // 新しいデータで更新
  await layoutManager.updateLayout({
    id: layoutId,
    name: undefined, // 名前は変更しない
    data: newLayoutData,
  });

  // overwriteLayoutでworkingをbaselineに昇格
  const updatedLayout = await layoutManager.overwriteLayout({ id: layoutId });

  // 起源情報を更新
  await markAsMarketplaceLayout(layoutId, updatedOrigin);

  return { success: true, layout: updatedLayout };
};
```

---

## 🎯 推奨される実装変更

### 1. 短期的な対応（現在のリリース）

#### A. `from`フィールドの活用（オプション）

```typescript
// LayoutCatalogProviderでのインストール処理
const layout = await layoutManager.saveNewLayout({
  name: detail.name,
  data: layoutData,
  permission: "CREATOR_WRITE",
  from: `marketplace:${detail.id}`, // 追加: マーケットプレイス識別子
});
```

**メリット:**

- v1.20.0の既存フィールドを活用
- 追加のストレージ不要

**注意点:**

- `from`フィールドの用途が明確化されていないため、将来的に変更が必要な可能性がある

#### B. マーケットプレイス更新処理の改善

```typescript
// 現在の実装を改善
const updateMarketplaceLayout = async (
  layoutId: LayoutID,
  newDetail: LayoutMarketplaceDetail,
): Promise<InstallLayoutResult> => {
  try {
    // 1. 新しいバージョンをダウンロード
    const newLayoutData = await downloadLayoutFromMarketplace(newDetail);

    // 2. データを更新（workingコピーが作成される）
    await layoutManager.updateLayout({
      id: layoutId,
      name: undefined,
      data: newLayoutData,
    });

    // 3. overwriteLayoutでbaselineに昇格
    const updatedLayout = await layoutManager.overwriteLayout({ id: layoutId });

    // 4. 起源情報を更新
    const updatedOrigin: MarketplaceOrigin = {
      ...origin,
      version: newDetail.version,
      installedAt: new Date().toISOString(),
      originalUrl: newDetail.layoutUrl,
    };
    await markAsMarketplaceLayout(layoutId, updatedOrigin);

    return { success: true, layout: updatedLayout };
  } catch (error) {
    return { success: false, error };
  }
};
```

### 2. 中期的な対応（次回リリース）

#### A. ILayoutManagerインターフェースの拡張提案

```typescript
// ILayoutManager.ts
export interface ILayoutManager {
  // 既存メソッド
  saveNewLayout(params: {
    name: string;
    data: LayoutData;
    permission: LayoutPermission;
  }): Promise<Layout>;
  updateLayout(params: { id: LayoutID; name?: string; data?: LayoutData }): Promise<Layout>;
  // ...

  // マーケットプレイス用の拡張メソッド (提案)
  /**
   * Mark a layout as being from marketplace
   */
  markAsMarketplaceLayout?(layoutId: LayoutID, marketplaceId: string): Promise<void>;

  /**
   * Get the marketplace origin information for a layout
   */
  getMarketplaceOrigin?(layoutId: LayoutID): Promise<string | undefined>;

  /**
   * Install layout from marketplace (combines saveNewLayout + markAsMarketplaceLayout)
   */
  installMarketplaceLayout?(params: {
    name: string;
    data: LayoutData;
    marketplaceId: string;
    version: string;
  }): Promise<Layout>;
}
```

#### B. MarketplaceOriginのリモート同期対応

```typescript
// 将来的な拡張案
export class LayoutsAPI implements IRemoteLayoutStorage {
  // ...既存メソッド

  // マーケットプレイス起源情報の同期
  public async saveMarketplaceOrigin(layoutId: LayoutID, origin: MarketplaceOrigin): Promise<void> {
    await HttpService.post(`${this.baseUrl}/${layoutId}/marketplace-origin`, origin);
  }

  public async getMarketplaceOrigin(layoutId: LayoutID): Promise<MarketplaceOrigin | undefined> {
    const { data } = await HttpService.get<MarketplaceOrigin | null>(
      `${this.baseUrl}/${layoutId}/marketplace-origin`,
    );
    return data ?? undefined;
  }
}
```

### 3. 長期的な対応（将来のアーキテクチャ）

#### A. マーケットプレイスメタデータのLayoutData統合

```typescript
// LayoutData拡張案
export type LayoutData = {
  configById: ConfigsById;
  globalVariables: GlobalVariables;
  userNodes: UserNodes;
  playbackConfig: PlaybackConfig;

  // マーケットプレイスメタデータ（提案）
  metadata?: {
    source: "marketplace" | "user" | "imported";
    marketplace?: {
      id: string;
      version: string;
      installedAt: string;
      author: string;
      originalUrl: string;
    };
  };
};
```

**メリット:**

- レイアウトデータと起源情報が一体化
- リモート同期時に自動的に起源情報も同期される
- バックアップ・エクスポート時に起源情報も含まれる

**注意点:**

- upstreamとの互換性維持が必要
- 既存レイアウトのマイグレーションが必要

---

## 📊 実装優先度マトリクス

| 対応項目                             | 重要度 | 緊急度 | 実装工数 | 推奨時期       |
| ------------------------------------ | ------ | ------ | -------- | -------------- |
| **マーケットプレイス更新処理の改善** | 🔴 高  | 🔴 高  | 小       | 即座           |
| **`from`フィールドの活用**           | 🟡 中  | 🟡 中  | 小       | 現在のリリース |
| **ILayoutManager拡張メソッド**       | 🟡 中  | 🟢 低  | 中       | 次回リリース   |
| **MarketplaceOriginリモート同期**    | 🟢 低  | 🟢 低  | 大       | 将来のリリース |
| **LayoutDataメタデータ統合**         | 🟢 低  | 🟢 低  | 大       | 長期計画       |

---

## 🧪 テスト戦略

### 1. 統合テストの追加

```typescript
describe("Marketplace Layout Integration with v1.20.0", () => {
  it("should install layout from marketplace as CREATOR_WRITE", async () => {
    const marketplace = useLayoutMarketplace();
    const catalog = useLayoutCatalog();

    // マーケットプレイスからレイアウトを取得
    const layouts = await marketplace.getAvailableLayouts();
    const targetLayout = layouts[0];

    // インストール
    const result = await catalog.installLayoutFromMarketplace(targetLayout, "Test Layout");

    expect(result.success).toBe(true);
    expect(result.layout?.permission).toBe("CREATOR_WRITE");
    expect(result.layout?.syncInfo).toBeUndefined(); // リモート同期対象外
  });

  it("should update marketplace layout without creating remote sync", async () => {
    const catalog = useLayoutCatalog();
    const layoutManager = useLayoutManager();

    // 既存のマーケットプレイスレイアウトを取得
    const layouts = await catalog.getInstalledMarketplaceLayouts();
    const targetLayoutId = layouts[0].id;

    // 新しいバージョンに更新
    const newVersion = {
      id: "test-layout",
      version: "2.0.0",
      layoutUrl: "https://example.com/layout-v2.json",
      // ...
    };

    const result = await catalog.updateMarketplaceLayout(targetLayoutId, newVersion);

    expect(result.success).toBe(true);

    // 起源情報が更新されていることを確認
    const origin = await catalog.getMarketplaceOrigin(targetLayoutId);
    expect(origin?.version).toBe("2.0.0");

    // リモート同期が発生していないことを確認
    const layout = await layoutManager.getLayout(targetLayoutId);
    expect(layout?.syncInfo).toBeUndefined();
  });

  it("should not sync marketplace layouts to remote storage", async () => {
    const layoutManager = useLayoutManager();
    const catalog = useLayoutCatalog();

    // マーケットプレイスレイアウトをインストール
    const result = await catalog.installLayoutFromMarketplace(/* ... */);
    const layoutId = result.layout!.id;

    // 同期を実行
    await layoutManager.syncWithRemote(new AbortController().signal);

    // レイアウトがリモートに同期されていないことを確認
    const layout = await layoutManager.getLayout(layoutId);
    expect(layout?.externalId).toBeUndefined();
    expect(layout?.syncInfo).toBeUndefined();
  });
});
```

### 2. E2Eテストシナリオ

```typescript
// Playwright E2E test
test("Marketplace layout workflow with v1.20.0", async ({ page }) => {
  // 1. マーケットプレイスを開く
  await page.click('[data-testid="open-marketplace"]');
  await page.waitForSelector('[data-testid="marketplace-layouts"]');

  // 2. レイアウトを検索
  await page.fill('[data-testid="search-input"]', "autonomous");
  await page.click('[data-testid="search-button"]');

  // 3. レイアウトをインストール
  await page.click('[data-testid="layout-card"]:first-child');
  await page.click('[data-testid="install-button"]');

  // 4. インストール完了を確認
  await expect(page.locator('[data-testid="install-success"]')).toBeVisible();

  // 5. レイアウトブラウザで確認
  await page.click('[data-testid="open-layout-browser"]');
  const installedLayout = page
    .locator('[data-testid="layout-item"]')
    .filter({ hasText: "Autonomous" });
  await expect(installedLayout).toBeVisible();

  // 6. レイアウトにマーケットプレイスバッジがあることを確認
  await expect(installedLayout.locator('[data-testid="marketplace-badge"]')).toBeVisible();

  // 7. レイアウトを編集
  await installedLayout.click();
  await page.click('[data-testid="edit-layout"]');
  // 編集内容...
  await page.click('[data-testid="save-layout"]');

  // 8. 編集後もマーケットプレイス起源が保持されていることを確認
  await expect(installedLayout.locator('[data-testid="marketplace-badge"]')).toBeVisible();

  // 9. レイアウトを更新（新バージョンをインストール）
  await installedLayout.click('[data-testid="update-button"]');
  await expect(page.locator('[data-testid="update-success"]')).toBeVisible();
});
```

---

## 📈 マイグレーション計画

### フェーズ1: 現在のリリース（即座に実装）

#### 目標

- v1.20.0との基本的な互換性を確保
- マーケットプレイス更新処理の改善

#### 実装内容

1. **LayoutCatalogProviderの更新処理改善**

   ```typescript
   // updateMarketplaceLayoutメソッドを修正
   - 現在: updateLayout() のみ
   - 修正後: updateLayout() + overwriteLayout()
   ```

2. **from フィールドの活用（オプション）**

   ```typescript
   // インストール時にfromフィールドを設定
   from: `marketplace:${detail.id}`;
   ```

3. **テストの追加**
   - マーケットプレイス・v1.20.0統合テスト
   - リモート同期が発生しないことの確認

#### 工数見積

- 実装: 4-6時間
- テスト: 4-6時間
- レビュー・修正: 2-4時間
- **合計: 10-16時間 (約2日)**

### フェーズ2: 次回リリース（2-3ヶ月後）

#### 目標

- ILayoutManagerの拡張
- マーケットプレイス起源情報のより良い統合

#### 実装内容

1. **ILayoutManagerインターフェース拡張**

   ```typescript
   interface ILayoutManager {
     markAsMarketplaceLayout?(layoutId: LayoutID, marketplaceId: string): Promise<void>;
     getMarketplaceOrigin?(layoutId: LayoutID): Promise<string | undefined>;
   }
   ```

2. **LayoutManagerへの実装追加**

   ```typescript
   // LayoutManager.ts
   public async markAsMarketplaceLayout(layoutId: LayoutID, marketplaceId: string): Promise<void> {
     // localStorageまたは別ストレージに保存
   }
   ```

3. **LayoutCatalogProviderのリファクタリング**
   - LayoutManager拡張メソッドの活用
   - ストレージロジックの簡素化

#### 工数見積

- 設計: 8-12時間
- 実装: 16-24時間
- テスト: 12-16時間
- ドキュメント: 4-8時間
- **合計: 40-60時間 (約1-1.5週間)**

### フェーズ3: 将来のリリース（6-12ヶ月後）

#### 目標

- マーケットプレイス起源情報のリモート同期
- LayoutDataへのメタデータ統合

#### 実装内容

1. **IRemoteLayoutStorageの拡張**

   ```typescript
   interface IRemoteLayoutStorage {
     saveMarketplaceOrigin(layoutId: LayoutID, origin: MarketplaceOrigin): Promise<void>;
     getMarketplaceOrigin(layoutId: LayoutID): Promise<MarketplaceOrigin | undefined>;
   }
   ```

2. **LayoutsAPIの実装**

   - 新しいエンドポイントの追加
   - 起源情報の同期ロジック

3. **LayoutData拡張（検討）**
   - metadataフィールドの追加
   - 既存レイアウトのマイグレーション

#### 工数見積

- 設計・仕様策定: 24-40時間
- バックエンドAPI実装: 40-60時間
- フロントエンド実装: 32-48時間
- マイグレーション: 16-24時間
- テスト: 24-40時間
- ドキュメント: 8-16時間
- **合計: 144-228時間 (約3.5-5.5週間)**

---

## 🔄 v1.20.0マージ後の推奨作業フロー

### 1. マージ前の準備

```bash
# 1. 現在のマーケットプレイス機能のテスト
npm run test:marketplace

# 2. 現在の実装をバックアップ
git checkout -b backup/marketplace-pre-v1.20.0

# 3. v1.20.0のブランチを取得
git fetch upstream
git checkout -b feature/merge-v1.20.0 upstream/main
```

### 2. マージ作業

```bash
# 1. v1.20.0をマージ
git merge main

# 2. 競合解決
# - ILayoutStorage関連の型定義
# - LayoutManager利用部分
# - from フィールドの使用箇所

# 3. マージ後のビルド確認
npm run build
```

### 3. 動作確認テスト

```typescript
// テストチェックリスト
describe("Post-v1.20.0 Merge Verification", () => {
  // ✅ マーケットプレイスレイアウトのインストール
  test("Install from marketplace");

  // ✅ インストールしたレイアウトがCREATOR_WRITEであること
  test("Installed layout has CREATOR_WRITE permission");

  // ✅ リモート同期が発生しないこと
  test("No remote sync for marketplace layouts");

  // ✅ マーケットプレイス起源情報が保持されること
  test("Marketplace origin is preserved");

  // ✅ レイアウトの更新が正常に動作すること
  test("Update marketplace layout");

  // ✅ レイアウトの削除が正常に動作すること
  test("Uninstall marketplace layout");
});
```

### 4. 必要な修正の実施

#### A. LayoutCatalogProviderの更新

```typescript
// 修正前
const updateMarketplaceLayout = async (
  layoutId: LayoutID,
  newDetail: LayoutMarketplaceDetail,
): Promise<InstallLayoutResult> => {
  const newLayoutData = await downloadLayoutFromMarketplace(newDetail);
  const updatedLayout = await layoutManager.updateLayout({
    id: layoutId,
    name: existingLayout.name,
    data: newLayoutData,
  });
  // ...
};

// 修正後
const updateMarketplaceLayout = async (
  layoutId: LayoutID,
  newDetail: LayoutMarketplaceDetail,
): Promise<InstallLayoutResult> => {
  const newLayoutData = await downloadLayoutFromMarketplace(newDetail);

  // updateLayout + overwriteLayout の組み合わせ
  await layoutManager.updateLayout({
    id: layoutId,
    name: undefined,
    data: newLayoutData,
  });

  const updatedLayout = await layoutManager.overwriteLayout({ id: layoutId });
  // ...
};
```

#### B. 型定義の更新

```typescript
// v1.20.0の新しい型を利用
import {
  Layout,
  LayoutBaseline,
  LayoutSyncInfo,
  LayoutPermission,
} from "@lichtblick/suite-base/services/ILayoutStorage";

// MarketplaceOriginはそのまま維持
export type MarketplaceOrigin = {
  marketplaceId: string;
  version: string;
  installedAt: string;
  originalUrl: string;
  author?: string;
};
```

### 5. ドキュメントの更新

```markdown
# マーケットプレイス機能ドキュメント更新箇所

1. **v1.20.0対応の記載追加**

   - LayoutManager APIの変更点
   - baseline/working方式への対応
   - リモート同期との関係

2. **実装例の更新**

   - updateMarketplaceLayoutの改善例
   - overwriteLayoutの使用方法

3. **注意事項の追加**
   - CREATOR_WRITEでインストールすること
   - リモート同期が発生しないこと
   - 起源情報は別途管理すること
```

---

## 🎓 学習リソース

### v1.20.0関連ドキュメント

1. **PR #695: Lichtblick Layouts API**

   - URL: https://github.com/lichtblick-suite/lichtblick/pull/695
   - 主な変更点の理解

2. **詳細分析レポート**

   - `docs/releases/v1.20.0-layout-api-detailed-analysis.md`
   - アーキテクチャ詳細、実装パターン

3. **LayoutManager ソースコード**
   - `packages/suite-base/src/services/LayoutManager/LayoutManager.ts`
   - 実装の理解

### マーケットプレイス関連ドキュメント

1. **アーキテクチャドキュメント**

   - `docs/marketplace/architecture/MARKETPLACE_ARCHITECTURE.md`

2. **実装ガイド**

   - `docs/marketplace/guides/layout-documentation.md`

3. **実装ログ**
   - `docs/marketplace/implementation/implementation-log.md`

---

## 💡 まとめと推奨事項

### 主な結論

1. **✅ 基本的に互換性あり**

   - マーケットプレイス機能とv1.20.0は異なるレイヤーで動作
   - 大きな競合は発生しない

2. **🟡 軽微な調整が必要**

   - マーケットプレイス更新処理の改善
   - `overwriteLayout`の活用

3. **🟢 将来の拡張性が向上**
   - v1.20.0の改善がマーケットプレイス機能にも恩恵
   - より堅牢なレイアウト管理が可能に

### 即座に実施すべき対応

1. **updateMarketplaceLayoutの改善** (最優先)

   ```typescript
   await layoutManager.updateLayout({ id, data });
   await layoutManager.overwriteLayout({ id }); // 追加
   ```

2. **統合テストの実施**

   - マーケットプレイス・v1.20.0の連携確認
   - リモート同期が発生しないことの検証

3. **ドキュメントの更新**
   - v1.20.0対応の記載追加
   - 実装例の更新

### 中長期的な検討事項

1. **ILayoutManagerの拡張** (次回リリース)

   - `markAsMarketplaceLayout`メソッドの追加
   - より統合されたマーケットプレイス管理

2. **起源情報のリモート同期** (将来のリリース)

   - 複数デバイス間での起源情報共有
   - バックアップ・復元時の起源情報保持

3. **LayoutDataへのメタデータ統合** (長期計画)
   - より統合されたデータ構造
   - upstreamとの互換性を考慮した設計

### リスク管理

| リスク               | 対策                                   |
| -------------------- | -------------------------------------- |
| マージ時の競合       | 事前にバックアップブランチを作成       |
| 既存機能の破壊       | 包括的な統合テストの実施               |
| パフォーマンス低下   | ベンチマークテストの実施               |
| ユーザーデータの損失 | マイグレーションスクリプトの慎重な設計 |

---

## 📞 サポート・質問

このレポートに関する質問や追加の分析が必要な場合は、以下の情報を提供してください:

- 具体的な実装箇所
- エラーメッセージやログ
- 期待される動作と実際の動作の差異

---

**Document Version**: 1.0.0
**Last Updated**: 2025年10月2日
**Author**: AI Technical Advisor
**Status**: Complete
