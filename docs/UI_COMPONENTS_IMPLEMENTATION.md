# UIコンポーネント実装ガイド

## 概要

LichtblickのMUIコンポーネントをLeptos + Tailwind CSSで再実装するための基本UIコンポーネントライブラリです。

## 実装状況

### ✅ 完了

1. **コンポーネントライブラリの構造**
   - `src/components/` ディレクトリ作成
   - `mod.rs` でモジュール管理
   - 各コンポーネントを個別ファイルに分離

2. **Buttonコンポーネント** (`src/components/button.rs`)
   - ✅ バリアント: Contained, Outlined, Text
   - ✅ カラー: Primary, Secondary, Success, Warning, Error, Info, Inherit
   - ✅ サイズ: Small, Medium, Large
   - ✅ プロパティ: disabled, full_width, on_click, class

3. **TextFieldコンポーネント** (`src/components/text_field.rs`)
   - ✅ バリアント: Outlined, Filled, Standard
   - ✅ プロパティ: label, value, set_value, placeholder, disabled, error, helper_text

4. **Dialogコンポーネント** (`src/components/dialog.rs`)
   - ✅ Dialog, DialogTitle, DialogContent, DialogActions
   - ✅ バックドロップクリックで閉じる機能

5. **Typographyコンポーネント** (`src/components/typography.rs`)
   - ✅ バリアント: H1-H6, Subtitle1/2, Body1/2, Caption, Overline
   - ✅ カラー: Primary, Secondary, Error, Warning, Success, Info, Inherit

### 🔧 修正が必要

現在、コンパイルエラーが発生しています：

1. **Callbackの使用方法**
   - Leptos 0.7のAPIに合わせて修正が必要
   - `Callback::call()` → `Callback::invoke()` または適切なメソッド

2. **Signalの型**
   - `Signal<bool>` の使用方法を確認

## ファイル構造

```
src/
├── components/
│   ├── mod.rs           # モジュール定義とエクスポート
│   ├── button.rs        # Buttonコンポーネント
│   ├── text_field.rs    # TextFieldコンポーネント
│   ├── dialog.rs        # Dialogコンポーネント
│   └── typography.rs    # Typographyコンポーネント
├── app.rs               # メインアプリ（コンポーネントを使用）
└── main.rs              # エントリーポイント
```

## 使用方法

### Buttonコンポーネント

```rust
use crate::components::{Button, ButtonVariant, ButtonColor, ButtonSize};

view! {
    <Button
        variant=ButtonVariant::Contained
        color=ButtonColor::Primary
        size=ButtonSize::Medium
        on_click=Callback::new(|_| {
            println!("Clicked!");
        })
    >
        "Click me"
    </Button>
}
```

### TextFieldコンポーネント

```rust
use crate::components::{TextField, TextFieldVariant};

let (value, set_value) = signal(String::new());

view! {
    <TextField
        label=Some("Name".to_string())
        value=value
        set_value=set_value
        variant=Some(TextFieldVariant::Outlined)
        placeholder=Some("Enter name...".to_string())
    />
}
```

### Dialogコンポーネント

```rust
use crate::components::{Dialog, DialogTitle, DialogContent, DialogActions};

let (open, set_open) = signal(false);

view! {
    <Dialog
        open=open
        on_close=Some(Callback::new(move |_| {
            set_open.set(false);
        }))
    >
        <DialogTitle>
            "Dialog Title"
        </DialogTitle>
        <DialogContent>
            "Dialog content here"
        </DialogContent>
        <DialogActions>
            <Button on_click=Callback::new(move |_| {
                set_open.set(false);
            })>
                "Close"
            </Button>
        </DialogActions>
    </Dialog>
}
```

### Typographyコンポーネント

```rust
use crate::components::{Typography, TypographyVariant, TypographyColor};

view! {
    <Typography
        variant=TypographyVariant::H1
        color=TypographyColor::Primary
    >
        "Heading 1"
    </Typography>
}
```

## 次のステップ

### 1. コンパイルエラーの修正

- [ ] `Callback`の使用方法をLeptos 0.7のAPIに合わせて修正
- [ ] `Signal`の型を確認して修正
- [ ] コンパイルが通ることを確認

### 2. 追加コンポーネントの実装

- [ ] Selectコンポーネント
- [ ] Checkboxコンポーネント
- [ ] Switchコンポーネント
- [ ] Alertコンポーネント
- [ ] Tooltipコンポーネント

### 3. レイアウトコンポーネント

- [ ] Gridコンポーネント
- [ ] Stackコンポーネント
- [ ] Boxコンポーネント
- [ ] Paperコンポーネント
- [ ] Containerコンポーネント

### 4. テストとドキュメント

- [ ] 各コンポーネントの動作確認
- [ ] 使用例の追加
- [ ] ドキュメントの整備

## 参考資料

- [Leptos Documentation](https://leptos.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [MUI Documentation](https://mui.com/)

---

**作成日**: 2025-11-19  
**最終更新**: 2025-11-19

