# Lichtblick AWS デプロイアーキテクチャ提案

## 📊 概要

このドキュメントでは、LichtblickをAWS上にデプロイし、段階的にフルスタックアプリケーションへ拡張するためのアーキテクチャを提案します。

---

## 🎯 デプロイ戦略: 段階的アプローチ

### Phase 1: 静的Webアプリのデプロイ (1-2週間)

### Phase 2: バックエンドAPI実装 (4-6週間)

### Phase 3: データベース統合 (2-3週間)

### Phase 4: リアルタイム機能拡張 (3-4週間)

---

## 🏗️ Phase 1: 静的Webアプリのデプロイ

### オプション A: AWS Amplify (推奨 - 最速デプロイ)

#### アーキテクチャ図

```
GitHub Repository
       ↓
AWS Amplify Hosting
       ↓
Global CDN (CloudFront)
       ↓
ユーザー
```

#### メリット

- ✅ 最速デプロイ(5-10分で完了)
- ✅ GitHubとの自動連携
- ✅ CI/CD自動構築
- ✅ SSL証明書自動発行
- ✅ プレビュー環境自動生成
- ✅ 環境変数管理が簡単

#### デメリット

- ❌ カスタマイズ性がやや低い
- ❌ コストがS3+CloudFrontより若干高い

#### 実装手順

##### 1. Amplify設定ファイル作成

```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - corepack enable
        - yarn install --immutable
    build:
      commands:
        - yarn run web:build:prod
  artifacts:
    baseDirectory: web/.webpack
    files:
      - "**/*"
  cache:
    paths:
      - node_modules/**/*
      - .yarn/cache/**/*
```

##### 2. AWS Amplifyコンソールでの設定

```bash
# 1. AWS Management Consoleにログイン
# 2. Amplifyサービスを選択
# 3. "New app" → "Host web app"
# 4. GitHubリポジトリを接続
# 5. ブランチ: main を選択
# 6. amplify.ymlを自動検出させる
# 7. 環境変数を設定(必要に応じて)
# 8. "Save and deploy"
```

##### 3. カスタムドメイン設定(オプション)

```bash
# Route 53でドメインを管理している場合
# Amplifyコンソールから自動でDNS設定が可能
# 例: app.lichtblick.com
```

#### コスト見積もり

- 月間訪問者1万人の場合: 約$5-15/月
- 帯域幅: $0.15/GB
- ビルド時間: $0.01/分

---

### オプション B: S3 + CloudFront (コスト最適化)

#### アーキテクチャ図

```
GitHub Actions (CI/CD)
       ↓
S3 Bucket (静的ホスティング)
       ↓
CloudFront Distribution
       ↓
Route 53 (DNS)
       ↓
ユーザー
```

#### メリット

- ✅ 最も低コスト
- ✅ 細かいキャッシュ制御
- ✅ 大規模トラフィックに強い
- ✅ 完全なインフラ制御

#### デメリット

- ❌ 初期設定がやや複雑
- ❌ CI/CD手動構築が必要

#### 実装手順

##### 1. S3バケット作成

```bash
# AWS CLI使用
aws s3 mb s3://lichtblick-web-app --region ap-northeast-1

# バケットポリシー設定
aws s3api put-bucket-policy --bucket lichtblick-web-app --policy file://bucket-policy.json
```

```json
// bucket-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::lichtblick-web-app/*"
    }
  ]
}
```

##### 2. CloudFront Distribution作成

```json
// cloudfront-config.json
{
  "CallerReference": "lichtblick-web-2025",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-lichtblick-web-app",
        "DomainName": "lichtblick-web-app.s3.ap-northeast-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-lichtblick-web-app",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "CachedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "Compress": true,
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "Enabled": true,
  "PriceClass": "PriceClass_All"
}
```

##### 3. GitHub Actions CI/CD構築

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web to AWS

on:
  push:
    branches:
      - main
    paths:
      - "web/**"
      - "packages/**"
      - "package.json"
      - ".github/workflows/deploy-web.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        run: yarn install --immutable

      - name: Build web app
        run: yarn run web:build:prod

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1

      - name: Deploy to S3
        run: |
          aws s3 sync web/.webpack s3://lichtblick-web-app \
            --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "index.html"

          # index.htmlは毎回最新を取得するようにキャッシュ無効化
          aws s3 cp web/.webpack/index.html s3://lichtblick-web-app/index.html \
            --cache-control "no-cache, no-store, must-revalidate"

      - name: Invalidate CloudFront Cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"

      - name: Notify deployment
        run: echo "Deployment completed successfully!"
```

##### 4. GitHub Secrets設定

```bash
# GitHubリポジトリの Settings > Secrets and variables > Actions で設定
AWS_ACCESS_KEY_ID: <IAMユーザーのアクセスキー>
AWS_SECRET_ACCESS_KEY: <IAMユーザーのシークレットキー>
CLOUDFRONT_DISTRIBUTION_ID: <CloudFrontディストリビューションID>
```

#### コスト見積もり

- S3ストレージ: $0.025/GB/月
- CloudFront転送: $0.114/GB (最初の10TB)
- Route 53: $0.50/月 (ホストゾーン)
- 月間訪問者1万人の場合: 約$3-10/月

---

## 🚀 Phase 2: バックエンドAPI実装

### アーキテクチャ概要

```
┌────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│              CloudFront + S3 (Phase 1)                      │
└─────────────────────┬──────────────────────────────────────┘
                      │
                      │ HTTPS
                      ▼
┌────────────────────────────────────────────────────────────┐
│              API Gateway (REST/GraphQL)                     │
│  • 認証・認可 (Cognito)                                      │
│  • レート制限                                                │
│  • APIバージョニング                                         │
└─────────────────────┬──────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  ECS Fargate     │    │  Lambda          │
│  (コンテナ)       │    │  (サーバーレス)   │
│                  │    │                  │
│ • Node.js/NestJS │    │ • 軽量API        │
│ • WebSocket      │    │ • イベント処理   │
│ • 常時稼働       │    │ • 自動スケール   │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
┌────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
│                                                             │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │  RDS Aurora  │  │ DynamoDB  │  │  S3              │   │
│  │  PostgreSQL  │  │           │  │  (ファイル保存)   │   │
│  └──────────────┘  └───────────┘  └──────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │  ElastiCache (Redis)                             │     │
│  │  • セッション管理                                 │     │
│  │  • キャッシング                                   │     │
│  └──────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────┘
```

### バックエンド技術スタック

#### オプション A: NestJS + GraphQL (推奨)

**理由:**

- TypeScriptでフロントエンドと統一
- モジュール設計で保守性が高い
- GraphQLでフレキシブルなデータ取得
- WebSocket統合が容易

```typescript
// プロジェクト構成例
lichtblick/
├── backend/
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.controller.ts
│   │   ├── robots/
│   │   │   ├── robots.module.ts
│   │   │   ├── robots.service.ts
│   │   │   ├── robots.resolver.ts (GraphQL)
│   │   │   └── dto/
│   │   ├── data-streams/
│   │   │   ├── data-streams.module.ts
│   │   │   ├── data-streams.gateway.ts (WebSocket)
│   │   │   └── data-streams.service.ts
│   │   ├── storage/
│   │   │   ├── storage.module.ts
│   │   │   └── s3.service.ts
│   │   └── database/
│   │       ├── database.module.ts
│   │       └── migrations/
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
```

```typescript
// backend/src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS設定
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  // GraphQL Playground
  app.setGlobalPrefix("api");

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}/graphql`);
}
bootstrap();
```

```typescript
// backend/src/robots/robots.resolver.ts
import { Resolver, Query, Mutation, Args, Subscription } from "@nestjs/graphql";
import { RobotsService } from "./robots.service";
import { Robot } from "./entities/robot.entity";
import { CreateRobotInput } from "./dto/create-robot.input";
import { PubSub } from "graphql-subscriptions";

const pubSub = new PubSub();

@Resolver(() => Robot)
export class RobotsResolver {
  constructor(private readonly robotsService: RobotsService) {}

  @Query(() => [Robot])
  async robots() {
    return this.robotsService.findAll();
  }

  @Query(() => Robot)
  async robot(@Args("id") id: string) {
    return this.robotsService.findOne(id);
  }

  @Mutation(() => Robot)
  async createRobot(@Args("input") input: CreateRobotInput) {
    const robot = await this.robotsService.create(input);
    pubSub.publish("robotCreated", { robotCreated: robot });
    return robot;
  }

  @Subscription(() => Robot)
  robotCreated() {
    return pubSub.asyncIterator("robotCreated");
  }
}
```

#### インフラ設定

##### ECS Fargate設定

```yaml
# backend/ecs-task-definition.json
{
  "family": "lichtblick-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/lichtblickBackendTaskRole",
  "containerDefinitions":
    [
      {
        "name": "lichtblick-backend",
        "image": "ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/lichtblick-backend:latest",
        "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
        "environment":
          [
            { "name": "NODE_ENV", "value": "production" },
            {
              "name": "DATABASE_URL",
              "value": "postgresql://user:password@aurora-endpoint:5432/lichtblick",
            },
          ],
        "secrets":
          [
            {
              "name": "JWT_SECRET",
              "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:ACCOUNT_ID:secret:lichtblick/jwt-secret",
            },
          ],
        "logConfiguration":
          {
            "logDriver": "awslogs",
            "options":
              {
                "awslogs-group": "/ecs/lichtblick-backend",
                "awslogs-region": "ap-northeast-1",
                "awslogs-stream-prefix": "ecs",
              },
          },
      },
    ],
}
```

##### Terraform IaC (推奨)

```hcl
# infrastructure/main.tf
terraform {
  required_version = ">= 1.5"

  backend "s3" {
    bucket = "lichtblick-terraform-state"
    key    = "production/terraform.tfstate"
    region = "ap-northeast-1"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "lichtblick-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["ap-northeast-1a", "ap-northeast-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Environment = "production"
    Project     = "lichtblick"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "lichtblick-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RDS Aurora (PostgreSQL)
module "aurora" {
  source = "terraform-aws-modules/rds-aurora/aws"

  name           = "lichtblick-aurora"
  engine         = "aurora-postgresql"
  engine_version = "15.3"

  instance_class = "db.serverless"
  instances = {
    1 = {}
    2 = {}
  }

  vpc_id  = module.vpc.vpc_id
  subnets = module.vpc.private_subnets

  storage_encrypted = true
  apply_immediately = true

  serverlessv2_scaling_configuration = {
    min_capacity = 0.5
    max_capacity = 2
  }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "lichtblick-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379

  subnet_group_name = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]
}
```

---

## 🗄️ Phase 3: データベース設計

### データモデル例

```sql
-- users テーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- robots テーブル
CREATE TABLE robots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  robot_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'offline',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- data_logs テーブル (時系列データ)
CREATE TABLE data_logs (
  id BIGSERIAL PRIMARY KEY,
  robot_id UUID REFERENCES robots(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,
  log_type VARCHAR(100),
  data JSONB NOT NULL,
  s3_key VARCHAR(500), -- 大容量データはS3に保存してキーのみDB保存
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_data_logs_robot_timestamp ON data_logs(robot_id, timestamp DESC);
CREATE INDEX idx_data_logs_type ON data_logs(log_type);
CREATE INDEX idx_robots_user ON robots(user_id);
```

### DynamoDB設計(高速リアルタイムデータ用)

```javascript
// DynamoDB Table設計
{
  TableName: "RobotRealtimeData",
  KeySchema: [
    { AttributeName: "robotId", KeyType: "HASH" },  // パーティションキー
    { AttributeName: "timestamp", KeyType: "RANGE" } // ソートキー
  ],
  AttributeDefinitions: [
    { AttributeName: "robotId", AttributeType: "S" },
    { AttributeName: "timestamp", AttributeType: "N" }
  ],
  BillingMode: "PAY_PER_REQUEST", // オンデマンド課金
  StreamSpecification: {
    StreamEnabled: true,
    StreamViewType: "NEW_AND_OLD_IMAGES"
  },
  TimeToLiveSpecification: {
    Enabled: true,
    AttributeName: "ttl" // 古いデータを自動削除
  }
}
```

---

## 🔐 Phase 4: 認証・セキュリティ

### AWS Cognito統合

```typescript
// backend/src/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { CognitoStrategy } from "./cognito.strategy";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "24h" },
    }),
  ],
  providers: [CognitoStrategy, AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

```typescript
// backend/src/auth/cognito.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { passportJwtSecret } from "jwks-rsa";

@Injectable()
export class CognitoStrategy extends PassportStrategy(Strategy, "cognito") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: process.env.COGNITO_CLIENT_ID,
      issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      algorithms: ["RS256"],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
      }),
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      username: payload["cognito:username"],
      email: payload.email,
    };
  }
}
```

---

## 📊 コスト見積もり

### 月間アクティブユーザー1,000人の場合

| サービス                     | 構成                       | 月額コスト      |
| ---------------------------- | -------------------------- | --------------- |
| **CloudFront + S3**          | フロントエンド配信         | $5-10           |
| **ECS Fargate**              | 2タスク (512 CPU, 1GB RAM) | $30-40          |
| **RDS Aurora Serverless v2** | 0.5-2 ACU                  | $40-80          |
| **ElastiCache Redis**        | cache.t3.micro             | $15             |
| **DynamoDB**                 | オンデマンド (10GB)        | $2.5            |
| **API Gateway**              | 100万リクエスト            | $3.5            |
| **Cognito**                  | 1,000 MAU (最初50,000無料) | $0              |
| **S3 (データ保存)**          | 100GB                      | $2.5            |
| **CloudWatch Logs**          | 10GB                       | $5              |
| **合計**                     |                            | **$103-158/月** |

### 月間アクティブユーザー10,000人の場合

| サービス | 月額コスト      |
| -------- | --------------- |
| 合計     | **$350-500/月** |

---

## 🚀 デプロイフロー

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy-full-stack.yml
name: Deploy Full Stack

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn test

  deploy-frontend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn web:build:prod
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      - run: aws s3 sync web/.webpack s3://lichtblick-web-app --delete
      - run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"

  deploy-backend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: lichtblick-backend
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -f backend/Dockerfile .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster lichtblick-cluster \
            --service lichtblick-backend-service \
            --force-new-deployment
```

---

## 📈 監視・ログ

### CloudWatch設定

```typescript
// backend/src/main.ts - ロギング設定
import { Logger } from "@nestjs/common";
import * as winston from "winston";
import * as WinstonCloudWatch from "winston-cloudwatch";

const cloudwatchConfig = {
  logGroupName: "/aws/ecs/lichtblick-backend",
  logStreamName: `${process.env.HOSTNAME}-${new Date().toISOString().split("T")[0]}`,
  awsRegion: process.env.AWS_REGION,
  jsonMessage: true,
};

const logger = winston.createLogger({
  transports: [new winston.transports.Console(), new WinstonCloudWatch(cloudwatchConfig)],
});
```

### CloudWatch Alarms

```hcl
# infrastructure/monitoring.tf
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "lichtblick-backend-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "lichtblick-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS CPU utilization is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
```

---

## 🎯 次のステップ

### 優先順位

1. **Phase 1実装** (1-2週間)

   - [ ] AWS Amplify or S3+CloudFront選択
   - [ ] デプロイパイプライン構築
   - [ ] カスタムドメイン設定
   - [ ] SSL証明書設定

2. **Phase 2準備** (並行作業可能)

   - [ ] バックエンドAPI設計
   - [ ] データベーススキーマ設計
   - [ ] 認証フロー設計
   - [ ] Terraform構成作成

3. **Phase 2実装** (4-6週間)

   - [ ] NestJS プロジェクト初期化
   - [ ] ECS Fargate環境構築
   - [ ] RDS Aurora構築
   - [ ] API開発
   - [ ] フロントエンド統合

4. **Phase 3・4** (段階的実装)
   - [ ] WebSocketリアルタイム通信
   - [ ] データストリーミング機能
   - [ ] 監視・アラート設定
   - [ ] パフォーマンス最適化

---

## 📚 参考リソース

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

---

## 質問・サポート

アーキテクチャや実装に関する質問があれば、お気軽にお尋ねください!
