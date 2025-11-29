# フォークしたプロジェクトの自動更新問題

## 概要

Lichtblickプロジェクトをカスタム開発のためにフォークした場合、フォークしたアプリケーションが元のプロジェクトのリリースに自動更新され、カスタム変更が上書きされる問題が発生する可能性があります。このドキュメントでは、根本原因を説明し、解決策を提供し、フォークしたElectronアプリケーションの管理のベストプラクティスを提案します。

## 問題の説明

### 症状

- フォークしたElectronアプリケーションが元のlichtblickリポジトリから自動的に更新をダウンロード・インストールする
- 自動更新後にカスタムコードの変更が失われる
- ユーザーの同意なしにアプリケーションが元のプロジェクトのバージョンに戻る(例えばv0.14.0からlichtblickのv0.16.0の内容を反映してしまう)

### 根本原因

この問題は、`electron-updater`パッケージを使用したElectronの自動更新メカニズムに起因します：

1. **`package.json`のrepositoryフィールドを読み取る**: 自動更新機能は`repository.url`フィールドを使用して更新ソースを決定します
2. **GitHub Releasesをチェック**: `https://github.com/lichtblick-suite/lichtblick/releases`で新しいバージョンを監視します
3. **元のバイナリをダウンロード**: 更新が見つかると、フォークではなく元のプロジェクトのコンパイル済みバイナリをダウンロードします

### 技術的詳細

`packages/suite-desktop/src/main/StudioAppUpdater.ts`の`StudioAppUpdater`クラスが自動更新ロジックを実装しています：

```typescript
// 自動更新チェックは1時間ごとに実行
#updateCheckIntervalSec = 60 * 60;

// 最初のチェックはアプリ起動から10分後に開始
#initialUpdateDelaySec = 60 * 10;
```

更新機能は以下から更新ソースを自動検出する`electron-updater`を使用します：

- `package.json` → `repository.url`フィールド
- GitHub APIで新しいリリースをチェック
- 公式リリースバイナリをダウンロード・インストール

## 解決策

### 解決策1: 設定で自動更新を無効にする（ユーザーレベル）

**エンドユーザーに推奨**

1. アプリケーションを起動
2. 設定を開く（macOSでは`Cmd+,`、Windows/Linuxでは`Ctrl+,`）
3. 「General」タブに移動
4. 「Automatically install updates」のチェックを外す

**メリット**: 実装が簡単、元に戻せる
**デメリット**: ユーザーが再有効化できる、確実ではない

### 解決策2: 開発環境で自動更新を無効にする

**開発中の開発者向け**

アプリケーション実行時に環境変数を設定：

```bash
NODE_ENV=development yarn start
# または
NODE_ENV=development yarn desktop:serve
```

開発環境では自動更新が自動的に無効になります。

### 解決策3: コードレベルで無効にする（フォークに推奨）

**フォークしたプロジェクトで永続的に無効にする**

`packages/suite-desktop/src/main/StudioAppUpdater.ts`を修正：

```typescript
/**
 * 更新プロセスを開始します。
 */
public start(): void {
  // フォークしたプロジェクトの自動更新を無効化
  log.info("Automatic updates disabled (forked project)");
  return;

  // 元のコード（到達不可能）
  if (this.#started) {
    log.info(`StudioAppUpdater already running`);
    return;
  }
  // ... 元の実装の残り
}
```

**メリット**: 自動更新を完全に防止、意図が明確
**デメリット**: コード修正が必要

### 解決策4: リポジトリ設定を更新する

**独自のリリースで更新機能を維持する**

1. `package.json`を自分のフォークを指すように更新：

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/lichtblick.git"
  }
}
```

2. GitHub Actionsを使用して独自のリリースパイプラインを設定
3. 独自のリリースを公開してフォークからの更新を有効にする

**メリット**: 独自のリリースで更新機能を維持
**デメリット**: CI/CDパイプラインの設定が必要

## フォークしたプロジェクトのベストプラクティス

### 1. フォーク後の即座のアクション

- [ ] 解決策3（コードレベル無効化）を使用して自動更新を無効にする
- [ ] `package.json`のリポジトリURLを自分のフォークに更新
- [ ] 元のプロジェクトと区別するためにアプリケーション名とバージョンを更新
- [ ] 元のリポジトリへのハードコードされた参照を確認・更新

### 2. 開発ワークフロー

- [ ] 開発中は常に`NODE_ENV=development`でテスト
- [ ] 機能開発にはバージョン管理ブランチを使用
- [ ] 必要に応じて上流との同期を定期的に実行（手動プロセス）
- [ ] チームメンバー向けに設定変更を文書化

### 3. リリース管理

- [ ] 更新が必要な場合は独自のリリースプロセスを作成
- [ ] 上流とは異なるセマンティックバージョニングを使用
- [ ] 異なる更新チャンネル（beta、stable等）の使用を検討
- [ ] 本番リリースには適切なコード署名を実装

## 技術的参考資料

### 主要ファイル

- `packages/suite-desktop/src/main/StudioAppUpdater.ts` - メインの自動更新ロジック
- `packages/suite-desktop/src/main/index.ts` - 自動更新機能の初期化
- `package.json` - リポジトリ設定
- `packages/suite-desktop/src/electronBuilderConfig.js` - ビルド設定

### 関連技術

- **electron-updater**: Electronアプリケーション用の自動更新ライブラリ
- **update.electronjs.org**: オープンソースElectronアプリ用の無料更新サービス
- **GitHub Releases**: アプリケーション更新配布用プラットフォーム

### 有用なリソース

- [electron-updater ドキュメント](https://www.electron.build/auto-update)
- [electron-updater GitHubリポジトリ](https://github.com/electron-userland/electron-builder/tree/master/packages/electron-updater)
- [update.electronjs.orgサービス](https://github.com/electron/update.electronjs.org)
- [Electron Builder自動更新ガイド](https://www.electron.build/auto-update)
- [GitHub Releasesドキュメント](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

## トラブルシューティング

### よくある問題

**Q: 設定で無効にしても自動更新が発生する**
A: 設定はユーザーの設定のみに影響します。フォークしたプロジェクトでは、確実な防止のために解決策3（コードレベル無効化）を使用してください。

**Q: 自動更新が無効になっているかどうかを確認する方法は？**
A: アプリケーションログで「Automatic updates disabled (forked project)」メッセージを確認するか、更新チェックリクエストのネットワークトラフィックを監視してください。

**Q: 上流から選択的に更新できますか？**
A: はい、ただし手動プロセスが必要です：

1. 上流のリリースを監視
2. 必要な変更をチェリーピック
3. リリース前に十分にテスト
4. 独自のバージョン番号を維持

**Q: セキュリティ更新はどうなりますか？**
A: フォークしたプロジェクトは手動でセキュリティ更新を監視・適用する責任があります。検討事項：

- 上流のセキュリティアドバイザリを購読
- 依存関係の定期的なセキュリティ監査
- 重要なパッチ用の独自更新メカニズムの実装

### 自動更新問題のデバッグ

詳細ログを有効にする：

```typescript
// メインプロセスで
const log = require("electron-log");
log.transports.file.level = "debug";
autoUpdater.logger = log;
```

更新関連メッセージのログファイルを確認：

- macOS: `~/Library/Logs/Lichtblick/main.log`
- Windows: `%USERPROFILE%\AppData\Roaming\Lichtblick\logs\main.log`
- Linux: `~/.config/Lichtblick/logs/main.log`

## まとめ

フォークしたElectronプロジェクトの自動更新問題は、`electron-updater`が元のリポジトリ設定を読み取るデフォルト動作に起因する一般的な課題です。根本原因を理解し、使用ケースに基づいて適切な解決策を実装することで、フォークしたアプリケーションの更新プロセスを制御できます。

カスタム開発を目的とするほとんどのフォークしたプロジェクトでは、**解決策3（コードレベル無効化）**が推奨されます。これは不要な更新を最も確実に防止し、意図を明確に文書化するためです。

---

**ドキュメントバージョン**: 1.0
**最終更新**: 2025年7月3日
**適用対象**: Lichtblick Suite（旧Foxglove Studio）
**作成者**: 菅井 瑛正
