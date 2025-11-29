# Extension認証システム調査・仕様策定

**作業日:** 2025-10-24
**作業者:** AI (Grok Code Fast 1)
**作業時間:** 約2時間

---

## 実施した作業

### 1. 初期調査（社内専用前提なし）

- [x] 現在のExtensionシステム分析
- [x] 既存の認証基盤（CurrentUserContext等）確認
- [x] セキュリティ要件定義
- [x] 3段階アクセスモデル設計（未認証・認証済み・組織）
- [x] JWT + OAuth 2.0 アーキテクチャ提案

### 2. 仕様変更対応（社内専用・GitHub認証）

- [x] 調査ドキュメント修正

  - 一般公開前提を社内専用に変更
  - GitHub OAuth 2.0 認証に切り替え
  - GitHub Organization連携設計
  - アクセス制御を組織メンバーのみに限定

- [x] 実装計画修正
  - GitHub OAuth App セットアップ手順
  - GitHubAuthService実装計画
  - CurrentUserProviderのGitHub対応
  - UI実装（GitHubSignInButton等）

### 3. ドキュメント作成

- [x] 調査レポート作成: `docs/02_research/2025_10/20251024_01_extension-upload-authentication-system.md`
- [x] 実装計画作成: `docs/03_plans/extension-authentication/20251024_01_implementation-plan.md`
- [x] 作業ログ作成: このファイル

---

## 変更ファイル

### 新規作成

- `docs/02_research/2025_10/20251024_01_extension-upload-authentication-system.md`
- `docs/03_plans/extension-authentication/20251024_01_implementation-plan.md`
- `docs/05_logs/2025_10/20251024/01_extension-authentication-research.md`

### 修正履歴

**第1版（一般公開前提）:**

- 未認証・認証済み・組織の3段階アクセス
- JWT + OAuth 2.0 汎用設計
- クォータ管理、有料プラン対応

**第2版（社内専用・GitHub認証）:**

- 組織メンバーのみアクセス
- GitHub OAuth 2.0専用設計
- GitHub Organization連携
- シンプルな権限管理

---

## 主要な設計判断

### 1. GitHub OAuth 2.0 選択理由

| 選択肢           | メリット                     | デメリット                     | 決定 |
| ---------------- | ---------------------------- | ------------------------------ | ---- |
| 独自認証         | 完全制御可能                 | 開発コスト大、メンテナンス必要 | ❌   |
| Auth0等SaaS      | 高機能、スケーラブル         | コスト、外部依存               | ❌   |
| **GitHub OAuth** | 既存インフラ、シンプル、無料 | GitHub依存                     | ✅   |

**決定理由:**

- 社内で既にGitHub Enterprise使用
- 組織メンバー管理がGitHubで完結
- 追加コスト不要
- "Sign in with GitHub"のUXが優れている

### 2. アクセス制御方針

**採用:**

- 組織外ユーザー: 完全ブロック（403 Forbidden）
- 組織メンバー: 全機能利用可能
- Admin/Owner: 全Extension管理権限

**不採用:**

- 一般公開Extension
- クォータ制限（社内なので不要）
- 有料プラン（社内専用なので不要）

### 3. 権限マッピング

```
GitHub Role → Lichtblick権限
  member    → 標準ユーザー（Extension作成・自分のExtension管理）
  admin     → 管理者（全Extension管理）
  owner     → オーナー（システム設定）
```

---

## 技術スタック

### クライアント側

| カテゴリ     | 技術                | 用途           |
| ------------ | ------------------- | -------------- |
| 認証         | GitHub OAuth 2.0    | ユーザー認証   |
| トークン管理 | localStorage + JWT  | セッション管理 |
| HTTP通信     | axios (HttpService) | API通信        |
| 状態管理     | React Context API   | ユーザー状態   |

### サーバー側（参考実装）

| カテゴリ     | 技術                | 用途               |
| ------------ | ------------------- | ------------------ |
| OAuth処理    | GitHub OAuth API    | トークン交換       |
| JWT          | jsonwebtoken / jose | トークン発行・検証 |
| 組織確認     | GitHub REST API     | メンバーシップ確認 |
| ミドルウェア | Express.js          | 認証ミドルウェア   |

---

## 実装スケジュール（8週間）

### Phase 1: GitHub認証基盤（Week 1-2）

- GitHub OAuth App作成
- GitHubAuthService実装
- CurrentUserContext拡張
- HttpService Interceptor追加

### Phase 2: API制御（Week 3-4）

- Extension APIに組織確認追加
- エラーハンドリング強化
- RemoteExtensionLoader修正

### Phase 3: UI統合（Week 5-6）

- GitHubSignInButton実装
- ExtensionUpload UI修正
- UserMenu実装（GitHub情報表示）

### Phase 4: セキュリティ（Week 7-8）

- Extension検証システム
- 監査ログ
- セキュリティテスト

---

## 気づき・学び

### 1. 既存システムの活用

Lichtblickには既に以下が実装されていた：

- `CurrentUserContext`: ユーザー状態管理
- `RemoteExtensionLoader`: サーバーアップロード機能
- `ExtensionsAPI`: REST API通信
- `HttpService`: HTTP通信基盤

**→ 認証部分を追加するだけで済む**

### 2. GitHub Organization連携のメリット

- GitHub Teamを活用したExtension共有
- GitHub Roleベースの権限管理
- 2要素認証（GitHub）を活用
- 監査ログをGitHub IDで記録

### 3. 社内専用アプリの簡潔性

一般公開を前提としない場合：

- クォータ管理不要
- 有料プラン不要
- 公開/非公開の概念不要
- セキュリティ要件が明確

---

## 次回の作業

### 優先度: 高

- [ ] GitHub OAuth Appの作成（Week 1）
- [ ] GitHubAuthService.spec.md 作成
- [ ] GitHubAuthService実装開始
- [ ] テストケース作成

### 優先度: 中

- [ ] サーバー側実装の詳細設計
- [ ] CI/CD パイプライン設計
- [ ] セキュリティ監査計画

### 優先度: 低

- [ ] GitHub Team連携の詳細検討
- [ ] 監査ログフォーマット定義

---

## 参考資料

### GitHub OAuth

- [GitHub OAuth Apps Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub REST API - Organizations](https://docs.github.com/en/rest/orgs/members)
- [GitHub OAuth Scopes](https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps)

### JWT

- [JWT.io](https://jwt.io/)
- [RFC 7519 - JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 8725 - JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

### セキュリティ

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

---

## 関連ドキュメント

- **調査レポート:** `docs/02_research/2025_10/20251024_01_extension-upload-authentication-system.md`
- **実装計画:** `docs/03_plans/extension-authentication/20251024_01_implementation-plan.md`
- **既存認証:** `packages/suite-base/src/context/CurrentUserContext.ts`
- **Extension API:** `packages/suite-base/src/api/extensions/ExtensionsAPI.ts`

---

**作業完了日:** 2025-10-24
**レビュアー:** （未定）
**承認状態:** 承認待ち
