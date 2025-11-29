# Sora サーバー Hono実装 詳細設計書

## 1. Hono採用理由と技術仕様

### 1.1 Express.jsからHonoへの移行理由

| 項目               | Express.js   | Hono     | 改善効果           |
| ------------------ | ------------ | -------- | ------------------ |
| **パフォーマンス** | 基準値       | 4x高速   | レスポンス時間短縮 |
| **メモリ使用量**   | 基準値       | 50%削減  | インフラコスト削減 |
| **Bundle Size**    | ~150KB       | ~20KB    | 起動時間短縮       |
| **型安全性**       | 追加設定必要 | Built-in | 開発効率向上       |
| **Edge対応**       | 制限あり     | Native   | デプロイ選択肢拡大 |

### 1.2 Honoの技術特徴

```typescript
// Honoの基本構造
import { Hono } from "hono";
import type { Context } from "hono";

// 型安全なアプリケーション定義
type AppBindings = {
  DATABASE_URL: string;
  S3_BUCKET: string;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: AppBindings }>();

// 完全な型推論
app.get("/api/extensions/:id", (c) => {
  const id = c.req.param("id"); // string型で推論
  const env = c.env; // AppBindings型で推論
  return c.json({ id, bucket: env.S3_BUCKET });
});
```

## 2. File Server実装 (Hono)

### 2.1 基本アーキテクチャ

```typescript
// file-server/src/app.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { rateLimiter } from "hono/rate-limiter";
import { compress } from "hono/compress";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type Bindings = {
  S3_BUCKET: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  ALLOWED_ORIGINS: string;
  IP_SALT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// S3クライアント初期化
const createS3Client = (env: Bindings) =>
  new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

// グローバルミドルウェア
app.use("*", logger());
app.use("*", compress());
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowedOrigins = c.env.ALLOWED_ORIGINS.split(",");
      return allowedOrigins.includes(origin || "") || origin === undefined;
    },
    credentials: false,
  }),
);

// API レート制限
app.use(
  "/api/*",
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15分
    limit: 100, // IPあたり100リクエスト
    message: "Too many requests from this IP",
  }),
);

// ヘルスチェック
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "file-server",
  });
});
```

### 2.2 拡張機能配信API

```typescript
// 拡張機能一覧取得
app.get("/api/extensions", async (c) => {
  try {
    const s3 = createS3Client(c.env);
    const catalog = await getCatalogFromS3(s3, c.env.S3_BUCKET, "extensions/catalog.json");

    // CDNキャッシュヘッダー設定
    c.header("Cache-Control", "public, max-age=300"); // 5分キャッシュ
    c.header("ETag", `"${await generateETag(catalog)}"`);

    return c.json(catalog);
  } catch (error) {
    console.error("Failed to fetch extensions catalog:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// 拡張機能ダウンロード
app.get("/api/extensions/:baseId/:version/download", async (c) => {
  try {
    const baseId = c.req.param("baseId");
    const version = c.req.param("version");

    // パス検証
    if (!isValidExtensionPath(baseId, version)) {
      return c.json({ error: "Invalid path" }, 400);
    }

    const s3 = createS3Client(c.env);
    const key = `extensions/${baseId}/${version}/${baseId}-${version}.foxe`;

    // S3署名付きURL生成
    const command = new GetObjectCommand({
      Bucket: c.env.S3_BUCKET,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    // ダウンロード追跡
    await trackDownload(baseId, version, getClientIP(c), c.env.IP_SALT);

    return c.redirect(signedUrl);
  } catch (error) {
    console.error("Download error:", error);
    return c.json({ error: "Download failed" }, 500);
  }
});

// レイアウト配信API (同様の構造)
app.get("/api/layouts", async (c) => {
  try {
    const { tag, search, limit = "50" } = c.req.query();

    const s3 = createS3Client(c.env);
    let catalog = await getCatalogFromS3(s3, c.env.S3_BUCKET, "layouts/catalog.json");

    // フィルタリング
    if (tag) {
      catalog = filterByTag(catalog, tag);
    }

    if (search) {
      catalog = searchLayouts(catalog, search);
    }

    // 制限
    catalog = limitResults(catalog, parseInt(limit));

    c.header("Cache-Control", "public, max-age=300");
    return c.json(catalog);
  } catch (error) {
    console.error("Failed to fetch layouts:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/api/layouts/:baseId/:version/download", async (c) => {
  try {
    const baseId = c.req.param("baseId");
    const version = c.req.param("version");

    if (!isValidLayoutPath(baseId, version)) {
      return c.json({ error: "Invalid path" }, 400);
    }

    const s3 = createS3Client(c.env);
    const key = `layouts/${baseId}/${version}/${baseId}-${version}.json`;

    const command = new GetObjectCommand({
      Bucket: c.env.S3_BUCKET,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    await trackDownload(baseId, version, getClientIP(c), c.env.IP_SALT);
    return c.redirect(signedUrl);
  } catch (error) {
    console.error("Layout download error:", error);
    return c.json({ error: "Download failed" }, 500);
  }
});

export default app;
```

### 2.3 ヘルパー関数

```typescript
// utils/s3.ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export async function getCatalogFromS3(s3: S3Client, bucket: string, key: string): Promise<any> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3.send(command);
  const body = await response.Body?.transformToString();

  if (!body) {
    throw new Error(`Failed to read S3 object: ${key}`);
  }

  return JSON.parse(body);
}

// utils/validation.ts
export function isValidExtensionPath(baseId: string, version: string): boolean {
  const baseIdRegex = /^[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_.]+$/;
  const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9\-_.]+)?$/;

  return baseIdRegex.test(baseId) && versionRegex.test(version);
}

export function isValidLayoutPath(baseId: string, version: string): boolean {
  return isValidExtensionPath(baseId, version); // 同じ形式
}

// utils/tracking.ts
import { createHash } from "crypto";

export async function trackDownload(
  baseId: string,
  version: string,
  ip: string,
  salt: string,
): Promise<void> {
  const logEntry = {
    baseId,
    version,
    timestamp: new Date().toISOString(),
    ip: hashIP(ip, salt),
  };

  console.log("Download:", JSON.stringify(logEntry));
  // TODO: 将来的にはメトリクス収集サービスに送信
}

function hashIP(ip: string, salt: string): string {
  return createHash("sha256")
    .update(ip + salt)
    .digest("hex");
}

// utils/client.ts
import type { Context } from "hono";

export function getClientIP(c: Context): string {
  // Cloudflare経由の場合
  const cfIP = c.req.header("CF-Connecting-IP");
  if (cfIP) return cfIP;

  // ロードバランサー経由の場合
  const xForwardedFor = c.req.header("X-Forwarded-For");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "";
  }

  // 直接接続の場合
  return c.req.header("X-Real-IP") || "unknown";
}

// utils/etag.ts
export async function generateETag(data: any): Promise<string> {
  const content = JSON.stringify(data);
  const hash = createHash("md5").update(content).digest("hex");
  return hash.substring(0, 16);
}
```

## 3. Feedback API実装 (Hono)

### 3.1 基本構造

```typescript
// feedback-api/src/app.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { rateLimiter } from "hono/rate-limiter";
import { Database } from "bun:sqlite";
import { validator } from "hono/validator";
import type { Context } from "hono";

type Bindings = {
  DATABASE_PATH: string;
  ENCRYPTION_KEY: string;
  IP_SALT: string;
};

type FeedbackRequest = {
  fingerprint: MCAPFingerprint;
  configuration: PlaybackConfiguration;
  result: PlaybackResult;
  platform: "web" | "desktop";
  soraVersion: string;
  sessionId: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// データベース接続
let db: Database | null = null;

const initDatabase = (dbPath: string) => {
  if (!db) {
    db = new Database(dbPath);

    // テーブル作成
    db.exec(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id TEXT PRIMARY KEY,
        fingerprint_hash TEXT NOT NULL,
        configuration_json TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        error_count INTEGER NOT NULL,
        performance_score REAL NOT NULL,
        platform TEXT NOT NULL,
        sora_version TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_feedbacks_fingerprint_success
      ON feedbacks(fingerprint_hash, success);

      CREATE TABLE IF NOT EXISTS recommendations (
        fingerprint_hash TEXT PRIMARY KEY,
        recommended_config TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        usage_count INTEGER DEFAULT 0,
        success_rate REAL NOT NULL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  return db;
};

// ミドルウェア
app.use("*", logger());
app.use("*", cors());

// 厳格なレート制限
app.use(
  "/api/feedback",
  rateLimiter({
    windowMs: 60 * 1000, // 1分
    limit: 10, // 1分間に10件まで
    message: "Rate limit exceeded for feedback submission",
  }),
);

app.use(
  "/api/recommendations/*",
  rateLimiter({
    windowMs: 60 * 1000, // 1分
    limit: 30, // 1分間に30件まで
    message: "Rate limit exceeded for recommendations",
  }),
);

// ヘルスチェック
app.get("/health", (c) => {
  const database = initDatabase(c.env.DATABASE_PATH);
  const isDbConnected = database !== null;

  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "feedback-api",
    database: isDbConnected ? "connected" : "disconnected",
  });
});
```

### 3.2 フィードバック収集API

```typescript
// フィードバック受信エンドポイント
app.post(
  "/api/feedback",
  validator("json", (value, c) => {
    const validationResult = validateFeedback(value);
    if (!validationResult.valid) {
      return c.json(
        {
          error: "Invalid feedback data",
          details: validationResult.errors,
        },
        400,
      );
    }
    return value as FeedbackRequest;
  }),
  async (c) => {
    try {
      const feedback = c.req.valid("json");
      const database = initDatabase(c.env.DATABASE_PATH);

      // データ匿名化・サニタイズ
      const sanitizedFeedback = sanitizeFeedback(feedback);

      // フィンガープリントハッシュ化
      const fingerprintHash = hashFingerprint(sanitizedFeedback.fingerprint);

      // パフォーマンススコア計算
      const performanceScore = calculatePerformanceScore(sanitizedFeedback.result);

      // データベース保存
      const feedbackId = crypto.randomUUID();
      await saveFeedback(database, {
        id: feedbackId,
        fingerprintHash,
        configuration: sanitizedFeedback.configuration,
        success: sanitizedFeedback.result.success,
        errorCount: sanitizedFeedback.result.totalErrors,
        performanceScore,
        platform: sanitizedFeedback.platform,
        soraVersion: sanitizedFeedback.soraVersion,
      });

      // 推奨データ更新（バックグラウンド）
      setTimeout(() => updateRecommendations(database, fingerprintHash), 0);

      return c.json({
        status: "accepted",
        id: sanitizedFeedback.sessionId,
      });
    } catch (error) {
      console.error("Feedback processing error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// 推奨取得エンドポイント
app.get("/api/recommendations/:fingerprintHash", async (c) => {
  try {
    const fingerprintHash = c.req.param("fingerprintHash");

    if (!isValidFingerprintHash(fingerprintHash)) {
      return c.json({ error: "Invalid fingerprint hash" }, 400);
    }

    const database = initDatabase(c.env.DATABASE_PATH);

    // 完全一致検索
    let recommendation = await getRecommendation(database, fingerprintHash);

    if (!recommendation) {
      // 類似パターン検索
      recommendation = await findSimilarRecommendation(database, fingerprintHash);
    }

    if (!recommendation) {
      // デフォルト推奨
      recommendation = getDefaultRecommendation();
    }

    // 使用回数カウント
    await incrementRecommendationUsage(database, fingerprintHash);

    // CDNキャッシュ設定
    c.header("Cache-Control", "public, max-age=3600"); // 1時間
    return c.json(recommendation);
  } catch (error) {
    console.error("Recommendation error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// 統計情報取得
app.get("/api/stats", async (c) => {
  try {
    const database = initDatabase(c.env.DATABASE_PATH);
    const stats = await generateStats(database);

    c.header("Cache-Control", "public, max-age=1800"); // 30分
    return c.json(stats);
  } catch (error) {
    console.error("Stats error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
```

### 3.3 データ処理関数

```typescript
// utils/feedback.ts
import type { Database } from "bun:sqlite";
import { createHash } from "crypto";

interface FeedbackData {
  id: string;
  fingerprintHash: string;
  configuration: any;
  success: boolean;
  errorCount: number;
  performanceScore: number;
  platform: string;
  soraVersion: string;
}

export function validateFeedback(feedback: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!feedback.fingerprint) {
    errors.push("Missing fingerprint");
  }

  if (!feedback.configuration) {
    errors.push("Missing configuration");
  }

  if (!feedback.result) {
    errors.push("Missing result");
  }

  if (typeof feedback.result?.success !== "boolean") {
    errors.push("Invalid result.success");
  }

  if (!feedback.soraVersion) {
    errors.push("Missing soraVersion");
  }

  if (!["web", "desktop"].includes(feedback.platform)) {
    errors.push("Invalid platform");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function sanitizeFeedback(feedback: FeedbackRequest) {
  return {
    fingerprint: {
      topicStructureHash: feedback.fingerprint.topicStructureHash,
      messageTypePattern: feedback.fingerprint.messageTypePattern,
      frequencyProfile: feedback.fingerprint.frequencyProfile,
      durationCategory: feedback.fingerprint.durationCategory,
      sizeCategory: feedback.fingerprint.sizeCategory,
      complexityScore: Math.min(100, Math.max(0, feedback.fingerprint.complexityScore)),
    },
    configuration: {
      extensions:
        feedback.configuration.extensions?.map((ext) => ({
          baseId: ext.baseId,
          version: ext.version,
          enabled: Boolean(ext.enabled),
        })) || [],
      layout: {
        baseId: feedback.configuration.layout?.baseId || "unknown",
        version: feedback.configuration.layout?.version || "1.0.0",
      },
    },
    result: {
      success: Boolean(feedback.result.success),
      totalErrors: Math.max(0, feedback.result.totalErrors || 0),
      totalWarnings: Math.max(0, feedback.result.totalWarnings || 0),
      playbackDuration: Math.max(0, feedback.result.playbackDuration || 0),
      performance: {
        averageFPS: Math.min(120, Math.max(0, feedback.result.performance?.averageFPS || 0)),
        peakMemoryMB: Math.max(0, feedback.result.performance?.peakMemoryMB || 0),
        averageCPUPercent: Math.min(
          100,
          Math.max(0, feedback.result.performance?.averageCPUPercent || 0),
        ),
        loadTimeMs: Math.max(0, feedback.result.performance?.loadTimeMs || 0),
      },
    },
    platform: feedback.platform,
    soraVersion: feedback.soraVersion.replace(/[^0-9.]/g, ""), // バージョン番号のみ
    sessionId: feedback.sessionId,
  };
}

export function hashFingerprint(fingerprint: any): string {
  const data = JSON.stringify(fingerprint, Object.keys(fingerprint).sort());
  return createHash("sha256").update(data).digest("hex");
}

export function calculatePerformanceScore(result: any): number {
  if (!result.success) return 0;

  const fps = result.performance.averageFPS || 0;
  const memory = result.performance.peakMemoryMB || 0;
  const cpu = result.performance.averageCPUPercent || 0;
  const loadTime = result.performance.loadTimeMs || 0;

  // 正規化スコア (0-1)
  const fpsScore = Math.min(fps / 60, 1);
  const memoryScore = Math.max(0, 1 - memory / 1000);
  const cpuScore = Math.max(0, 1 - cpu / 100);
  const loadTimeScore = Math.max(0, 1 - loadTime / 10000);

  return (fpsScore + memoryScore + cpuScore + loadTimeScore) / 4;
}

export async function saveFeedback(db: Database, feedback: FeedbackData): Promise<void> {
  const stmt = db.prepare(`
    INSERT INTO feedbacks (
      id, fingerprint_hash, configuration_json, success,
      error_count, performance_score, platform, sora_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    feedback.id,
    feedback.fingerprintHash,
    JSON.stringify(feedback.configuration),
    feedback.success,
    feedback.errorCount,
    feedback.performanceScore,
    feedback.platform,
    feedback.soraVersion,
  );
}

export async function getRecommendation(db: Database, fingerprintHash: string): Promise<any> {
  const stmt = db.prepare(`
    SELECT recommended_config, confidence_score, success_rate
    FROM recommendations
    WHERE fingerprint_hash = ?
  `);

  const result = stmt.get(fingerprintHash) as any;

  if (result) {
    return {
      configuration: JSON.parse(result.recommended_config),
      confidence: result.confidence_score,
      successRate: result.success_rate,
      source: "exact_match",
    };
  }

  return null;
}

export function isValidFingerprintHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

export function getDefaultRecommendation() {
  return {
    configuration: {
      extensions: [{ baseId: "sora.basic-viewer", version: "1.0.0", enabled: true }],
      layout: {
        baseId: "sora.default-layout",
        version: "1.0.0",
      },
    },
    confidence: 0.5,
    successRate: 0.8,
    source: "default",
  };
}
```

## 4. デプロイメント設定

### 4.1 Docker設定

```dockerfile
# file-server/Dockerfile
FROM oven/bun:1 as base
WORKDIR /app

# Dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Source code
COPY src ./src
COPY tsconfig.json ./

# Build
RUN bun build src/app.ts --outdir dist --target bun

# Production
FROM oven/bun:1-slim
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules

EXPOSE 3000
CMD ["bun", "dist/app.js"]
```

```dockerfile
# feedback-api/Dockerfile
FROM oven/bun:1 as base
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./

RUN bun build src/app.ts --outdir dist --target bun

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules

EXPOSE 3001
CMD ["bun", "dist/app.js"]
```

### 4.2 Docker Compose設定

```yaml
# docker-compose.yml
version: "3.8"

services:
  file-server:
    build: ./file-server
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - S3_BUCKET=${S3_BUCKET}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - IP_SALT=${IP_SALT}
    volumes:
      - ./data/cache:/app/cache
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  feedback-api:
    build: ./feedback-api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/feedback.db
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - IP_SALT=${IP_SALT}
    volumes:
      - ./data/database:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - file-server
      - feedback-api
    restart: unless-stopped

volumes:
  database:
  cache:
```

## 5. パフォーマンス最適化

### 5.1 Honoパフォーマンステクニック

```typescript
// 高速化テクニック
import { Hono } from "hono";
import { cache } from "hono/cache";
import { etag } from "hono/etag";

const app = new Hono();

// ETags for caching
app.use("/api/extensions", etag());

// Response caching
app.get(
  "/api/extensions",
  cache({
    cacheName: "extensions-cache",
    cacheControl: "max-age=300",
  }),
  async (c) => {
    // API implementation
  },
);

// Connection pooling for database
class DatabasePool {
  private pool: Database[] = [];
  private maxSize = 10;

  getConnection(): Database {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return new Database(process.env.DATABASE_PATH!);
  }

  releaseConnection(db: Database): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(db);
    }
  }
}

const dbPool = new DatabasePool();

// Use pooled connections
app.get("/api/stats", async (c) => {
  const db = dbPool.getConnection();
  try {
    const stats = await generateStats(db);
    return c.json(stats);
  } finally {
    dbPool.releaseConnection(db);
  }
});
```

### 5.2 メモリ効率化

```typescript
// Streaming for large responses
app.get("/api/large-data", async (c) => {
  return c.streamText(async (stream) => {
    const data = await getLargeDataset();

    for (const chunk of data) {
      await stream.write(JSON.stringify(chunk) + "\n");
    }
  });
});

// Memory-efficient JSON parsing
app.post("/api/upload", async (c) => {
  const stream = c.req.body;
  if (!stream) {
    return c.json({ error: "No body" }, 400);
  }

  // Process stream without loading everything into memory
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete JSON objects as they arrive
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line

      for (const line of lines) {
        if (line.trim()) {
          const data = JSON.parse(line);
          await processData(data);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return c.json({ status: "processed" });
});
```

## 6. 監視・観測性

### 6.1 メトリクス収集

```typescript
// metrics.ts
import { Hono } from "hono";

interface Metrics {
  requests: number;
  errors: number;
  responseTime: number[];
}

class MetricsCollector {
  private metrics: Metrics = {
    requests: 0,
    errors: 0,
    responseTime: [],
  };

  recordRequest(duration: number): void {
    this.metrics.requests++;
    this.metrics.responseTime.push(duration);

    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
    }
  }

  recordError(): void {
    this.metrics.errors++;
  }

  getMetrics() {
    const responseTime = this.metrics.responseTime;
    const avgResponseTime =
      responseTime.length > 0 ? responseTime.reduce((a, b) => a + b, 0) / responseTime.length : 0;

    return {
      totalRequests: this.metrics.requests,
      totalErrors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? this.metrics.errors / this.metrics.requests : 0,
      avgResponseTime,
      p95ResponseTime: this.calculatePercentile(responseTime, 95),
      p99ResponseTime: this.calculatePercentile(responseTime, 99),
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}

const metrics = new MetricsCollector();

// Metrics middleware
export const metricsMiddleware = () => {
  return async (c: Context, next: () => Promise<void>) => {
    const start = Date.now();

    try {
      await next();
    } catch (error) {
      metrics.recordError();
      throw error;
    } finally {
      const duration = Date.now() - start;
      metrics.recordRequest(duration);
    }
  };
};

// Metrics endpoint
export const metricsApp = new Hono();

metricsApp.get("/metrics", (c) => {
  return c.json(metrics.getMetrics());
});
```

### 6.2 ヘルスチェック強化

```typescript
// health.ts
import { Hono } from "hono";
import type { Database } from "bun:sqlite";

interface HealthCheck {
  name: string;
  status: "healthy" | "unhealthy";
  message?: string;
  responseTime?: number;
}

class HealthChecker {
  async checkDatabase(db: Database): Promise<HealthCheck> {
    const start = Date.now();

    try {
      const result = db.prepare("SELECT 1").get();
      const responseTime = Date.now() - start;

      return {
        name: "database",
        status: result ? "healthy" : "unhealthy",
        responseTime,
      };
    } catch (error) {
      return {
        name: "database",
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - start,
      };
    }
  }

  async checkS3(s3Client: any, bucket: string): Promise<HealthCheck> {
    const start = Date.now();

    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));

      return {
        name: "s3",
        status: "healthy",
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        name: "s3",
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - start,
      };
    }
  }

  async checkMemory(): Promise<HealthCheck> {
    const memoryUsage = process.memoryUsage();
    const usedMB = memoryUsage.heapUsed / 1024 / 1024;
    const maxMB = 512; // 512MB threshold

    return {
      name: "memory",
      status: usedMB < maxMB ? "healthy" : "unhealthy",
      message: `${usedMB.toFixed(2)}MB used`,
    };
  }
}

export const healthApp = new Hono();
const healthChecker = new HealthChecker();

healthApp.get("/health", async (c) => {
  const checks: HealthCheck[] = [];

  // Basic health check
  checks.push({
    name: "service",
    status: "healthy",
    message: "Service is running",
  });

  // Memory check
  checks.push(await healthChecker.checkMemory());

  const overallStatus = checks.every((check) => check.status === "healthy")
    ? "healthy"
    : "unhealthy";

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: "sora-server",
    checks,
  };

  return c.json(response, overallStatus === "healthy" ? 200 : 503);
});

healthApp.get("/health/detailed", async (c) => {
  // Detailed health check with external dependencies
  const checks: HealthCheck[] = [];

  // Database check
  if (c.env?.DATABASE_PATH) {
    const db = new Database(c.env.DATABASE_PATH);
    checks.push(await healthChecker.checkDatabase(db));
  }

  // S3 check
  if (c.env?.S3_BUCKET) {
    const s3 = createS3Client(c.env);
    checks.push(await healthChecker.checkS3(s3, c.env.S3_BUCKET));
  }

  // Memory check
  checks.push(await healthChecker.checkMemory());

  const overallStatus = checks.every((check) => check.status === "healthy")
    ? "healthy"
    : "unhealthy";

  return c.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: "sora-server",
      checks,
    },
    overallStatus === "healthy" ? 200 : 503,
  );
});
```
