# Lichtblickプロジェクトにおける環境変数設定

このドキュメントは、Lichtblickプロジェクトにおける環境変数設定の仕組みについて解説します。

## 概要

Lichtblickプロジェクトでは、**dotenv**と**Webpack**を組み合わせた環境変数管理を実装しています。これにより、開発時の柔軟性とビルド時の最適化を両立させています。

## アーキテクチャ

### 1. dotenvによる環境変数の読み込み

環境変数はプロジェクトルートの`.env`ファイルから読み込まれます。

**実装箇所:**

- `packages/suite-base/webpack.ts`
- `packages/suite-desktop/src/webpackPreloadConfig.ts`
- `packages/suite-desktop/src/webpackMainConfig.ts`

**コード例:**

```typescript
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
```

**特徴:**

- Node.js環境（ビルドプロセス）で環境変数を読み込む
- `.env`ファイルに定義された変数が`process.env`で利用可能になる
- ファイルが存在しなくても警告なく処理を続行する

### 2. WebpackのDefinePluginによるビルド時注入

読み込んだ環境変数は、Webpackの`DefinePlugin`を使ってビルド時にJavaScriptコードに直接埋め込まれます。

**メカニズム:**

```
.env ファイル
    ↓
dotenv.config()
    ↓
process.env に読み込み
    ↓
webpack DefinePlugin
    ↓
ビルド後のJavaScriptに定数として注入
```

### 3. 環境別の実装

#### Web版（packages/suite-web/src/webpackConfigs.ts）

```typescript
new webpack.DefinePlugin({
  // Should match webpack-defines.d.ts
  ReactNull: null,
  LICHTBLICK_SUITE_VERSION: JSON.stringify(version),
  API_URL: JSON.stringify(process.env.API_URL),
  DEV_WORKSPACE: JSON.stringify(process.env.DEV_WORKSPACE),
  ...buildEnvVars(),
}),
```

#### デスクトップ版 - Preload（packages/suite-desktop/src/webpackPreloadConfig.ts）

```typescript
new DefinePlugin({
  // Should match webpack-defines.d.ts
  ReactNull: null,
  LICHTBLICK_PRODUCT_NAME: JSON.stringify(params.packageJson.productName),
  LICHTBLICK_PRODUCT_VERSION: JSON.stringify(params.packageJson.version),
  LICHTBLICK_PRODUCT_HOMEPAGE: JSON.stringify(params.packageJson.homepage),
  LICHTBLICK_SUITE_VERSION: JSON.stringify(params.packageJson.version),
  API_URL: process.env.API_URL ? JSON.stringify(process.env.API_URL) : undefined,
  DEV_WORKSPACE: process.env.DEV_WORKSPACE
    ? JSON.stringify(process.env.DEV_WORKSPACE)
    : undefined,
}),
```

#### デスクトップ版 - Main（packages/suite-desktop/src/webpackMainConfig.ts）

```typescript
new DefinePlugin({
  // Should match webpack-defines.d.ts
  ReactNull: null,
  MAIN_WINDOW_WEBPACK_ENTRY: rendererEntry,
  LICHTBLICK_PRODUCT_NAME: JSON.stringify(params.packageJson.productName),
  LICHTBLICK_PRODUCT_VERSION: JSON.stringify(params.packageJson.version),
  LICHTBLICK_PRODUCT_HOMEPAGE: JSON.stringify(params.packageJson.homepage),
  LICHTBLICK_SUITE_VERSION: JSON.stringify(params.packageJson.version),
  API_URL: process.env.API_URL ? JSON.stringify(process.env.API_URL) : undefined,
  DEV_WORKSPACE: process.env.DEV_WORKSPACE
    ? JSON.stringify(process.env.DEV_WORKSPACE)
    : undefined,
}),
```

## 環境変数の定義

### 現在使用されている環境変数

| 変数名             | 用途                         | 例                           |
| ------------------ | ---------------------------- | ---------------------------- |
| `API_URL`          | APIエンドポイントのURL       | `https://api.example.com`    |
| `DEV_WORKSPACE`    | 開発環境のワークスペースパス | `/path/to/workspace`         |
| `NODE_ENV`         | ビルドモード                 | `development` / `production` |
| `CI`               | CI環境フラグ                 | `true`                       |
| `ROS_PACKAGE_PATH` | ROS関連のパッケージパス      | `/opt/ros/packages`          |

### TypeScript型定義

型定義は`packages/suite-base/src/typings/webpack-defines.d.ts`に集中管理されています：

```typescript
// Should match DefinePlugin in webpack configuration
declare const ReactNull: ReactNull;

declare const API_URL: string | undefined;

declare const LICHTBLICK_SUITE_VERSION: string | undefined;

declare const DEV_WORKSPACE: string | undefined;
```

**重要:** DefinePluginで新しい環境変数を追加する場合は、このファイルにも型定義を追加する必要があります。

## ブラウザ環境での特殊処理

ブラウザ環境では`process`オブジェクトが存在しないため、ポリフィルが提供されています。

**実装：** `packages/suite-base/src/util/process.ts`

```typescript
const process = {
  // We want to be able to use Function type for _fn_ param
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  nextTick: (fn: Function, ...args: unknown[]): void => {
    queueMicrotask(() => {
      fn(...args);
    });
  },

  title: "browser",
  browser: true,
  env: {},
  argv: [],
};

export default process;
```

このオブジェクトはWebpackの`ProvidePlugin`で自動的に注入されます：

```typescript
new webpack.ProvidePlugin({
  process: ["@lichtblick/suite-base/util/process", "default"],
  // ...
}),
```

## 使用例

### コード内での直接使用

```typescript
// 開発環境での特別な処理
if (DEV_WORKSPACE) {
  console.log("Dev workspace:", DEV_WORKSPACE);
  // 開発環境専用のロジック
}

// APIのエンドポイント設定
const apiUrl = API_URL || "https://default-api.example.com";

// バージョン情報の表示
console.log(`Lichtblick Suite v${LICHTBLICK_SUITE_VERSION}`);
```

### Electron環境での使用

```typescript
// packages/suite-desktop/src/preload/index.ts
getEnvVar: (envVar: string) => process.env[envVar],

// packages/suite-desktop/src/main/index.ts
const isProduction = process.env.NODE_ENV === "production";
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = isProduction ? "false" : "true";
```

## WebpackとDotenvを組み合わせる利点

### 1. ビルド時注入 (Build-time Injection)

- 環境変数がビルド時に定数として埋め込まれる
- 実行時のアクセスオーバーヘッドがない
- ファイルサイズが最適化される

### 2. 型安全性 (Type Safety)

- TypeScript型定義により、コンパイル時に型チェックが行われる
- IDEのオートコンプリート対応
- 誤った環境変数名の使用を事前に防止できる

### 3. セキュリティ (Security)

- 必要な環境変数のみを選択的に公開できる
- 不要な変数がバンドルに含まれない
- デリケートな情報を不可視化できる

### 4. パフォーマンス (Performance)

- 環境変数アクセスが定数参照になる
- ミニファイーション時に最適化される
- Tree-shakingの対象となり、未使用の定義は削除される

### 5. 開発時の柔軟性 (Development Flexibility)

- `.env`ファイルを編集するだけで環境変数を変更できる
- ビルドのたびに異なる設定を適用可能
- チーム内での環境設定の共有が容易

## 実装上の注意点

### 1. JSON.stringify()の使用

環境変数をDefinePluginに渡すときは、必ず`JSON.stringify()`でシリアライズします：

```typescript
// ✓ 正しい
API_URL: JSON.stringify(process.env.API_URL);

// ✗ 間違い（文字列リテラルとして埋め込まれない）
API_URL: process.env.API_URL;
```

### 2. 条件付き環境変数

オプショナルな環境変数は、存在チェックを含めます：

```typescript
// オプショナルな変数
DEV_WORKSPACE: process.env.DEV_WORKSPACE
  ? JSON.stringify(process.env.DEV_WORKSPACE)
  : undefined,
```

### 3. 型定義との同期

DefinePluginで新しい変数を定義したら、必ず`webpack-defines.d.ts`に型定義を追加します：

```typescript
declare const YOUR_NEW_VAR: string | undefined;
```

### 4. .envファイルの管理

```typescript
// 使用されるパス
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
```

プロジェクトルートに`.env`ファイルを配置してください。

**推奨:**

- `.env`ファイルはバージョン管理に含める（デフォルト値を含める）
- `.env.local`ファイルはローカル環境固有の設定に使用
- `.env.local`は`.gitignore`に追加して共有しない

## トラブルシューティング

### 環境変数が定義されていないエラーが発生

**問題:** `ReferenceError: XXX_VAR is not defined`

**原因:**

- `webpack-defines.d.ts`に型定義がない
- DefinePluginの定義に漏れがある

**対策:**

```typescript
// 1. webpack-defines.d.tsに追加
declare const YOUR_VAR: string | undefined;

// 2. DefinePluginの設定に追加
new webpack.DefinePlugin({
  YOUR_VAR: JSON.stringify(process.env.YOUR_VAR),
}),
```

### .envファイルから読み込まれていない

**問題:** `process.env.XXX`が`undefined`のまま

**原因:**

- dotenv.config()の呼び出しが実行されていない
- ファイルパスが正しくない
- `.env`ファイルが存在しない

**対策:**

```typescript
// パスが正しいか確認
console.log(path.resolve(__dirname, "../../.env"));

// ファイルが存在するか確認
import fs from "fs";
if (fs.existsSync(envPath)) {
  console.log(".env file found");
}
```

### ブラウザ環境でprocess.envが空

**問題:** ブラウザコンソール内で`process.env`が空

**原因:** 意図的な設計です。セキュリティ上、ブラウザには必要な環境変数のみが注入されます。

**対策:** DefinePluginで明示的に定義した変数のみが利用可能です。

## ベストプラクティス

### 1. 環境変数命名規則

```typescript
// ✓ 推奨
API_URL;
LICHTBLICK_SUITE_VERSION;
DEV_WORKSPACE;

// ✗ 非推奨
apiUrl; // キャメルケース
api_url; // Nodeの慣例と混在
LICHTBLICK_VERSION; // 短縮しすぎ
```

### 2. ドキュメンテーション

新しい環境変数を追加したら、このドキュメントを更新してください：

- 環境変数の用途
- 使用箇所
- 型
- 例値

### 3. デフォルト値の設定

```typescript
// 環境変数にデフォルト値をフォールバック
const apiUrl = API_URL || "https://api.example.com";
```

### 4. 環境別の設定

```bash
# 開発環境
API_URL=http://localhost:3000 npm run dev

# 本番環境
API_URL=https://api.prod.example.com npm run build
```

## 参考資料

### Webpackドキュメント

- [DefinePlugin](https://webpack.js.org/plugins/define-plugin/)
- [ProvidePlugin](https://webpack.js.org/plugins/provide-plugin/)

### dotenvドキュメント

- [dotenv NPM Package](https://www.npmjs.com/package/dotenv)

### プロジェクト内の関連ファイル

- `packages/suite-base/webpack.ts` - メインWebpack設定
- `packages/suite-web/src/webpackConfigs.ts` - Web版設定
- `packages/suite-desktop/src/webpackPreloadConfig.ts` - デスクトップPreload設定
- `packages/suite-desktop/src/webpackMainConfig.ts` - デスクトップMain設定
- `packages/suite-base/src/typings/webpack-defines.d.ts` - 型定義
- `packages/suite-base/src/util/process.ts` - Processポリフィル
