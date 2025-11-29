# Lichtblick Webアプリケーション アーキテクチャ

## 概要

Lichtblickは、ReactとTypeScriptで構築されたWebベースのロボティクスデータ可視化プラットフォームです。このドキュメントでは、Webアプリケーションの全体的なアーキテクチャとコンポーネント階層について説明します。

## アプリケーションエントリーポイント

### Webアプリケーション

- **エントリーポイント**: `web/src/entrypoint.tsx`
- **プラットフォーム**: ブラウザベースアプリケーション
- **ビルドターゲット**: HTTP経由で提供される静的Webアセット

### デスクトップアプリケーション

- **エントリーポイント**: `packages/suite-desktop/src/renderer/index.tsx`
- **プラットフォーム**: Electronベースデスクトップアプリケーション
- **ビルドターゲット**: ネイティブデスクトップアプリケーション

### ベンチマークアプリケーション

- **エントリーポイント**: `benchmark/src/index.tsx`
- **プラットフォーム**: パフォーマンステストとベンチマーク
- **ビルドターゲット**: パフォーマンス分析用特別ビルド

## コンポーネント階層

### 1. ルートレベルコンポーネント

```
web/src/entrypoint.tsx
├── WebRoot (packages/suite-web/src/WebRoot.tsx)
│   ├── SharedRoot (packages/suite-base/src/SharedRoot.tsx)
│   │   └── StudioApp (packages/suite-base/src/StudioApp.tsx)
│   │       └── Workspace (packages/suite-base/src/Workspace.tsx)
│   │           ├── AppBar
│   │           ├── Sidebars
│   │           │   ├── 左サイドバー (NewSidebar)
│   │           │   ├── 中央コンテンツ (PanelLayout)
│   │           │   └── 右サイドバー (NewSidebar)
│   │           └── PlaybackControls
│   └── プロバイダースタック
```

### 2. コアコンポーネント

#### **WebRoot** (`packages/suite-web/src/WebRoot.tsx`)

- **目的**: Web固有のルートコンポーネント
- **責務**:
  - データソースファクトリーの設定
  - 拡張機能ローダーの初期化
  - SharedRootでアプリケーションをラップ
  - Web固有サービスの提供 (LocalStorageAppConfiguration)

#### **SharedRoot** (`packages/suite-base/src/SharedRoot.tsx`)

- **目的**: デスクトップとWeb共通のルートラッパー
- **責務**:
  - テーマプロバイダーのセットアップ
  - アプリケーション設定コンテキスト
  - グローバルCSSとエラーバウンダリー
  - 共通プロバイダースタックの初期化

#### **StudioApp** (`packages/suite-base/src/StudioApp.tsx`)

- **目的**: メインアプリケーション構造コンポーネント
- **責務**:
  - プロバイダースタック管理（ユーザープロファイル、レイアウト管理など）
  - Workspaceコンポーネントのレンダリング
  - アプリケーションレベルの状態管理

#### **Workspace** (`packages/suite-base/src/Workspace.tsx`)

- **目的**: 主要なUIレイアウトとインタラクションコーディネーター
- **責務**:
  - メインUIレイアウト管理
  - サイドバー状態管理
  - パネルレイアウトの調整
  - キーボードショートカットとグローバルインタラクション
  - ファイルドラッグ&ドロップ処理

## UIレイアウトシステム

### 3カラムレイアウトアーキテクチャ

アプリケーションは`react-mosaic-component`によって動作する高度な3カラムレイアウトシステムを使用しています：

```
┌─────────────────────────────────────────────────────────────┐
│                        AppBar                               │
├─────────────┬─────────────────────────────┬─────────────────┤
│             │                             │                 │
│ 左          │        中央コンテンツ        │ 右              │
│ サイドバー   │        (PanelLayout)        │ サイドバー       │
│             │                             │                 │
│ - パネル    │ ┌─────────┬─────────────┐   │ - 変数          │
│   設定      │ │ Panel A │   Panel B   │   │ - パフォーマンス │
│ - トピック   │ ├─────────┼─────────────┤   │ - ログ          │
│ - アラート   │ │      Panel C        │   │ - イベント       │
│ - レイアウト │ └─────────────────────────┘   │                 │
│             │                             │                 │
├─────────────┴─────────────────────────────┴─────────────────┤
│                   PlaybackControls                          │
└─────────────────────────────────────────────────────────────┘
```

### サイドバーシステム (`packages/suite-base/src/components/Sidebars/index.tsx`)

#### アーキテクチャ

- **ベースコンポーネント**: 3分割用の`MosaicWithoutDragDropContext`
- **レイアウトノード**: `"leftbar" | "children" | "rightbar"`
- **レスポンシブ**: サイズ永続化機能付き折りたたみ可能サイドバー

#### 左サイドバーアイテム

- **パネル設定**: 選択されたパネルの設定
- **トピック**: 利用可能なROSトピックとデータストリーム
- **アラート**: システムアラートと警告
- **レイアウト**: レイアウトブラウザーと管理

#### 右サイドバーアイテム

- **変数**: グローバルおよびパネル固有の変数
- **パフォーマンス**: パフォーマンスモニタリング（デバッグモード）
- **スタジオログ**: アプリケーションログ設定（デバッグモード）
- **イベント**: イベントタイムラインと管理

### パネルレイアウトシステム (`packages/suite-base/src/components/PanelLayout.tsx`)

#### コアアーキテクチャ

```
PanelLayout
├── MosaicWithoutDragDropContext (パネル配置)
│   └── renderTile() → 個別パネルをレンダリング
│       ├── MosaicWindow (パネルラッパー)
│       │   ├── Suspense (遅延ローディング)
│       │   ├── PanelRemounter (再マウント制御)
│       │   └── Panel HOC
│       │       └── 実際のパネルコンポーネント
│       └── TabMosaicWrapper (タブパネル用)
```

#### パネル管理

- **動的ローディング**: パネルは遅延ローディングされるReactコンポーネント
- **エラーバウンダリー**: 各パネルはエラーバウンダリーでラップ
- **再マウント**: プレイヤー変更時の自動再マウント
- **設定**: パネルごとの設定と永続化

## データフローアーキテクチャ

### コンテキストプロバイダースタック

アプリケーションは状態管理のために包括的なプロバイダースタックを使用しています：

```
AppConfigurationContext
├── AppParametersProvider
│   ├── ColorSchemeThemeProvider
│   │   ├── CssBaseline
│   │   │   ├── ErrorBoundary
│   │   │   │   ├── MultiProvider
│   │   │   │   │   ├── StudioToastProvider
│   │   │   │   │   ├── StudioLogsSettingsProvider
│   │   │   │   │   ├── LayoutStorageContext
│   │   │   │   │   ├── LayoutManagerProvider
│   │   │   │   │   ├── UserProfileLocalStorageProvider
│   │   │   │   │   ├── CurrentLayoutProvider
│   │   │   │   │   ├── AlertsContextProvider
│   │   │   │   │   ├── TimelineInteractionStateProvider
│   │   │   │   │   ├── UserScriptStateProvider
│   │   │   │   │   ├── ExtensionMarketplaceProvider
│   │   │   │   │   ├── ExtensionCatalogProvider
│   │   │   │   │   ├── PlayerManager
│   │   │   │   │   └── EventsProvider
│   │   │   │   └── Workspace
│   │   │   └── (追加プロバイダー)
│   │   └── (テーマとスタイリング)
│   └── (アプリパラメータ)
└── (設定)
```

### 主要な状態管理

#### レイアウト管理

- **CurrentLayoutContext**: アクティブなレイアウト状態とアクション
- **LayoutManagerProvider**: レイアウトの永続化と同期
- **PanelStateContext**: パネル固有の状態管理

#### データパイプライン

- **PlayerManager**: データソース接続と管理
- **MessagePipeline**: リアルタイムデータストリーミングと処理
- **ExtensionCatalog**: 動的パネルと拡張機能ローディング

#### ユーザーインターフェース

- **WorkspaceContext**: サイドバー状態、ダイアログ、UIインタラクション
- **ThemeProvider**: カラースキームとスタイリング管理
- **ToastProvider**: ユーザー通知とアラート

## ファイル構成

### コアアプリケーション構造

```
packages/suite-base/src/
├── App.tsx                     # レガシーアプリ構造（非推奨）
├── StudioApp.tsx              # 新アプリ構造（現在）
├── SharedRoot.tsx             # 共通ルートラッパー
├── Workspace.tsx              # メインワークスペースコンポーネント
├── components/
│   ├── AppBar/                # 上部ツールバーコンポーネント
│   ├── Sidebars/              # サイドバーシステム
│   ├── PanelLayout.tsx        # パネル配置システム
│   ├── PlaybackControls/      # メディアコントロール
│   ├── Panel.tsx              # パネルHOCラッパー
│   └── PanelSettings/         # パネル設定UI
├── context/                   # Reactコンテキスト
├── providers/                 # コンテキストプロバイダー
├── panels/                    # 個別パネル実装
├── players/                   # データソースプレイヤー
└── util/                      # ユーティリティ関数
```

### プラットフォーム固有コード

```
packages/suite-web/src/
├── WebRoot.tsx                # Web固有ルート
├── index.tsx                  # Webエントリーポイント
└── services/                  # Web固有サービス

packages/suite-desktop/src/
├── renderer/
│   ├── Root.tsx              # デスクトップ固有ルート
│   └── index.tsx             # デスクトップエントリーポイント
└── main/                     # Electronメインプロセス
```

## 拡張システム

### パネル拡張

- **動的ローディング**: パネルはReact.lazyコンポーネントとしてロード
- **型安全性**: パネルコントラクト用TypeScriptインターフェース
- **設定**: 標準化されたconfig/saveConfigパターン
- **ライフサイクル**: エラーバウンダリー付き自動マウント/アンマウント

### 拡張カタログ

- **レジストリ**: 利用可能なパネルと拡張機能の中央カタログ
- **ローディング**: フォールバック付き非同期モジュールローディング
- **マーケットプレース**: 拡張機能の発見とインストール

## 開発ガイドライン

### 新しいパネルの追加

1. `packages/suite-base/src/panels/`にパネルコンポーネントを作成
2. 適切な型定義でパネルインデックスからエクスポート
3. パネルカタログに登録
4. テスト用にStorybookに追加

### レイアウトシステムの変更

- レイアウト変更は`CurrentLayoutActions`を通して行う
- 既存レイアウトとの後方互換性を維持
- 様々なパネル設定でテスト

### 状態管理

- 可能な場合は既存のコンテキストプロバイダーを使用
- 新しいグローバル状態にはプロバイダーパターンに従う
- コンポーネント固有データにはローカル状態を優先

## パフォーマンス考慮事項

### コード分割

- 初期バンドルサイズ削減のためパネルは遅延ローディング
- 拡張機能ローディングは必要時まで遅延
- 異なるアプリケーションモード用のルートベース分割

### メモリ管理

- プレイヤー変更時のパネル再マウントでメモリリーク防止
- サブスクリプション用useEffectフックでのクリーンアップ
- データストリームと接続の適切な廃棄

### レンダリング最適化

- 高コストコンポーネント用React.memo
- 大きなリスト（トピック、変数）の仮想化
- 高頻度データ用デバウンス更新

---

このアーキテクチャは、Webとデスクトップデプロイメントをサポートし、拡張可能なパネルとデータソースの豊富なエコシステムを持つ、Lichtblickロボティクス可視化プラットフォームのスケーラブルで保守可能な基盤を提供します。
