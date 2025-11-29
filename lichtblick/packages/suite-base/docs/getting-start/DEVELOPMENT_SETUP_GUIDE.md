# Development Setup Guide - suite-base

## 📋 概要

このガイドでは、`@lichtblick/suite-base`パッケージの開発環境をセットアップする方法を説明します。

## 🔧 システム要件

### 必須要件

- **Node.js**: 20 以上
- **Package Manager**: Yarn 3.6.3 (推奨)
- **Git**: 最新版
- **OS**: Windows, macOS, Linux

### 推奨要件

- **RAM**: 8GB 以上
- **ディスク容量**: 10GB 以上の空き容量
- **IDE**: VS Code（推奨）

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/lichtblick-suite/lichtblick.git
cd lichtblick
```

### 2. Node.js のバージョン確認

```bash
node --version
# 20.0.0 以上であることを確認
```

### 3. Yarn のインストール・設定

```bash
# Yarn がインストールされていない場合
npm install -g yarn

# プロジェクトのYarnバージョンを確認
yarn --version
# 3.6.3 であることを確認
```

### 4. 依存関係のインストール

```bash
# ルートディレクトリで実行
yarn install

# パッケージのビルド
yarn build:packages
```

### 5. 開発サーバーの起動

```bash
# Web版開発サーバー（推奨）
yarn web:serve

# Desktop版開発サーバー
yarn desktop:serve
```

### 6. Storybook の起動

```bash
# Storybook開発サーバー
yarn storybook
```

### 7. 開発環境の確認

- **Web版**: http://localhost:8080
- **Storybook**: http://localhost:9009
- **Desktop版**: Electronアプリが起動

## 💻 開発ツールの設定

### VS Code 推奨拡張機能

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "ms-playwright.playwright"
  ]
}
```

### VS Code 設定

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true
}
```

## 📁 プロジェクト構造の理解

```
lichtblick/
├── packages/
│   ├── suite-base/           # 主要開発対象
│   │   ├── src/
│   │   │   ├── components/   # UIコンポーネント
│   │   │   ├── providers/    # コンテキストプロバイダー
│   │   │   ├── panels/       # パネルコンポーネント
│   │   │   ├── hooks/        # カスタムフック
│   │   │   └── services/     # サービス層
│   │   ├── README.md
│   │   └── package.json
│   ├── suite-web/            # Web版固有
│   ├── suite-desktop/        # Desktop版固有
│   └── theme/                # テーマ定義
├── web/                      # Web版エントリーポイント
├── desktop/                  # Desktop版エントリーポイント
├── .storybook/               # Storybook設定
├── e2e/                      # E2Eテスト
└── ci/                       # CI/CD関連
```

## 🔨 開発スクリプトの説明

### ビルド関連

```bash
# 全パッケージのビルド
yarn build:packages

# Web版のビルド
yarn web:build:dev          # 開発版
yarn web:build:prod         # 本番版

# Desktop版のビルド
yarn desktop:build:dev      # 開発版
yarn desktop:build:prod     # 本番版
```

### 開発サーバー関連

```bash
# 開発サーバー起動
yarn web:serve              # Web版
yarn desktop:serve          # Desktop版
yarn storybook               # Storybook
```

### テスト関連

```bash
# 単体テスト
yarn test                    # 全体テスト
yarn test:watch             # ウォッチモード
yarn test:coverage          # カバレッジ付き

# E2Eテスト
yarn test:e2e:web           # Web版E2E
yarn test:e2e:desktop       # Desktop版E2E
```

### 品質管理関連

```bash
# リンティング
yarn lint                   # 自動修正付き
yarn lint:ci                # CI用（修正なし）

# 依存関係チェック
yarn lint:dependencies      # 依存関係の確認
yarn lint:unused-exports    # 未使用エクスポートの確認
```

## 🐛 よくある問題とその解決方法

### 1. Node.js バージョンエラー

```bash
# エラー: Node.js version 18 is not supported
nvm install 20
nvm use 20
```

### 2. Yarn バージョンエラー

```bash
# エラー: This project requires Yarn 3.6.3
yarn set version 3.6.3
```

### 3. 依存関係のインストールエラー

```bash
# キャッシュをクリア
yarn cache clean

# node_modulesを削除して再インストール
rm -rf node_modules
yarn install
```

### 4. ビルドエラー

```bash
# 全体をクリーンアップ
yarn clean

# パッケージを再ビルド
yarn build:packages
```

### 5. TypeScript エラー

```bash
# TypeScript キャッシュをクリア
rm -rf packages/*/tsconfig.tsbuildinfo
yarn build:packages
```

## 🔥 ホットリロード設定

### Web版のホットリロード

```javascript
// webpack.config.ts で設定済み
module.exports = {
  devServer: {
    hot: true,
    liveReload: true,
  },
};
```

### コンポーネントのホットリロード

```typescript
// React Fast Refresh が自動で有効化される
// コンポーネントを編集するとブラウザが自動更新される
```

## 📊 開発時のパフォーマンス最適化

### 1. 増分ビルド

```bash
# --watchオプションでファイル変更を監視
yarn build:packages --watch
```

### 2. 並列処理

```bash
# 複数のターミナルで同時実行
terminal1: yarn web:serve
terminal2: yarn storybook
terminal3: yarn test:watch
```

### 3. メモリ使用量の最適化

```bash
# Node.jsのメモリ制限を調整
export NODE_OPTIONS="--max-old-space-size=4096"
```

## 🎯 推奨開発ワークフロー

### 1. 新機能開発

```bash
# 1. ブランチを作成
git checkout -b feature/new-component

# 2. 開発サーバーを起動
yarn web:serve

# 3. Storybookを起動
yarn storybook

# 4. テストを実行
yarn test:watch
```

### 2. バグ修正

```bash
# 1. 問題を再現
yarn web:serve

# 2. テストを追加
yarn test:watch

# 3. 修正を実装
# 4. テストが通ることを確認
```

### 3. リファクタリング

```bash
# 1. 現在のテストが通ることを確認
yarn test

# 2. リファクタリング実行
# 3. テストが通ることを確認
yarn test

# 4. 型チェック
yarn tsc --noEmit
```

## 🔍 デバッグ設定

### VS Code デバッグ設定

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--no-coverage"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Chrome DevTools

```bash
# デバッグモードでテスト実行
yarn test:debug

# Chrome DevToolsが自動で開く
```

## 📚 次のステップ

1. [CODING_STANDARDS.md](./CODING_STANDARDS.md) - コーディング規約を確認
2. [TESTING_AND_DEBUG_GUIDE.md](./TESTING_AND_DEBUG_GUIDE.md) - テスト・デバッグ手法を学習
3. [COMPONENTS_ARCHITECTURE_GUIDE.md](./COMPONENTS_ARCHITECTURE_GUIDE.md) - コンポーネント構造を理解

## 🆘 困った時の連絡先

- **技術的な質問**: 開発チームに質問
- **環境構築の問題**: DevOpsチームに相談
- **バグ報告**: GitHubのIssueに報告

---

このガイドを参考に、効率的な開発環境を構築してください！
