# WEB版コードファイル調査結果

## 概要
Lichtblick StudioのWEB版に関するコードファイルの調査結果をまとめたドキュメントです。WEB版は主に`web/`ディレクトリと`packages/suite-web/`パッケージによって構成されています。

---

## WEB版メインディレクトリ構造

### `/web/` - WEB版のメインディレクトリ
WEB版のビルドとデプロイメントに関するファイルが格納されています。

#### 主要ファイル:
- **`web/src/entrypoint.tsx`** - WEB版のエントリーポイント
- **`web/src/index.tsx`** - WEB版のメイン関数定義
- **`web/webpack.config.ts`** - Webpackビルド設定
- **`web/package.json`** - WEB版の依存関係管理

---

## WEB版固有機能パッケージ

### `/packages/suite-web/` - WEB版固有機能パッケージ
WEB版特有の機能と初期化ロジックが実装されています。

#### 主要ファイル:

**`packages/suite-web/src/index.tsx`**
- **役割**: WEB版のメイン初期化機能
- **主な機能**:
  - ブラウザ互換性チェック
  - ユーザーエージェント検出 (Chrome バージョン確認)
  - 非同期モジュール読み込み (code splitting)
  - アプリケーションの初期化とレンダリング
  - エラーハンドリング設定

**`packages/suite-web/src/WebRoot.tsx`**
- **役割**: WEB版のルートコンポーネント
- **主な機能**:
  - SharedRootでのアプリケーション全体のコンテキスト提供
  - WEB版固有のデータソース設定
  - ローカルストレージベースのアプリケーション設定
  - 拡張機能ローダーの初期化

**`packages/suite-web/src/canRenderApp.ts`**
- **役割**: ブラウザ互換性チェック機能
- **チェック項目**:
  - `BigInt64Array`/`BigUint64Array` サポート
  - クラス静的初期化ブロック サポート
  - `OffscreenCanvas` サポート
- **用途**: アプリケーション起動前の事前チェック

**`packages/suite-web/src/CompatibilityBanner.tsx`**
- **役割**: ブラウザ互換性警告バナー
- **主な機能**:
  - Chrome最小バージョン要件チェック (v76+)
  - 非対応ブラウザの警告表示
  - 推奨ブラウザダウンロードリンク
  - レスポンシブデザイン対応
  - 一時的な非表示機能

**`packages/suite-web/src/webpackConfigs.ts`**
- **役割**: WEB版のWebpack設定
- **主な機能**:
  - 開発サーバー設定
  - プロダクションビルド設定
  - アセット最適化設定

---

## WEB版のデータソース設定

### 対応データソース一覧:
1. **`Ros1LocalBagDataSourceFactory`** - ROS1 Bagファイル
2. **`Ros2LocalBagDataSourceFactory`** - ROS2 Bagファイル
3. **`FoxgloveWebSocketDataSourceFactory`** - Foxglove WebSocket
4. **`RosbridgeDataSourceFactory`** - ROSブリッジ
5. **`UlogLocalDataSourceFactory`** - ULogファイル
6. **`SampleNuscenesDataSourceFactory`** - nuScenesサンプル
7. **`McapLocalDataSourceFactory`** - MCAPファイル
8. **`RemoteDataSourceFactory`** - リモートデータソース

---

## WEB版のサービスクラス

### `/packages/suite-web/src/services/`
- **`LocalStorageAppConfiguration`** - ローカルストレージベースの設定管理

---

## WEB版の特徴

### 1. **ブラウザ環境への最適化**
- ブラウザ互換性チェック機能
- 非対応ブラウザでの警告表示
- ローカルストレージベースの設定管理

### 2. **セキュリティ対応**
- Content Security Policy (CSP) 設定
- 外部リソースアクセス制限
- XSS攻撃対策

### 3. **パフォーマンス最適化**
- Code splitting による遅延読み込み
- 互換性チェック後の非同期モジュール読み込み
- フォント事前読み込み

### 4. **アクセシビリティ**
- レスポンシブデザイン対応
- 国際化 (i18n) 対応
- ダークテーマ対応

---

## WEB版の初期化フロー

1. **エントリーポイント実行** (`web/src/entrypoint.tsx`)
2. **メイン関数呼び出し** (`packages/suite-web/src/index.tsx`)
3. **エラーハンドリング設定**
4. **ブラウザ互換性チェック**
5. **互換性バナー表示** (必要に応じて)
6. **非同期モジュール読み込み**
7. **フォント事前読み込み**
8. **国際化初期化**
9. **WebRootコンポーネントレンダリング**
10. **StudioAppコンポーネント起動**

---

## ビルドとデプロイメント

### 開発環境:
- **webpack-dev-server** による開発サーバー
- **Hot Module Replacement (HMR)** サポート
- **ソースマップ** 生成

### プロダクション環境:
- **最適化されたバンドル** 生成
- **アセット圧縮**
- **Cloudflare** 対応 (`web/.cloudflare/`)

---

## 関連技術スタック

### フロントエンド:
- **React** - UIライブラリ
- **TypeScript** - 型安全性
- **Material-UI** - UIコンポーネント
- **Webpack** - バンドラー

### ブラウザサポート:
- **Chrome 76+** (最小要件)
- **Safari 16.4+** (クラス静的初期化ブロック対応)
- **Firefox** (一部制限あり)
- **Edge** (Chromium版)

### 互換性要件:
- **BigInt64Array** サポート
- **OffscreenCanvas** サポート
- **ES2020** 機能サポート
- **WebAssembly** サポート

---

## 今後の改善点

1. **ブラウザサポートの拡大**
2. **パフォーマンス最適化**
3. **アクセシビリティの向上**
4. **セキュリティ強化**
5. **デバッグ機能の拡充**
