# Components Architecture Guide - suite-base

## 📋 概要

このドキュメントは、`packages/suite-base/src/components/`ディレクトリの階層構造と各コンポーネントの役割について、新規参加メンバーが効率的に理解できるように整理したものです。

## 🏗️ コンポーネント階層レベル

### レベル1: 最上位コンポーネント（アプリケーション全体を制御）

#### 🎯 Panel.tsx (35KB, 1,095行)

- **役割**: パネルシステムの中核となる高階コンポーネント（HOC）
- **責任**:
  - 全パネルをラップして統一的なインターフェースを提供
  - 設定管理、エラーハンドリング、ドラッグ&ドロップ対応
  - パネルのライフサイクル管理
- **依存関係**: 他のすべてのパネルがこのコンポーネントを通じて統合される

#### 🎯 PanelLayout.tsx (18KB, 502行)

- **役割**: [React Mosaic](https://github.com/nomcopter/react-mosaic)ベースの分割可能レイアウトシステム
- **責任**:
  - パネルの配置・サイズ変更・分割の管理
  - 遅延ローディング（Suspense）対応
  - タブ機能、ドロップ処理の統合
- **依存関係**: Panel.tsxと連携してパネルの表示を制御

#### 🎯 PlayerManager.tsx (24KB, 753行)

- **役割**: データ処理エンジンの管理
- **責任**:
  - 各種Playerの生成・管理・切り替え
  - データソースからのメッセージ処理
  - メトリクス収集とパフォーマンス監視
- **依存関係**: データソース層とパネル層を橋渡し

### レベル2: 主要機能コンポーネント（大きな機能単位）

#### 🎛️ AppBar/ (22ファイル, 約10KB)

- **役割**: アプリケーションのトップバー
- **主要コンポーネント**:
  - `index.tsx` (18KB, 497行) - メインのAppBarコンポーネント
  - `AppMenu.tsx` (12KB, 357行) - アプリケーションメニュー
  - `DataSource.tsx` (8.4KB, 240行) - データソース表示
  - `CustomWindowControls.tsx` (6.1KB, 172行) - カスタムウィンドウコントロール
- **機能**: メニュー、データソース表示、ウィンドウコントロール

#### 🎛️ Sidebars/ (8ファイル, 約6KB)

- **役割**: 左右サイドバーの管理
- **主要コンポーネント**:
  - `index.tsx` (13KB, 424行) - メインのSidebarsコンポーネント
  - `NewSidebar.tsx` (3.0KB, 105行) - 新しいサイドバーUI
- **機能**: サイドバーの開閉、コンテンツの表示制御

#### 🎛️ PlaybackControls/ (13ファイル, 約30KB)

- **役割**: 再生制御インターフェース
- **主要コンポーネント**:
  - `index.tsx` (13KB, 373行) - メインの再生コントロール
  - `Scrubber.tsx` (23KB, 656行) - タイムラインスクラバー
  - `UnconnectedPlaybackTimeDisplay.tsx` (20KB, 580行) - 時刻表示
- **機能**: 再生・停止・シーク、タイムライン操作

#### 🎛️ DataSourceDialog/ (18ファイル, 約30KB)

- **役割**: データソース選択ダイアログ
- **主要コンポーネント**:
  - `DataSourceDialog.tsx` (11KB, 312行) - メインダイアログ
  - `Connection.tsx` (16KB, 471行) - 接続設定
  - `Start.tsx` (10KB, 236行) - 開始画面
- **機能**: データソースの選択、接続設定、ファイル選択

#### 🎛️ PanelCatalog/ (8ファイル, 約8KB)

- **役割**: パネル選択カタログ
- **主要コンポーネント**:
  - `PanelCatalog.tsx` (9.0KB, 272行) - メインカタログ
  - `PanelListItem.tsx` (5.6KB, 180行) - パネルアイテム
- **機能**: 利用可能なパネルの一覧表示、パネル追加

### レベル3: 専門機能コンポーネント（特定の機能に特化）

#### 📊 TopicList/ (16ファイル, 約25KB)

- **役割**: ROSトピック一覧表示
- **主要コンポーネント**:
  - `TopicList.tsx` (12KB, 316行) - メインリスト
  - `getMessagePathSearchItems.ts` (15KB, 413行) - 検索機能
  - `TopicRow.tsx` (5.9KB, 166行) - トピック行表示
- **機能**: トピック検索、メッセージパス表示、統計情報

#### 📊 VariablesList/ (3ファイル, 約4KB)

- **役割**: 変数一覧表示
- **主要コンポーネント**:
  - `Variable.tsx` (8.8KB, 288行) - 変数表示
  - `index.tsx` (3.1KB, 94行) - メインコンポーネント
- **機能**: ユーザー定義変数の管理・表示

#### 📊 Chart/ (6ファイル, 約20KB)

- **役割**: 高性能チャート表示
- **主要コンポーネント**:
  - `index.tsx` (20KB, 652行) - メインチャートコンポーネント
  - `datasets.ts` (6.9KB, 251行) - データセット処理
  - `worker/` - WebWorkerでのチャート処理
- **機能**: Chart.jsベースの高性能チャート表示

#### 📊 TimeBasedChart/ (14ファイル, 約50KB)

- **役割**: 時系列チャート特化コンポーネント
- **主要コンポーネント**:
  - `index.tsx` (31KB, 1,038行) - メインチャート
  - `downsample.ts` (17KB, 503行) - ダウンサンプリング
  - `TimeBasedChartTooltipContent.tsx` (10KB, 326行) - ツールチップ
- **機能**: 時系列データの効率的な表示、ズーム、ダウンサンプリング

#### 🔧 PanelToolbar/ (8ファイル, 約12KB)

- **役割**: パネルツールバー
- **主要コンポーネント**:
  - `index.tsx` (6.2KB, 175行) - メインツールバー
  - `PanelActionsDropdown.tsx` (11KB, 349行) - アクションメニュー
- **機能**: パネルの設定、アクション、削除

#### 🔧 PanelExtensionAdapter/ (11ファイル, 約30KB)

- **役割**: パネル拡張機能アダプター
- **主要コンポーネント**:
  - `PanelExtensionAdapter.tsx` (24KB, 753行) - メインアダプター
  - `messageProcessing.ts` (26KB, 734行) - メッセージ処理
  - `renderState.ts` (19KB, 542行) - レンダリング状態管理
- **機能**: 外部パネル拡張の統合、メッセージ処理

### レベル4: UI部品コンポーネント（再利用可能な小さなコンポーネント）

#### 🎨 Autocomplete/ (4ファイル, 約6KB)

- **役割**: 高性能オートコンプリート
- **主要コンポーネント**:
  - `Autocomplete.tsx` (12KB, 342行) - メインコンポーネント
  - `ReactWindowListboxAdapter.tsx` (6.0KB, 190行) - 仮想化アダプター
- **機能**: 大量データに対応したオートコンプリート

#### 🎨 SearchBar/ (3ファイル, 約3KB)

- **役割**: 検索バー
- **主要コンポーネント**:
  - `SearchBar.tsx` (4.4KB, 131行) - メイン検索バー
- **機能**: 検索入力、フィルタリング

#### 🎨 SettingsTreeEditor/ (15ファイル, 約40KB)

- **役割**: 設定ツリーエディター
- **主要コンポーネント**:
  - `index.tsx` (9.8KB, 264行) - メインエディター
  - `NodeEditor.tsx` (25KB, 709行) - ノード編集
  - `FieldEditor.tsx` (19KB, 584行) - フィールド編集
- **機能**: 階層設定の編集、バリデーション

#### 🎨 AutoSizingCanvas/ (2ファイル, 約2KB)

- **役割**: 自動リサイズ対応Canvas
- **主要コンポーネント**:
  - `index.tsx` (5.4KB, 149行) - メインCanvas
- **機能**: 自動的なサイズ調整、高DPI対応

### レベル5: 基盤コンポーネント（スタイリングやエラーハンドリング）

#### 🎨 CssBaseline.tsx (12KB, 333行)

- **役割**: アプリケーション全体のベースラインCSS
- **機能**: グローバルスタイル、Material-UIテーマ連動

#### 🎨 ColorSchemeThemeProvider.tsx (4.9KB, 142行)

- **役割**: カラースキーム・テーマ提供
- **機能**: ダークモード/ライトモード、テーマ管理

#### 🎨 ErrorBoundary.tsx (3.6KB, 119行)

- **役割**: エラーハンドリング
- **機能**: React エラーバウンダリ、エラー表示

## 🔄 コンポーネント間の依存関係

### 階層的な依存関係

```
レベル1 (最上位)
├── Panel.tsx
├── PanelLayout.tsx
└── PlayerManager.tsx
    │
    └── レベル2 (主要機能)
        ├── AppBar/
        ├── Sidebars/
        ├── PlaybackControls/
        ├── DataSourceDialog/
        └── PanelCatalog/
            │
            └── レベル3 (専門機能)
                ├── TopicList/
                ├── VariablesList/
                ├── Chart/
                ├── TimeBasedChart/
                ├── PanelToolbar/
                └── PanelExtensionAdapter/
                    │
                    └── レベル4 (UI部品)
                        ├── Autocomplete/
                        ├── SearchBar/
                        ├── SettingsTreeEditor/
                        └── AutoSizingCanvas/
                            │
                            └── レベル5 (基盤)
                                ├── CssBaseline.tsx
                                ├── ColorSchemeThemeProvider.tsx
                                └── ErrorBoundary.tsx
```

### 水平的な依存関係

- **Chart/** と **TimeBasedChart/** - 両方ともチャート表示だが、異なるアプローチ
- **TopicList/** と **VariablesList/** - 両方ともサイドバーで使用
- **PanelToolbar/** と **PanelSettings/** - パネル管理で協調動作
- **DataSourceDialog/** と **DataSourceSidebar/** - データソース管理で協調動作

## 📁 ディレクトリ構造の特徴

### 命名規則

1. **単一コンポーネント**: `ComponentName.tsx`
2. **複合コンポーネント**: `ComponentName/` ディレクトリ
3. **ストーリーファイル**: `*.stories.tsx`
4. **テストファイル**: `*.test.tsx`
5. **スタイルファイル**: `*.style.ts`
6. **型定義ファイル**: `types.ts`

### ディレクトリ構造パターン

```
ComponentName/
├── index.tsx              # メインコンポーネント
├── types.ts              # 型定義
├── utils.ts              # ユーティリティ関数
├── constants.ts          # 定数
├── ComponentName.style.ts # スタイル定義
├── ComponentName.test.tsx # テスト
├── ComponentName.stories.tsx # Storybook
├── SubComponent.tsx      # サブコンポーネント
└── hooks/                # 専用フック（必要に応じて）
    └── useComponentName.ts
```

## 🎯 新規参加メンバーへの推奨学習パス

### Phase 1: 基盤理解

1. **CssBaseline.tsx** - スタイリングの基本理解
2. **ErrorBoundary.tsx** - エラーハンドリングの理解
3. **ColorSchemeThemeProvider.tsx** - テーマシステムの理解

### Phase 2: 最上位コンポーネント理解

1. **Panel.tsx** - パネルシステムの中核理解
2. **PanelLayout.tsx** - レイアウトシステムの理解
3. **PlayerManager.tsx** - データ処理の理解

### Phase 3: 主要機能コンポーネント理解

1. **AppBar/** - アプリケーションバーの理解
2. **Sidebars/** - サイドバーシステムの理解
3. **PlaybackControls/** - 再生制御の理解

### Phase 4: 専門機能コンポーネント理解

1. **TopicList/** - トピック表示の理解
2. **Chart/** または **TimeBasedChart/** - チャート表示の理解
3. **PanelToolbar/** - パネル操作の理解

## 🔧 開発時の注意点

### コンポーネント作成時

1. **適切なレベルの選択**: 新しいコンポーネントがどのレベルに属するかを明確にする
2. **依存関係の最小化**: 下位レベルのコンポーネントは上位レベルに依存しない
3. **再利用性の考慮**: レベル4以下のコンポーネントは再利用可能に設計する

### 既存コンポーネント修正時

1. **影響範囲の確認**: 上位レベルの変更は下位レベルに大きな影響を与える
2. **テストの実行**: 特にレベル1-2のコンポーネント変更時は全体テストを実行
3. **破壊的変更の避ける**: 既存のインターフェースを変更する場合は慎重に

## 📊 統計情報

- **総ファイル数**: 約200+ファイル
- **総行数**: 約100,000+行
- **最大ファイル**: TimeBasedChart/index.tsx (31KB, 1,038行)
- **最も重要なファイル**: Panel.tsx (全パネルの基盤)
- **最も複雑なディレクトリ**: TimeBasedChart/ (14ファイル)

## 🚀 実践的なワークフロー

### 新しいパネルを作成する場合

1. **Panel.tsx** を使用してパネルをラップ
2. **PanelCatalog/** に新しいパネルを登録
3. **PanelToolbar/** で設定オプションを提供
4. 必要に応じて **Chart/** や **TimeBasedChart/** を使用

### 新しいサイドバーコンテンツを作成する場合

1. **Sidebars/** の構造を理解
2. 適切なサイドバーアイテムを作成
3. **TopicList/** や **VariablesList/** を参考に実装

### 新しいダイアログを作成する場合

1. **DataSourceDialog/** の構造を参考
2. 適切なモーダル管理を実装
3. **AppBar/** からの呼び出しを検討

## 📚 関連ドキュメント

- [既存のREADME.md](./README.md) - 詳細な実装状況
- [COMPONENT_HIERARCHY_GUIDE.md](./COMPONENT_HIERARCHY_GUIDE.md) - 全体的な階層構造
- [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md) - アーキテクチャ詳細

---

このガイドを参考に、効率的にcomponentsディレクトリの開発に参加してください！新しいコンポーネントを作成する際は、適切な階層レベルを選択し、既存のパターンに従って実装することを推奨します。
