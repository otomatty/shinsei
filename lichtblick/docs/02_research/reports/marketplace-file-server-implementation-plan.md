# マーケットプレイス ファイルサーバー実装計画

> **作成日**: 2025年10月9日
> **ステータス**: 📋 計画策定完了
> **目的**: マーケットプレイス機能のためのシンプルなファイルサーバー実装方針の決定

## 📊 現状分析

### 1. 現在の実装状況

#### アプリケーション側

- ✅ JSONファイルを直接fetchする実装が完成
- ✅ フォールバックURLからのダウンロード機能実装済み
- ✅ 環境変数による設定変更に対応
  - `EXTENSION_MARKETPLACE_URL`
  - `LAYOUT_MARKETPLACE_URL`

#### サーバー側

- ✅ `server/assets/` に静的ファイルが配置済み
  - `server/assets/extensions/extensions.json`
  - `server/assets/layouts/layouts.json`
  - 各種レイアウトファイル
- ❌ サーバー実装ファイルが未作成
  - `server/package.json` なし
  - `server/server.js` なし

#### データ構造

- ✅ Extensions JSON: マルチバージョン対応の型定義済み
- ✅ Layouts JSON: 外部ファイル参照の型定義済み
- ✅ 既存JSONファイルはv2スキーマに準拠

### 2. アプリ側の実装パターン

```typescript
// ExtensionMarketplaceProvider.tsx
const EXTENSION_MARKETPLACE_FALLBACK_URL: string =
  typeof EXTENSION_MARKETPLACE_URL !== "undefined" && EXTENSION_MARKETPLACE_URL.length > 0
    ? EXTENSION_MARKETPLACE_URL
    : "https://raw.githubusercontent.com/foxglove/studio-extension-marketplace/main/extensions.json";

// 直接fetch実装
const res = await fetch(EXTENSION_MARKETPLACE_FALLBACK_URL);
const data = (await res.json()) as ExtensionMarketplaceDetail[];
```

**重要な特徴**:

- APIエンドポイント不要
- 静的JSONファイルを直接fetch
- CORS対応が必要
- 環境変数で簡単に切り替え可能

## 🎯 推奨実装方針

### オプション1: Node.js シンプルHTTPサーバー（推奨）

**メリット**:

- ✅ 最小限の実装で完了
- ✅ 依存関係ほぼゼロ
- ✅ CORS設定が簡単
- ✅ 開発環境で即座に動作
- ✅ S3/CloudFrontへの移行が容易

**実装内容**:

```
server/
├── package.json          # 最小限の設定
├── server.js            # シンプルなHTTPサーバー
└── assets/              # 静的ファイル（既存）
    ├── extensions/
    │   └── extensions.json
    └── layouts/
        ├── layouts.json
        └── *.json
```

**サーバー機能**:

- 静的ファイル配信のみ
- CORS有効化
- ポート3001（開発用）

### オプション2: http-server パッケージ利用（最も簡単）

**メリット**:

- ✅ サーバーコード書く必要なし
- ✅ 1コマンドで起動
- ✅ CORS標準サポート

**実装内容**:

```json
// package.json
{
  "scripts": {
    "start": "http-server assets -p 3001 --cors"
  },
  "dependencies": {
    "http-server": "^14.1.1"
  }
}
```

### オプション3: Vercel/Netlify 静的ホスティング（本番向け）

**メリット**:

- ✅ 完全に管理不要
- ✅ CDN自動配信
- ✅ HTTPS自動

**実装内容**:

- `server/assets` をそのままデプロイ
- 環境変数で本番URLを指定

## 📋 実装ステップ

### Phase 1: ローカル開発サーバー構築（推奨実装）

#### ステップ1: package.json作成

```json
{
  "name": "@lichtblick/marketplace-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "http-server": "^14.1.1"
  }
}
```

#### ステップ2: server.js作成（最小実装）

```javascript
import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT || 3001;
const ASSETS_DIR = join(__dirname, "assets");

const MIME_TYPES = {
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  // CORS対応
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  try {
    const filePath = join(ASSETS_DIR, req.url.slice(1));
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(PORT, () => {
  console.log(`Marketplace server running at http://localhost:${PORT}`);
});
```

#### ステップ3: 環境変数設定

```bash
# .env.local または開発環境設定
EXTENSION_MARKETPLACE_URL=http://localhost:3001/extensions/extensions.json
LAYOUT_MARKETPLACE_URL=http://localhost:3001/layouts/layouts.json
```

#### ステップ4: 起動確認

```bash
cd server
npm install
npm start

# 別ターミナルで確認
curl http://localhost:3001/extensions/extensions.json
curl http://localhost:3001/layouts/layouts.json
```

### Phase 2: 本番環境準備（将来）

#### オプションA: AWS S3 + CloudFront

1. S3バケット作成
2. `server/assets/` の内容をアップロード
3. CloudFront設定（CORS有効化）
4. 環境変数を本番URLに変更

#### オプションB: Vercel静的ホスティング

1. `server/` をGitHubにプッシュ
2. Vercelプロジェクト作成
3. 自動デプロイ設定
4. 環境変数を本番URLに変更

## 🔍 実装上の考慮事項

### 1. CORS設定は必須

アプリ側がブラウザから直接fetchするため、サーバー側でCORS有効化が必須

### 2. ファイル配置は本番を想定

`server/assets/` の構造は、そのままS3にアップロードできる形式

### 3. 環境変数による切り替え

開発・ステージング・本番で簡単に切り替え可能

### 4. API実装は不要

- 検索・フィルタリング → アプリ側で実装済み
- ダウンロード → 直接URLにアクセス
- 認証・認可 → 不要（公開データ）

## 📦 依存関係の最小化

### 必要なもの

- Node.js v18+ （標準HTTPサーバー）
- http-server （オプション）

### 不要なもの

- Express / Fastify / Hono
- データベース
- 認証システム
- REST APIフレームワーク
- GraphQL
- バックエンドロジック

## ✅ 次のアクション

### 即座に実施すべき項目

1. `server/package.json` 作成
2. `server/server.js` 作成（上記の実装例）
3. ローカルで起動確認
4. 環境変数設定
5. アプリ側から接続テスト

### 将来的な検討事項

1. 本番環境の選定（S3 or Vercel）
2. CDN設定
3. キャッシュ戦略
4. バージョニング戦略

## 🎓 まとめ

### 推奨アプローチ

**「最小限のNode.js HTTPサーバー」または「http-serverパッケージ」**

理由:

- アプリ側がJSONを直接fetchする実装済み
- API不要
- 静的ファイル配信のみで十分
- S3/Vercelへの移行が容易
- 依存関係最小
- 実装時間最短

### 実装優先度

1. ✅ ローカル開発サーバー（今すぐ）
2. ⏭️ 本番デプロイ（機能完成後）
3. ⏭️ CDN最適化（スケール時）

---

**次のステップ**: 「実装」と指示してください。上記の推奨実装を進めます。
