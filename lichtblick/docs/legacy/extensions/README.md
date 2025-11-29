# Lichtblick 拡張機能ドキュメント

## 概要

このディレクトリには、Lichtblick の拡張機能システムに関する包括的なドキュメントが含まれています。拡張機能の開発、インストール、管理について詳しく説明します。

## ドキュメント構成

### 📚 基本ドキュメント

#### [architecture.md](./architecture.md)

- 拡張機能システムの全体アーキテクチャ
- Web版とDesktop版の違い
- 拡張機能の実行フロー
- セキュリティ考慮事項

#### [development-guide.md](./development-guide.md)

- 拡張機能の開発手順
- 開発環境の準備
- プロジェクト構造
- ベストプラクティス

#### [installation-and-storage.md](./installation-and-storage.md)

- 拡張機能のインストール方法
- 格納場所とストレージメカニズム
- Desktop版とWeb版の違い
- 配布方法

#### [extension-types.md](./extension-types.md)

- 拡張機能の種類と実装方法
- パネル拡張、メッセージコンバーター、カメラモデルなど
- 実装例とコードサンプル

## 拡張機能の種類

### 🎨 UIあり拡張機能

#### パネル拡張

- **用途**: カスタムUIパネルの提供
- **実装**: React コンポーネントまたは DOM 操作
- **例**: データ可視化、制御パネル、ダッシュボード

#### パネル設定

- **用途**: 設定UIの提供
- **実装**: 設定スキーマの定義
- **例**: 表示オプション、フィルター設定

### 🔧 UIなし拡張機能

#### メッセージコンバーター

- **用途**: メッセージフォーマット間の変換
- **実装**: 変換関数の定義
- **例**: ROS1→ROS2変換、カスタムフォーマット対応

#### トピックエイリアス

- **用途**: トピック名の別名定義
- **実装**: エイリアス関数の定義
- **例**: 名前空間統一、互換性確保

#### カメラモデル

- **用途**: カスタムカメラキャリブレーション
- **実装**: ICameraModel インターフェースの実装
- **例**: 魚眼カメラ、特殊投影

## 開発フロー

### 1. 環境準備

```bash
# 拡張機能テンプレートの作成
npm init lichtblick-extension@latest my-extension

# 依存関係のインストール
cd my-extension
npm install
```

### 2. 開発

```bash
# 開発用ビルド（ウォッチモード）
npm run build:watch

# ローカルインストール
npm run local-install
```

### 3. テスト・デバッグ

- Lichtblick で拡張機能の動作確認
- 開発者ツールでのデバッグ
- テストコードの実行

### 4. パッケージング・配布

```bash
# .foxeファイルの生成
npm run package

# 配布用ファイルの準備
ls -la *.foxe
```

## 格納場所

### Desktop版

```
~/.lichtblick-suite/extensions/
├── local/          # ローカルインストール拡張機能
└── org/            # 組織管理拡張機能
```

### Web版

```
IndexedDB
├── foxglove-extensions-local    # ローカル拡張機能
└── foxglove-extensions-org      # 組織管理拡張機能
```

## 配布方法

### Desktop版

#### 1. ローカルファイル配布

- `.foxe` ファイルの直接配布
- ドラッグ&ドロップでインストール

#### 2. Web/クラウドからのダウンロード

- HTTPS経由での配布
- URLからの直接インストール

#### 3. 組織管理配布

- 企業内での一括配布
- 自動更新対応

### Web版

#### 1. ブラウザ内インストール

- ファイル選択ダイアログ
- ドラッグ&ドロップ対応

#### 2. URL指定インストール

- 外部URLからのダウンロード
- 自動インストール

## セキュリティ

### 実行環境の制限

- 制限されたrequire関数（React、ReactDOMのみ）
- 独立したモジュールスコープ
- エラーの隔離

### 配布時の考慮事項

- HTTPS必須
- 署名機能（将来実装予定）
- サンドボックス環境

## トラブルシューティング

### よくある問題

#### 拡張機能が見つからない

```bash
# Desktop版での確認
ls -la ~/.lichtblick-suite/extensions/

# 権限確認
chmod 755 ~/.lichtblick-suite/extensions/
```

#### インストールに失敗する

- `package.json` の形式確認
- `.foxe` ファイルの整合性確認
- 開発者ツールでのエラーログ確認

#### 拡張機能が読み込まれない

- メインファイルの指定確認
- 依存関係の確認
- コンソールエラーの確認

### デバッグ方法

```typescript
// 拡張機能の読み込み状況確認
const catalog = useExtensionCatalog();
console.log("Loaded extensions:", catalog.getState().loadedExtensions);
console.log("Installed panels:", catalog.getState().installedPanels);
```

## 参考リンク

### 公式リソース

- [Lichtblick GitHub](https://github.com/lichtblick-suite/lichtblick)
- [create-lichtblick-extension](https://github.com/lichtblick-suite/create-lichtblick-extension)
- [拡張機能テンプレート](https://github.com/lichtblick-suite/extension-template)

### 開発者向け

- [TypeScript ドキュメント](https://www.typescriptlang.org/docs/)
- [React ドキュメント](https://react.dev/)
- [Node.js ドキュメント](https://nodejs.org/docs/)

### コミュニティ

- [Discussions](https://github.com/lichtblick-suite/lichtblick/discussions)
- [Issues](https://github.com/lichtblick-suite/lichtblick/issues)

## 更新履歴

### v1.17.0 (2025-01-08)

- Desktop Extension Handler のリファクタリング
- 包括的なテストスイート追加
- エラーハンドリング改善

### v1.16.0

- カメラモデル拡張機能対応
- ローカル拡張機能のREADME/CHANGELOG表示
- 拡張機能ハンドリングのリファクタリング

---

**注意**: このドキュメントは Lichtblick v1.17.0 時点の情報に基づいています。最新の情報については、公式ドキュメントを参照してください。
