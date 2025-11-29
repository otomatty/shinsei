# Release ワークフロー

## 概要

本格的なリリース作業を自動化するワークフロー。
バージョンアップ、全プラットフォーム向けビルド、GitHub Releaseの作成まで一括処理。

## トリガー条件

- 手動実行のみ（`workflow_dispatch`）
- 慎重なリリースプロセスのため手動トリガーを採用

## 実行内容

### 1. 環境セットアップ

- macOS環境で実行（macOS版ビルドのため）
- Node.js 16.17を使用
- Yarnパッケージマネージャー有効化

### 2. バージョン管理

- ルートpackage.jsonのminorバージョンアップ
- `packages/suite/package.json`のバージョンアップ
- 新しいバージョンを環境変数として保存

### 3. 依存関係インストール

- Immutableモードでの厳密なインストール
- ロックファイルの整合性確保

### 4. プロダクションビルド

- デスクトップアプリケーション（Electron）のビルド
- Webアプリケーションのビルド

### 5. 全プラットフォーム向けパッケージング

- Windows版実行ファイル（.exe）
- Linux版（.deb、.tar.gz）
- macOS版（.dmg）
- ARM64とx64両アーキテクチャ対応

### 6. Web版アーカイブ作成

- 静的ファイルのtar.gz作成
- CDN配信用アーカイブ

### 7. Git操作

- バージョン情報のコミット
- 新バージョンのタグ作成
- メインブランチへのプッシュ
- `[skip actions]`で他のワークフロー実行を回避

### 8. GitHub Release作成

- 自動リリースノート生成
- 全プラットフォーム向けバイナリの添付
- メタデータファイル（latest-\*.yml）の添付

## 必要な設定

### シークレット

- `LICHTBLICK_GITHUB_TOKEN`: リポジトリ書き込み権限付きトークン

### 生成されるアーティファクト

- `lichtblick-{version}-linux-amd64.deb`
- `lichtblick-{version}-linux-x64.tar.gz`
- `lichtblick-{version}-linux-arm64.deb`
- `lichtblick-{version}-linux-arm64.tar.gz`
- `lichtblick-{version}-mac-universal.dmg`
- `lichtblick-{version}-win.exe`
- `lichtblick-web.tar.gz`

## 注意点

- 手動実行のみ（誤操作防止）
- macOS環境必須（全プラットフォーム対応のため）
- `[skip actions]`でワークフロー循環を防止
- 失敗時は手動でのロールバック処理が必要

## 使用タイミング

- 機能追加や重要な修正完了時
- 定期的なリリース計画に基づく実行
- 緊急リリースが必要な場合
