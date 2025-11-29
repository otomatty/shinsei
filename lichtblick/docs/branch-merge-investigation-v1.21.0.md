# Lichtblick v1.21.0 マージ調査レポート

## 調査日時

2024年（調査実施日）

## 調査目的

upstream/mainがv1.21.0に更新された際、ローカルmainブランチ（v1.20.0ベース）との差分とマージ時のコンフリクト状況を調査する。

## 現在のブランチ状態

### ブランチの分岐状況

- **ローカルmainブランチ**: v1.20.0のリリースコミットを含む

  - `359c6fc2f` - chore: release v1.20.0 [skip actions]
  - `c54d29069` - Release/minor (#721)

- **upstream/mainブランチ**: v1.21.0のリリースコミットを含む

  - `2612328cc` - chore: release v1.21.0 [skip actions]
  - `209abd53f` - Release/minor v1.21 (#775)

- **共通の祖先**: `61e9bd4ba` - chore: bump versions in root and suite package.json [skip actions]

### 分岐の原因

ローカルでv1.20.0のリリースコミットを作成・マージした後、upstreamでv1.21.0のリリースが行われたため、ブランチが分岐している状態。ローカルのv1.20.0のリリースコミットがupstreamに反映されていない可能性がある。

### upstream/mainでのリセット（force push）の可能性

**調査結果**: upstream/mainでリセット（force push）が行われた可能性が**高い**。

#### 証拠となる事実

1. **ローカルのv1.20.0コミットがupstream/mainに存在しない**

   - ローカルのv1.20.0リリースコミット: `359c6fc2f` (2025-10-01)
   - upstream/mainの履歴にはこのコミットが含まれていない
   - `git branch -r --contains 359c6fc2f` の結果、upstream/mainは含まれていない

2. **タイムラインの不整合**

   - 2025-08-26: 共通の祖先 `61e9bd4ba` (chore: bump versions)
   - 2025-10-01: ローカルでv1.20.0のリリース（`359c6fc2f`）
   - 2025-11-14: upstream/mainでv1.21.0のリリース（`2612328cc`）
   - upstream/mainは共通の祖先から直接v1.21.0に進んでいる（v1.20.0をスキップ）

3. **upstream/mainの履歴**

   - upstream/mainの`--first-parent`履歴を確認すると、`61e9bd4ba`から直接`209abd53f` (Release/minor v1.21) に進んでいる
   - ローカルのv1.20.0のコミット（`359c6fc2f`, `c54d29069`）が含まれていない

4. **古いv1.20.0のリリースコミットの存在**
   - upstream/mainの履歴には、2022-08-02の古いv1.20.0のリリースコミット（`0ab9b54be`）が存在する
   - これは元のFoxglove Studioのリリースコミットで、Lichtblickのv1.20.0とは無関係

#### 結論

upstream/mainで、ローカルのv1.20.0のリリースコミットを含む履歴がリセット（force push）され、共通の祖先（`61e9bd4ba`）から直接v1.21.0に進むように書き換えられた可能性が高い。これにより、ローカルのv1.20.0のリリースコミットがupstream/mainの履歴から失われたと考えられる。

## マージ時の差分分析

### 全体の変更規模

- **変更ファイル数**: 166ファイル
- **追加行数**: 10,700行
- **削除行数**: 1,820行
- **コンフリクト発生ファイル数**: 37ファイル

### コンフリクトの内訳

#### 1. バージョン関連ファイル（6ファイル）

- `package.json` - バージョン番号（1.20.0 vs 1.21.0）とその他の依存関係
- `packages/suite-base/package.json`
- `packages/suite-desktop/package.json`
- `packages/suite-web/package.json`
- `packages/suite/package.json`
- `yarn.lock` - 依存関係のロックファイル

**主なコンフリクト内容**:

- バージョン番号の不一致（1.20.0 vs 1.21.0）
- 依存関係パッケージのバージョン更新

#### 2. CI/CD関連ファイル（4ファイル）

- `.github/workflows/gh-pages.yml` - 新規追加ファイル（add/addコンフリクト）
- `.github/workflows/prerelease.yml` - 新規追加ファイル（add/addコンフリクト）
- `.github/workflows/release.yml` - リリースワークフローの変更
- `.github/workflows/stale.yml` - 設定変更

**主な変更内容**:

- 新しいリリース前処理ワークフローの追加
- GitHub Pages用のワークフロー追加
- リリースプロセスの改善

#### 3. ソースコードファイル（27ファイル）

##### Extensions API関連（6ファイル）

- `packages/suite-base/src/api/extensions/ExtensionAdapter.test.ts`
- `packages/suite-base/src/api/extensions/ExtensionAdapter.ts`
- `packages/suite-base/src/api/extensions/ExtensionsAPI.test.ts`
- `packages/suite-base/src/api/extensions/ExtensionsAPI.ts`
- `packages/suite-base/src/api/extensions/types.ts`

**変更内容**: Extensions APIの機能拡張とテストの追加

##### Layouts API関連（3ファイル）

- `packages/suite-base/src/api/layouts/LayoutsAPI.test.ts`
- `packages/suite-base/src/api/layouts/LayoutsAPI.ts`
- `packages/suite-base/src/api/layouts/types.ts`

**変更内容**: Layouts APIの機能拡張とテストの追加

##### Extension Loader関連（4ファイル）

- `packages/suite-base/src/services/extension/IdbExtensionLoader.test.ts`
- `packages/suite-base/src/services/extension/IdbExtensionLoader.ts`
- `packages/suite-base/src/services/extension/RemoteExtensionLoader.test.ts`
- `packages/suite-base/src/services/extension/RemoteExtensionLoader.ts`

**変更内容**: Extension Loaderの機能改善とテストの追加

##### HTTP Service関連（2ファイル）

- `packages/suite-base/src/services/http/HttpService.test.ts`
- `packages/suite-base/src/services/http/HttpService.ts`

**変更内容**: HTTP Serviceの機能追加とテストの追加

##### Layout Manager関連（2ファイル）

- `packages/suite-base/src/services/LayoutManager/LayoutManager.test.ts`
- `packages/suite-base/src/services/LayoutManager/utils/updateOrFetchLayouts.test.ts`

**変更内容**: Layout Managerの機能改善とテストの追加

##### その他のコンポーネント（10ファイル）

- `packages/suite-base/src/StudioApp.test.tsx`
- `packages/suite-base/src/StudioApp.tsx`
- `packages/suite-base/src/components/AppBar/NetworkStatusIndicator.test.tsx`
- `packages/suite-base/src/components/AppBar/NetworkStatusIndicator.tsx`
- `packages/suite-base/src/components/DocumentDropListener.tsx`
- `packages/suite-base/src/context/PanelCatalogContext.ts`
- `packages/suite-base/src/services/IExtensionStorage.ts`
- `packages/suite-base/src/testing/builders/ExtensionBuilder.ts`
- `packages/suite-desktop/src/webpackMainConfig.ts`
- `packages/suite-desktop/src/webpackPreloadConfig.ts`
- `packages/suite-web/src/WebRoot.tsx`

**変更内容**: 各種コンポーネントの機能改善とテストの追加

## 主な変更内容の詳細

### 1. バージョン更新

- **メインバージョン**: 1.20.0 → 1.21.0
- すべてのパッケージでバージョン番号の更新が必要

### 2. 新機能追加

- **Extensions API**: 拡張機能の管理APIの拡張
- **Layouts API**: レイアウト管理APIの拡張
- **HTTP Service**: HTTP通信機能の追加
- **Network Status Indicator**: ネットワーク状態表示機能の追加

### 3. テストの大幅な追加

- 多数のテストファイルが追加され、テストカバレッジが向上
- 特にExtensions API、Layouts API、HTTP Service関連のテストが充実

### 4. CI/CDの改善

- 新しいリリース前処理ワークフローの追加
- GitHub Pages用のワークフロー追加
- リリースプロセスの自動化改善

### 5. コードリファクタリング

- Extension Loaderの構造改善
- Layout Managerの機能改善
- 各種コンポーネントの改善

## コンフリクト解決の推奨方針

### 1. バージョン関連ファイル

**推奨**: upstream/mainのバージョン（1.21.0）を採用

- すべての`package.json`ファイルでバージョンを1.21.0に統一
- `yarn.lock`は`yarn install`を実行して再生成

### 2. CI/CD関連ファイル

**推奨**: upstream/mainの新しいワークフローを採用

- `.github/workflows/gh-pages.yml` - upstream/mainの内容を採用
- `.github/workflows/prerelease.yml` - upstream/mainの内容を採用
- `.github/workflows/release.yml` - upstream/mainの変更をマージ
- `.github/workflows/stale.yml` - upstream/mainの変更をマージ

### 3. ソースコードファイル

**推奨**: 各コンフリクトを個別に確認して解決

- Extensions API関連: upstream/mainの新機能を採用し、既存コードとの統合を確認
- Layouts API関連: upstream/mainの新機能を採用し、既存コードとの統合を確認
- Extension Loader関連: upstream/mainの改善を採用
- HTTP Service関連: upstream/mainの新機能を採用
- Layout Manager関連: upstream/mainの改善を採用
- その他のコンポーネント: 各ファイルの変更内容を確認して適切にマージ

## マージ手順の推奨

### ステップ1: バックアップの作成

```bash
git branch main-backup-v1.20.0
```

### ステップ2: upstream/mainの最新状態を取得

```bash
git fetch upstream
```

### ステップ3: マージの実行

```bash
git merge upstream/main
```

### ステップ4: コンフリクトの解決

1. バージョン関連ファイルを優先的に解決
2. CI/CD関連ファイルを解決
3. ソースコードファイルを個別に確認して解決

### ステップ5: テストの実行

```bash
yarn test
yarn lint
```

### ステップ6: マージの完了

```bash
git add .
git commit -m "Merge upstream/main (v1.21.0) into local main"
```

## 注意事項

1. **ローカルのv1.20.0リリースコミット**: ローカルのv1.20.0のリリースコミットは、upstreamに反映されていない可能性がある。必要に応じて、このコミットの内容を確認する。

2. **大規模な変更**: 166ファイルの変更と37ファイルのコンフリクトがあるため、マージには時間がかかる可能性がある。

3. **テストの重要性**: マージ後は必ずテストを実行し、動作確認を行うこと。

4. **依存関係の更新**: `yarn.lock`のコンフリクト解決後は、`yarn install`を実行して依存関係を更新すること。

## 次のステップ

1. マージを実行するかどうかの判断
2. 特定のファイルのコンフリクト内容の詳細確認（必要に応じて）
3. マージ実行とコンフリクト解決
4. テストと動作確認

## 参考情報

### コミット履歴

- ローカルmain: `359c6fc2f` (v1.20.0), `c54d29069` (Release/minor #721)
- upstream/main: `2612328cc` (v1.21.0), `209abd53f` (Release/minor v1.21 #775)
- 共通の祖先: `61e9bd4ba`

### リモートリポジトリ

- upstream: https://github.com/lichtblick-suite/lichtblick.git
- origin: https://github.com/otomatty/lichtblick.git

## 追加ファイルの重複調査

### 調査目的

1.19.0から1.20.0で追加されたファイルと、1.20.0から1.21.0で追加されたファイルで重複しているものがないか調査する。

### 調査方法

以下のGitコマンドを使用して、各バージョン間で追加されたファイルを比較：

```bash
# 1.19.0から1.20.0で追加されたファイルをリストアップ
git diff --name-only --diff-filter=A v1.19.0 v1.20.0 > v1.19_to_v1.20_added.txt

# 1.20.0から1.21.0で追加されたファイルをリストアップ
git diff --name-only --diff-filter=A v1.20.0 v1.21.0 > v1.20_to_v1.21_added.txt

# 重複ファイルを確認
comm -12 <(sort v1.19_to_v1.20_added.txt) <(sort v1.20_to_v1.21_added.txt)
```

### 調査結果

#### 追加ファイル数の統計

- **1.19.0から1.20.0で追加されたファイル**: 81ファイル
- **1.20.0から1.21.0で追加されたファイル**: 32ファイル
- **重複ファイル数**: 0ファイル

#### 重複ファイルの有無

**結論**: 重複ファイルは**存在しない**。

両バージョン間で追加されたファイルを比較した結果、完全に一致するファイル名は1つも見つかりませんでした。

#### 1.19.0から1.20.0で追加された主要ファイル

- **CI/CD関連**:

  - `.github/workflows/enforce-branch-naming.yml`
  - `.github/workflows/gh-pages.yml`
  - `.github/workflows/prerelease.yml`
  - `.github/workflows/release-sync.yml`

- **Extensions API関連**:

  - `packages/suite-base/src/api/extensions/ExtensionAdapter.ts/test.ts`
  - `packages/suite-base/src/api/extensions/ExtensionsAPI.ts/test.ts`
  - `packages/suite-base/src/api/extensions/types.ts`

- **Layouts API関連**:

  - `packages/suite-base/src/api/layouts/LayoutsAPI.ts/test.ts`
  - `packages/suite-base/src/api/layouts/types.ts`

- **HTTP Service関連**:

  - `packages/suite-base/src/services/http/HttpService.ts/test.ts`
  - `packages/suite-base/src/services/http/HttpError.ts/test.ts`
  - `packages/suite-base/src/services/http/types.ts`

- **Extension Loader関連**:

  - `packages/suite-base/src/services/extension/IdbExtensionLoader.ts`
  - `packages/suite-base/src/services/extension/RemoteExtensionLoader.ts/test.ts`
  - 各種ユーティリティファイル（decompressFile, extractFoxeFileContent, parsePackageName, etc.）

- **Layout Manager関連**:

  - `packages/suite-base/src/services/LayoutManager/LayoutManager.test.ts`
  - `packages/suite-base/src/services/LayoutManager/NamespacedLayoutStorage.test.ts`
  - `packages/suite-base/src/services/LayoutManager/WriteThroughLayoutCache.test.ts`
  - 各種ユーティリティファイル（computeLayoutSyncOperations, emitBusyStatus.decorator, isLayoutEqual, updateOrFetchLayouts）

- **コンポーネント関連**:
  - `packages/suite-base/src/components/AppBar/NetworkStatusIndicator.tsx/test.tsx/style.ts`
  - `packages/suite-base/src/components/NamespaceSelectionModal.tsx/test.tsx/style.ts`
  - その他多数のテストファイル

#### 1.20.0から1.21.0で追加された主要ファイル

- **E2Eテスト関連**:

  - `e2e/fixtures/change-to-epoch-format.ts`
  - `e2e/tests/desktop/player/pause-play.desktop.spec.ts`
  - `e2e/tests/desktop/player/playback-seek.desktop.spec.ts`
  - `e2e/tests/desktop/player/player-speed.desktop.spec.ts`

- **Panel関連**:

  - `packages/suite-base/src/components/Panel.style.ts`
  - `packages/suite-base/src/components/PanelErrorBoundary.test.tsx`
  - `packages/suite-base/src/components/PanelLogs.tsx/test.tsx/style.ts`
  - `packages/suite-base/src/components/PanelToolbar/PanelToolbarControls.tsx/test.tsx/style.ts`
  - `packages/suite-base/src/components/PanelToolbar/types.ts`

- **Settings Tree Editor関連**:

  - `packages/suite-base/src/components/SettingsTreeEditor/FieldEditor.test.tsx`
  - `packages/suite-base/src/components/SettingsTreeEditor/index.test.tsx`

- **Workspace関連**:

  - `packages/suite-base/src/context/Workspace/utils.ts/test.ts`

- **Player関連**:

  - `packages/suite-base/src/players/utils/constants.ts`
  - `packages/suite-base/src/players/utils/isTopicHighFrequency.ts/test.ts`

- **Webpack関連**:

  - `packages/suite-desktop/src/webpackCommonConfig.ts/test.ts`
  - `packages/suite-desktop/src/webpackMainConfig.test.ts`
  - `packages/suite-desktop/src/webpackPreloadConfig.test.ts`

- **その他**:
  - `packages/suite-base/src/components/constants.ts`
  - `packages/suite-base/src/components/helpers.ts`
  - `packages/suite-base/src/components/types.ts`
  - `packages/suite-base/src/constants/panelLogs.ts`
  - `packages/suite-base/src/util/calculateStaticItemFrequency.ts/test.ts`

### 結論

1.19.0から1.20.0で追加されたファイルと、1.20.0から1.21.0で追加されたファイルの間には、**重複は存在しない**。両バージョン間で追加されたファイルは完全に異なるものであり、競合や重複のリスクはない。

## v1.21.0の実装詳細調査

### 調査目的

リリースノートに記載されているv1.21.0の新機能とバグ修正について、v1.20.0との差分を調査し、具体的な実装内容を確認する。

### 1. Error log info space (#734)

#### 概要

拡張機能開発者がメッセージコンバーターのエラーや警告をブラウザコンソールで監視する必要があった問題を解決。3Dパネル内にメッセージコンバーターのエラーと警告を直接表示する機能を追加。

#### 実装詳細

**コミット**: `0cfcd39d0` - Create error log info space (#734)

**主な変更ファイル**:

1. **`packages/suite-base/src/components/PanelLogs.tsx`** (新規追加)

   - パネル内にエラーログと情報ログを表示するコンポーネント
   - リサイズ可能なログ表示エリア
   - ログのクリア機能
   - エラースタックトレースの表示

2. **`packages/suite-base/src/components/PanelErrorBoundary.tsx`** (更新)

   - パネルエラーのキャッチとログ記録
   - PanelLogsコンポーネントとの統合

3. **`packages/suite-base/src/components/PanelToolbar/PanelToolbarControls.tsx`** (更新)

   - ログ表示のトグルボタンを追加
   - ログの表示/非表示を制御

4. **`packages/suite-base/src/panels/ThreeDeeRender/ThreeDeeRender.tsx`** (更新)
   - LayerErrorsとPanelLogsの統合
   - 3Dレンダリングパネルでのエラー表示

**実装の特徴**:

- ドラッグ可能なリサイズハンドルでログエリアの高さを調整可能
- エラーログと情報ログを区別して表示
- タイムスタンプ付きログ表示
- エラースタックトレースの詳細表示

**テスト**:

- `PanelLogs.test.tsx` (451行) - 包括的なユニットテスト
- `PanelErrorBoundary.test.tsx` (402行) - エラーバウンダリのテスト
- `PanelToolbarControls.test.tsx` (784行) - ツールバーコントロールのテスト

### 2. Alert for topics with high message frequency (#729)

#### 概要

60Hzを超えるメッセージスループットを持つ高頻度トピックが検出された場合、ユーザーに警告を表示。パフォーマンスボトルネックとメモリ使用量の増加を可視化。

#### 実装詳細

**コミット**: `4ed01a1e6` - New alert for topics with high message frequency (#729)

**主な変更ファイル**:

1. **`packages/suite-base/src/players/utils/isTopicHighFrequency.ts`** (新規追加)

   - トピックのメッセージ頻度をチェックする関数
   - 60Hzを超える場合にアラートを生成
   - ログスキーマ（rosgraph_msgs/Log等）は除外

2. **`packages/suite-base/src/players/utils/constants.ts`** (新規追加)

   - `FREQUENCY_LIMIT = 60` - 頻度の閾値
   - `LOG_SCHEMAS` - 除外するログスキーマのセット

3. **`packages/suite-base/src/util/calculateStaticItemFrequency.ts`** (新規追加)

   - 静的データソース（ファイル再生）でのメッセージ頻度計算
   - 最初と最後のメッセージ時間から頻度を算出

4. **`packages/suite-base/src/players/IterablePlayer/IterablePlayer.ts`** (更新)

   - トピック読み込み時に高頻度チェックを実行
   - 高頻度トピックが検出された場合にアラートを追加

5. **`packages/suite-base/src/players/FoxgloveWebSocketPlayer/index.ts`** (更新)
   - ライブデータソースでも高頻度チェックを実装
   - ヘルパー関数を使用して頻度計算

**実装の特徴**:

- 静的データソース（ファイル）とライブデータソース（WebSocket）の両方で動作
- ログトピックは除外（誤検出を防止）
- 最初の高頻度トピックが検出された時点でアラートを1回のみ表示
- アラートメッセージ: "High frequency topics detected — The current data source has one or more topics with message frequency higher than 60Hz, which may impact performance and application memory."

**テスト**:

- `isTopicHighFrequency.test.ts` (59行) - 頻度チェックのユニットテスト
- `calculateStaticItemFrequency.test.ts` (73行) - 頻度計算のテスト
- `IterablePlayer.test.ts` - プレイヤー統合テスト
- `FoxgloveWebSocketPlayer/helpers.test.ts` (101行) - WebSocketプレイヤーのヘルパーテスト

### 3. Topic aliasing callbacks not re-running on global variable changes (#727)

#### 概要

グローバル変数が追加、更新、または削除された際に、トピックエイリアシングのコールバックが再実行されないバグを修正。`globalVariables`パラメータが常に空になっていた問題を解決。

#### 実装詳細

**コミット**: `b3dd4e0b7` - Fix: Topic aliasing callbacks not re-running on global variable changes (#727)

**主な変更ファイル**:

1. **`packages/suite-base/src/players/UserScriptPlayer/index.ts`** (更新)

   - `setGlobalVariables`メソッドでグローバル変数を適切に転送
   - ラップされたプレイヤー（MessagePipelineProvider > UserScriptPlayer > Base Player）にグローバル変数を正しく伝播

2. **`packages/suite-base/src/players/TopicAliasingPlayer/TopicAliasingPlayer.ts`** (既存機能の改善)
   - `setGlobalVariables`メソッドでエイリアス関数の再処理を実行
   - グローバル変数変更時にステートプロセッサを再構築
   - 再生中でない場合、即座にプレイヤーステートを再処理

**実装の特徴**:

- プレイヤー階層全体でグローバル変数が正しく伝播されるように修正
- グローバル変数変更時にエイリアス関数が再実行される
- 再生中は次のプレイヤーステート更新で処理（パフォーマンス考慮）
- 再生停止中は即座に再処理

**テスト**:

- `UserScriptPlayer/index.test.ts` - グローバル変数伝播のテスト追加
- `TopicAliasingPlayer.test.ts` - エイリアシングの再実行テスト（既存テストの改善）

**関連する既存テスト**:

```typescript
it("updates subscriptions when global variable changes update aliases", async () => {
  // グローバル変数変更時にエイリアスが更新されることを確認
  player.setGlobalVariables({ doMap: true });
  expect(fakePlayer.subscriptions).toEqual([{ topic: "/original_topic_1" }, { topic: "/topic_2" }]);
});
```

### 4. Change namespace to workspace (#738)

#### 概要

コード内の`namespace`という用語を`workspace`に変更。実際の意味により適した用語に統一。

#### 実装詳細

**コミット**: `d79163179` - changing namespace to workspace (#738)

**主な変更ファイル** (23ファイル):

1. **Extensions API関連**:

   - `packages/suite-base/src/api/extensions/ExtensionAdapter.ts`
   - `packages/suite-base/src/api/extensions/ExtensionsAPI.ts`
   - `packages/suite-base/src/api/extensions/types.ts`
   - `extensionNamespace` → `extensionWorkspace` に変更

2. **Layouts API関連**:

   - `packages/suite-base/src/api/layouts/LayoutsAPI.ts`
   - `packages/suite-base/src/api/layouts/types.ts`

3. **Extension Loader関連**:

   - `packages/suite-base/src/services/extension/RemoteExtensionLoader.ts`
   - `packages/suite-base/src/services/extension/IdbExtensionLoader.ts`
   - `namespace` プロパティ → `workspace` に変更

4. **その他のコンポーネント**:
   - `packages/suite-base/src/StudioApp.tsx`
   - `packages/suite-base/src/components/AppBar/NetworkStatusIndicator.tsx`
   - `packages/suite-base/src/components/DocumentDropListener.tsx`
   - その他多数

**変更の影響**:

- APIの型定義が更新
- 内部実装の用語統一
- ユーザー向けの変更はなし（内部リファクタリング）

### 5. E2E tests to the player (#728, #729, #733)

#### 概要

プレイヤー機能に対するE2E（End-to-End）テストを追加。デスクトップアプリケーションでのプレイヤー操作を自動テスト。

#### 実装詳細

**追加されたE2Eテストファイル**:

1. **`e2e/tests/desktop/player/pause-play.desktop.spec.ts`** (125行)

   - プレイ/一時停止ボタンのテスト
   - スペースキーでの操作テスト
   - タイムスタンプの進行確認

2. **`e2e/tests/desktop/player/playback-seek.desktop.spec.ts`** (289行)

   - シーク操作のテスト
   - スライダー操作のテスト
   - 前進/後退ボタンのテスト
   - タイムスタンプの更新確認

3. **`e2e/tests/desktop/player/player-speed.desktop.spec.ts`** (108行)
   - 再生速度変更のテスト
   - 速度設定の確認

**テストヘルパー**:

- `e2e/fixtures/change-to-epoch-format.ts` - エポック形式への変換ヘルパー

**テストの特徴**:

- Playwrightを使用したデスクトップアプリケーションのE2Eテスト
- 実際のUI操作をシミュレート
- タイムスタンプの進行と更新を検証
- 複数の操作方法（ボタンクリック、キーボードショートカット）をテスト

### 6. その他の変更

#### Dependencies from dependabot

- 複数の依存関係パッケージのバージョン更新
- セキュリティ修正とバグ修正の適用

#### Update SonarCloud workflow (#743)

- SonarCloudワークフローの改善
- 特定のエッジケースを無視する設定追加

#### Update playwright to v1.55.1 (#737)

- Playwrightのバージョン更新
- E2Eテストの安定性向上

#### Improve vec2 and vec3 unit tests (#726, #752)

- ベクトル計算のユニットテスト改善
- テストカバレッジの向上

## 実装のまとめ

### 新機能

1. **Error log info space**: 拡張機能開発者向けのデバッグ機能強化

   - 24ファイル変更、3,172行追加、145行削除
   - 包括的なテストカバレッジ

2. **High frequency topic alert**: パフォーマンス監視機能
   - 12ファイル変更、515行追加、33行削除
   - 静的・ライブデータソースの両方で動作

### バグ修正

1. **Topic aliasing callbacks**: グローバル変数変更時の動作修正
   - 2ファイル変更、43行追加、1行削除
   - プレイヤー階層での変数伝播を修正

### リファクタリング

1. **Namespace to workspace**: 用語の統一
   - 23ファイル変更、104行追加、102行削除
   - 内部APIの用語改善

### テスト追加

1. **E2E tests**: プレイヤー機能のE2Eテスト
   - 3つの新しいE2Eテストファイル
   - 522行のテストコード追加

## 参考情報

### コミットハッシュ

- `0cfcd39d0` - Create error log info space (#734)
- `4ed01a1e6` - New alert for topics with high message frequency (#729)
- `b3dd4e0b7` - Fix: Topic aliasing callbacks not re-running on global variable changes (#727)
- `d79163179` - changing namespace to workspace (#738)

### リリースノート

- https://github.com/lichtblick-suite/lichtblick/releases/tag/v1.21.0

## 既存機能への影響分析

### 影響度：大 - Namespace to Workspace API変更 (#738)

#### 影響範囲

**Extensions API**:

```typescript
// v1.20.0
interface IExtensionAPI {
  readonly remoteNamespace: string;
}
type ExtensionInfoSlug = Pick<StoredExtension, "info" | "remoteNamespace">;
type ListExtensionsQueryParams = {
  namespace?: string;
};

// v1.21.0
interface IExtensionAPI {
  readonly workspace: string; // ← 変更
}
type ExtensionInfoWorkspace = Pick<StoredExtension, "info" | "workspace">; // ← 型名も変更
type ListExtensionsQueryParams = {
  workspace?: string; // ← 変更
};
```

**Layouts API**:

```typescript
// v1.20.0
interface LayoutApiData {
  /** User namespace */
  namespace: string;
}

// v1.21.0
interface LayoutApiData {
  /** User workspace */
  workspace: string; // ← 変更
}
```

#### 影響を受ける対象

1. **カスタム拡張機能開発者**

   - Extensions APIを直接使用している拡張機能
   - `remoteNamespace` プロパティを参照しているコード
   - `ExtensionInfoSlug` 型を使用しているコード

2. **Layouts APIを使用しているコード**

   - レイアウトの保存・読み込み処理
   - `namespace` プロパティを参照しているコード

3. **HTTP API呼び出し**
   - クエリパラメータ `namespace` を使用しているAPI呼び出し

#### 対応方法

**破壊的変更**: はい（API契約の変更）

**推奨される移行手順**:

1. 拡張機能内の `remoteNamespace` → `workspace` の置換
2. 型名 `ExtensionInfoSlug` → `ExtensionInfoWorkspace` の更新
3. Layouts API呼び出しの `namespace` → `workspace` の置換
4. テストの実行と動作確認

**後方互換性**: なし（プロパティ名が変更されているため）

#### 影響度評価

- **内部実装**: 中（23ファイル変更）
- **公開API**: 高（型定義とプロパティ名の変更）
- **既存拡張機能**: 高（API使用箇所の修正が必要）

### 影響度：中 - Topic aliasing callbacks の挙動変更 (#727)

#### 影響範囲

**変更内容**:

- グローバル変数が変更された際に、トピックエイリアシングのコールバックが**正しく再実行されるようになった**
- 以前は動作していなかった機能が、正常に動作するようになる

#### 影響を受ける対象

1. **TopicAliasingを使用している拡張機能**

   - `registerTopicAliases` APIを使用している拡張機能
   - グローバル変数を参照するエイリアス関数

2. **既存の回避策に依存しているコード**
   - バグの回避策として独自の実装をしていた場合

#### 具体的な動作変更

**v1.20.0 (バグあり)**:

```typescript
// グローバル変数を変更してもエイリアス関数が再実行されない
// globalVariables パラメータが常に空
registerTopicAliases((opt) => {
  if (opt.globalVariables["doMap"] !== true) {
    return []; // 常にここに入る（バグ）
  }
  return [{ sourceTopicName: "/original", name: "/renamed" }];
});
```

**v1.21.0 (修正後)**:

```typescript
// グローバル変数を変更すると正しく再実行される
// globalVariables パラメータが正しく渡される
registerTopicAliases((opt) => {
  if (opt.globalVariables["doMap"] !== true) {
    return [];
  }
  return [{ sourceTopicName: "/original", name: "/renamed" }]; // 正しく動作
});
```

#### 対応方法

**破壊的変更**: 部分的（バグ修正だが、挙動が変わる）

**確認すべきポイント**:

1. グローバル変数を使用するエイリアス関数が正しく動作するか確認
2. バグの回避策として独自実装していた場合は削除可能
3. エイリアス関数が想定外のタイミングで実行されないか確認

**後方互換性**: ほぼあり（バグ修正なので、正常動作への修正）

#### 影響度評価

- **内部実装**: 小（2ファイル変更）
- **公開API**: なし（APIシグネチャは変更なし）
- **既存拡張機能**: 中（動作していなかった機能が動くようになる）

### 影響度：小〜中 - High frequency topic alert (#729)

#### 影響範囲

**変更内容**:

- 60Hzを超える高頻度トピックが検出された場合、新しい警告アラートが表示される
- ログトピック（rosgraph_msgs/Log等）は除外される

#### 影響を受ける対象

1. **高頻度データを扱うユーザー**

   - センサーデータ（カメラ、LiDAR等）の再生
   - 高頻度のテレメトリデータ

2. **ユーザー体験**
   - 新しいアラートが表示されることによる視覚的な変化
   - パフォーマンス問題の早期発見

#### 具体的な動作変更

**v1.20.0**:

- 高頻度トピックがあっても警告なし
- ユーザーはパフォーマンス低下の原因を特定しにくい

**v1.21.0**:

- 60Hzを超えるトピックが検出されると警告表示
- アラートメッセージ: "High frequency topics detected — The current data source has one or more topics with message frequency higher than 60Hz, which may impact performance and application memory."

#### 対応方法

**破壊的変更**: なし（新機能の追加）

**確認すべきポイント**:

1. 高頻度データを扱う場合、アラートが表示されることを理解
2. アラートは情報提供のみで、機能制限はなし
3. ログトピックは除外されるため、誤検出は少ない

**後方互換性**: あり（既存機能への影響なし）

#### 影響度評価

- **内部実装**: 中（12ファイル変更、515行追加）
- **公開API**: なし
- **ユーザー体験**: 小〜中（新しいアラートが表示される）

### 影響度：小 - Error log info space (#734)

#### 影響範囲

**変更内容**:

- 3Dパネルに新しいログ表示機能が追加される
- エラーと警告がパネル内で確認可能になる

#### 影響を受ける対象

1. **拡張機能開発者**

   - メッセージコンバーターのエラーが可視化される
   - デバッグが容易になる

2. **3Dパネルを使用するユーザー**
   - パネルのUI要素が増える（ログ表示エリア）

#### 対応方法

**破壊的変更**: なし（新機能の追加）

**確認すべきポイント**:

1. 3Dパネルに新しいUI要素が追加される
2. ログ表示エリアはデフォルトで非表示（トグル可能）
3. 既存の3Dパネル機能には影響なし

**後方互換性**: あり

#### 影響度評価

- **内部実装**: 大（24ファイル変更、3,172行追加）
- **公開API**: なし
- **ユーザー体験**: 小（オプション機能の追加）

## 影響のまとめと推奨事項

### 優先度：高 - 必須対応

1. **Namespace to Workspace API変更**
   - **対象**: カスタム拡張機能を開発している場合
   - **対応**: APIプロパティ名の変更対応が必須
   - **時期**: v1.21.0へのアップグレード前に対応

### 優先度：中 - 確認推奨

2. **Topic aliasing callbacks の挙動変更**

   - **対象**: `registerTopicAliases` を使用している拡張機能
   - **対応**: 動作確認とテストの実行
   - **時期**: v1.21.0へのアップグレード後に確認

3. **High frequency topic alert**
   - **対象**: 高頻度データを扱うユーザー
   - **対応**: アラートが表示されることを理解（対応不要）
   - **時期**: 影響なし

### 優先度：低 - 確認のみ

4. **Error log info space**
   - **対象**: 3Dパネルを使用するユーザー
   - **対応**: 新機能の確認のみ
   - **時期**: 影響なし

### マイグレーションチェックリスト

- [ ] カスタム拡張機能で `remoteNamespace` を使用していないか確認
- [ ] Layouts APIで `namespace` プロパティを参照していないか確認
- [ ] `ExtensionInfoSlug` 型を使用していないか確認
- [ ] `registerTopicAliases` を使用している場合、動作確認
- [ ] 高頻度トピックを扱う場合、新しいアラートを確認
- [ ] 3Dパネルの新しいログ機能を確認
