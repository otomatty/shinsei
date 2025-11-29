# 自動更新問題 - 対処方法

## 🚨 問題の概要

フォークしたLichtblickアプリケーションが元のlichtblickプロジェクトから自動更新されて、**カスタム開発した機能が上書きされる問題**が発生しています。

### 発生する症状

- フォークしたアプリが勝手に元のプロジェクトのバージョンに更新される
- カスタムコードの変更が失われる
- ユーザーの同意なしにアプリケーションが元のバージョンに戻る

### 根本原因

`StudioAppUpdater`クラスが以下の動作をするため：

1. `package.json`の`repository.url`フィールドを読み取り
2. `https://github.com/lichtblick-suite/lichtblick/releases`で新しいバージョンをチェック
3. 元のプロジェクトのコンパイル済みバイナリをダウンロード・インストール

## 🛠️ 解決策

### GitHubトークンを使った組織内ユーザー限定の更新

**シンプルな制御方法**: GitHubトークンが設定されていれば自動更新を有効、なければ無効

**対象ファイル**: `packages/suite-desktop/src/main/StudioAppUpdater.ts`
**対象メソッド**: `start()`メソッド（51行目〜77行目）

**推奨修正**:

```typescript
// 51行目〜77行目を以下に変更
public start(): void {
  // GitHubトークンによる自動更新制御
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    log.info("Automatic updates disabled (GITHUB_TOKEN not set)");
    return;
  }

  // GitHubトークンによる認証設定
  log.info("Configuring GitHub authentication for updates");
  autoUpdater.addAuthHeader(`Bearer ${githubToken}`);

  if (this.#started) {
    log.info(`StudioAppUpdater already running`);
    return;
  }
  this.#started = true;

  log.info(`Starting update loop with GitHub token authentication`);
  setTimeout(() => {
    void this.#maybeCheckForUpdates();
  }, this.#initialUpdateDelaySec * 1000);
}
```

**トークン設定例**:

```bash
# 組織内ユーザー - 自動更新を有効化
export GITHUB_TOKEN=your-github-token

# 開発環境 - トークンを設定しない（自動更新無効）
# export GITHUB_TOKEN=  # 未設定
```

**必要な設定変更**:

**A. `package.json`のrepository設定変更（10-12行目）:**

```json
"repository": {
  "type": "git",
  "url": "https://github.com/YOUR_ORG/lichtblick.git"
},
```

**B. `packages/suite-desktop/src/electronBuilderConfig.js`でpublish設定を追加:**

```javascript
// 設定オブジェクトに追加
publish: {
  provider: "github",
  private: true,
  token: process.env.GITHUB_TOKEN
}
```

## 📋 実装手順

### Step 1: 環境変数制御の実装

**✅ 完了**: `packages/suite-desktop/src/main/StudioAppUpdater.ts`の51行目〜77行目に既に実装済み

**現在の設定方法**:

```bash
# 開発時 - 自動更新を無効化
export AUTO_UPDATE_ENABLED=false

# 本番時 - 自動更新を有効化（準備完了後）
export AUTO_UPDATE_ENABLED=true

# 更新サーバー設定（オプション）
export UPDATE_SERVER_URL=https://your-update-server.com
export UPDATE_SERVER_TOKEN=your-auth-token
```

### Step 2: GitHubトークン認証の準備

1. **組織内のプライベートリポジトリを準備**

   - 組織内にプライベートリポジトリを作成
   - 適切なアクセス権限を設定

2. **GitHubトークンを発行**

   - GitHub Settings → Developer settings → Personal access tokens
   - `repo`スコープを含むトークンを発行

3. **設定ファイルを修正**

   - `package.json`の10-12行目のrepository URLを変更
   - `electronBuilderConfig.js`にpublish設定を追加
   - 環境変数`GITHUB_TOKEN`を設定

4. **環境変数設定**
   ```bash
   export GITHUB_TOKEN=your-github-token
   export AUTO_UPDATE_ENABLED=true
   ```

## ⚠️ 注意事項

- **短期対応**: 環境変数制御による無効化で即座に問題を防止
- **長期対応**: GitHubトークンベースの組織内更新システムを構築
- 緊急時は`AUTO_UPDATE_ENABLED=false`で即座に無効化可能

## 🔍 確認方法

**自動更新が無効化されているか確認**:

```bash
# アプリケーションログで以下のメッセージを確認
"Automatic updates disabled via environment variable (AUTO_UPDATE_ENABLED=false)"
```

**環境変数の確認**:

```bash
echo $AUTO_UPDATE_ENABLED
```

## 📁 関連ファイル

- `packages/suite-desktop/src/main/StudioAppUpdater.ts` - メインの自動更新ロジック
- `packages/suite-desktop/src/main/index.ts` - 自動更新機能の初期化
- `package.json` - リポジトリ設定
- `packages/suite-desktop/src/electronBuilderConfig.js` - ビルド設定

## 🚀 次のステップ

1. まず環境変数制御を実装して問題を防止
2. GitHubトークンベースの更新システムを段階的に構築
3. 組織内での適切な更新フローを確立
