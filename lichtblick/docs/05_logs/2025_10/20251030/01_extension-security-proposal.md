# Extension セキュリティ対策提案

**作成日**: 2025-10-30
**対象**: Lichtblick Extension システム

---

## 📋 背景

Lichtblick はクライアントサイドのみで実行され、サーバーサイドの処理を持たないアプリケーションです。Extension（拡張機能）も同様にクライアントサイドで動的に読み込まれて実行されます。このため、悪意のある Extension や脆弱な Extension がユーザーのデータやシステムに影響を与えるリスクがあります。

### 現在の実装

```typescript
// packages/suite-base/src/providers/helpers/buildContributionPoints.ts (抜粋)

// new Function() による動的コード実行
const fn = new Function("module", "require", unwrappedExtensionSource);
fn(module, require, {});

// 制限された require
const require = (name: string) => {
  return { react: React, "react-dom": ReactDOM }[name];
};
```

**現在の保護機能:**

- ✅ Content Security Policy (CSP) で一部のリソースアクセスを制限
- ✅ require 関数が React と ReactDOM のみを提供
- ✅ Extension は名前空間で分離
- ⚠️ パーミッション管理なし
- ⚠️ サンドボックス化なし
- ⚠️ コード検証なし

---

## 🛡️ 提案するセキュリティ対策

### **レベル1: パーミッションベースのアクセス制御** (推奨度: ⭐⭐⭐⭐⭐)

#### 概要

Extension が使用できる機能を明示的に宣言し、ユーザーが承認する仕組みです。

#### 実装方法

**1. パーミッション型の定義**

```typescript
// packages/suite/src/index.ts

export type ExtensionPermission =
  | "panels" // パネル登録
  | "message-converters" // メッセージ変換
  | "topic-aliases" // トピックエイリアス
  | "camera-models" // カメラモデル
  | "network-access" // fetch API へのアクセス
  | "storage-access" // localStorage へのアクセス
  | "clipboard-access" // クリップボードアクセス
  | "notification-access" // 通知の送信
  | "websocket-access" // WebSocket 接続
  | "worker-access"; // Web Worker の作成

export interface ExtensionManifest {
  id: string;
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  description: string;

  /**
   * Extension が必要とするパーミッションリスト
   */
  permissions: ExtensionPermission[];

  /**
   * オプション: 各パーミッションの使用理由（ユーザーへの説明用）
   */
  permissionReasons?: Partial<Record<ExtensionPermission, string>>;

  /**
   * オプション: 信頼レベル（公式、検証済み、サードパーティ）
   */
  trustLevel?: "official" | "verified" | "community";
}
```

**2. ExtensionContext へのパーミッション統合**

```typescript
// packages/suite/src/index.ts

export interface ExtensionContext {
  readonly mode: "production" | "development" | "test";

  /**
   * この Extension に許可されたパーミッション
   */
  readonly permissions: ReadonlySet<ExtensionPermission>;

  /**
   * パーミッションチェック関数
   */
  hasPermission(permission: ExtensionPermission): boolean;

  /**
   * パーミッションがない場合に例外を投げる
   */
  requirePermission(permission: ExtensionPermission): void;

  registerPanel(params: ExtensionPanelRegistration): void;
  registerMessageConverter<Src>(args: RegisterMessageConverterArgs<Src>): void;
  registerTopicAliases(aliasFunction: TopicAliasFunction): void;
  registerCameraModel(args: RegisterCameraModelArgs): void;
}
```

**3. buildContributionPoints でのパーミッション検証**

```typescript
// packages/suite-base/src/providers/helpers/buildContributionPoints.ts

export function buildContributionPoints(
  extension: ExtensionInfo,
  unwrappedExtensionSource: string,
): ContributionPoints {
  // パーミッションセットを作成
  const permissions = new Set(extension.permissions ?? []);

  const ctx: ExtensionContext = {
    mode: extensionMode,
    permissions,

    hasPermission(permission: ExtensionPermission): boolean {
      return permissions.has(permission);
    },

    requirePermission(permission: ExtensionPermission): void {
      if (!permissions.has(permission)) {
        throw new Error(
          `Extension "${extension.qualifiedName}" does not have permission: ${permission}`,
        );
      }
    },

    registerPanel: (registration: ExtensionPanelRegistration) => {
      // パーミッションチェック
      ctx.requirePermission("panels");

      log.debug(`Extension ${extension.qualifiedName} registering panel: ${registration.name}`);
      // 既存の実装...
    },

    registerMessageConverter: <Src>(messageConverter: RegisterMessageConverterArgs<Src>) => {
      // パーミッションチェック
      ctx.requirePermission("message-converters");

      log.debug(
        `Extension ${extension.qualifiedName} registering message converter from: ${messageConverter.fromSchemaName} to: ${messageConverter.toSchemaName}`,
      );
      // 既存の実装...
    },

    // 他のメソッドも同様にパーミッションチェック
  };

  // ... 残りの実装
}
```

**4. package.json での宣言**

```json
{
  "name": "@lichtblick/my-3d-panel",
  "version": "1.0.0",
  "publisher": "lichtblick-suite",
  "displayName": "3D Visualizer Panel",
  "description": "Advanced 3D visualization for robotics data",
  "lichtblick": {
    "permissions": ["panels", "message-converters"],
    "permissionReasons": {
      "panels": "カスタム3Dビューアパネルを提供するため",
      "message-converters": "ROS1 PointCloud メッセージを ROS2 形式に変換するため"
    },
    "trustLevel": "official"
  }
}
```

**5. ユーザーへの確認ダイアログ**

```typescript
// packages/suite-base/src/components/ExtensionPermissionDialog.tsx (新規)

import { Dialog, DialogContent, DialogTitle, List, ListItem, Typography, Button } from "@mui/material";

interface ExtensionPermissionDialogProps {
  extension: ExtensionManifest;
  onApprove: () => void;
  onReject: () => void;
}

export function ExtensionPermissionDialog({
  extension,
  onApprove,
  onReject
}: ExtensionPermissionDialogProps) {
  const permissionLabels: Record<ExtensionPermission, string> = {
    "panels": "パネルの登録",
    "message-converters": "メッセージ変換機能",
    "topic-aliases": "トピック名エイリアス",
    "camera-models": "カメラモデル",
    "network-access": "ネットワークアクセス",
    "storage-access": "ローカルストレージアクセス",
    "clipboard-access": "クリップボードアクセス",
    "notification-access": "通知の送信",
    "websocket-access": "WebSocket 接続",
    "worker-access": "バックグラウンド処理",
  };

  return (
    <Dialog open>
      <DialogTitle>
        拡張機能のインストール確認
      </DialogTitle>
      <DialogContent>
        <Typography variant="h6">
          {extension.displayName} ({extension.version})
        </Typography>
        <Typography variant="body2" color="textSecondary">
          発行者: {extension.publisher}
        </Typography>

        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          以下の権限が必要です:
        </Typography>

        <List>
          {extension.permissions.map((permission) => (
            <ListItem key={permission}>
              <div>
                <Typography variant="body1">
                  ✓ {permissionLabels[permission]}
                </Typography>
                {extension.permissionReasons?.[permission] && (
                  <Typography variant="body2" color="textSecondary">
                    理由: {extension.permissionReasons[permission]}
                  </Typography>
                )}
              </div>
            </ListItem>
          ))}
        </List>

        <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
          <Button variant="contained" onClick={onApprove}>
            インストールする
          </Button>
          <Button variant="outlined" onClick={onReject}>
            キャンセル
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### **レベル2: サンドボックス化された実行環境** (推奨度: ⭐⭐⭐⭐)

#### 概要

Extension のコードを隔離された環境で実行し、グローバルオブジェクトへのアクセスを制限します。

#### 実装方法

**1. Proxy ベースのサンドボックス**

```typescript
// packages/suite-base/src/providers/helpers/extensionSandbox.ts (新規)

/**
 * Extension 実行用のサンドボックス環境を作成
 */
export function createExtensionSandbox(
  extension: ExtensionInfo,
  permissions: Set<ExtensionPermission>,
): Record<string, unknown> {
  // 許可された API のみを提供
  const sandboxGlobals: Record<string, unknown> = {
    // 常に利用可能な安全な API
    console: createSafeConsole(extension.qualifiedName),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    Array,
    Object,
    Math,
    Date,
    JSON,

    // Extension 情報
    __extensionId: extension.id,
    __extensionName: extension.qualifiedName,
  };

  // パーミッションベースで API を追加
  if (permissions.has("network-access")) {
    sandboxGlobals.fetch = createSafeFetch(extension);
  }

  if (permissions.has("storage-access")) {
    sandboxGlobals.localStorage = createSafeLocalStorage(extension);
  }

  if (permissions.has("clipboard-access")) {
    sandboxGlobals.navigator = {
      clipboard: createSafeClipboard(extension),
    };
  }

  if (permissions.has("websocket-access")) {
    sandboxGlobals.WebSocket = createSafeWebSocket(extension);
  }

  if (permissions.has("worker-access")) {
    sandboxGlobals.Worker = createSafeWorker(extension);
  }

  // 危険な API はブロック
  const blockedGlobals = {
    eval: undefined,
    Function: undefined,
    document: undefined,
    window: undefined,
    global: undefined,
    process: undefined,
    require: undefined, // カスタム require のみ許可
  };

  return { ...sandboxGlobals, ...blockedGlobals };
}

/**
 * 安全な console オブジェクト（Extension 名を自動的に付与）
 */
function createSafeConsole(extensionName: string): Console {
  const prefix = `[Extension: ${extensionName}]`;

  return {
    log: (...args: unknown[]) => console.log(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
    debug: (...args: unknown[]) => console.debug(prefix, ...args),
    info: (...args: unknown[]) => console.info(prefix, ...args),
  } as Console;
}

/**
 * 安全な fetch（Origin やレート制限付き）
 */
function createSafeFetch(extension: ExtensionInfo): typeof fetch {
  const rateLimiter = new Map<string, number>();
  const MAX_REQUESTS_PER_MINUTE = 60;

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // レート制限チェック
    const now = Date.now();
    const lastRequest = rateLimiter.get(url) ?? 0;
    if (now - lastRequest < 1000) {
      throw new Error(`Extension "${extension.qualifiedName}" is making too many requests`);
    }
    rateLimiter.set(url, now);

    // 許可されたドメインのみアクセス可能（オプション）
    const allowedDomains = extension.allowedDomains ?? [];
    if (allowedDomains.length > 0) {
      const urlObj = new URL(url);
      if (!allowedDomains.some((domain) => urlObj.hostname.endsWith(domain))) {
        throw new Error(`Extension "${extension.qualifiedName}" is not allowed to access ${url}`);
      }
    }

    // 実際の fetch を実行
    return fetch(input, init);
  };
}

/**
 * 安全な localStorage（Extension 専用の名前空間）
 */
function createSafeLocalStorage(extension: ExtensionInfo): Storage {
  const prefix = `extension:${extension.id}:`;

  return {
    getItem(key: string): string | null {
      return localStorage.getItem(prefix + key);
    },
    setItem(key: string, value: string): void {
      localStorage.setItem(prefix + key, value);
    },
    removeItem(key: string): void {
      localStorage.removeItem(prefix + key);
    },
    clear(): void {
      // Extension のキーのみをクリア
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
      keys.forEach((key) => localStorage.removeItem(key));
    },
    key(index: number): string | null {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
      return keys[index] ?? null;
    },
    get length(): number {
      return Object.keys(localStorage).filter((k) => k.startsWith(prefix)).length;
    },
  };
}
```

**2. サンドボックスを使用したコード実行**

```typescript
// packages/suite-base/src/providers/helpers/buildContributionPoints.ts

export function buildContributionPoints(
  extension: ExtensionInfo,
  unwrappedExtensionSource: string,
): ContributionPoints {
  // ... 既存のコード ...

  const permissions = new Set(extension.permissions ?? []);

  // サンドボックス環境を作成
  const sandbox = createExtensionSandbox(extension, permissions);

  try {
    // サンドボックス内で実行
    const fn = new Function(...Object.keys(sandbox), "module", "require", unwrappedExtensionSource);

    fn(...Object.values(sandbox), module, require);

    const wrappedExtensionModule = module.exports as ExtensionModule;
    wrappedExtensionModule.activate(ctx);
  } catch (err: unknown) {
    log.error(`Extension ${extension.qualifiedName} failed to load:`, err);
  }

  // ... 残りのコード ...
}
```

---

### **レベル3: CSP (Content Security Policy) の強化** (推奨度: ⭐⭐⭐⭐)

#### 概要

ブラウザレベルでのセキュリティポリシーを強化します（既に一部実装済み）。

#### 実装方法

**現在の CSP 設定（Electron）:**

```typescript
// packages/suite-desktop/src/main/index.ts (既存)

const contentSecurityPolicy: Record<string, string> = {
  "default-src": "'self'",
  "script-src": `'self' 'unsafe-inline' 'unsafe-eval'`,
  "worker-src": `'self' blob:`,
  "style-src": "'self' 'unsafe-inline'",
  "connect-src": "'self' ws: wss: http: https: package: blob: data: file:",
  "font-src": "'self' data:",
  "img-src": "'self' data: https: package: x-foxglove-converted-tiff: http:",
  "media-src": "'self' data: https: http: blob: file:",
};
```

**推奨: Extension 専用の CSP**

```typescript
// Extension ロード時に動的に CSP を調整

function buildExtensionCSP(extension: ExtensionInfo): string {
  const policies: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'"],
    "style-src": ["'self'", "'unsafe-inline'"], // React の inline style 用
    "connect-src": ["'self'"],
    "img-src": ["'self'", "data:"],
  };

  // パーミッションベースで CSP を調整
  if (extension.permissions?.includes("network-access")) {
    policies["connect-src"].push("https:", "http:");
  }

  if (extension.permissions?.includes("websocket-access")) {
    policies["connect-src"].push("ws:", "wss:");
  }

  // 許可されたドメインを追加
  if (extension.allowedDomains) {
    extension.allowedDomains.forEach((domain) => {
      policies["connect-src"].push(`https://${domain}`);
    });
  }

  return Object.entries(policies)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}
```

---

### **レベル4: コード署名と検証** (推奨度: ⭐⭐⭐)

#### 概要

Extension のコードが改ざんされていないことを検証します。

#### 実装方法

**1. 署名付き Extension の作成**

```typescript
// create-lichtblick-extension/src/sign.ts (新規)

import crypto from "crypto";
import fs from "fs/promises";

export async function signExtension(foxeFilePath: string, privateKeyPath: string): Promise<void> {
  // Extension ファイルを読み込み
  const extensionBuffer = await fs.readFile(foxeFilePath);

  // 秘密鍵を読み込み
  const privateKey = await fs.readFile(privateKeyPath, "utf-8");

  // SHA-256 ハッシュを計算
  const hash = crypto.createHash("sha256").update(extensionBuffer).digest();

  // RSA 署名を作成
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(hash);
  const signature = sign.sign(privateKey, "base64");

  // 署名を Extension に埋め込む（メタデータとして）
  const manifest = JSON.parse(extensionBuffer.toString());
  manifest.signature = signature;
  manifest.signatureAlgorithm = "RSA-SHA256";

  await fs.writeFile(foxeFilePath, JSON.stringify(manifest));

  console.log(`Extension signed: ${foxeFilePath}`);
  console.log(`Signature: ${signature.substring(0, 32)}...`);
}
```

**2. Lichtblick 側での署名検証**

```typescript
// packages/suite-base/src/services/extension/ExtensionVerifier.ts (新規)

import crypto from "crypto";

export class ExtensionVerifier {
  private publicKeys: Map<string, string> = new Map();

  constructor() {
    // 公式拡張機能の公開鍵を登録
    this.registerPublicKey("lichtblick-suite", LICHTBLICK_PUBLIC_KEY);
  }

  registerPublicKey(publisher: string, publicKey: string): void {
    this.publicKeys.set(publisher, publicKey);
  }

  async verify(
    extensionBuffer: Uint8Array,
    publisher: string,
    signature: string,
  ): Promise<boolean> {
    const publicKey = this.publicKeys.get(publisher);
    if (!publicKey) {
      // 公開鍵が登録されていない場合は検証スキップ（警告表示）
      console.warn(`No public key registered for publisher: ${publisher}`);
      return false;
    }

    try {
      // ハッシュを計算
      const hash = crypto.createHash("sha256").update(extensionBuffer).digest();

      // 署名を検証
      const verify = crypto.createVerify("RSA-SHA256");
      verify.update(hash);
      return verify.verify(publicKey, signature, "base64");
    } catch (error) {
      console.error("Signature verification failed:", error);
      return false;
    }
  }
}
```

**3. Extension インストール時の検証**

```typescript
// packages/suite-base/src/providers/ExtensionCatalogProvider.tsx

const installExtensions = async (namespace: Namespace, extensions: ExtensionData[]) => {
  const verifier = new ExtensionVerifier();

  for (const extension of extensions) {
    // 署名検証
    const manifest = parseExtensionManifest(extension.buffer);
    if (manifest.signature) {
      const isValid = await verifier.verify(
        extension.buffer,
        manifest.publisher,
        manifest.signature,
      );

      if (!isValid) {
        throw new Error(`Extension signature verification failed: ${manifest.name}`);
      }
    } else if (manifest.publisher === "lichtblick-suite") {
      // 公式拡張機能は署名必須
      throw new Error(`Official extension must be signed: ${manifest.name}`);
    }
  }

  // インストール処理続行...
};
```

---

### **レベル5: リソース制限** (推奨度: ⭐⭐⭐)

#### 概要

Extension が使用できる CPU、メモリ、ネットワーク帯域を制限します。

#### 実装方法

**1. Web Worker でのリソース制限**

```typescript
// packages/suite-base/src/providers/helpers/extensionWorkerPool.ts (新規)

export class ExtensionWorkerPool {
  private workers: Map<string, Worker> = new Map();
  private resourceUsage: Map<string, ResourceUsage> = new Map();

  async executeExtension(
    extensionId: string,
    code: string,
    timeout: number = 5000,
  ): Promise<unknown> {
    const worker = this.getOrCreateWorker(extensionId);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        worker.terminate();
        this.workers.delete(extensionId);
        reject(new Error(`Extension ${extensionId} timed out`));
      }, timeout);

      worker.onmessage = (event) => {
        clearTimeout(timer);

        // リソース使用量を記録
        this.recordResourceUsage(extensionId, event.data.resourceUsage);

        resolve(event.data.result);
      };

      worker.onerror = (error) => {
        clearTimeout(timer);
        worker.terminate();
        this.workers.delete(extensionId);
        reject(error);
      };

      worker.postMessage({ code });
    });
  }

  private getOrCreateWorker(extensionId: string): Worker {
    let worker = this.workers.get(extensionId);
    if (!worker) {
      worker = new Worker("/extension-worker.js");
      this.workers.set(extensionId, worker);
    }
    return worker;
  }

  private recordResourceUsage(extensionId: string, usage: ResourceUsage): void {
    const current = this.resourceUsage.get(extensionId) ?? {
      cpuTime: 0,
      memoryUsage: 0,
      networkRequests: 0,
    };

    this.resourceUsage.set(extensionId, {
      cpuTime: current.cpuTime + usage.cpuTime,
      memoryUsage: Math.max(current.memoryUsage, usage.memoryUsage),
      networkRequests: current.networkRequests + usage.networkRequests,
    });

    // リソース制限をチェック
    if (current.cpuTime > 10000) {
      // 10秒以上の CPU 時間
      console.warn(`Extension ${extensionId} is using too much CPU`);
    }

    if (current.memoryUsage > 100 * 1024 * 1024) {
      // 100MB 以上
      console.warn(`Extension ${extensionId} is using too much memory`);
    }
  }
}

interface ResourceUsage {
  cpuTime: number; // ミリ秒
  memoryUsage: number; // バイト
  networkRequests: number;
}
```

---

### **レベル6: 監査ログとモニタリング** (推奨度: ⭐⭐⭐)

#### 概要

Extension の動作を記録し、異常な動作を検出します。

#### 実装方法

```typescript
// packages/suite-base/src/services/extension/ExtensionAuditLogger.ts (新規)

export class ExtensionAuditLogger {
  private logs: AuditLog[] = [];

  logExtensionInstalled(extension: ExtensionInfo): void {
    this.log({
      timestamp: new Date().toISOString(),
      extensionId: extension.id,
      action: "installed",
      details: {
        version: extension.version,
        publisher: extension.publisher,
        permissions: extension.permissions,
      },
    });
  }

  logExtensionActivated(extensionId: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      extensionId,
      action: "activated",
    });
  }

  logAPICall(extensionId: string, api: string, args?: unknown): void {
    this.log({
      timestamp: new Date().toISOString(),
      extensionId,
      action: "api_call",
      details: { api, args },
    });
  }

  logNetworkRequest(extensionId: string, url: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      extensionId,
      action: "network_request",
      details: { url },
    });
  }

  logError(extensionId: string, error: Error): void {
    this.log({
      timestamp: new Date().toISOString(),
      extensionId,
      action: "error",
      details: {
        message: error.message,
        stack: error.stack,
      },
      severity: "error",
    });
  }

  private log(entry: AuditLog): void {
    this.logs.push(entry);

    // ログが多すぎる場合は古いものを削除
    if (this.logs.length > 1000) {
      this.logs.shift();
    }

    // 開発環境ではコンソールにも出力
    if (process.env.NODE_ENV === "development") {
      console.log("[Extension Audit]", entry);
    }
  }

  getLogs(extensionId?: string): AuditLog[] {
    if (extensionId) {
      return this.logs.filter((log) => log.extensionId === extensionId);
    }
    return [...this.logs];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

interface AuditLog {
  timestamp: string;
  extensionId: string;
  action: string;
  details?: Record<string, unknown>;
  severity?: "info" | "warning" | "error";
}
```

---

## 📊 実装優先度マトリックス

| セキュリティ対策                       | 実装難易度 | 効果 | 優先度     | 推奨実装時期     |
| -------------------------------------- | ---------- | ---- | ---------- | ---------------- |
| **パーミッションベースのアクセス制御** | 中         | 高   | ⭐⭐⭐⭐⭐ | フェーズ1 (即座) |
| **サンドボックス化された実行環境**     | 高         | 高   | ⭐⭐⭐⭐   | フェーズ1        |
| **CSP の強化**                         | 低         | 中   | ⭐⭐⭐⭐   | フェーズ1        |
| **コード署名と検証**                   | 中         | 中   | ⭐⭐⭐     | フェーズ2        |
| **リソース制限**                       | 高         | 中   | ⭐⭐⭐     | フェーズ2        |
| **監査ログとモニタリング**             | 低         | 低   | ⭐⭐⭐     | フェーズ2        |

---

## 🚀 実装計画

### **フェーズ1: 基本的なセキュリティ対策 (1-2週間)**

1. **パーミッション型定義の追加**

   - `packages/suite/src/index.ts` に型定義追加
   - package.json に `lichtblick.permissions` フィールド追加

2. **ExtensionContext へのパーミッション統合**

   - `hasPermission()` / `requirePermission()` メソッド追加
   - 既存の `register*` メソッドにパーミッションチェック追加

3. **ユーザー確認ダイアログの実装**

   - `ExtensionPermissionDialog` コンポーネント作成
   - Extension インストール時に表示

4. **基本的なサンドボックス実装**
   - `createExtensionSandbox()` 関数の実装
   - `createSafeConsole()`, `createSafeFetch()` などのラッパー実装

### **フェーズ2: 高度なセキュリティ対策 (2-3週間)**

5. **コード署名の実装**

   - Extension 署名ツールの作成
   - 署名検証ロジックの実装

6. **リソース制限**

   - Web Worker ベースの Extension 実行環境
   - リソース使用量の監視

7. **監査ログ**
   - Extension の動作ログ記録
   - 管理者向けのログビューア

### **フェーズ3: ドキュメント化とテスト (1週間)**

8. **開発者向けドキュメント**

   - パーミッションの使い方ガイド
   - セキュリティベストプラクティス

9. **テストケース追加**
   - パーミッションチェックのテスト
   - サンドボックスのテスト

---

## 💡 追加の推奨事項

### **1. Extension レビュープロセス**

公式マーケットプレイスに Extension を公開する前に、手動レビューを実施：

- コードの静的解析
- パーミッションの妥当性確認
- セキュリティ脆弱性のスキャン
- ユーザーデータの取り扱い確認

### **2. 信頼レベル表示**

Extension の信頼レベルを視覚的に表示：

- 🟢 **公式 (Official)**: Lichtblick チームが開発・保守
- 🟡 **検証済み (Verified)**: セキュリティレビュー済み
- 🔴 **サードパーティ (Community)**: 未検証

### **3. セキュリティポリシーの策定**

Extension 開発者向けのセキュリティポリシーを策定：

```markdown
# Extension セキュリティポリシー

## 必須事項

1. **最小権限の原則**: 必要最小限のパーミッションのみを要求
2. **データ保護**: ユーザーデータを外部に送信しない
3. **透明性**: パーミッションの使用理由を明記
4. **更新**: セキュリティ脆弱性の修正を速やかに実施

## 禁止事項

- ユーザーの同意なくデータを収集・送信
- 悪意のあるコードの実行
- 他の Extension や Lichtblick 本体への干渉
- システムリソースの過剰な使用
```

---

## 📝 関連ドキュメント

- **実装計画**: `docs/03_plans/extension-security/`
- **API 仕様**: `docs/04_implementation/api-specs/extension-permissions.md`
- **開発者ガイド**: `docs/guides/extension-development-security.md`

---

## ✅ 成功指標

1. **セキュリティ**: Extension による不正なデータアクセスが0件
2. **ユーザビリティ**: パーミッション確認ダイアログの承認率 > 80%
3. **パフォーマンス**: Extension ロード時間の増加 < 100ms
4. **開発者体験**: Extension 開発者からのセキュリティ関連の問い合わせ < 5件/月

---

**最終更新**: 2025-10-30
**作成者**: AI Assistant
