# 自動更新機能 コード修正オプション

## 概要

現在一時的に無効化されている自動更新機能を、S3実装準備のために適切に制御可能にするための4つのアプローチを提案します。

## 現在の問題点

```typescript
public start(): void {
  // 自動更新を完全に無効にする
  log.info("Automatic updates disabled (forked project)");
  return;
  // 以降のコードは実行されない
}
```

**問題**: 硬直的な無効化により、段階的な移行や環境別制御ができない

## 修正オプション

### オプション 1: 環境変数による制御 [推奨]

#### 適用場面

- 開発・ステージング・本番環境で異なる設定が必要
- CI/CDパイプラインでの自動デプロイ
- 緊急時のrollback対応

#### 実装コード

```typescript
// packages/suite-desktop/src/main/StudioAppUpdater.ts
public start(): void {
  const autoUpdateEnabled = process.env.AUTO_UPDATE_ENABLED === 'true';

  if (!autoUpdateEnabled) {
    log.info("Automatic updates disabled via environment variable (AUTO_UPDATE_ENABLED=false)");
    return;
  }

  if (this.#started) {
    log.info(`StudioAppUpdater already running`);
    return;
  }
  this.#started = true;

  log.info(`Starting update loop with environment variable control`);
  setTimeout(() => {
    void this.#maybeCheckForUpdates();
  }, this.#initialUpdateDelaySec * 1000);
}
```

#### 環境設定

```bash
# 開発環境 (.env.development)
AUTO_UPDATE_ENABLED=false

# ステージング環境 (.env.staging)
AUTO_UPDATE_ENABLED=true
AWS_ACCESS_KEY_ID=staging-key
AWS_SECRET_ACCESS_KEY=staging-secret

# 本番環境 (.env.production)
AUTO_UPDATE_ENABLED=true
AWS_ACCESS_KEY_ID=production-key
AWS_SECRET_ACCESS_KEY=production-secret
```

#### メリット

- ✅ 環境ごとの柔軟な制御
- ✅ CI/CDパイプラインとの統合が簡単
- ✅ 緊急時の即座無効化
- ✅ 設定の可視性が高い

#### デメリット

- ❌ 環境変数の管理が必要
- ❌ 本番環境での設定ミスリスク

---

### オプション 2: 設定ファイルによる制御

#### 適用場面

- ユーザーが設定で制御したい場合
- 既存の設定システムと統合したい場合
- GUI設定画面での切り替えが必要

#### 実装コード

```typescript
// packages/suite-desktop/src/main/StudioAppUpdater.ts
public start(): void {
  // 新しい設定項目を追加
  const autoUpdateFeatureEnabled = getAppSetting<boolean>(AppSetting.AUTO_UPDATE_FEATURE_ENABLED);

  if (!autoUpdateFeatureEnabled) {
    log.info("Automatic updates disabled via app settings (AUTO_UPDATE_FEATURE_ENABLED=false)");
    return;
  }

  // 既存のUPDATES_ENABLED設定も確認
  const updatesEnabled = getAppSetting<boolean>(AppSetting.UPDATES_ENABLED);
  if (!updatesEnabled) {
    log.info("Automatic updates disabled via user preference (UPDATES_ENABLED=false)");
    return;
  }

  if (this.#started) {
    log.info(`StudioAppUpdater already running`);
    return;
  }
  this.#started = true;

  log.info(`Starting update loop with settings control`);
  setTimeout(() => {
    void this.#maybeCheckForUpdates();
  }, this.#initialUpdateDelaySec * 1000);
}
```

#### 設定追加

```typescript
// packages/suite-base/src/AppSetting.ts
export enum AppSetting {
  // 既存の設定
  UPDATES_ENABLED = "updates-enabled",

  // 新規追加
  AUTO_UPDATE_FEATURE_ENABLED = "auto-update-feature-enabled",
}
```

#### デフォルト設定

```typescript
// packages/suite-desktop/src/main/settings.ts
const DEFAULT_SETTINGS = {
  [AppSetting.AUTO_UPDATE_FEATURE_ENABLED]: false, // 初期は無効
  [AppSetting.UPDATES_ENABLED]: true,
};
```

#### メリット

- ✅ 既存設定システムとの統合
- ✅ ユーザーによる制御可能
- ✅ GUI設定画面での切り替え
- ✅ 設定の永続化

#### デメリット

- ❌ 設定システムの拡張が必要
- ❌ ユーザーインターフェースの変更
- ❌ 開発者とユーザー両方の設定管理

---

### オプション 3: 開発・本番環境分離

#### 適用場面

- 開発環境では確実に無効化したい
- 本番環境のみで自動更新を有効化
- シンプルな環境分離

#### 実装コード

```typescript
// packages/suite-desktop/src/main/StudioAppUpdater.ts
public start(): void {
  // 開発環境では自動更新を無効化
  if (process.env.NODE_ENV === 'development') {
    log.info("Automatic updates disabled in development mode");
    return;
  }

  // 更新サーバーが設定されているかチェック
  if (!this.canCheckForUpdates()) {
    log.info("Automatic updates not available (no update server configured)");
    return;
  }

  // 更新サーバーのURLが設定されているかチェック
  const updateServerConfigured = this.#isUpdateServerConfigured();
  if (!updateServerConfigured) {
    log.info("Automatic updates disabled (update server not configured)");
    return;
  }

  if (this.#started) {
    log.info(`StudioAppUpdater already running`);
    return;
  }
  this.#started = true;

  log.info(`Starting update loop in production mode`);
  setTimeout(() => {
    void this.#maybeCheckForUpdates();
  }, this.#initialUpdateDelaySec * 1000);
}

private #isUpdateServerConfigured(): boolean {
  // app-update.ymlファイルの存在確認
  const updateConfigPath = path.join(process.resourcesPath, 'app-update.yml');
  return fs.existsSync(updateConfigPath);
}
```

#### 環境設定

```bash
# 開発時
NODE_ENV=development  # 自動的に無効化

# 本番ビルド時
NODE_ENV=production   # 設定があれば有効化
```

#### メリット

- ✅ 開発環境での確実な無効化
- ✅ 実装がシンプル
- ✅ 既存のNODE_ENV活用

#### デメリット

- ❌ 細かい制御ができない
- ❌ ステージング環境での制御が困難
- ❌ 本番環境での一時無効化が困難

---

### オプション 4: 段階的実装（デバッグモード付き）

#### 適用場面

- S3接続テストを段階的に実施
- デバッグ情報を詳細に収集
- 開発プロセスでの詳細な制御

#### 実装コード

```typescript
// packages/suite-desktop/src/main/StudioAppUpdater.ts
public start(): void {
  const debugMode = process.env.AUTO_UPDATE_DEBUG === 'true';
  const enabled = process.env.AUTO_UPDATE_ENABLED === 'true';

  if (debugMode) {
    log.info("Auto-update debug mode enabled");
    this.#debugUpdateCheck();
    return;
  }

  if (!enabled) {
    log.info("Automatic updates disabled (forked project - awaiting S3 configuration)");
    return;
  }

  if (this.#started) {
    log.info(`StudioAppUpdater already running`);
    return;
  }
  this.#started = true;

  log.info(`Starting update loop with full functionality`);
  setTimeout(() => {
    void this.#maybeCheckForUpdates();
  }, this.#initialUpdateDelaySec * 1000);
}

private #debugUpdateCheck(): void {
  log.info("=== AUTO UPDATE DEBUG MODE ===");
  log.info(`App version: ${app.getVersion()}`);
  log.info(`Update server active: ${autoUpdater.isUpdaterActive()}`);
  log.info(`Environment: ${process.env.NODE_ENV}`);
  log.info(`Platform: ${process.platform}`);

  // S3接続テスト（実装時に追加）
  this.#testS3Connection();
}

private async #testS3Connection(): Promise<void> {
  try {
    log.info("Testing S3 connection...");
    // S3接続テスト用のロジック
    // 実際のS3実装時に追加
    log.info("S3 connection test: Not implemented yet");
  } catch (error) {
    log.error("S3 connection test failed:", error);
  }
}
```

#### 環境設定

```bash
# デバッグモード
AUTO_UPDATE_DEBUG=true
AUTO_UPDATE_ENABLED=false

# 開発モード
AUTO_UPDATE_DEBUG=false
AUTO_UPDATE_ENABLED=false

# 本番モード
AUTO_UPDATE_DEBUG=false
AUTO_UPDATE_ENABLED=true
```

#### メリット

- ✅ 段階的な実装・テスト
- ✅ 詳細なデバッグ情報
- ✅ S3接続テストの組み込み
- ✅ 開発プロセスの可視化

#### デメリット

- ❌ 実装が複雑
- ❌ 環境変数の管理が煩雑
- ❌ デバッグコードの保守

---

## 【決定理由】なぜ環境変数制御を採用するのか

### 1. 現在の状況に最適

```typescript
// 現在の問題のあるコード
public start(): void {
  log.info("Automatic updates disabled (forked project)");
  return; // 硬直的な無効化
}

// 環境変数制御への改善
public start(): void {
  const autoUpdateEnabled = process.env.AUTO_UPDATE_ENABLED === 'true';
  if (!autoUpdateEnabled) {
    log.info("Automatic updates disabled via environment variable");
    return; // 柔軟な制御
  }
  // 既存ロジック継続
}
```

**理由**: 最小限の変更で硬直的な無効化から柔軟な制御に移行可能

### 2. 将来の拡張性

```bash
# S3実装時
AUTO_UPDATE_ENABLED=true
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# HTTPサーバー実装時
AUTO_UPDATE_ENABLED=true
UPDATE_SERVER_URL=https://your-server.com
UPDATE_SERVER_TOKEN=your-token
```

**理由**: S3とHTTPサーバー、どちらの実装でも同じ制御方法で対応可能

### 3. 運用の簡単さ

```bash
# 開発環境
export AUTO_UPDATE_ENABLED=false  # 開発時は安全に無効化

# 本番環境
export AUTO_UPDATE_ENABLED=true   # 本番では有効化

# 緊急時
export AUTO_UPDATE_ENABLED=false  # 即座に無効化
```

**理由**:

- **コード変更不要**: 環境変数のみで制御
- **環境別設定**: 開発・ステージング・本番で異なる設定
- **即座対応**: 緊急時にすぐ無効化可能

### 4. CI/CD統合

```yaml
# GitHub Actions例
- name: Deploy to staging
  env:
    AUTO_UPDATE_ENABLED: false

- name: Deploy to production
  env:
    AUTO_UPDATE_ENABLED: true
```

**理由**: 自動デプロイ時に環境ごとの設定を自動適用

### 5. 他の選択肢との比較

#### 設定ファイル制御の問題点

```typescript
// 設定ファイル = 複雑な実装が必要
const autoUpdateEnabled = getAppSetting<boolean>(AppSetting.AUTO_UPDATE_FEATURE_ENABLED);
```

- ❌ **実装コスト**: 設定システムの拡張が必要
- ❌ **UI変更**: 設定画面の追加が必要
- ❌ **複雑性**: 開発者設定とユーザー設定の区別

#### 環境分離の問題点

```typescript
// NODE_ENV = 細かい制御ができない
if (process.env.NODE_ENV === "development") {
  return; // 開発環境では常に無効
}
```

- ❌ **柔軟性不足**: 開発環境でテストできない
- ❌ **ステージング**: 本番同等環境での検証困難
- ❌ **緊急対応**: 本番環境での一時無効化が困難

#### 段階的実装の問題点

```typescript
// デバッグモード = 実装が複雑
const debugMode = process.env.AUTO_UPDATE_DEBUG === "true";
const enabled = process.env.AUTO_UPDATE_ENABLED === "true";
```

- ❌ **複雑性**: 複数の環境変数管理
- ❌ **保守性**: デバッグコードの長期保守
- ❌ **理解困難**: 動作モードの把握が困難

### 6. 実装済みコードとの整合性

```typescript
// 実際に実装したコード
public start(): void {
  const autoUpdateEnabled = process.env.AUTO_UPDATE_ENABLED === 'true';

  if (!autoUpdateEnabled) {
    log.info("Automatic updates disabled via environment variable (AUTO_UPDATE_ENABLED=false)");
    return;
  }

  // 更新サーバーの設定確認（HTTPサーバー対応）
  const updateServerUrl = process.env.UPDATE_SERVER_URL;
  const updateServerToken = process.env.UPDATE_SERVER_TOKEN;

  if (updateServerUrl && updateServerToken) {
    autoUpdater.addAuthHeader(`Bearer ${updateServerToken}`);
  }

  // 既存ロジック継続
}
```

**理由**:

- **S3対応**: AWS環境変数との親和性
- **HTTPサーバー対応**: 認証トークンの自動設定
- **既存コード保持**: 最小限の変更で最大の効果

---

## 推奨実装スケジュール

### フェーズ 1: 即座実装（今週）

**推奨**: オプション 1（環境変数制御）

```typescript
// 最小限の修正
public start(): void {
  const autoUpdateEnabled = process.env.AUTO_UPDATE_ENABLED === 'true';

  if (!autoUpdateEnabled) {
    log.info("Automatic updates disabled via environment variable");
    return;
  }

  // 既存のロジックをそのまま使用
  // ... 既存コード
}
```

### フェーズ 2: S3準備期間（2-3週間後）

**推奨**: オプション 4（デバッグモード）を追加

```bash
# S3接続テスト用
AUTO_UPDATE_DEBUG=true
AWS_ACCESS_KEY_ID=test-key
AWS_SECRET_ACCESS_KEY=test-secret
```

### フェーズ 3: 本番移行（1ヶ月後）

**推奨**: オプション 1で本番運用

```bash
# 本番環境
AUTO_UPDATE_ENABLED=true
AWS_ACCESS_KEY_ID=production-key
AWS_SECRET_ACCESS_KEY=production-secret
```

## 実装優先度

1. **最優先**: オプション 1（環境変数制御）
2. **次優先**: オプション 4（デバッグモード）を組み合わせ
3. **将来的**: オプション 2（設定ファイル）でユーザー制御追加

## 緊急時rollback手順

すべてのオプションで、緊急時は以下で即座無効化:

```bash
# 環境変数設定
export AUTO_UPDATE_ENABLED=false

# またはアプリケーション再起動
pkill -f "lichtblick"
```

## まとめ

各オプションは異なる用途に適しており、**オプション 1（環境変数制御）**を基本として、必要に応じて他のオプションを組み合わせることを推奨します。

段階的実装により、リスクを最小化しながらS3への移行を実現できます。
