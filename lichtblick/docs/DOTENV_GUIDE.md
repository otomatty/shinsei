# dotenv 完全ガイド - Lichtblickプロジェクトでの活用

このドキュメントは、Lichtblickプロジェクトで使用されている`dotenv`ライブラリについて、基礎から応用まで詳しく解説します。

## 目次

1. [dotenvとは](#dotenvとは)
2. [インストール](#インストール)
3. [基本的な使い方](#基本的な使い方)
4. [Lichtblickでの実装](#lichtblickでの実装)
5. [ファイル形式と構文](#ファイル形式と構文)
6. [セキュリティベストプラクティス](#セキュリティベストプラクティス)
7. [トラブルシューティング](#トラブルシューティング)
8. [dotenv vs 他の手段](#dotenv-vs-他の手段)

## dotenvとは

### 概要

`dotenv`は、**環境固有の設定をコードから分離する**ためのNode.jsモジュールです。

```
コード実行
    ↓
.env ファイルから環境変数を読み込む
    ↓
process.env に登録される
    ↓
コード内から参照可能
```

### 主な特徴

| 特徴                 | 説明                                  |
| -------------------- | ------------------------------------- |
| **シンプル**         | 1行のコードで実行                     |
| **ファイルベース**   | `.env` テキストファイルで管理         |
| **プロセス環境変数** | Node.js `process.env` に登録          |
| **開発向け**         | CI/CDやDocker環境では通常不要         |
| **バージョン管理外** | `.gitignore` に追加し、秘密情報を保護 |

### なぜdotenvが必要か

```typescript
// ❌ ハードコード（絶対ダメ）
const API_URL = "https://api.production.com";
const DB_PASSWORD = "super-secret-password-123";
const API_KEY = "sk-1234567890abcdef";

// ✓ 環境変数で管理
const API_URL = process.env.API_URL;
const DB_PASSWORD = process.env.DB_PASSWORD;
const API_KEY = process.env.API_KEY;
```

## インストール

### npm でインストール

```bash
npm install dotenv
```

### package.json での確認

```json
{
  "dependencies": {
    "dotenv": "^16.0.0"
  }
}
```

Lichtblickでは既にインストール済みなので、そのまま使用できます。

## 基本的な使い方

### 1. 最もシンプルな使用方法

```typescript
import dotenv from "dotenv";

// .env ファイルを読み込む
dotenv.config();

// これ以降、process.env から環境変数を参照可能
console.log(process.env.API_URL);
```

### 2. カスタムパスで読み込む

```typescript
import dotenv from "dotenv";
import path from "path";

// プロジェクトルートの .env ファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
```

### 3. 読み込み結果の確認

```typescript
import dotenv from "dotenv";

const result = dotenv.config();

if (result.error) {
  console.error("Error loading .env file:", result.error);
} else {
  console.log("Loaded environment variables:", result.parsed);
}
```

**結果オブジェクト:**

```typescript
{
  parsed: {
    API_URL: "https://api.example.com",
    DEV_WORKSPACE: "/path/to/workspace",
    DEBUG: "true"
  }
}
```

### 4. 複数の .env ファイルを読み込む

```typescript
import dotenv from "dotenv";
import path from "path";

// 1. デフォルト設定を読み込む
dotenv.config({ path: path.resolve(__dirname, ".env") });

// 2. ローカル設定で上書き
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

// 3. 環境別設定で上書き
dotenv.config({ path: path.resolve(__dirname, `.env.${process.env.NODE_ENV}`) });
```

**優先順位（後に読み込まれたものが優先）:**

```
.env（基本設定）
  ↓
.env.local（ローカルカスタマイズ）
  ↓
.env.production（環境別カスタマイズ）
```

## Lichtblickでの実装

### 実装箇所と役割

Lichtblickプロジェクトでは、複数の場所でdotenvが使用されています。

#### 1. packages/suite-base/webpack.ts

**目的:** ビルドプロセス全体で使用する環境変数を読み込む

```typescript
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// その後、このファイル内で process.env にアクセス可能
function buildEnvVars(): Record<string, string | undefined> {
  return {
    "process.env.DEV_WORKSPACE": JSON.stringify(process.env.DEV_WORKSPACE),
  };
}

// DefinePlugin で定数として埋め込む
new webpack.DefinePlugin({
  API_URL: JSON.stringify(process.env.API_URL),
  DEV_WORKSPACE: JSON.stringify(process.env.DEV_WORKSPACE),
  ...buildEnvVars(),
}),
```

**パス解析:**

```
/packages/suite-base/webpack.ts から見て、2階層上に行く

__dirname = /Users/sugaiakimasa/apps/lichtblick/packages/suite-base
../../.env = /Users/sugaiakimasa/apps/lichtblick/.env

結果：プロジェクトルートの .env ファイルを読み込む
```

#### 2. packages/suite-desktop/src/webpackMainConfig.ts

**目的:** Electronメインプロセスのビルド設定で環境変数を使用

```typescript
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const webpackMainConfig =
  (params: WebpackConfigParams) =>
  (_: unknown, argv: WebpackArgv): Configuration => {
    // ...
    return {
      plugins: [
        new DefinePlugin({
          API_URL: process.env.API_URL ? JSON.stringify(process.env.API_URL) : undefined,
          DEV_WORKSPACE: process.env.DEV_WORKSPACE
            ? JSON.stringify(process.env.DEV_WORKSPACE)
            : undefined,
        }),
      ],
    };
  };
```

#### 3. packages/suite-desktop/src/webpackPreloadConfig.ts

**目的:** Preloadスクリプトのビルド設定で環境変数を使用

```typescript
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const webpackPreloadConfig =
  (params: WebpackConfigParams) =>
  (_: unknown, argv: WebpackArgv): Configuration => {
    // ...
    new DefinePlugin({
      API_URL: process.env.API_URL ? JSON.stringify(process.env.API_URL) : undefined,
      DEV_WORKSPACE: process.env.DEV_WORKSPACE
        ? JSON.stringify(process.env.DEV_WORKSPACE)
        : undefined,
    }),
  };
```

### パス構造図

```
/lichtblick/
├── .env                               ← ここに定義
│
├── packages/
│   ├── suite-base/
│   │   └── webpack.ts                 ← ../../.env を読み込む
│   │
│   └── suite-desktop/
│       ├── src/
│       │   ├── webpackMainConfig.ts   ← ../../../.env を読み込む
│       │   └── webpackPreloadConfig.ts ← ../../../.env を読み込む
│       │
│       └── main/
│           └── index.ts               ← process.env を参照
│
└── desktop/
    └── webpack.config.ts              ← 設定ファイル参照
```

### 流れ図

```
npm run build コマンド
    ↓
webpack.config.ts ロード
    ↓
webpackMainConfig()、webpackPreloadConfig() 実行
    ↓
各ファイルで dotenv.config() 実行
    ↓
.env ファイルを読み込み
    ↓
process.env に環境変数が登録される
    ↓
DefinePlugin でビルド時に定数として埋め込み
    ↓
ビルド完了
```

## ファイル形式と構文

### .env ファイルの基本形式

```env
# コメント（# で始まる行）
API_URL=https://api.example.com
DEV_WORKSPACE=/path/to/workspace
DEBUG=true
DATABASE_URL=postgresql://user:pass@localhost/dbname
```

### 変数の型

| 記法        | 型                         | 例                                |
| ----------- | -------------------------- | --------------------------------- |
| `KEY=value` | 文字列                     | `API_URL=https://api.example.com` |
| `KEY=123`   | 文字列（数値に見える）     | `PORT=3000`                       |
| `KEY=true`  | 文字列（ブール値に見える） | `DEBUG=true`                      |
| `KEY=""`    | 空文字列                   | `OPTIONAL=""`                     |

**重要:** dotenvではすべて**文字列**として読み込まれます

```typescript
process.env.PORT; // "3000" （文字列）
process.env.DEBUG; // "true" （文字列）
Number(process.env.PORT); // 3000 （数値に変換）
process.env.DEBUG === "true"; // true
Boolean(process.env.DEBUG); // true （常にtrue）
```

### クォート（引用符）の使い方

#### 1. シングルクォート

```env
# シングルクォート内は全て文字列として扱われる
MESSAGE='Hello World'
PATH_WITH_SPACES='/path with spaces/to/file'
```

```typescript
process.env.MESSAGE; // "Hello World"
process.env.PATH_WITH_SPACES; // "/path with spaces/to/file"
```

#### 2. ダブルクォート

```env
# ダブルクォート内は通常の文字列
DOUBLE_QUOTED="This is a string"

# 改行を含める場合
MULTILINE="line1\nline2"
```

```typescript
process.env.DOUBLE_QUOTED; // "This is a string"
process.env.MULTILINE; // "line1\nline2"
```

#### 3. クォートなし

```env
# クォートなし（トリミングされる）
SIMPLE_VALUE=hello world
SPACE_TRIMMED=  value with spaces
```

```typescript
process.env.SIMPLE_VALUE; // "hello world"
process.env.SPACE_TRIMMED; // "value with spaces"
```

### 展開（Variable Expansion）

dotenvでは、変数内で他の環境変数を参照できます。

```env
# 基本設定
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=myapp_db

# 展開を使った複合設定
DATABASE_URL=postgresql://${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}
```

**注意:** デフォルトではこの展開機能は有効でないため、別のライブラリが必要です

```typescript
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

const envConfig = dotenv.config();
dotenvExpand.expand(envConfig);
```

## 実装パターン

### パターン 1: デフォルト値の設定

```typescript
// .env ファイルの値を使用、なければデフォルト値
const API_URL = process.env.API_URL || "http://localhost:3000";
const DEBUG = process.env.DEBUG === "true";
const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 3;
```

### パターン 2: 検証

```typescript
import dotenv from "dotenv";

dotenv.config();

// 必須環境変数をチェック
const requiredEnvVars = ["API_URL", "DATABASE_URL", "API_KEY"];
const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}
```

### パターン 3: 環境別設定

```typescript
import dotenv from "dotenv";
import path from "path";

// NODE_ENV に基づいて .env ファイルを選択
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";

dotenv.config({ path: path.resolve(__dirname, envFile) });
```

### パターン 4: TypeScript 型定義

```typescript
// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    API_URL: string;
    DATABASE_URL: string;
    NODE_ENV: "development" | "production" | "test";
    DEBUG?: string;
  }
}
```

```typescript
// main.ts
process.env.API_URL; // TypeScript は型を認識
// Type: string
```

## セキュリティベストプラクティス

### 1. .env ファイルを .gitignore に追加

**.gitignore**

```
# 環境変数ファイル
.env
.env.local
.env.*.local
.env.secret

# セキュリティが重要なファイル
*.key
*.pem
```

**理由:**

- パスワード、APIキーなどの秘密情報を誤ってコミットしない
- デプロイ環境ごとに異なる値を使用

### 2. テンプレートファイルを用意

**.env.example**

```env
# プロダクション API
API_URL=https://api.example.com

# 開発用ワークスペース
DEV_WORKSPACE=/path/to/workspace

# デバッグモード（本番環境では false）
DEBUG=false

# ポート番号
PORT=3000
```

**利点:**

- どの環境変数が必要か、チーム全体で把握
- 新しいメンバーがすぐに開発環境をセットアップ可能

### 3. 本番環境では使用しない

```typescript
// 本番環境ではシステム環境変数を使用
if (process.env.NODE_ENV === "production") {
  // dotenv.config() を呼び出さない
  // Docker や CI/CD で環境変数を設定
} else {
  dotenv.config();
}
```

**本番環境での設定方法:**

```bash
# Docker
docker run -e API_URL=https://api.prod.com -e DB_PASSWORD=secret myapp

# GitHub Actions
- name: Deploy
  env:
    API_URL: ${{ secrets.API_URL }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  run: npm run build
```

### 4. 秘密情報の種類別対策

| 種類           | 管理方法                    | 例                    |
| -------------- | --------------------------- | --------------------- |
| APIキー        | `.env.local` + `.gitignore` | `API_KEY=sk-...`      |
| パスワード     | `.env.local` + `.gitignore` | `DB_PASSWORD=...`     |
| 公開URL        | `.env` でOK（テンプレート） | `API_URL=https://...` |
| ポート番号     | `.env` でOK                 | `PORT=3000`           |
| デバッグフラグ | `.env` でOK                 | `DEBUG=true`          |

### 5. 環境変数の暗号化

Lichtblickプロジェクトでは採用していませんが、本番環境での暗号化例：

```typescript
// cli: npm install bcrypt
import bcrypt from "bcrypt";

async function encryptEnv() {
  const encrypted = await bcrypt.hash("secret-api-key", 10);
  console.log(encrypted);
}

async function verifyEnv() {
  const match = await bcrypt.compare("secret-api-key", encryptedValue);
  console.log(match); // true or false
}
```

## トラブルシューティング

### 問題 1: 環境変数が読み込まれない

**症状:** `process.env.API_URL` が `undefined`

**原因チェックリスト:**

1. **dotenv.config() が呼ばれているか**

```typescript
// ❌ 呼ばれていない
import dotenv from "dotenv";
// コードを書いている...

// ✓ 呼び出している
import dotenv from "dotenv";
dotenv.config();
```

2. **.env ファイルが存在するか**

```bash
# .env ファイルの確認
ls -la .env

# ファイル内容の確認
cat .env
```

3. **パスが正しいか**

```typescript
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(__dirname, "../../.env");
console.log("Loading from:", envPath); // パスを確認

dotenv.config({ path: envPath });
```

4. **環境変数名が正しいか**

```typescript
// ❌ タイプミス
console.log(process.env.api_url); // undefined (小文字)
console.log(process.env.API_URL); // undefined （読み込まれていない）

// ✓ 正確な名前
console.log(process.env.API_URL); // "https://api.example.com"
```

### 問題 2: 環境変数が古い値のままになっている

**症状:** `.env` ファイルを編集しても反映されない

**原因:** Node.js プロセスが起動時に読み込むため、ファイル変更後は再起動が必要

**解決方法:**

```bash
# プロセスを停止して再起動
npm run dev

# または

# キャッシュをクリア
rm -rf node_modules/.cache
npm run dev
```

### 問題 3: TypeScript で型エラー

**症状:**

```typescript
process.env.API_URL;
// error: Property 'API_URL' does not exist on type 'ProcessEnv'
```

**解決方法:**

```typescript
// 方法1: env.d.ts で型定義
declare namespace NodeJS {
  interface ProcessEnv {
    API_URL: string;
    DEBUG?: string;
  }
}

// 方法2: 型アサーション
(process.env.API_URL as string).startsWith("https://");

// 方法3: キャスト
const apiUrl: string = process.env.API_URL || "";
```

### 問題 4: ダブルクォートの問題

**症状:** 値に余分な引用符が含まれている

```env
API_URL="https://api.example.com"
```

```typescript
process.env.API_URL;
// "https://api.example.com"  (クォート付き)
```

**解決方法:**

```env
# ❌ ダブルクォートを使わない
API_URL="https://api.example.com"

# ✓ クォートなし
API_URL=https://api.example.com

# ✓ 必要な場合のみシングルクォート
MESSAGE='Hello "World"'
```

### 問題 5: 空白文字の問題

**症状:** 予期しないスペースが含まれている

```env
API_URL = https://api.example.com
```

```typescript
process.env.API_URL;
// " https://api.example.com" (前後に空白)
```

**解決方法:**

```env
# ❌ 等号の前後に空白を入れない
API_URL = https://api.example.com

# ✓ 等号に空白を入れない
API_URL=https://api.example.com

# ✓ 値自体に空白がある場合
PATH_WITH_SPACES=/path with spaces/to/file
```

## dotenv vs 他の手段

### dotenv vs システム環境変数

| 項目               | dotenv            | システム環境変数 |
| ------------------ | ----------------- | ---------------- |
| **ファイルベース** | ✓                 | ×                |
| **ポータビリティ** | ✓（.envファイル） | ×                |
| **開発環境**       | ✓ 最適            | △ 可能           |
| **本番環境**       | × 非推奨          | ✓ 最適           |
| **チーム共有**     | ✓ テンプレート    | △ 手動設定       |
| **セキュリティ**   | △ .gitignore必須  | ✓ OS管理         |

**使い分け:**

```typescript
if (process.env.NODE_ENV === "production") {
  // 本番環境：システム環境変数を使用
  // dotenv は読み込まない
} else {
  // 開発環境：dotenv で .env ファイルから読み込む
  dotenv.config();
}
```

### dotenv vs config ライブラリ

| ライブラリ         | 特徴           | 用途           |
| ------------------ | -------------- | -------------- |
| **dotenv**         | シンプル、軽量 | Node.js全般    |
| **dotenv-expand**  | 変数展開対応   | 複雑な設定値   |
| **dotenv-webpack** | Webpack統合    | Webpack 使用時 |
| **node-config**    | YAML/JSON対応  | 複雑な設定     |
| **env-cmd**        | CLI統合        | npm scripts    |

**Lichtblick での選定理由:**

Lichtblickは `dotenv` を選んだ理由：

- シンプルで依存関係が少ない
- Webpackで DefinePlugin により制御可能
- 開発プロセスに統合しやすい

### dotenv vs 環境ファイル（.env.production など）

```
プロジェクト構成
├── .env                    # 共通設定（テンプレート）
├── .env.development        # 開発環境用
├── .env.production         # 本番環境用
├── .env.test              # テスト環境用
└── .env.local             # ローカルカスタマイズ（.gitignore）
```

**読み込み順序:**

```typescript
import dotenv from "dotenv";
import path from "path";

// 1. 共通設定を読み込む
dotenv.config({ path: path.resolve(__dirname, ".env") });

// 2. 環境別設定で上書き
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: path.resolve(__dirname, envFile) });

// 3. ローカルカスタマイズで上書き
dotenv.config({ path: path.resolve(__dirname, ".env.local") });
```

## ベストプラクティス

### 1. ファイル構成

```
lichtblick/
├── .env                    # ✓ 共通テンプレート（バージョン管理）
├── .env.local              # ✗ ローカルカスタマイズ（.gitignore）
├── .env.example            # ✓ 設定例（バージョン管理）
├── .env.development        # △ 環境別設定（プロジェクト依存）
└── .env.production         # △ 環境別設定（プロジェクト依存）
```

### 2. .env ファイルの内容例

```env
# ========================================
# Lichtblick 環境設定
# ========================================

# API設定
API_URL=https://api.example.com
API_TIMEOUT=30000

# 開発環境設定
DEV_WORKSPACE=/path/to/workspace
DEBUG=false

# データベース設定
DATABASE_URL=postgresql://localhost/lichtblick

# ポート設定
PORT=3000
RENDERER_PORT=8080

# Node環境
NODE_ENV=development
```

### 3. 環境変数の命名規則

```env
# ✓ 推奨：SCREAMING_SNAKE_CASE
API_URL=https://api.example.com
DB_PASSWORD=secret123
FEATURE_FLAG_NEW_UI=true

# ✗ 非推奨：camelCase
apiUrl=https://api.example.com

# ✗ 非推奨：lowercase
api_url_local=https://api.example.com
```

### 4. チーム開発でのワークフロー

```bash
# 初期セットアップ
git clone <repo>
cp .env.example .env        # ← テンプレートからコピー
# エディタで .env を編集して必要な値を設定

# 定期的な確認
cat .env.example            # ← 最新のテンプレート確認
# 新しい環境変数が追加されていないか確認
```

### 5. CI/CD での環境変数設定

**GitHub Actions の例:**

```yaml
name: Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Create .env
        run: |
          echo "API_URL=${{ secrets.API_URL }}" > .env
          echo "DB_PASSWORD=${{ secrets.DB_PASSWORD }}" >> .env
          echo "NODE_ENV=production" >> .env
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
```

## 関連リソース

### 公式ドキュメント

- [dotenv NPM Package](https://www.npmjs.com/package/dotenv)
- [GitHub: motdotla/dotenv](https://github.com/motdotla/dotenv)

### 拡張ライブラリ

- [dotenv-expand](https://www.npmjs.com/package/dotenv-expand) - 変数展開機能
- [dotenv-webpack](https://www.npmjs.com/package/dotenv-webpack) - Webpack統合
- [dotenv-cli](https://www.npmjs.com/package/dotenv-cli) - CLI統合

### 関連ドキュメント

- [環境変数設定](./ENVIRONMENT_VARIABLES.md)
- [Webpack ビルドフロー](./WEBPACK_BUILD_FLOW.md)
- [Node.js process.env](https://nodejs.org/api/process.html#process_process_env)

## まとめ

### dotenv の3つのポイント

1. **シンプル** - `dotenv.config()` の1行で完成
2. **開発向け** - チーム開発でのセットアップが容易
3. **セキュア** - `.gitignore` で秘密情報を保護

### Lichtblick での活用

- **ビルド時の環境変数注入** - Webpackの `DefinePlugin` と連携
- **複数の設定源** - `suite-base`、`desktop` で独立して読み込み
- **柔軟な環境管理** - 開発・テスト・本番で異なる設定をサポート

### 次のステップ

- `.env.example` をプロジェクトに追加
- 新しいチームメンバーに `.env` のセットアップを説明
- 本番環境では `dotenv.config()` をスキップ
