# Lichtblick自動更新デバッグガイド

## 概要

Lichtblickデスクトップ版では、electron-updaterを使用した自動更新機能を実装しています。本番環境で自動更新が正常に動作しない場合のデバッグ方法について説明します。

## 本番用アプリケーションのビルド手順

### 前提条件
- Node.js v16.10+がインストールされていること
- yarnパッケージマネージャーが利用可能であること

### ビルド手順

1. **リポジトリのセットアップ**
   ```bash
   # corepackの有効化
   corepack enable

   # 依存関係のインストール
   yarn install
   ```

2. **本番用ビルドの実行**
   ```bash
   # デスクトップ版の本番用ビルド
   yarn desktop:build:prod

   # プラットフォーム別パッケージング
   yarn package:darwin    # macOS用
   yarn package:win       # Windows用
   yarn package:linux     # Linux用
   ```

3. **出力されるファイル**
   - ビルド結果は `dist/` ディレクトリに出力されます
   - macOS: `.app` バンドル形式
   - Windows: `.exe` インストーラー形式
   - Linux: `.AppImage` や `.deb` 形式

## ログ確認方法

### Windows環境でのログ確認方法

#### コンソールログの確認
本番アプリケーションでは、通常のconsole.logは表示されませんが、以下の方法で確認できます：

1. **開発者ツールでの確認**
   - アプリケーション実行中に `Ctrl + Shift + I` で開発者ツールを開く
   - Consoleタブで `[AUTO_UPDATE_DEBUG]` を検索

2. **外部ログツールの使用**
   - DebugView（Microsoft Sysinternals）などのツールでシステムログを監視
   - アプリケーションのstdout/stderrをファイルにリダイレクト

#### 手動でのログ確認手順

1. **アプリケーションの起動**
   ```cmd
   Lichtblick.exe > debug.log 2>&1
   ```

2. **デバッグログの検索**
   ```cmd
   findstr /C:"[AUTO_UPDATE_DEBUG]" debug.log
   ```

3. **手動更新チェックの実行**
   - メニューバー → ヘルプ → 「アップデートをチェック」をクリック
   - この操作により `checkNow()` メソッドが実行され、詳細なデバッグ情報がログ出力される

### macOS環境でのログ確認方法

#### コンソールログの確認

1. **ターミナルからの実行**
   ```bash
   # アプリケーションバンドルから直接実行してコンソール出力を確認
   /Applications/Lichtblick.app/Contents/MacOS/Lichtblick

   # または、ログをファイルに出力
   /Applications/Lichtblick.app/Contents/MacOS/Lichtblick > debug.log 2>&1
   ```

2. **ELECTRON_ENABLE_LOGGING環境変数の使用**
   ```bash
   # Electronのログ出力を有効化
   ELECTRON_ENABLE_LOGGING=true /Applications/Lichtblick.app/Contents/MacOS/Lichtblick
   ```

3. **開発者ツールでの確認**
   - アプリケーション実行中に `Cmd + Option + I` で開発者ツールを開く
   - Consoleタブで `[AUTO_UPDATE_DEBUG]` を検索

#### システムログでの確認

1. **Console.appでの確認**
   - アプリケーション → ユーティリティ → Console を開く
   - 左サイドバーで「User Reports」または「System Reports」を選択
   - Lichtblickに関連するログエントリを検索

2. **ログファイルの場所**
   - ユーザー固有ログ: `~/Library/Logs/`
   - システム全体ログ: `/Library/Logs/`
   - クラッシュレポート: `~/Library/Logs/DiagnosticReports/`

3. **コマンドラインでのログ検索**
   ```bash
   # 特定の文字列でログを検索
   grep -r "[AUTO_UPDATE_DEBUG]" ~/Library/Logs/

   # システムログから検索
   log show --predicate 'process == "Lichtblick"' --info
   ```

#### 手動でのログ確認手順

1. **アプリケーションの起動とログ出力**
   ```bash
   /Applications/Lichtblick.app/Contents/MacOS/Lichtblick > debug.log 2>&1 &
   ```

2. **デバッグログの検索**
   ```bash
   grep "[AUTO_UPDATE_DEBUG]" debug.log
   ```

3. **手動更新チェックの実行**
   - メニューバー → ヘルプ → 「アップデートをチェック」をクリック
   - この操作により `checkNow()` メソッドが実行され、詳細なデバッグ情報がログ出力される

## 現在のデバッグログの内容と目的

### 1. AutoUpdater状態の監視

```typescript
log.debug(`[AUTO_UPDATE_DEBUG] AutoUpdater State:`, {
  isUpdaterActive: autoUpdater.isUpdaterActive(),
  channel: autoUpdater.channel,
  currentVersion: autoUpdater.currentVersion,
  feedURL: autoUpdater.getFeedURL(),
});
```

**目的**: electron-updaterの基本的な動作状況を確認
- `isUpdaterActive`: 更新機能が有効かどうか（本番環境でのみtrue）
- `channel`: 更新チャンネル（stable, beta等）
- `currentVersion`: 現在のアプリケーションバージョン
- `feedURL`: 更新情報を取得するURL

### 2. アプリケーション設定の確認

```typescript
log.debug(`[AUTO_UPDATE_DEBUG] App Settings:`, {
  updatesEnabled: getAppSetting<boolean>(AppSetting.UPDATES_ENABLED),
});
```

**目的**: ユーザーが自動更新を無効にしていないかを確認
- `updatesEnabled`: ユーザー設定での自動更新有効/無効状態

### 3. 更新チェックプロセスの追跡

各メソッドの実行タイミングと結果をログ出力：

#### start()メソッド
```typescript
log.info(`[AUTO_UPDATE_DEBUG] StudioAppUpdater.start() called`);
log.debug(`[AUTO_UPDATE_DEBUG] Scheduling initial update check in ${this.#initialUpdateDelaySec} seconds`);
```

**目的**: 自動更新プロセスの開始を確認
- 起動後10秒での初回更新チェックのスケジューリング
- 重複起動の防止

#### checkNow()メソッド
```typescript
log.info(`[AUTO_UPDATE_DEBUG] checkNow() called`);
log.debug(`[AUTO_UPDATE_DEBUG] Starting manual update check`);
log.debug(`[AUTO_UPDATE_DEBUG] checkForUpdatesAndNotify result:`, result);
```

**目的**: 手動更新チェックの動作確認
- ユーザーがメニューから更新チェックを実行した際の詳細ログ
- `checkForUpdatesAndNotify()`の戻り値確認

#### #maybeCheckForUpdates()メソッド
```typescript
log.debug(`[AUTO_UPDATE_DEBUG] #maybeCheckForUpdates() called`);
log.debug(`[AUTO_UPDATE_DEBUG] App updates enabled setting: ${appUpdatesEnabled}`);
log.debug(`[AUTO_UPDATE_DEBUG] Calling autoUpdater.checkForUpdatesAndNotify()`);
```

**目的**: 定期的な自動更新チェックの動作確認
- 1分間隔での定期チェックの実行状況
- 設定による更新チェックのスキップ状況

### 4. エラーハンドリングの追跡

```typescript
log.debug(`[AUTO_UPDATE_DEBUG] Network error details:`, err);
log.error(`[AUTO_UPDATE_DEBUG] Non-network error in update check:`, err);
```

**目的**: 更新チェック失敗の原因特定
- ネットワークエラーと他のエラーの区別
- プロキシやファイアウォール設定の問題の特定

## デバッグ手順

### 1. 基本的な動作確認

1. アプリケーション起動時のログを確認
   - `StudioAppUpdater.start() called` が出力されるか
   - `isUpdaterActive` がtrueかどうか

2. 初回更新チェックの実行確認
   - 起動から10秒後に `Initial update check timeout triggered` が出力されるか

### 2. 設定の確認

1. 自動更新設定の確認
   - `updatesEnabled` の値を確認（undefined の場合はデフォルトでtrue）

2. 更新サーバーの確認
   - `feedURL` が正しく設定されているか
   - ネットワーク接続でアクセス可能か

### 3. 手動テストの実行

1. メニューからの手動チェック
   - 「ヘルプ」→「アップデートをチェック」を実行
   - `checkNow()` のログを確認

2. エラーメッセージの確認
   - ダイアログに表示されるエラーメッセージ
   - ログ出力されるエラーの詳細

## トラブルシューティング

### よくある問題と対処法

1. **`isUpdaterActive` がfalse**
   - 開発版で実行している可能性
   - 署名されていない実行ファイル

2. **ネットワークエラー**
   - プロキシ設定の確認
   - ファイアウォール設定の確認
   - 更新サーバーへの接続可能性

3. **設定による無効化**
   - ユーザーが手動で自動更新を無効にしている
   - アプリケーションの設定ファイルを確認

4. **証明書関連のエラー**
   - 更新サーバーのSSL証明書の問題
   - システムの証明書ストアの問題

### 追加調査が必要な場合

デバッグログで問題の特定ができない場合は、以下の情報も収集してください：

1. システム情報
   - Windows版とバージョン
   - ネットワーク設定（プロキシ等）
   - ウイルス対策ソフトの設定

2. アプリケーション情報
   - インストール方法（MSI、exeインストーラー等）
   - インストール場所
   - 実行ユーザーの権限

3. ネットワーク情報
   - 更新サーバーへの手動アクセステスト
   - DNSの名前解決テスト

## 注意事項

- デバッグログは本番環境でも動作するよう設計されています
- `[AUTO_UPDATE_DEBUG]` プレフィックスにより、他のログと区別できます
- パフォーマンスへの影響を最小限に抑えるため、必要な情報のみをログ出力しています