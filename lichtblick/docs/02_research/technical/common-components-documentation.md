# デスクトップ版・WEB版 共通化コンポーネント調査結果

## 概要
Lichtblick Studioのデスクトップ版とWEB版で共通化されているコンポーネントとライブラリの調査結果をまとめたドキュメントです。共通化により、両プラットフォームで一貫したユーザー体験と効率的な開発が実現されています。

---

## 共通化アーキテクチャ

### プラットフォーム固有部分
- **デスクトップ版**: `/packages/suite-desktop/` - Electron固有機能
- **WEB版**: `/packages/suite-web/` - ブラウザ固有機能

### 共通化部分
- **コア機能**: `/packages/suite-base/` - 両プラットフォーム共通の基盤機能
- **共通コンポーネント**: `/packages/suite/` - 汎用的なユーティリティコンポーネント
- **その他共通パッケージ**: `/packages/` - 各種専門機能パッケージ

---

## 共通化された主要コンポーネント

### 1. **アプリケーション基盤** (`/packages/suite-base/`)

#### **メインアプリケーション**
- **`App.tsx`** - 汎用アプリケーションコンポーネント
- **`StudioApp.tsx`** - Studio固有のアプリケーションコンポーネント
- **`SharedRoot.tsx`** - 両プラットフォームで共通のルートコンポーネント
- **`Workspace.tsx`** - メインワークスペース UI

#### **初期化・設定**
- **`AppSetting.ts`** - アプリケーション設定の定義
- **`AppParameters.ts`** - アプリケーションパラメータの管理
- **`reportError.ts`** - エラーレポート機能

---

### 2. **UIコンポーネント** (`/packages/suite-base/src/components/`)

#### **基本UIコンポーネント**
- **`CssBaseline.tsx`** - ブラウザ間のスタイル差異をリセット
- **`ColorSchemeThemeProvider.tsx`** - テーマ管理
- **`Stack.tsx`** - レイアウト用のスタック コンポーネント
- **`EmptyState.tsx`** - 空状態の表示
- **`ErrorBoundary.tsx`** - エラー境界コンポーネント

#### **アプリケーションバー**
- **`AppBar/`** - アプリケーション上部バー
- **`PlaybackControls/`** - 再生コントロール
- **`PlaybackSpeedControls.tsx`** - 再生速度コントロール

#### **パネル関連**
- **`Panel.tsx`** - パネルの基本機能
- **`PanelLayout.tsx`** - パネルレイアウト管理
- **`PanelContext.ts`** - パネルコンテキスト
- **`PanelRoot.tsx`** - パネルルートコンポーネント
- **`PanelToolbar/`** - パネルツールバー
- **`PanelSettings/`** - パネル設定UI

#### **データソース関連**
- **`DataSourceDialog/`** - データソース選択ダイアログ
- **`DataSourceSidebar/`** - データソースサイドバー
- **`DataSourceInfoView.tsx`** - データソース情報表示

#### **設定・ダイアログ**
- **`AppSettingsDialog/`** - アプリケーション設定ダイアログ
- **`SettingsTreeEditor/`** - 設定ツリーエディター
- **`CreateEventDialog.tsx`** - イベント作成ダイアログ

#### **ユーティリティ**
- **`Timestamp.tsx`** - タイムスタンプ表示
- **`TextMiddleTruncate.tsx`** - テキストの中央省略表示
- **`Sparkline.tsx`** - スパークライン チャート
- **`Autocomplete/`** - 自動補完コンポーネント

---

### 3. **データ可視化パネル** (`/packages/suite-base/src/panels/`)

#### **3D可視化**
- **`ThreeDeeRender/`** - 3D レンダリング パネル
- **`Map/`** - 地図表示パネル

#### **データ表示**
- **`Plot/`** - プロットパネル
- **`Table/`** - テーブル表示パネル
- **`Log/`** - ログ表示パネル
- **`RawMessages/`** - 生メッセージ表示パネル

#### **センサー・制御**
- **`Image/`** - 画像表示パネル
- **`Gauge/`** - ゲージ表示パネル
- **`Indicator/`** - インジケーター表示パネル
- **`Teleop/`** - テレオペレーション パネル

#### **診断・分析**
- **`DiagnosticSummary/`** - 診断サマリー パネル
- **`DiagnosticStatus/`** - 診断ステータス パネル
- **`StateTransitions/`** - 状態遷移パネル
- **`PlaybackPerformance/`** - 再生パフォーマンス パネル

#### **開発・設定**
- **`UserScriptEditor/`** - ユーザースクリプト エディター
- **`Parameters/`** - パラメーター管理パネル
- **`CallService/`** - サービス呼び出しパネル
- **`Publish/`** - パブリッシュ パネル

---

### 4. **コンテキスト・状態管理** (`/packages/suite-base/src/context/`)

#### **アプリケーション状態**
- **`AppContext.ts`** - アプリケーション全体のコンテキスト
- **`AppConfigurationContext.ts`** - アプリケーション設定コンテキスト
- **`AppParametersContext.ts`** - アプリケーションパラメータコンテキスト

#### **ユーザー管理**
- **`CurrentUserContext.ts`** - 現在のユーザー情報
- **`BaseUserContext.ts`** - ベースユーザー情報
- **`UserProfileStorageContext.ts`** - ユーザープロファイル保存

#### **レイアウト管理**
- **`CurrentLayoutContext/`** - 現在のレイアウト状態
- **`LayoutManagerContext.ts`** - レイアウトマネージャー
- **`LayoutStorageContext.ts`** - レイアウト保存

#### **拡張機能**
- **`ExtensionCatalogContext.ts`** - 拡張機能カタログ
- **`ExtensionMarketplaceContext.ts`** - 拡張機能マーケットプレイス

#### **データ・再生**
- **`PlayerSelectionContext.ts`** - プレイヤー選択
- **`TimelineInteractionStateContext.tsx`** - タイムライン操作状態
- **`PerformanceContext.ts`** - パフォーマンス測定

---

### 5. **プロバイダー** (`/packages/suite-base/src/providers/`)

#### **データ管理**
- **`CurrentLayoutProvider/`** - 現在のレイアウト提供
- **`PanelCatalogProvider.tsx`** - パネルカタログ提供
- **`EventsProvider.tsx`** - イベント管理提供

#### **ユーザー・設定**
- **`UserProfileLocalStorageProvider.tsx`** - ユーザープロファイル提供
- **`AppParametersProvider.tsx`** - アプリケーションパラメータ提供
- **`StudioLogsSettingsProvider/`** - ログ設定提供

#### **拡張機能**
- **`ExtensionCatalogProvider.tsx`** - 拡張機能カタログ提供
- **`ExtensionMarketplaceProvider.tsx`** - 拡張機能マーケットプレイス提供

#### **システム**
- **`LayoutManagerProvider.tsx`** - レイアウトマネージャー提供
- **`AlertsContextProvider.tsx`** - アラート管理提供
- **`TimelineInteractionStateProvider.tsx`** - タイムライン状態提供

---

### 6. **サービス・ユーティリティ** (`/packages/suite-base/src/services/`)

#### **ストレージ・管理**
- **`ILayoutStorage.ts`** - レイアウト保存インターフェース
- **`ILayoutManager.ts`** - レイアウトマネージャーインターフェース
- **`ExtensionLoader.ts`** - 拡張機能ローダー
- **`IdbExtensionLoader.ts`** - IndexedDB拡張機能ローダー

#### **データ移行**
- **`migrateLayout.ts`** - レイアウトマイグレーション
- **`migrateLayout/`** - レイアウトマイグレーション機能

#### **分析**
- **`IAnalytics.ts`** - 分析インターフェース
- **`NullAnalytics.ts`** - 分析無効化実装

---

### 7. **データソース** (`/packages/suite-base/src/dataSources/`)

#### **ROS関連**
- **`Ros1LocalBagDataSourceFactory`** - ROS1 Bagファイル
- **`Ros2LocalBagDataSourceFactory`** - ROS2 Bagファイル
- **`Ros1SocketDataSourceFactory`** - ROS1 ソケット接続
- **`RosbridgeDataSourceFactory`** - ROSブリッジ接続

#### **Foxglove関連**
- **`FoxgloveWebSocketDataSourceFactory`** - Foxglove WebSocket
- **`McapLocalDataSourceFactory`** - MCAPファイル

#### **その他**
- **`UlogLocalDataSourceFactory`** - ULogファイル
- **`VelodyneDataSourceFactory`** - Velodyneデータ
- **`RemoteDataSourceFactory`** - リモートデータソース
- **`SampleNuScenesDataSourceFactory`** - nuScenesサンプル

---

### 8. **ユーティリティ機能** (`/packages/suite-base/src/util/`)

#### **システム初期化**
- **`installDevtoolsFormatters`** - 開発ツール フォーマッター
- **`overwriteFetch`** - Fetch APIオーバーライド
- **`waitForFonts`** - フォント読み込み待機

#### **国際化**
- **`i18n/`** - 国際化機能
- **`initI18n`** - 国際化初期化

---

### 9. **テーマ・スタイル** (`/packages/suite-base/src/theme/`)

#### **テーマ管理**
- **ダークテーマ / ライトテーマ対応**
- **Material-UI テーマ統合**
- **カスタムカラーパレット**

---

### 10. **型定義** (`/packages/suite-base/src/types/`)

#### **レイアウト**
- **`layouts.ts`** - レイアウト型定義

#### **拡張機能**
- **`Extensions.ts`** - 拡張機能型定義

#### **設定**
- **`LaunchPreferenceValue.ts`** - 起動設定値型定義

---

## 共通化のメリット

### 1. **開発効率**
- **コードの再利用**: 一度の実装で両プラットフォームに対応
- **統一されたAPI**: 共通インターフェースによる開発の簡素化
- **メンテナンス性**: 単一のコードベースでの保守

### 2. **ユーザー体験**
- **一貫性**: 両プラットフォームで同じ操作感
- **機能パリティ**: 両版で同じ機能セット
- **設定同期**: 設定やレイアウトの共有可能性

### 3. **品質向上**
- **テスト効率**: 共通部分の一元的テスト
- **バグ修正**: 一度の修正で両プラットフォームに反映
- **機能追加**: 新機能の同時展開

---

## プラットフォーム固有の差異

### デスクトップ版固有機能
- **Electronメインプロセス**: ファイルシステムアクセス
- **ネイティブメニュー**: OS統合メニュー
- **ウィンドウ管理**: 複数ウィンドウサポート
- **ファイル関連付け**: OS統合ファイル操作

### WEB版固有機能
- **ブラウザ最適化**: ブラウザ互換性チェック
- **ローカルストレージ**: ブラウザストレージ活用
- **WebAPI活用**: WebベースのAPI利用
- **セキュリティ**: CSP対応

---

## 今後の展開

### 共通化の拡張
1. **API統一**: プラットフォーム固有APIの抽象化
2. **設定同期**: クラウド経由での設定共有
3. **プラグイン**: 共通プラグインアーキテクチャ
4. **テスト**: 共通テストフレームワーク

### 新機能開発
1. **AI機能**: 機械学習機能の統合
2. **クラウド連携**: クラウドサービス統合
3. **コラボレーション**: リアルタイム共同作業
4. **パフォーマンス**: 最適化とスケーラビリティ向上
