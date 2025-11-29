# 環境変数設定 - 実装ログ

## 実施日時

2025年10月3日

## 目的

LichtblickクライアントがローカルまたはカスタムのマーケットプレイスAPIサーバーを使用できるように、環境変数による設定機能を実装する。

## 変更内容

### 1. 環境変数ファイルの作成・更新

#### `.env.example` の更新

**ファイル**: `/Users/sugaiakimasa/apps/lichtblick/.env.example`

**追加した設定:**

```bash
# Base API URL for HTTP requests
API_URL=http://localhost:3001/renderer

# Extension Marketplace fallback URL
EXTENSION_MARKETPLACE_URL=http://localhost:3001/renderer/extensions

# Layout Marketplace fallback URL
LAYOUT_MARKETPLACE_URL=http://localhost:3001/renderer/layouts
```

#### `.env` ファイルの新規作成

**ファイル**: `/Users/sugaiakimasa/apps/lichtblick/.env`

**内容:**

```bash
NODE_ENV=development
API_URL=http://localhost:3001/renderer
EXTENSION_MARKETPLACE_URL=http://localhost:3001/renderer/extensions
LAYOUT_MARKETPLACE_URL=http://localhost:3001/renderer/layouts
LICHTBLICK_ACCOUNT_PROFILE_URL=https://console.lichtblick.io/profile
ELECTRON_DISABLE_SECURITY_WARNINGS=true
AUTO_UPDATE_ENABLED=false
```

### 2. TypeScript型定義の追加

#### `webpack-defines.d.ts` の更新

**ファイル**: `/Users/sugaiakimasa/apps/lichtblick/packages/suite-base/src/typings/webpack-defines.d.ts`

**追加した型定義:**

```typescript
declare const EXTENSION_MARKETPLACE_URL: string | undefined;
declare const LAYOUT_MARKETPLACE_URL: string | undefined;
```

### 3. Webpack設定の更新

#### `webpack.ts` の更新

**ファイル**: `/Users/sugaiakimasa/apps/lichtblick/packages/suite-base/webpack.ts`

**変更内容:**

```typescript
new webpack.DefinePlugin({
  // ... 既存の設定
  EXTENSION_MARKETPLACE_URL: JSON.stringify(process.env.EXTENSION_MARKETPLACE_URL),
  LAYOUT_MARKETPLACE_URL: JSON.stringify(process.env.LAYOUT_MARKETPLACE_URL),
  ...buildEnvVars(),
}),
```

### 4. マーケットプレイスプロバイダーの更新

#### `ExtensionMarketplaceProvider.tsx` の更新

**ファイル**: `/Users/sugaiakimasa/apps/lichtblick/packages/suite-base/src/providers/ExtensionMarketplaceProvider.tsx`

**変更前:**

```typescript
const MARKETPLACE_URL =
  "https://raw.githubusercontent.com/foxglove/studio-extension-marketplace/main/extensions.json";
```

**変更後:**

```typescript
const MARKETPLACE_URL =
  typeof EXTENSION_MARKETPLACE_URL !== "undefined" && EXTENSION_MARKETPLACE_URL
    ? EXTENSION_MARKETPLACE_URL
    : "https://raw.githubusercontent.com/foxglove/studio-extension-marketplace/main/extensions.json";
```

#### `LayoutMarketplaceProvider.tsx` の更新

**ファイル**: `/Users/sugaiakimasa/apps/lichtblick/packages/suite-base/src/providers/LayoutMarketplaceProvider.tsx`

**変更前:**

```typescript
const LAYOUT_MARKETPLACE_URL =
  "https://raw.githubusercontent.com/lichtblick/layout-marketplace/main/layouts.json";
```

**変更後:**

```typescript
const LAYOUT_MARKETPLACE_URL =
  typeof LAYOUT_MARKETPLACE_URL !== "undefined" && LAYOUT_MARKETPLACE_URL
    ? LAYOUT_MARKETPLACE_URL
    : "https://raw.githubusercontent.com/lichtblick/layout-marketplace/main/layouts.json";
```

### 5. ドキュメントの作成

#### API環境設定ガイド

**ファイル**: `/Users/sugaiakimasa/apps/lichtblick/docs/development/api-environment-setup.md`

**内容:**

- 環境変数の説明
- 設定方法
- データフロー図
- トラブルシューティング

## 仕組みの説明

### 環境変数のフロー

```
1. .envファイル
   ↓
2. process.env (Node.js)
   ↓
3. webpack DefinePlugin
   ↓
4. グローバル定数 (ビルド時に埋め込み)
   ↓
5. TypeScript型定義 (webpack-defines.d.ts)
   ↓
6. アプリケーションコード (実行時)
```

### APIアクセスのフロー

#### パターン1: HttpService経由 (推奨)

```
ExtensionMarketplaceProvider
    ↓
ExtensionMarketplaceAPI.getExtensions()
    ↓
HttpService.get("extensions", { namespace: "official" })
    ↓
URL構築: API_URL + "/extensions" + "?namespace=official"
    ↓
fetch("http://localhost:3001/renderer/extensions?namespace=official")
```

#### パターン2: フォールバック (API利用不可時)

```
ExtensionMarketplaceProvider
    ↓
ExtensionMarketplaceAPI.getExtensions() → HttpError
    ↓
Fallback: Direct fetch
    ↓
fetch(EXTENSION_MARKETPLACE_URL)
    ↓
fetch("http://localhost:3001/renderer/extensions")
```

### 環境変数の優先順位

1. **`API_URL`**: HttpServiceで使用される最優先のベースURL

   - 設定されている場合: すべてのAPIリクエストで使用
   - 設定されていない場合: 相対パスまたはフォールバックURLを使用

2. **`EXTENSION_MARKETPLACE_URL`**: 拡張機能マーケットプレイスのフォールバック

   - HttpServiceが失敗した場合のみ使用
   - 直接JSON配列を返すエンドポイントまたはファイル

3. **`LAYOUT_MARKETPLACE_URL`**: レイアウトマーケットプレイスのフォールバック
   - HttpServiceが失敗した場合のみ使用
   - 直接JSON配列を返すエンドポイントまたはファイル

## テスト方法

### 1. サーバーの起動確認

```bash
cd server/express
npm run dev
```

**期待される出力:**

```
🚀 Lichtblick API Server (Express) running on http://localhost:3001
📁 Data directory: /path/to/server/data
🌍 Environment: development
```

### 2. エンドポイントのテスト

```bash
# ヘルスチェック
curl http://localhost:3001/health

# 拡張機能一覧
curl http://localhost:3001/renderer/extensions | jq '.'

# レイアウト一覧
curl http://localhost:3001/renderer/layouts | jq '.'
```

### 3. 環境変数の確認

```bash
# .envファイルの内容を確認
cat .env | grep API_URL
cat .env | grep MARKETPLACE_URL
```

### 4. Lichtblickクライアントでの動作確認

```bash
# プロジェクトルートで
yarn desktop:start
# または
yarn web:start
```

**確認手順:**

1. Lichtblickを起動
2. 設定 → 拡張機能 or レイアウト
3. マーケットプレイスタブを開く
4. ブラウザの開発者ツールでネットワークリクエストを確認
5. `http://localhost:3001/renderer/extensions` へのリクエストを確認
6. データが表示されることを確認

## 利点

### 1. 開発効率の向上

- ローカル環境でマーケットプレイスのテストが可能
- GitHub依存の排除
- 高速なイテレーション

### 2. 柔軟性

- 環境ごとに異なるAPIサーバーを使用可能
- 開発環境、ステージング環境、本番環境の分離
- フォールバック機能による堅牢性

### 3. セキュリティ

- プライベートな拡張機能/レイアウトのホスティング
- アクセス制御の実装が可能
- 組織内限定のマーケットプレイス運用

### 4. パフォーマンス

- ローカルネットワークでの高速アクセス
- キャッシュ制御の最適化
- CDN統合の容易化

## 制限事項と注意点

### 1. ビルド時の埋め込み

- 環境変数はビルド時にコードに埋め込まれる
- 実行時の変更には再ビルドが必要
- 機密情報を含めないこと

### 2. CORSの設定

- ローカル開発では `localhost` 同士なので問題ない
- 本番環境では適切なCORS設定が必要
- Express.jsサーバーでCORSミドルウェアが有効になっていることを確認

### 3. エンドポイントの互換性

- APIサーバーは `/renderer/extensions` および `/renderer/layouts` パスに対応する必要がある
- レスポンス形式は既存のJSON構造と互換性を保つ必要がある

### 4. フォールバック動作

- `API_URL` が設定されている場合でもフォールバックURLは必要
- ネットワークエラー時の代替手段として機能

## 次のステップ

### 短期 (今すぐ実施)

- [x] 環境変数の設定
- [x] 型定義の追加
- [x] プロバイダーの更新
- [ ] Lichtblickクライアントでの動作確認
- [ ] ブラウザの開発者ツールでネットワークリクエストの確認

### 中期 (1週間以内)

- [ ] 本番用APIサーバーのセットアップ
- [ ] デプロイ自動化
- [ ] モニタリングとログの設定
- [ ] パフォーマンステスト

### 長期 (1ヶ月以内)

- [ ] 認証・認可機能の実装
- [ ] CDN統合
- [ ] キャッシュ戦略の最適化
- [ ] 他の実装(Hono, Go)のテストとデプロイ

## 関連ドキュメント

- [API環境設定ガイド](./api-environment-setup.md)
- [Express.js APIテスト結果](../../server/express/API_TEST_RESULTS.md)
- [サーバー実装ガイド](../../server/IMPLEMENTATION_GUIDE.md)
- [README](../../server/README.md)

## まとめ

環境変数による設定機能の実装により、Lichtblickクライアントは柔軟にマーケットプレイスAPIサーバーを切り替えることができるようになりました。

**実装されたファイル:**

1. `.env` - ローカル開発用の環境変数
2. `.env.example` - 環境変数の設定例
3. `webpack-defines.d.ts` - 型定義
4. `webpack.ts` - 環境変数の埋め込み
5. `ExtensionMarketplaceProvider.tsx` - 環境変数の使用
6. `LayoutMarketplaceProvider.tsx` - 環境変数の使用
7. `api-environment-setup.md` - 設定ガイド

**主要な環境変数:**

- `API_URL` - HttpServiceのベースURL (推奨)
- `EXTENSION_MARKETPLACE_URL` - 拡張機能マーケットプレイスのフォールバック
- `LAYOUT_MARKETPLACE_URL` - レイアウトマーケットプレイスのフォールバック

次は、Lichtblickクライアントを起動して、ローカルAPIサーバーからデータが正しく読み込まれるか確認します。
