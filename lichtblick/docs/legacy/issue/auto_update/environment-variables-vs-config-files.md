# 環境変数制御 vs configファイル制御 比較書

## 概要

自動更新機能の制御方法として、**環境変数制御**と**configファイル制御**の2つのアプローチを詳細に比較し、なぜ環境変数制御を採用すべきかを技術的根拠と共に説明します。

## 実装方法の比較

### 環境変数制御（現在の実装）

```typescript
// packages/suite-desktop/src/main/StudioAppUpdater.ts
public start(): void {
  const autoUpdateEnabled = process.env.AUTO_UPDATE_ENABLED === 'true';
  const updateServerUrl = process.env.UPDATE_SERVER_URL;
  const updateServerToken = process.env.UPDATE_SERVER_TOKEN;

  if (!autoUpdateEnabled) {
    log.info("Automatic updates disabled via environment variable");
    return;
  }

  if (updateServerUrl && updateServerToken) {
    autoUpdater.addAuthHeader(`Bearer ${updateServerToken}`);
  }

  // 既存ロジック継続
}
```

**設定方法**:

```bash
# .env ファイルまたは環境変数
AUTO_UPDATE_ENABLED=false
UPDATE_SERVER_URL=https://your-server.com
UPDATE_SERVER_TOKEN=your-secret-token
```

### configファイル制御（仮想的な実装）

```typescript
// config/update-config.json
{
  "autoUpdateEnabled": false,
  "updateServerUrl": "https://your-server.com",
  "updateServerToken": "your-secret-token",
  "environment": "development"
}

// packages/suite-desktop/src/main/StudioAppUpdater.ts
import * as fs from 'fs';
import * as path from 'path';

interface UpdateConfig {
  autoUpdateEnabled: boolean;
  updateServerUrl?: string;
  updateServerToken?: string;
  environment: string;
}

public start(): void {
  const configPath = path.join(__dirname, '../../../config/update-config.json');
  let config: UpdateConfig;

  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configData);
  } catch (error) {
    log.error("Failed to load update config:", error);
    return;
  }

  if (!config.autoUpdateEnabled) {
    log.info("Automatic updates disabled via config file");
    return;
  }

  if (config.updateServerUrl && config.updateServerToken) {
    autoUpdater.addAuthHeader(`Bearer ${config.updateServerToken}`);
  }

  // 既存ロジック継続
}
```

**設定方法**:

```json
{
  "autoUpdateEnabled": false,
  "updateServerUrl": "https://your-server.com",
  "updateServerToken": "your-secret-token"
}
```

## 詳細比較

### 1. セキュリティ

#### 環境変数制御 [✅ 高セキュリティ]

**メリット**:

- 秘密情報がソースコードに含まれない
- Gitリポジトリにコミットされない
- 実行時にのみメモリに存在
- プロセス終了時に自動削除

**セキュリティ対策**:

```bash
# 秘密情報の安全な管理
export UPDATE_SERVER_TOKEN="secret-token-123"
export AWS_SECRET_ACCESS_KEY="aws-secret-key-456"

# .env ファイルは .gitignore に追加
echo ".env" >> .gitignore
```

#### configファイル制御 [❌ セキュリティリスク]

**問題点**:

- 秘密情報がファイルに平文保存
- 間違ってGitにコミットするリスク
- 配布時に秘密情報が含まれる可能性
- ファイルシステムに永続化

**セキュリティ問題の例**:

```json
{
  "updateServerToken": "secret-token-123",
  "awsSecretAccessKey": "aws-secret-key-456"
}
```

↑ この情報がGitにコミットされる危険性

### 2. 環境別設定

#### 環境変数制御 [✅ 環境別設定が簡単]

**開発環境**:

```bash
export AUTO_UPDATE_ENABLED=false
export UPDATE_SERVER_URL=https://dev.example.com
export UPDATE_SERVER_TOKEN=dev-token-123
```

**ステージング環境**:

```bash
export AUTO_UPDATE_ENABLED=true
export UPDATE_SERVER_URL=https://staging.example.com
export UPDATE_SERVER_TOKEN=staging-token-456
```

**本番環境**:

```bash
export AUTO_UPDATE_ENABLED=true
export UPDATE_SERVER_URL=https://prod.example.com
export UPDATE_SERVER_TOKEN=prod-token-789
```

**メリット**:

- 同じバイナリで異なる環境に対応
- 環境変数のみで設定変更
- デプロイ時の設定ミスが少ない

#### configファイル制御 [❌ 環境別設定が複雑]

**必要な複数ファイル**:

```typescript
// config/dev.json
{
  "autoUpdateEnabled": false,
  "updateServerUrl": "https://dev.example.com",
  "updateServerToken": "dev-token-123"
}

// config/staging.json
{
  "autoUpdateEnabled": true,
  "updateServerUrl": "https://staging.example.com",
  "updateServerToken": "staging-token-456"
}

// config/prod.json
{
  "autoUpdateEnabled": true,
  "updateServerUrl": "https://prod.example.com",
  "updateServerToken": "prod-token-789"
}
```

**実装が複雑**:

```typescript
// 環境別にconfigファイルを切り替える必要
const configFile =
  process.env.NODE_ENV === "production"
    ? "prod.json"
    : process.env.NODE_ENV === "staging"
      ? "staging.json"
      : "dev.json";
const configPath = path.join(__dirname, `../../../config/${configFile}`);
```

**問題点**:

- 複数のconfigファイル管理が必要
- ビルド時に環境を決める必要
- 配布後の環境変更が困難
- 設定ファイルの同期が必要

### 3. 緊急時対応

#### 環境変数制御 [✅ 即座対応可能]

**緊急無効化**:

```bash
# 1. 環境変数を変更
export AUTO_UPDATE_ENABLED=false

# 2. アプリを再起動
pkill -f "lichtblick"
./lichtblick

# 所要時間: 1分以内
```

**段階的復旧**:

```bash
# 1. デバッグモードで確認
export AUTO_UPDATE_ENABLED=true
export AUTO_UPDATE_DEBUG=true

# 2. 問題なければ本格運用
export AUTO_UPDATE_DEBUG=false
```

#### configファイル制御 [❌ 時間がかかる]

**緊急無効化手順**:

```typescript
// 1. configファイルを編集
{
  "autoUpdateEnabled": false  // true から false に変更
}

// 2. アプリを再ビルド（必要に応じて）
npm run build:desktop

// 3. 配布・デプロイ
// 4. アプリ再起動

// 所要時間: 30分〜数時間
```

**問題点**:

- ファイル編集が必要
- 再ビルドが必要な場合がある
- 配布プロセスが必要
- 人的ミスが発生しやすい

### 4. CI/CD統合

#### 環境変数制御 [✅ 自動化対応]

**GitHub Actions例**:

```yaml
name: Deploy Application

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        env:
          AUTO_UPDATE_ENABLED: false
          UPDATE_SERVER_URL: ${{ secrets.STAGING_SERVER_URL }}
          UPDATE_SERVER_TOKEN: ${{ secrets.STAGING_TOKEN }}
        run: |
          ./deploy.sh staging

  deploy-production:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        env:
          AUTO_UPDATE_ENABLED: true
          UPDATE_SERVER_URL: ${{ secrets.PROD_SERVER_URL }}
          UPDATE_SERVER_TOKEN: ${{ secrets.PROD_TOKEN }}
        run: |
          ./deploy.sh production
```

**Docker対応**:

```dockerfile
# Dockerfile
FROM node:18
COPY . /app
WORKDIR /app
RUN npm run build
CMD ["npm", "start"]

# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    environment:
      - AUTO_UPDATE_ENABLED=true
      - UPDATE_SERVER_URL=${UPDATE_SERVER_URL}
      - UPDATE_SERVER_TOKEN=${UPDATE_SERVER_TOKEN}
```

**メリット**:

- GitHub Secretsで秘密情報を安全管理
- 環境別デプロイが自動化
- 同じDockerイメージで複数環境対応

#### configファイル制御 [❌ 手動作業が必要]

**問題のあるアプローチ**:

```yaml
# 秘密情報をconfigファイルに保存する必要
# GitHub Secretsを効果的に使用できない
jobs:
  deploy:
    steps:
      - name: Create config file
        run: |
          echo '{"autoUpdateEnabled": true, "updateServerToken": "${{ secrets.TOKEN }}"}' > config/prod.json
      - name: Deploy
        run: ./deploy.sh
```

**問題点**:

- 秘密情報がファイルに一時的に保存される
- 環境別にconfigファイルを動的生成する必要
- 複雑なデプロイスクリプトが必要
- 設定ミスが発生しやすい

### 5. 開発者体験

#### 環境変数制御 [✅ 簡単設定]

**セットアップ**:

```bash
# 1. .env ファイルを作成
cat > .env << EOF
AUTO_UPDATE_ENABLED=false
UPDATE_SERVER_URL=http://localhost:3000
UPDATE_SERVER_TOKEN=dev-token
EOF

# 2. 開発開始
npm run dev
```

**チーム共有**:

```bash
# .env.example を作成してチームで共有
AUTO_UPDATE_ENABLED=false
UPDATE_SERVER_URL=https://dev.example.com
UPDATE_SERVER_TOKEN=your-dev-token-here
```

**メリット**:

- 設定が1ファイルで完結
- 環境変数の上書きが簡単
- プロジェクトルートで設定完了

#### configファイル制御 [❌ 設定が複雑]

**セットアップ**:

```typescript
// 1. configディレクトリを作成
mkdir config

// 2. 環境別configファイルを作成
// config/local.json
{
  "autoUpdateEnabled": false,
  "updateServerUrl": "http://localhost:3000",
  "updateServerToken": "dev-token"
}

// 3. .gitignoreに追加
echo "config/local.json" >> .gitignore

// 4. 開発者用の設定を個別に作成
// config/developer1.json
// config/developer2.json
```

**問題点**:

- 複数ファイルの管理が必要
- 開発者ごとに設定ファイルを作成
- .gitignoreの設定が複雑
- 設定の同期が困難

### 6. 実装コスト

#### 環境変数制御 [✅ 低コスト]

**実装時間**: 30分
**追加ファイル**: 0個
**必要な変更**:

```typescript
// 3行の変更のみ
const autoUpdateEnabled = process.env.AUTO_UPDATE_ENABLED === "true";
const updateServerUrl = process.env.UPDATE_SERVER_URL;
const updateServerToken = process.env.UPDATE_SERVER_TOKEN;
```

**テストケース**:

```typescript
// 簡単なテスト
describe("StudioAppUpdater", () => {
  it("should be disabled when AUTO_UPDATE_ENABLED is false", () => {
    process.env.AUTO_UPDATE_ENABLED = "false";
    const updater = new StudioAppUpdater();
    updater.start();
    expect(updater.isStarted()).toBe(false);
  });
});
```

#### configファイル制御 [❌ 高コスト]

**実装時間**: 2-3時間
**追加ファイル**:

- 複数のconfigファイル（環境別）
- 型定義ファイル
- 設定読み込みロジック

**必要な変更**:

```typescript
// 大幅な変更が必要
interface UpdateConfig {
  autoUpdateEnabled: boolean;
  updateServerUrl?: string;
  updateServerToken?: string;
  environment: string;
}

class ConfigManager {
  private config: UpdateConfig;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    // configファイル読み込みロジック
    // エラーハンドリング
    // 環境別設定の切り替え
  }

  public getConfig(): UpdateConfig {
    return this.config;
  }
}
```

**テストケース**:

```typescript
// 複雑なテスト
describe("ConfigManager", () => {
  it("should load dev config in development", () => {
    // dev.json の作成
    // 環境変数の設定
    // config読み込みテスト
  });

  it("should load prod config in production", () => {
    // prod.json の作成
    // 環境変数の設定
    // config読み込みテスト
  });

  it("should handle missing config file", () => {
    // エラーハンドリングテスト
  });
});
```

## 運用面での比較

### 監視・ログ

#### 環境変数制御

```typescript
// 設定状況の確認が簡単
log.info(`AUTO_UPDATE_ENABLED: ${process.env.AUTO_UPDATE_ENABLED}`);
log.info(`UPDATE_SERVER_URL: ${process.env.UPDATE_SERVER_URL ? "SET" : "NOT_SET"}`);
log.info(`UPDATE_SERVER_TOKEN: ${process.env.UPDATE_SERVER_TOKEN ? "SET" : "NOT_SET"}`);
```

#### configファイル制御

```typescript
// configファイルの存在確認、読み込み状況確認が必要
log.info(`Config file exists: ${fs.existsSync(configPath)}`);
log.info(`Config loaded: ${config ? "YES" : "NO"}`);
log.info(`Config valid: ${this.validateConfig(config)}`);
```

### バックアップ・復旧

#### 環境変数制御

```bash
# 設定のバックアップ
env | grep -E "(AUTO_UPDATE|UPDATE_SERVER)" > backup.env

# 復旧
source backup.env
```

#### configファイル制御

```bash
# 設定のバックアップ
cp config/prod.json config/prod.json.backup

# 復旧
cp config/prod.json.backup config/prod.json
```

## 結論

### 環境変数制御を推奨する理由

1. **セキュリティ**: 秘密情報がソースコードに含まれない
2. **運用性**: 環境別設定が簡単で自動化対応
3. **緊急対応**: 即座に無効化・復旧が可能
4. **CI/CD統合**: GitHub Actions、Dockerとの親和性
5. **開発者体験**: 設定が簡単で学習コストが低い
6. **実装コスト**: 最小限の変更で実現可能
7. **保守性**: 管理するファイルが少ない
8. **標準化**: 業界標準のアプローチ

### configファイル制御が適している場合

**限定的な用途**:

- 複雑な設定構造が必要
- 設定のバリデーション機能が必要
- GUIでの設定変更機能が必要
- 設定の履歴管理が必要

**ただし**、自動更新機能においては、これらの要件は不要であり、環境変数制御で十分です。

## 実装推奨事項

### 現在の実装（環境変数制御）を継続

```typescript
// packages/suite-desktop/src/main/StudioAppUpdater.ts
public start(): void {
  const autoUpdateEnabled = process.env.AUTO_UPDATE_ENABLED === 'true';
  const updateServerUrl = process.env.UPDATE_SERVER_URL;
  const updateServerToken = process.env.UPDATE_SERVER_TOKEN;

  if (!autoUpdateEnabled) {
    log.info("Automatic updates disabled via environment variable (AUTO_UPDATE_ENABLED=false)");
    return;
  }

  // 更新サーバーの設定確認（HTTPサーバー対応）
  if (updateServerUrl && updateServerToken) {
    autoUpdater.addAuthHeader(`Bearer ${updateServerToken}`);
  }

  // 既存ロジック継続
  if (this.#started) {
    log.info(`StudioAppUpdater already running`);
    return;
  }
  this.#started = true;

  log.info(`Starting update loop`);
  setTimeout(() => {
    void this.#maybeCheckForUpdates();
  }, this.#initialUpdateDelaySec * 1000);
}
```

### 環境変数の管理

```bash
# .env.example（チーム共有用）
AUTO_UPDATE_ENABLED=false
UPDATE_SERVER_URL=https://your-server.com
UPDATE_SERVER_TOKEN=your-secret-token

# AWS S3使用時
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

この実装により、セキュアで運用しやすい自動更新機能を実現できます。
