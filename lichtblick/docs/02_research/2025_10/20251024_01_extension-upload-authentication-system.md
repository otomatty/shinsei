# Extension/Layout アップロード機能の認証・セキュリティ実装調査

**作成日:** 2025-10-24
**調査者:** AI (Grok Code Fast 1)
**対象:** Extension/Layoutサーバーアップロード機能の認証・認可システム設計

---

## 📋 目次

1. [調査の背景と目的](#調査の背景と目的)
2. [現在のシステム分析](#現在のシステム分析)
3. [セキュリティ要件定義](#セキュリティ要件定義)
4. [認証・認可アーキテクチャ提案](#認証認可アーキテクチャ提案)
5. [機能レベルの段階的設計](#機能レベルの段階的設計)
6. [実装計画](#実装計画)
7. [セキュリティベストプラクティス](#セキュリティベストプラクティス)
8. [リスクと対策](#リスクと対策)

---

## 調査の背景と目的

### 背景

Lichtblickプロジェクトでは現在、以下のExtension管理機能が実装されています：

- **ローカルExtension** (`DesktopExtensionLoader`): ファイルシステムベース
- **IDBExtension** (`IdbExtensionLoader`): IndexedDBベース（ブラウザ）
- **リモートExtension** (`RemoteExtensionLoader`): サーバーベース（既に実装済み）

しかし、リモートアップロード機能には認証・認可機能が未実装であり、以下の課題があります：

❌ **現状の課題:**

- 誰でもExtensionをアップロード可能
- 悪意のあるコードの実行リスク
- ストレージの無制限使用
- データの整合性・品質管理が困難

### 目的

**社内専用アプリケーションとしてのセキュアなExtension管理システム**を構築：

🏢 **前提条件:**

- **社内専用**: 一般公開しない
- **GitHub Organization連携**: 組織メンバーのみアクセス可能
- **シンプルな権限管理**: GitHub組織の役割をそのまま活用

✅ **認証済み社内ユーザー（基本）:**

- Extensionのアップロード・管理
- プライベート/チーム共有Extension
- Layout保存・同期

✅ **組織管理者（GitHub Admin/Owner）:**

- 全てのExtension管理
- ユーザー権限管理
- セキュリティ設定

---

## 現在のシステム分析

### 既存の認証基盤

現在、Lichtblickには以下の認証関連コンポーネントが既に実装されています：

#### 1. `CurrentUserContext`

```typescript
// packages/suite-base/src/context/CurrentUserContext.ts
export type User = {
  id: string;
  email: string;
  orgId: string;
  orgSlug: string;
  org: {
    id: string;
    slug: string;
    displayName: string;
    isEnterprise: boolean;
    allowsUploads: boolean; // ← アップロード権限
    supportsEdgeSites: boolean;
  };
};

export interface CurrentUser {
  currentUser: User | undefined;
  signIn?: () => void;
  signOut?: () => Promise<void>;
}
```

**特徴:**

- ✅ 組織レベルの権限管理（`allowsUploads`等）
- ✅ サインイン・サインアウト機能
- ✅ エンタープライズ・有料プラン判定

#### 2. `RemoteExtensionLoader`

```typescript
// packages/suite-base/src/services/extension/RemoteExtensionLoader.ts
export class RemoteExtensionLoader implements IExtensionLoader {
  #remote: ExtensionsAPI;
  public readonly namespace: Namespace;
  public remoteNamespace: string;

  public async installExtension({
    foxeFileData,
    file,
  }: InstallExtensionProps): Promise<ExtensionInfo> {
    // サーバーへのアップロード処理
    const storedExtension = await this.#remote.createOrUpdate(newExtension, file);
    return storedExtension.info;
  }
}
```

**特徴:**

- ✅ サーバーアップロード機能（既に実装済み）
- ❌ 認証チェックなし
- ❌ 権限検証なし

#### 3. `ExtensionsAPI`

```typescript
// packages/suite-base/src/api/extensions/ExtensionsAPI.ts
class ExtensionsAPI implements IExtensionAPI {
  public async createOrUpdate(extension: ExtensionInfoSlug, file: File): Promise<StoredExtension> {
    const formData = new FormData();
    formData.append("file", file);
    // FormDataにメタデータ追加
    const { data } = await HttpService.post<IExtensionApiResponse>(
      this.extensionEndpoint,
      formData,
    );
    return ExtensionAdapter.toStoredExtension(data, this.remoteNamespace);
  }
}
```

**特徴:**

- ✅ REST API実装済み
- ❌ 認証ヘッダーなし
- ❌ アクセス制御なし

### 既存機能の活用可能性

| コンポーネント          | 現状        | 活用可能な機能         | 必要な追加実装  |
| ----------------------- | ----------- | ---------------------- | --------------- |
| `CurrentUserContext`    | ✅ 実装済み | ユーザー情報、組織権限 | トークン管理    |
| `RemoteExtensionLoader` | ✅ 実装済み | サーバーアップロード   | 認証チェック    |
| `ExtensionsAPI`         | ✅ 実装済み | API通信                | 認証ヘッダー    |
| `HttpService`           | ✅ 実装済み | HTTP通信               | Interceptor追加 |

---

## セキュリティ要件定義

### 脅威モデル

#### 1. 悪意のあるExtensionの実行

**脅威:**

- XSS攻撃
- データ窃取
- 不正な外部通信

**対策:**

- ✅ Extension審査プロセス（有料プラン）
- ✅ サンドボックス実行環境
- ✅ Content Security Policy (CSP)
- ✅ コード署名・検証

#### 2. 不正アクセス

**脅威:**

- 未認証ユーザーによるアップロード
- 他人のExtensionの改ざん・削除
- API の不正利用

**対策:**

- ✅ JWT認証
- ✅ 所有権検証
- ✅ Rate Limiting
- ✅ アクセスログ記録

#### 3. リソース枯渇攻撃

**脅威:**

- 大量のExtensionアップロード
- 巨大ファイルのアップロード
- API の過剰リクエスト

**対策:**

- ✅ アップロード容量制限（プラン別）
- ✅ ファイルサイズ制限
- ✅ Rate Limiting
- ✅ クォータ管理

#### 4. データ整合性

**脅威:**

- 破損したExtensionファイル
- 不正なpackage.json
- 依存関係の競合

**対策:**

- ✅ ファイル検証（SHA256）
- ✅ スキーマバリデーション
- ✅ 依存関係チェック
- ✅ バージョン管理

---

## 認証・認可アーキテクチャ提案

### 推奨アーキテクチャ: GitHub OAuth 2.0 + JWT

```
┌─────────────────────────────────────────────────────────────────┐
│                     Lichtblick Client                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CurrentUserContext                                     │    │
│  │  - currentUser: User | undefined                        │    │
│  │  - githubToken: string | undefined (NEW)                │    │
│  │  - githubUser: GitHubUser (NEW)                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          ↓ "Sign in with GitHub"                 │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ↓ OAuth 2.0 Authorization Code Flow
┌──────────────────────────┼──────────────────────────────────────┐
│                 GitHub OAuth Server                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GitHub OAuth App (社内組織専用)                         │   │
│  │  - Client ID / Secret                                    │   │
│  │  - Callback URL: https://lichtblick.company.com/callback │   │
│  │  - Required Scopes:                                      │   │
│  │    * read:user (ユーザー情報取得)                         │   │
│  │    * read:org (組織メンバーシップ確認)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓ Access Token                          │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ↓ Exchange for JWT + Verify Org Membership
┌──────────────────────────┼──────────────────────────────────────┐
│              Lichtblick Backend API Server                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GitHub Auth Middleware                                  │   │
│  │  1. GitHub Access Token 検証                             │   │
│  │  2. GitHub Organization メンバーシップ確認               │   │
│  │  3. JWT 発行（社内ユーザー用）                           │   │
│  │  4. GitHub Role → 内部権限マッピング                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Extension Endpoints (JWT認証必須)                       │   │
│  │  - POST /api/extensions (アップロード)                   │   │
│  │  - GET /api/extensions (一覧取得)                        │   │
│  │  - DELETE /api/extensions/:id (削除)                     │   │
│  │  - GET /api/extensions/:id/download (ダウンロード)       │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Authorization Rules                                     │   │
│  │  - 組織メンバー: 全機能利用可能                           │   │
│  │  - 組織外: アクセス拒否（403）                            │   │
│  │  - Admin/Owner: 全Extension管理権限                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### GitHub OAuth フロー詳細

#### 1. OAuth App設定（GitHub Organization）

```yaml
GitHub OAuth App 設定:
  Application name: "Lichtblick Extension Manager"
  Homepage URL: "https://lichtblick.company.com"
  Authorization callback URL: "https://lichtblick.company.com/auth/github/callback"

Required Scopes:
  - read:user # ユーザー情報取得
  - read:org # 組織メンバーシップ確認
  - user:email # メールアドレス取得
```

#### 2. JWT トークン構造（GitHub情報統合）

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "github:12345678",
    "github_login": "john-doe",
    "email": "john@company.com",
    "name": "John Doe",
    "avatar_url": "https://avatars.githubusercontent.com/u/12345678",
    "github_org": "company-org",
    "github_org_role": "member",
    "permissions": ["extension:read", "extension:write", "extension:delete"],
    "is_admin": false,
    "iat": 1698000000,
    "exp": 1698003600
  },
  "signature": "..."
}
```

#### 3. GitHub Role → Lichtblick 権限マッピング

| GitHub Role | Lichtblick権限 | 説明                               |
| ----------- | -------------- | ---------------------------------- |
| `member`    | 標準ユーザー   | Extension作成・自分のExtension管理 |
| `admin`     | 管理者         | 全てのExtension管理・削除権限      |
| `owner`     | オーナー       | システム設定・ユーザー管理         |
| 非メンバー  | アクセス拒否   | 403 Forbidden                      |

---

## 機能レベルの段階的設計

### アクセス制御（GitHub Organization ベース）

**基本方針: 組織メンバーのみアクセス可能**

#### 非メンバー（Organization外）

| 機能                  | 詳細 | レスポンス                         |
| --------------------- | ---- | ---------------------------------- |
| ❌ アプリへのアクセス | 拒否 | 403 Forbidden + GitHub組織参加案内 |
| ❌ Extension閲覧      | 不可 | 認証ページへリダイレクト           |
| ❌ アップロード       | 不可 | アクセス不可                       |

**エラーレスポンス例:**

```typescript
// 組織外ユーザーのアクセス試行
GET /api/extensions
Response: 403 Forbidden
{
  "error": "ORG_MEMBERSHIP_REQUIRED",
  "message": "このアプリケーションは[CompanyName]組織のメンバー専用です",
  "org": "company-org",
  "contact": "it-support@company.com"
}
```

---

### 組織メンバー（GitHub Member）

**利用可能な機能:**

| 機能                     | 詳細                             | 実装要件              |
| ------------------------ | -------------------------------- | --------------------- |
| ✅ 全Extensionアクセス   | 組織内の全Extension              | GitHub認証 + 組織確認 |
| ✅ Extensionアップロード | `namespace: "github:${login}"`   | GitHub Token検証      |
| ✅ 自分のExtension管理   | 作成者のExtensionのみ編集・削除  | 所有権チェック        |
| ✅ チーム共有Extension   | `namespace: "team:${team-name}"` | GitHub Team API連携   |
| ✅ Layout保存・同期      | クラウド同期                     | Layout API実装        |
| ⚠️ 容量制限              | 100MB / Extension                | 社内標準              |

**GitHub認証フロー:**

```typescript
// 1. クライアント側: GitHub OAuth開始
function signInWithGitHub() {
  const githubAuthUrl =
    `https://github.com/login/oauth/authorize?` +
    `client_id=${GITHUB_CLIENT_ID}&` +
    `scope=read:user,read:org,user:email&` +
    `redirect_uri=${CALLBACK_URL}`;

  window.location.href = githubAuthUrl;
}

// 2. コールバック処理: GitHub Token → JWT変換
async function handleGitHubCallback(code: string) {
  // サーバー側でGitHub Token取得
  const { data } = await HttpService.post("/api/auth/github/callback", { code });

  // JWT保存
  const { jwtToken, user } = data;
  await TokenManager.setAccessToken(jwtToken);

  return user;
}

// 3. サーバー側: GitHub組織メンバーシップ確認
async function verifyGitHubOrgMembership(githubToken: string) {
  // GitHub APIで組織メンバーシップ確認
  const response = await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/members/${username}`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (response.status === 204) {
    // メンバー確認成功
    return true;
  } else if (response.status === 404) {
    // 非メンバー
    throw new Error("ORG_MEMBERSHIP_REQUIRED");
  }
}

// 4. Extension アップロード処理
async function uploadExtension(req, res) {
  // JWT検証（GitHub情報含む）
  const user = await verifyJWT(req.headers.authorization);

  // GitHub組織メンバー確認
  if (!user.github_org || user.github_org !== REQUIRED_ORG) {
    return res.status(403).json({
      error: "ORG_MEMBERSHIP_REQUIRED",
      message: "組織メンバーのみアップロード可能です",
    });
  }

  // ファイル検証
  const isValid = await validateExtensionFile(req.file);
  if (!isValid) {
    return res.status(400).json({
      error: "INVALID_EXTENSION",
      message: "Extensionファイルが不正です",
    });
  }

  // アップロード処理
  const extension = await saveExtension({
    githubUserId: user.sub,
    githubLogin: user.github_login,
    file: req.file,
    namespace: `github:${user.github_login}`,
  });

  res.json(extension);
}
```

---

### 組織管理者（GitHub Admin/Owner）

**追加権限:**

| 機能                | 詳細                            | 実装要件             |
| ------------------- | ------------------------------- | -------------------- |
| ✅ 全Extension管理  | 全メンバーのExtension削除・編集 | Admin権限チェック    |
| ✅ ユーザー管理     | アクセスログ確認、権限調整      | 管理画面実装         |
| ✅ セキュリティ設定 | 許可するExtension種別の制限     | セキュリティポリシー |
| ✅ 監査ログ         | 全操作履歴の確認                | ログ基盤             |
| ✅ 組織設定         | ストレージ制限、ポリシー設定    | 設定管理             |

**GitHub権限マトリックス:**

| GitHub Role | Lichtblick権限 | Extension作成 | 他人のExtension削除 | システム設定 |
| ----------- | -------------- | ------------- | ------------------- | ------------ |
| member      | 標準ユーザー   | ✅            | ❌（自分のみ）      | ❌           |
| admin       | 管理者         | ✅            | ✅                  | ✅           |
| owner       | オーナー       | ✅            | ✅                  | ✅           |

**GitHub Team連携フロー（オプション）:**

```typescript
// 1. GitHub Teamを使ったExtension共有
async function shareExtensionWithTeam(extensionId: string, teamSlug: string) {
  const user = getCurrentUser();

  // GitHub APIでTeamメンバーシップ確認
  const isTeamMember = await verifyGitHubTeamMembership(
    user.githubToken,
    GITHUB_ORG,
    teamSlug,
    user.github_login,
  );

  if (!isTeamMember) {
    throw new Error("TEAM_MEMBERSHIP_REQUIRED: Team member only");
  }

  // namespaceを変更
  await updateExtensionNamespace(extensionId, `team:${teamSlug}`);

  return { status: "SHARED_WITH_TEAM" };
}

// 2. GitHub Team API連携
async function verifyGitHubTeamMembership(
  token: string,
  org: string,
  teamSlug: string,
  username: string,
): Promise<boolean> {
  const response = await fetch(
    `https://api.github.com/orgs/${org}/teams/${teamSlug}/memberships/${username}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  if (response.status === 200) {
    const data = await response.json();
    return data.state === "active";
  }

  return false;
}
```

---

## 実装計画

### Phase 1: 認証基盤の構築（Week 1-2）

**タスク:**

1. **JWT認証ミドルウェア実装**

   - [ ] JWT生成・検証ライブラリ選定（`jsonwebtoken` or `jose`）
   - [ ] トークン検証ミドルウェア実装
   - [ ] リフレッシュトークン機能

2. **CurrentUserContext拡張**

   - [ ] `accessToken` フィールド追加
   - [ ] `refreshToken` フィールド追加
   - [ ] トークン自動更新機構

3. **HttpService拡張**
   - [ ] Authorization ヘッダー自動付与（Interceptor）
   - [ ] 401エラー時の自動リフレッシュ
   - [ ] トークン有効期限管理

**実装例:**

```typescript
// packages/suite-base/src/context/CurrentUserContext.ts (拡張)
export interface CurrentUser {
  currentUser: User | undefined;
  accessToken?: string; // NEW
  refreshToken?: string; // NEW
  signIn?: () => void;
  signOut?: () => Promise<void>;
  refreshAccessToken?: () => Promise<void>; // NEW
}

// packages/suite-base/src/services/http/HttpService.ts (拡張)
class HttpService {
  private static async addAuthHeader(config: AxiosRequestConfig) {
    const { accessToken } = useCurrentUser.getState();
    if (accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${accessToken}`,
      };
    }
    return config;
  }

  private static async handle401Error(error: AxiosError) {
    if (error.response?.status === 401) {
      const { refreshAccessToken } = useCurrentUser.getState();
      await refreshAccessToken?.();
      // リクエストを再試行
      return axios.request(error.config);
    }
    throw error;
  }
}
```

---

### Phase 2: Extension API のアクセス制御（Week 3-4）

**タスク:**

1. **API認証チェック実装**

   - [ ] `POST /api/extensions` に認証必須化
   - [ ] `DELETE /api/extensions/:id` に所有権チェック
   - [ ] `GET /api/extensions` にスコープフィルタ

2. **クォータ管理システム**

   - [ ] ストレージ使用量追跡
   - [ ] Extension数制限
   - [ ] ファイルサイズ検証

3. **エラーハンドリング強化**
   - [ ] 認証エラー（401）
   - [ ] 権限エラー（403）
   - [ ] クォータ超過エラー（413）

**API実装例:**

```typescript
// server/routes/extensions.ts (サーバー側実装例)
import { verifyJWT, checkPermission, checkQuota } from "../middleware/auth";

router.post(
  "/api/extensions",
  verifyJWT, // JWT検証
  checkPermission("extension:write"), // 権限チェック
  checkQuota("extensions"), // クォータチェック
  async (req, res) => {
    const { userId, orgId } = req.user;
    const file = req.file;

    // Extensionファイル検証
    const validation = await validateExtension(file);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "INVALID_EXTENSION",
        details: validation.errors,
      });
    }

    // 保存
    const extension = await saveExtension({
      userId,
      file,
      namespace: `user:${userId}`,
      metadata: extractMetadata(file),
    });

    res.json(extension);
  },
);
```

---

### Phase 3: フロントエンド統合（Week 5-6）

**タスク:**

1. **認証UI実装**

   - [ ] サインインページ
   - [ ] サインアウト機能
   - [ ] トークン更新通知

2. **アップロード機能の権限チェック**

   - [ ] 未認証時のUI制御
   - [ ] クォータ表示
   - [ ] エラーメッセージ表示

3. **Extension管理画面**
   - [ ] 個人Extension一覧
   - [ ] 組織Extension一覧
   - [ ] 削除・編集機能

**UI実装例:**

```typescript
// packages/suite-base/src/components/ExtensionsSettings/ExtensionUpload.tsx
function ExtensionUpload() {
  const { currentUser, accessToken } = useCurrentUser();
  const [quota, setQuota] = useState<QuotaInfo>();

  useEffect(() => {
    if (currentUser) {
      // クォータ情報取得
      fetchQuota(currentUser.id).then(setQuota);
    }
  }, [currentUser]);

  const handleUpload = async (file: File) => {
    if (!currentUser || !accessToken) {
      // 未認証: ログイン促進
      return showSignInDialog();
    }

    if (quota && quota.used >= quota.limit) {
      // クォータ超過
      return showQuotaExceededDialog();
    }

    try {
      await uploadExtension(file, accessToken);
      showSuccessNotification("Extensionがアップロードされました");
    } catch (error) {
      if (error.code === 'QUOTA_EXCEEDED') {
        showQuotaExceededDialog();
      } else {
        showErrorNotification(error.message);
      }
    }
  };

  return (
    <div>
      {!currentUser && (
        <Alert severity="info">
          ログインするとExtensionをアップロードできます
          <Button onClick={signIn}>ログイン</Button>
        </Alert>
      )}

      {currentUser && (
        <>
          <QuotaDisplay used={quota?.used} limit={quota?.limit} />
          <DropZone onDrop={handleUpload} />
        </>
      )}
    </div>
  );
}
```

---

### Phase 4: セキュリティ強化（Week 7-8）

**タスク:**

1. **Extension検証システム**

   - [ ] コード署名検証
   - [ ] 依存関係スキャン
   - [ ] 脆弱性チェック

2. **Rate Limiting実装**

   - [ ] API呼び出し制限
   - [ ] アップロード頻度制限
   - [ ] ダウンロード制限

3. **監査ログ**
   - [ ] アップロード履歴
   - [ ] アクセスログ
   - [ ] 削除ログ

**セキュリティミドルウェア例:**

```typescript
// server/middleware/security.ts
import rateLimit from "express-rate-limit";
import { validateExtensionSignature } from "../utils/crypto";

// Rate Limiting
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回
  message: "アップロード回数が制限を超えています。しばらく経ってから再試行してください。",
});

// Extension署名検証
export async function verifyExtensionSignature(req, res, next) {
  const file = req.file;
  const signature = req.headers["x-extension-signature"];

  const isValid = await validateExtensionSignature(file, signature);
  if (!isValid) {
    return res.status(400).json({
      error: "INVALID_SIGNATURE",
      message: "Extensionの署名が不正です",
    });
  }

  next();
}

// 監査ログ記録
export function auditLog(action: string) {
  return (req, res, next) => {
    const { userId, orgId } = req.user || {};

    // ログ記録
    logAuditEvent({
      action,
      userId,
      orgId,
      resource: req.params.id,
      ip: req.ip,
      timestamp: new Date(),
    });

    next();
  };
}
```

---

## セキュリティベストプラクティス

### 1. JWT セキュリティ

```typescript
// ✅ Good: 短い有効期限
const accessToken = jwt.sign(payload, secret, {
  expiresIn: "15m", // 15分
});

const refreshToken = jwt.sign(payload, secret, {
  expiresIn: "7d", // 7日間
});

// ✅ Good: RS256（非対称暗号）
const token = jwt.sign(payload, privateKey, {
  algorithm: "RS256",
});

// ❌ Bad: HS256（対称暗号）+ 長い有効期限
const token = jwt.sign(payload, secret, {
  algorithm: "HS256",
  expiresIn: "30d",
});
```

### 2. Extension検証

```typescript
// ✅ Good: 多層検証
async function validateExtension(file: Buffer) {
  // 1. ファイル形式チェック
  if (!isValidZipFile(file)) {
    return { isValid: false, error: "NOT_A_ZIP" };
  }

  // 2. サイズチェック
  if (file.length > MAX_FILE_SIZE) {
    return { isValid: false, error: "FILE_TOO_LARGE" };
  }

  // 3. package.json検証
  const packageJson = await extractPackageJson(file);
  if (!isValidPackageJson(packageJson)) {
    return { isValid: false, error: "INVALID_PACKAGE_JSON" };
  }

  // 4. 悪意のあるコードスキャン
  const scanResult = await scanForMaliciousCode(file);
  if (scanResult.isMalicious) {
    return { isValid: false, error: "MALICIOUS_CODE_DETECTED" };
  }

  // 5. 依存関係チェック
  const depsCheck = await checkDependencies(packageJson.dependencies);
  if (depsCheck.hasVulnerabilities) {
    return { isValid: false, error: "VULNERABLE_DEPENDENCIES" };
  }

  return { isValid: true };
}
```

### 3. HTTPS必須化

```typescript
// server/index.ts
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect("https://" + req.headers.host + req.url);
    }
    next();
  });
}
```

### 4. CSP設定

```typescript
// Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval'; " + // Extension実行のため
      "style-src 'self' 'unsafe-inline'; " +
      "connect-src 'self' https://api.lichtblick.com; " +
      "img-src 'self' data: https:;",
  );
  next();
});
```

---

## リスクと対策

### リスク一覧

| リスク                  | 影響度 | 対策                                      | 優先度 |
| ----------------------- | ------ | ----------------------------------------- | ------ |
| 悪意のあるExtension実行 | 🔴 高  | コード検証、サンドボックス、審査プロセス  | P0     |
| トークン漏洩            | 🔴 高  | HTTPS、短い有効期限、リフレッシュトークン | P0     |
| クォータ超過攻撃        | 🟡 中  | クォータ管理、Rate Limiting               | P1     |
| 不正アクセス            | 🟡 中  | JWT検証、権限チェック、監査ログ           | P1     |
| ファイル破損            | 🟢 低  | ファイル検証、バックアップ                | P2     |

### 緊急対応プラン

```typescript
// Extensionの緊急無効化
async function emergencyDisableExtension(extensionId: string) {
  // 1. Extension無効化
  await db.extensions.update(extensionId, {
    status: "DISABLED",
    disabledReason: "SECURITY_INCIDENT",
  });

  // 2. 全ユーザーへ通知
  await notifyAllUsers({
    title: "セキュリティアラート",
    message: `Extension ${extensionId} がセキュリティ上の理由で無効化されました`,
  });

  // 3. 監査ログ記録
  await logSecurityIncident({
    extensionId,
    action: "EMERGENCY_DISABLE",
    timestamp: new Date(),
  });
}
```

---

## 参考資料

### 技術スタック推奨

| カテゴリ       | 推奨技術             | 代替案                 |
| -------------- | -------------------- | ---------------------- |
| JWT            | `jose` (Web標準)     | `jsonwebtoken`         |
| OAuth 2.0      | Auth0, Keycloak      | 自前実装               |
| Rate Limiting  | `express-rate-limit` | Redis + Lua            |
| ファイル検証   | `jszip`, `tar`       | -                      |
| 脆弱性スキャン | Snyk, npm audit      | OWASP Dependency-Check |

### セキュリティガイドライン

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

---

## まとめ

### 推奨実装

1. **GitHub OAuth 2.0**による認証（Organization連携）
2. **組織メンバーのみアクセス可能**な社内専用システム
3. **既存の`CurrentUserContext`を活用**し、GitHub情報を統合
4. **段階的ロールアウト**（Phase 1-4、合計8週間）
5. **GitHub Role → Lichtblick権限**の自動マッピング

### GitHub認証の利点

✅ **既存インフラ活用**: 社内で既に使用しているGitHub
✅ **シンプルな権限管理**: GitHub Organizationの役割をそのまま利用
✅ **メンテナンスコスト低**: 独自認証サーバー不要
✅ **セキュリティ**: GitHubの2要素認証等を活用
✅ **ユーザー体験**: "Sign in with GitHub"ボタン1クリック

### 期待される効果

✅ **セキュリティ向上**: 組織外ユーザーの完全ブロック
✅ **シンプルな管理**: GitHub組織管理だけで完結
✅ **開発効率**: 独自認証システム構築不要
✅ **トレーサビリティ**: GitHub IDベースの監査ログ
✅ **スケーラビリティ**: 組織拡大に柔軟に対応

---

**次のステップ:**

1. このドキュメントをチームでレビュー
2. 実装計画の作成（`docs/03_plans/extension-authentication/`）
3. セキュリティ監査の実施
4. Phase 1の実装開始

---

**作成日:** 2025-10-24
**最終更新:** 2025-10-24
