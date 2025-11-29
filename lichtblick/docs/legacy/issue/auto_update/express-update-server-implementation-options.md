# Express.js 自動更新サーバー実装選択肢

## 概要

Express.jsを使用した独自HTTPサーバーによる自動更新機能の実装について、現在行うべき実装の選択肢を段階的に提案します。

## 実装アプローチ選択肢

### 選択肢 1: 最小実装 [今すぐ実装] [推奨]

#### 目的

- 動作確認とプロトタイプ作成
- 基本的な更新機能の実装
- 開発環境でのテスト

#### 実装内容

```javascript
// minimal-update-server.js
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// 最低限の認証（開発用）
const simpleAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.UPDATE_TOKEN || "dev-token"}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// CORS設定
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  next();
});

// ヘルスチェック
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// 更新メタデータ配信
app.get("/latest.yml", simpleAuth, (req, res) => {
  const latestPath = path.join(__dirname, "releases", "latest.yml");
  if (fs.existsSync(latestPath)) {
    res.setHeader("Content-Type", "application/x-yaml");
    res.sendFile(latestPath);
  } else {
    res.status(404).json({ error: "Update metadata not found" });
  }
});

// ファイル配信
app.use("/releases", simpleAuth, express.static("releases"));

// 基本的なエラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Minimal update server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
```

#### 開発時間

- **実装**: 半日
- **テスト**: 1日
- **合計**: 1-2日

#### メリット

- ✅ すぐに動作確認可能
- ✅ 学習コストが低い
- ✅ 基本機能の理解

#### デメリット

- ❌ セキュリティが弱い
- ❌ 本番運用には不適切
- ❌ エラーハンドリングが最小限

---

### 選択肢 2: 本格実装 [2-3週間後実装]

#### 目的

- 本番環境での運用準備
- セキュリティ強化
- 運用監視機能

#### 実装内容

```javascript
// production-update-server.js
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const cors = require("cors");
const winston = require("winston");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ログ設定
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console(),
  ],
});

// セキュリティミドルウェア
app.use(
  helmet({
    contentSecurityPolicy: false, // ファイル配信のため
    crossOriginEmbedderPolicy: false,
  }),
);

// 圧縮
app.use(compression());

// CORS設定
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  }),
);

// Rate limiting
const updateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 50, // 最大50リクエスト
  message: "Too many update requests, please try again later",
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 10, // 最大10ダウンロード
  message: "Too many download requests, please try again later",
});

// 認証ミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn("Authentication failed: No token provided", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    return res.status(401).json({ error: "Access token required" });
  }

  if (token !== process.env.UPDATE_TOKEN) {
    logger.warn("Authentication failed: Invalid token", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    return res.status(403).json({ error: "Invalid access token" });
  }

  logger.info("Authentication successful", {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
};

// リクエストロギング
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// ヘルスチェック
app.get("/health", (req, res) => {
  const healthData = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.SERVER_VERSION || "1.0.0",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  res.json(healthData);
});

// メトリクス（簡易版）
let downloadCount = 0;
let updateCheckCount = 0;

app.get("/metrics", authenticateToken, (req, res) => {
  res.json({
    downloadCount,
    updateCheckCount,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// 更新メタデータ配信
app.get("/latest.yml", authenticateToken, updateLimiter, (req, res) => {
  updateCheckCount++;

  const latestPath = path.join(__dirname, "releases", "latest.yml");

  if (!fs.existsSync(latestPath)) {
    logger.error("Update metadata not found", { path: latestPath });
    return res.status(404).json({ error: "Update metadata not found" });
  }

  try {
    const stats = fs.statSync(latestPath);

    res.setHeader("Content-Type", "application/x-yaml");
    res.setHeader("Content-Length", stats.size);
    res.setHeader("Last-Modified", stats.mtime.toUTCString());
    res.setHeader("ETag", `"${stats.mtime.getTime()}-${stats.size}"`);

    logger.info("Update metadata served", {
      fileSize: stats.size,
      lastModified: stats.mtime,
    });

    res.sendFile(latestPath);
  } catch (error) {
    logger.error("Error serving update metadata", { error: error.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

// ファイル配信（Range Request対応）
app.use(
  "/releases",
  authenticateToken,
  downloadLimiter,
  (req, res, next) => {
    downloadCount++;

    const originalSend = res.sendFile;
    res.sendFile = function (path, options, callback) {
      logger.info("File download started", {
        file: path.split("/").pop(),
        ip: req.ip,
      });

      return originalSend.call(this, path, options, callback);
    };

    next();
  },
  express.static("releases", {
    setHeaders: (res, path) => {
      if (path.endsWith(".yml")) {
        res.setHeader("Content-Type", "application/x-yaml");
      } else {
        res.setHeader("Content-Type", "application/octet-stream");
      }
    },
  }),
);

// エラーハンドリング
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({ error: "Internal server error" });
});

// 404ハンドリング
app.use((req, res) => {
  logger.warn("404 Not Found", {
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({ error: "Not found" });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`Production update server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || "development",
    version: process.env.SERVER_VERSION || "1.0.0",
  });
});
```

#### 開発時間

- **実装**: 1-2週間
- **テスト**: 1週間
- **合計**: 2-3週間

#### メリット

- ✅ 本番運用対応
- ✅ セキュリティ強化
- ✅ 詳細なロギング
- ✅ 監視機能

#### デメリット

- ❌ 複雑性増加
- ❌ 依存関係増加
- ❌ 運用コスト増加

---

### 選択肢 3: 段階的実装 [推奨アプローチ]

#### フェーズ1: 基本実装（今週）

```javascript
// 最小実装から開始
// - 基本的な認証
// - シンプルなファイル配信
// - 最低限のエラーハンドリング
```

#### フェーズ2: セキュリティ強化（2週間後）

```javascript
// セキュリティ機能追加
// - Rate limiting
// - 詳細なログ
// - ヘルスチェック
```

#### フェーズ3: 運用機能（1ヶ月後）

```javascript
// 運用機能追加
// - メトリクス収集
// - 監視機能
// - パフォーマンス最適化
```

#### メリット

- ✅ リスク最小化
- ✅ 段階的学習
- ✅ 早期フィードバック

---

## 認証方式選択肢

### Bearer Token [推奨 - 最小実装]

```javascript
const simpleAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token !== process.env.UPDATE_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};
```

### API Key [シンプル]

```javascript
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  next();
};
```

### JWT [高度な制御]

```javascript
const jwt = require("jsonwebtoken");

const jwtAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
};
```

## StudioAppUpdater側の修正

### 基本設定

```typescript
// packages/suite-desktop/src/main/StudioAppUpdater.ts
public start(): void {
  const httpUpdateEnabled = process.env.HTTP_UPDATE_ENABLED === 'true';
  const serverUrl = process.env.UPDATE_SERVER_URL;
  const authToken = process.env.UPDATE_SERVER_TOKEN;

  if (!httpUpdateEnabled) {
    log.info("HTTP update server disabled");
    return;
  }

  if (!serverUrl) {
    log.error("UPDATE_SERVER_URL not configured");
    return;
  }

  if (!authToken) {
    log.error("UPDATE_SERVER_TOKEN not configured");
    return;
  }

  // 認証ヘッダー設定
  autoUpdater.addAuthHeader(`Bearer ${authToken}`);

  // 既存のロジック
  if (this.#started) {
    log.info(`StudioAppUpdater already running`);
    return;
  }
  this.#started = true;

  log.info(`Starting update loop with HTTP server: ${serverUrl}`);
  setTimeout(() => {
    void this.#maybeCheckForUpdates();
  }, this.#initialUpdateDelaySec * 1000);
}
```

### electron-builder設定

```json
{
  "publish": {
    "provider": "generic",
    "url": "https://your-domain.com/",
    "channel": "latest"
  }
}
```

## 環境変数設定

### 開発環境

```bash
# .env.development
HTTP_UPDATE_ENABLED=true
UPDATE_SERVER_URL=http://localhost:3000
UPDATE_SERVER_TOKEN=dev-token-123
NODE_ENV=development
```

### 本番環境

```bash
# .env.production
HTTP_UPDATE_ENABLED=true
UPDATE_SERVER_URL=https://updates.your-domain.com
UPDATE_SERVER_TOKEN=prod-secure-token-456
NODE_ENV=production
```

## 推奨実装スケジュール

| フェーズ  | 期間    | 作業内容                     |
| --------- | ------- | ---------------------------- |
| フェーズ1 | 2-3日   | 最小実装・基本テスト         |
| フェーズ2 | 1週間   | セキュリティ強化・統合テスト |
| フェーズ3 | 1-2週間 | 本番環境準備・デプロイ       |

## まとめ

Express.jsでの実装は**選択肢3（段階的実装）**を推奨します。

1. **最小実装**で動作確認
2. **セキュリティ強化**で本番準備
3. **運用機能**で監視・保守

これにより、リスクを最小化しながら確実に実装を進められます。
