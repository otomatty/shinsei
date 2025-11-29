# Lichtblick Platform Packages Guide

## 概要

このドキュメントでは、Lichtblick Suite のプラットフォーム固有パッケージ（`suite-web` と `suite-desktop`）の詳細なアーキテクチャと実装について説明します。

## suite-web パッケージ

### 概要

`suite-web` は、ブラウザ環境で動作するLichtblick Webアプリケーションを提供するパッケージです。モダンなWebブラウザ（Chrome 76+）をターゲットとし、PWA（Progressive Web App）として動作します。

### アーキテクチャ

#### エントリーポイント構造

```
packages/suite-web/src/
├── index.tsx              # メインエントリーポイント
├── WebRoot.tsx           # Web版のルートコンポーネント
├── CompatibilityBanner.tsx # ブラウザ互換性警告
├── canRenderApp.ts       # ブラウザ機能チェック
├── services/
│   └── LocalStorageAppConfiguration.ts  # 設定管理
└── webpackConfigs.ts     # Webpack設定
```

#### 起動フロー

```
1. index.tsx - メインエントリー
   ├── ブラウザ互換性チェック (canRenderApp)
   ├── 互換性警告表示 (CompatibilityBanner)
   ├── 動的インポート (suite-base)
   └── WebRoot + StudioApp の起動

2. WebRoot.tsx - アプリケーションルート
   ├── LocalStorageAppConfiguration の初期化
   ├── データソースファクトリーの設定
   ├── 拡張機能ローダーの設定
   └── SharedRoot でのコンテキスト提供

3. StudioApp - メインアプリケーション
   └── SharedRootContext からの設定取得
```

### 主要コンポーネント詳細

#### 1. index.tsx - メインエントリーポイント

**役割**: アプリケーションの初期化と起動制御

**主要機能**:

- **ブラウザ互換性チェック**: 必要なJavaScript機能の確認
- **動的インポート**: 互換性チェック後にsuite-baseを読み込み
- **エラーハンドリング**: グローバルエラーハンドラーの設定
- **フォント待機**: UI表示前のフォント読み込み完了待機
- **国際化初期化**: i18nシステムの初期化

**特徴**:

```typescript
// 互換性チェック後の動的インポート
if (!canRender) {
  // 互換性警告のみ表示
  return;
}

// 互換性確認後にメインコードを読み込み
const { StudioApp } = await import("@lichtblick/suite-base");
```

#### 2. WebRoot.tsx - Web版ルートコンポーネント

**役割**: Web環境特有の設定とコンテキスト提供

**主要機能**:

- **LocalStorageAppConfiguration**: ブラウザ設定の永続化
- **データソース設定**: Web環境で利用可能なデータソースの定義
- **拡張機能管理**: IndexedDBベースの拡張機能ローダー
- **SharedRoot統合**: 共有コンテキストの構築

**データソース一覧**:

```typescript
const dataSources = [
  new Ros1LocalBagDataSourceFactory(), // ROS1 Bagファイル
  new Ros2LocalBagDataSourceFactory(), // ROS2 Bagファイル
  new FoxgloveWebSocketDataSourceFactory(), // Foxglove WebSocket
  new RosbridgeDataSourceFactory(), // ROSBridge
  new UlogLocalDataSourceFactory(), // ULog（PX4）
  new SampleNuscenesDataSourceFactory(), // サンプルデータ
  new McapLocalDataSourceFactory(), // MCAPファイル
  new RemoteDataSourceFactory(), // リモートデータ
];
```

#### 3. CompatibilityBanner.tsx - ブラウザ互換性警告

**役割**: 非対応ブラウザでの警告表示

**主要機能**:

- **バージョンチェック**: Chrome 76+ の要件確認
- **レスポンシブUI**: デスクトップ/モバイル対応
- **段階的警告**: 一時的警告 vs 全画面警告
- **ユーザーガイダンス**: 推奨ブラウザのダウンロード案内

**表示パターン**:

```typescript
// 一時的警告（isDismissable=true）
<CompatibilityBanner isChrome currentVersion={75} isDismissable />

// 全画面警告（isDismissable=false）
<CompatibilityBanner isChrome={false} currentVersion={42} isDismissable={false} />
```

#### 4. canRenderApp.ts - ブラウザ機能チェック

**役割**: 必要なJavaScript機能の対応確認

**チェック項目**:

- **BigInt64Array/BigUint64Array**: 64ビット整数配列
- **クラス静的初期化ブロック**: TypeScript デコレータ対応
- **OffscreenCanvas**: WebWorker内Canvas操作

### Web版の特徴

#### 利点

1. **クロスプラットフォーム対応**

   - Windows、macOS、Linux で同一体験
   - インストール不要でのアクセス

2. **自動アップデート**

   - ブラウザリロードで最新版に更新
   - 配信インフラの簡素化

3. **軽量起動**

   - 必要な機能のみの動的ロード
   - 初期表示の高速化

4. **拡張性**
   - Web標準技術の活用
   - PWA機能の利用

#### 制約

1. **ブラウザ依存**

   - Chrome 76+ の要件
   - Safari、Firefox での機能制限

2. **ローカルファイルアクセス**

   - セキュリティ制約による制限
   - File API経由でのアクセスのみ

3. **ネイティブ機能制限**
   - OS統合機能の制限
   - システム通知の制約

---

## suite-desktop パッケージ

### 概要

`suite-desktop` は、Electronを使用してデスクトップアプリケーションとして動作するLichtblickを提供するパッケージです。ネイティブOS機能との統合と、より高度なファイル操作機能を提供します。

### アーキテクチャ

#### プロセス構造

```
Main Process (Node.js)
├── main/index.ts         # メインプロセス
├── main/StudioWindow.ts  # ウィンドウ管理
├── main/StudioAppUpdater.ts # 自動アップデート
└── main/settings.ts      # 設定管理

Renderer Process (Chromium)
├── renderer/Root.tsx     # レンダラープロセス
├── renderer/index.tsx    # レンダラーエントリー
└── renderer/services/    # レンダラーサービス

Preload Script
├── preload/index.ts      # プリロードスクリプト
└── preload/services/     # プリロードサービス
```

#### 起動フロー

```
1. Main Process 起動
   ├── Electronアプリケーション初期化
   ├── メニューバー設定
   ├── ウィンドウ作成 (StudioWindow)
   ├── 自動アップデート機能 (StudioAppUpdater)
   └── IPC通信設定

2. Preload Script 実行
   ├── セキュリティブリッジ作成
   ├── Native API のラッピング
   ├── 拡張機能管理機能
   └── ファイルシステムアクセス

3. Renderer Process 起動
   ├── Root.tsx の初期化
   ├── App.tsx の起動 (suite-base)
   ├── ネイティブサービス統合
   └── Workspace の表示
```

### 主要コンポーネント詳細

#### 1. main/index.ts - メインプロセス

**役割**: Electronアプリケーションの中心制御

**主要機能**:

- **アプリケーション生命周期管理**: 起動・終了処理
- **ウィンドウ管理**: メインウィンドウの作成・制御
- **メニューバー**: ネイティブメニューの構築
- **プロトコルハンドラー**: カスタムURLスキームの処理
- **ファイル関連付け**: .bag、.mcap、.foxe ファイルの関連付け

**特徴**:

```typescript
// ファイル関連付け
app.setAsDefaultProtocolClient("lichtblick");

// Deep Link処理
app.on("open-url", (event, url) => {
  handleDeepLink(url);
});

// ファイル開く処理
app.on("open-file", (event, path) => {
  openFile(path);
});
```

#### 2. main/StudioWindow.ts - ウィンドウ管理

**役割**: メインウィンドウの詳細制御

**主要機能**:

- **ウィンドウ状態管理**: 最大化、最小化、フルスクリーン
- **レイアウト保存**: ウィンドウサイズ・位置の永続化
- **セキュリティ設定**: コンテンツセキュリティポリシー
- **開発者ツール**: デバッグ機能の制御

#### 3. main/StudioAppUpdater.ts - 自動アップデート

**役割**: アプリケーションの自動更新機能

**主要機能**:

- **更新チェック**: 定期的な新バージョン確認
- **ダウンロード管理**: 更新ファイルの取得
- **インストール制御**: 更新の適用タイミング制御
- **ユーザー通知**: 更新状況の通知

#### 4. preload/index.ts - プリロードスクリプト

**役割**: メインプロセスとレンダラープロセス間の安全な橋渡し

**主要機能**:

- **Desktop Bridge**: ネイティブ機能へのアクセス
- **拡張機能管理**: ローカル拡張機能の読み込み・管理
- **ファイルシステム**: 安全なファイルアクセス
- **IPC通信**: プロセス間通信の仲介

**提供API**:

```typescript
interface Desktop {
  // ファイル操作
  setRepresentedFilename(path: string): Promise<void>;

  // 拡張機能管理
  getExtensions(): Promise<DesktopExtension[]>;
  installExtension(data: Uint8Array): Promise<DesktopExtension>;

  // ウィンドウ制御
  minimizeWindow(): void;
  maximizeWindow(): void;
  closeWindow(): void;

  // システム統合
  updateNativeColorScheme(): Promise<void>;
  getDeepLinks(): string[];
}
```

#### 5. renderer/Root.tsx - レンダラールート

**役割**: レンダラープロセスでのアプリケーション初期化

**主要機能**:

- **ネイティブサービス統合**: Desktop Bridge の活用
- **データソース設定**: デスクトップ環境特有のデータソース
- **拡張機能ローダー**: DesktopExtensionLoader の使用
- **App.tsx起動**: suite-base の App コンポーネント起動

**データソース一覧**:

```typescript
const dataSources = [
  new Ros1LocalBagDataSourceFactory(),
  new Ros2LocalBagDataSourceFactory(),
  new FoxgloveWebSocketDataSourceFactory(),
  new Ros1SocketDataSourceFactory(), // TCP接続（デスクトップ限定）
  new RosbridgeDataSourceFactory(),
  new UlogLocalDataSourceFactory(),
  new VelodyneDataSourceFactory(), // Velodyne LIDAR（デスクトップ限定）
  new SampleNuscenesDataSourceFactory(),
  new McapLocalDataSourceFactory(),
  new RemoteDataSourceFactory(),
];
```

### Desktop版の特徴

#### 利点

1. **ネイティブOS統合**

   - ファイル関連付け
   - システム通知
   - メニューバー統合
   - タスクバー統合

2. **高度なファイル操作**

   - 任意のファイルパスからの読み込み
   - ファイルシステムの直接アクセス
   - ドラッグ＆ドロップ対応

3. **拡張機能管理**

   - ローカル拡張機能のインストール
   - .foxe ファイルの直接処理
   - 拡張機能の永続化

4. **自動アップデート**

   - バックグラウンドでの更新確認
   - 段階的なアップデート配信
   - ロールバック機能

5. **パフォーマンス**
   - ネイティブ最適化
   - メモリ効率の向上
   - GPU加速の活用

#### 制約

1. **プラットフォーム依存**

   - OS別のビルドが必要
   - プラットフォーム固有のバグ

2. **配信の複雑性**

   - インストーラーの作成
   - 署名・公証の必要性
   - 配信チャネルの管理

3. **セキュリティ**
   - アプリケーション署名
   - セキュリティ審査
   - 権限管理

---

## 比較表

| 項目                 | suite-web              | suite-desktop                     |
| -------------------- | ---------------------- | --------------------------------- |
| **実行環境**         | ブラウザ (Chrome 76+)  | Electron (クロスプラットフォーム) |
| **インストール**     | 不要（URL アクセス）   | 必要（インストーラー）            |
| **アップデート**     | 自動（リロード）       | 自動（バックグラウンド）          |
| **ファイルアクセス** | 制限あり（File API）   | 制限なし（ファイルシステム）      |
| **拡張機能**         | IndexedDB              | ローカルファイルシステム          |
| **OS統合**           | 制限あり（PWA）        | 完全統合（ネイティブ）            |
| **パフォーマンス**   | ブラウザ依存           | ネイティブ最適化                  |
| **開発・配信**       | 簡単（Web配信）        | 複雑（バイナリ配信）              |
| **セキュリティ**     | ブラウザサンドボックス | アプリケーション署名              |

## 使い分けガイダンス

### suite-web を選ぶべき場合

- **簡単なアクセス**が重要な場合
- **クロスプラットフォーム対応**が必要な場合
- **インストール不要**での利用を想定する場合
- **開発・配信の簡素化**を重視する場合
- **企業環境**でのソフトウェアインストール制限がある場合

### suite-desktop を選ぶべき場合

- **高度なファイル操作**が必要な場合
- **ネイティブOS統合**が重要な場合
- **拡張機能の永続化**が必要な場合
- **最高のパフォーマンス**を求める場合
- **オフライン利用**が必要な場合

---

## 技術的詳細

### ビルドシステム

#### suite-web

- **Webpack**: モジュールバンドラー
- **React Fast Refresh**: 開発時のホットリロード
- **Code Splitting**: 動的インポートによる最適化
- **PWA対応**: Service Worker、Manifest

#### suite-desktop

- **Electron Builder**: パッケージング
- **Multi-target**: Windows、macOS、Linux
- **Auto-updater**: electron-updater
- **Native Dependencies**: ネイティブモジュール対応

### セキュリティ

#### suite-web

- **CSP**: Content Security Policy
- **CORS**: Cross-Origin Resource Sharing
- **Same-Origin Policy**: ブラウザセキュリティ

#### suite-desktop

- **Code Signing**: アプリケーション署名
- **Sandboxing**: プロセス分離
- **Preload Scripts**: 安全なAPI公開

このアーキテクチャにより、それぞれの環境に最適化された Lichtblick 体験を提供できます。
