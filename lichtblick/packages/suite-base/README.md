<!-- ここはlichtblickにあったREADMEの日本語訳 -->

# @lichtblick/suite-base &nbsp;

[![npm version](https://img.shields.io/npm/v/%40lichtblick%2Fsuite)](https://www.npmjs.com/package/@lichtblick/suite)
![GitHub License](https://img.shields.io/github/license/lichtblick-suite/lichtblick)

このパッケージは [Lichtblick](https://github.com/foxglove/suite) で使用されるコアコンポーネントを含んでいます。

## クイックスタート

[Lichtblick](https://github.com/lichtblick-suite/lichtblick) のコードベースに貢献する際、`@lichtblick/suite-base` からトップレベルまたはディレクトリの下層からインポートできます：

```plain
import { ExtensionInfo, ExtensionLoaderContext, IExtensionLoader } from "@lichtblick/suite-base";
import fuzzyFilter from "@lichtblick/suite-base/util/fuzzyFilter";
```

パッケージのエクスポートの完全なリストについては、[`index.ts` ファイル](https://github.com/lichtblick-suite/lichtblick/suite/blob/main/packages/suite-base/src/index.ts)を参照してください。

<!-- ここまで日本語訳 -->

## 初めての方へ

このディレクトリについて理解を深めたい場合は`/suite-base/docs/getting-start`ディレクトリの[suite-base コンポーネント階層構造ガイド](./docs/getting-start/COMPONENT_HIERARCHY_GUIDE.md)から順番にドキュメントを読み進めてください。

<!-- 以下 独自の概要解説 -->

## 独自概要解説

**Lichtblick** は BMW AG が開発するロボティクス可視化ツールです。このドキュメントでは、`packages/suite-base/src` ディレクトリの構造とアーキテクチャについて詳しく解説します。

## 🏗️ 全体アーキテクチャ

Lichtblick は以下の主要な設計原則に基づいて構築されています：

- **React + TypeScript** によるモダンなフロントエンド
- **Message Pipeline** による効率的なデータフロー
- **Panel System** による拡張可能な可視化コンポーネント
- **Provider Pattern** による依存性注入とコンテキスト管理
- **HOC (Higher-Order Component)** パターンによる機能拡張

## 📁 ディレクトリ構造

```
packages/suite-base/src/
├── App.tsx                    # アプリケーションのエントリーポイント
├── Workspace.tsx             # メインワークスペース
├── SharedRoot.tsx            # 共有ルートコンポーネント
├── StudioApp.tsx             # Studio アプリケーション
├── components/               # 共通コンポーネント
├── context/                  # React Context 定義
├── providers/                # Context Provider 実装
├── hooks/                    # カスタムフック
├── panels/                   # パネル（可視化コンポーネント）
├── services/                 # サービス層
├── util/                     # ユーティリティ関数
├── types/                    # TypeScript 型定義
├── i18n/                     # 国際化
├── assets/                   # 静的リソース
├── PanelAPI/                 # パネル開発用 API
├── players/                  # データプレイヤー
├── dataSources/              # データソース
├── screens/                  # スクリーン
├── testing/                  # テスト用ユーティリティ
├── theme/                    # テーマ
├── typings/                  # 型定義
└── styles/                   # スタイル
```

## 🔄 コンポーネント階層

### アプリケーション階層

```
App.tsx (最上位)
├── AppConfigurationContext.Provider
├── AppParametersProvider
├── ColorSchemeThemeProvider
├── CssBaseline
├── ErrorBoundary
├── MultiProvider (複数の Provider を統合)
│   ├── StudioToastProvider
│   ├── StudioLogsSettingsProvider
│   ├── LayoutStorageContext.Provider
│   ├── LayoutManagerProvider
│   ├── UserProfileLocalStorageProvider
│   ├── CurrentLayoutProvider
│   ├── AlertsContextProvider
│   ├── TimelineInteractionStateProvider
│   ├── UserScriptStateProvider
│   ├── ExtensionMarketplaceProvider
│   ├── ExtensionCatalogProvider
│   ├── PlayerManager
│   └── EventsProvider
├── DocumentTitleAdapter
├── SendNotificationToastAdapter
├── DndProvider (Drag & Drop)
└── Workspace.tsx (メインワークスペース)
    ├── AppBar
    ├── Sidebars
    ├── PanelLayout
    └── PlaybackControls
```

### ワークスペース構造

```
Workspace.tsx
├── AppBar (アプリケーションバー)
├── Sidebars (サイドバー群)
│   ├── Left Sidebar
│   │   ├── PanelCatalog
│   │   ├── LayoutBrowser
│   │   ├── DataSourceSidebar
│   │   ├── TopicList
│   │   ├── VariablesList
│   │   └── EventsList
│   └── Right Sidebar
│       ├── PanelSettings
│       ├── AccountSettings
│       ├── ExtensionsSettings
│       └── StudioLogsSettings
├── PanelLayout (パネルレイアウト)
│   └── Panel instances (動的に読み込まれるパネル)
└── PlaybackControls (再生コントロール)
    ├── Scrubber
    ├── PlaybackTimeDisplay
    └── PlaybackSpeedControls
```

## 🧩 主要コンポーネント詳細

### 1. Message Pipeline

**場所**: `components/MessagePipeline/`

**役割**: データフローの中核システム

```typescript
// Message Pipeline のデータフロー
DataSource → Player → MessagePipeline → Panels
```

**主要ファイル**:

- `index.tsx` - MessagePipelineProvider とフック
- `store.ts` - Zustand ベースの状態管理
- `types.ts` - 型定義

**特徴**:

- **購読ベースシステム**: パネルが必要なトピックのみ購読
- **効率的なメッセージ配信**: 購読者 ID でメッセージをバケット化
- **フレーム制御**: `pauseFrame` による同期制御
- **デバウンス処理**: 購読更新の最適化

### 2. Panel System

**場所**: `panels/` および `components/Panel.tsx`

**役割**: 拡張可能な可視化コンポーネントシステム

**パネルの種類**:

- **3D**: 3D 可視化 (`ThreeDeeRender`)
- **Plot**: データプロット
- **Image**: 画像表示
- **Map**: 地図表示
- **Table**: データテーブル
- **Log**: ログ表示
- **RawMessages**: 生メッセージ表示

**Panel HOC パターン**:

```typescript
export default Panel(
  Object.assign(MyPanelComponent, {
    panelType: "MyPanel",
    defaultConfig: DEFAULT_CONFIG,
  }),
);
```

**特徴**:

- **設定管理**: 各パネルの設定の保存・復元
- **エラーバウンダリ**: パネル単位でのエラー処理
- **分割・統合**: パネルの動的な分割・統合機能
- **ドラッグ&ドロップ**: パネル間のドラッグ&ドロップ

### 3. Provider Pattern

**場所**: `providers/`

**役割**: 依存性注入とグローバル状態管理

**主要 Provider**:

- `CurrentLayoutProvider` - レイアウト管理
- `PlayerManager` - データプレイヤー管理
- `ExtensionCatalogProvider` - 拡張機能管理
- `WorkspaceContextProvider` - ワークスペース状態

**MultiProvider パターン**:

```typescript
const providers = [
  <TimelineInteractionStateProvider />,
  <UserScriptStateProvider />,
  <ExtensionCatalogProvider />,
  // ...
];

<MultiProvider providers={providers}>
  {children}
</MultiProvider>
```

### 4. Context システム

**場所**: `context/`

**役割**: React Context による状態共有

**主要コンテキスト**:

- `MessagePipelineContext` - メッセージパイプライン
- `CurrentLayoutContext` - 現在のレイアウト
- `WorkspaceContext` - ワークスペース状態
- `AppConfigurationContext` - アプリ設定

**使用パターン**:

```typescript
const selector = (state: LayoutState) => state.selectedLayout;
const selectedLayout = useCurrentLayoutSelector(selector);
```

## 🎨 3D レンダリングシステム

**場所**: `panels/ThreeDeeRender/`

**アーキテクチャ**:

```
Renderer (THREE.js)
├── SceneExtensions (拡張可能なレンダリング機能)
│   ├── Markers
│   ├── PointClouds
│   ├── LaserScans
│   ├── Images
│   └── ...
└── Renderables (レンダリング可能オブジェクト)
    ├── RenderableArrows
    ├── RenderableCubes
    ├── RenderableLines
    └── ...
```

**SceneExtension パターン**:

```typescript
export class MyExtension extends SceneExtension {
  public static extensionId = "my.Extension";

  public constructor(renderer: IRenderer) {
    super(MyExtension.extensionId, renderer);
  }
}
```

**特徴**:

- **プラガブルアーキテクチャ**: 拡張可能なレンダリング機能
- **効率的なレンダリング**: インスタンス化による最適化
- **変換システム**: フレーム間の座標変換
- **設定ツリー**: 階層的な設定管理

## 🔧 サービス層

**場所**: `services/`

**役割**: ビジネスロジックとデータ管理

**主要サービス**:

- `LayoutManager` - レイアウトの保存・読み込み
- `ExtensionLoader` - 拡張機能の動的読み込み
- `ILayoutStorage` - レイアウトストレージの抽象化

**特徴**:

- **抽象化**: インターフェースによる実装の抽象化
- **キャッシュ**: WriteThroughLayoutCache による効率的なアクセス
- **非同期処理**: Promise ベースの非同期 API

## 🎯 データフロー

### 1. メッセージフロー

```
DataSource → Player → MessagePipeline → Panel Subscriptions → UI Update
```

### 2. 設定フロー

```
User Input → Panel Config → Layout Data → Storage → Persistence
```

### 3. レンダリングフロー

```
Message Data → Scene Extension → Renderable → THREE.js → Canvas
```

## 🔌 拡張システム

### パネル拡張

```typescript
// 新しいパネルの作成
function MyPanel({ config, saveConfig }: PanelProps) {
  // パネルの実装
}

export default Panel(
  Object.assign(MyPanel, {
    panelType: "MyPanel",
    defaultConfig: {},
  }),
);
```

### 3D 拡張

```typescript
// 新しい 3D 拡張の作成
export class MyExtension extends SceneExtension {
  public static extensionId = "my.Extension";

  public settingsNodes(): SettingsTreeNodes {
    // 設定ノードの定義
  }

  public startFrame(currentTime: bigint) {
    // フレーム処理
  }
}
```

## 🧪 テスト戦略

**場所**: `testing/` および各コンポーネントの `.test.tsx`

**アプローチ**:

- **Unit Tests**: 個別コンポーネントのテスト
- **Integration Tests**: コンポーネント間の統合テスト
- **Mock Providers**: テスト用のモックプロバイダー
- **Storybook**: コンポーネントの視覚的テスト

**テストユーティリティ**:

- `MockMessagePipelineProvider`
- `MockCurrentLayoutProvider`
- `BasicBuilder` - テストデータ生成

## 🌐 国際化 (i18n)

**場所**: `i18n/`

**実装**:

- **react-i18next** による多言語対応
- **名前空間分割**: 機能別の翻訳ファイル
- **型安全**: TypeScript による翻訳キーの型チェック

## 🎨 スタイリング

**アプローチ**:

- **Material-UI (MUI)**: コンポーネントライブラリ
- **tss-react**: CSS-in-JS ソリューション
- **テーマシステム**: ダーク/ライトモード対応

## 📝 開発ガイドライン

### 新しいパネルの追加

1. `panels/` に新しいディレクトリを作成
2. Panel HOC を使用してパネルを実装
3. `panels/index.ts` にパネル情報を追加
4. 設定スキーマを定義
5. テストを作成

### 新しいコンポーネントの追加

1. `components/` に配置
2. Props の型定義を明確に
3. Storybook ストーリーを作成
4. テストを作成
5. 必要に応じて HOC パターンを使用

### パフォーマンス考慮事項

- **メモ化**: `useMemo`, `useCallback` の適切な使用
- **仮想化**: 大量データの効率的な表示
- **遅延読み込み**: `React.lazy` による動的インポート
- **購読最適化**: 必要なデータのみ購読

---

**このアーキテクチャドキュメントは、Lichtblick の複雑なシステムを理解するための包括的なガイドです。各コンポーネントは疎結合で設計されており、拡張性とメンテナンス性を重視しています。**
