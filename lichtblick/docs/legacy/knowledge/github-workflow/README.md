# GitHub Workflows 解説ドキュメント

## 概要

このディレクトリには、Lichtblickプロジェクトで使用されているGitHub Actionsワークフローの詳細な解説が含まれています。

## ワークフロー一覧

### 開発・品質管理系

- **[CI](./ci.md)** - 継続的インテグレーション

  - 毎回のコミット・PRで実行される品質チェック
  - リント、テスト、ビルドを並行実行
  - E2Eテストも含む包括的な検証

- **[SonarCloud](./sonarqube.md)** - コード品質分析
  - コードの品質、セキュリティ、カバレッジを監視
  - 技術的負債の可視化
  - mainブランチとPRで実行

### リリース管理系

- **[Auto Bump Version](./bump-version.md)** - 自動バージョン管理

  - mainブランチプッシュ時のpatchバージョン自動アップ
  - 継続的開発の小さな変更に対応
  - Pre-buildワークフローと連携

- **[Pre-Build](./pre-build.md)** - 事前ビルド

  - 各プラットフォーム向けバイナリの事前生成
  - GitHub Artifactとして30日間保存
  - リリース準備の効率化

- **[Release](./release.md)** - 本格リリース

  - 手動実行による正式リリース
  - 全プラットフォームのパッケージング
  - GitHub Releaseの自動作成

- **[Post Release](./post-release.md)** - リリース後処理
  - NPMパッケージの自動公開
  - Docker Hub/GHCRへのイメージ公開
  - リリース後の自動配信

### 運用・保守系

- **[Stale](./stale.md)** - 古いIssue/PR管理

  - 長期間活動のないアイテムの自動整理
  - プロジェクトの健全性維持
  - 毎日午前0時に実行

- **[Dependabot Fix](./dependabot-fix.md)** - 依存関係更新
  - Dependabotが作成したPRの自動修正
  - yarn.lockの重複解決
  - セキュリティを重視した安全な自動化

### デプロイ系

- **[Cloudflare Pages](./cloudflare-pages.md)** - プレビュー環境
  - プルリクエスト時の自動デプロイ
  - レビュー用プレビュー環境の提供
  - 実際のWebアプリケーションでの動作確認

## ワークフロー連携図

```
mainブランチプッシュ
      ↓
[Auto Bump Version] → [Pre-Build]
      ↓                    ↓
  手動実行判断         アーティファクト保存
      ↓                    ↓
   [Release] ←──────────────┘
      ↓
[Post Release]
  ↓        ↓
 NPM      Docker
 公開     公開
```

## 実行タイミング

### 自動実行

- **CI**: 全プッシュ・PR
- **SonarCloud**: mainプッシュ・PR
- **Auto Bump**: mainプッシュ
- **Pre-Build**: Auto Bump Version後
- **Post Release**: Release公開後
- **Stale**: 毎日午前0時
- **Dependabot Fix**: DependabotPR作成時
- **Cloudflare Pages**: PR作成・更新時

### 手動実行

- **Release**: 正式リリース時
- **Pre-Build**: 緊急時やテスト時

## 権限・シークレット管理

### 必要なシークレット

- `LICHTBLICK_GITHUB_TOKEN`: リポジトリ書き込み権限
- `SONAR_TOKEN`: SonarCloud認証
- `NPM_PUBLISH_TOKEN`: NPMパッケージ公開
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflareアカウント
- `CLOUDFLARE_API_TOKEN`: Cloudflare API
- `LICHTBLICKBOT_GITHUB_TOKEN`: GitHub統合用

### 権限設定

- Actions実行権限
- Issues・PR操作権限
- Package書き込み権限（Docker）

## 運用上の注意点

### セキュリティ

- Dependabot Fixでのスクリプト実行無効化
- 信頼されたコンテキストでの実行
- 最小権限の原則

### 効率化

- 並行実行による高速化
- キャッシュ活用による時間短縮
- 適切なワークフロー分離

### 保守性

- 明確な責任分離
- 失敗時の影響範囲限定
- 手動介入ポイントの明確化

## トラブルシューティング

### よくある問題

- **権限エラー**: シークレットの確認
- **ビルド失敗**: ローカル環境での検証
- **デプロイ失敗**: 外部サービスの状態確認
- **ワークフロー無限ループ**: `[skip actions]`の活用

### 監視ポイント

- ワークフロー実行時間の監視
- 失敗率の追跡
- アーティファクト容量の管理
- 外部サービスの制限確認

## 改善提案

### 短期的改善

- Node.js版数の統一
- キャッシュ戦略の最適化
- エラーハンドリングの強化

### 中長期的改善

- 並列化のさらなる推進
- 条件分岐による効率化
- 自動リトライ機能の追加
- 通知機能の充実

---

各ワークフローの詳細については、それぞれのドキュメントを参照してください。
