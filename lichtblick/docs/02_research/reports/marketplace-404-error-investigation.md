# マーケットプレイス 404 エラー調査レポート

**調査日時**: 2025年10月9日
**問題**: マーケットプレイスアクセス時に404エラーが発生

## 問題の概要

ブラウザでマーケットプレイスにアクセスすると、以下のエラーが発生：

```
Failed to load resource: the server responded with a status of 404 (Not Found)
```

## 調査結果

### 1. サーバーの稼働状況

✅ **サーバーは正常に起動している**

- ポート3001でNode.jsプロセスが稼働中
- `lsof -i :3001` で確認済み

### 2. エンドポイントの不一致

#### サーバー側（実際の実装）

- **ファイルパス**: `/extensions/extensions.json`
- **URL**: `http://localhost:3001/extensions/extensions.json`
- **テスト結果**: ✅ 200 OK（データ取得成功）

```bash
$ curl http://localhost:3001/extensions/extensions.json
# → 正常にJSONデータを返す
```

#### クライアント側（.envの設定）

- **環境変数**: `EXTENSION_MARKETPLACE_URL=http://localhost:3001/renderer/extensions`
- **期待するパス**: `/renderer/extensions`
- **テスト結果**: ❌ 404 Not Found

```bash
$ curl http://localhost:3001/renderer/extensions
# → 404 Not Found
```

### 3. サーバー実装の確認

`server/server.js` の実装を確認：

```javascript
// 実際のディレクトリ構造
const ASSETS_DIR = join(currentDir, "assets");

// assets/
//   ├── extensions/
//   │   └── extensions.json
//   └── layouts/
//       └── layouts.json
```

サーバーは `assets/` ディレクトリをルートとして静的ファイルを提供しているため、`/renderer/` というパスは存在しない。

### 4. 環境変数の設定

`.env` ファイルの現在の設定：

```properties
# 間違った設定（サーバーに /renderer/ パスが存在しない）
EXTENSION_MARKETPLACE_URL=http://localhost:3001/renderer/extensions

# 間違った設定
LAYOUT_MARKETPLACE_URL=http://localhost:3001/renderer/layouts
```

## 根本原因

**環境変数のURLパスとサーバーの実際のファイル構造が一致していない**

- `.env`: `/renderer/extensions` を期待
- サーバー: `/extensions/extensions.json` を提供
- 結果: パスが見つからず404エラー

## 解決策

### オプション1: 環境変数を修正（推奨）

`.env` ファイルを以下のように修正：

```properties
# 修正後（サーバーの実際のパスに合わせる）
EXTENSION_MARKETPLACE_URL=http://localhost:3001/extensions/extensions.json
LAYOUT_MARKETPLACE_URL=http://localhost:3001/layouts/layouts.json
```

### オプション2: サーバー側にエイリアス追加

`server/server.js` に `/renderer/` パスのエイリアスを追加：

```javascript
// URL rewriting for /renderer/ paths
let urlPath = req.url === "/" ? "/index.html" : req.url;

// Add aliases for /renderer/ paths
if (urlPath.startsWith("/renderer/extensions")) {
  urlPath = "/extensions/extensions.json";
} else if (urlPath.startsWith("/renderer/layouts")) {
  urlPath = "/layouts/layouts.json";
}

const filePath = join(ASSETS_DIR, urlPath.slice(1));
```

### オプション3: ディレクトリ構造を変更

`server/assets/` の構造を変更：

```
assets/
  └── renderer/
      ├── extensions/
      │   └── extensions.json (実際はextensions.jsonを指すエイリアス)
      └── layouts/
          └── layouts.json (実際はlayouts.jsonを指すエイリアス)
```

## 推奨される対応

**オプション1（環境変数の修正）が最もシンプルで推奨**

理由：

1. サーバーコードの変更が不要
2. ディレクトリ構造の変更が不要
3. 設定ファイルのみの修正で完結
4. 既存の実装との整合性が保たれる

## 次のアクション

1. `.env` ファイルの修正
2. 開発サーバーの再起動（環境変数を再読み込み）
3. マーケットプレイスへの再アクセスで確認

## 補足情報

### サーバーのログメッセージ

サーバー起動時のログには以下のように表示されている：

```
Available endpoints:
  📦 Extensions: http://localhost:3001/extensions/extensions.json
  🎨 Layouts:    http://localhost:3001/layouts/layouts.json
```

この情報からも、正しいパスは `/extensions/extensions.json` であることが分かる。

### 関連ファイル

- **サーバー実装**: `server/server.js`
- **環境変数設定**: `.env`
- **拡張機能データ**: `server/assets/extensions/extensions.json`
- **レイアウトデータ**: `server/assets/layouts/layouts.json`
- **Provider実装**: `packages/suite-base/src/providers/ExtensionMarketplaceProvider.tsx`
