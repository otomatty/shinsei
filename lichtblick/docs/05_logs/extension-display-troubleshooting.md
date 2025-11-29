# 拡張機能が表示されない問題のトラブルシューティング

## 実施日時

2025年10月3日

## 問題の概要

Lichtblickクライアントで**レイアウトは4つ表示されるが、拡張機能が0個**という状態。

## 原因分析

### 1. Namespace フィルタリングの問題

**発見した問題:**

- `ExtensionMarketplaceAPI`が`namespace: "official"`パラメータでリクエスト
- サンプルデータの拡張機能に`namespace`フィールドが未設定（2つ）または`"org"`（1つ）
- サーバー側のフィルタリング関数が`namespace`未設定の場合`"default"`として扱う
- `namespace=official`でフィルタリングすると0件になる

**確認コマンド:**

```bash
# namespace未指定 → 3件返却
curl -s 'http://localhost:3001/renderer/extensions' | jq 'length'
# 出力: 3

# namespace=official → 0件返却（修正前）
curl -s 'http://localhost:3001/renderer/extensions?namespace=official' | jq 'length'
# 出力: 0
```

### 2. レイアウトは表示される理由

- `LayoutMarketplaceProvider`は現在、HttpServiceではなく直接`fetch()`を使用
- フォールバックURL（`LAYOUT_MARKETPLACE_URL`）に直接アクセス
- `namespace`パラメータを付与していない
- → サーバーは全レイアウトを返す

## 実施した修正

### 修正1: サンプルデータに`namespace: "official"`を追加

**ファイル:** `/server/data/extensions.json`

**変更内容:**

```json
// 修正前
{
  "id": "custom.sample-extension",
  "name": "Sample Extension",
  ...
  // namespaceフィールドなし
}

// 修正後
{
  "id": "custom.sample-extension",
  "name": "Sample Extension",
  ...
  "namespace": "official"  // 追加
}
```

**対象:**

- `custom.sample-extension` → `namespace: "official"`追加
- `developer.debug-panel` → `namespace: "official"`追加
- `organization.internal-tool` → 既存の`namespace: "org"`を維持

### 修正2: サーバー側のフィルタリングロジック改善

**ファイル:** `/server/express/src/index.ts`

**変更内容:**

```typescript
// 修正前
function filterByNamespace(items: Extension[], namespace?: string): Extension[] {
  if (!namespace || namespace === "all") {
    return items;
  }
  return items.filter((item) => (item.namespace || "default") === namespace);
}

// 修正後
function filterByNamespace(items: Extension[], namespace?: string): Extension[] {
  if (!namespace || namespace === "all" || namespace === "") {
    return items;
  }
  return items.filter((item) => (item.namespace || "official") === namespace);
}
```

**変更点:**

1. `namespace === ""`（空文字列）の場合もすべて返す
2. デフォルトの`namespace`を`"default"`→`"official"`に変更

## 修正後の動作確認

```bash
# namespace=officialで2件返却されるようになった
curl -s 'http://localhost:3001/renderer/extensions?namespace=official' | jq 'length'
# 出力: 2

# 返却される拡張機能
curl -s 'http://localhost:3001/renderer/extensions?namespace=official' | jq '.[] | {id: .id, namespace: .namespace}'
# 出力:
# {
#   "id": "custom.sample-extension",
#   "namespace": "official"
# }
# {
#   "id": "developer.debug-panel",
#   "namespace": "official"
# }
```

## 動作確認手順

### 1. サーバー側の確認

```bash
# Express.jsサーバーが起動しているか
lsof -i :3001 | grep LISTEN

# エンドポイントのテスト
curl -s 'http://localhost:3001/renderer/extensions?namespace=official' | jq '.'
```

### 2. クライアント側の確認

#### Webアプリの場合

1. ブラウザでLichtblickを開く
2. F12で開発者ツールを開く
3. Networkタブを選択
4. 拡張機能/レイアウトの設定画面を開く
5. 以下のリクエストを確認:
   - `http://localhost:3001/renderer/extensions?namespace=official`
   - `http://localhost:3001/renderer/layouts`

#### デスクトップアプリの場合

1. アプリを完全に終了
2. `yarn desktop:start`で再起動
3. View → Developer Tools を開く
4. Networkタブで同様に確認

### 3. 環境変数の確認

```bash
# .envファイルの内容確認
cat .env | grep -E "API_URL|MARKETPLACE_URL"

# 期待される出力:
# API_URL=http://localhost:3001/renderer
# EXTENSION_MARKETPLACE_URL=http://localhost:3001/renderer/extensions
# LAYOUT_MARKETPLACE_URL=http://localhost:3001/renderer/layouts
```

## トラブルシューティング

### 問題A: まだ拡張機能が0件表示される

**可能性1: キャッシュの問題**

```bash
# ブラウザのキャッシュをクリア
# Chrome: Cmd+Shift+Delete (Mac) / Ctrl+Shift+Delete (Windows)
# または、開発者ツールで "Disable cache" にチェック
```

**可能性2: ビルドが古い**

```bash
# Webpackの開発サーバーを再起動
# ターミナルでCtrl+Cで停止し、再度実行
yarn web:start
# または
yarn desktop:start
```

**可能性3: 環境変数が反映されていない**

```bash
# .envファイルを確認
cat .env

# webpackプロセスを完全に終了して再起動
# すべてのnode/yarn プロセスを終了
pkill -f "webpack|yarn"

# 再起動
yarn web:start
```

### 問題B: HTTPエラーが発生する

**可能性: CORSエラー**

ブラウザコンソールに以下のようなエラーが表示される:

```
Access to fetch at 'http://localhost:3001/renderer/extensions' from origin 'http://localhost:8080'
has been blocked by CORS policy
```

**解決方法:**
Express.jsサーバーでCORSが有効になっているか確認:

```typescript
// server/express/src/index.ts
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);
```

サーバーを再起動:

```bash
cd server/express
npm run dev
```

### 問題C: レイアウトは表示されるが拡張機能は表示されない

**原因:** `ExtensionMarketplaceProvider`と`LayoutMarketplaceProvider`で異なる実装になっている

**確認ポイント:**

1. `ExtensionMarketplaceProvider`は`ExtensionMarketplaceAPI`を使用（HttpService経由）
2. `LayoutMarketplaceProvider`は直接`fetch()`を使用（フォールバックURL）
3. HttpServiceのベースURL設定が正しいか確認

**HttpServiceのベースURL確認:**

```typescript
// packages/suite-base/src/services/http/HttpService.ts
this.baseURL = APP_CONFIG.apiUrl; // API_URL環境変数から取得

// packages/suite-base/src/constants/config.ts
export const APP_CONFIG = {
  apiUrl: API_URL,  // webpackのDefinePluginで注入
  ...
};
```

## 期待される動作

### 修正後の正常な動作フロー

#### 拡張機能の取得

```
1. ExtensionMarketplaceProvider.getAvailableExtensions()
   ↓
2. ExtensionMarketplaceAPI.getExtensions()
   ↓
3. HttpService.get("extensions", { namespace: "official" })
   ↓
4. URL構築: API_URL + "/extensions" + "?namespace=official"
   = "http://localhost:3001/renderer/extensions?namespace=official"
   ↓
5. サーバーレスポンス: 2件の拡張機能
   ↓
6. UI表示: 2件表示
```

#### レイアウトの取得

```
1. LayoutMarketplaceProvider.getAvailableLayouts()
   ↓
2. fetch(LAYOUT_MARKETPLACE_FALLBACK_URL)
   = fetch("http://localhost:3001/renderer/layouts")
   ↓
3. サーバーレスポンス: 4件のレイアウト
   ↓
4. UI表示: 4件表示
```

## 今後の改善提案

### 1. LayoutMarketplaceProviderの統一

現在、`LayoutMarketplaceProvider`は直接`fetch()`を使用していますが、`ExtensionMarketplaceProvider`と同様に`LayoutMarketplaceAPI`（HttpService経由）を使用するように統一すべきです。

### 2. Namespaceの柔軟な設定

```typescript
// プロバイダーで設定可能にする
const marketplaceAPI = useMemo(
  () => new ExtensionMarketplaceAPI(process.env.MARKETPLACE_NAMESPACE || "official"),
  [],
);
```

### 3. デバッグログの追加（開発時のみ）

```typescript
if (process.env.NODE_ENV === "development") {
  log.debug("Fetching extensions", {
    namespace,
    baseUrl: this.baseUrl,
  });
}
```

### 4. フォールバック動作の明確化

- API失敗時のフォールバックURLへの切り替えを明示的にする
- ユーザーに通知する（トースト通知など）

## まとめ

**修正内容:**

1. ✅ サンプルデータに`namespace: "official"`を追加
2. ✅ サーバー側のフィルタリングロジックを改善
3. ✅ デフォルトの`namespace`を`"official"`に変更

**期待される結果:**

- 拡張機能: 2件表示（`namespace: "official"`の拡張機能）
- レイアウト: 4件表示（全レイアウト）

**次のステップ:**

1. Lichtblickクライアントを再起動
2. ブラウザの開発者ツールでネットワークリクエストを確認
3. マーケットプレイスUIで拡張機能とレイアウトが表示されることを確認
