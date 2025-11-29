# Extension認証・アップロード機能 実装計画

**作成日:** 2025-10-24
**対象機能:** Extension/Layoutサーバーアップロードの認証・認可システム
**関連調査:** [docs/02_research/2025_10/20251024_01_extension-upload-authentication-system.md](../../02_research/2025_10/20251024_01_extension-upload-authentication-system.md)

---

## 📋 目次

1. [実装概要](#実装概要)
2. [Phase 1: 認証基盤構築](#phase-1-認証基盤構築)
3. [Phase 2: API アクセス制御](#phase-2-api-アクセス制御)
4. [Phase 3: フロントエンド統合](#phase-3-フロントエンド統合)
5. [Phase 4: セキュリティ強化](#phase-4-セキュリティ強化)
6. [依存関係マップ](#依存関係マップ)
7. [テスト計画](#テスト計画)

---

## 実装概要

### 目標

**社内専用アプリケーションとして、GitHub Organization連携による認証・認可システムを構築する。**

組織メンバーのみアクセス可能にしつつ、シンプルな権限管理でExtension管理機能を提供。

### アーキテクチャ要点

- **認証プロバイダー**: GitHub OAuth 2.0
- **組織制限**: 特定のGitHub Organizationメンバーのみ
- **権限管理**: GitHubの役割（member/admin/owner）をそのまま活用
- **トークン管理**: GitHub Token → JWT変換
- **アクセス制御**: 組織外ユーザーは全てブロック

### 期間

**合計: 8週間**

- Phase 1: Week 1-2（認証基盤）
- Phase 2: Week 3-4（API制御）
- Phase 3: Week 5-6（UI統合）
- Phase 4: Week 7-8（セキュリティ）

### マイルストーン

- [ ] Week 2: JWT認証が動作
- [ ] Week 4: 認証付きExtensionアップロードが動作
- [ ] Week 6: UI完成、E2Eテスト完了
- [ ] Week 8: セキュリティ監査完了、本番リリース

---

## Phase 1: 認証基盤構築（Week 1-2）

### 1.1 JWT トークン管理実装

#### タスク: `packages/suite-base/src/services/auth/` 新規作成

**ファイル構成:**

```
packages/suite-base/src/services/auth/
├── AuthService.ts           # 認証サービス本体
├── AuthService.test.ts      # テストコード
├── AuthService.spec.md      # 仕様書
├── TokenManager.ts          # トークン管理
├── TokenManager.test.ts
├── types.ts                 # 型定義
└── index.ts                 # エクスポート
```

**実装内容:**

```typescript
// packages/suite-base/src/services/auth/AuthService.ts

/**
 * Authentication Service
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ src/context/CurrentUserContext.tsx
 *   ├─ src/providers/CurrentUserProvider.tsx
 *   └─ src/services/http/HttpService.ts
 *
 * Dependencies (依存先):
 *   ├─ ./TokenManager.ts
 *   ├─ ./types.ts
 *   └─ @lichtblick/suite-base/services/http/HttpService.ts
 *
 * Related Files:
 *   ├─ Spec: ./AuthService.spec.md
 *   └─ Tests: ./AuthService.test.ts
 */

import { TokenManager } from "./TokenManager";
import { AuthTokens, UserCredentials } from "./types";
import HttpService from "../http/HttpService";

export class AuthService {
  private tokenManager: TokenManager;

  constructor() {
    this.tokenManager = new TokenManager();
  }

  /**
   * ユーザー認証を実行し、トークンを取得
   */
  async signIn(credentials: UserCredentials): Promise<AuthTokens> {
    const { data } = await HttpService.post<AuthTokens>("/api/auth/signin", credentials);

    // トークンを保存
    await this.tokenManager.setTokens(data);

    return data;
  }

  /**
   * リフレッシュトークンで新しいアクセストークンを取得
   */
  async refreshAccessToken(): Promise<string> {
    const refreshToken = await this.tokenManager.getRefreshToken();

    if (!refreshToken) {
      throw new Error("REFRESH_TOKEN_NOT_FOUND");
    }

    const { data } = await HttpService.post<AuthTokens>("/api/auth/refresh", {
      refreshToken,
    });

    await this.tokenManager.setAccessToken(data.accessToken);

    return data.accessToken;
  }

  /**
   * サインアウト処理
   */
  async signOut(): Promise<void> {
    await this.tokenManager.clearTokens();
  }

  /**
   * 現在のアクセストークンを取得
   */
  async getAccessToken(): Promise<string | undefined> {
    return await this.tokenManager.getAccessToken();
  }
}
```

```typescript
// packages/suite-base/src/services/auth/types.ts

/**
 * GitHub User Information
 */
export interface GitHubUser {
  id: number;
  login: string;
  email: string;
  name: string;
  avatar_url: string;
  org: string;
  org_role: "member" | "admin" | "owner";
}

/**
 * Authentication Tokens
 */
export interface AuthTokens {
  jwtToken: string;
  expiresIn: number;
}
```

#### チェックリスト

- [ ] `GitHubAuthService.ts` 実装
- [ ] `TokenManager.ts` 実装
- [ ] `types.ts` 型定義
- [ ] `GitHubAuthService.spec.md` 作成
- [ ] `GitHubAuthService.test.ts` 実装（カバレッジ ≥ 80%）
- [ ] `TokenManager.test.ts` 実装---

### 1.3 CurrentUserContext 拡張（GitHub対応）

#### タスク: `packages/suite-base/src/context/CurrentUserContext.ts` 修正

**変更内容:**

````typescript
// packages/suite-base/src/context/CurrentUserContext.ts

import { GitHubAuthService } from "@lichtblick/suite-base/services/auth";

/**
 * GitHub User Information
 */
export interface GitHubUser {
  id: number;
  login: string;
  email: string;
  name: string;
  avatar_url: string;
  org: string;
  org_role: 'member' | 'admin' | 'owner';
}

/**
 * 現在のユーザー情報インターフェース（GitHub対応版）
 */
export interface CurrentUser {
  /** 現在のユーザー詳細情報（未認証時は undefined） */
  currentUser: User | undefined;

  /** GitHub ユーザー情報（NEW） */
  githubUser?: GitHubUser;

  /** JWT アクセストークン（NEW） */
  accessToken?: string;

  /** Sign in with GitHub */
  signInWithGitHub?: () => void;

  /** サインアウト関数 */
  signOut?: () => Promise<void>;
}
```#### タスク: `packages/suite-base/src/providers/CurrentUserProvider.tsx` 作成

```typescript
// packages/suite-base/src/providers/CurrentUserProvider.tsx

/**
 * Current User Provider
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ src/index.tsx
 *   └─ src/App.tsx
 *
 * Dependencies (依存先):
 *   ├─ ../context/CurrentUserContext.ts
 *   ├─ ../services/auth/AuthService.ts
 *   └─ ../services/http/HttpService.ts
 *
 * Related Files:
 *   ├─ Spec: ./CurrentUserProvider.spec.md
 *   └─ Tests: ./CurrentUserProvider.test.tsx
 */

import React, { useState, useEffect, useCallback } from "react";
import { CurrentUserContext, CurrentUser, User } from "../context/CurrentUserContext";
import { AuthService } from "../services/auth";

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | undefined>();
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const authService = new AuthService();

  useEffect(() => {
    // 初期化: 保存されているトークンを読み込み
    authService.getAccessToken().then((token) => {
      if (token) {
        setAccessToken(token);
        // トークンからユーザー情報を取得
        fetchCurrentUser(token);
      }
    });
  }, []);

  const fetchCurrentUser = async (token: string) => {
    try {
      const { data } = await HttpService.get<User>('/api/auth/me', undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setAccessToken(undefined);
    }
  };

  const signIn = useCallback(async (credentials: UserCredentials) => {
    const tokens = await authService.signIn(credentials);
    setAccessToken(tokens.accessToken);
    await fetchCurrentUser(tokens.accessToken);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setAccessToken(undefined);
    setCurrentUser(undefined);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const newToken = await authService.refreshAccessToken();
    setAccessToken(newToken);
  }, []);

  const value: CurrentUser = {
    currentUser,
    accessToken,
    signIn,
    signOut,
    refreshAccessToken,
  };

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}
````

#### チェックリスト

- [ ] `CurrentUserContext.ts` 型定義拡張
- [ ] `CurrentUserProvider.tsx` 実装
- [ ] `CurrentUserProvider.spec.md` 作成
- [ ] `CurrentUserProvider.test.tsx` 実装

---

### 1.3 HttpService にインターセプター追加

#### タスク: `packages/suite-base/src/services/http/HttpService.ts` 修正

**変更内容:**

```typescript
// packages/suite-base/src/services/http/HttpService.ts

/**
 * HTTP Service (拡張版)
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ src/api/extensions/ExtensionsAPI.ts
 *   ├─ src/services/auth/AuthService.ts
 *   └─ ... (多数のAPIクライアント)
 *
 * Dependencies (依存先):
 *   ├─ axios
 *   └─ @lichtblick/suite-base/context/CurrentUserContext.ts (NEW)
 */

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { useCurrentUser } from "../context/CurrentUserContext";

class HttpService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
    });

    // リクエストインターセプター: 認証ヘッダー自動付与
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const { accessToken } = useCurrentUser.getState();

        if (accessToken) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${accessToken}`,
          };
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    // レスポンスインターセプター: 401エラー時の自動リフレッシュ
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const { refreshAccessToken } = useCurrentUser.getState();
            await refreshAccessToken?.();

            // リクエストを再試行
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            // リフレッシュ失敗: ログアウト
            const { signOut } = useCurrentUser.getState();
            await signOut?.();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  // 既存のメソッド（get, post, delete等）はそのまま
}
```

#### チェックリスト

- [ ] リクエストインターセプター実装
- [ ] レスポンスインターセプター実装
- [ ] 401エラー自動リフレッシュ機構
- [ ] `HttpService.test.ts` 更新

---

## Phase 2: API アクセス制御（Week 3-4）

### 2.1 ExtensionsAPI 認証対応

#### タスク: `packages/suite-base/src/api/extensions/ExtensionsAPI.ts` 修正

**変更内容:**

```typescript
// packages/suite-base/src/api/extensions/ExtensionsAPI.ts

class ExtensionsAPI implements IExtensionAPI {
  // ... 既存コード

  public async createOrUpdate(extension: ExtensionInfoSlug, file: File): Promise<StoredExtension> {
    // 認証チェック（HttpServiceが自動的にヘッダー付与）
    // サーバー側で401/403エラーが返される

    const formData = new FormData();
    formData.append("file", file);

    const body: CreateOrUpdateBody = {
      description: extension.info.description,
      displayName: extension.info.displayName,
      extensionId: extension.info.id,
      homepage: extension.info.homepage,
      keywords: extension.info.keywords,
      license: extension.info.license,
      name: extension.info.name,
      namespace: this.remoteNamespace,
      publisher: extension.info.publisher,
      qualifiedName: extension.info.qualifiedName,
      scope: "org",
      version: extension.info.version,
    };

    Object.entries(body).forEach(([key, value]) => {
      if (typeof value === "object") {
        formData.append(key, JSON.stringify(value) ?? "");
      } else if (value) {
        formData.append(key, String(value));
      }
    });

    try {
      const { data } = await HttpService.post<IExtensionApiResponse>(
        this.extensionEndpoint,
        formData,
      );
      return ExtensionAdapter.toStoredExtension(data, this.remoteNamespace);
    } catch (error) {
      // エラーハンドリング強化
      if (error instanceof HttpError) {
        if (error.status === 401) {
          throw new Error("AUTHENTICATION_REQUIRED: ログインしてください");
        }
        if (error.status === 403) {
          throw new Error("PERMISSION_DENIED: アップロード権限がありません");
        }
        if (error.status === 413) {
          throw new Error("QUOTA_EXCEEDED: ストレージ容量を超えています");
        }
      }
      throw error;
    }
  }
}
```

#### チェックリスト

- [ ] エラーハンドリング強化
- [ ] 401/403/413 エラーの適切な処理
- [ ] `ExtensionsAPI.test.ts` 更新

---

### 2.2 RemoteExtensionLoader 修正

#### タスク: `packages/suite-base/src/services/extension/RemoteExtensionLoader.ts` 修正

**変更内容:**

```typescript
// packages/suite-base/src/services/extension/RemoteExtensionLoader.ts

export class RemoteExtensionLoader implements IExtensionLoader {
  // ... 既存コード

  public async installExtension({
    foxeFileData,
    file,
  }: InstallExtensionProps): Promise<ExtensionInfo> {
    log.debug("[Remote] Installing extension", foxeFileData, file);

    if (!file) {
      throw new Error("File is required to install extension in server.");
    }

    // 認証チェックはExtensionsAPI内で実施される

    const decompressedData = await decompressFile(foxeFileData);
    const rawPackageFile = await extractFoxeFileContent(decompressedData, ALLOWED_FILES.PACKAGE);
    if (!rawPackageFile) {
      throw new Error(`Extension is corrupted: missing ${ALLOWED_FILES.PACKAGE}`);
    }

    const rawInfo = validatePackageInfo(JSON.parse(rawPackageFile) as Partial<ExtensionInfo>);
    const normalizedPublisher = rawInfo.publisher.replace(/[^A-Za-z0-9_\s]+/g, "");

    const newExtension: StoredExtension = {
      content: foxeFileData,
      info: {
        ...rawInfo,
        id: `${normalizedPublisher}.${rawInfo.name}`,
        namespace: this.namespace,
        qualifiedName: qualifiedName(this.namespace, normalizedPublisher, rawInfo),
        readme: (await extractFoxeFileContent(decompressedData, ALLOWED_FILES.README)) ?? "",
        changelog: (await extractFoxeFileContent(decompressedData, ALLOWED_FILES.CHANGELOG)) ?? "",
      },
      remoteNamespace: this.remoteNamespace,
    };

    try {
      const storedExtension = await this.#remote.createOrUpdate(newExtension, file);
      return storedExtension.info;
    } catch (error) {
      // エラーを上位にスロー（ExtensionCatalogProviderで処理）
      log.error("[Remote] Failed to install extension:", error);
      throw error;
    }
  }
}
```

#### チェックリスト

- [ ] エラーハンドリング追加
- [ ] ログ記録強化
- [ ] `RemoteExtensionLoader.test.ts` 更新

---

## Phase 3: フロントエンド統合（Week 5-6）

### 3.1 GitHub認証UI実装

#### タスク: `packages/suite-base/src/components/Auth/` 新規作成

**ファイル構成:**

```
packages/suite-base/src/components/Auth/
├── GitHubSignInButton.tsx
├── GitHubSignInButton.test.tsx
├── GitHubSignInButton.spec.md
├── SignOutButton.tsx
├── UserMenu.tsx
└── index.ts
```

**実装例:**

````typescript
// packages/suite-base/src/components/Auth/GitHubSignInButton.tsx

/**
 * GitHub Sign In Button
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ src/components/ExtensionsSettings/ExtensionUpload.tsx
 *   └─ src/components/Navigation/UserMenu.tsx
 *
 * Dependencies (依存先):
 *   ├─ @lichtblick/suite-base/context/CurrentUserContext.ts
 *   └─ @mui/material
 *
 * Related Files:
 *   ├─ Spec: ./GitHubSignInButton.spec.md
 *   └─ Tests: ./GitHubSignInButton.test.tsx
 */

import React from "react";
import { Button } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import { useCurrentUser } from "../../context/CurrentUserContext";

export function GitHubSignInButton() {
  const { signInWithGitHub } = useCurrentUser();

  return (
    <Button
      variant="contained"
      startIcon={<GitHubIcon />}
      onClick={signInWithGitHub}
      sx={{
        backgroundColor: '#24292e',
        '&:hover': {
          backgroundColor: '#1b1f23',
        },
      }}
    >
      Sign in with GitHub
    </Button>
  );
}
```#### チェックリスト

- [ ] `GitHubSignInButton.tsx` 実装
- [ ] `SignOutButton.tsx` 実装
- [ ] `UserMenu.tsx` 実装（GitHubアバター、ログイン名表示）
- [ ] テストコード実装
- [ ] Storybook ストーリー作成

---

### 3.2 ExtensionUpload UI 修正（GitHub認証対応）

#### タスク: `packages/suite-base/src/components/ExtensionsSettings/ExtensionUpload.tsx` 作成

**実装例:**

```typescript
// packages/suite-base/src/components/ExtensionsSettings/ExtensionUpload.tsx

/**
 * Extension Upload Component (GitHub Auth)
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ src/components/ExtensionsSettings/index.tsx
 *
 * Dependencies (依存先):
 *   ├─ @lichtblick/suite-base/context/CurrentUserContext.ts
 *   ├─ @lichtblick/suite-base/providers/ExtensionCatalogProvider.tsx
 *   └─ ../Auth/GitHubSignInButton.tsx
 *
 * Related Files:
 *   ├─ Spec: ./ExtensionUpload.spec.md
 *   └─ Tests: ./ExtensionUpload.test.tsx
 */

import React, { useState } from "react";
import { Alert, Button, Box, Typography } from "@mui/material";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useExtensionCatalog } from "../../context/ExtensionCatalogContext";
import { GitHubSignInButton } from "../Auth/GitHubSignInButton";

const GITHUB_ORG = process.env.REACT_APP_GITHUB_ORG;

export function ExtensionUpload() {
  const { githubUser, accessToken } = useCurrentUser();
  const { installExtensions } = useExtensionCatalog();

  const handleFileSelect = async (file: File) => {
    if (!githubUser || !accessToken) {
      // 未認証: 本来はここには来ない（UIで制御）
      return;
    }

    try {
      const fileData = await file.arrayBuffer();
      await installExtensions([{ buffer: new Uint8Array(fileData), file }]);
      alert("Extensionがアップロードされました");
    } catch (error) {
      if (error.message.includes('ORG_MEMBERSHIP_REQUIRED')) {
        alert(`このアプリは ${GITHUB_ORG} 組織のメンバー専用です`);
      } else if (error.message.includes('PERMISSION_DENIED')) {
        alert("アップロード権限がありません");
      } else {
        alert(`エラー: ${error.message}`);
      }
    }
  };

  // 未認証ユーザーへの案内
  if (!githubUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            このアプリケーションは <strong>{GITHUB_ORG}</strong> 組織のメンバー専用です
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Extensionをアップロード・管理するにはGitHubでサインインしてください
          </Typography>
        </Alert>
        <GitHubSignInButton />
      </Box>
    );
  }

  // 認証済みユーザー
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">Extension アップロード</Typography>
        <Typography variant="body2" color="text.secondary">
          GitHub: @{githubUser.login} | Role: {githubUser.org_role}
        </Typography>
      </Box>

      <input
        type="file"
        accept=".foxe"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        style={{ marginTop: 16 }}
      />
    </Box>
  );
}
```#### チェックリスト

- [ ] `ExtensionUpload.tsx` 実装
- [ ] `QuotaDisplay.tsx` 実装
- [ ] エラーハンドリング強化
- [ ] テストコード実装

---

## Phase 4: セキュリティ強化（Week 7-8）

### 4.1 Extension検証システム

#### タスク: `packages/suite-base/src/services/extension/validation/` 新規作成

**ファイル構成:**

````

packages/suite-base/src/services/extension/validation/
├── ExtensionValidator.ts
├── ExtensionValidator.test.ts
├── ExtensionValidator.spec.md
├── SecurityScanner.ts
└── index.ts

````

**実装例:**

```typescript
// packages/suite-base/src/services/extension/validation/ExtensionValidator.ts

export class ExtensionValidator {
  async validate(file: Uint8Array): Promise<ValidationResult> {
    const results: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // 1. ファイル形式チェック
    if (!this.isValidZipFile(file)) {
      results.isValid = false;
      results.errors.push("NOT_A_ZIP_FILE");
      return results;
    }

    // 2. サイズチェック
    if (file.length > MAX_FILE_SIZE) {
      results.isValid = false;
      results.errors.push(`FILE_TOO_LARGE: ${file.length} bytes`);
      return results;
    }

    // 3. package.json検証
    const packageJson = await this.extractPackageJson(file);
    if (!this.isValidPackageJson(packageJson)) {
      results.isValid = false;
      results.errors.push("INVALID_PACKAGE_JSON");
    }

    // 4. 悪意のあるコードスキャン（基本的なパターンマッチング）
    const codeAnalysis = await this.scanCode(file);
    if (codeAnalysis.hasSuspiciousPatterns) {
      results.warnings.push("SUSPICIOUS_CODE_DETECTED");
    }

    return results;
  }

  private async scanCode(file: Uint8Array): Promise<CodeAnalysis> {
    // 基本的な静的解析
    const suspiciousPatterns = [
      /eval\(/g,
      /Function\(/g,
      /dangerouslySetInnerHTML/g,
      /document\.write/g,
    ];

    // 実装省略
    return { hasSuspiciousPatterns: false };
  }
}
````

#### チェックリスト

- [ ] `ExtensionValidator.ts` 実装
- [ ] `SecurityScanner.ts` 実装
- [ ] テストコード実装

---

## 依存関係マップ

### 新規コンポーネント依存関係

```
┌─────────────────────────────────────────────────────────┐
│ AuthService (NEW)                                       │
│  ├─ TokenManager (NEW)                                  │
│  └─ HttpService (既存・修正)                            │
└─────────────────────────────────────────────────────────┘
                        ↑
                        │ uses
┌─────────────────────────────────────────────────────────┐
│ CurrentUserProvider (NEW)                               │
│  ├─ CurrentUserContext (既存・拡張)                     │
│  └─ AuthService (NEW)                                   │
└─────────────────────────────────────────────────────────┘
                        ↑
                        │ provides context
┌─────────────────────────────────────────────────────────┐
│ ExtensionUpload (NEW)                                   │
│  ├─ SignInDialog (NEW)                                  │
│  ├─ QuotaDisplay (NEW)                                  │
│  └─ ExtensionCatalog (既存)                             │
└─────────────────────────────────────────────────────────┘
```

---

## テスト計画

### ユニットテスト

| コンポーネント     | カバレッジ目標 | テストケース数 |
| ------------------ | -------------- | -------------- |
| AuthService        | ≥ 90%          | 15+            |
| TokenManager       | ≥ 95%          | 10+            |
| ExtensionValidator | ≥ 85%          | 20+            |
| SignInDialog       | ≥ 80%          | 12+            |
| ExtensionUpload    | ≥ 80%          | 15+            |

### 統合テスト

- [ ] サインイン→アップロード→サインアウトフロー
- [ ] トークンリフレッシュ機構
- [ ] 401エラー自動リカバリー
- [ ] クォータ超過時の挙動

### E2E テスト

- [ ] 未認証ユーザーのアップロード試行（403エラー）
- [ ] 認証済みユーザーのアップロード成功
- [ ] クォータ超過時のエラー表示
- [ ] サインアウト後の状態リセット

---

## リスク管理

| リスク              | 影響度 | 対策                       | 担当               |
| ------------------- | ------ | -------------------------- | ------------------ |
| トークン漏洩        | 高     | HTTPS必須化、短い有効期限  | セキュリティチーム |
| 悪意のあるExtension | 高     | 検証システム、審査プロセス | 開発チーム         |
| APIパフォーマンス   | 中     | Rate Limiting、キャッシュ  | インフラチーム     |

---

## 次のステップ

1. [ ] このドキュメントをチームでレビュー
2. [ ] Phase 1 の実装開始（Week 1）
3. [ ] 週次進捗レビュー設定
4. [ ] セキュリティ監査スケジュール調整

---

**作成日:** 2025-10-24
**最終更新:** 2025-10-24
**関連ドキュメント:**

- [調査レポート](../../02_research/2025_10/20251024_01_extension-upload-authentication-system.md)
