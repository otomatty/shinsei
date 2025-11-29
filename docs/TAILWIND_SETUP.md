# Tailwind CSS セットアップガイド

## 概要

このプロジェクトでは、MUI（Material-UI）の代替として**Tailwind CSS**を使用します。

**✅ 実装完了**: Tailwind CSSは正常に動作しています。

詳細な実装手順については、[TAILWIND_IMPLEMENTATION.md](./TAILWIND_IMPLEMENTATION.md)を参照してください。

## セットアップ状況

✅ **完了**:
- `tailwind.config.js` の作成
- `styles.css` にTailwindディレクティブを追加
- Lichtblickのカスタムカラーパレットを定義
- ビルドスクリプトの設定
- HTMLでの参照設定

## インストール手順

### 1. Tailwind CSSのインストール

```bash
# npmを使用する場合
npm install -D tailwindcss postcss autoprefixer

# または bun を使用する場合（プロジェクトの推奨）
bun add -d tailwindcss postcss autoprefixer
```

### 2. PostCSS設定ファイルの作成

`postcss.config.js` を作成:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 3. Trunkでのビルド設定

Trunkは自動的にPostCSSを処理しますが、必要に応じて `Trunk.toml` を確認してください。

## 設定ファイル

### `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{rs,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Lichtblickのカスタムカラーパレット
        primary: {
          DEFAULT: '#9480ed',
          dark: '#7a6bc4',
          light: '#b5a5f0',
        },
        // ... その他の色定義
      },
    },
  },
  plugins: [],
}
```

### `styles.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  /* カスタムコンポーネントのスタイル */
}
```

## 使用方法

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

### ダークモードの使用

```rust
#[component]
pub fn App() -> impl IntoView {
    let (is_dark, set_is_dark) = signal(true);
    
    view! {
        <div class=move || if is_dark.get() { "dark" } else { "" }>
            <div class="bg-white dark:bg-background-default text-gray-900 dark:text-text-primary">
                {/* コンテンツ */}
            </div>
        </div>
    }
}
```

## カスタムカラーパレット

Lichtblickのカスタムカラーパレットが `tailwind.config.js` に定義されています:

- `primary`: プライマリカラー（#9480ed）
- `secondary`: セカンダリカラー（#b1b1b1）
- `error`: エラーカラー（#f54966）
- `warning`: 警告カラー（#eba800）
- `success`: 成功カラー（#92c353）
- `info`: 情報カラー（#29bee7）
- `background`: 背景色（default, paper, menu）
- `text`: テキスト色（primary, secondary）

## コンポーネント実装例

### Button

```rust
#[component]
pub fn Button(
    children: Children,
    #[prop(optional)] variant: Option<String>,
    #[prop(optional)] color: Option<String>,
    #[prop(optional)] on_click: Option<Callback<()>>,
) -> impl IntoView {
    let variant = variant.unwrap_or_else(|| "contained".to_string());
    let color = color.unwrap_or_else(|| "primary".to_string());
    
    let class = format!(
        "px-4 py-2 rounded-md font-medium transition-colors {}",
        match variant.as_str() {
            "contained" => format!("bg-{}-500 text-white hover:bg-{}-600", color, color),
            "outlined" => format!("border-2 border-{}-500 text-{}-500 hover:bg-{}-50", color, color, color),
            "text" => format!("text-{}-500 hover:bg-{}-50", color, color),
            _ => "".to_string(),
        }
    );
    
    view! {
        <button class=class on:click=move |_| {
            if let Some(cb) = on_click {
                cb.call(());
            }
        }>
            {children()}
        </button>
    }
}
```

### TextField

```rust
#[component]
pub fn TextField(
    #[prop(optional)] label: Option<String>,
    value: ReadSignal<String>,
    set_value: WriteSignal<String>,
    #[prop(optional)] variant: Option<String>,
) -> impl IntoView {
    let variant = variant.unwrap_or_else(|| "outlined".to_string());
    
    view! {
        <div class="flex flex-col gap-1">
            {label.map(|l| view! { 
                <label class="text-sm font-medium text-text-primary">{l}</label> 
            })}
            <input
                type="text"
                class=format!(
                    "px-3 py-2 rounded-md border transition-colors {}",
                    match variant.as_str() {
                        "outlined" => "border-gray-300 dark:border-grey-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white dark:bg-background-paper text-gray-900 dark:text-text-primary",
                        "filled" => "bg-gray-100 dark:bg-grey-800 border-0 focus:bg-gray-200 dark:focus:bg-grey-700",
                        _ => "",
                    }
                )
                prop:value=value
                on:input=move |ev| {
                    set_value.set(event_target_value(&ev));
                }
            />
        </div>
    }
}
```

## 次のステップ

1. 基本コンポーネントライブラリの実装（`src/components/`）
2. テーマシステムの実装
3. アイコンライブラリの統合（Heroicons推奨）
4. アクセシビリティ対応

## 参考資料

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Leptos Documentation](https://leptos.dev/)
- [Lichtblick MUI代替計画](./REPLACEMENT_CHALLENGES.md)

