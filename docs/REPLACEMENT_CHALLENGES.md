# Lichtblick React+Electron → Leptos+Tauri リプレイス課題分析

**作成日**: 2025-01-XX  
**対象**: LichtblickアプリケーションのRust環境への移行

---

## 📋 目次

1. [現在の実装状況](#現在の実装状況)
2. [主要な課題](#主要な課題)
3. [課題別の解決策](#課題別の解決策)
4. [移行ロードマップ](#移行ロードマップ)
5. [技術的検討事項](#技術的検討事項)

---

## 現在の実装状況

### ✅ 完了している部分

#### 1. Tauri + Leptosの基本セットアップ

```12:14:src-tauri/tauri.conf.json
  "build": {
    "beforeDevCommand": "trunk serve",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "trunk build",
    "frontendDist": "../dist"
  },
```

- ✅ Tauri 2.0の設定完了
- ✅ Leptos 0.7の基本セットアップ
- ✅ Trunkによるビルド設定
- ✅ 基本的なTauriコマンド（`greet`）の実装

#### 2. プロジェクト構造

```
shinsei/
├── src/                    # Leptosフロントエンド
│   ├── app.rs             # メインアプリコンポーネント
│   └── main.rs            # エントリーポイント
├── src-tauri/             # Tauriバックエンド
│   ├── src/
│   │   ├── lib.rs         # Tauriコマンド定義
│   │   └── main.rs        # メインプロセス
│   └── tauri.conf.json    # Tauri設定
└── Trunk.toml             # Leptosビルド設定
```

### ❌ 未実装の部分

#### 1. Lichtblickの主要機能

- ❌ データソース管理システム（9種類のデータソース）
- ❌ Playerシステム（メッセージ再生・制御）
- ❌ 3D可視化エンジン（Three.js相当）
- ❌ パネルシステム（20種類以上のパネル）
- ❌ 拡張機能システム（`.foxe`ファイル）
- ❌ レイアウト管理システム
- ❌ マーケットプレイス統合

#### 2. Electron固有機能の代替

- ❌ ファイルシステムアクセス（Electron IPC → Tauri Commands）
- ❌ ウィンドウ管理（Electron BrowserWindow → Tauri Window）
- ❌ ネイティブメニュー（Electron Menu → Tauri Menu）
- ❌ プロトコルハンドラー（`lichtblick://`）
- ❌ 自動更新システム
- ❌ デバッガー統合（Chrome DevTools）

---

## 主要な課題

### 🔴 課題1: UIフレームワークの違い

**現状**: React（コンポーネントベース） → **目標**: Leptos（リアクティブ）

**問題点**:
- ReactのJSX構文とLeptosのマクロ構文の違い
- React Hooks（`useState`, `useEffect`等）とLeptos Signalsの概念の違い
- 既存のReactコンポーネント（1,500+ファイル）の移行

**影響範囲**:
- `packages/suite-base/src/` の全コンポーネント
- Material-UIコンポーネントの代替
- カスタムフック（`packages/hooks/`）

### 🔴 課題2: 3D可視化エンジンの置き換え

**現状**: Three.js（JavaScript/WebGL） → **目標**: Rust実装（wgpu/WebGPU）

**問題点**:
- Three.jsの187ファイル相当の機能をRustで再実装
- WebGLからWebGPUへの移行
- 点群、メッシュ、URDFパーサーの実装

**影響範囲**:
- `packages/suite-base/src/panels/ThreeDeeRender/` の全機能
- `packages/suite-base/src/render/` のレンダリングエンジン
- 3Dシーン管理、カメラ制御、ライティング

### 🔴 課題3: データソースシステムの再実装

**現状**: TypeScript実装 → **目標**: Rust実装

**問題点**:
- MCAPリーダーの実装（現在はJavaScript）
- ROS1/ROS2クライアントの実装（`rclrs`の統合）
- WebSocket通信の実装
- Workerスレッドでの非同期処理

**影響範囲**:
- `packages/suite-base/src/dataSources/` の全データソース
- `packages/suite-base/src/players/` のPlayerシステム
- `packages/mcap-support/` のMCAPサポート

### 🔴 課題4: Electron固有機能の代替

**現状**: Electron API → **目標**: Tauri API

**問題点**:
- IPC通信のパターン変更（`ipcMain`/`ipcRenderer` → Tauri Commands）
- ファイルシステムアクセスの権限管理
- ネイティブウィンドウAPIの違い
- プロトコルハンドラーの実装方法

**影響範囲**:
- `packages/suite-desktop/src/main/` のメインプロセス
- `packages/suite-desktop/src/preload/` のプリロードスクリプト
- ファイルオープン、ウィンドウ管理、メニューシステム

### 🔴 課題5: 状態管理の移行

**現状**: Zustand（React用） → **目標**: Leptos Signals + Tauri State

**問題点**:
- Zustandストアの移行
- グローバル状態の管理方法
- 永続化ストレージ（LocalStorage）の代替

**影響範囲**:
- `packages/suite-base/src/context/` の全コンテキスト
- レイアウト管理、設定管理、ユーザープロファイル

### 🔴 課題6: 拡張機能システム

**現状**: JavaScript動的ローディング → **目標**: Rust/WASM拡張

**問題点**:
- `.foxe`ファイル形式の互換性
- JavaScript拡張機能の実行環境
- サンドボックス化の実装

**影響範囲**:
- `packages/suite-base/src/components/PanelExtensionAdapter/`
- 拡張機能マーケットプレイス
- 拡張機能API

---

## 課題別の解決策

### ✅ 解決策1: UIフレームワークの移行戦略

**決定**: Tailwind CSSを使用してMUIを代替します。

#### Tailwind CSSセットアップ

**設定ファイル**: `tailwind.config.js` を作成済み

**主要な設定**:
- `darkMode: 'class'` - クラスベースのダークモード
- Lichtblickのカスタムカラーパレットを定義
- コンテンツパス: `./src/**/*.{rs,html}`

**使用方法**:
```rust
// LeptosコンポーネントでTailwindクラスを使用
#[component]
pub fn Button(children: Children) -> impl IntoView {
    view! {
        <button class="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600">
            {children()}
        </button>
    }
}
```

#### MUI（Material-UI）の使用状況

Lichtblickで使用されている主要なMUIコンポーネント：

**基本コンポーネント**:
- `Button`, `IconButton`, `TextField`, `Select`, `Checkbox`, `Switch`
- `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions`
- `Typography`, `Alert`, `CircularProgress`, `Tooltip`
- `ToggleButton`, `ToggleButtonGroup`
- `Autocomplete`, `FormControl`, `FormLabel`, `MenuItem`

**レイアウトコンポーネント**:
- `Grid`, `Stack`, `Box`, `Paper`, `Container`
- `AppBar`, `Toolbar`, `Drawer`, `List`, `ListItem`

**アイコン**:
- `@mui/icons-material` (Material Icons)

**テーマシステム**:
- カスタムパレット（ダークモード/ライトモード）
- `ThemeProvider`, `CssBaseline`
- `makeStyles` (tss-react/mui)

#### Leptos環境でのMUI代替案

**採用決定**: **Tailwind CSS + カスタムコンポーネント** ⭐⭐⭐⭐⭐

Tailwind CSSを使用して、MUIコンポーネントをLeptosで再実装します。

##### オプション1: Tailwind CSS + カスタムコンポーネント（採用）⭐⭐⭐⭐⭐

**特徴**:
- ユーティリティファーストのCSSフレームワーク
- カスタムコンポーネントを自由に実装可能
- Material DesignのスタイルをTailwindで再現
- **プロジェクトで採用決定**

**セットアップ完了**:
- ✅ `tailwind.config.js` を作成
- ✅ `styles.css` にTailwindディレクティブを追加
- ✅ Lichtblickのカスタムカラーパレットを定義

**実装例**:
```rust
use leptos::*;

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
        <button
            class=class
            on:click=move |_| {
                if let Some(cb) = on_click {
                    cb.call(());
                }
            }
        >
            {children()}
        </button>
    }
}
```

**メリット**:
- ✅ 完全なカスタマイズ性
- ✅ バンドルサイズの最適化が可能
- ✅ 既存のTailwind知識を活用可能
- ✅ Material Designのスタイルを完全に再現可能
- ✅ プロジェクト固有のデザインシステムを構築可能

**実装計画**:
1. 基本コンポーネントライブラリの構築（`src/components/`）
2. MUIコンポーネントの段階的な再実装
3. テーマシステムの実装
4. アクセシビリティ対応

##### オプション2: Thaw UI（補完的に使用可能）⭐⭐⭐⭐

**用途**: Tailwind CSSで実装が困難なコンポーネントの補完として使用可能

**特徴**:
- Leptos専用に開発されたコンポーネントライブラリ
- Material Designにインスパイアされたデザイン
- Leptos 0.7対応

**使用例**: 複雑なコンポーネント（DatePicker、Autocomplete等）で補完的に使用

**GitHub**: https://github.com/thaw-org/thaw

#### Material Iconsの代替

**オプション1: Leptos Icons**
```rust
use leptos_icons::*;

view! {
    <Icon icon=Icon::from(icondata::AiSearchOutlined) />
}
```

**オプション2: SVGアイコンを直接使用**
```rust
view! {
    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/>
    </svg>
}
```

**オプション3: Heroicons（推奨）**
- Tailwind CSSの公式アイコンセット
- SVG形式で提供
- Leptosで直接使用可能

#### テーマシステムの実装

**Leptos + Tailwindでのテーマ実装**:
```rust
// テーマコンテキスト
#[derive(Clone)]
pub struct Theme {
    pub mode: Signal<bool>, // true = dark, false = light
}

#[component]
pub fn ThemeProvider(children: Children) -> impl IntoView {
    let (is_dark, set_is_dark) = signal(true);
    
    // CSS変数でテーマを管理
    view! {
        <div
            class=move || if is_dark.get() { "dark" } else { "" }
            class="transition-colors"
        >
            {children()}
        </div>
    }
}

// Tailwind設定でダークモードを有効化
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#9480ed',
          dark: '#7a6bc4',
        },
      },
    },
  },
}
```

#### 実装戦略（Tailwind CSS採用）

**Phase 1: 基本コンポーネントライブラリの構築（Week 1-2）**
1. ✅ Tailwind CSSのセットアップ完了
2. [ ] 基本コンポーネントの実装
   - Button（contained, outlined, text variants）
   - TextField（outlined, filled variants）
   - Dialog（Dialog, DialogTitle, DialogContent, DialogActions）
   - Select, Checkbox, Switch
   - Typography, Alert, Tooltip
3. [ ] コンポーネントライブラリのディレクトリ構造作成
   ```
   src/
   ├── components/
   │   ├── button.rs
   │   ├── text_field.rs
   │   ├── dialog.rs
   │   ├── select.rs
   │   ├── checkbox.rs
   │   ├── switch.rs
   │   ├── typography.rs
   │   ├── alert.rs
   │   └── tooltip.rs
   ├── theme/
   │   └── theme.rs
   └── lib.rs
   ```

**Phase 2: レイアウトコンポーネント（Week 3-4）**
1. [ ] Grid, Stack, Box, Paper, Container
2. [ ] AppBar, Toolbar, Drawer
3. [ ] List, ListItem

**Phase 3: テーマシステムの実装（Week 5-6）**
1. [ ] ダークモード/ライトモードの切り替え
2. [ ] カスタムカラーパレットの完全実装
3. [ ] テーマコンテキストの作成

**Phase 4: 高度なコンポーネント（Month 2）**
1. [ ] Autocomplete
2. [ ] DatePicker（必要に応じてThaw UIを使用）
3. [ ] DataGrid/Table
4. [ ] Menu, MenuItem

**Phase 5: 最適化とドキュメント（Month 3）**
1. [ ] パフォーマンス最適化
2. [ ] バンドルサイズの削減
3. [ ] コンポーネントドキュメントの整備
4. [ ] Storybook相当のドキュメント作成

#### 実装例：MUIコンポーネントのLeptos実装

**Button（MUI）→ Leptos（Tailwind）**:
```rust
// MUI
<Button variant="contained" color="primary" onClick={handleClick}>
  Click me
</Button>

// Leptos + Tailwind
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

**TextField（MUI）→ Leptos（Tailwind）**:
```rust
// MUI
<TextField
  label="File path"
  value={path}
  onChange={(e) => setPath(e.target.value)}
  variant="outlined"
/>

// Leptos + Tailwind
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
            {label.map(|l| view! { <label class="text-sm font-medium">{l}</label> })}
            <input
                type="text"
                class=format!(
                    "px-3 py-2 rounded-md border {}",
                    match variant.as_str() {
                        "outlined" => "border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500",
                        "filled" => "bg-gray-100 border-0 focus:bg-gray-200",
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

#### 使用ライブラリまとめ

| ライブラリ | 用途 | ステータス | 備考 |
|-----------|------|----------|------|
| **Tailwind CSS** | スタイリング | ✅ 採用・セットアップ完了 | ユーティリティファースト、主要UIフレームワーク |
| **Heroicons** | アイコン | 📋 推奨 | Tailwind公式、SVG形式 |
| **leptos-use** | ユーティリティ | 📋 推奨 | Hooks相当の機能 |
| **Thaw UI** | 補完コンポーネント | 📋 オプション | 必要に応じて使用 |

#### 実装チェックリスト

**セットアップ**:
- [x] Tailwind CSSのセットアップ
- [x] `tailwind.config.js` の作成
- [x] `styles.css` の更新
- [x] カスタムカラーパレットの定義

**基本コンポーネント**:
- [ ] Button（contained, outlined, text variants）
- [ ] TextField（outlined, filled variants）
- [ ] Dialog（Dialog, DialogTitle, DialogContent, DialogActions）
- [ ] Select, Checkbox, Switch
- [ ] Typography, Alert, Tooltip

**レイアウトコンポーネント**:
- [ ] Grid, Stack, Box, Paper, Container
- [ ] AppBar, Toolbar, Drawer
- [ ] List, ListItem

**テーマシステム**:
- [ ] ダークモード/ライトモードの切り替え
- [ ] テーマコンテキストの実装
- [ ] CSS変数によるテーマ管理

**アイコン**:
- [ ] Heroiconsの統合
- [ ] アイコンコンポーネントの作成

**その他**:
- [ ] カスタムコンポーネントライブラリの構築
- [ ] アクセシビリティ対応（ARIA属性等）
- [ ] ドキュメント整備

### ✅ 解決策2: 3D可視化エンジンの実装

#### アーキテクチャ設計

**オプション1: wgpu直接実装（推奨）**
- `wgpu`クレートを使用
- WebGPU APIでブラウザ対応
- ネイティブパフォーマンス

**オプション2: Three.js WASMバインディング**
- `three-rs`または`wasm-bindgen`でThree.jsをラップ
- 既存のThree.jsコードを部分的に再利用

#### 実装計画

```rust
// wgpuベースのレンダラー実装例
pub struct Renderer {
    device: wgpu::Device,
    queue: wgpu::Queue,
    surface: wgpu::Surface<'static>,
    scene: Scene,
}

impl Renderer {
    pub fn render(&mut self) -> Result<(), RenderError> {
        // シーンのレンダリング
        // 点群、メッシュ、URDFモデルの描画
    }
}
```

#### 優先順位

1. **基本レンダラー**（カメラ、ライティング）
2. **プリミティブ形状**（Cube、Sphere、Arrow）
3. **点群レンダラー**（最適化が重要）
4. **メッシュレンダラー**
5. **URDFパーサー**

### ✅ 解決策3: データソースシステムの実装

#### Rust実装戦略

**MCAPサポート**:
```rust
// MCAPリーダーの実装
use mcap_rs::McapReader;

pub struct McapDataSource {
    reader: McapReader,
    topics: Vec<String>,
}

impl DataSource for McapDataSource {
    fn initialize(&mut self) -> Result<Box<dyn Player>, DataSourceError> {
        // MCAPファイルの読み込み
        // Playerインスタンスの生成
    }
}
```

**ROS2サポート**:
```rust
// rclrsを使用したROS2クライアント
use rclrs::{Context, Node};

pub struct Ros2DataSource {
    context: Context,
    node: Node,
    subscriptions: Vec<Subscription>,
}
```

**WebSocketサポート**:
```rust
// tokio-tungsteniteを使用
use tokio_tungstenite::{connect_async, WebSocketStream};

pub struct WebSocketDataSource {
    stream: WebSocketStream<TcpStream>,
}
```

#### 非同期処理

- `tokio`ランタイムを使用
- Tauriコマンドで非同期処理を実行
- Workerスレッドでの重い処理

### ✅ 解決策4: Electron機能のTauri代替

#### IPC通信の移行

**Electron**:
```typescript
// Electron IPC
ipcMain.handle('getUserDataPath', () => app.getPath('userData'));
ipcRenderer.invoke('getUserDataPath');
```

**Tauri**:
```rust
// Tauri Command
#[tauri::command]
fn get_user_data_path(app: tauri::AppHandle) -> String {
    app.path().app_data_dir().unwrap().to_string_lossy().to_string()
}
```

```rust
// Leptos側での呼び出し
let path = invoke("get_user_data_path", JsValue::NULL).await;
```

#### ファイルシステムアクセス

**Tauri Permissions**:
```json
// tauri.conf.json
{
  "app": {
    "security": {
      "capabilities": {
        "default": {
          "allow": [
            { "path": "$APPDATA/**" },
            { "path": "$HOME/**" }
          ]
        }
      }
    }
  }
}
```

#### ウィンドウ管理

**Tauri Window API**:
```rust
use tauri::Manager;

#[tauri::command]
fn create_new_window(app: tauri::AppHandle) {
    let _window = tauri::WindowBuilder::new(
        &app,
        "main",
        tauri::WindowUrl::App("index.html".into())
    )
    .build()
    .unwrap();
}
```

#### プロトコルハンドラー

**Tauri Deep Link**:
```rust
// tauri.conf.json
{
  "app": {
    "protocols": {
      "lichtblick": {
        "schemes": ["lichtblick"]
      }
    }
  }
}
```

### ✅ 解決策5: 状態管理の実装

#### Leptos Signals + Tauri State

**グローバル状態**:
```rust
// Tauri State管理
#[derive(Clone, Serialize, Deserialize)]
pub struct AppState {
    current_layout: Option<LayoutData>,
    settings: Settings,
}

#[tauri::command]
fn get_app_state(state: tauri::State<AppState>) -> AppState {
    state.inner().clone()
}
```

**Leptos Signals**:
```rust
// Leptos側での状態管理
#[component]
pub fn App() -> impl IntoView {
    let (layout, set_layout) = signal(None);
    
    // Tauriコマンドから状態を取得
    spawn_local(async move {
        let state = invoke("get_app_state", JsValue::NULL).await;
        set_layout.set(Some(state));
    });
    
    view! { /* ... */ }
}
```

#### 永続化ストレージ

**Tauri Store Plugin**:
```rust
use tauri_plugin_store::Store;

#[tauri::command]
fn save_layout(layout: LayoutData, store: Store) -> Result<(), String> {
    store.insert("layout".to_string(), layout)?;
    store.save()
}
```

### ✅ 解決策6: 拡張機能システム

#### 拡張機能アーキテクチャ

**オプション1: WASM拡張（推奨）**
- Rust/WASMで拡張機能を実装
- `wasmtime`または`wasmer`で実行
- サンドボックス化が容易

**オプション2: プラグインシステム**
- 動的ライブラリ（`.so`/`.dylib`/`.dll`）として実装
- TauriプラグインAPIを使用

#### 実装例

```rust
// WASM拡張機能のローダー
pub struct ExtensionLoader {
    runtime: wasmtime::Engine,
}

impl ExtensionLoader {
    pub fn load(&mut self, path: &Path) -> Result<Box<dyn Extension>, ExtensionError> {
        // WASMモジュールの読み込み
        // 拡張機能インターフェースの実装
    }
}
```

---

## 移行ロードマップ

### Phase 1: 基盤構築（1-2ヶ月）

**目標**: 基本的なアーキテクチャとコア機能

- [ ] Tauriコマンドの拡張（ファイルアクセス、設定管理）
- [ ] Leptosコンポーネントの基本実装
- [ ] データソース抽象化の定義
- [ ] MCAPリーダーの基本実装

**成果物**: MCAPファイルを読み込んでメッセージを表示できる

### Phase 2: UI実装（2-3ヶ月）

**目標**: 主要UIコンポーネントの実装

- [ ] データソース選択ダイアログ
- [ ] パネルレイアウトシステム
- [ ] 基本的なパネル（RawMessages、Log）
- [ ] 設定UI

**成果物**: 基本的なUIが動作する

### Phase 3: 3D可視化（3-4ヶ月）

**目標**: 3D可視化エンジンの実装

- [ ] wgpuレンダラーの実装
- [ ] 基本的なレンダラブル（Cube、Sphere）
- [ ] 点群レンダラー
- [ ] URDFパーサー

**成果物**: 3Dシーンを表示できる

### Phase 4: データソース拡張（2-3ヶ月）

**目標**: 全データソースの実装

- [ ] ROS2 WebSocket
- [ ] ROS1 Bag
- [ ] Remote File
- [ ] その他のデータソース

**成果物**: 全データソースが動作する

### Phase 5: パネルシステム（2-3ヶ月）

**目標**: 主要パネルの実装

- [ ] Plotパネル
- [ ] Imageパネル
- [ ] Mapパネル
- [ ] 3Dパネル

**成果物**: 主要パネルが動作する

### Phase 6: 拡張機能システム（2-3ヶ月）

**目標**: 拡張機能システムの実装

- [ ] 拡張機能ローダー
- [ ] 拡張機能API
- [ ] マーケットプレイス統合

**成果物**: 拡張機能をインストール・使用できる

---

## 技術的検討事項

### 1. パフォーマンス

**懸念**: Leptos + Tauriのパフォーマンス

**対策**:
- 早期にプロトタイプを作成してベンチマーク
- 重い処理はRust側で実行
- WASMの最適化

### 2. メモリ管理

**懸念**: 大量のデータ（点群、メッセージ）のメモリ管理

**対策**:
- Rustの所有権システムを活用
- ストリーミング処理
- メモリプールの使用

### 3. クロスプラットフォーム

**懸念**: Windows、macOS、Linuxでの動作

**対策**:
- Tauriのクロスプラットフォーム機能を活用
- CI/CDでの自動テスト
- 各プラットフォームでの検証

### 4. 開発体験

**懸念**: Rustの学習曲線、開発速度

**対策**:
- 段階的な移行
- 既存コードの部分的再利用（可能な範囲）
- ドキュメントの整備

---

## 参考資料

- [Tauri Documentation](https://tauri.app/)
- [Leptos Documentation](https://leptos.dev/)
- [wgpu Documentation](https://wgpu.rs/)
- [Lichtblick Rust完全再現計画書](./lichtblick/docs/03_plans/rust-complete-rewrite-plan.md)

---

## 実装状況の詳細比較

### Electron実装 vs Tauri実装

#### 1. ファイルオープン処理

**Electron実装** (`lichtblick/packages/suite-desktop/src/main/index.ts`):
```typescript
// Electron: メインプロセスでのファイル処理
app.on("open-file", async (_ev, filePath) => {
  log.debug("open-file handler", filePath);
  filesToOpen.push(filePath);
  
  if (preloaderFileInputIsReady) {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      await injectFilesToOpen(focusedWindow.webContents.debugger, filesToOpen);
    } else {
      new StudioWindow().load();
    }
  }
});

// IPC経由でレンダラーに通知
ipcMain.handle("load-pending-files", async (ev) => {
  const debug = ev.sender.debugger;
  await injectFilesToOpen(debug, filesToOpen);
  preloaderFileInputIsReady = true;
});
```

**Tauri実装** (推奨):
```rust
// src-tauri/src/lib.rs
use tauri::Manager;

#[tauri::command]
async fn open_file(app: tauri::AppHandle, file_path: String) -> Result<(), String> {
    // ファイルを読み込む
    let file = std::fs::File::open(&file_path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    
    // ファイル情報をフロントエンドに送信
    app.emit_all("file-opened", file_path)
        .map_err(|e| format!("Failed to emit event: {}", e))?;
    
    Ok(())
}

// tauri.conf.jsonでファイル関連付けを設定
{
  "app": {
    "windows": [{
      "fileDropEnabled": true
    }]
  }
}
```

#### 2. ウィンドウ管理

**Electron実装** (`lichtblick/packages/suite-desktop/src/main/StudioWindow.ts`):
```typescript
// Electron: BrowserWindowの作成と管理
function newStudioWindow(deepLinks: string[] = []): BrowserWindow {
  const browserWindow = new BrowserWindow({
    show: !process.env.CI,
    backgroundColor: getWindowBackgroundColor(),
    height: 800,
    width: 1200,
    minWidth: 350,
    minHeight: 250,
    titleBarStyle: "hidden",
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      preload: preloadPath,
      nodeIntegration: false,
    },
  });
  
  browserWindow.addListener("enter-full-screen", () => {
    browserWindow.webContents.send("enter-full-screen");
  });
  
  return browserWindow;
}
```

**Tauri実装** (推奨):
```rust
// src-tauri/src/lib.rs
use tauri::{Manager, WindowBuilder};

#[tauri::command]
fn create_new_window(app: tauri::AppHandle) -> Result<(), String> {
    let _window = WindowBuilder::new(
        &app,
        "main",
        tauri::WindowUrl::App("index.html".into())
    )
    .title("Lichtblick")
    .inner_size(1200.0, 800.0)
    .min_inner_size(350.0, 250.0)
    .build()
    .map_err(|e| format!("Failed to create window: {}", e))?;
    
    Ok(())
}

// ウィンドウイベントの処理
#[tauri::command]
fn on_window_event(window: tauri::Window, event: String) {
    match event.as_str() {
        "enter-full-screen" => {
            window.set_fullscreen(true).unwrap();
        }
        "leave-full-screen" => {
            window.set_fullscreen(false).unwrap();
        }
        _ => {}
    }
}
```

#### 3. IPC通信

**Electron実装**:
```typescript
// メインプロセス
ipcMain.handle("getUserDataPath", () => app.getPath("userData"));
ipcMain.handle("setRepresentedFilename", (ev, filePath: string | undefined) => {
  const browserWindow = BrowserWindow.fromId(ev.sender.id);
  browserWindow?.setRepresentedFilename(filePath ?? "");
});

// レンダラープロセス（preload）
const userDataPath = await ipcRenderer.invoke("getUserDataPath");
```

**Tauri実装**:
```rust
// src-tauri/src/lib.rs
#[tauri::command]
fn get_user_data_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .ok_or_else(|| "Failed to get app data dir".to_string())?
        .to_string_lossy()
        .to_string()
        .into()
}

#[tauri::command]
fn set_represented_filename(
    window: tauri::Window,
    file_path: Option<String>
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use tauri::api::path::PathExt;
        if let Some(path) = file_path {
            window.set_title(&path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

// Leptos側での呼び出し
let path = invoke("get_user_data_path", JsValue::NULL).await;
```

#### 4. プロトコルハンドラー

**Electron実装**:
```typescript
// プロトコルクライアントの登録
if (!app.isDefaultProtocolClient("foxglove")) {
  if (!app.setAsDefaultProtocolClient("foxglove")) {
    log.warn("Could not set app as handler for lichtblick://");
  }
}

// URLハンドリング
app.on("open-url", (ev, url) => {
  if (!url.startsWith("lichtblick://")) {
    return;
  }
  ev.preventDefault();
  // URL処理
});
```

**Tauri実装**:
```rust
// tauri.conf.json
{
  "app": {
    "protocols": {
      "lichtblick": {
        "schemes": ["lichtblick"]
      }
    }
  }
}

// src-tauri/src/lib.rs
#[tauri::command]
fn handle_deep_link(url: String) -> Result<(), String> {
    if url.starts_with("lichtblick://") {
        // URL処理
        println!("Handling deep link: {}", url);
    }
    Ok(())
}
```

### 現在の実装状況まとめ

#### ✅ 実装済み

1. **Tauri基本セットアップ**
   - Tauri 2.0の設定完了
   - Leptos 0.7の統合
   - 基本的なTauriコマンド（`greet`）

2. **ビルドシステム**
   - TrunkによるWASMビルド
   - 開発サーバーの設定（ポート1420）

#### ❌ 未実装（優先度順）

1. **高優先度**
   - ファイルシステムアクセス（Tauri Commands）
   - ウィンドウ管理（複数ウィンドウ対応）
   - IPC通信の実装
   - プロトコルハンドラー

2. **中優先度**
   - データソースシステム
   - Playerシステム
   - 基本的なUIコンポーネント

3. **低優先度**
   - 3D可視化エンジン
   - 拡張機能システム
   - マーケットプレイス統合

---

## 次のステップ

### 即座に実装すべき機能

1. **ファイルオープン機能**
   ```rust
   #[tauri::command]
   async fn open_mcap_file(path: String) -> Result<Vec<Message>, String>
   ```

2. **設定管理**
   ```rust
   #[tauri::command]
   fn get_app_setting(key: String) -> Result<String, String>
   #[tauri::command]
   fn set_app_setting(key: String, value: String) -> Result<(), String>
   ```

3. **ウィンドウ管理**
   ```rust
   #[tauri::command]
   fn create_data_source_window() -> Result<(), String>
   ```

### 段階的実装計画

**Week 1-2**: ファイルアクセスと基本UI
- Tauri Commandsの拡張
- Leptosコンポーネントの基本実装
- ファイル選択ダイアログ

**Week 3-4**: データソースシステム
- MCAPリーダーの基本実装
- データソース抽象化の定義
- Playerシステムの設計

**Month 2**: UI実装
- パネルレイアウトシステム
- 基本的なパネル（RawMessages、Log）
- 設定UI

**Month 3-4**: 3D可視化
- wgpuレンダラーの実装
- 基本的なレンダラブル

---

**作成者**: AI Assistant  
**最終更新**: 2025-01-XX

