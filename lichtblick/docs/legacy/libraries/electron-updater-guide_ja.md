# electron-updater 使用ガイド

## 概要

`electron-updater` は、Electronアプリケーションに自動更新機能を追加するためのクロスプラットフォームライブラリです。シンプルな設定で、アプリケーションの自動更新を実現できます。

### サポートOS

- **macOS** (Squirrel.Mac)
- **Windows** (NSIS)
- **Linux** (AppImage, RPM, DEB)

### 主な特徴

- ✅ 複数のプラットフォームをサポート
- ✅ GitHub Releases、S3、独自サーバーなど様々な更新ソースに対応
- ✅ ダウンロード進捗表示
- ✅ 段階的ロールアウト（ベータ版配信）
- ✅ コード署名検証
- ✅ 差分更新（Windows）

## インストール

```bash
npm install electron-updater
# または
yarn add electron-updater
```

## 基本的な使用方法

### 1. 最小限の設定

メインプロセスで以下のコードを追加：

```typescript
import { autoUpdater } from "electron-updater";

// アプリが準備完了後に実行
app.whenReady().then(() => {
  // 更新チェックと通知を自動実行
  autoUpdater.checkForUpdatesAndNotify();
});
```

### 2. ログ設定（推奨）

```typescript
import { autoUpdater } from "electron-updater";
import log from "electron-log";

// ログ設定
log.transports.file.level = "info";
autoUpdater.logger = log;

autoUpdater.checkForUpdatesAndNotify();
```

### 3. 詳細なイベント処理

```typescript
import { autoUpdater } from "electron-updater";
import { dialog } from "electron";

class AutoUpdater {
  constructor() {
    // 更新チェック開始
    autoUpdater.on("checking-for-update", () => {
      console.log("更新をチェック中...");
    });

    // 更新が利用可能
    autoUpdater.on("update-available", (info) => {
      console.log("更新が利用可能:", info.version);
    });

    // 更新がない
    autoUpdater.on("update-not-available", (info) => {
      console.log("最新版です:", info.version);
    });

    // ダウンロード進捗
    autoUpdater.on("download-progress", (progressObj) => {
      const { bytesPerSecond, percent, transferred, total } = progressObj;
      console.log(`ダウンロード進捗: ${percent.toFixed(2)}%`);
    });

    // ダウンロード完了
    autoUpdater.on("update-downloaded", (info) => {
      console.log("更新をダウンロードしました:", info.version);

      // ユーザーに再起動を促す
      dialog
        .showMessageBox({
          type: "info",
          title: "更新準備完了",
          message: "新しいバージョンがダウンロードされました。今すぐ再起動しますか？",
          buttons: ["今すぐ再起動", "後で"],
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
    });

    // エラー処理
    autoUpdater.on("error", (error) => {
      console.error("更新エラー:", error);
    });
  }

  // 手動で更新チェック
  checkForUpdates() {
    autoUpdater.checkForUpdates();
  }

  // 手動でダウンロード
  downloadUpdate() {
    autoUpdater.downloadUpdate();
  }

  // アプリ再起動とインストール
  quitAndInstall() {
    autoUpdater.quitAndInstall();
  }
}

export default AutoUpdater;
```

## 設定オプション

### 基本設定

```typescript
import { autoUpdater } from "electron-updater";

// 自動ダウンロードを無効にする
autoUpdater.autoDownload = false;

// アプリ終了時の自動インストールを無効にする
autoUpdater.autoInstallOnAppQuit = false;

// プレリリース版を許可する
autoUpdater.allowPrerelease = true;

// ダウングレードを許可する
autoUpdater.allowDowngrade = true;

// 更新チャンネルを設定
autoUpdater.channel = "beta";

// 完全な変更履歴を取得（GitHub限定）
autoUpdater.fullChangelog = true;
```

### カスタムプロバイダー設定

#### GitHub Releases

```typescript
import { autoUpdater } from "electron-updater";

// package.jsonのrepositoryフィールドから自動検出
// または手動設定
autoUpdater.setFeedURL({
  provider: "github",
  owner: "your-username",
  repo: "your-repo",
  private: false, // プライベートリポジトリの場合はtrue
  token: "your-github-token", // プライベートリポジトリの場合
});
```

#### 独自サーバー（Generic Provider）

```typescript
autoUpdater.setFeedURL({
  provider: "generic",
  url: "https://your-server.com/updates",
  channel: "latest",
});
```

#### Amazon S3

```typescript
autoUpdater.setFeedURL({
  provider: "s3",
  bucket: "your-bucket",
  region: "us-east-1",
  path: "updates",
});
```

### プラットフォーム別設定

#### Windows (NSIS)

```typescript
import { NsisUpdater } from "electron-updater";

const updater = new NsisUpdater({
  provider: "github",
  owner: "your-username",
  repo: "your-repo",
});

// インストールディレクトリを指定
updater.installDirectory = "C:\\Program Files\\YourApp";

// コード署名検証を設定
updater.verifyUpdateCodeSignature = async (publisherName, path) => {
  // カスタム検証ロジック
  return null; // 成功時はnullを返す
};
```

#### macOS

```typescript
import { MacUpdater } from "electron-updater";

const updater = new MacUpdater({
  provider: "github",
  owner: "your-username",
  repo: "your-repo",
});

// macOSでは自動的にコード署名が検証される
```

#### Linux (AppImage)

```typescript
import { AppImageUpdater } from "electron-updater";

const updater = new AppImageUpdater({
  provider: "github",
  owner: "your-username",
  repo: "your-repo",
});
```

## イベント一覧

### 更新関連イベント

| イベント名             | 説明             | パラメータ              |
| ---------------------- | ---------------- | ----------------------- |
| `checking-for-update`  | 更新チェック開始 | なし                    |
| `update-available`     | 更新が利用可能   | `UpdateInfo`            |
| `update-not-available` | 更新なし         | `UpdateInfo`            |
| `update-cancelled`     | 更新がキャンセル | `UpdateInfo`            |
| `download-progress`    | ダウンロード進捗 | `ProgressInfo`          |
| `update-downloaded`    | ダウンロード完了 | `UpdateDownloadedEvent` |
| `error`                | エラー発生       | `Error`                 |

### イベントデータ型

#### UpdateInfo

```typescript
interface UpdateInfo {
  version: string; // 新しいバージョン
  files: UpdateFileInfo[]; // ファイル情報
  path?: string; // ファイルパス（非推奨）
  sha512?: string; // SHA512ハッシュ（非推奨）
  releaseDate: string; // リリース日
  releaseName?: string; // リリース名
  releaseNotes?: string; // リリースノート
  stagingPercentage?: number; // 段階的ロールアウト割合
}
```

#### ProgressInfo

```typescript
interface ProgressInfo {
  total: number; // 総バイト数
  delta: number; // 差分バイト数
  transferred: number; // 転送済みバイト数
  percent: number; // 進捗率（0-100）
  bytesPerSecond: number; // 転送速度
}
```

## 開発環境での設定

### 開発用設定ファイル

開発中にテストするため、プロジェクトルートに `dev-app-update.yml` を作成：

```yaml
provider: github
owner: your-username
repo: your-repo
updaterCacheDirName: your-app-updater
```

### 開発モード強制

```typescript
import { autoUpdater } from "electron-updater";

// 開発環境で更新機能をテスト
if (process.env.NODE_ENV === "development") {
  autoUpdater.forceDevUpdateConfig = true;
}
```

## electron-builderとの連携

### package.json設定

```json
{
  "main": "dist/main.js",
  "build": {
    "appId": "com.yourcompany.yourapp",
    "productName": "Your App",
    "directories": {
      "output": "dist"
    },
    "files": ["dist/**/*", "node_modules/**/*"],
    "publish": [
      {
        "provider": "github",
        "owner": "your-username",
        "repo": "your-repo"
      }
    ],
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        },
        {
          "target": "zip",
          "arch": ["x64", "arm64"]
        }
      ]
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ]
    },
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        }
      ]
    }
  }
}
```

### ビルドとパブリッシュ

```bash
# ビルドのみ
npm run build

# ビルドしてGitHub Releasesに公開
npm run build -- --publish always

# 特定のプラットフォームのみ
npm run build -- --mac --publish always
npm run build -- --win --publish always
npm run build -- --linux --publish always
```

## セキュリティ

### コード署名

#### macOS

```bash
# Apple Developer証明書が必要
# Xcode Command Line Toolsをインストール
xcode-select --install

# 証明書の確認
security find-identity -v -p codesigning
```

#### Windows

```bash
# コード署名証明書が必要
# electron-builderで自動的に署名される
```

### 署名検証

```typescript
import { autoUpdater } from "electron-updater";

// Windows用カスタム署名検証
autoUpdater.verifyUpdateCodeSignature = async (publisherName, path) => {
  // publisherName: 署名者名の配列
  // path: 実行ファイルのパス

  console.log("署名検証:", publisherName, path);

  // 検証成功時はnullを返す
  // 失敗時はエラーメッセージを返す
  return null;
};
```

## トラブルシューティング

### よくある問題

#### 1. 更新チェックが実行されない

```typescript
// 本番環境でのみ動作することを確認
if (!app.isPackaged) {
  console.log("開発環境では更新チェックは無効です");
  return;
}

// または開発モードを強制
autoUpdater.forceDevUpdateConfig = true;
```

#### 2. macOSで更新が失敗する

```bash
# アプリケーションが署名されているか確認
codesign -dv --verbose=4 /path/to/your/app.app

# 公証（Notarization）の確認
spctl -a -vvv -t install /path/to/your/app.app
```

#### 3. ネットワークエラー

```typescript
import { autoUpdater } from "electron-updater";

// カスタムリクエストヘッダー
autoUpdater.requestHeaders = {
  "User-Agent": "YourApp/1.0.0",
  Authorization: "Bearer your-token",
};

// プロキシ設定
autoUpdater.netSession.setProxy({
  proxyRules: "http://proxy.company.com:8080",
});
```

### デバッグ

#### ログ設定

```typescript
import log from "electron-log";

// ファイルログレベル
log.transports.file.level = "debug";

// コンソールログレベル
log.transports.console.level = "debug";

// autoUpdaterにログを設定
autoUpdater.logger = log;

// ログファイルの場所
console.log(log.transports.file.getFile().path);
```

#### ログファイルの場所

- **macOS**: `~/Library/Logs/YourApp/main.log`
- **Windows**: `%USERPROFILE%\AppData\Roaming\YourApp\logs\main.log`
- **Linux**: `~/.config/YourApp/logs/main.log`

## 高度な使用例

### カスタム更新ダイアログ

```typescript
import { autoUpdater } from "electron-updater";
import { BrowserWindow, dialog } from "electron";

class CustomUpdater {
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupAutoUpdater();
  }

  private setupAutoUpdater() {
    autoUpdater.autoDownload = false;

    autoUpdater.on("update-available", async (info) => {
      const result = await dialog.showMessageBox(this.mainWindow, {
        type: "info",
        title: "更新が利用可能",
        message: `新しいバージョン ${info.version} が利用可能です。`,
        detail: info.releaseNotes as string,
        buttons: ["今すぐダウンロード", "スキップ"],
        defaultId: 0,
      });

      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });

    autoUpdater.on("download-progress", (progress) => {
      // レンダラープロセスに進捗を送信
      this.mainWindow.webContents.send("download-progress", progress);
    });

    autoUpdater.on("update-downloaded", async () => {
      const result = await dialog.showMessageBox(this.mainWindow, {
        type: "info",
        title: "更新準備完了",
        message: "更新がダウンロードされました。アプリケーションを再起動して更新を適用しますか？",
        buttons: ["今すぐ再起動", "後で"],
        defaultId: 0,
      });

      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  }

  checkForUpdates() {
    autoUpdater.checkForUpdates();
  }
}
```

### 段階的ロールアウト

```yaml
# latest.yml または latest-mac.yml
version: 1.2.0
files:
  - url: YourApp-1.2.0.dmg
    sha512: hash-value
    size: 12345678
path: YourApp-1.2.0.dmg
sha512: hash-value
releaseDate: "2025-01-15T10:00:00.000Z"
stagingPercentage: 25 # 25%のユーザーにのみ配信
```

### 条件付き更新

```typescript
import { autoUpdater } from "electron-updater";
import { app } from "electron";
import semver from "semver";

// 最小システムバージョンチェック
autoUpdater.isUpdateSupported = (updateInfo) => {
  const currentVersion = app.getVersion();
  const newVersion = updateInfo.version;

  // メジャーバージョンアップは手動確認が必要
  if (semver.major(newVersion) > semver.major(currentVersion)) {
    return false;
  }

  return true;
};
```

## ベストプラクティス

### 1. 更新チェックのタイミング

```typescript
import { autoUpdater } from "electron-updater";
import { app } from "electron";

app.whenReady().then(() => {
  // アプリ起動時に一度チェック
  autoUpdater.checkForUpdatesAndNotify();

  // 定期的にチェック（1時間ごと）
  setInterval(
    () => {
      autoUpdater.checkForUpdatesAndNotify();
    },
    60 * 60 * 1000,
  );
});
```

### 2. エラーハンドリング

```typescript
autoUpdater.on("error", (error) => {
  console.error("更新エラー:", error);

  // ユーザーにエラーを通知（オプション）
  if (error.message.includes("ENOTFOUND")) {
    console.log("ネットワーク接続を確認してください");
  } else if (error.message.includes("signature")) {
    console.log("更新ファイルの署名検証に失敗しました");
  }
});
```

### 3. 設定の外部化

```typescript
// config.json
{
  "updateServer": {
    "provider": "github",
    "owner": "your-username",
    "repo": "your-repo"
  },
  "updateSettings": {
    "autoDownload": true,
    "checkInterval": 3600000
  }
}

// main.ts
import config from './config.json';

autoUpdater.setFeedURL(config.updateServer);
autoUpdater.autoDownload = config.updateSettings.autoDownload;
```

## まとめ

`electron-updater` は、Electronアプリケーションに強力で柔軟な自動更新機能を提供します。基本的な設定から高度なカスタマイズまで、様々なニーズに対応できます。

### 重要なポイント

1. **セキュリティ**: 本番環境では必ずコード署名を実装する
2. **テスト**: 開発環境で十分にテストしてから本番環境に適用する
3. **ユーザー体験**: 更新プロセスをユーザーにとって分かりやすくする
4. **エラーハンドリング**: 適切なエラー処理とログ記録を実装する
5. **段階的展開**: 大きな変更は段階的ロールアウトを検討する

---

**ドキュメントバージョン**: 1.0
**最終更新**: 2025年7月3日
**対応バージョン**: electron-updater v6.6.2+
**作成者**: 菅井 瑛正
