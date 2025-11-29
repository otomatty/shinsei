# マーケットプレイス機能 ファイル移植ガイド

**作成日**: 2025年10月15日
**対象**: Lichtblickから他プロジェクトへマーケットプレイス機能を移植する開発者
**目的**: 必要なファイルとJSONデータ構造を明確化

---

## 📋 目次

1. [概要](#1-概要)
2. [必要なファイル一覧](#2-必要なファイル一覧)
3. [JSONデータ構造](#3-jsonデータ構造)
4. [Provider統合](#4-provider統合)
5. [環境変数設定](#5-環境変数設定)

---

## 1. 概要

このガイドは、Lichtblickプロジェクトから他プロジェクトへマーケットプレイス機能を移植する際に、どのファイルをコピーすれば良いかを明示します。

### 主要機能

- **拡張機能マーケットプレイス**: `.foxe`形式の拡張機能をインストール・管理
- **レイアウトマーケットプレイス**: 事前設定されたレイアウトをインストール・管理
- **バージョン管理**: 拡張機能の複数バージョンサポート
- **検索・フィルタリング**: タグベース検索、高度なフィルタリング

---

## 2. 必要なファイル一覧

以下のファイルをLichtblickプロジェクトからコピーしてください。

### 2.1 Context & Provider（4ファイル + 4ファイル）

**Context層**:

```
packages/suite-base/src/context/
├── ExtensionMarketplaceContext.ts
├── ExtensionCatalogContext.ts
├── LayoutMarketplaceContext.ts
└── LayoutCatalogContext.ts
```

**Provider層**:

```
packages/suite-base/src/providers/
├── ExtensionMarketplaceProvider.tsx
├── ExtensionCatalogProvider.tsx
├── LayoutMarketplaceProvider.tsx
└── LayoutCatalogProvider.tsx
```

### 2.2 UIコンポーネント

**マーケットプレイス画面（2ファイル + 1ディレクトリ）**:

```
packages/suite-base/src/components/
├── LayoutMarketplaceSettings.tsx
└── ExtensionsSettings/
    ├── ExtensionMarketplaceSettings.tsx
    ├── ExtensionDetail.tsx
    ├── types.ts
    ├── index.style.ts
    ├── components/
    │   └── ExtensionList/
    │       └── ExtensionList.tsx
    └── hooks/
        └── useExtensionSettings.ts
```

**共通UIコンポーネント（1ディレクトリ）**:

```
packages/suite-base/src/components/shared/Marketplace/
├── card/
│   └── MarketplaceCard/                 # カードコンポーネント（全ファイル）
├── layouts/
│   ├── MarketplaceGrid/                 # グリッドレイアウト（全ファイル）
│   └── MarketplaceHeader/               # ヘッダー（全ファイル）
├── version/
│   └── VersionTab/                      # バージョン管理UI（全ファイル）
├── hooks/
│   ├── useMarketplaceSearch.ts
│   └── index.ts
├── utils/
│   ├── format/                          # 日付・ファイルサイズフォーマット
│   ├── version/                         # バージョン管理ユーティリティ
│   ├── filter/                          # フィルタリング
│   ├── search/                          # 検索
│   ├── compatibility/                   # 互換性チェック
│   └── index.ts
├── types.ts
├── index.ts
├── README.md
└── README_ja.md
```

### 2.3 Hooks（5ファイル）

```
packages/suite-base/src/hooks/
├── marketplace/
│   ├── useMarketplaceActions.ts
│   └── useProcessedExtensions.ts
├── useInstalledItems.ts
├── useInstallingLayoutsState.ts
└── useOperationStatus.ts
```

### 2.4 JSONデータファイル（2ファイル）

```
server/assets/
├── extensions/
│   └── extensions.json
└── layouts/
    └── layouts.json
```

**合計ファイル数**: 約70ファイル（ディレクトリ内の全ファイルを含む）

---

## 3. JSONデータ構造

### 3.1 拡張機能カタログ（extensions.json）

実際のファイル構造:

```json
[
  {
    "id": "foxglove.blank-panel-extension",
    "name": "Blank Panel",
    "publisher": "foxglove",
    "description": "Add a little space to your layout",
    "homepage": "https://github.com/foxglove/blank-panel-extension",
    "license": "MIT",
    "tags": ["blank", "panel", "empty", "logo", "spacer"],
    "thumbnail": null,
    "namespace": "official",
    "readme": "https://raw.githubusercontent.com/foxglove/blank-panel-extension/main/README.md",
    "changelog": "https://raw.githubusercontent.com/foxglove/blank-panel-extension/main/CHANGELOG.md",
    "versions": {
      "1.0.0": {
        "version": "1.0.0",
        "publishedDate": "2025-10-04T01:21:25Z",
        "sha256sum": "fa2b11af8ed7c420ca6e541196bca608661c0c1a81cd1f768c565c72a55a63c8",
        "foxe": "https://github.com/foxglove/blank-panel-extension/releases/download/1.0.0/foxglove.blank-panel-extension-1.0.0.foxe"
      }
    }
  }
]
```

**必須フィールド**:

- `id`: 拡張機能のユニークID
- `name`: 表示名
- `publisher`: 公開者名
- `description`: 説明文
- `versions`: バージョンオブジェクト
  - `{version}`: バージョン番号をキーとするオブジェクト
    - `version`: バージョン番号
    - `foxe`: `.foxe`ファイルのダウンロードURL
    - `sha256sum`: ファイルのSHA256ハッシュ
    - `publishedDate`: 公開日時（ISO 8601形式）

**オプションフィールド**:

- `homepage`: ホームページURL
- `license`: ライセンス
- `tags`: タグ配列（検索用）
- `thumbnail`: サムネイル画像URL
- `namespace`: 名前空間
- `readme`: README URL
- `changelog`: CHANGELOG URL

### 3.2 レイアウトカタログ（layouts.json）

実際のファイル構造:

```json
[
  {
    "id": "robotics-dashboard",
    "name": "Robotics Dashboard",
    "publisher": "Robotics Team",
    "description": "A comprehensive dashboard for robotics data visualization",
    "tags": ["robotics", "dashboard", "visualization"],
    "thumbnail": null,
    "layout": "http://localhost:3001/layouts/robotics-dashboard.json"
  }
]
```

**必須フィールド**:

- `id`: レイアウトのユニークID
- `name`: 表示名
- `publisher`: 公開者名
- `description`: 説明文
- `layout`: レイアウトJSONファイルのURL

**オプションフィールド**:

- `tags`: タグ配列（検索用）
- `thumbnail`: サムネイル画像URL

**注意**: レイアウトはバージョン管理を行わない（シンプルな単一バージョン）

---

## 4. Provider統合

### 4.1 App.tsx への統合

Provider を以下の順序でラップします:

```typescript
// App.tsx
import { ExtensionMarketplaceProvider } from "./providers/ExtensionMarketplaceProvider";
import { ExtensionCatalogProvider } from "./providers/ExtensionCatalogProvider";
import { LayoutMarketplaceProvider } from "./providers/LayoutMarketplaceProvider";
import { LayoutCatalogProvider } from "./providers/LayoutCatalogProvider";

// Provider の順序（依存関係）
function App() {
  return (
    <ExtensionMarketplaceProvider>
      <ExtensionCatalogProvider>
        <LayoutMarketplaceProvider>
          <LayoutCatalogProvider>
            {/* アプリケーションコンテンツ */}
          </LayoutCatalogProvider>
        </LayoutMarketplaceProvider>
      </ExtensionCatalogProvider>
    </ExtensionMarketplaceProvider>
  );
}
```

### 4.2 依存関係

- `ExtensionCatalogProvider` は `ExtensionMarketplaceProvider` に依存
- `LayoutCatalogProvider` は `LayoutMarketplaceProvider` に依存
- 拡張機能とレイアウトは互いに独立

---

## 5. 環境変数設定

### 5.1 必須環境変数

```bash
# 拡張機能マーケットプレイスURL
EXTENSION_MARKETPLACE_URL=https://your-domain.com/extensions/extensions.json

# レイアウトマーケットプレイスURL
LAYOUT_MARKETPLACE_URL=https://your-domain.com/layouts/layouts.json
```

### 5.2 開発環境の設定例

```bash
# .env.development
EXTENSION_MARKETPLACE_URL=http://localhost:3001/extensions/extensions.json
LAYOUT_MARKETPLACE_URL=http://localhost:3001/layouts/layouts.json
```

### 5.3 本番環境の設定例

```bash
# .env.production
EXTENSION_MARKETPLACE_URL=https://marketplace.your-app.com/extensions/extensions.json
LAYOUT_MARKETPLACE_URL=https://marketplace.your-app.com/layouts/layouts.json
```

---

## 6. 静的ファイル配信設定

### 6.1 ファイル配置

JSONファイルとレイアウトファイルを以下のように配置:

```
public/
└── marketplace/
    ├── extensions/
    │   └── extensions.json
    └── layouts/
        ├── layouts.json
        ├── robotics-dashboard.json
        ├── autonomous-vehicle-layout.json
        └── ...
```

---

## 7. チェックリスト

移植作業のチェックリスト:

- [ ] **Step 1**: Context & Provider ファイルをコピー（8ファイル）
- [ ] **Step 2**: UIコンポーネントをコピー（約60ファイル）
- [ ] **Step 3**: Hooks をコピー（5ファイル）
- [ ] **Step 4**: JSONデータファイルを作成・配置（2ファイル）
- [ ] **Step 5**: Provider を App.tsx に統合
- [ ] **Step 6**: 環境変数を設定
- [ ] **Step 7**: JSONファイルをHTTPSで配信できるように設定
- [ ] **Step 8**: ビルドしてエラーがないことを確認
- [ ] **Step 9**: マーケットプレイス画面を開いてデータが表示されることを確認
- [ ] **Step 10**: 拡張機能・レイアウトのインストールをテスト

---

## 8. トラブルシューティング

### 問題1: CORS エラー

**症状**: マーケットプレイスAPIへのアクセスがブロックされる

**解決策**:

- サーバー側でCORSヘッダーを設定
- 同一オリジンで配信する
- プロキシを経由させる

### 問題2: JSONファイルが読み込めない

**症状**: `Failed to fetch extensions`エラー

**解決策**:

- URL が正しいことを確認
- ファイルが実際に存在することを確認
- ネットワークタブでHTTPステータスコードを確認

### 問題3: 拡張機能がインストールできない

**症状**: インストールボタンを押してもエラー

**解決策**:

- ブラウザのコンソールでエラーメッセージを確認
- IndexedDBが利用可能か確認
- `.foxe`ファイルがダウンロード可能か確認

---

## 9. 参考情報

### ドキュメント

- **Lichtblick マーケットプレイスアーキテクチャ**: `docs/04_implementation/marketplace/architecture/MARKETPLACE_ARCHITECTURE.md`
- **マーケットプレイス機能一覧**: `docs/04_implementation/marketplace/MARKETPLACE_FEATURES.md`
- **実装詳細調査レポート**: `docs/07_research/2025_10/20251014/marketplace-implementation-structure-investigation.md`

### 実装例

- **ExtensionMarketplaceSettings**: `packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx`
- **LayoutMarketplaceSettings**: `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`

---

**最終更新**: 2025年10月15日
**バージョン**: 1.0.0
