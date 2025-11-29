# デスクトップ版ファイル構成ドキュメント

## デスクトップ版ディレクトリ構造

### 1. `/desktop/` - デスクトップアプリのエントリーポイント

```
desktop/
├── main/
│   ├── index.ts          # メインプロセスエントリーポイント
│   └── tsconfig.json     # TypeScript設定
├── preload/
│   ├── index.ts          # プリロードスクリプトエントリーポイント
│   └── tsconfig.json     # TypeScript設定
├── renderer/
│   ├── index.ts          # レンダラープロセスエントリーポイント
│   └── tsconfig.json     # TypeScript設定
├── quicklook/
│   ├── index.ts          # QuickLook機能エントリーポイント
│   └── tsconfig.json     # TypeScript設定
├── package.json          # デスクトップモジュール依存関係
├── webpack.config.ts     # Webpack設定（全プロセス統合）
├── electronBuilderConfig.js # Electron Builder設定
├── jest.config.json      # Jest テスト設定
└── tsconfig.json         # TypeScript設定
```

### 2. `/packages/suite-desktop/` - デスクトップ版メインパッケージ

```
packages/suite-desktop/
├── src/
│   ├── main/             # メインプロセス実装
│   │   ├── index.ts      # メインプロセス主要ロジック
│   │   ├── StudioWindow.ts # アプリケーションウィンドウ管理
│   │   ├── StudioAppUpdater.ts # アップデート機能
│   │   ├── settings.ts   # アプリケーション設定
│   │   ├── telemetry.ts  # テレメトリー機能
│   │   └── ...           # その他メインプロセス機能
│   ├── renderer/         # レンダラープロセス実装
│   │   ├── index.tsx     # レンダラーエントリーポイント
│   │   ├── Root.tsx      # Reactルートコンポーネント
│   │   └── services/     # レンダラー専用サービス
│   ├── preload/          # プリロードスクリプト実装
│   ├── quicklook/        # QuickLook機能実装
│   ├── common/           # 共通型定義・ユーティリティ
│   ├── typings/          # TypeScript型定義
│   ├── test/             # テストファイル
│   ├── webpackMainConfig.ts      # メインプロセス用Webpack設定
│   ├── webpackRendererConfig.ts  # レンダラープロセス用Webpack設定
│   ├── webpackPreloadConfig.ts   # プリロード用Webpack設定
│   ├── webpackQuicklookConfig.ts # QuickLook用Webpack設定
│   ├── webpackDevServerConfig.ts # 開発サーバー設定
│   ├── WebpackConfigParams.ts    # Webpack設定パラメータ
│   ├── afterPack.ts              # パッケージング後処理
│   └── electronBuilderConfig.js  # Electron Builder詳細設定
├── resources/            # アプリケーションリソース
│   ├── icon/            # アプリケーションアイコン
│   ├── mac/             # macOS固有リソース
│   ├── linux/           # Linux固有リソース
│   └── dmg-background/  # macOS DMG背景画像
├── package.json         # パッケージ依存関係・設定
├── jest.config.json     # Jest テスト設定
├── tsconfig.json        # TypeScript設定
└── README.md           # パッケージ説明
```

## 主要ファイルの役割

### エントリーポイント

| ファイル                     | 役割               | 説明                                                         |
| ---------------------------- | ------------------ | ------------------------------------------------------------ |
| `desktop/main/index.ts`      | メインプロセス起動 | `@lichtblick/suite-desktop/src/main`の`main()`関数を呼び出し |
| `desktop/preload/index.ts`   | プリロード実行     | セキュリティコンテキスト間のブリッジ機能を提供               |
| `desktop/renderer/index.ts`  | レンダラー初期化   | React アプリケーションの初期化とレンダリング                 |
| `desktop/quicklook/index.ts` | QuickLook機能      | ファイルプレビュー機能のエントリーポイント                   |

### 設定ファイル

| ファイル                                              | 役割               | 説明                                                          |
| ----------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| `desktop/webpack.config.ts`                           | Webpack統合設定    | 全プロセス（main, preload, renderer, quicklook）のWebpack設定 |
| `desktop/electronBuilderConfig.js`                    | パッケージング設定 | `@lichtblick/suite-desktop`のビルダー設定を利用               |
| `packages/suite-desktop/src/electronBuilderConfig.js` | 詳細ビルド設定     | プラットフォーム別パッケージング設定                          |

### 核心実装ファイル

| ファイル                                          | 役割               | 説明                                                  |
| ------------------------------------------------- | ------------------ | ----------------------------------------------------- |
| `packages/suite-desktop/src/main/index.ts`        | メインプロセス中核 | Electronアプリケーションの主要ロジック（13KB, 347行） |
| `packages/suite-desktop/src/main/StudioWindow.ts` | ウィンドウ管理     | アプリケーションウィンドウの作成・管理（14KB, 467行） |
| `packages/suite-desktop/src/renderer/Root.tsx`    | UI ルート          | Reactアプリケーションのルートコンポーネント           |

## ビルド・パッケージング設定

### package.jsonスクリプト

| スクリプト                 | 用途           | 説明                                    |
| -------------------------- | -------------- | --------------------------------------- |
| `desktop:build:dev`        | 開発ビルド     | Webpack開発モードでビルド               |
| `desktop:build:prod`       | 本番ビルド     | Webpack本番モードでビルド（最適化有り） |
| `desktop:serve`            | 開発サーバー   | Webpack開発サーバーで起動               |
| `desktop:start`            | アプリ起動     | ビルド済みElectronアプリを起動          |
| `package:win/darwin/linux` | パッケージング | プラットフォーム別パッケージ作成        |

### 依存関係

#### 主要技術スタック

- **Electron**: 36.3.2 - デスクトップアプリフレームワーク
- **React**: 18.3.1 - UI フレームワーク
- **TypeScript**: 5.3.3 - 型安全言語
- **Webpack**: 5.99.9 - モジュールバンドラー

#### デスクトップ専用依存関係

- **electron-builder**: 26.0.12 - パッケージングツール
- **electron-updater**: 6.6.2 - 自動更新機能
- **electron-devtools-installer**: 4.0.0 - 開発ツール
- **quicklookjs**: 1.0.1 - ファイルプレビュー

## テスト・開発環境

### E2Eテスト

- **場所**: `/e2e/tests/desktop/`
- **ツール**: Playwright
- **設定**: `playwright.config.ts`
- **テスト分類**:
  - layout/ - レイアウトテスト
  - menu/ - メニュー機能テスト
  - panel/ - パネル機能テスト
  - 他多数

### 開発モード設定

- `NODE_ENV=development` 時にデバッグパネル表示
- Hot Module Replacement対応
- React Refresh統合
- Source Map生成

## 特筆すべき機能

### 1. QuickLook統合

- macOS QuickLook プラグイン機能
- ファイルプレビューの高速化
- 専用Webpack設定とエントリーポイント

### 2. 自動更新機能

- `electron-updater`による自動更新
- `StudioAppUpdater.ts`で実装
- プラットフォーム別更新ストラテジー

### 3. ROS パッケージサポート

- `rosPackageResources.ts`でROSパッケージ処理
- 自動車業界向け特化機能

### 4. セキュリティ設定

- プリロードスクリプトによるコンテキスト分離
- `NativeStorageAppConfiguration`でセキュアな設定管理

## ワークスペース構成

```yaml
workspaces:
  packages:
    - desktop # デスクトップエントリーポイント
    - packages/* # 共通パッケージ群
    - packages/@types/* # 型定義パッケージ
    - web # Web版エントリーポイント
    - benchmark # ベンチマークツール
```

## 関連パッケージ

- `@lichtblick/suite-base` - 共通基盤機能
- `@lichtblick/suite-desktop` - デスクトップ専用機能
- `@lichtblick/mcap-support` - MCAPファイルサポート
- `@lichtblick/log` - ログ機能
- `@lichtblick/hooks` - カスタムReactフック

---

**注記**: このドキュメントはLichtblick v1.16.0時点の情報です。プロジェクトの進化に伴い、ファイル構成や設定が変更される可能性があります。
