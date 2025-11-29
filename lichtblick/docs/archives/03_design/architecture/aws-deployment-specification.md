# Lichtblick AWS デプロイメント仕様書

## 📋 文書情報

| 項目               | 内容                                |
| ------------------ | ----------------------------------- |
| **文書名**         | Lichtblick AWS デプロイメント仕様書 |
| **バージョン**     | v1.0.0                              |
| **作成日**         | 2025年10月2日                       |
| **対象システム**   | Lichtblick Suite (Web Application)  |
| **アーキテクチャ** | S3+CloudFront + Lambda中心設計      |

---

## 🎯 システム概要

### **プロジェクト概要**

Lichtblickは、ロボティクス可視化・診断ツールのWebアプリケーションです。大容量のロボットデータファイルの配信、リアルタイムデータ処理、及び直感的なUIによるデータ可視化機能を提供します。

### **アーキテクチャ方針**

- **フロントエンド**: React SPA を S3+CloudFront で高速配信
- **バックエンド**: Lambda Functions中心のサーバーレスアーキテクチャ
- **データベース**: PostgreSQL（RDS）によるメタデータ管理
- **ファイルストレージ**: S3による大容量ロボットデータ配信
- **コスト最適化**: 使用量課金とオートスケーリングによる効率運用

---

## 🏗️ システムアーキテクチャ

### **全体構成図**

```
┌─────────────────────────────────────────────────────────────┐
│                     Users (Global)                          │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                CloudFront CDN                               │
│  • Global Edge Locations (200+)                            │
│  • SSL/TLS Termination                                      │
│  • Static Assets Caching                                    │
│  • SPA Routing Support                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                S3 Static Hosting                            │
│  • React SPA Build Files                                    │
│  • index.html (Entry Point)                                 │
│  • JS/CSS/Assets                                           │
│  • Versioned Deployment                                     │
└─────────────────────────────────────────────────────────────┘

                     ▲ Frontend Layer
                     │
═════════════════════┼═════════════════════════════════════════
                     │ API Calls
                     ▼ Backend Layer

┌─────────────────────────────────────────────────────────────┐
│              API Gateway (REST/WebSocket)                   │
│  • Request Routing                                          │
│  • Authentication/Authorization                             │
│  • Rate Limiting                                           │
│  • Request/Response Transformation                          │
│  • CORS Configuration                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    ▼                ▼                ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Lambda    │ │   Lambda    │ │   Lambda    │
│ (Auth API)  │ │(Robot Data) │ │(File Mgmt)  │
│             │ │             │ │             │
│ • User Auth │ │ • Data Proc │ │ • Upload    │
│ • JWT       │ │ • Metadata  │ │ • Download  │
│ • Session   │ │ • Analytics │ │ • Presigned │
└─────────────┘ └─────────────┘ └─────────────┘
    │                │                │
    └────────────────┼────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               RDS PostgreSQL                                │
│  • User Management                                          │
│  • Robot Metadata                                          │
│  • Dataset Information                                      │
│  • Access Logs                                             │
│  • Multi-AZ for HA                                         │
└─────────────────────────────────────────────────────────────┘

                     ▲ Data Layer
                     │
═════════════════════┼═════════════════════════════════════════
                     │ File Operations
                     ▼ Storage Layer

┌─────────────────────────────────────────────────────────────┐
│                S3 Data Storage                              │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │   Raw Data    │  │ Sample Data   │  │  User Data    │   │
│  │               │  │               │  │               │   │
│  │ • Robot Logs  │  │ • Tutorials   │  │ • Uploads     │   │
│  │ • Sensor Data │  │ • Examples    │  │ • Projects    │   │
│  │ • Video Files │  │ • Demos       │  │ • Configs     │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│                                                             │
│  Storage Classes:                                           │
│  • Standard (Hot Data)                                      │
│  • IA (Infrequently Accessed)                              │
│  • Glacier (Archive)                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌐 フロントエンド仕様

### **1. React SPA ホスティング**

#### **S3 バケット構成**

```
lichtblick-web-app-[環境]
├── index.html              # SPA エントリーポイント
├── static/
│   ├── css/
│   │   ├── main.[hash].css
│   │   └── chunk.[hash].css
│   ├── js/
│   │   ├── main.[hash].js
│   │   ├── chunk.[hash].js
│   │   └── runtime.[hash].js
│   └── media/
│       ├── images/
│       ├── icons/
│       └── fonts/
├── manifest.json           # PWA Manifest
├── robots.txt             # SEO Configuration
└── service-worker.js      # PWA Service Worker
```

#### **S3 バケット設定**

```json
{
  "WebsiteConfiguration": {
    "IndexDocument": "index.html",
    "ErrorDocument": "index.html"
  },
  "CorsConfiguration": {
    "CorsRules": [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 3000
      }
    ]
  },
  "PublicAccessBlock": {
    "BlockPublicAcls": false,
    "BlockPublicPolicy": false,
    "IgnorePublicAcls": false,
    "RestrictPublicBuckets": false
  }
}
```

#### **バケットポリシー**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::lichtblick-web-app-[環境]/*"
    }
  ]
}
```

### **2. CloudFront 配信設定**

#### **Distribution 設定**

```json
{
  "CallerReference": "lichtblick-web-[timestamp]",
  "Comment": "Lichtblick Web Application CDN",
  "DefaultRootObject": "index.html",
  "Origins": [
    {
      "Id": "S3-lichtblick-web-app",
      "DomainName": "lichtblick-web-app-[環境].s3.ap-northeast-1.amazonaws.com",
      "S3OriginConfig": {
        "OriginAccessIdentity": ""
      }
    }
  ],
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-lichtblick-web-app",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "CachedMethods": ["GET", "HEAD"],
    "Compress": true,
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": { "Forward": "none" }
    }
  },
  "CacheBehaviors": [
    {
      "PathPattern": "/static/*",
      "TargetOriginId": "S3-lichtblick-web-app",
      "ViewerProtocolPolicy": "redirect-to-https",
      "Compress": true,
      "MinTTL": 31536000,
      "DefaultTTL": 31536000,
      "MaxTTL": 31536000
    }
  ],
  "CustomErrorResponses": [
    {
      "ErrorCode": 404,
      "ResponseCode": 200,
      "ResponsePagePath": "/index.html",
      "ErrorCachingMinTTL": 300
    },
    {
      "ErrorCode": 403,
      "ResponseCode": 200,
      "ResponsePagePath": "/index.html",
      "ErrorCachingMinTTL": 300
    }
  ],
  "PriceClass": "PriceClass_All"
}
```

#### **カスタムドメイン設定**

```yaml
Domain: app.lichtblick.com
SSL Certificate: AWS Certificate Manager (ACM)
  - Domain Validation
  - Auto-renewal
DNS: Route 53
  - A Record (Alias) -> CloudFront Distribution
  - AAAA Record (IPv6) -> CloudFront Distribution
```

---

## ⚡ バックエンド API 仕様

### **1. API Gateway 設定**

#### **REST API 構成**

```
Base URL: https://api.lichtblick.com/v1

Endpoints:
├── /auth
│   ├── POST /login
│   ├── POST /logout
│   ├── POST /register
│   ├── POST /refresh-token
│   └── GET  /profile
├── /datasets
│   ├── GET    /
│   ├── GET    /{id}
│   ├── POST   /
│   ├── PUT    /{id}
│   └── DELETE /{id}
├── /files
│   ├── GET    /
│   ├── POST   /upload-url
│   ├── GET    /{id}/download-url
│   └── DELETE /{id}
├── /robots
│   ├── GET    /
│   ├── GET    /{id}
│   ├── POST   /
│   └── PUT    /{id}
└── /analytics
    ├── GET /usage
    ├── GET /performance
    └── POST /events
```

#### **API Gateway 設定**

```json
{
  "name": "lichtblick-api",
  "description": "Lichtblick Backend API",
  "endpointType": "REGIONAL",
  "cors": {
    "allowOrigins": ["https://app.lichtblick.com"],
    "allowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allowHeaders": ["Content-Type", "Authorization"],
    "maxAge": 86400
  },
  "throttle": {
    "burstLimit": 5000,
    "rateLimit": 2000
  },
  "quota": {
    "limit": 10000,
    "period": "DAY"
  }
}
```

### **2. Lambda Functions 設計**

#### **認証サービス (auth-service)**

```typescript
// Function: lichtblick-auth-service
// Runtime: Node.js 20.x
// Memory: 256 MB
// Timeout: 30 seconds

interface AuthService {
  // ユーザー登録
  register(
    email: string,
    password: string,
  ): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }>;

  // ログイン
  login(
    email: string,
    password: string,
  ): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }>;

  // トークン更新
  refreshToken(refreshToken: string): Promise<{
    accessToken: string;
  }>;

  // プロフィール取得
  getProfile(userId: string): Promise<User>;
}

// 環境変数
const config = {
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: "24h",
  REFRESH_TOKEN_EXPIRES_IN: "7d",
  DATABASE_URL: process.env.DATABASE_URL,
  BCRYPT_ROUNDS: 12,
};
```

#### **データセット管理サービス (dataset-service)**

```typescript
// Function: lichtblick-dataset-service
// Runtime: Node.js 20.x
// Memory: 512 MB
// Timeout: 60 seconds

interface DatasetService {
  // データセット一覧取得
  getDatasets(filters?: DatasetFilters): Promise<Dataset[]>;

  // データセット詳細取得
  getDataset(id: string): Promise<Dataset>;

  // データセット作成
  createDataset(data: CreateDatasetRequest): Promise<Dataset>;

  // データセット更新
  updateDataset(id: string, data: UpdateDatasetRequest): Promise<Dataset>;

  // データセット削除
  deleteDataset(id: string): Promise<void>;

  // メタデータ処理
  processMetadata(fileKey: string): Promise<DatasetMetadata>;
}

interface Dataset {
  id: string;
  name: string;
  description: string;
  robotType: string;
  fileSize: number;
  fileCount: number;
  s3Key: string;
  metadata: DatasetMetadata;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
```

#### **ファイル管理サービス (file-service)**

```typescript
// Function: lichtblick-file-service
// Runtime: Node.js 20.x
// Memory: 256 MB
// Timeout: 30 seconds

interface FileService {
  // アップロード用署名付きURL生成
  generateUploadUrl(
    fileName: string,
    fileSize: number,
  ): Promise<{
    uploadUrl: string;
    fileKey: string;
    expiresIn: number;
  }>;

  // ダウンロード用署名付きURL生成
  generateDownloadUrl(fileKey: string): Promise<{
    downloadUrl: string;
    expiresIn: number;
  }>;

  // ファイル一覧取得
  listFiles(prefix?: string): Promise<FileInfo[]>;

  // ファイル削除
  deleteFile(fileKey: string): Promise<void>;

  // ファイルメタデータ取得
  getFileMetadata(fileKey: string): Promise<FileMetadata>;
}

// S3設定
const s3Config = {
  bucket: "lichtblick-data-[環境]",
  region: "ap-northeast-1",
  signedUrlExpiry: 3600, // 1時間
  maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
  allowedFileTypes: [".bag", ".mcap", ".mp4", ".json", ".csv"],
};
```

### **3. Lambda レイヤー構成**

#### **共通レイヤー (lichtblick-common-layer)**

```
layer/
├── nodejs/
│   ├── node_modules/
│   │   ├── aws-sdk/
│   │   ├── jsonwebtoken/
│   │   ├── bcryptjs/
│   │   ├── pg/
│   │   └── joi/
│   └── package.json
└── README.md

# 依存関係
dependencies:
  - aws-sdk: "^2.1300.0"
  - jsonwebtoken: "^9.0.0"
  - bcryptjs: "^2.4.3"
  - pg: "^8.8.0"
  - joi: "^17.7.0"
```

---

## 🗄️ データベース設計

### **1. RDS PostgreSQL 構成**

#### **インスタンス設定**

```yaml
Engine: PostgreSQL 15.3
Instance Class: db.t3.micro (初期) -> db.t3.small (本格運用)
Storage:
  Type: gp3
  Size: 20GB (初期) -> 100GB (拡張時)
  IOPS: 3000
  Throughput: 125 MB/s
Multi-AZ: false (開発) -> true (本番)
Backup:
  Retention: 7 days
  Window: 03:00-04:00 JST
Maintenance:
  Window: Sun 04:00-05:00 JST
```

#### **セキュリティ設定**

```yaml
VPC: lichtblick-vpc
Subnet Group: lichtblick-db-subnet-group
  - Subnets: private-subnet-1a, private-subnet-1c
Security Group: lichtblick-db-sg
  - Inbound: Port 5432 from Lambda Security Group
Encryption:
  At Rest: enabled (AWS KMS)
  In Transit: SSL required
```

### **2. データベーススキーマ**

#### **ユーザー管理**

```sql
-- users テーブル
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーセッション
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
```

#### **ロボット・データセット管理**

```sql
-- ロボット情報
CREATE TABLE robots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    robot_type VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    description TEXT,
    specifications JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- データセット
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    robot_id UUID REFERENCES robots(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dataset_type VARCHAR(100) NOT NULL, -- 'sample', 'user_upload', 'generated'
    file_format VARCHAR(50) NOT NULL,   -- 'rosbag', 'mcap', 'csv', 'json'
    file_size BIGINT NOT NULL,
    file_count INTEGER DEFAULT 1,
    s3_bucket VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    metadata JSONB,
    tags TEXT[],
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- データセットファイル（複数ファイル対応）
CREATE TABLE dataset_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    checksum VARCHAR(64),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_robots_user_id ON robots(user_id);
CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_datasets_robot_id ON datasets(robot_id);
CREATE INDEX idx_datasets_type ON datasets(dataset_type);
CREATE INDEX idx_datasets_public ON datasets(is_public);
CREATE INDEX idx_datasets_tags ON datasets USING gin(tags);
CREATE INDEX idx_dataset_files_dataset_id ON dataset_files(dataset_id);
```

#### **アクセスログ・分析**

```sql
-- APIアクセスログ
CREATE TABLE api_access_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER, -- milliseconds
    request_size INTEGER,
    response_size INTEGER,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ファイルダウンロードログ
CREATE TABLE download_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
    file_key VARCHAR(500) NOT NULL,
    file_size BIGINT,
    download_duration INTEGER, -- seconds
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- パーティショニング（月次）
CREATE TABLE api_access_logs_y2025m10 PARTITION OF api_access_logs
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- インデックス
CREATE INDEX idx_api_logs_user_id ON api_access_logs(user_id);
CREATE INDEX idx_api_logs_created_at ON api_access_logs(created_at);
CREATE INDEX idx_download_logs_user_id ON download_logs(user_id);
CREATE INDEX idx_download_logs_created_at ON download_logs(created_at);
```

### **3. データベースパフォーマンス最適化**

#### **PostgreSQL設定調整**

```sql
-- postgresql.conf 推奨設定
shared_buffers = 256MB              -- メモリの25%
effective_cache_size = 1GB          -- システムメモリの75%
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1              -- SSDの場合

-- 接続プール設定
max_connections = 100
idle_in_transaction_session_timeout = 300000 -- 5分
```

#### **バックアップ・メンテナンス**

```sql
-- 自動バキューム設定
autovacuum = on
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05

-- 定期メンテナンス（Lambda関数で実行）
-- 週次実行
VACUUM ANALYZE;
REINDEX DATABASE lichtblick;

-- ログテーブル定期クリーンアップ（90日保持）
DELETE FROM api_access_logs
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM download_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## 🗂️ ストレージ設計

### **1. S3 バケット構成**

#### **データストレージバケット**

```
lichtblick-data-[環境]
├── datasets/
│   ├── samples/           # サンプルデータ
│   │   ├── tutorial/
│   │   ├── demo/
│   │   └── examples/
│   ├── users/            # ユーザーアップロード
│   │   └── {user-id}/
│   │       ├── uploads/
│   │       └── processed/
│   └── system/           # システム生成
│       ├── thumbnails/
│       ├── previews/
│       └── metadata/
├── logs/                 # アプリケーションログ
│   ├── access/
│   ├── error/
│   └── audit/
└── backups/             # バックアップファイル
    ├── database/
    └── configurations/
```

#### **ライフサイクル管理**

```json
{
  "Rules": [
    {
      "Id": "SampleDataLifecycle",
      "Status": "Enabled",
      "Filter": { "Prefix": "datasets/samples/" },
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        }
      ]
    },
    {
      "Id": "UserDataLifecycle",
      "Status": "Enabled",
      "Filter": { "Prefix": "datasets/users/" },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 180,
          "StorageClass": "GLACIER"
        }
      ]
    },
    {
      "Id": "LogsCleanup",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Expiration": { "Days": 90 }
    }
  ]
}
```

### **2. S3 セキュリティ設定**

#### **バケットポリシー**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureConnections",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::lichtblick-data-[環境]", "arn:aws:s3:::lichtblick-data-[環境]/*"],
      "Condition": {
        "Bool": { "aws:SecureTransport": "false" }
      }
    },
    {
      "Sid": "AllowLambdaAccess",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::[account]:role/lichtblick-lambda-execution-role" },
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:GetObjectVersion"],
      "Resource": "arn:aws:s3:::lichtblick-data-[環境]/*"
    }
  ]
}
```

#### **暗号化設定**

```json
{
  "Rules": [
    {
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "arn:aws:kms:ap-northeast-1:[account]:key/[key-id]"
      },
      "BucketKeyEnabled": true
    }
  ]
}
```

---

## 🔐 セキュリティ仕様

### **1. IAM ロール・ポリシー設計**

#### **Lambda実行ロール**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:ap-northeast-1:[account]:*"
    },
    {
      "Effect": "Allow",
      "Action": ["rds:DescribeDBInstances", "rds-db:connect"],
      "Resource": "arn:aws:rds-db:ap-northeast-1:[account]:dbuser:*/lichtblick-lambda"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:GeneratePresignedUrl"],
      "Resource": "arn:aws:s3:::lichtblick-data-[環境]/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:CreateGrant",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:ap-northeast-1:[account]:key/[key-id]"
    }
  ]
}
```

#### **CloudFront OAI設定**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity [OAI-ID]"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::lichtblick-web-app-[環境]/*"
    }
  ]
}
```

### **2. 認証・認可**

#### **JWT トークン仕様**

```typescript
interface JWTPayload {
  sub: string; // User ID
  email: string; // User Email
  username: string; // Username
  role: string; // user, admin
  iat: number; // Issued At
  exp: number; // Expires At
  aud: string; // lichtblick-app
  iss: string; // lichtblick-auth
}

// トークン設定
const jwtConfig = {
  algorithm: "HS256",
  expiresIn: "24h",
  issuer: "lichtblick-auth",
  audience: "lichtblick-app",
};
```

#### **API認証フロー**

```typescript
// 1. ログインリクエスト
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// 2. レスポンス
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "8f7e6d5c4b3a2918...",
  "expiresIn": 86400,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username"
  }
}

// 3. API呼び出し
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

// 4. トークン更新
POST /auth/refresh-token
{
  "refreshToken": "8f7e6d5c4b3a2918..."
}
```

### **3. セキュリティヘッダー**

#### **CloudFront Response Headers Policy**

```json
{
  "ResponseHeadersPolicyConfig": {
    "Name": "lichtblick-security-headers",
    "SecurityHeadersConfig": {
      "StrictTransportSecurity": {
        "AccessControlMaxAgeSec": 31536000,
        "IncludeSubdomains": true,
        "Preload": true
      },
      "ContentTypeOptions": {
        "Override": true
      },
      "FrameOptions": {
        "FrameOption": "DENY",
        "Override": true
      },
      "ReferrerPolicy": {
        "ReferrerPolicy": "strict-origin-when-cross-origin",
        "Override": true
      },
      "ContentSecurityPolicy": {
        "ContentSecurityPolicy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.lichtblick.com;",
        "Override": true
      }
    }
  }
}
```

---

## 📊 監視・ログ仕様

### **1. CloudWatch 監視設定**

#### **Lambda関数監視**

```json
{
  "MetricFilters": [
    {
      "filterName": "ErrorCount",
      "filterPattern": "ERROR",
      "metricTransformations": [
        {
          "metricName": "ErrorCount",
          "metricNamespace": "Lichtblick/Lambda",
          "metricValue": "1"
        }
      ]
    },
    {
      "filterName": "LatencyHigh",
      "filterPattern": "[timestamp, requestId, latency > 5000]",
      "metricTransformations": [
        {
          "metricName": "HighLatencyCount",
          "metricNamespace": "Lichtblick/Lambda",
          "metricValue": "1"
        }
      ]
    }
  ]
}
```

#### **CloudWatch Alarms**

```json
{
  "Alarms": [
    {
      "AlarmName": "Lichtblick-Lambda-Errors",
      "MetricName": "Errors",
      "Namespace": "AWS/Lambda",
      "Statistic": "Sum",
      "Period": 300,
      "EvaluationPeriods": 2,
      "Threshold": 5,
      "ComparisonOperator": "GreaterThanThreshold",
      "AlarmActions": ["arn:aws:sns:ap-northeast-1:[account]:lichtblick-alerts"]
    },
    {
      "AlarmName": "Lichtblick-RDS-CPU",
      "MetricName": "CPUUtilization",
      "Namespace": "AWS/RDS",
      "Statistic": "Average",
      "Period": 300,
      "EvaluationPeriods": 3,
      "Threshold": 80,
      "ComparisonOperator": "GreaterThanThreshold"
    },
    {
      "AlarmName": "Lichtblick-API-Gateway-4XXError",
      "MetricName": "4XXError",
      "Namespace": "AWS/ApiGateway",
      "Statistic": "Sum",
      "Period": 300,
      "EvaluationPeriods": 2,
      "Threshold": 10,
      "ComparisonOperator": "GreaterThanThreshold"
    }
  ]
}
```

### **2. ログ管理**

#### **ログ構造化**

```typescript
// 共通ログフォーマット
interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  service: string;
  function: string;
  requestId: string;
  userId?: string;
  message: string;
  metadata?: Record<string, any>;
  duration?: number;
  errorStack?: string;
}

// 使用例
const logger = {
  info: (message: string, metadata?: Record<string, any>) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        service: "lichtblick-auth",
        function: "login",
        requestId: context.awsRequestId,
        userId: userId,
        message,
        metadata,
      }),
    );
  },
};
```

#### **ログ保持ポリシー**

```json
{
  "LogGroups": [
    {
      "logGroupName": "/aws/lambda/lichtblick-auth-service",
      "retentionInDays": 30
    },
    {
      "logGroupName": "/aws/lambda/lichtblick-dataset-service",
      "retentionInDays": 30
    },
    {
      "logGroupName": "/aws/lambda/lichtblick-file-service",
      "retentionInDays": 30
    },
    {
      "logGroupName": "/aws/apigateway/lichtblick-api",
      "retentionInDays": 14
    }
  ]
}
```

---

## 🚀 デプロイメント仕様

### **1. CI/CD パイプライン**

#### **GitHub Actions ワークフロー**

```yaml
# .github/workflows/deploy.yml
name: Deploy Lichtblick to AWS

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main

env:
  AWS_REGION: ap-northeast-1
  NODE_VERSION: 20

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn test
      - run: yarn lint
      - run: yarn type-check

  build-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn web:build:prod
      - uses: actions/upload-artifact@v4
        with:
          name: frontend-build
          path: web/.webpack/

  build-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd backend && npm ci
      - run: cd backend && npm run build
      - run: cd backend && npm run package
      - uses: actions/upload-artifact@v4
        with:
          name: lambda-packages
          path: backend/dist/

  deploy-infrastructure:
    needs: [build-frontend, build-backend]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy CloudFormation Stack
        run: |
          aws cloudformation deploy \
            --template-file infrastructure/template.yaml \
            --stack-name lichtblick-infrastructure \
            --parameter-overrides \
              Environment=production \
              DomainName=lichtblick.com \
            --capabilities CAPABILITY_IAM \
            --no-fail-on-empty-changeset

  deploy-backend:
    needs: deploy-infrastructure
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: lambda-packages

      - name: Deploy Lambda Functions
        run: |
          # Deploy each Lambda function
          for function in auth-service dataset-service file-service; do
            aws lambda update-function-code \
              --function-name lichtblick-$function \
              --zip-file fileb://$function.zip
          done

  deploy-frontend:
    needs: deploy-infrastructure
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: frontend-build

      - name: Deploy to S3
        run: |
          # Sync static assets with long cache
          aws s3 sync . s3://${{ secrets.S3_BUCKET }} \
            --delete \
            --cache-control "public,max-age=31536000,immutable" \
            --exclude "index.html"

          # Deploy index.html with no cache
          aws s3 cp index.html s3://${{ secrets.S3_BUCKET }}/index.html \
            --cache-control "no-cache,no-store,must-revalidate"

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

### **2. 環境管理**

#### **環境別設定**

```yaml
# 開発環境
development:
  domain: dev.lichtblick.com
  s3_bucket: lichtblick-web-app-dev
  api_gateway: lichtblick-api-dev
  rds_instance: db.t3.micro
  lambda_memory: 256MB

# ステージング環境
staging:
  domain: staging.lichtblick.com
  s3_bucket: lichtblick-web-app-staging
  api_gateway: lichtblick-api-staging
  rds_instance: db.t3.small
  lambda_memory: 512MB

# 本番環境
production:
  domain: app.lichtblick.com
  s3_bucket: lichtblick-web-app-prod
  api_gateway: lichtblick-api-prod
  rds_instance: db.t3.small
  lambda_memory: 512MB
```

---

## 💰 コスト見積もり

### **1. 月額コスト試算**

#### **ユーザー規模別コスト（月額USD）**

| サービス              | 100ユーザー | 1,000ユーザー | 10,000ユーザー |
| --------------------- | ----------- | ------------- | -------------- |
| **S3 (Web App)**      | $3          | $8            | $25            |
| **CloudFront**        | $5          | $15           | $50            |
| **Lambda**            | $5          | $25           | $150           |
| **API Gateway**       | $2          | $10           | $60            |
| **RDS PostgreSQL**    | $15         | $25           | $100           |
| **S3 (Data Storage)** | $10         | $50           | $200           |
| **Route 53**          | $1          | $1            | $2             |
| **CloudWatch**        | $2          | $8            | $30            |
| **その他**            | $2          | $8            | $33            |
| **合計**              | **$45**     | **$150**      | **$650**       |

#### **詳細コスト計算**

**Lambda Functions (1,000ユーザー想定)**

```
リクエスト数: 100,000/月
実行時間平均: 500ms
メモリ: 512MB

コスト計算:
- リクエスト料金: 100,000 * $0.0000002 = $0.02
- 実行時間料金: 100,000 * 0.5s * 512MB * $0.0000166667 = $4.17
- 合計: $4.19/月
```

**S3 Storage (データ保存)**

```
サンプルデータ: 10GB (Standard)
ユーザーデータ: 50GB (Standard → IA → Glacier)
ログデータ: 5GB (Standard, 90日で削除)

コスト計算:
- Standard: 40GB * $0.025 = $1.00
- IA: 15GB * $0.0125 = $0.19
- Glacier: 10GB * $0.004 = $0.04
- 転送料金: 100GB * $0.09 = $9.00
- 合計: $10.23/月
```

### **2. コスト最適化戦略**

#### **短期施策（0-3ヶ月）**

- Lambda関数の実行時間最適化
- S3ライフサイクルポリシー実装
- CloudFrontキャッシュ設定最適化
- RDS Reservedインスタンス検討

#### **中長期施策（3-12ヶ月）**

- S3 Intelligent Tiering導入
- Lambda Provisioned Concurrency検討
- RDS Aurora Serverless v2移行検討
- コスト分析ダッシュボード構築

---

## 📈 パフォーマンス目標

### **1. パフォーマンス指標**

#### **フロントエンド**

```yaml
初回ページロード:
  First Contentful Paint: < 1.5秒
  Largest Contentful Paint: < 2.5秒
  Time to Interactive: < 3.0秒

リピートアクセス:
  First Contentful Paint: < 0.8秒
  Largest Contentful Paint: < 1.5秒

Lighthouse Score:
  Performance: > 90
  Accessibility: > 95
  Best Practices: > 90
  SEO: > 85
```

#### **バックエンドAPI**

```yaml
レスポンス時間:
  認証API: < 200ms (P95)
  データセット一覧: < 500ms (P95)
  ファイルアップロード署名: < 100ms (P95)

スループット:
  同時接続数: 500+
  1秒あたりリクエスト数: 100+

可用性:
  アップタイム: 99.9%
  RTO (Recovery Time Objective): < 15分
  RPO (Recovery Point Objective): < 5分
```

### **2. スケーラビリティ設計**

#### **水平スケーリング**

```yaml
Lambda Functions:
  並行実行数: 1000 (初期) → 10000 (拡張時)
  予約済み同時実行: 100 (重要な関数)

API Gateway:
  スロットル制限: 5000 req/sec
  バースト制限: 10000 req

CloudFront:
  エッジロケーション: 全世界
  キャッシュ容量: 無制限
```

#### **垂直スケーリング**

```yaml
RDS PostgreSQL:
  初期: db.t3.micro (1 vCPU, 1GB RAM)
  拡張: db.t3.medium (2 vCPU, 4GB RAM)
  最大: db.r5.large (2 vCPU, 16GB RAM)

Lambda Memory:
  認証サービス: 256MB → 512MB
  データセットサービス: 512MB → 1024MB
  ファイルサービス: 256MB → 512MB
```

---

## 🔄 災害復旧・バックアップ

### **1. バックアップ戦略**

#### **データベースバックアップ**

```yaml
RDS自動バックアップ:
  保持期間: 7日間
  バックアップウィンドウ: 03:00-04:00 JST
  リージョン間コピー: 有効 (ap-southeast-1)

手動スナップショット:
  頻度: 週次 (日曜日)
  保持期間: 4週間
  タグ付け: Purpose=Manual, Environment=Production
```

#### **S3データバックアップ**

```yaml
Cross-Region Replication:
  レプリケーション先: ap-southeast-1
  対象: 重要なユーザーデータのみ
  ストレージクラス: Standard-IA

バージョニング:
  有効化: 全バケット
  ライフサイクル: 90日で削除
  MFA Delete: 有効
```

### **2. 災害復旧計画**

#### **RTO/RPO目標**

```yaml
重要度レベル1 (認証、重要なAPI):
  RTO: 15分以内
  RPO: 5分以内

重要度レベル2 (データ処理、ファイル操作):
  RTO: 1時間以内
  RPO: 15分以内

重要度レベル3 (ログ、分析):
  RTO: 4時間以内
  RPO: 1時間以内
```

#### **復旧手順**

```yaml
Phase 1 - 緊急対応 (0-15分): 1. インシデント検知・エスカレーション
  2. 影響範囲の特定
  3. CloudFormationスタック状態確認
  4. 代替リージョンでの最小構成起動

Phase 2 - サービス復旧 (15分-1時間): 1. データベース最新バックアップから復旧
  2. Lambda関数再デプロイ
  3. DNS切り替え (Route 53)
  4. 基本機能動作確認

Phase 3 - 完全復旧 (1-4時間): 1. 全サービス機能確認
  2. データ整合性チェック
  3. パフォーマンステスト
  4. ログ分析・原因調査
```

---

## 📋 実装フェーズ

### **Phase 1: 基盤構築 (2-3週間)**

#### **Week 1: インフラストラクチャ**

- [ ] AWS アカウント・IAM設定
- [ ] VPC・ネットワーク構築
- [ ] S3バケット作成・設定
- [ ] CloudFront Distribution設定
- [ ] Route 53 DNS設定

#### **Week 2-3: バックエンド基盤**

- [ ] RDS PostgreSQL セットアップ
- [ ] Lambda関数基本構成
- [ ] API Gateway設定
- [ ] 認証サービス実装
- [ ] 基本CRUD API実装

### **Phase 2: コア機能実装 (3-4週間)**

#### **Week 4-5: フロントエンド**

- [ ] React SPA デプロイ設定
- [ ] 認証UI実装
- [ ] データセット管理UI
- [ ] ファイルアップロード/ダウンロード機能

#### **Week 6-7: バックエンド機能**

- [ ] ファイル管理サービス完成
- [ ] データセット処理機能
- [ ] メタデータ抽出・処理
- [ ] 検索・フィルタリング機能

### **Phase 3: 本格運用準備 (2-3週間)**

#### **Week 8-9: 運用・監視**

- [ ] CloudWatch監視設定
- [ ] ログ収集・分析基盤
- [ ] バックアップ・復旧テスト
- [ ] パフォーマンステスト

#### **Week 10: 本番リリース**

- [ ] セキュリティ監査
- [ ] 負荷テスト
- [ ] ドキュメント整備
- [ ] 本番環境リリース

---

## 📞 サポート・保守

### **1. 運用体制**

#### **監視項目**

```yaml
自動監視:
  - システム稼働状況 (24/7)
  - エラー率・レスポンス時間
  - リソース使用率
  - セキュリティアラート

手動監視:
  - 週次パフォーマンスレビュー
  - 月次コストレビュー
  - 四半期セキュリティ監査
```

#### **保守スケジュール**

```yaml
日次:
  - バックアップ状況確認
  - エラーログ確認

週次:
  - パフォーマンス分析
  - セキュリティパッチ適用

月次:
  - 使用量・コスト分析
  - 容量計画見直し
  - ドキュメント更新
```

### **2. エスカレーション**

#### **インシデント対応**

```yaml
Level 1 - 自動復旧:
  - Auto Scaling対応
  - Lambda再試行
  - CloudWatch自動復旧

Level 2 - 手動対応:
  - アラート通知
  - 手動スケーリング
  - 設定変更

Level 3 - 緊急対応:
  - オンコール対応
  - 災害復旧実行
  - ベンダーエスカレーション
```

---

## 📚 参考資料

### **技術文書**

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

### **AWS サービス文書**

- [Amazon S3 Developer Guide](https://docs.aws.amazon.com/s3/)
- [Amazon CloudFront Developer Guide](https://docs.aws.amazon.com/cloudfront/)
- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)
- [Amazon RDS User Guide](https://docs.aws.amazon.com/rds/)

---

**文書更新履歴**

| 版数   | 更新日     | 更新者           | 更新内容 |
| ------ | ---------- | ---------------- | -------- |
| v1.0.0 | 2025-10-02 | System Architect | 初版作成 |

---

_この仕様書は、lichtblickプロジェクトのAWSデプロイメント実装の指針として作成されました。技術的要件の変更や運用状況に応じて随時更新されます。_
