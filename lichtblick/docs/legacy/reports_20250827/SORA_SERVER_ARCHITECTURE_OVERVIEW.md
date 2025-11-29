# Sora サーバーアーキテクチャ 概要設計書

## 1. プロジェクト概要

### 1.1 目的

Sora拡張機能・レイアウトマーケットプレイスとMCAPフィードバック学習システムを支える軽量でスケーラブルなサーバーインフラストラクチャを構築する。

### 1.2 設計原則

- **軽量性**: 最小限のリソースで最大効果を実現
- **スケーラビリティ**: 需要に応じた段階的拡張
- **セキュリティ**: プライバシー保護とデータ安全性の確保
- **運用性**: 運用・保守の簡素化
- **コスト効率**: インフラコストの最適化

### 1.3 要件概要

- **ファイル配信**: 拡張機能(.foxe)・レイアウト(.json)の配信
- **フィードバック収集**: 匿名化された使用データの収集・分析
- **推奨API**: MCAPファイル特徴に基づく設定推奨
- **統計情報**: 使用統計・分析レポート
- **管理機能**: コンテンツ管理・ユーザー管理

## 2. アーキテクチャ設計

### 2.1 全体アーキテクチャ

```
                    インターネット
                         │
                         ▼
              ┌─────────────────────────┐
              │    CloudFlare CDN       │ ← 配信高速化・DDoS保護
              └─────────────────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │   Load Balancer (ALB)   │ ← AWS Application Load Balancer
              └─────────────────────────┘
                         │
                         ▼
    ┌─────────────────────────────────────────────────────────┐
    │                   API Gateway                           │
    │  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  │
    │  │ Rate Limiting │  │ Authentication│  │   Logging   │  │
    │  └───────────────┘  └───────────────┘  └─────────────┘  │
    └─────────────────────────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │   File     │ │ Feedback   │ │  Admin     │
    │  Server    │ │   API      │ │   Panel    │
    │ (Static)   │ │  (Hono)    │ │(React SPA) │
    └────────────┘ └────────────┘ └────────────┘
           │             │             │
           ▼             ▼             ▼
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │    S3      │ │  SQLite    │ │    S3      │
    │   Bucket   │ │ Database   │ │ (Backups)  │
    └────────────┘ └────────────┘ └────────────┘
```

### 2.2 システム構成

#### 2.2.1 コンポーネント概要

| コンポーネント | 役割                         | 技術スタック      | スケール方針     |
| -------------- | ---------------------------- | ----------------- | ---------------- |
| CDN            | 静的ファイル配信・キャッシュ | CloudFlare        | 自動スケール     |
| Load Balancer  | 負荷分散・ヘルスチェック     | AWS ALB           | 自動スケール     |
| API Gateway    | 認証・レート制限・ログ       | AWS API Gateway   | 自動スケール     |
| File Server    | 静的ファイルAPI              | Hono + Nginx      | 水平スケール     |
| Feedback API   | データ収集・分析API          | Hono              | 水平スケール     |
| Admin Panel    | 管理ダッシュボード           | React.js SPA      | 単一インスタンス |
| Database       | メタデータ・統計             | SQLite/PostgreSQL | 垂直スケール     |
| Object Storage | ファイル保存                 | AWS S3            | 無制限           |

### 2.3 データフロー設計

#### 2.3.1 ファイル配信フロー

```
Sora Client → CDN → (Cache Miss) → Load Balancer → File Server → S3
           ↑                    ↑
       (Cache Hit)         (Cache Store)
```

#### 2.3.2 フィードバック収集フロー

```
Sora Client → Load Balancer → API Gateway → Feedback API → SQLite
                                   │
                                   ▼
                              Rate Limiting
                              Authentication
                              Data Validation
```

#### 2.3.3 推奨取得フロー

```
Sora Client → CDN → (Cache Miss) → Feedback API → SQLite Query
           ↑                                   ↑
       (Cache Hit)                      ML Processing
```

## 3. 技術スタック選定理由

### 3.1 Hono選定理由

**従来のExpress.jsからHonoへの移行理由**:

1. **パフォーマンス**: Express.jsより最大4倍高速
2. **軽量性**: 最小限のメモリフットプリント
3. **TypeScript First**: 完全な型安全性
4. **Edge Ready**: Cloudflare Workers等での実行対応
5. **モダンAPI**: Web Standards準拠
6. **Bundle Size**: 非常に小さなバンドルサイズ

### 3.2 Honoの利点

```typescript
// Honoの特徴
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { rateLimiter } from "hono/rate-limiter";

const app = new Hono();

// ミドルウェアチェーン (Express.jsより高速)
app.use("*", logger());
app.use("*", cors());

// 型安全なルーティング
app.get("/api/extensions/:id", (c) => {
  const id = c.req.param("id"); // 型安全
  return c.json({ id }); // 型安全
});
```

### 3.3 アーキテクチャ上の位置づけ

- **File Server**: 静的ファイル配信特化 (Hono + Nginx)
- **Feedback API**: 動的API処理 (Hono単体)
- **Admin Panel**: SPA (React.js)

## 4. スケーラビリティ設計

### 4.1 段階的スケーリング戦略

#### Stage 1: 小規模 (~1,000ユーザー)

- **単一サーバー**: Docker Compose
- **データベース**: SQLite
- **コスト**: $50-80/月

#### Stage 2: 中規模 (~10,000ユーザー)

- **マルチインスタンス**: ECS/Docker Swarm
- **データベース**: PostgreSQL (RDS)
- **キャッシュ**: Redis
- **コスト**: $150-250/月

#### Stage 3: 大規模 (~100,000ユーザー)

- **マイクロサービス**: Kubernetes
- **データベース**: PostgreSQL Cluster
- **キャッシュ**: Redis Cluster
- **CDN**: CloudFlare Enterprise
- **コスト**: $500-1000/月

### 4.2 パフォーマンス要件

| 指標               | Stage 1   | Stage 2     | Stage 3      |
| ------------------ | --------- | ----------- | ------------ |
| **レスポンス時間** | <500ms    | <300ms      | <200ms       |
| **同時接続数**     | 100       | 1,000       | 10,000       |
| **可用性**         | 99.5%     | 99.9%       | 99.99%       |
| **スループット**   | 100 req/s | 1,000 req/s | 10,000 req/s |

## 5. セキュリティ設計

### 5.1 セキュリティレイヤー

```
Application Layer     │ Input Validation, Rate Limiting
Transport Layer       │ HTTPS/TLS 1.3, HSTS
Network Layer         │ WAF, DDoS Protection
Infrastructure Layer  │ VPC, Security Groups, IAM
Data Layer           │ Encryption at Rest/Transit
```

### 5.2 プライバシー保護

- **データ匿名化**: PII完全除去
- **最小データ収集**: 必要最小限の情報のみ
- **ユーザー同意**: 明示的な同意取得
- **データ保持期間**: 90日間の自動削除

## 6. 運用・監視設計

### 6.1 監視指標

#### アプリケーションメトリクス

- Request/Response Time
- Error Rate
- Throughput (RPS)
- Active Connections

#### インフラメトリクス

- CPU/Memory Usage
- Network I/O
- Disk I/O
- Database Performance

#### ビジネスメトリクス

- Download Count
- Feedback Submission Rate
- Recommendation Accuracy
- User Adoption Rate

### 6.2 アラート設定

```yaml
Critical Alerts:
  - Error Rate > 5%
  - Response Time > 2s
  - CPU Usage > 80%
  - Memory Usage > 85%

Warning Alerts:
  - Error Rate > 1%
  - Response Time > 1s
  - CPU Usage > 60%
  - Memory Usage > 70%
```

## 7. 開発・デプロイ戦略

### 7.1 開発環境

```bash
# ローカル開発環境
docker-compose up -d

# 含まれるサービス
- file-server (Hono)
- feedback-api (Hono)
- admin-panel (React)
- database (SQLite)
- nginx (Reverse Proxy)
```

### 7.2 CI/CD パイプライン

```yaml
# GitHub Actions
name: Deploy Sora Server

on:
  push:
    branches: [main]

jobs:
  test:
    - Unit Tests
    - Integration Tests
    - Security Scans

  build:
    - Docker Image Build
    - Push to ECR

  deploy:
    - Blue/Green Deployment
    - Smoke Tests
    - Rollback on Failure
```

### 7.3 環境管理

- **Development**: ローカルDocker
- **Staging**: AWS ECS (小規模)
- **Production**: AWS ECS (冗長化)

## 8. コスト最適化

### 8.1 コスト構造

```
Fixed Costs (月額):
- ALB: $16
- CloudFlare Pro: $20
- Route 53: $1

Variable Costs:
- ECS Fargate: $0.04048/vCPU-hour
- S3 Storage: $0.023/GB
- Data Transfer: $0.09/GB
```

### 8.2 最適化戦略

1. **Auto Scaling**: 需要に応じた自動スケーリング
2. **S3 Lifecycle**: 古いファイルの自動削除
3. **CloudFlare Cache**: 帯域幅コスト削減
4. **Reserved Instances**: 長期利用割引

## 9. 災害復旧・事業継続

### 9.1 バックアップ戦略

- **データベース**: 日次自動バックアップ
- **S3**: Cross-Region Replication
- **設定**: Infrastructure as Code (Terraform)

### 9.2 復旧手順

```
RTO (Recovery Time Objective): 1時間
RPO (Recovery Point Objective): 24時間

復旧手順:
1. 別リージョンでインフラ起動
2. 最新バックアップからデータ復元
3. DNS切り替え
4. 動作確認・サービス再開
```

## 10. 実装ロードマップ

### Phase 1: MVP (2週間)

- [x] 基本API実装 (Hono)
- [x] Docker環境構築
- [ ] 基本テスト

### Phase 2: Production Ready (2週間)

- [ ] AWS環境構築
- [ ] 監視・ログ設定
- [ ] セキュリティ強化

### Phase 3: スケーリング (継続)

- [ ] パフォーマンス最適化
- [ ] 高可用性対応
- [ ] 運用自動化

---

この概要設計書では、Honoを採用した軽量でスケーラブルなサーバーアーキテクチャの全体像を示しています。詳細な実装については、各専門ドキュメントを参照してください。
