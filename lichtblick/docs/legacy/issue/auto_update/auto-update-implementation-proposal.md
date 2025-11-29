# 自動更新機能実装提案書

## 概要

フォークしたLichtblickプロジェクトにおける自動更新機能の実装について、**Amazon S3**と**Generic HTTP Server**の2つの選択肢を比較検討し、実装手順を提案します。

## 実装選択肢の比較

### 1. Amazon S3 [推奨]

#### メリット

- **簡単セットアップ**: electron-builderの標準サポート
- **高可用性**: 99.999999999%の耐久性
- **スケーラビリティ**: 自動スケーリング
- **CDN統合**: CloudFrontとの連携でグローバル配信
- **細かいアクセス制御**: IAMによる権限管理
- **マネージドサービス**: サーバー管理不要

#### デメリット

- **AWS知識必要**: 設定にAWSの理解が必要
- **ベンダーロックイン**: AWS依存

#### コスト

**安い** - 月額数千円程度（使用量に応じた従量課金）

### 2. Generic HTTP Server

#### メリット

- **完全制御**: 独自認証・カスタムロジック実装可能
- **既存インフラ活用**: 自社サーバーの活用
- **ベンダー非依存**: 特定クラウドに依存しない
- **細かいカスタマイズ**: 更新プロセスの完全制御

#### デメリット

- **サーバー管理**: 可用性・セキュリティの責任
- **開発コスト**: 独自実装が必要
- **スケーラビリティ**: 手動でのスケーリング

#### コスト

**高い** - サーバー運用費 + 開発・保守コスト

## 実装手順

### Amazon S3実装手順

#### 1. AWS環境準備

```bash
# AWS CLIのインストール・設定
aws configure
```

#### 2. S3バケット作成

```bash
# バケット作成
aws s3 mb s3://your-app-updates-bucket --region us-east-1

# バケットポリシー設定（パブリック読み取り）
aws s3api put-bucket-policy --bucket your-app-updates-bucket --policy file://bucket-policy.json
```

#### 3. IAMユーザー作成

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:PutObjectAcl"],
      "Resource": "arn:aws:s3:::your-app-updates-bucket/*"
    }
  ]
}
```

#### 4. electron-builder設定

```json
{
  "publish": {
    "provider": "s3",
    "bucket": "your-app-updates-bucket",
    "region": "us-east-1",
    "path": "releases/"
  }
}
```

#### 5. 環境変数設定

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
```

#### 6. StudioAppUpdater修正

```typescript
// packages/suite-desktop/src/main/StudioAppUpdater.ts
public start(): void {
  // コメントアウトされた自動更新無効化を削除
  // log.info("Automatic updates disabled (forked project)");
  // return;

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

#### 7. ビルド・デプロイ

```bash
# ビルド・パブリッシュ
npm run build:desktop
npx electron-builder --publish always
```

### Generic HTTP Server実装手順

#### 1. 更新サーバー構築

```javascript
// update-server.js
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Basic認証ミドルウェア
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !validateAuth(authHeader)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

// 更新ファイル配信
app.use("/releases", auth, express.static("releases"));

// メタデータ配信
app.get("/latest.yml", auth, (req, res) => {
  const latestPath = path.join(__dirname, "releases", "latest.yml");
  if (fs.existsSync(latestPath)) {
    res.sendFile(latestPath);
  } else {
    res.status(404).send("Not found");
  }
});

app.listen(PORT, () => {
  console.log(`Update server running on port ${PORT}`);
});
```

#### 2. electron-builder設定

```json
{
  "publish": {
    "provider": "generic",
    "url": "https://your-domain.com/updates/",
    "channel": "latest"
  }
}
```

#### 3. 認証ヘッダー設定

```typescript
// packages/suite-desktop/src/main/StudioAppUpdater.ts
import { autoUpdater } from "electron-updater";

// 認証ヘッダーの追加
autoUpdater.addAuthHeader(`Bearer ${process.env.UPDATE_TOKEN}`);
```

#### 4. 手動アップロード

```bash
# ビルド
npm run build:desktop
npx electron-builder

# 手動でサーバーにアップロード
scp dist/*.* your-server:/path/to/releases/
```

## 推奨決定

### 推奨: Amazon S3

**理由:**

1. **実装の簡単さ**: electron-builderの標準サポートで設定が容易
2. **運用コスト**: サーバー管理不要でトータルコストが低い
3. **信頼性**: AWSの高い可用性とセキュリティ
4. **スケーラビリティ**: 自動スケーリングで将来の成長に対応
5. **開発効率**: 短期間での実装が可能

## セキュリティ考慮事項

1. **コード署名**: macOS/Windows向けの適切な証明書取得
2. **HTTPS通信**: 更新ファイルの暗号化通信
3. **アクセス制御**: IAMによる最小権限の原則
4. **バージョン検証**: 更新ファイルの整合性チェック

## まとめ

プライベートリポジトリでの自動更新機能実装において、**Amazon S3**を推奨します。実装の簡単さ、運用コストの低さ、信頼性の高さから、最も適切な選択肢と判断されます。

Generic HTTP Serverは完全な制御が必要な特殊要件がある場合の選択肢として位置づけられます。
