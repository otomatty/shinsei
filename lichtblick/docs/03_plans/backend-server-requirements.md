# Lichtblick バックエンドサーバー 要件定義書

**作成日**: 2025-01-XX
**バージョン**: 1.0.0
**対象**: Lichtblick マーケットプレイスサーバー

---

## 📋 目次

1. [概要](#概要)
2. [機能要件](#機能要件)
3. [非機能要件](#非機能要件)
4. [技術スタック](#技術スタック)
5. [データベース設計](#データベース設計)
6. [認証・認可](#認証認可)
7. [API設計](#api設計)
8. [インフラストラクチャ](#インフラストラクチャ)
9. [セキュリティ要件](#セキュリティ要件)
10. [確認事項への回答](#確認事項への回答)

---

## 概要

### 目的

Lichtblickアプリケーション向けのマーケットプレイスサーバーを構築し、以下のアセットを配信・管理する：

- **Extensions（拡張機能）**: `.foxe` ファイル形式の拡張機能パッケージ
- **Layouts（レイアウト）**: JSON形式のレイアウト設定ファイル
- **カスタムURDFモデル**: ロボットモデル定義ファイル（`.urdf`）
- **サンプルデータ**: デモンストレーション用のサンプルデータファイル

### 現状

- 開発用の静的ファイルサーバーが存在（`server/` ディレクトリ）
- Extensions と Layouts のデータ構造が定義済み
- バリデーション機能が実装済み
- アップロード機能は未実装

### 目標

- 本番環境で運用可能なバックエンドサーバーの構築
- ユーザーからのアセットアップロード機能の実装
- セキュアな認証・認可システムの構築
- EC2上での運用

---

## 機能要件

### FR-1: アセット配信機能

#### FR-1.1: Extensions配信

- データベースからExtensionsカタログを取得して配信（REST API）
- 個別の`.foxe`ファイルの配信
- バージョン管理された複数バージョンのサポート
- メタデータ（サムネイル、README、CHANGELOG）の配信
- **認証不要**（公開アセットの閲覧・ダウンロード）

#### FR-1.2: Layouts配信

- データベースからLayoutsカタログを取得して配信（REST API）
- 個別のレイアウトJSONデータの配信
- メタデータ（サムネイル、説明文）の配信
- **認証不要**（公開アセットの閲覧・ダウンロード）

#### FR-1.3: URDFモデル配信

- データベースからURDFモデルカタログを取得して配信（REST API）
- URDFモデルファイル（`.urdf`）の配信
- 関連するメッシュファイルやテクスチャファイルの配信
- **認証不要**（公開アセットの閲覧・ダウンロード）

#### FR-1.4: サンプルデータ配信

- データベースからサンプルデータカタログを取得して配信（REST API）
- サンプルデータファイル（`.mcap`, `.bag`など）の配信
- **認証不要**（公開アセットの閲覧・ダウンロード）

### FR-2: アセット管理機能

#### FR-2.1: アセットアップロード

- Extensions（`.foxe`）のアップロード
- Layouts（JSON）のアップロード
- URDFモデル（`.urdf` + 関連ファイル）のアップロード
- サンプルデータファイルのアップロード
- アップロード時のバリデーション
- ファイルサイズ制限の適用

#### FR-2.2: アセット更新

- 既存アセットの更新
- バージョン管理
- 更新履歴の記録

#### FR-2.3: アセット削除

- アセットの削除（論理削除推奨）
- 削除権限のチェック

#### FR-2.4: アセット検索・フィルタリング

- キーワード検索
- タグによるフィルタリング
- 発行者（publisher）によるフィルタリング
- カテゴリによるフィルタリング

### FR-3: 認証・認可機能

**重要**: Lichtblickアプリケーション自体は認証機能を持っていないため、サーバー側での認証は**管理機能（アップロード・更新・削除）のみ**に限定されます。

#### FR-3.1: API Key認証（管理機能用）

- API Keyの発行・管理
- API Keyによる認証（アップロード・更新・削除API）
- API Keyの有効期限管理
- API Keyの無効化・削除

#### FR-3.2: 権限管理

- API Keyごとの権限設定（admin, publisher）
- アセット所有権の管理（オプション）
- 公開・非公開の設定

**注意**: 閲覧・ダウンロード機能は認証不要（公開アセット）

### FR-4: メタデータ管理

#### FR-4.1: データベース管理

- すべてのアセット情報はデータベースで管理
- JSONファイルは生成せず、API経由で直接DBから取得
- リアルタイムでのデータ更新が可能

#### FR-4.2: 統計情報

- ダウンロード数の記録
- 人気アセットのランキング
- 使用統計の提供

---

## 非機能要件

### NFR-1: パフォーマンス

- APIレスポンス時間: 200ms以下（95パーセンタイル）
- ファイル配信: 100MB/s以上のスループット
- 同時接続数: 1000接続以上

### NFR-2: 可用性

- 稼働率: 99.5%以上
- ダウンタイム: 月間4時間以内
- 自動フェイルオーバー対応

### NFR-3: スケーラビリティ

- 水平スケーリング対応
- ストレージ容量: 初期100GB、拡張可能
- 負荷分散対応

### NFR-4: セキュリティ

- HTTPS必須
- ファイルアップロード時のウイルススキャン（オプション）
- レート制限（Rate Limiting）
- CORS設定

### NFR-5: 保守性

- ログ出力（構造化ログ推奨）
- モニタリング・アラート
- バックアップ・リストア機能

---

## 技術スタック

### 推奨技術スタック

#### オプション1: Node.js + Express/Fastify

**メリット**:

- 既存の開発サーバーとの一貫性
- JavaScript/TypeScriptのエコシステム
- 豊富なライブラリ
- 開発速度が速い

**技術構成**:

- **ランタイム**: Node.js 20 LTS
- **フレームワーク**: Express.js または Fastify
- **データベース**: PostgreSQL 15+
- **ORM**: Prisma または TypeORM
- **認証**: API Key認証（管理機能用）
- **ファイルストレージ**: ローカルファイルシステム + S3（オプション）
- **バリデーション**: Zod または Joi
- **ログ**: Winston または Pino

#### オプション2: Rust + Actix-web/Axum

**メリット**:

- 高いパフォーマンス
- メモリ安全性
- 低レイテンシ

**技術構成**:

- **ランタイム**: Rust 1.75+
- **フレームワーク**: Actix-web または Axum
- **データベース**: PostgreSQL 15+（sqlx または Diesel）
- **認証**: API Key認証（管理機能用）
- **ファイルストレージ**: ローカルファイルシステム + S3（オプション）
- **バリデーション**: serde + validator
- **ログ**: tracing + tracing-subscriber

### 推奨: Node.js

既存のコードベースとの一貫性、開発速度、エコシステムの豊富さを考慮し、**Node.js + Express/Fastify**を推奨します。

---

## データベース設計

### データベース選択

**PostgreSQL 15+** を推奨します。

**理由**:

- JSON型のサポート（Layoutsの保存に最適）
- リレーショナルデータとJSONデータの両方を扱える
- 高いパフォーマンス
- 豊富な機能（全文検索、配列型など）
- EC2上での運用実績が豊富

### スキーマ設計

#### テーブル一覧

1. **users** - ユーザー情報
2. **extensions** - 拡張機能メタデータ
3. **extension_versions** - 拡張機能バージョン情報
4. **layouts** - レイアウトメタデータ
5. **urdf_models** - URDFモデル情報
6. **sample_data** - サンプルデータ情報
7. **assets** - アセットファイル情報（共通）
8. **downloads** - ダウンロード履歴
9. **tags** - タグ情報
10. **asset_tags** - アセットとタグの関連

#### 主要テーブル定義

```sql
-- ユーザーテーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user', -- 'admin', 'publisher', 'user'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 拡張機能テーブル
CREATE TABLE extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id VARCHAR(255) UNIQUE NOT NULL, -- e.g., "foxglove.blank-panel-extension"
  name VARCHAR(255) NOT NULL,
  publisher VARCHAR(255) NOT NULL,
  description TEXT,
  homepage VARCHAR(500),
  license VARCHAR(100),
  namespace VARCHAR(100) DEFAULT 'marketplace',
  thumbnail_url VARCHAR(500),
  readme_url VARCHAR(500),
  changelog_url VARCHAR(500),
  owner_id UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 拡張機能バージョンテーブル
CREATE TABLE extension_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id UUID REFERENCES extensions(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  published_date TIMESTAMP NOT NULL,
  sha256sum VARCHAR(64),
  foxe_file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(extension_id, version)
);

-- レイアウトテーブル
CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  publisher VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500),
  layout_data JSONB NOT NULL, -- レイアウトJSONデータ
  layout_file_path VARCHAR(500), -- 外部ファイルの場合
  owner_id UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- URDFモデルテーブル
CREATE TABLE urdf_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  publisher VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'manipulator', 'mobile', 'humanoid', etc.
  default_frame_id VARCHAR(255),
  urdf_file_path VARCHAR(500) NOT NULL,
  metadata JSONB, -- 追加メタデータ
  owner_id UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- サンプルデータテーブル
CREATE TABLE sample_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  publisher VARCHAR(255) NOT NULL,
  description TEXT,
  file_type VARCHAR(50), -- 'mcap', 'bag', etc.
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  thumbnail_url VARCHAR(500),
  owner_id UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- タグテーブル
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50), -- 'extension', 'layout', 'urdf', 'sample'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- アセットタグ関連テーブル（ポリモーフィック）
CREATE TABLE asset_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  asset_type VARCHAR(50) NOT NULL, -- 'extension', 'layout', 'urdf', 'sample'
  asset_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tag_id, asset_type, asset_id)
);

-- API Keyテーブル
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(255) UNIQUE NOT NULL, -- ハッシュ化されたAPI Key
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) NOT NULL, -- 'admin', 'publisher'
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ダウンロード履歴テーブル
CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type VARCHAR(50) NOT NULL,
  asset_id UUID NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_extensions_extension_id ON extensions(extension_id);
CREATE INDEX idx_extensions_owner ON extensions(owner_id);
CREATE INDEX idx_extensions_public ON extensions(is_public);
CREATE INDEX idx_layouts_layout_id ON layouts(layout_id);
CREATE INDEX idx_urdf_models_model_id ON urdf_models(model_id);
CREATE INDEX idx_downloads_asset ON downloads(asset_type, asset_id);
CREATE INDEX idx_asset_tags_asset ON asset_tags(asset_type, asset_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
```

### データベース配置

**✅ 同じEC2内に構築可能**

PostgreSQLは同じEC2インスタンス内で運用できます。以下の構成を推奨します：

```
EC2インスタンス
├── アプリケーションサーバー（Node.js/Rust）
├── PostgreSQL データベース
└── ファイルストレージ（/var/lichtblick/assets）
```

**メリット**:

- ネットワークレイテンシが最小
- 運用コストが低い
- シンプルな構成

**注意点**:

- データベースのバックアップ戦略が必要
- ディスク容量の確保が必要
- パフォーマンスチューニングが必要

**代替案**:

- 高可用性が必要な場合: RDS PostgreSQL（別サービス）
- スケーラビリティが必要な場合: 別のEC2インスタンスに分離

---

## 認証・認可

### 認証方式の選択

**重要**: Lichtblickアプリケーション自体は認証機能を持っていないため、以下の方針を採用します：

- **閲覧・ダウンロード**: 認証不要（公開アセット）
- **アップロード・更新・削除**: 認証必須（API Key方式）

#### 推奨: API Key認証 ⭐

**理由**:

1. **アプリ側の認証不要**: Lichtblickアプリは認証機能を持たないため、ユーザー認証（JWT等）は不要
2. **管理機能のみ認証**: アップロードなどの管理機能のみ認証が必要
3. **シンプル**: CLIツールや管理用スクリプトから使用しやすい
4. **サーバー間通信に適している**: 自動化されたアップロードプロセスに最適

**実装方針**:

- API Keyをデータベースで管理
- API Keyごとに権限（admin, publisher）を設定
- API Keyは環境変数や設定ファイルで管理
- 有効期限の設定（オプション）

#### 認証フロー

```
管理ツール/CLI
  ↓
API Keyをヘッダーに設定
  ↓
サーバーでAPI Key検証
  ↓
権限チェック
  ↓
アップロード/更新/削除実行
```

### 認可（権限管理）

#### ロール定義

1. **admin** - 管理者

   - 全アセットの管理
   - API Key管理
   - システム設定

2. **publisher** - 発行者

   - 自分のアセットのアップロード・更新・削除
   - 公開・非公開の設定

**注意**: 一般ユーザー（閲覧のみ）は認証不要

#### 権限チェック

```typescript
// 例: API Key検証
async function validateApiKey(apiKey: string): Promise<ApiKeyInfo | null> {
  const keyInfo = await db.apiKeys.findUnique({
    where: { key: apiKey },
    include: { user: true },
  });

  if (!keyInfo || !keyInfo.isActive) {
    return null;
  }

  // 有効期限チェック
  if (keyInfo.expiresAt && keyInfo.expiresAt < new Date()) {
    return null;
  }

  return keyInfo;
}

// 例: アセットアップロード時の権限チェック
function canUploadAsset(apiKey: ApiKeyInfo, assetType: string): boolean {
  if (apiKey.role === "admin") return true;
  if (apiKey.role === "publisher") return true;
  return false;
}

// 例: アセット削除時の権限チェック
async function canDeleteAsset(apiKey: ApiKeyInfo, asset: Asset): Promise<boolean> {
  if (apiKey.role === "admin") return true;
  if (asset.ownerId === apiKey.userId) return true;
  return false;
}
```

### 実装例（Node.js + API Key）

```typescript
// API Keyテーブル（データベーススキーマに追加）
// CREATE TABLE api_keys (
//   id UUID PRIMARY KEY,
//   key VARCHAR(255) UNIQUE NOT NULL,
//   key_hash VARCHAR(255) NOT NULL, -- ハッシュ化して保存
//   user_id UUID REFERENCES users(id),
//   role VARCHAR(50) NOT NULL, -- 'admin', 'publisher'
//   is_active BOOLEAN DEFAULT true,
//   expires_at TIMESTAMP,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

import crypto from "crypto";

// API Key生成
function generateApiKey(): string {
  return `lk_${crypto.randomBytes(32).toString("hex")}`;
}

// API Keyハッシュ化
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// API Key検証ミドルウェア
async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({ error: "API Key required" });
  }

  const keyHash = hashApiKey(apiKey);
  const keyInfo = await db.apiKeys.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!keyInfo || !keyInfo.isActive) {
    return res.status(401).json({ error: "Invalid API Key" });
  }

  // 有効期限チェック
  if (keyInfo.expiresAt && keyInfo.expiresAt < new Date()) {
    return res.status(401).json({ error: "API Key expired" });
  }

  req.apiKey = keyInfo;
  next();
}

// 権限チェックミドルウェア
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey || !roles.includes(req.apiKey.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// 使用例
app.post("/v1/extensions", authenticateApiKey, requireRole("admin", "publisher"), uploadExtension);
```

### API Key管理エンドポイント

```
POST   /admin/api-keys          # API Key生成（認証必須）
GET    /admin/api-keys           # API Key一覧取得（認証必須）
DELETE /admin/api-keys/:id       # API Key削除（認証必須）
```

### API Keyの取得・設定方法

#### ⚡ クイックスタート（最も簡単な方法）

**1行で設定完了：**

```bash
# API Keyを環境変数に設定（現在のシェルセッション用）
export LICHTBLICK_API_KEY="lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 永続的に設定（~/.bashrc または ~/.zshrc に追加）
echo 'export LICHTBLICK_API_KEY="lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"' >> ~/.bashrc
source ~/.bashrc

# 設定を確認
echo $LICHTBLICK_API_KEY
```

**自動セットアップスクリプト（推奨）：**

```bash
# サーバーから提供されるセットアップスクリプトを実行
curl -fsSL https://api.lichtblick.example.com/setup.sh | bash

# または、ローカルで実行
./setup-lichtblick-api-key.sh "lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

#### 1. 初期セットアップ（初回API Key生成）

サーバー管理者が最初のAPI Keyを生成する方法：

**方法A: ワンライナー（最も簡単）⭐推奨**

```bash
# サーバー上で実行（API Keyが自動生成され、表示される）
cd /opt/lichtblick-server/app && npm run cli:generate-api-key -- --role admin --name "Initial Admin Key" | tee ~/.lichtblick-api-key

# 生成されたAPI Keyを確認
cat ~/.lichtblick-api-key
```

**方法B: 自動セットアップスクリプト**

```bash
# サーバーに含まれるセットアップスクリプトを実行
cd /opt/lichtblick-server/app
./scripts/setup-initial-api-key.sh

# 出力例:
# ✅ API Key generated successfully!
# API Key: lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
#
# Please save this key securely. It will not be shown again.
#
# To use this key, run:
#   export LICHTBLICK_API_KEY="lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**方法C: 管理用Web UI（将来的な実装）**

- ブラウザから `https://api.lichtblick.example.com/admin` にアクセス
- 初期セットアップ画面でAPI Keyを自動生成
- 生成されたAPI Keyをコピー＆ペーストで使用

#### 2. API Keyの取得方法

**既存のAPI Keyを取得する場合：**

```bash
# API Key一覧を取得（既存のAPI Keyが必要）
curl -X GET https://api.lichtblick.example.com/v1/admin/api-keys \
  -H "X-API-Key: <既存のAPI Key>"

# レスポンス例
{
  "data": [
    {
      "id": "uuid-here",
      "name": "Initial Admin Key",
      "role": "admin",
      "createdAt": "2025-01-XX...",
      "lastUsedAt": "2025-01-XX...",
      "expiresAt": null
    }
  ]
}
```

**注意**: セキュリティ上の理由から、既に生成されたAPI Keyの値自体は再表示されません。新しいAPI Keyが必要な場合は、新規生成する必要があります。

#### 3. API Keyの設定方法（簡単順）

**⭐ 方法A: 環境変数（最も簡単・推奨）**

```bash
# ワンライナーで設定（現在のシェルセッション）
export LICHTBLICK_API_KEY="lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 永続的に設定（~/.bashrc または ~/.zshrc に追加）
echo 'export LICHTBLICK_API_KEY="lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"' >> ~/.bashrc && source ~/.bashrc

# Windows (PowerShell) - 永続的に設定
[System.Environment]::SetEnvironmentVariable('LICHTBLICK_API_KEY', 'lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'User')

# Windows (CMD) - 現在のセッションのみ
set LICHTBLICK_API_KEY=lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**自動設定スクリプト（.envファイル自動生成）**

```bash
# .envファイルを自動生成（プロジェクトルートで実行）
cat > .env << EOF
LICHTBLICK_API_KEY=lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LICHTBLICK_API_URL=https://api.lichtblick.example.com/v1
EOF

# .gitignoreに追加（既に存在しない場合）
echo ".env" >> .gitignore
```

**方法B: CLIツールの設定（簡単）**

```bash
# 1回のコマンドで設定完了
lichtblick-cli config set api-key "lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 設定を確認
lichtblick-cli config show

# 設定ファイルの場所: ~/.lichtblick/config.json
```

**方法C: 設定ファイル（手動編集が必要）**

```yaml
# ~/.lichtblick/config.yaml または プロジェクトルート/config.yaml
api:
  key: "lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  baseUrl: "https://api.lichtblick.example.com/v1"
```

```json
// ~/.lichtblick/config.json
{
  "api": {
    "key": "lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "baseUrl": "https://api.lichtblick.example.com/v1"
  }
}
```

#### 4. 設定の確認・検証

**設定が正しく行われているか確認：**

```bash
# 環境変数の確認
echo $LICHTBLICK_API_KEY

# API Keyの検証（サーバーに接続テスト）
curl -X GET https://api.lichtblick.example.com/v1/extensions \
  -H "X-API-Key: $LICHTBLICK_API_KEY" | head -20

# または、専用の検証コマンド
lichtblick-cli config verify
# 出力: ✅ API Key is valid and working!
```

**設定エラーのトラブルシューティング：**

```bash
# 環境変数が設定されていない場合のエラーメッセージ
# Error: LICHTBLICK_API_KEY environment variable is not set

# 解決方法
export LICHTBLICK_API_KEY="your-api-key-here"

# 設定ファイルの場所を確認
lichtblick-cli config path
# 出力: ~/.lichtblick/config.json
```

#### 5. API Keyの使用方法

**curlコマンドでの使用（環境変数を使用）：**

```bash
# 環境変数から自動読み込み（推奨）
curl -X POST https://api.lichtblick.example.com/v1/extensions \
  -H "X-API-Key: $LICHTBLICK_API_KEY" \
  -F "foxe=@extension.foxe" \
  -F 'metadata={"id":"my.extension",...}'

# ヘルパー関数を定義（さらに簡単に）
alias lichtblick-upload='curl -X POST https://api.lichtblick.example.com/v1/extensions -H "X-API-Key: $LICHTBLICK_API_KEY"'

# 使用例
lichtblick-upload -F "foxe=@extension.foxe" -F 'metadata={"id":"my.extension",...}'
```

**スクリプトでの使用（自動検出）：**

```bash
#!/bin/bash
# upload-extension.sh - API Keyを自動検出

# 環境変数から自動取得、なければ設定ファイルから読み込み
API_KEY="${LICHTBLICK_API_KEY:-$(cat ~/.lichtblick/config.json 2>/dev/null | grep -o '"key": "[^"]*' | cut -d'"' -f4)}"
API_URL="${LICHTBLICK_API_URL:-https://api.lichtblick.example.com/v1}"

if [ -z "$API_KEY" ]; then
  echo "❌ Error: API Key not found"
  echo "Please set LICHTBLICK_API_KEY environment variable or configure in ~/.lichtblick/config.json"
  echo ""
  echo "Quick setup:"
  echo "  export LICHTBLICK_API_KEY=\"your-api-key-here\""
  exit 1
fi

echo "✅ Using API Key: ${API_KEY:0:10}..."
curl -X POST "$API_URL/extensions" \
  -H "X-API-Key: $API_KEY" \
  -F "foxe=@$1" \
  -F "metadata=@$2"
```

**Node.jsスクリプトでの使用（自動検出）：**

```javascript
// upload-extension.js - API Keyを自動検出
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const fetch = require("node-fetch");

// API Keyを自動検出（環境変数 → 設定ファイル → .envファイル）
function getApiKey() {
  // 1. 環境変数から取得
  if (process.env.LICHTBLICK_API_KEY) {
    return process.env.LICHTBLICK_API_KEY;
  }

  // 2. 設定ファイルから取得
  const configPath = path.join(
    process.env.HOME || process.env.USERPROFILE,
    ".lichtblick",
    "config.json",
  );
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (config.api?.key) {
      return config.api.key;
    }
  }

  // 3. .envファイルから取得
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/LICHTBLICK_API_KEY=(.+)/);
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }

  return null;
}

const API_KEY = getApiKey();
const API_URL = process.env.LICHTBLICK_API_URL || "https://api.lichtblick.example.com/v1";

if (!API_KEY) {
  console.error("❌ Error: API Key not found");
  console.error(
    "Please set LICHTBLICK_API_KEY environment variable or configure in ~/.lichtblick/config.json",
  );
  console.error("");
  console.error("Quick setup:");
  console.error('  export LICHTBLICK_API_KEY="your-api-key-here"');
  process.exit(1);
}

async function uploadExtension(foxePath, metadata) {
  const form = new FormData();
  form.append("foxe", fs.createReadStream(foxePath));
  form.append("metadata", JSON.stringify(metadata));

  const response = await fetch(`${API_URL}/extensions`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return await response.json();
}

// 使用例
uploadExtension("./extension.foxe", {
  id: "my.extension",
  name: "My Extension",
  // ...
})
  .then(console.log)
  .catch(console.error);
```

**Pythonスクリプトでの使用（自動検出）：**

```python
# upload_extension.py - API Keyを自動検出
import os
import json
import requests
from pathlib import Path

def get_api_key():
    """API Keyを自動検出（環境変数 → 設定ファイル → .envファイル）"""
    # 1. 環境変数から取得
    api_key = os.environ.get('LICHTBLICK_API_KEY')
    if api_key:
        return api_key

    # 2. 設定ファイルから取得
    config_path = Path.home() / '.lichtblick' / 'config.json'
    if config_path.exists():
        with open(config_path) as f:
            config = json.load(f)
            if config.get('api', {}).get('key'):
                return config['api']['key']

    # 3. .envファイルから取得
    env_path = Path.cwd() / '.env'
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if line.startswith('LICHTBLICK_API_KEY='):
                    return line.split('=', 1)[1].strip().strip('"\'')

    return None

API_KEY = get_api_key()
API_URL = os.environ.get('LICHTBLICK_API_URL', 'https://api.lichtblick.example.com/v1')

if not API_KEY:
    print("❌ Error: API Key not found")
    print("Please set LICHTBLICK_API_KEY environment variable or configure in ~/.lichtblick/config.json")
    print("")
    print("Quick setup:")
    print('  export LICHTBLICK_API_KEY="your-api-key-here"')
    raise ValueError('LICHTBLICK_API_KEY not found')

def upload_extension(foxe_path, metadata):
    url = f'{API_URL}/extensions'
    headers = {'X-API-Key': API_KEY}

    with open(foxe_path, 'rb') as f:
        files = {'foxe': f}
        data = {'metadata': json.dumps(metadata)}
        response = requests.post(url, headers=headers, files=files, data=data)
        response.raise_for_status()
        return response.json()

# 使用例
metadata = {
    'id': 'my.extension',
    'name': 'My Extension',
    # ...
}
result = upload_extension('./extension.foxe', metadata)
print(result)
```

#### 6. API Keyの管理・ローテーション

**新しいAPI Keyを生成：**

```bash
# 既存のAPI Keyを使用して新しいAPI Keyを生成
curl -X POST https://api.lichtblick.example.com/v1/admin/api-keys \
  -H "X-API-Key: <既存のAPI Key>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CI/CD Pipeline Key",
    "role": "publisher",
    "expiresAt": "2026-01-01T00:00:00Z"
  }'

# レスポンス
{
  "id": "uuid-here",
  "key": "lk_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",  # この時だけ表示される
  "name": "CI/CD Pipeline Key",
  "role": "publisher",
  "expiresAt": "2026-01-01T00:00:00Z",
  "createdAt": "2025-01-XX..."
}
```

**API Keyを無効化・削除：**

```bash
# API Keyを削除
curl -X DELETE https://api.lichtblick.example.com/v1/admin/api-keys/<key-id> \
  -H "X-API-Key: <既存のAPI Key>"
```

**ローテーション手順：**

1. 新しいAPI Keyを生成
2. 新しいAPI Keyで動作確認
3. 古いAPI Keyを無効化・削除
4. すべての使用箇所で新しいAPI Keyに更新

#### 7. セキュリティ上の注意点

**✅ 推奨事項：**

- API Keyは環境変数で管理（`.env`ファイルを使用する場合は`.gitignore`に追加）
- API Keyは定期的にローテーション（3-6ヶ月ごと）
- 必要最小限の権限（role）を付与
- 有効期限を設定（特に一時的な用途の場合）
- API Keyの使用履歴を定期的に確認

**❌ 避けるべきこと：**

- API KeyをGitリポジトリにコミットしない
- API Keyをログに出力しない
- API KeyをURLパラメータで送信しない（ヘッダーに設定）
- API Keyを共有しない（用途ごとに個別のAPI Keyを生成）
- 期限切れのAPI Keyを放置しない

### セキュリティ対策

- API Keyはハッシュ化してデータベースに保存
- HTTPS必須
- レート制限（アップロード: 10回/時間）
- API Keyの有効期限設定（推奨）
- 定期的なAPI Keyローテーション（推奨）
- API Keyの使用履歴記録（`last_used_at`を更新）

---

## API設計

### RESTful API設計

#### ベースURL

```
https://api.lichtblick.example.com/v1
```

#### エンドポイント一覧

##### 管理用エンドポイント（認証必須: API Key）

```
POST   /admin/api-keys        # API Key生成
GET    /admin/api-keys        # API Key一覧取得
DELETE /admin/api-keys/:id    # API Key削除
```

##### Extensionsエンドポイント

```
GET    /extensions             # 拡張機能一覧取得（認証不要）
GET    /extensions/:id         # 拡張機能詳細取得（認証不要）
GET    /extensions/:id/versions # バージョン一覧取得（認証不要）
GET    /extensions/:id/versions/:version # 特定バージョン取得（認証不要）
GET    /extensions/:id/download/:version # ダウンロード（認証不要）
POST   /extensions             # 拡張機能アップロード（認証必須: API Key）
PUT    /extensions/:id         # 拡張機能更新（認証必須: API Key）
DELETE /extensions/:id         # 拡張機能削除（認証必須: API Key）
```

##### Layoutsエンドポイント

```
GET    /layouts                # レイアウト一覧取得（認証不要）
GET    /layouts/:id           # レイアウト詳細取得（認証不要）
GET    /layouts/:id/download  # レイアウトダウンロード（認証不要）
POST   /layouts               # レイアウトアップロード（認証必須: API Key）
PUT    /layouts/:id           # レイアウト更新（認証必須: API Key）
DELETE /layouts/:id           # レイアウト削除（認証必須: API Key）
```

##### URDFモデルエンドポイント

```
GET    /urdf-models            # URDFモデル一覧取得（認証不要）
GET    /urdf-models/:id       # URDFモデル詳細取得（認証不要）
GET    /urdf-models/:id/download # URDFモデルダウンロード（認証不要）
POST   /urdf-models           # URDFモデルアップロード（認証必須: API Key）
PUT    /urdf-models/:id       # URDFモデル更新（認証必須: API Key）
DELETE /urdf-models/:id       # URDFモデル削除（認証必須: API Key）
```

##### サンプルデータエンドポイント

```
GET    /sample-data           # サンプルデータ一覧取得（認証不要）
GET    /sample-data/:id       # サンプルデータ詳細取得（認証不要）
GET    /sample-data/:id/download # サンプルデータダウンロード（認証不要）
POST   /sample-data           # サンプルデータアップロード（認証必須: API Key）
PUT    /sample-data/:id       # サンプルデータ更新（認証必須: API Key）
DELETE /sample-data/:id      # サンプルデータ削除（認証必須: API Key）
```

##### 検索・統計エンドポイント

```
GET    /search                # 統合検索
GET    /stats/popular         # 人気アセット
GET    /stats/downloads      # ダウンロード統計
```

### リクエスト・レスポンス例

#### 拡張機能一覧取得（認証不要）

**リクエスト**:

```http
GET /v1/extensions?page=1&limit=20&keyword=ros&tag=visualization
```

**レスポンス**:

```json
{
  "data": [
    {
      "id": "foxglove.blank-panel-extension",
      "name": "Blank Panel",
      "publisher": "foxglove",
      "description": "Add a little space to your layout",
      "thumbnail": null,
      "keywords": ["blank", "panel"],
      "latestVersion": "1.0.0",
      "downloadCount": 1234,
      "createdAt": "2025-10-04T01:21:25Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### 拡張機能アップロード（認証必須: API Key）

**リクエスト**:

```http
POST /v1/extensions
X-API-Key: lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: multipart/form-data

{
  "foxe": <file>,
  "metadata": {
    "id": "my.extension",
    "name": "My Extension",
    "publisher": "My Name",
    "description": "Description",
    "version": "1.0.0",
    "keywords": ["tag1", "tag2"]
  }
}
```

**レスポンス**:

```json
{
  "id": "my.extension",
  "name": "My Extension",
  "version": "1.0.0",
  "status": "pending", // または "published"
  "message": "Extension uploaded successfully"
}
```

---

## インフラストラクチャ

### EC2インスタンス構成

#### 推奨インスタンスタイプ

**開発環境**:

- **t3.medium** (2 vCPU, 4 GB RAM)
- ストレージ: 50 GB gp3

**本番環境**:

- **t3.large** または **t3.xlarge** (2-4 vCPU, 8-16 GB RAM)
- ストレージ: 100 GB+ gp3（必要に応じて拡張）

#### ディレクトリ構造

```
/opt/lichtblick-server/
├── app/                    # アプリケーションコード
├── assets/                 # アセットファイル（EC2上に保存）
│   ├── extensions/
│   ├── layouts/
│   ├── urdf-models/
│   └── sample-data/
├── logs/                   # ログファイル
└── backups/                # バックアップ
```

**ファイルストレージの配置**:

- **✅ EC2上にまとめて構築可能**
- すべてのアセットファイルはEC2インスタンスのローカルストレージに保存
- データベース、アプリケーション、ファイルストレージを同じEC2内に配置

**メリット**:

- ネットワークレイテンシが最小
- 運用コストが低い
- シンプルな構成
- ファイルアクセスが高速

**注意点**:

1. **ディスク容量**: アセットファイル、データベース、ログのすべてを保存するため、十分な容量を確保（初期100GB+、必要に応じて拡張）
2. **バックアップ**: ファイルストレージとデータベースの両方のバックアップ戦略が必要
3. **スケーラビリティ**: ファイル数が増加した場合の容量拡張計画
4. **パフォーマンス**: 大量のファイルアクセス時のI/Oパフォーマンス

**推奨構成**:

- ストレージタイプ: gp3（SSD）
- 初期容量: 100GB
- 自動拡張: 有効（最大500GBなど）
- バックアップ: 日次（S3への同期）

### ネットワーク構成

```
Internet
  │
  ├─ [Route 53] (DNS)
  │
  ├─ [CloudFront] (CDN) - オプション
  │
  ├─ [Application Load Balancer] - オプション
  │
  └─ [EC2 Instance]
      ├─ Nginx (リバースプロキシ)
      ├─ Node.js/Rust App
      ├─ PostgreSQL
      └─ ファイルストレージ
```

### セットアップ手順

1. **EC2インスタンスの起動**

   - Amazon Linux 2023 または Ubuntu 22.04 LTS
   - セキュリティグループの設定（HTTP/HTTPS, SSH）

2. **ソフトウェアのインストール**

   ```bash
   # Node.jsの場合
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo yum install -y nodejs

   # PostgreSQL
   sudo yum install -y postgresql15 postgresql15-server
   sudo postgresql-setup --initdb
   sudo systemctl enable postgresql
   sudo systemctl start postgresql

   # Nginx
   sudo yum install -y nginx
   ```

3. **アプリケーションのデプロイ**

   - Gitリポジトリからクローン
   - 依存関係のインストール
   - 環境変数の設定
   - データベースマイグレーション

4. **システムdサービス設定**

   ```ini
   # /etc/systemd/system/lichtblick-server.service
   [Unit]
   Description=Lichtblick Marketplace Server
   After=network.target postgresql.service

   [Service]
   Type=simple
   User=lichtblick
   WorkingDirectory=/opt/lichtblick-server/app
   ExecStart=/usr/bin/node server.js
   Restart=always
   RestartSec=10
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

5. **Nginx設定**

   ```nginx
   server {
       listen 80;
       server_name api.lichtblick.example.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### バックアップ戦略

1. **データベースバックアップ**

   - 日次自動バックアップ（pg_dump）
   - S3へのアップロード
   - 保持期間: 30日

2. **ファイルストレージバックアップ**

   - 週次バックアップ
   - S3への同期

3. **設定ファイルバックアップ**
   - Gitリポジトリで管理

---

## セキュリティ要件

### SEC-1: 認証・認可

- API Keyのハッシュ化保存（SHA-256）
- API Keyの有効期限管理
- レート制限（アップロード: 10回/時間）
- API Keyの無効化機能

### SEC-2: データ保護

- HTTPS必須（TLS 1.2以上）
- データベース接続の暗号化
- 機密情報の環境変数管理
- ファイルアップロード時のウイルススキャン（オプション）

### SEC-3: 入力検証

- ファイルタイプの検証
- ファイルサイズ制限
- SQLインジェクション対策（ORM使用）
- XSS対策（入力サニタイゼーション）

### SEC-4: ネットワークセキュリティ

- セキュリティグループの適切な設定
- ファイアウォール設定
- DDoS対策（AWS Shield Standard）

### SEC-5: 監査・ログ

- アクセスログの記録
- 認証イベントの記録
- エラーログの記録
- 定期的なログレビュー

---

## 確認事項への回答

### Q1: データベースも同じEC2内に構築できますか？

**回答: ✅ 可能です**

PostgreSQLを同じEC2インスタンス内で運用できます。以下の点を考慮してください：

**メリット**:

- ネットワークレイテンシが最小
- 運用コストが低い
- シンプルな構成

**注意点**:

1. **ディスク容量**: アセットファイルとデータベースの両方を保存するため、十分な容量を確保
2. **パフォーマンス**: データベースとアプリケーションが同じリソースを共有するため、インスタンスサイズを適切に選択
3. **バックアップ**: データベースとファイルの両方のバックアップ戦略が必要
4. **可用性**: 単一インスタンスのため、高可用性が必要な場合は別の構成を検討

**推奨構成**:

- インスタンスタイプ: t3.large以上
- ストレージ: 100GB+ gp3（必要に応じて拡張）
- データベース: PostgreSQL 15+（ローカルインストール）

**代替案**:

- 高可用性が必要: Amazon RDS PostgreSQL（別サービス）
- スケーラビリティが必要: 別のEC2インスタンスに分離

### Q2: Extension, Layout, カスタムURDFモデルのアップロード機能の認証周りはどうしたら良いでしょうか？

**回答: API Key認証方式を推奨**

**推奨方式: API Key認証**

**理由**:

1. **アプリ側の認証不要**: Lichtblickアプリ自体は認証機能を持たないため、ユーザー認証（JWT等）は不要
2. **管理機能のみ認証**: アップロードなどの管理機能のみ認証が必要
3. **シンプル**: CLIツールや管理用スクリプトから使用しやすい
4. **サーバー間通信に適している**: 自動化されたアップロードプロセスに最適

**実装のポイント**:

1. **API Key発行**

   - サーバー管理者がAPI Keyを生成
   - API Keyはハッシュ化してデータベースに保存
   - 権限（admin, publisher）を設定

2. **認証フロー**

   ```
   管理ツール/CLI → API Keyをヘッダーに設定 → アップロードAPI呼び出し
   ```

3. **権限管理**

   - API Keyごとに権限を設定（admin, publisher）
   - アセット所有権のチェック（オプション）

4. **セキュリティ対策**
   - HTTPS必須
   - API Keyのハッシュ化保存
   - レート制限（アップロード: 10回/時間）
   - ファイルサイズ制限
   - ファイルタイプ検証
   - API Keyの有効期限設定（推奨）

**実装例**:

```typescript
// アップロードエンドポイント
POST /v1/extensions
Headers:
  X-API-Key: lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Body:
  - foxe: <file>
  - metadata: <JSON>
```

**使用例（CLIツール）**:

```bash
# 環境変数でAPI Keyを設定
export LICHTBLICK_API_KEY="lk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# アップロード
curl -X POST https://api.lichtblick.example.com/v1/extensions \
  -H "X-API-Key: $LICHTBLICK_API_KEY" \
  -F "foxe=@extension.foxe" \
  -F 'metadata={"id":"my.extension","name":"My Extension",...}'
```

**API Key管理**:

- サーバー管理者がAPI Keyを生成・管理
- 管理用Web UIまたはCLIツールでAPI Keyを発行
- 必要に応じてAPI Keyを無効化・削除

**詳細な設定方法**: 上記の「[API Keyの取得・設定方法](#api-keyの取得設定方法)」セクションを参照してください。

### Q3: ファイルストレージもEC2上にまとめて構築していますが、これで問題ないでしょうか？

**回答: ✅ 問題ありません**

**EC2上にまとめて構築することは推奨されます**

**メリット**:

1. **ネットワークレイテンシが最小**: データベース、アプリケーション、ファイルストレージが同じインスタンス内にあるため、アクセスが高速
2. **運用コストが低い**: 追加のストレージサービス（S3等）が不要
3. **シンプルな構成**: 管理が容易
4. **ファイルアクセスが高速**: ローカルファイルシステムへのアクセス

**注意点と対策**:

1. **ディスク容量の確保**

   - 初期容量: 100GB以上を推奨
   - 自動拡張機能を有効化（最大500GBなど）
   - 定期的な容量監視

2. **バックアップ戦略**

   - 日次バックアップ（pg_dump + ファイル同期）
   - S3への自動アップロード
   - 保持期間: 30日

3. **パフォーマンス**

   - gp3（SSD）ストレージタイプを使用
   - 大量のファイルアクセス時のI/O最適化
   - 必要に応じてインスタンスタイプをアップグレード

4. **スケーラビリティ**
   - ファイル数が増加した場合の容量拡張計画
   - 将来的にS3への移行も検討可能

**推奨構成**:

```
EC2インスタンス（t3.large以上）
├── アプリケーションサーバー（Node.js/Rust）
├── PostgreSQL データベース
└── ファイルストレージ（/opt/lichtblick-server/assets）
    ├── extensions/     # .foxeファイル
    ├── layouts/        # JSONファイル
    ├── urdf-models/    # .urdf + メッシュファイル
    └── sample-data/   # .mcap, .bagファイル
```

**代替案**（将来的に必要になった場合）:

- **S3 + CloudFront**: 大規模なファイル配信が必要な場合
- **EBSボリュームの分離**: データベースとファイルストレージを別ボリュームに分離
- **EFS（Elastic File System）**: 複数インスタンス間でファイルを共有する場合

---

## 次のステップ

1. **技術スタックの最終決定**

   - Node.js vs Rust
   - フレームワークの選択

2. **詳細設計**

   - API仕様書の作成
   - データベーススキーマの詳細設計
   - 認証フローの詳細設計

3. **プロトタイプ開発**

   - 最小限の機能でプロトタイプを作成
   - 認証・アップロード機能の実装

4. **インフラ構築**

   - EC2インスタンスのセットアップ
   - データベースのセットアップ
   - CI/CDパイプラインの構築

5. **テスト・デプロイ**
   - 単体テスト・統合テスト
   - セキュリティテスト
   - 本番環境へのデプロイ

---

## 参考資料

- [既存サーバー実装](../server/)
- [データ構造ガイド](../archives/04_implementation/marketplace/data-structure-guide.md)
- [Extension/Layout仕様](../archives/04_implementation/marketplace/json-schema-v2.md)

---

**作成者**: AI Assistant
**レビュー**: 要レビュー
**承認**: 未承認
