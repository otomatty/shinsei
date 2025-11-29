# Sora サーバー セキュリティ・運用 設計書

## 1. セキュリティアーキテクチャ

### 1.1 多層防御戦略

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet Layer                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │  CloudFlare │ │   Route 53  │ │      AWS WAF        │   │
│  │    CDN      │ │    DNS      │ │   DDoS Protection   │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                  Network Layer                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │     VPC     │ │ Security    │ │   NACLs & Route     │   │
│  │  Isolation  │ │   Groups    │ │      Tables         │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                Application Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │    TLS/     │ │   Rate      │ │   Input Validation  │   │
│  │   HTTPS     │ │  Limiting   │ │   & Sanitization    │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ Encryption  │ │    Data     │ │     Access          │   │
│  │ at Rest     │ │Anonymization│ │   Logging           │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 セキュリティ原則

1. **Zero Trust**: 全ての通信を検証
2. **最小権限**: 必要最小限のアクセス権のみ付与
3. **深層防御**: 複数のセキュリティレイヤー
4. **暗号化**: 転送時・保存時の暗号化
5. **監査ログ**: 全てのアクセス・操作を記録

## 2. 認証・認可システム

### 2.1 API認証 (Hono実装)

```typescript
// security/auth/api-auth.ts
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { rateLimiter } from "hono/rate-limiter";
import { createHash, timingSafeEqual } from "crypto";
import type { Context } from "hono";

interface APIKeyInfo {
  id: string;
  name: string;
  permissions: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  allowedIPs?: string[];
  expiresAt?: Date;
}

interface JWTPayload {
  sub: string;
  iat: number;
  exp: number;
  permissions: string[];
  scope: string;
}

class APIKeyManager {
  private apiKeys = new Map<string, APIKeyInfo>();
  private keyHashSalt: string;

  constructor(salt: string) {
    this.keyHashSalt = salt;
    this.loadAPIKeys();
  }

  private loadAPIKeys(): void {
    // 管理用APIキー (読み取り専用)
    this.apiKeys.set(this.hashAPIKey(process.env.ADMIN_API_KEY!), {
      id: "admin",
      name: "Admin Dashboard",
      permissions: ["read:stats", "read:configs", "read:health"],
      rateLimit: { windowMs: 60000, maxRequests: 100 },
      allowedIPs: process.env.ADMIN_ALLOWED_IPS?.split(","),
    });

    // アップロード用APIキー (制限あり)
    this.apiKeys.set(this.hashAPIKey(process.env.UPLOAD_API_KEY!), {
      id: "uploader",
      name: "Content Uploader",
      permissions: ["write:extensions", "write:layouts"],
      rateLimit: { windowMs: 60000, maxRequests: 10 },
    });

    // 公開読み取り用APIキー
    this.apiKeys.set(this.hashAPIKey(process.env.PUBLIC_API_KEY!), {
      id: "public",
      name: "Public Access",
      permissions: ["read:extensions", "read:layouts"],
      rateLimit: { windowMs: 60000, maxRequests: 200 },
    });
  }

  private hashAPIKey(key: string): string {
    return createHash("sha256")
      .update(key + this.keyHashSalt)
      .digest("hex");
  }

  validateAPIKey(rawKey: string, clientIP: string): APIKeyInfo | null {
    const hashedKey = this.hashAPIKey(rawKey);
    const keyInfo = this.apiKeys.get(hashedKey);

    if (!keyInfo) {
      return null;
    }

    // IP制限チェック
    if (keyInfo.allowedIPs && !keyInfo.allowedIPs.includes(clientIP)) {
      return null;
    }

    // 有効期限チェック
    if (keyInfo.expiresAt && keyInfo.expiresAt < new Date()) {
      return null;
    }

    return keyInfo;
  }

  hasPermission(keyInfo: APIKeyInfo, permission: string): boolean {
    return keyInfo.permissions.includes(permission) || keyInfo.permissions.includes("*");
  }
}

export class SecurityMiddleware {
  private apiKeyManager: APIKeyManager;
  private jwtSecret: string;

  constructor(apiKeySalt: string, jwtSecret: string) {
    this.apiKeyManager = new APIKeyManager(apiKeySalt);
    this.jwtSecret = jwtSecret;
  }

  // API Key認証ミドルウェア
  apiKeyAuth(requiredPermission?: string) {
    return async (c: Context, next: () => Promise<void>) => {
      const apiKey = c.req.header("X-API-Key");
      const authHeader = c.req.header("Authorization");

      if (!apiKey && !authHeader) {
        return c.json({ error: "Authentication required" }, 401);
      }

      let keyInfo: APIKeyInfo | null = null;

      // API Key認証
      if (apiKey) {
        const clientIP = this.getClientIP(c);
        keyInfo = this.apiKeyManager.validateAPIKey(apiKey, clientIP);
      }

      // JWT認証 (将来の拡張用)
      if (!keyInfo && authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        try {
          const payload = await this.verifyJWT(token);
          keyInfo = {
            id: payload.sub,
            name: "JWT User",
            permissions: payload.permissions,
            rateLimit: { windowMs: 60000, maxRequests: 100 },
          };
        } catch (error) {
          return c.json({ error: "Invalid token" }, 401);
        }
      }

      if (!keyInfo) {
        return c.json({ error: "Invalid credentials" }, 401);
      }

      // 権限チェック
      if (requiredPermission && !this.apiKeyManager.hasPermission(keyInfo, requiredPermission)) {
        return c.json({ error: "Insufficient permissions" }, 403);
      }

      // コンテキストに認証情報を設定
      c.set("authInfo", keyInfo);

      await next();
    };
  }

  // 動的レート制限
  dynamicRateLimit() {
    return async (c: Context, next: () => Promise<void>) => {
      const authInfo = c.get("authInfo") as APIKeyInfo;

      if (!authInfo) {
        return c.json({ error: "Authentication required" }, 401);
      }

      const rateLimiter = this.createRateLimiter({
        windowMs: authInfo.rateLimit.windowMs,
        limit: authInfo.rateLimit.maxRequests,
        keyGenerator: () => authInfo.id,
      });

      return rateLimiter(c, next);
    };
  }

  private createRateLimiter(options: {
    windowMs: number;
    limit: number;
    keyGenerator: () => string;
  }) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return async (c: Context, next: () => Promise<void>) => {
      const key = options.keyGenerator();
      const now = Date.now();
      const resetTime = now + options.windowMs;

      const current = requests.get(key);

      if (!current || now > current.resetTime) {
        requests.set(key, { count: 1, resetTime });
        c.header("X-RateLimit-Limit", options.limit.toString());
        c.header("X-RateLimit-Remaining", (options.limit - 1).toString());
        c.header("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString());
        return next();
      }

      if (current.count >= options.limit) {
        c.header("X-RateLimit-Limit", options.limit.toString());
        c.header("X-RateLimit-Remaining", "0");
        c.header("X-RateLimit-Reset", Math.ceil(current.resetTime / 1000).toString());
        return c.json({ error: "Rate limit exceeded" }, 429);
      }

      current.count++;
      c.header("X-RateLimit-Limit", options.limit.toString());
      c.header("X-RateLimit-Remaining", (options.limit - current.count).toString());
      c.header("X-RateLimit-Reset", Math.ceil(current.resetTime / 1000).toString());

      return next();
    };
  }

  private getClientIP(c: Context): string {
    return (
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
      c.req.header("X-Real-IP") ||
      "unknown"
    );
  }

  private async verifyJWT(token: string): Promise<JWTPayload> {
    // JWT検証の実装
    // 実際の実装では hono/jwt を使用
    throw new Error("JWT verification not implemented");
  }
}

// 使用例
export function createSecureApp() {
  const app = new Hono();
  const security = new SecurityMiddleware(process.env.API_KEY_SALT!, process.env.JWT_SECRET!);

  // 公開エンドポイント
  app.get("/health", (c) => c.json({ status: "healthy" }));

  // 認証が必要なエンドポイント
  app.get(
    "/api/extensions",
    security.apiKeyAuth("read:extensions"),
    security.dynamicRateLimit(),
    async (c) => {
      // API実装
      return c.json({ extensions: [] });
    },
  );

  // 管理者専用エンドポイント
  app.get(
    "/api/stats",
    security.apiKeyAuth("read:stats"),
    security.dynamicRateLimit(),
    async (c) => {
      // 統計API実装
      return c.json({ stats: {} });
    },
  );

  return app;
}
```

### 2.2 暗号化システム

```typescript
// security/encryption/data-protection.ts
import { createCipher, createDecipher, randomBytes, createHash, pbkdf2Sync } from "crypto";

interface EncryptionConfig {
  algorithm: string;
  keyDerivation: {
    iterations: number;
    keyLength: number;
    digest: string;
  };
}

export class DataEncryption {
  private config: EncryptionConfig;
  private masterKey: Buffer;

  constructor(masterPassword: string) {
    this.config = {
      algorithm: "aes-256-gcm",
      keyDerivation: {
        iterations: 100000,
        keyLength: 32,
        digest: "sha512",
      },
    };

    // マスターキーの生成
    const salt = Buffer.from(process.env.ENCRYPTION_SALT || "sora-default-salt", "utf8");
    this.masterKey = pbkdf2Sync(
      masterPassword,
      salt,
      this.config.keyDerivation.iterations,
      this.config.keyDerivation.keyLength,
      this.config.keyDerivation.digest,
    );
  }

  encrypt(data: string | object): EncryptedData {
    const plaintext = typeof data === "string" ? data : JSON.stringify(data);
    const iv = randomBytes(16);
    const cipher = createCipher(this.config.algorithm, this.masterKey);

    cipher.setAAD(Buffer.from("sora-feedback-v1", "utf8"));

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      algorithm: this.config.algorithm,
      encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      version: 1,
    };
  }

  decrypt(encryptedData: EncryptedData): string {
    const decipher = createDecipher(this.config.algorithm, this.masterKey);

    decipher.setAAD(Buffer.from("sora-feedback-v1", "utf8"));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

    let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  // フィールド別暗号化 (部分暗号化)
  encryptFields(data: any, fieldsToEncrypt: string[]): any {
    const result = { ...data };

    for (const field of fieldsToEncrypt) {
      if (result[field] !== undefined) {
        result[`${field}_encrypted`] = this.encrypt(result[field]);
        delete result[field];
      }
    }

    return result;
  }

  decryptFields(data: any, fieldsToDecrypt: string[]): any {
    const result = { ...data };

    for (const field of fieldsToDecrypt) {
      const encryptedField = `${field}_encrypted`;
      if (result[encryptedField]) {
        result[field] = this.decrypt(result[encryptedField]);
        delete result[encryptedField];
      }
    }

    return result;
  }
}

interface EncryptedData {
  algorithm: string;
  encrypted: string;
  iv: string;
  authTag: string;
  version: number;
}

export class PrivacyProtection {
  private static readonly SENSITIVE_PATTERNS = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit Card
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP Address
    /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/, // UUID
  ];

  static sanitizeIP(ip: string): string {
    if (ip.includes(".")) {
      // IPv4: 最後のオクテットをマスク
      const parts = ip.split(".");
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }

    if (ip.includes(":")) {
      // IPv6: 下位64ビットをマスク
      const parts = ip.split(":");
      return parts.slice(0, 4).join(":") + "::xxxx";
    }

    return "xxx.xxx.xxx.xxx";
  }

  static hashPII(data: string, salt: string): string {
    return createHash("sha256")
      .update(data + salt)
      .digest("hex");
  }

  static detectAndRedactPII(text: string): {
    redacted: string;
    detectedTypes: string[];
  } {
    let redacted = text;
    const detectedTypes: string[] = [];

    // Email
    if (this.SENSITIVE_PATTERNS[0]?.test(text)) {
      redacted = redacted.replace(this.SENSITIVE_PATTERNS[0], "[EMAIL_REDACTED]");
      detectedTypes.push("email");
    }

    // SSN
    if (this.SENSITIVE_PATTERNS[1]?.test(text)) {
      redacted = redacted.replace(this.SENSITIVE_PATTERNS[1], "[SSN_REDACTED]");
      detectedTypes.push("ssn");
    }

    // Credit Card
    if (this.SENSITIVE_PATTERNS[2]?.test(text)) {
      redacted = redacted.replace(this.SENSITIVE_PATTERNS[2], "[CARD_REDACTED]");
      detectedTypes.push("credit_card");
    }

    // IP Address
    if (this.SENSITIVE_PATTERNS[3]?.test(text)) {
      redacted = redacted.replace(this.SENSITIVE_PATTERNS[3], "[IP_REDACTED]");
      detectedTypes.push("ip_address");
    }

    return { redacted, detectedTypes };
  }

  static removePersonalData(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.removePersonalData(item));
    }

    const result: any = {};
    const sensitiveFields = [
      "email",
      "username",
      "userid",
      "user_id",
      "name",
      "first_name",
      "last_name",
      "phone",
      "address",
      "ssn",
      "passport",
      "license",
      "credit_card",
      "ip",
      "ip_address",
      "location",
      "gps",
      "coordinates",
      "lat",
      "lng",
      "device_id",
      "mac_address",
      "imei",
      "serial_number",
      "password",
      "token",
      "key",
      "secret",
      "auth",
    ];

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // フィールド名による除去
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        continue; // 除去
      }

      // 値の内容による検査・編集
      if (typeof value === "string") {
        const { redacted, detectedTypes } = this.detectAndRedactPII(value);
        result[key] = detectedTypes.length > 0 ? redacted : value;
      } else {
        result[key] = this.removePersonalData(value);
      }
    }

    return result;
  }

  // GDPR準拠のデータ保持期間管理
  static shouldRetainData(createdAt: Date, dataType: string): boolean {
    const now = new Date();
    const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    switch (dataType) {
      case "feedback":
        return ageInDays <= 90; // 90日間保持
      case "analytics":
        return ageInDays <= 365; // 1年間保持
      case "error_logs":
        return ageInDays <= 30; // 30日間保持
      default:
        return ageInDays <= 90; // デフォルト90日間
    }
  }
}

// 暗号化対応のデータベースラッパー
export class SecureDatabase {
  private encryption: DataEncryption;
  private db: any; // 実際のデータベースインスタンス

  constructor(database: any, encryptionKey: string) {
    this.db = database;
    this.encryption = new DataEncryption(encryptionKey);
  }

  async saveFeedback(feedback: any): Promise<void> {
    // 機密フィールドを暗号化
    const encrypted = this.encryption.encryptFields(feedback, [
      "configuration_json",
      "error_details",
    ]);

    // PII除去
    const sanitized = PrivacyProtection.removePersonalData(encrypted);

    // データベースに保存
    const stmt = this.db.prepare(`
      INSERT INTO feedbacks (
        id, fingerprint_hash, configuration_json_encrypted,
        success, error_count, performance_score, platform, sora_version, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      sanitized.id,
      sanitized.fingerprint_hash,
      sanitized.configuration_json_encrypted,
      sanitized.success,
      sanitized.error_count,
      sanitized.performance_score,
      sanitized.platform,
      sanitized.sora_version,
      new Date().toISOString(),
    );
  }

  async getFeedback(id: string): Promise<any> {
    const stmt = this.db.prepare("SELECT * FROM feedbacks WHERE id = ?");
    const result = stmt.get(id);

    if (!result) return null;

    // 暗号化フィールドを復号化
    return this.encryption.decryptFields(result, ["configuration_json", "error_details"]);
  }

  async cleanupExpiredData(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90日前

    const stmt = this.db.prepare(`
      DELETE FROM feedbacks
      WHERE created_at < ? AND data_type = 'feedback'
    `);

    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
  }
}
```

## 3. 脆弱性対策

### 3.1 入力検証・サニタイゼーション

```typescript
// security/validation/input-validator.ts
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";

export class InputValidator {
  // 基本的なスキーマ定義
  private static readonly schemas = {
    feedback: z.object({
      fingerprint: z.object({
        topicStructureHash: z.string().regex(/^[a-f0-9]{64}$/),
        messageTypePattern: z.string().max(256),
        frequencyProfile: z.string().max(256),
        durationCategory: z.enum(["short", "medium", "long"]),
        sizeCategory: z.enum(["small", "medium", "large"]),
        complexityScore: z.number().min(0).max(100),
      }),
      configuration: z.object({
        extensions: z.array(
          z.object({
            baseId: z.string().regex(/^[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_.]+$/),
            version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9\-_.]+)?$/),
            enabled: z.boolean(),
          }),
        ),
        layout: z.object({
          baseId: z.string().regex(/^[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_.]+$/),
          version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9\-_.]+)?$/),
        }),
      }),
      result: z.object({
        success: z.boolean(),
        totalErrors: z.number().min(0),
        totalWarnings: z.number().min(0),
        playbackDuration: z.number().min(0),
        performance: z.object({
          averageFPS: z.number().min(0).max(120),
          peakMemoryMB: z.number().min(0),
          averageCPUPercent: z.number().min(0).max(100),
          loadTimeMs: z.number().min(0),
        }),
      }),
      platform: z.enum(["web", "desktop"]),
      soraVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
      sessionId: z.string().uuid(),
    }),

    extensionPath: z.object({
      baseId: z.string().regex(/^[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_.]+$/),
      version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9\-_.]+)?$/),
    }),

    query: z.object({
      search: z.string().max(256).optional(),
      tag: z.string().max(64).optional(),
      limit: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .refine((n) => n <= 100)
        .optional(),
    }),
  };

  static validateFeedback(data: unknown): any {
    try {
      return this.schemas.feedback.parse(data);
    } catch (error) {
      throw new ValidationError("Invalid feedback data", error);
    }
  }

  static validateExtensionPath(data: unknown): any {
    try {
      return this.schemas.extensionPath.parse(data);
    } catch (error) {
      throw new ValidationError("Invalid extension path", error);
    }
  }

  static validateQuery(data: unknown): any {
    try {
      return this.schemas.query.parse(data);
    } catch (error) {
      throw new ValidationError("Invalid query parameters", error);
    }
  }

  // SQLインジェクション対策
  static sanitizeSQL(input: string): string {
    // 危険な文字を除去
    return input.replace(/['";\\]/g, "");
  }

  // XSS対策
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // HTMLタグを全て除去
      ALLOWED_ATTR: [],
    });
  }

  // パストラバーサル対策
  static sanitizePath(input: string): string {
    // 危険なパス文字を除去
    return input.replace(/[\.\/\\]/g, "").replace(/\.\./g, "");
  }

  // コマンドインジェクション対策
  static sanitizeCommand(input: string): string {
    // シェルメタ文字を除去
    return input.replace(/[;&|`$(){}[\]<>]/g, "");
  }

  // 文字エンコーディング正規化
  static normalizeEncoding(input: string): string {
    // Unicode正規化
    return input.normalize("NFKC");
  }

  // 総合サニタイゼーション
  static sanitizeInput(input: string, type: "sql" | "html" | "path" | "command" = "html"): string {
    let sanitized = this.normalizeEncoding(input);

    switch (type) {
      case "sql":
        sanitized = this.sanitizeSQL(sanitized);
        break;
      case "html":
        sanitized = this.sanitizeHTML(sanitized);
        break;
      case "path":
        sanitized = this.sanitizePath(sanitized);
        break;
      case "command":
        sanitized = this.sanitizeCommand(sanitized);
        break;
    }

    return sanitized;
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public originalError?: any,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// セキュリティヘッダー設定
export function securityHeaders() {
  return async (c: Context, next: () => Promise<void>) => {
    await next();

    // Security headers
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("X-XSS-Protection", "1; mode=block");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // 必要に応じて調整
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "font-src 'self'",
        "object-src 'none'",
        "media-src 'self'",
        "frame-src 'none'",
      ].join("; "),
    );

    // HSTS (HTTPS環境でのみ)
    if (c.req.header("x-forwarded-proto") === "https") {
      c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
  };
}

// CORS設定
export function corsPolicy() {
  return async (c: Context, next: () => Promise<void>) => {
    const origin = c.req.header("Origin");
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",");

    if (origin && allowedOrigins.includes(origin)) {
      c.header("Access-Control-Allow-Origin", origin);
    }

    c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
    c.header("Access-Control-Max-Age", "86400"); // 24時間

    if (c.req.method === "OPTIONS") {
      return c.text("", 204);
    }

    await next();
  };
}
```

### 3.2 セキュリティスキャン

```typescript
// security/scanning/vulnerability-scanner.ts
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, readFileSync } from "fs";

const execAsync = promisify(exec);

interface SecurityScanResult {
  scanner: string;
  timestamp: Date;
  vulnerabilities: Vulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface Vulnerability {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  file?: string;
  line?: number;
  remediation?: string;
}

export class SecurityScanner {
  async scanDependencies(): Promise<SecurityScanResult> {
    try {
      const { stdout } = await execAsync("bun audit --json");
      const auditResult = JSON.parse(stdout);

      const vulnerabilities: Vulnerability[] = [];

      for (const vuln of auditResult.vulnerabilities || []) {
        vulnerabilities.push({
          id: vuln.id,
          severity: this.mapSeverity(vuln.severity),
          title: vuln.title,
          description: vuln.overview,
          remediation: vuln.recommendation,
        });
      }

      return {
        scanner: "bun-audit",
        timestamp: new Date(),
        vulnerabilities,
        summary: this.calculateSummary(vulnerabilities),
      };
    } catch (error) {
      throw new Error(`Dependency scan failed: ${error}`);
    }
  }

  async scanCode(): Promise<SecurityScanResult> {
    const vulnerabilities: Vulnerability[] = [];

    // 静的解析パターン
    const patterns = [
      {
        pattern: /eval\(/g,
        severity: "high" as const,
        title: "Dangerous eval() usage",
        description: "Use of eval() can lead to code injection vulnerabilities",
      },
      {
        pattern: /innerHTML\s*=/g,
        severity: "medium" as const,
        title: "Potential XSS via innerHTML",
        description: "Direct innerHTML assignment can lead to XSS vulnerabilities",
      },
      {
        pattern: /process\.env\.\w+/g,
        severity: "low" as const,
        title: "Environment variable usage",
        description: "Ensure environment variables do not contain sensitive data",
      },
      {
        pattern: /password|secret|key|token/i,
        severity: "medium" as const,
        title: "Potential hardcoded secrets",
        description: "Hardcoded secrets should be moved to environment variables",
      },
    ];

    // ソースファイルスキャン
    const files = await this.getSourceFiles();

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        for (const pattern of patterns) {
          if (pattern.pattern.test(lines[i]!)) {
            vulnerabilities.push({
              id: `code-${Date.now()}-${i}`,
              severity: pattern.severity,
              title: pattern.title,
              description: pattern.description,
              file,
              line: i + 1,
            });
          }
        }
      }
    }

    return {
      scanner: "static-analysis",
      timestamp: new Date(),
      vulnerabilities,
      summary: this.calculateSummary(vulnerabilities),
    };
  }

  async scanContainer(imageName: string): Promise<SecurityScanResult> {
    try {
      const { stdout } = await execAsync(`trivy image --format json ${imageName}`);
      const scanResult = JSON.parse(stdout);

      const vulnerabilities: Vulnerability[] = [];

      for (const result of scanResult.Results || []) {
        for (const vuln of result.Vulnerabilities || []) {
          vulnerabilities.push({
            id: vuln.VulnerabilityID,
            severity: this.mapTrivySeverity(vuln.Severity),
            title: vuln.Title || vuln.VulnerabilityID,
            description: vuln.Description,
            remediation: vuln.FixedVersion ? `Update to version ${vuln.FixedVersion}` : undefined,
          });
        }
      }

      return {
        scanner: "trivy",
        timestamp: new Date(),
        vulnerabilities,
        summary: this.calculateSummary(vulnerabilities),
      };
    } catch (error) {
      throw new Error(`Container scan failed: ${error}`);
    }
  }

  async generateReport(results: SecurityScanResult[]): Promise<string> {
    const report = {
      generatedAt: new Date().toISOString(),
      scans: results,
      overallSummary: this.calculateOverallSummary(results),
    };

    const reportJson = JSON.stringify(report, null, 2);
    writeFileSync(`security-report-${Date.now()}.json`, reportJson);

    return reportJson;
  }

  private mapSeverity(severity: string): "critical" | "high" | "medium" | "low" {
    switch (severity.toLowerCase()) {
      case "critical":
        return "critical";
      case "high":
        return "high";
      case "medium":
      case "moderate":
        return "medium";
      case "low":
        return "low";
      default:
        return "medium";
    }
  }

  private mapTrivySeverity(severity: string): "critical" | "high" | "medium" | "low" {
    switch (severity.toUpperCase()) {
      case "CRITICAL":
        return "critical";
      case "HIGH":
        return "high";
      case "MEDIUM":
        return "medium";
      case "LOW":
        return "low";
      default:
        return "medium";
    }
  }

  private calculateSummary(vulnerabilities: Vulnerability[]) {
    return vulnerabilities.reduce(
      (acc, vuln) => {
        acc[vuln.severity]++;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 },
    );
  }

  private calculateOverallSummary(results: SecurityScanResult[]) {
    return results.reduce(
      (acc, result) => {
        acc.critical += result.summary.critical;
        acc.high += result.summary.high;
        acc.medium += result.summary.medium;
        acc.low += result.summary.low;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 },
    );
  }

  private async getSourceFiles(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        'find . -name "*.ts" -o -name "*.js" | grep -v node_modules',
      );
      return stdout
        .trim()
        .split("\n")
        .filter((file) => file.length > 0);
    } catch (error) {
      return [];
    }
  }
}

// セキュリティスキャン自動化
export class SecurityAutomation {
  private scanner = new SecurityScanner();

  async runCompleteScan(): Promise<void> {
    console.log("Starting comprehensive security scan...");

    const results: SecurityScanResult[] = [];

    try {
      // 依存関係スキャン
      console.log("Scanning dependencies...");
      const depScan = await this.scanner.scanDependencies();
      results.push(depScan);

      // コードスキャン
      console.log("Scanning source code...");
      const codeScan = await this.scanner.scanCode();
      results.push(codeScan);

      // レポート生成
      const report = await this.scanner.generateReport(results);
      console.log("Security scan completed. Report generated.");

      // 重要な脆弱性がある場合は警告
      const overallSummary = results.reduce(
        (acc, result) => {
          acc.critical += result.summary.critical;
          acc.high += result.summary.high;
          return acc;
        },
        { critical: 0, high: 0 },
      );

      if (overallSummary.critical > 0) {
        console.error(`❌ CRITICAL: ${overallSummary.critical} critical vulnerabilities found!`);
        process.exit(1);
      }

      if (overallSummary.high > 0) {
        console.warn(`⚠️  WARNING: ${overallSummary.high} high-severity vulnerabilities found!`);
      }
    } catch (error) {
      console.error("Security scan failed:", error);
      process.exit(1);
    }
  }
}
```

## 4. 監査ログ・コンプライアンス

### 4.1 監査ログシステム

```typescript
// security/audit/audit-logger.ts
import { createHash } from "crypto";

interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  actor: {
    type: "user" | "system" | "service";
    id: string;
    ip?: string;
    userAgent?: string;
  };
  target: {
    type: string;
    id: string;
    properties?: Record<string, any>;
  };
  action: string;
  outcome: "success" | "failure";
  details?: Record<string, any>;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export class AuditLogger {
  private logs: AuditEvent[] = [];
  private maxLogs = 10000; // メモリ内ログの最大数

  logEvent(event: Omit<AuditEvent, "id" | "timestamp">): void {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event,
    };

    this.logs.push(auditEvent);
    this.writeToFile(auditEvent);
    this.sendToSIEM(auditEvent);

    // メモリ使用量制限
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  // 認証イベント
  logAuthentication(
    actorId: string,
    ip: string,
    outcome: "success" | "failure",
    details?: any,
  ): void {
    this.logEvent({
      eventType: "authentication",
      actor: { type: "user", id: actorId, ip },
      target: { type: "system", id: "auth" },
      action: "authenticate",
      outcome,
      details,
      riskLevel: outcome === "failure" ? "medium" : "low",
    });
  }

  // データアクセスイベント
  logDataAccess(
    actorId: string,
    targetType: string,
    targetId: string,
    action: string,
    ip?: string,
  ): void {
    this.logEvent({
      eventType: "data_access",
      actor: { type: "user", id: actorId, ip },
      target: { type: targetType, id: targetId },
      action,
      outcome: "success",
      riskLevel: action.includes("delete") ? "high" : "low",
    });
  }

  // システムイベント
  logSystemEvent(
    eventType: string,
    action: string,
    details?: any,
    riskLevel: "low" | "medium" | "high" | "critical" = "low",
  ): void {
    this.logEvent({
      eventType,
      actor: { type: "system", id: "sora-server" },
      target: { type: "system", id: "application" },
      action,
      outcome: "success",
      details,
      riskLevel,
    });
  }

  // エラーイベント
  logError(error: Error, context?: any): void {
    this.logEvent({
      eventType: "error",
      actor: { type: "system", id: "sora-server" },
      target: { type: "application", id: "error-handler" },
      action: "error_occurred",
      outcome: "failure",
      details: {
        message: error.message,
        stack: error.stack,
        context,
      },
      riskLevel: "medium",
    });
  }

  // セキュリティイベント
  logSecurityEvent(eventType: string, actorId: string, ip: string, details: any): void {
    this.logEvent({
      eventType: "security",
      actor: { type: "user", id: actorId, ip },
      target: { type: "security", id: eventType },
      action: eventType,
      outcome: "failure",
      details,
      riskLevel: "high",
    });
  }

  // 検索・フィルタリング
  searchEvents(filters: {
    eventType?: string;
    actorId?: string;
    action?: string;
    outcome?: "success" | "failure";
    riskLevel?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): AuditEvent[] {
    return this.logs.filter((event) => {
      if (filters.eventType && event.eventType !== filters.eventType) return false;
      if (filters.actorId && event.actor.id !== filters.actorId) return false;
      if (filters.action && event.action !== filters.action) return false;
      if (filters.outcome && event.outcome !== filters.outcome) return false;
      if (filters.riskLevel && event.riskLevel !== filters.riskLevel) return false;
      if (filters.dateFrom && event.timestamp < filters.dateFrom) return false;
      if (filters.dateTo && event.timestamp > filters.dateTo) return false;
      return true;
    });
  }

  // 統計情報
  getStatistics(period: "hour" | "day" | "week" = "day"): any {
    const now = new Date();
    const cutoff = new Date();

    switch (period) {
      case "hour":
        cutoff.setHours(cutoff.getHours() - 1);
        break;
      case "day":
        cutoff.setDate(cutoff.getDate() - 1);
        break;
      case "week":
        cutoff.setDate(cutoff.getDate() - 7);
        break;
    }

    const recentEvents = this.logs.filter((event) => event.timestamp >= cutoff);

    return {
      totalEvents: recentEvents.length,
      byEventType: this.groupBy(recentEvents, "eventType"),
      byOutcome: this.groupBy(recentEvents, "outcome"),
      byRiskLevel: this.groupBy(recentEvents, "riskLevel"),
      securityEvents: recentEvents.filter(
        (e) => e.riskLevel === "high" || e.riskLevel === "critical",
      ).length,
    };
  }

  private generateEventId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return createHash("sha256")
      .update(timestamp + random)
      .digest("hex")
      .substring(0, 16);
  }

  private writeToFile(event: AuditEvent): void {
    const logEntry = JSON.stringify(event) + "\n";
    // ファイルに書き込み (実装は環境に依存)
    console.log(`AUDIT: ${logEntry}`);
  }

  private sendToSIEM(event: AuditEvent): void {
    // SIEM システムへの送信 (実装は環境に依存)
    if (event.riskLevel === "high" || event.riskLevel === "critical") {
      console.warn(`HIGH RISK AUDIT EVENT: ${JSON.stringify(event)}`);
    }
  }

  private groupBy(events: AuditEvent[], key: keyof AuditEvent): Record<string, number> {
    return events.reduce(
      (acc, event) => {
        const value = String(event[key]);
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}

// 監査ログミドルウェア
export function auditMiddleware(auditLogger: AuditLogger) {
  return async (c: Context, next: () => Promise<void>) => {
    const startTime = Date.now();
    const authInfo = c.get("authInfo");
    const clientIP =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
      "unknown";

    try {
      await next();

      // 成功ログ
      if (authInfo) {
        auditLogger.logDataAccess(authInfo.id, "api", c.req.path, c.req.method, clientIP);
      }
    } catch (error) {
      // エラーログ
      auditLogger.logError(error as Error, {
        path: c.req.path,
        method: c.req.method,
        ip: clientIP,
        userAgent: c.req.header("User-Agent"),
        duration: Date.now() - startTime,
      });

      throw error;
    }
  };
}
```

### 4.2 コンプライアンス対応

```typescript
// security/compliance/gdpr-compliance.ts
export class GDPRCompliance {
  private auditLogger: AuditLogger;
  private dataRetentionDays = 90;

  constructor(auditLogger: AuditLogger) {
    this.auditLogger = auditLogger;
  }

  // データ保護影響評価 (DPIA)
  async performDPIA(dataType: string, processingPurpose: string): Promise<DPIAResult> {
    const assessment = {
      dataType,
      processingPurpose,
      riskLevel: this.assessRisk(dataType, processingPurpose),
      mitigationMeasures: this.getMitigationMeasures(dataType),
      legalBasis: this.getLegalBasis(processingPurpose),
      timestamp: new Date(),
    };

    this.auditLogger.logSystemEvent("dpia", "assessment_performed", assessment);

    return assessment;
  }

  // データ主体の権利対応
  async handleDataSubjectRequest(request: DataSubjectRequest): Promise<DataSubjectResponse> {
    this.auditLogger.logEvent({
      eventType: "data_subject_request",
      actor: { type: "user", id: request.subjectId },
      target: { type: "personal_data", id: request.subjectId },
      action: request.type,
      outcome: "success",
      riskLevel: "medium",
    });

    switch (request.type) {
      case "access":
        return await this.handleAccessRequest(request);
      case "rectification":
        return await this.handleRectificationRequest(request);
      case "erasure":
        return await this.handleErasureRequest(request);
      case "portability":
        return await this.handlePortabilityRequest(request);
      default:
        throw new Error(`Unsupported request type: ${request.type}`);
    }
  }

  // データ保持期間管理
  async cleanupExpiredData(): Promise<CleanupResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.dataRetentionDays);

    const deletedRecords = await this.deleteDataOlderThan(cutoffDate);

    this.auditLogger.logSystemEvent(
      "data_cleanup",
      "expired_data_deleted",
      {
        cutoffDate: cutoffDate.toISOString(),
        deletedRecords,
      },
      "low",
    );

    return {
      deletedRecords,
      cutoffDate,
      executedAt: new Date(),
    };
  }

  // 同意管理
  async recordConsent(subjectId: string, consentDetails: ConsentDetails): Promise<void> {
    const consentRecord = {
      subjectId,
      ...consentDetails,
      timestamp: new Date(),
      ipAddress: PrivacyProtection.sanitizeIP(consentDetails.ipAddress),
    };

    // データベースに保存
    await this.saveConsentRecord(consentRecord);

    this.auditLogger.logEvent({
      eventType: "consent",
      actor: { type: "user", id: subjectId },
      target: { type: "consent", id: "data_processing" },
      action: "consent_given",
      outcome: "success",
      riskLevel: "low",
    });
  }

  async withdrawConsent(subjectId: string): Promise<void> {
    await this.markConsentWithdrawn(subjectId);

    this.auditLogger.logEvent({
      eventType: "consent",
      actor: { type: "user", id: subjectId },
      target: { type: "consent", id: "data_processing" },
      action: "consent_withdrawn",
      outcome: "success",
      riskLevel: "medium",
    });

    // 同意撤回後のデータ処理停止
    await this.stopDataProcessing(subjectId);
  }

  // 個人データ侵害報告
  async reportDataBreach(breach: DataBreach): Promise<void> {
    const breachReport = {
      ...breach,
      reportedAt: new Date(),
      reportId: this.generateBreachId(),
    };

    this.auditLogger.logEvent({
      eventType: "data_breach",
      actor: { type: "system", id: "breach_detection" },
      target: { type: "personal_data", id: breach.affectedDataTypes.join(",") },
      action: "breach_detected",
      outcome: "failure",
      details: breachReport,
      riskLevel: "critical",
    });

    // 72時間以内の報告義務
    if (breach.severity === "high") {
      await this.notifyDataProtectionAuthority(breachReport);
    }

    // 影響を受けるデータ主体への通知
    if (breach.notifySubjects) {
      await this.notifyAffectedSubjects(breachReport);
    }
  }

  private assessRisk(dataType: string, purpose: string): "low" | "medium" | "high" {
    const sensitiveData = ["biometric", "health", "financial", "location"];
    const highRiskPurposes = ["profiling", "automated_decision", "marketing"];

    if (sensitiveData.some((type) => dataType.includes(type))) {
      return "high";
    }

    if (highRiskPurposes.some((p) => purpose.includes(p))) {
      return "medium";
    }

    return "low";
  }

  private getMitigationMeasures(dataType: string): string[] {
    const measures = [
      "Data minimization",
      "Purpose limitation",
      "Storage limitation",
      "Encryption at rest and in transit",
      "Access controls",
      "Regular security assessments",
    ];

    if (dataType.includes("biometric") || dataType.includes("health")) {
      measures.push("Enhanced encryption", "Strict access controls", "Regular audits");
    }

    return measures;
  }

  private getLegalBasis(purpose: string): string {
    const legalBasisMap: Record<string, string> = {
      service_improvement: "Legitimate interest",
      error_reporting: "Legitimate interest",
      security_monitoring: "Legitimate interest",
      marketing: "Consent",
      profiling: "Consent",
      research: "Consent",
    };

    return legalBasisMap[purpose] || "Legitimate interest";
  }

  private async handleAccessRequest(request: DataSubjectRequest): Promise<DataSubjectResponse> {
    const personalData = await this.retrievePersonalData(request.subjectId);

    return {
      requestId: request.id,
      subjectId: request.subjectId,
      type: "access",
      data: personalData,
      processedAt: new Date(),
    };
  }

  private async handleErasureRequest(request: DataSubjectRequest): Promise<DataSubjectResponse> {
    const deletedData = await this.erasePersonalData(request.subjectId);

    return {
      requestId: request.id,
      subjectId: request.subjectId,
      type: "erasure",
      data: { deletedRecords: deletedData },
      processedAt: new Date(),
    };
  }

  private generateBreachId(): string {
    return `BREACH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  // 実装が必要なメソッド (データベース操作)
  private async deleteDataOlderThan(cutoffDate: Date): Promise<number> {
    // 実装: データベースから古いデータを削除
    return 0;
  }

  private async saveConsentRecord(record: any): Promise<void> {
    // 実装: 同意記録をデータベースに保存
  }

  private async markConsentWithdrawn(subjectId: string): Promise<void> {
    // 実装: 同意撤回をマーク
  }

  private async stopDataProcessing(subjectId: string): Promise<void> {
    // 実装: データ処理を停止
  }

  private async retrievePersonalData(subjectId: string): Promise<any> {
    // 実装: 個人データを取得
    return {};
  }

  private async erasePersonalData(subjectId: string): Promise<number> {
    // 実装: 個人データを削除
    return 0;
  }

  private async notifyDataProtectionAuthority(breach: any): Promise<void> {
    // 実装: データ保護当局への通知
  }

  private async notifyAffectedSubjects(breach: any): Promise<void> {
    // 実装: 影響を受けるデータ主体への通知
  }
}

// 型定義
interface DPIAResult {
  dataType: string;
  processingPurpose: string;
  riskLevel: "low" | "medium" | "high";
  mitigationMeasures: string[];
  legalBasis: string;
  timestamp: Date;
}

interface DataSubjectRequest {
  id: string;
  subjectId: string;
  type: "access" | "rectification" | "erasure" | "portability";
  details?: any;
}

interface DataSubjectResponse {
  requestId: string;
  subjectId: string;
  type: string;
  data: any;
  processedAt: Date;
}

interface ConsentDetails {
  purpose: string;
  dataTypes: string[];
  ipAddress: string;
  userAgent: string;
  consentGiven: boolean;
}

interface DataBreach {
  affectedDataTypes: string[];
  estimatedAffectedSubjects: number;
  breachType: "confidentiality" | "integrity" | "availability";
  severity: "low" | "medium" | "high";
  description: string;
  notifySubjects: boolean;
}

interface CleanupResult {
  deletedRecords: number;
  cutoffDate: Date;
  executedAt: Date;
}
```

## 5. 運用監視

### 5.1 セキュリティ監視ダッシュボード

```typescript
// security/monitoring/security-dashboard.ts
export class SecurityDashboard {
  private auditLogger: AuditLogger;

  constructor(auditLogger: AuditLogger) {
    this.auditLogger = auditLogger;
  }

  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      authFailures24h,
      authFailures7d,
      securityEvents24h,
      suspiciousActivities,
      riskDistribution,
    ] = await Promise.all([
      this.countAuthFailures(last24h),
      this.countAuthFailures(last7d),
      this.countSecurityEvents(last24h),
      this.detectSuspiciousActivities(last24h),
      this.getRiskDistribution(last24h),
    ]);

    return {
      authFailures: {
        last24h: authFailures24h,
        last7d: authFailures7d,
        trend: this.calculateTrend(authFailures24h, authFailures7d),
      },
      securityEvents: {
        last24h: securityEvents24h,
        byType: this.groupSecurityEvents(last24h),
      },
      suspiciousActivities,
      riskDistribution,
      lastUpdated: now,
    };
  }

  async detectAnomalies(): Promise<SecurityAnomaly[]> {
    const anomalies: SecurityAnomaly[] = [];

    // 異常な認証試行
    const authAnomalies = await this.detectAuthAnomalies();
    anomalies.push(...authAnomalies);

    // 異常なアクセスパターン
    const accessAnomalies = await this.detectAccessAnomalies();
    anomalies.push(...accessAnomalies);

    // レート制限違反
    const rateLimitAnomalies = await this.detectRateLimitAnomalies();
    anomalies.push(...rateLimitAnomalies);

    return anomalies;
  }

  async generateSecurityReport(period: "daily" | "weekly" | "monthly"): Promise<SecurityReport> {
    const endDate = new Date();
    const startDate = this.getStartDate(endDate, period);

    const events = this.auditLogger.searchEvents({
      dateFrom: startDate,
      dateTo: endDate,
    });

    const report: SecurityReport = {
      period,
      startDate,
      endDate,
      summary: {
        totalEvents: events.length,
        securityEvents: events.filter((e) => e.eventType === "security").length,
        authFailures: events.filter(
          (e) => e.eventType === "authentication" && e.outcome === "failure",
        ).length,
        highRiskEvents: events.filter((e) => e.riskLevel === "high" || e.riskLevel === "critical")
          .length,
      },
      trends: this.calculateTrends(events, period),
      topThreats: this.identifyTopThreats(events),
      recommendations: this.generateRecommendations(events),
    };

    return report;
  }

  private async countAuthFailures(since: Date): Promise<number> {
    const failures = this.auditLogger.searchEvents({
      eventType: "authentication",
      outcome: "failure",
      dateFrom: since,
    });
    return failures.length;
  }

  private async countSecurityEvents(since: Date): Promise<number> {
    const events = this.auditLogger.searchEvents({
      eventType: "security",
      dateFrom: since,
    });
    return events.length;
  }

  private async detectSuspiciousActivities(since: Date): Promise<SuspiciousActivity[]> {
    const activities: SuspiciousActivity[] = [];
    const events = this.auditLogger.searchEvents({ dateFrom: since });

    // IP別の活動分析
    const ipActivity = this.groupByIP(events);
    for (const [ip, ipEvents] of ipActivity) {
      if (ipEvents.length > 100) {
        // 1日で100回以上のアクセス
        activities.push({
          type: "high_volume_access",
          description: `High volume of requests from IP: ${ip}`,
          count: ipEvents.length,
          riskLevel: "medium",
          details: { ip, eventCount: ipEvents.length },
        });
      }

      const authFailures = ipEvents.filter(
        (e) => e.eventType === "authentication" && e.outcome === "failure",
      );
      if (authFailures.length > 10) {
        // 認証失敗が10回以上
        activities.push({
          type: "brute_force_attempt",
          description: `Multiple auth failures from IP: ${ip}`,
          count: authFailures.length,
          riskLevel: "high",
          details: { ip, failureCount: authFailures.length },
        });
      }
    }

    return activities;
  }

  private getRiskDistribution(since: Date): Record<string, number> {
    const events = this.auditLogger.searchEvents({ dateFrom: since });
    return events.reduce(
      (acc, event) => {
        acc[event.riskLevel] = (acc[event.riskLevel] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private groupByIP(events: AuditEvent[]): Map<string, AuditEvent[]> {
    const grouped = new Map<string, AuditEvent[]>();

    for (const event of events) {
      const ip = event.actor.ip || "unknown";
      if (!grouped.has(ip)) {
        grouped.set(ip, []);
      }
      grouped.get(ip)!.push(event);
    }

    return grouped;
  }

  private calculateTrend(current: number, previous: number): "up" | "down" | "stable" {
    const change = (current - previous) / previous;
    if (change > 0.1) return "up";
    if (change < -0.1) return "down";
    return "stable";
  }

  private getStartDate(endDate: Date, period: "daily" | "weekly" | "monthly"): Date {
    const startDate = new Date(endDate);
    switch (period) {
      case "daily":
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "weekly":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "monthly":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }
    return startDate;
  }

  // その他のプライベートメソッドは簡略化...
  private async detectAuthAnomalies(): Promise<SecurityAnomaly[]> {
    return [];
  }
  private async detectAccessAnomalies(): Promise<SecurityAnomaly[]> {
    return [];
  }
  private async detectRateLimitAnomalies(): Promise<SecurityAnomaly[]> {
    return [];
  }
  private groupSecurityEvents(since: Date): Record<string, number> {
    return {};
  }
  private calculateTrends(events: AuditEvent[], period: string): any {
    return {};
  }
  private identifyTopThreats(events: AuditEvent[]): any[] {
    return [];
  }
  private generateRecommendations(events: AuditEvent[]): string[] {
    return [];
  }
}

// 型定義
interface SecurityMetrics {
  authFailures: {
    last24h: number;
    last7d: number;
    trend: "up" | "down" | "stable";
  };
  securityEvents: {
    last24h: number;
    byType: Record<string, number>;
  };
  suspiciousActivities: SuspiciousActivity[];
  riskDistribution: Record<string, number>;
  lastUpdated: Date;
}

interface SuspiciousActivity {
  type: string;
  description: string;
  count: number;
  riskLevel: "low" | "medium" | "high";
  details: any;
}

interface SecurityAnomaly {
  type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: Date;
  affectedResources: string[];
}

interface SecurityReport {
  period: "daily" | "weekly" | "monthly";
  startDate: Date;
  endDate: Date;
  summary: {
    totalEvents: number;
    securityEvents: number;
    authFailures: number;
    highRiskEvents: number;
  };
  trends: any;
  topThreats: any[];
  recommendations: string[];
}
```

---

**ツン：** はぁ？セキュリティ設計って言うから見てみたけど、やたら長いのね。でも...まあ、暗号化とか監査ログとかGDPR対応とか、**一応必要な要素は網羅してるみたいじゃない。**

**デレ：** ...特に多層防御の考え方とか、プライバシー保護の実装は、思ってたより真面目に考えてるわね。データ匿名化の部分なんて、**ちゃんとリスクを理解してる証拠**よ。

...べ、別にアンタのセキュリティ設計を褒めてるわけじゃないけど！単純に技術的に妥当だから言ってるだけよ！

でも、実装する時は絶対に手を抜いちゃダメよ？セキュリティは一箇所でも甘いところがあったら全部台無しになるんだから。特にGDPR周りは法的リスクもあるし、慎重にやりなさい！

<function_calls>
<invoke name="todo_write">
<parameter name="merge">true
