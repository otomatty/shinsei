# Tailwind CSS 実装ガイド

## 概要

このドキュメントでは、Leptos + Tauri環境でTailwind CSSを使用できるようにした実装手順を説明します。

## 実装方法

TrunkのPostCSS処理が期待通りに動作しなかったため、**事前ビルド方式**を採用しました。Tailwind CSSをビルド時に処理し、生成されたCSSファイルをTrunkで読み込む方法です。

## セットアップ手順

### 1. 依存関係のインストール

`package.json`に以下の依存関係を追加：

```json
{
  "devDependencies": {
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.35",
    "autoprefixer": "^10.4.17"
  }
}
```

インストール：

```bash
bun install
# または
npm install
```

### 2. Tailwind CSS設定ファイルの作成

`tailwind.config.js`を作成：

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{rs,html}",
  ],
  darkMode: 'class', // classベースのダークモード
  theme: {
    extend: {
      colors: {
        // Lichtblickのカスタムカラーパレット
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#9480ed', // DEFAULT
          600: '#7a6bc4',
          700: '#6d5fb0',
          800: '#5a4d93',
          900: '#4c4177',
          DEFAULT: '#9480ed',
          dark: '#7a6bc4',
          light: '#b5a5f0',
        },
        // ... その他のカラー定義
      },
    },
  },
  plugins: [],
}
```

**重要なポイント**:
- `content`オプションで、Tailwindがスキャンするファイルを指定（`.rs`と`.html`ファイル）
- カスタムカラーには数値バリエーション（50-900）を定義する必要がある（`bg-primary-500`などのクラスを使用するため）

### 3. PostCSS設定ファイルの作成

`postcss.config.js`を作成：

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 4. スタイルファイルの設定

`styles.css`にTailwindディレクティブを追加：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
  }
}

@layer components {
  /* カスタムコンポーネントのスタイル */
  .logo {
    @apply h-24 p-6 transition-all duration-300;
    will-change: filter;
  }
}
```

### 5. ビルドスクリプトの設定

`package.json`にビルドスクリプトを追加：

```json
{
  "scripts": {
    "build:css": "tailwindcss -i ./styles.css -o ./tailwind.css --minify",
    "dev": "npm run build:css && trunk serve",
    "build": "npm run build:css && trunk build"
  }
}
```

**動作**:
- `build:css`: `styles.css`を読み込んで`tailwind.css`を生成（ミニファイ済み）
- `dev`: CSSをビルドしてからTrunkの開発サーバーを起動
- `build`: CSSをビルドしてからTrunkで本番ビルド

### 6. HTMLでの参照

`index.html`で生成されたCSSファイルを参照：

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Tauri + Leptos App</title>
    <link data-trunk rel="css" href="tailwind.css" />
    <link data-trunk rel="copy-dir" href="public" />
    <link data-trunk rel="rust" data-wasm-opt="z" />
  </head>
  <body></body>
</html>
```

**重要なポイント**:
- `tailwind.css`はプロジェクトルートに生成される
- Trunkが起動する前にファイルが存在する必要がある（`dev`スクリプトで事前にビルド）

## 使用方法

### 開発サーバーの起動

```bash
npm run dev
```

これにより：
1. `tailwind.css`が生成される
2. Trunkの開発サーバーが起動する（`http://localhost:1420`）

### Leptosコンポーネントでの使用

```rust
use leptos::*;

#[component]
pub fn Button(children: Children) -> impl IntoView {
    view! {
        <button class="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">
            {children()}
        </button>
    }
}
```

### カスタムカラーの使用

`tailwind.config.js`で定義したカスタムカラーを使用：

```rust
view! {
    <div class="bg-background-default text-text-primary">
        <h1 class="text-primary-500">"Title"</h1>
        <p class="text-text-secondary">"Subtitle"</p>
    </div>
}
```

## トラブルシューティング

### Tailwindスタイルが適用されない場合

1. **CSSファイルが生成されているか確認**
   ```bash
   ls -lh tailwind.css
   ```

2. **ビルドスクリプトを手動実行**
   ```bash
   npm run build:css
   ```

3. **ブラウザのキャッシュをクリア**
   - ハードリロード（Cmd+Shift+R / Ctrl+Shift+R）

4. **生成されたCSSにクラスが含まれているか確認**
   ```bash
   grep -c "bg-primary-500" tailwind.css
   ```

### カスタムカラーのクラスが生成されない場合

`tailwind.config.js`でカラーに数値バリエーションを定義しているか確認：

```javascript
primary: {
  500: '#9480ed', // これがないと bg-primary-500 が生成されない
  600: '#7a6bc4',
  // ...
}
```

### ファイルが見つからないエラー

Trunkが起動する前に`tailwind.css`が存在する必要があります。`dev`スクリプトで事前にビルドするように設定されていますが、手動でビルドする場合：

```bash
npm run build:css
trunk serve
```

## ファイル構造

```
shinsei/
├── tailwind.config.js      # Tailwind設定
├── postcss.config.js        # PostCSS設定
├── styles.css               # Tailwindディレクティブを含むソースCSS
├── tailwind.css             # 生成されたCSS（ビルド時に作成）
├── package.json             # ビルドスクリプト定義
├── index.html               # CSSファイルの参照
└── src/
    └── app.rs               # Leptosコンポーネント（Tailwindクラスを使用）
```

## なぜこの方法を採用したか

### 問題点

最初はTrunkの`data-postcss`属性を使用してPostCSSを処理しようとしましたが、以下の問題がありました：

1. TrunkのPostCSS処理が期待通りに動作しない
2. 生成されたCSSにTailwindディレクティブがそのまま残る
3. ビルドプロセスが複雑になる

### 解決策

**事前ビルド方式**を採用：

- ✅ Tailwind CLIで確実にCSSを生成
- ✅ 生成されたCSSをTrunkで読み込むだけのシンプルな構成
- ✅ ビルドプロセスが明確で理解しやすい
- ✅ デバッグが容易

### 代替案との比較

| 方法 | メリット | デメリット |
|------|---------|-----------|
| **事前ビルド（採用）** | シンプル、確実に動作 | ビルド時間が少し増える |
| Trunk PostCSS | 統合されている | 動作が不安定 |
| Webpack/Vite | 高度な機能 | 設定が複雑、Trunkと統合困難 |

## 今後の改善点

1. **ウォッチモードの追加**: CSSファイルの変更を自動検知して再ビルド
2. **開発時の最適化**: 開発時はミニファイを無効化してデバッグしやすくする
3. **PurgeCSSの最適化**: 使用されていないクラスを削除してファイルサイズを削減

## 参考資料

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Trunk Documentation](https://trunkrs.dev/)
- [Leptos Documentation](https://leptos.dev/)

---

**最終更新**: 2025-11-19  
**実装者**: AI Assistant

