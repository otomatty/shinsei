# suite-base コンポーネント階層構造ガイド

## 📚 新規メンバー向け読み方ガイド

### 🎯 このドキュメントの目的

このドキュメントは、`@lichtblick/suite-base`パッケージの共通コンポーネント階層構造について説明します。新規参加メンバーが効率的にコードベースを理解できるように、上位コンポーネントから下位コンポーネントまでの階層関係を明確にします。

### 📋 推奨読み方の順序

#### Phase 1: 全体構造理解（必須）

1. **このドキュメント全体を読む** - プロジェクト全体の階層構造を把握
2. **[`packages/suite-base/README.md`](../../README.md)** - パッケージの概要と目的を理解
3. **[`packages/suite-base/docs/ARCHITECTURE_GUIDE.md`](../ARCHITECTURE_GUIDE.md)** - アーキテクチャの詳細理解

#### Phase 2: 実装詳細理解（必須）

1. **[`packages/suite-base/docs/getting-start/COMPONENTS_ARCHITECTURE_GUIDE.md`](./COMPONENTS_ARCHITECTURE_GUIDE.md)** - componentsディレクトリの詳細構造
2. **[`packages/suite-base/src/components/README.md`](../../src/components/README.md)** - コンポーネントの実装状況と進捗

#### Phase 3: 実践的な開発準備（推奨）

1. **[`packages/suite-base/docs/getting-start/DEVELOPMENT_SETUP_GUIDE.md`](./DEVELOPMENT_SETUP_GUIDE.md)** - 開発環境セットアップ
2. **[`packages/suite-base/docs/getting-start/CODING_STANDARDS.md`](./CODING_STANDARDS.md)** - コーディング規約
3. **[`packages/suite-base/docs/getting-start/TESTING_AND_DEBUG_GUIDE.md`](./TESTING_AND_DEBUG_GUIDE.md)** - テスト・デバッグのベストプラクティス

#### Phase 4: 高度な開発（任意）

1. **[`packages/suite-base/docs/getting-start/PANEL_DEVELOPMENT_TUTORIAL.md`](./PANEL_DEVELOPMENT_TUTORIAL.md)** - 新規パネル作成チュートリアル
2. **[`packages/suite-base/docs/getting-start/PERFORMANCE_OPTIMIZATION_GUIDE.md`](./PERFORMANCE_OPTIMIZATION_GUIDE.md)** - パフォーマンス最適化
3. **[`packages/suite-base/docs/getting-start/STORYBOOK_GUIDE.md`](./STORYBOOK_GUIDE.md)** - Storybook活用法

### 🚀 学習の進め方

#### 初日〜3日目: 基礎理解

- Phase 1の資料を読み、全体像を把握
- 実際にコードを読みながら理解を深める
- 疑問点をメモしておく

#### 1週間目: 実装理解

- Phase 2の資料を読み、コンポーネントの詳細を理解
- 簡単なコンポーネントから実際のコードを読む
- 既存のStorybookを確認して動作を把握

#### 2週間目: 実践準備

- Phase 3の資料を読み、開発環境をセットアップ
- テスト手法を理解し、実際にテストを実行
- 小さな修正やバグ修正から始める

#### 3週間目以降: 高度な開発

- Phase 4の資料を参考に、新機能の開発に取り組む
- パフォーマンス最適化やベストプラクティスを実践

### 💡 効率的な学習のコツ

1. **実際にコードを動かす**: 読むだけでなく、実際に動かして理解を深める
2. **Storybookを活用**: 各コンポーネントの動作をStorybookで確認
3. **小さな変更から始める**: 大きな機能追加の前に、小さな修正で慣れる
4. **質問を躊躇しない**: 分からないことは積極的に質問する

---

## 概要

このドキュメントは、`@lichtblick/suite-base`パッケージの共通コンポーネント階層構造について説明します。新規参加メンバーが効率的にコードベースを理解できるように、上位コンポーネントから下位コンポーネントまでの階層関係を明確にします。

## 📁 プロジェクト構造

```
packages/suite-base/
├── src/
│   ├── App.tsx                    # スタンドアローン型アプリケーションコンポーネント
│   ├── StudioApp.tsx             # 共有コンテキスト型アプリケーションコンポーネント
│   ├── SharedRoot.tsx            # 共有コンテキストプロバイダー
│   ├── Workspace.tsx             # メインワークスペースUI
│   ├── index.ts                  # パッケージエクスポート定義
│   │
│   ├── components/               # 共通UIコンポーネント
│   ├── providers/                # コンテキストプロバイダー
│   ├── panels/                   # パネルコンポーネント
│   ├── screens/                  # 画面コンポーネント
│   ├── hooks/                    # カスタムフック
│   ├── services/                 # サービス層
│   ├── context/                  # コンテキスト定義
│   ├── types/                    # 型定義
│   └── util/                     # ユーティリティ関数
│
├── README.md                     # パッケージ概要
└── ARCHITECTURE_GUIDE.md        # アーキテクチャ詳細ガイド
```

## 🏗️ 上位コンポーネント階層

### レベル1: ルートコンポーネント

#### 1. App.tsx

- **役割**: 完全に独立したアプリケーションコンポーネント
- **使用場面**: Desktop版（Electron）で使用
- **特徴**:
  - 外部からプロパティ経由で全設定を受け取る
  - 自身でProvider階層を構築・管理
  - 厳密な型安全性とプロパティ制御

#### 2. SharedRoot.tsx

- **役割**: 複数のアプリケーション間で設定を共有するルートコンポーネント
- **使用場面**: Web版で使用
- **特徴**:
  - テーマとグローバルCSSの管理
  - SharedRootContextによる設定の提供
  - 子コンポーネントへの柔軟な設定配布

#### 3. StudioApp.tsx

- **役割**: SharedRootContextから設定を受け取って動作する軽量なアプリケーションコンポーネント
- **使用場面**: Web版でSharedRootの子として使用
- **特徴**:
  - useSharedRootContext()フックで設定を取得
  - より柔軟な設定管理と動的な変更に対応

### レベル2: ワークスペースコンポーネント

#### Workspace.tsx

- **役割**: メインのワークスペースUI
- **機能**:
  - サイドバーの管理
  - パネルレイアウトの表示
  - データソース管理
  - 再生コントロール
  - キーボードショートカット

## 📊 コンポーネント階層フロー

### Desktop版（App.tsx使用）

```
App.tsx
├── Provider階層
│   ├── AppConfigurationContext.Provider
│   ├── AppParametersProvider
│   ├── ColorSchemeThemeProvider
│   ├── CssBaseline
│   ├── ErrorBoundary
│   └── MultiProvider
│       ├── StudioToastProvider
│       ├── LayoutManagerProvider
│       ├── UserProfileLocalStorageProvider
│       ├── CurrentLayoutProvider
│       ├── AlertsContextProvider
│       ├── ExtensionCatalogProvider
│       ├── PlayerManager
│       └── EventsProvider
└── Workspace.tsx
    ├── AppBar
    ├── Sidebars
    │   ├── DataSourceSidebar
    │   ├── PanelSettings
    │   ├── TopicList
    │   └── VariablesList
    ├── PanelLayout
    └── PlaybackControls
```

### Web版（SharedRoot + StudioApp使用）

```
SharedRoot.tsx
├── AppConfigurationContext.Provider
├── AppParametersProvider
├── ColorSchemeThemeProvider
├── CssBaseline
├── ErrorBoundary
└── SharedRootContext.Provider
    └── StudioApp.tsx
        ├── Provider階層
        │   ├── TimelineInteractionStateProvider
        │   ├── ExtensionCatalogProvider
        │   ├── PlayerManager
        │   └── EventsProvider
        └── Workspace.tsx
            ├── AppBar
            ├── Sidebars
            ├── PanelLayout
            └── PlaybackControls
```

## 📂 主要ディレクトリ詳細

### /components - 共通UIコンポーネント

- **役割**: アプリケーション全体で再利用可能なUIコンポーネント
- **重要なコンポーネント**:
  - `AppBar/` - アプリケーションのトップバー
  - `PanelLayout/` - パネルのレイアウト管理
  - `Sidebars/` - サイドバーコンポーネント群
  - `PlaybackControls/` - 再生コントロール
  - `DataSourceDialog/` - データソース選択ダイアログ
  - `ErrorBoundary.tsx` - エラーハンドリング

### /providers - コンテキストプロバイダー

- **役割**: アプリケーション全体の状態管理
- **主要プロバイダー**:
  - `CurrentLayoutProvider/` - 現在のレイアウト状態
  - `ExtensionCatalogProvider.tsx` - 拡張機能カタログ
  - `PanelCatalogProvider.tsx` - パネルカタログ
  - `WorkspaceContextProvider.tsx` - ワークスペース状態
  - `UserProfileLocalStorageProvider.tsx` - ユーザープロファイル

### /panels - パネルコンポーネント

- **役割**: データ可視化パネル
- **主要パネル**:
  - `ThreeDeeRender/` - 3D可視化
  - `Plot/` - グラフ表示
  - `Map/` - 地図表示
  - `Image/` - 画像表示
  - `Table/` - テーブル表示
  - `Log/` - ログ表示

### /screens - 画面コンポーネント

- **役割**: 特定の画面を表すコンポーネント
- **主要画面**:
  - `LaunchPreferenceScreen.tsx` - 起動設定画面
  - `LaunchingInDesktopScreen.tsx` - デスクトップ起動画面

### /hooks - カスタムフック

- **役割**: ロジックの再利用とコンポーネント間での共有
- **主要フック**:
  - `useAppConfigurationValue.ts` - アプリ設定値の取得
  - `useLayoutActions.tsx` - レイアウト操作
  - `useHandleFiles.tsx` - ファイル操作
  - `useAddPanel.ts` - パネル追加

### /services - サービス層

- **役割**: ビジネスロジックとデータ処理
- **主要サービス**:
  - `ExtensionLoader.ts` - 拡張機能ローダー
  - `IdbExtensionLoader.ts` - IndexedDB拡張機能ローダー
  - `LayoutManager/` - レイアウト管理
  - `migrateLayout.ts` - レイアウト移行

### /context - コンテキスト定義

- **役割**: アプリケーション全体で共有される状態とAPI
- **主要コンテキスト**:
  - `AppConfigurationContext.ts` - アプリケーション設定
  - `CurrentLayoutContext.ts` - 現在のレイアウト
  - `PlayerSelectionContext.ts` - プレイヤー選択
  - `Workspace/` - ワークスペース状態

### /types - 型定義

- **役割**: TypeScriptの型定義
- **主要型**:
  - `Extensions.ts` - 拡張機能関連型
  - `layouts.ts` - レイアウト関連型
  - `LaunchPreferenceValue.ts` - 起動設定型

## 🔄 データフロー

### 1. 設定の流れ

```
外部設定 → App/SharedRoot → Providers → Components
```

### 2. 状態管理の流れ

```
User Action → Hook → Context → Provider → Component Re-render
```

### 3. パネル管理の流れ

```
PanelCatalog → LayoutManager → PanelLayout → Individual Panel
```

## 🎯 開発時の参考ポイント

### 新しいコンポーネントを作成する場合

1. **共通UI**: `/components` に配置
2. **パネル**: `/panels` に配置
3. **画面**: `/screens` に配置
4. **状態管理**: `/providers` でProvider作成、`/context` でContext定義

### 既存コンポーネントを理解する場合

1. まず上位コンポーネント（App.tsx, StudioApp.tsx, Workspace.tsx）を確認
2. 使用されているProviderの階層を理解
3. 対象コンポーネントがどのContextを使用しているか確認

### カスタムフックを追加する場合

1. `/hooks` ディレクトリに配置
2. 必要に応じてテストファイルも作成
3. `index.ts` でエクスポート

## 📚 関連ドキュメント

- [`ARCHITECTURE_GUIDE.md`](../ARCHITECTURE_GUIDE.md) - 詳細なアーキテクチャ説明
- [`README.md`](../../README.md) - パッケージ概要
- [`src/components/README.md`](../../src/components/README.md) - コンポーネント詳細説明

## 🤝 開発ワークフロー

1. **理解フェーズ**: このドキュメントと既存コードを読む
2. **設計フェーズ**: 適切な階層レベルを選択
3. **実装フェーズ**: 既存パターンに従って実装
4. **テストフェーズ**: 適切なテストを作成
5. **統合フェーズ**: 既存のエクスポートに追加

このガイドを参考に、効率的に`suite-base`の開発に参加してください！
