# Lichtblick レイアウトシステム 調査報告書

## 1. 現在のレイアウトシステム概要

### 1.1 基本アーキテクチャ

現在のLichtblickレイアウトシステムは、以下の階層構造で実装されている：

```
ユーザーインターフェース層
├── LayoutBrowser (左サイドバーのLayoutタブ)
├── LayoutSection (Personal/Shared レイアウト表示)
└── LayoutRow (個別レイアウト項目)

管理層
├── LayoutManager (高レベルインターフェース)
├── CurrentLayoutProvider (現在のレイアウト状態管理)
└── LayoutManagerContext (Context API)

ストレージ層
├── ILayoutStorage (ストレージインターフェース)
├── IdbLayoutStorage (IndexedDB実装)
└── RemoteLayoutStorage (リモートストレージ)
```

### 1.2 レイアウトデータ構造

```typescript
interface Layout {
  id: LayoutID; // 一意識別子
  name: string; // レイアウト名
  from?: string; // 元レイアウト（複製時）
  permission: LayoutPermission; // 権限管理

  // バージョン管理
  baseline: LayoutBaseline; // 保存済みバージョン
  working: LayoutBaseline | undefined; // 編集中ワーキングコピー

  // 同期管理
  syncInfo: LayoutSyncInfo | undefined; // リモート同期情報
}

interface LayoutBaseline {
  data: LayoutData; // 実際のレイアウトデータ
  savedAt: ISO8601Timestamp | undefined; // 保存日時
}

type LayoutPermission =
  | "CREATOR_WRITE" // 作成者のみ編集可能
  | "ORG_READ" // 組織読み取り専用
  | "ORG_WRITE"; // 組織編集可能

type LayoutSyncStatus =
  | "new" // 新規作成
  | "updated" // 更新済み
  | "tracked" // 同期済み
  | "locally-deleted" // ローカル削除
  | "remotely-deleted"; // リモート削除
```

### 1.3 ストレージシステム

#### IndexedDB実装

```typescript
// データベース構造
Database: "foxglove-layouts"
├── ObjectStore: "layouts"
│   ├── KeyPath: ["namespace", "layout.id"]
│   └── Index: "namespace"
└── 容量: 制限なし（ユーザー許可により拡張可能）

// 名前空間の例
- "local": ローカル専用レイアウト
- "user-{id}": ユーザー個人レイアウト
- "org-{id}": 組織共有レイアウト
- "temp": 一時的なレイアウト
```

## 2. 左サイドバーのLayoutタブ実装

### 2.1 サイドバー構成

**ファイル**: `packages/suite-base/src/Workspace.tsx`

```typescript
const leftSidebarItems = useMemo(() => {
  const items = new Map<LeftSidebarItemKey, SidebarItem>([
    ["panel-settings", { title: "Panel", component: PanelSettingsSidebar }],
    ["topics", { title: "Topics", component: TopicList }],
    ["alerts", { title: "Alerts", component: AlertsList, badge: ... }],
    ["layouts", { title: "Layouts", component: LayoutBrowser }], // ← レイアウトタブ
  ]);
  return items;
}, [PanelSettingsSidebar, playerAlerts]);
```

### 2.2 LayoutBrowserコンポーネント

**ファイル**: `packages/suite-base/src/components/LayoutBrowser/index.tsx`

#### 主要機能

- **レイアウト一覧表示**: Personal/Shared レイアウトの分類表示
- **CRUD操作**: Create, Read, Update, Delete
- **インポート/エクスポート**: .jsonファイルとの入出力
- **複製機能**: 既存レイアウトのコピー作成
- **権限管理**: 共有レイアウトの権限制御

#### UI構成

```typescript
<SidebarContent title="Layouts">
  {/* ツールバー */}
  <IconButton>Add Layout</IconButton>
  <IconButton>Import Layout</IconButton>

  {/* レイアウトセクション */}
  <LayoutSection title="Personal" items={personalLayouts} />
  <LayoutSection title="Shared" items={sharedLayouts} />
</SidebarContent>
```

### 2.3 レイアウト操作

#### 基本操作

- **新規作成**: 現在のレイアウトから新しいレイアウトを保存
- **選択**: レイアウトの切り替え
- **編集**: レイアウト名の変更、設定の更新
- **削除**: レイアウトの削除（権限チェック付き）
- **複製**: 既存レイアウトのコピー作成

#### 高度な操作

- **共有**: 個人レイアウトを組織共有に変更
- **個人コピー作成**: 共有レイアウトの個人コピー作成
- **上書き保存**: 編集内容をベースラインに反映
- **復元**: ワーキングコピーをベースラインに戻す

## 3. レイアウトマネージャーシステム

### 3.1 ILayoutManagerインターフェース

**ファイル**: `packages/suite-base/src/services/ILayoutManager.ts`

```typescript
interface ILayoutManager {
  // 状態管理
  readonly supportsSharing: boolean;
  readonly isBusy: boolean;
  readonly isOnline: boolean;
  readonly error: undefined | Error;

  // 基本操作
  getLayouts(): Promise<readonly Layout[]>;
  getLayout(id: LayoutID): Promise<Layout | undefined>;
  saveNewLayout(params: {
    name: string;
    data: LayoutData;
    permission: LayoutPermission;
  }): Promise<Layout>;

  updateLayout(params: { id: LayoutID; name?: string; data?: LayoutData }): Promise<Layout>;

  deleteLayout(params: { id: LayoutID }): Promise<void>;

  // 高度な操作
  overwriteLayout(params: { id: LayoutID }): Promise<Layout>;
  revertLayout(params: { id: LayoutID }): Promise<Layout>;

  // イベント管理
  on<E>(name: E, listener: EventListener): void;
  off<E>(name: E, listener: EventListener): void;
}
```

### 3.2 イベントシステム

```typescript
type LayoutManagerEventTypes = {
  busychange: () => void;
  change: (event: {
    type: "layout-created" | "layout-updated" | "layout-deleted";
    updatedLayout: Layout;
  }) => void;
  errorchange: () => void;
};
```

## 4. レイアウトの同期・共有システム

### 4.1 権限管理

```typescript
// 権限の種類
- CREATOR_WRITE: 作成者のみ編集可能（個人レイアウト）
- ORG_READ: 組織内読み取り専用（共有レイアウト）
- ORG_WRITE: 組織内編集可能（共有レイアウト）

// 権限チェック
function layoutPermissionIsShared(permission: LayoutPermission): boolean {
  return permission !== "CREATOR_WRITE";
}
```

### 4.2 同期状態管理

```typescript
// 同期状態の遷移
new → tracked: 初回リモート保存完了
tracked → updated: ローカル編集発生
updated → tracked: リモート同期完了
tracked → locally-deleted: ローカル削除
tracked → remotely-deleted: リモート削除検出
```

## 5. 現在の制限事項と課題

### 5.1 レイアウト管理の制限

1. **バージョン管理不足**

   - 同一レイアウトの複数バージョン並列管理不可
   - バージョン履歴・タグ付け機能なし
   - ロールバック機能の限定性

2. **配布システムの不備**

   - 中央集権的なマーケットプレイス機能なし
   - レイアウトの発見性が低い
   - インストール・アンインストール機能なし

3. **メタデータ管理の不足**
   - レイアウトの説明・タグ・カテゴリなし
   - スクリーンショット・プレビュー機能なし
   - 作成者情報・ライセンス情報なし

### 5.2 ユーザビリティの課題

1. **検索・フィルタリング機能不足**

   - レイアウト検索機能なし
   - カテゴリ・タグでのフィルタリングなし
   - 人気・評価による並び替えなし

2. **共有機能の限定性**
   - 組織外へのレイアウト共有困難
   - パブリックレイアウトの概念なし
   - コミュニティベースの共有機能なし

## 6. レイアウトマーケットプレイス機能の実装方針

### 6.1 基本コンセプト

拡張機能システムと同様の設計思想で、レイアウトマーケットプレイス機能を実装：

1. **独立した名前空間**: `"sora-marketplace"` で既存システムと分離
2. **複数バージョン管理**: 同一レイアウトの複数バージョン並列管理
3. **中央集権的カタログ**: パブリックレイアウトの中央管理
4. **既存システム共存**: 既存レイアウト機能への影響なし

### 6.2 拡張されるレイアウト情報構造

```typescript
interface SoraLayoutInfo extends Layout {
  // バージョン管理
  id: string; // "publisher.name@version"
  baseId: string; // "publisher.name"
  version: string; // "1.0.0"
  semver: SemVer; // パース済みバージョン

  // マーケットプレイス情報
  namespace: "sora-marketplace";
  publisher: string; // 公開者
  description?: string; // レイアウト説明
  tags?: string[]; // タグベース分類
  license?: string; // ライセンス情報
  homepage?: string; // ホームページURL

  // メタデータ
  screenshots?: string[]; // スクリーンショットURL
  readme?: string; // README URL
  changelog?: string; // CHANGELOG URL

  // 拡張機能依存関係
  extensions?: {
    required?: string[]; // 必須拡張機能（baseId形式）
    optional?: string[]; // 推奨拡張機能（baseId形式）
  };

  // 管理情報
  isActive: boolean; // アクティブバージョンか
  installDate: Date; // インストール日時
  publishDate: Date; // 公開日時
}
```

### 6.3 ストレージシステム拡張

#### Web版（IndexedDB）

```typescript
interface SoraLayoutMarketplaceDB extends IDB.DBSchema {
  // バージョン付きメタデータ
  metadata: {
    key: string; // "publisher.name@version"
    value: SoraLayoutInfo;
  };

  // バージョン付きレイアウトデータ
  layouts: {
    key: string; // "publisher.name@version"
    value: StoredSoraLayout;
  };

  // バージョン管理インデックス
  versionIndex: {
    key: string; // "publisher.name"
    value: SoraLayoutVersionIndex;
  };

  // タグインデックス
  tagIndex: {
    key: string; // tag name
    value: string[]; // layout base IDs
  };

  // 拡張機能依存関係インデックス
  extensionDependencyIndex: {
    key: string; // extension base ID
    value: string[]; // dependent layout base IDs
  };
}
```

### 6.4 UI統合方針

#### 既存LayoutBrowserの拡張

```typescript
// 新しいタブを追加
const layoutTabs = [
  { label: "Personal", value: "personal" },
  { label: "Shared", value: "shared" },
  { label: "Marketplace", value: "marketplace" }, // 新規追加
];

// マーケットプレイス専用コンポーネント
<LayoutSection
  title="Marketplace"
  items={marketplaceLayouts}
  onInstall={handleInstallLayout}
  onUninstall={handleUninstallLayout}
  onVersionSwitch={handleVersionSwitch}
/>
```

#### マーケットプレイス専用機能

- **検索・フィルタリング**: タグ、キーワードによる絞り込み
- **プレビュー機能**: レイアウトのスクリーンショット表示
- **バージョン管理**: 複数バージョンの表示・切り替え
- **インストール管理**: ワンクリックインストール・アンインストール
- **依存関係管理**: 必須・推奨拡張機能の表示と自動インストール提案

### 6.5 API設計

#### マーケットプレイスAPI

```typescript
interface SoraLayoutMarketplace {
  // 基本検索機能
  getAvailableLayouts(): Promise<SoraLayoutInfo[]>;
  searchLayouts(query: string): Promise<SoraLayoutInfo[]>;
  getLayoutsByTag(tag: string): Promise<SoraLayoutInfo[]>;
  getLayoutsByExtension(extensionBaseId: string): Promise<SoraLayoutInfo[]>;

  // レイアウト詳細
  getLayoutDetail(baseId: string): Promise<SoraLayoutDetail>;
  getLayoutVersions(baseId: string): Promise<SoraLayoutInfo[]>;
  getLayoutReadme(url: string): Promise<string>;

  // インストール管理
  downloadLayout(url: string): Promise<ArrayBuffer>;
  installLayout(data: ArrayBuffer): Promise<SoraLayoutInfo>;
  uninstallLayout(id: string): Promise<void>;

  // バージョン管理
  setActiveVersion(baseId: string, version: string): Promise<void>;
  getActiveVersion(baseId: string): Promise<SoraLayoutInfo | undefined>;

  // 依存関係管理
  checkExtensionDependencies(layout: SoraLayoutInfo): Promise<{
    missing: string[]; // 不足している拡張機能
    available: string[]; // インストール可能な拡張機能
  }>;
  installLayoutWithDependencies(layout: SoraLayoutInfo): Promise<{
    layout: SoraLayoutInfo;
    installedExtensions: string[];
  }>;
}
```

#### サーバーサイドAPI

```typescript
// GET /api/layouts
interface LayoutCatalog {
  layouts: {
    [baseId: string]: {
      name: string;
      description: string;
      publisher: string;
      tags: string[];
      license: string;

      // 拡張機能依存関係
      extensions?: {
        required?: string[];
        optional?: string[];
      };

      versions: {
        [version: string]: {
          version: string;
          layout: string; // レイアウトファイルURL
          sha256sum: string; // ハッシュ
          readme?: string; // README URL
          changelog?: string; // CHANGELOG URL
          screenshots: string[]; // スクリーンショットURL
          publishDate: string;
        };
      };

      latest: string; // 最新バージョン
      featured?: boolean; // 注目レイアウト
    };
  };
  tags: string[]; // 利用可能タグ
  extensionDependencies: string[]; // 依存関係のある拡張機能リスト
  statistics: {
    totalLayouts: number;
    featuredLayouts: string[];
    mostUsedTags: { tag: string; count: number }[];
  };
}
```

## 7. 実装の利点と課題

### 7.1 利点

1. **既存システム保護**: 独立した名前空間で既存機能への影響なし
2. **段階的導入**: 既存レイアウトシステムと並行運用可能
3. **拡張性**: 将来的な機能追加に柔軟対応
4. **ユーザビリティ向上**: レイアウトの発見性・共有性大幅改善

### 7.2 課題

1. **データ移行**: 既存レイアウトのマーケットプレイス形式への変換
2. **UI複雑化**: タブ追加によるインターフェース複雑化
3. **ストレージ使用量**: 複数バージョン保持による容量増大
4. **同期複雑性**: リモートマーケットプレイスとの同期処理

## 8. 次のステップ

1. **詳細設計**: SoraLayoutLoader、SoraLayoutStorage実装設計
2. **プロトタイプ開発**: 基本機能のプルーフオブコンセプト
3. **UI/UX設計**: マーケットプレイス統合後のユーザー体験設計
4. **サーバー設計**: レイアウト配布サーバーのアーキテクチャ設計

---

この調査により、現在のレイアウトシステムは拡張機能システムと類似した構造を持ち、マーケットプレイス機能の追加が技術的に実現可能であることが確認された。独立した名前空間とバージョン管理システムを導入することで、既存システムへの影響を最小化しながら、レイアウト共有・配布機能を大幅に向上させることができる。
