# マーケットプレイスAPI仕様書

> **作成日**: 2025年9月30日
> **ステータス**: 🟡 Phase 2で仕様策定予定（Week 3-4）
> **優先度**: 中優先（次々回リリース用）
> **関連**: [IMPLEMENTATION_ACTION_PLAN.md](../IMPLEMENTATION_ACTION_PLAN.md#phase-2-マルチバージョン対応week-3-4)

## 📖 概要

このドキュメントは、Lichtblickマーケットプレイス用の独立APIサーバーの仕様を定義します。現在のリリースでは実装せず、次々回リリースに向けた仕様策定を目的としています。

### 目的

1. **拡張性の確保**: 将来的な機能拡張に対応できるAPI設計
2. **パフォーマンス**: 大量の拡張機能を効率的に配信
3. **セキュリティ**: 安全な拡張機能配布メカニズム
4. **スケーラビリティ**: ユーザー数増加に対応可能なインフラ

### スコープ

- RESTful APIエンドポイント設計
- データモデル定義
- 認証・認可メカニズム（将来的）
- インフラ構成の検討
- CDN戦略（将来的）

### 実装スケジュール

- **Phase 2（Week 3-4）**: API仕様書作成のみ
- **次リリース**: 実装なし（ローカル開発サーバーで代替）
- **次々回リリース**: API実装・デプロイ検討

## 🎯 主要機能

### 1. APIエンドポイント（概要）

**概要**:
マーケットプレイス機能に必要なAPIエンドポイントを定義します。

**基本エンドポイント**:

```
# 拡張機能一覧
GET /api/v1/extensions

# 特定拡張機能の詳細
GET /api/v1/extensions/:id

# 特定拡張機能の特定バージョン
GET /api/v1/extensions/:id/versions/:version

# 拡張機能ファイルのダウンロード
GET /api/v1/extensions/:id/versions/:version/download

# 検索
GET /api/v1/extensions/search?q=keyword&tag=tag1&author=author1

# レイアウト関連（同様の構造）
GET /api/v1/layouts
GET /api/v1/layouts/:id
...
```

**詳細**: 実装時に全エンドポイント、パラメータ、レスポンス形式を定義

### 2. データモデル（概要）

**概要**:
APIで扱うデータの構造を定義します。

**Extension モデル（概要）**:

```json
{
  "id": "publisher.extension-name",
  "publisher": "publisher",
  "name": "extension-name",
  "displayName": "Extension Display Name",
  "description": "拡張機能の説明",
  "versions": [
    {
      "version": "1.0.0",
      "releaseDate": "2025-09-30",
      "downloadUrl": "https://cdn.example.com/extensions/...",
      "size": 1234567,
      "changelog": "変更内容...",
      "readme": "README内容..."
    }
  ],
  "tags": ["tag1", "tag2"],
  "license": "MIT",
  "homepage": "https://example.com",
  "repository": "https://github.com/..."
}
```

**詳細**: 実装時に完全なスキーマを定義

### 3. インフラ構成（概要）

**概要**:
APIサーバーとファイル配信のインフラ構成を検討します。

**想定構成**:

- **APIサーバー**: Go / Node.js / Python等で実装
- **データストア**: PostgreSQL / MongoDB等
- **ファイルストレージ**: S3 / Cloud Storage等
- **CDN**: CloudFlare / CloudFront等（将来的）

**詳細**: 実装時に具体的な技術選定とアーキテクチャ図を作成

### 4. 認証・認可（将来的）

**概要**:
拡張機能の公開・管理に必要な認証メカニズムを検討します。

**想定機能**:

- 開発者アカウント
- 拡張機能の公開申請・承認フロー
- アクセストークン管理
- レート制限

**詳細**: 次々回リリースで検討

### 5. 検索・フィルタリング機能

**概要**:
効率的な検索とフィルタリングのAPI設計を定義します。

**想定パラメータ**:

- `q`: キーワード検索
- `tag`: タグフィルタ
- `author`: 作者フィルタ
- `sort`: ソート順（name, date, downloads等）
- `page`, `limit`: ページネーション

**詳細**: 実装時に全パラメータと検索ロジックを定義

## 📊 現在の状況との比較

### 現在（Phase 1-8完了）

- **データソース**: ローカル開発サーバー（`extensions.json`）
- **配信方法**: シンプルなHTTPサーバー
- **機能**: 基本的なCRUD操作のみ

### 次々回リリース（API実装後）

- **データソース**: 専用APIサーバー
- **配信方法**: RESTful API + CDN
- **機能**: 高度な検索、統計、認証等

## 📋 Phase 2タスク（Week 3-4）

Phase 2では実装は行わず、仕様策定のみを実施:

1. **エンドポイント設計**: 全APIエンドポイントの定義
2. **データモデル設計**: 完全なスキーマ定義
3. **インフラ検討**: 技術選定とアーキテクチャ案
4. **移行計画**: 開発サーバーからAPIへの移行手順
5. **コスト試算**: インフラコストの概算

**詳細**: Phase 2開始時に追加

## 🔗 関連ドキュメント

- [IMPLEMENTATION_ACTION_PLAN.md](../IMPLEMENTATION_ACTION_PLAN.md) - 全体実装計画
- [extension-requirements.md](../guides/extension-requirements.md) - 拡張機能要件
- [MARKETPLACE_FEATURES.md](../MARKETPLACE_FEATURES.md) - 機能仕様
- [development-server-specification.md](../implementation/development-server-specification.md) - 開発サーバー仕様（Phase 1）

## 📝 仕様策定時の追加項目

Phase 2で以下の項目を詳細化する予定:

- [ ] 完全なAPIエンドポイント一覧
- [ ] リクエスト/レスポンス形式の詳細
- [ ] エラーハンドリング仕様
- [ ] データモデルの完全なスキーマ
- [ ] データベース設計（ER図等）
- [ ] インフラアーキテクチャ図
- [ ] セキュリティ要件
- [ ] パフォーマンス要件
- [ ] スケーラビリティ考慮事項
- [ ] 監視・ロギング戦略
- [ ] コスト試算

## 💡 検討事項

仕様策定時にチームで議論・決定する項目:

- API実装言語・フレームワークの選定
- データベースの選定（リレーショナル vs NoSQL）
- ファイルストレージの選定（S3 vs 他のサービス）
- CDNの必要性とタイミング
- 認証方式（OAuth2, JWT等）
- バージョニング戦略（APIバージョン管理）
- レート制限の設定
- キャッシュ戦略
- 開発サーバーからの移行タイミング

## 🎯 次々回リリースでの到達目標

- ✅ スケーラブルなAPIインフラ
- ✅ 高速な拡張機能配信（CDN活用）
- ✅ 開発者向け拡張機能公開プラットフォーム
- ✅ 統計・分析機能（ダウンロード数等）
- ✅ 自動更新通知機能

---

**Document Version**: 1.0.0 (概要版)
**Next Update**: Phase 2仕様策定時（Week 3-4）
**Implementation Target**: 次々回リリース
**Maintained by**: Lichtblick Development Team
