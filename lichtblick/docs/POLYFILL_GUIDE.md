# ポリフィル (Polyfill) 解説 - Lichtblickプロジェクトでの活用

このドキュメントは、ブラウザ環境とNode.js環境の違いを理解し、Lichtblickプロジェクトでなぜポリフィルが必要なのか、そしてどのように実装されているかを詳しく解説します。

## 目次

1. [ポリフィルとは](#ポリフィルとは)
2. [ブラウザとNode.js環境の本質的な違い](#ブラウザとnodejs環境の本質的な違い)
3. [processオブジェクトについて](#processオブジェクトについて)
4. [Lichtblickでのポリフィル実装](#lichtblickでのポリフィル実装)
5. [具体的なポリフィル実装](#具体的なポリフィル実装)
6. [Webpackの役割](#webpackの役割)
7. [トラブルシューティング](#トラブルシューティング)

## ポリフィルとは

### 定義

**ポリフィル (Polyfill)** は、ある環境で存在しない機能を、互換性のあるコードで再実装したものです。

```typescript
// ブラウザには Promise がない場合に、Promise のポリフィルを提供
if (typeof Promise === "undefined") {
  // 簡易的な Promise 実装
  window.Promise = function () {
    /* ... */
  };
}
```

### 名称の由来

**Poly** (複数) + **Fill** (埋める) = 複数の穴（機能不足）を埋める

```
ブラウザ環境
┌──────────────────────────────────┐
│ 基本的なブラウザAPI               │
│ (window, document, fetch など)   │
├──────────────────────────────────┤
│ ポリフィル層                       │
│ (process, Buffer など)            │
├──────────────────────────────────┤
│ アプリケーションコード            │
└──────────────────────────────────┘
```

## ブラウザとNode.js環境の本質的な違い

### 環境の特性

| 項目                      | Node.js           | ブラウザ       |
| ------------------------- | ----------------- | -------------- |
| **実行環境**              | サーバー/CLI      | クライアント   |
| **ファイルシステム**      | ✓ あり            | ✗ なし         |
| **process オブジェクト**  | ✓ あり            | ✗ なし         |
| **window オブジェクト**   | ✗ なし            | ✓ あり         |
| **document オブジェクト** | ✗ なし            | ✓ あり         |
| **ネットワークAPI**       | `http` モジュール | `fetch` API    |
| **スレッド制御**          | `setImmediate()`  | `setTimeout()` |
| **イベントループ**        | Node.js固有       | ブラウザ固有   |

### Node.js環境（サーバーサイド）

```
プロセス起動
    ↓
Node.js ランタイム実行
    ↓
process オブジェクトで環境情報にアクセス可能
    ↓
ファイルシステム読み書き可能
    ↓
マルチプロセス/スレッド制御
```

**Node.js でのみ存在する機能:**

```typescript
// ✓ Node.js で利用可能
process.env.NODE_ENV;
process.pid;
process.cwd();
fs.readFileSync("file.txt");

// ✗ ブラウザでは存在しない
```

### ブラウザ環境（クライアントサイド）

```
HTML ロード
    ↓
JavaScript ダウンロード
    ↓
ブラウザで実行
    ↓
window オブジェクトがグローバル
    ↓
ファイルシステムアクセス不可
```

**ブラウザでのみ存在する機能:**

```typescript
// ✓ ブラウザで利用可能
window.location;
document.getElementById("id");
fetch("http://api.example.com");

// ✗ Node.js では存在しない
```

## processオブジェクトについて

### Node.js の process オブジェクト

**何か:** Node.js グローバルオブジェクト

**役割:** プロセス情報と環境の制御

```typescript
// Node.js環境
console.log(process.env); // 環境変数
console.log(process.pid); // プロセスID
console.log(process.cwd()); // 現在のディレクトリ
console.log(process.platform); // "linux", "darwin", "win32"
process.exit(1); // プロセス終了
process.nextTick(() => {
  // 次のイベントループフェーズで実行
  console.log("Next tick");
});
```

### なぜブラウザには process がないのか？

これは**実装**でも**dotenv**でもなく、**ブラウザの設計思想**が異なるためです。

#### 理由1: セキュリティ

ブラウザの JavaScript は**サンドボックス環境**で実行されます。

```
ブラウザセキュリティモデル:
┌─────────────────────────────────┐
│ ブラウザプロセス                  │
├─────────────────────────────────┤
│ ┌───────────────────────────────┐│
│ │ Sandbox (隔離環境)             ││
│ │                                ││
│ │ ✓ 限定的なAPIのみ              ││
│ │ ✓ ファイルシステムアクセス不可  ││
│ │ ✓ process オブジェクトなし     ││
│ │                                ││
│ └───────────────────────────────┘│
│         ↑ 制御 ↓                 │
│ ┌───────────────────────────────┐│
│ │ OS (ネイティブ機能)             ││
│ └───────────────────────────────┘│
└─────────────────────────────────┘
```

**例:** 悪意のあるサイトが `process.env` にアクセスできたら？

```typescript
// ✗ セキュリティリスク（これが起きないようにサンドボックス化）
const password = process.env.DATABASE_PASSWORD;
// → ユーザーのシステム環境変数に直接アクセス
// → 機密情報が盗まれる可能性
```

#### 理由2: 設計思想の違い

**Node.js**: サーバーアプリケーション向け

- ファイルシステム管理
- プロセス制御
- OS との連携

**ブラウザ**: Webアプリケーション向け

- DOM操作
- イベント処理
- ネットワーク通信

```typescript
// Node.js での典型的な使用
process.env.API_KEY; // 環境変数
process.cwd(); // ディレクトリ管理
fs.readFileSync(); // ファイル読み込み

// ブラウザでの典型的な使用
window.location.href; // ページナビゲーション
document.querySelector(); // DOM操作
fetch(); // ネットワーク通信
```

#### 理由3: ブラウザの性質

ブラウザは**複数のタブ/ウィンドウ**が独立して動作します。

```
プロセス単位でなく、
「タブ単位」「オリジン単位」で環境が隔離される

複数タブが同じプロセス情報を共有するのは、
セキュリティ上危険
```

### dotenvはなぜブラウザで動作しないのか

`dotenv` はブラウザ環境では動作しません。その理由：

```typescript
// dotenv の内部
import fs from "fs"; // ← ブラウザに fs モジュールがない

fs.readFileSync(".env", "utf8"); // ← このコードが実行できない
```

**エラー:**

```
Error: Cannot find module 'fs'
```

### ブラウザの .env ファイルは実装によって注入される

ブラウザ環境で環境変数を使う場合：

```
方法1: ビルド時に DefinePlugin で注入
.env (Node.js環境で読み込み)
    ↓
webpack DefinePlugin
    ↓
ビルド済み JavaScript に定数として埋め込み
    ↓
ブラウザで実行（既に値が埋め込まれている）

方法2: ブラウザの API で取得
fetch("/api/config") → JSON
    ↓
JavaScript の変数に保存
    ↓
コード内で参照
```

## Lichtblickでのポリフィル実装

### 実装概要

Lichtblickはブラウザでも Node.js の API を使えるようにポリフィルを提供しています。

```
ブラウザ環境での実行
    ↓
process, Buffer, setImmediate などが必要
    ↓
Webpack ProvidePlugin で自動注入
    ↓
カスタムポリフィル実装を使用
    ↓
互換性のある動作
```

### ポリフィルの実装箇所

#### 1. packages/suite-base/src/util/process.ts

**ファイル位置:** `/packages/suite-base/src/util/process.ts` (全28行)

```typescript
// Provide a shim for global process variable users
// We avoid using the npm process module since it has unfavorable performance
// for process.nextTick and uses setTimeout(..., 0). Instead we use queueMicrotask
// which is much faster.

const process = {
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

**参照:** [実際のファイル](../packages/suite-base/src/util/process.ts)

**重要なポイント:**

```typescript
// ✓ ブラウザでも動作する実装
nextTick: (fn) => queueMicrotask(fn);
// → queueMicrotask() はブラウザで標準サポート

// ✗ npm の process モジュール（避けた理由）
nextTick: (fn) => setTimeout(fn, 0);
// → 遅い、パフォーマンス低下

env: {
}
// → 空のオブジェクト（環境変数なし）

browser: true;
// → 「これはブラウザ環境」という表識
```

#### 2. packages/suite-base/src/util/setImmediate.ts

**ファイル位置:** `/packages/suite-base/src/util/setImmediate.ts` (全15行)

```typescript
export default function setImmediate(
  callback: (..._args: unknown[]) => void,
  ...args: unknown[]
): NodeJS.Immediate {
  void Promise.resolve().then(() => {
    callback(...args);
  });
  return undefined as unknown as NodeJS.Immediate;
}
```

**参照:** [実際のファイル](../packages/suite-base/src/util/setImmediate.ts)

**実装理由:**

```typescript
// Node.js にはネイティブの setImmediate() がある
setImmediate(callback);

// ブラウザでは存在しない
// → マイクロタスクキューで同等の動作を実現
// → Promise.resolve().then() で実装
```

### ポリフィルの注入方法

Webpack の `ProvidePlugin` を使用して自動注入します。

#### packages/suite-base/webpack.ts

**ファイル位置:** `/packages/suite-base/webpack.ts` (行 233-241)

```typescript
plugins: [
  new webpack.ProvidePlugin({
    // グローバルに process を注入
    process: ["@lichtblick/suite-base/util/process", "default"],

    // グローバルに setImmediate を注入
    setImmediate: ["@lichtblick/suite-base/util/setImmediate", "default"],

    // その他の注入
    React: "react",
    Buffer: ["buffer", "Buffer"],
  }),
];
```

**参照:** [実際のファイル](../packages/suite-base/webpack.ts#L233-L241)

**動作:**

```typescript
// コード内で process を使う
console.log(process.env);

// Webpack が自動的に以下に変換
import process from "@lichtblick/suite-base/util/process";
console.log(process.env);
```

## 具体的なポリフィル実装

### 1. process ポリフィル

#### 問題点

```typescript
// ブラウザでは process が存在しない
const isDev = process.env.NODE_ENV === "development"; // ReferenceError
```

#### 解決策

**ファイル位置:** `/packages/suite-base/src/util/process.ts` (行 11-23)

```typescript
// ブラウザ用 process オブジェクト
const process = {
  nextTick: (fn: Function, ...args: unknown[]): void => {
    queueMicrotask(() => {
      fn(...args);
    });
  },

  title: "browser",
  browser: true,
  env: {}, // ← ブラウザには環境変数がない
  argv: [],
};
```

**参照:** [実際のファイル](../packages/suite-base/src/util/process.ts#L11-L23)

#### 使用例

```typescript
// コード内
process.nextTick(() => {
  console.log("Next tick"); // マイクロタスクキューで実行
});

console.log(process.browser); // true
console.log(process.env); // {}
```

### 2. setImmediate ポリフィル

#### 問題点

```typescript
// Node.js にはある
setImmediate(callback); // ✓ 動作

// ブラウザにはない
setImmediate(callback); // ✗ ReferenceError
```

#### 解決策

**ファイル位置:** `/packages/suite-base/src/util/setImmediate.ts` (全15行)

```typescript
// ブラウザ用 setImmediate 実装
export default function setImmediate(
  callback: (..._args: unknown[]) => void,
  ...args: unknown[]
): NodeJS.Immediate {
  // マイクロタスクキューで実行
  void Promise.resolve().then(() => {
    callback(...args);
  });
  return undefined as unknown as NodeJS.Immediate;
}
```

**参照:** [実際のファイル](../packages/suite-base/src/util/setImmediate.ts)

#### 実装理由の詳細

```typescript
// ❌ 候補1: setTimeout を使う（遅い）
function setImmediate(callback) {
  setTimeout(callback, 0);
}
// 問題: マクロタスクキュー（遅い）

// ✓ 採用: Promise を使う（速い）
function setImmediate(callback) {
  return Promise.resolve().then(callback);
}
// 利点: マイクロタスクキュー（速い）

// イベントループの段階
┌───────────────────────────────────┐
│ コード実行                          │
├───────────────────────────────────┤
│ ↓ すべてのマイクロタスク実行        │
│ Promise.then() ← 速い             │
│ ↓ 最初のマクロタスク実行           │
│ setTimeout() ← 遅い               │
└───────────────────────────────────┘
```

### 3. Buffer ポリフィル

#### 問題点

```typescript
// Node.js には Buffer がある
const buf = Buffer.from([1, 2, 3]); // ✓ 動作

// ブラウザには Buffer がない
const buf = Buffer.from([1, 2, 3]); // ✗ ReferenceError
```

#### 解決策

**ファイル位置:** `/packages/suite-base/webpack.ts` (行 236)

```typescript
// npm の buffer パッケージを使用
plugins: [
  new webpack.ProvidePlugin({
    Buffer: ["buffer", "Buffer"], // buffer パッケージの Buffer クラス
  }),
];
```

**参照:** [実際のファイル](../packages/suite-base/webpack.ts#L236)

#### 使用例

```typescript
// コード内
const buf = Buffer.from([1, 2, 3]);
console.log(buf.length); // 3

const str = buf.toString("utf8");
```

## Webpackの役割

### ProvidePlugin の仕組み

**ファイル位置:** `/packages/suite-base/webpack.ts` (行 233-241)

```typescript
new webpack.ProvidePlugin({
  process: ["@lichtblick/suite-base/util/process", "default"],
});
```

**参照:** [実際のファイル](../packages/suite-base/webpack.ts#L233-L241)

**ビルド前:**

```typescript
// コード
console.log(process.env);
```

**ビルド後:**

```typescript
// 自動的に import が追加される
import process from "@lichtblick/suite-base/util/process";

console.log(process.env);
```

### resolve.fallback

**ファイル位置:** `/packages/suite-base/webpack.ts` (行 59-87)

Node.js のコアモジュールをブラウザ互換版に置き換え

```typescript
resolve: {
  fallback: {
    // Node.js モジュール → ブラウザ互換版
    path: require.resolve("path-browserify"),
    stream: require.resolve("readable-stream"),
    zlib: require.resolve("browserify-zlib"),
    crypto: require.resolve("crypto-browserify"),

    // ブラウザでは使えない（false で除外）
    fs: false,
    pnpapi: false,
  },
}
```

**効果:**

```typescript
// ビルド時に自動変換
import path from "path"; // → path-browserify に置き換え
import fs from "fs"; // → エラー（除外されている）
```

## トラブルシューティング

### 問題 1: process が undefined

**症状:**

```
TypeError: Cannot read property 'env' of undefined
```

**原因:**

1. ProvidePlugin の設定ミス
2. Webpack 設定が読み込まれていない

**解決:**

```typescript
// webpack.ts で確認
new webpack.ProvidePlugin({
  process: ["@lichtblick/suite-base/util/process", "default"],
}),
```

### 問題 2: setImmediate が遅い

**症状:** アニメーションやUIが遅延

**原因:**

1. `setTimeout(callback, 0)` を使っている
2. マクロタスクキューで遅延

**解決:**

```typescript
// Promise.resolve().then() を使う（速い）
void Promise.resolve().then(() => {
  callback(...args);
});
```

### 問題 3: Buffer が見つからない

**症状:**

```
Error: Module not found: 'buffer'
```

**原因:**

1. buffer パッケージがインストールされていない
2. ProvidePlugin で設定されていない

**解決:**

```bash
npm install buffer
```

```typescript
// webpack.ts
ProvidePlugin({
  Buffer: ["buffer", "Buffer"],
}),
```

### 問題 4: 環境変数が ブラウザで読み込まれていない

**症状:**

```typescript
process.env.API_URL; // undefined
```

**原因:**

1. `.env` ファイルが読み込まれていない
2. DefinePlugin で注入されていない

**解決:**

```typescript
// webpack.ts
dotenv.config();  // .env 読み込み

new webpack.DefinePlugin({
  API_URL: JSON.stringify(process.env.API_URL),
}),
```

## ポリフィル vs 他の手段

### ポリフィル（Lichtblickの採用）

**メリット:**

```typescript
✓ コード内で通常の Node.js API が使える
✓ コードの変更が少ない
✓ パフォーマンスが良い（カスタム実装）
```

**デメリット:**

```typescript
✗ ブラウザで全機能が利用できるわけではない
✗ ポリフィル実装が必要
```

### 条件分岐（別の手段）

```typescript
if (typeof window !== "undefined") {
  // ブラウザ環境
} else {
  // Node.js 環境
}
```

**メリット:**

```typescript
✓ 明示的に環境を分岐
✓ 環境別の実装を完全に制御
```

**デメリット:**

```typescript
✗ コードが複雑になる
✗ 複数の実装が必要
```

### 環境別バンドル（別の手段）

```
同じコードから複数のバンドルを生成
- client.js (ブラウザ用)
- server.js (Node.js 用)
```

## ベストプラクティス

### 1. ポリフィル機能を把握する

```typescript
// ✓ 実装されている機能
process.nextTick()
process.browser
process.env          // ただし空（ブラウザに環境変数がない）

// ✗ 実装されていない機能
process.exit()       // ブラウザでプロセス終了できない
process.chdir()      // ブラウザにファイルシステムがない
fs モジュール        // ファイル操作不可
```

### 2. ブラウザ環境での環境変数

```typescript
// ❌ ブラウザで読み込まれない
console.log(process.env.API_URL); // undefined

// ✓ ビルド時に注入される
console.log(API_URL); // "https://api.example.com"
```

### 3. 環境判定は正しく実行する

```typescript
// ✓ 推奨: globalThis チェック
const isBrowser = typeof globalThis.document !== "undefined";

// ✓ 推奨: window チェック
const isBrowser = typeof window !== "undefined";

// △ 非推奨: process チェック（ポリフィルがあるため）
const isNode = typeof process !== "undefined" && process.versions?.node;
```

### 4. パフォーマンスに注意

```typescript
// ❌ 遅い
setTimeout(callback, 0); // マクロタスク

// ✓ 速い
process.nextTick(callback); // マイクロタスク
// または
queueMicrotask(callback); // マイクロタスク
```

## 関連リソース

### ポリフィル関連

- [MDN: ポリフィル](https://developer.mozilla.org/ja/docs/Glossary/Polyfill)
- [Web Platform Tests](https://wpt.fyi/)

### ブラウザAPI

- [MDN: Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- [Can I use](https://caniuse.com/)

### Node.js API

- [Node.js process object](https://nodejs.org/api/process.html)
- [Node.js setImmediate](https://nodejs.org/api/timers.html#timers_setimmediate_callback_args)

### 関連ドキュメント

- [環境変数設定](./ENVIRONMENT_VARIABLES.md)
- [Webpack ビルドフロー](./WEBPACK_BUILD_FLOW.md)
- [dotenv ガイド](./DOTENV_GUIDE.md)

## まとめ

### ポリフィル実装ファイル一覧表

| 機能                 | ファイル位置                                           | 行数      | 説明                                                           |
| -------------------- | ------------------------------------------------------ | --------- | -------------------------------------------------------------- |
| **process**          | `/packages/suite-base/src/util/process.ts`             | 全28行    | ブラウザ用 process オブジェクト（nextTick、env など）          |
| **setImmediate**     | `/packages/suite-base/src/util/setImmediate.ts`        | 全15行    | ブラウザ用 setImmediate 実装（Promise ベース）                 |
| **Webpack 注入設定** | `/packages/suite-base/webpack.ts`                      | 行233-241 | ProvidePlugin で process、Buffer、setImmediate を自動注入      |
| **resolve.fallback** | `/packages/suite-base/webpack.ts`                      | 行59-87   | Node.js モジュールをブラウザ互換版に置き換え                   |
| **Desktop Renderer** | `/packages/suite-desktop/src/webpackRendererConfig.ts` | 全99行    | Electron Renderer プロセスの Webpack 設定（makeConfig を継承） |

### processオブジェクトがブラウザにない理由

| 項目                  | 説明                           |
| --------------------- | ------------------------------ |
| **実装の影響か**      | ✗ No - ブラウザ仕様            |
| **dotenv がないから** | ✗ No - fs モジュールがないから |
| **ブラウザの仕様**    | ✓ Yes - セキュリティ設計       |

### ブラウザの設計思想

1. **セキュリティ** - サンドボックス化
2. **用途の違い** - Webアプリケーション向け
3. **性質の違い** - プロセス単位でなくタブ単位

### Lichtblickでの対応

1. **ポリフィル実装** - process, setImmediate を再実装
2. **Webpack 統合** - ProvidePlugin で自動注入
3. **互換性** - Node.js コードがそのまま使える

### ブラウザで環境変数を使う方法

```
.env (Node.js で読み込み)
    ↓
Webpack DefinePlugin
    ↓
ビルド時に定数として埋め込み
    ↓
ブラウザで実行
```

このアーキテクチャにより、Lichtblickは**同じコード**を Web、Desktop、Benchmarkなど複数の環境で動作させることができます。
