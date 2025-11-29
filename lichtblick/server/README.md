# Lichtblick Marketplace Development Server

シンプルな静的ファイルサーバーで、マーケットプレイスのアセット（Extensions、Layouts）を開発環境で配信します。

## 📖 概要

このサーバーは、Lichtblickアプリケーションの開発時にマーケットプレイスのJSONファイルや関連アセットをローカルで提供するためのものです。本番環境（S3 + CloudFront）と同じ構造でファイルを配信します。

### 主な機能

- ✅ 静的ファイル配信（JSON、画像、.foxeファイルなど）
- ✅ CORS対応（クロスオリジンリクエストをサポート）
- ✅ セキュリティ対策（ディレクトリトラバーサル防止）
- ✅ 開発向けログ出力
- ✅ Graceful Shutdown対応

## 🚀 使い方

### 1. サーバーの起動

```bash
cd server
npm start
```

デフォルトでは `http://localhost:3001` で起動します。

### 2. カスタムポートで起動

```bash
PORT=8080 npm start
```

### 3. 自動リロード（開発モード）

```bash
npm run dev
```

ファイル変更時に自動的にサーバーが再起動します（Node.js v18.11.0以上が必要）。

## 📂 ディレクトリ構造

```
server/
├── package.json          # サーバー設定
├── server.js            # サーバー実装
├── README.md            # このファイル
└── assets/              # 静的ファイル
    ├── extensions/
    │   └── extensions.json
    └── layouts/
        ├── layouts.json
        ├── robotics-dashboard.json
        ├── autonomous-vehicle-layout.json
        ├── drone-monitoring.json
        └── minimal-debug.json
```

## 🔗 エンドポイント

サーバー起動後、以下のエンドポイントが利用可能です：

### Extensions

```
http://localhost:3001/extensions/extensions.json
```

拡張機能のカタログJSONを取得します。

### Layouts

```
http://localhost:3001/layouts/layouts.json
```

レイアウトのカタログJSONを取得します。

### 個別のレイアウトファイル

```
http://localhost:3001/layouts/robotics-dashboard.json
http://localhost:3001/layouts/autonomous-vehicle-layout.json
http://localhost:3001/layouts/drone-monitoring.json
http://localhost:3001/layouts/minimal-debug.json
```

## ⚙️ Lichtblickアプリとの連携

### 環境変数の設定

Lichtblickアプリ側で以下の環境変数を設定することで、ローカルサーバーを使用できます：

```bash
# .env.local または開発環境設定ファイルに追加
EXTENSION_MARKETPLACE_URL=http://localhost:3001/extensions/extensions.json
LAYOUT_MARKETPLACE_URL=http://localhost:3001/layouts/layouts.json
```

### Webpackの設定（自動）

`packages/suite-base/webpack.ts` で環境変数が自動的に読み込まれます：

```javascript
new webpack.DefinePlugin({
  EXTENSION_MARKETPLACE_URL: JSON.stringify(process.env.EXTENSION_MARKETPLACE_URL),
  LAYOUT_MARKETPLACE_URL: JSON.stringify(process.env.LAYOUT_MARKETPLACE_URL),
  // ...
});
```

### アプリの起動

```bash
# メインディレクトリで
npm run web:serve
# または
npm run desktop:serve
```

アプリは自動的にローカルサーバーからデータを取得します。

## ✅ データバリデーション

サーバーには、マーケットプレイスのデータ構造をチェックするバリデーション機能が組み込まれています。

### バリデーションの実行

すべてのデータをチェック：

```bash
npm run validate
```

拡張機能のみをチェック：

```bash
npm run validate:extensions
```

レイアウトのみをチェック：

```bash
npm run validate:layouts
```

### チェック内容

- **必須フィールドの存在確認**: `id`, `name`, `publisher` など
- **データ型のチェック**: 文字列、配列、オブジェクトなどの型が正しいか
- **重複IDの検出**: 同じIDが複数存在しないか
- **バージョン整合性**: Extensionsのバージョン情報が正しいか

### 出力例

正常な場合：

```
==================================================
  Marketplace Data Validator
==================================================

🔍 Validating Extensions...
✓ Loaded extensions.json (...)
Found 3 extension(s)

✓ Extensions validation passed!

🔍 Validating Layouts...
✓ Loaded layouts.json (...)
Found 5 layout(s)

✓ Layouts validation passed!

==================================================
  ✓ All validations passed!
==================================================
```

エラーがある場合：

```
✗ Extensions validation failed with 2 error(s):
  • [extensions[0]] name: Required field is missing
  • [extensions[1].versions.1.0.0] version: Version key "1.0.0" does not match version value "1.0.1"
```

### CI/CDでの使用

データをコミットする前に、バリデーションを実行することをお勧めします：

```bash
cd server
npm run validate && git add . && git commit -m "Update marketplace data"
```

## 🧪 動作確認

### 1. サーバーが起動しているか確認

```bash
curl http://localhost:3001/extensions/extensions.json
```

正常に動作していれば、JSONデータが返されます。

### 2. Layoutsの確認

```bash
curl http://localhost:3001/layouts/layouts.json
```

### 3. ブラウザで確認

ブラウザで以下のURLにアクセス：

- http://localhost:3001/extensions/extensions.json
- http://localhost:3001/layouts/layouts.json

## 📝 ファイルの追加・更新

### 新しいレイアウトの追加

1. `assets/layouts/` に新しいJSONファイルを配置
2. `assets/layouts/layouts.json` のカタログに追加
3. サーバーを再起動（自動リロードモードなら不要）

### 新しい拡張機能の追加

1. `assets/extensions/` に .foxe ファイルを配置（必要に応じて）
2. `assets/extensions/extensions.json` のカタログに追加
3. サーバーを再起動（自動リロードモードなら不要）

## 🔒 セキュリティ

### ディレクトリトラバーサル対策

サーバーは `assets/` ディレクトリ外へのアクセスを自動的にブロックします。

### CORS設定

開発環境用に全てのオリジンからのアクセスを許可しています。本番環境では適切なCORS設定が必要です。

## 🐛 トラブルシューティング

### ポートがすでに使用されている

```
Error: listen EADDRINUSE: address already in use :::3001
```

**解決方法**:

1. 別のポートを使用する: `PORT=3002 npm start`
2. または、ポートを使用しているプロセスを停止する

### ファイルが見つからない（404）

- ファイルパスが正しいか確認
- `assets/` ディレクトリ内にファイルが存在するか確認
- ファイル名の大文字小文字が一致しているか確認

### CORS エラー

通常は発生しませんが、もし発生した場合：

- サーバーが正常に起動しているか確認
- ブラウザのキャッシュをクリア
- サーバーを再起動

## 📚 関連ドキュメント

- [マーケットプレイス実装計画](../docs/reports/marketplace-file-server-implementation-plan.md)
- [データ構造ガイド](../docs/marketplace/data-structure-guide.md)
- [開発サーバー仕様書](../docs/marketplace/implementation/development-server-specification.md)

## 🛠️ 技術スタック

- **Node.js v18+**: ESM、標準HTTPサーバー
- **依存関係**: なし（Node.js標準ライブラリのみ）

## 📄 ライセンス

MPL-2.0

---

**開発チーム**: Lichtblick / Umi Project
