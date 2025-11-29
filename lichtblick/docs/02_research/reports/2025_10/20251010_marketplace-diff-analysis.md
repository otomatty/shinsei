# マーケットプレイス機能の差分分析レポート

## 実行日時

2025年10月10日

## 概要

mainブランチとumi-mainブランチの差分を分析し、マーケットプレイス機能に関連する変更を調査しました。

---

## 1. 新規追加ファイル (マーケットプレイス機能関連)

### 1.1 サーバー関連ファイル

**ディレクトリ: `/server/`**

マーケットプレイスのアセットを提供する開発用静的ファイルサーバー:

- **`server/server.js`** - Node.js HTTPサーバー実装

  - CORS対応の静的ファイルサーバー
  - ポート: 3001 (デフォルト)
  - MIME typeサポート (.json, .png, .jpg, .foxe等)

- **`server/package.json`** - サーバーのパッケージ定義

  - スクリプト: `start`, `dev`, `validate`

- **`server/schemas.js`** - データバリデーションスキーマ定義

  - Extension schema
  - Extension version schema
  - Layout schema

- **`server/validator.js`** - バリデーション関数

  - 型チェック
  - 必須フィールド検証
  - ID重複チェック

- **`server/validate.js`** - CLIバリデーションツール
  - 拡張機能とレイアウトの検証
  - カラー出力対応
  - エラーレポート機能

### 1.2 拡張機能アセット

**ディレクトリ: `/server/assets/extensions/`**

- **`extensions.json`** - 拡張機能マーケットプレイスのメタデータ
  - 含まれる拡張機能:
    - Log Message Viewer (Pyka, Inc.)
    - MatricDecode (Matic Robots) - h.264デコーダー
    - Bar Display (laszloturanyi) - スカラー値の棒グラフ表示

各拡張機能には以下の情報を含む:

- id, name, publisher, description
- homepage, license, tags
- readme, changelog へのリンク
- バージョン情報とダウンロードURL

### 1.3 レイアウトアセット

**ディレクトリ: `/server/assets/layouts/`**

- **`layouts.json`** - レイアウトマーケットプレイスのメタデータ
- **個別レイアウトファイル:**
  - `robotics-dashboard.json` - ロボティクスダッシュボード
  - `autonomous-vehicle-layout.json` - 自動運転車向けレイアウト
  - `drone-monitoring.json` - ドローン監視用レイアウト
  - `minimal-debug.json` - デバッグ用最小レイアウト
  - `sample1.json` - サンプルレイアウト (3D + Diagnostic Status)

各レイアウトには以下の設定を含む:

- パネル設定 (configById)
- グローバル変数
- 再生設定
- レイアウト構造 (split panels, direction, percentage)

### 1.4 Claude AI開発コマンド

**ディレクトリ: `.claude/commands/`**

開発ワークフロー自動化コマンド:

- **KAIRO (要件→設計→実装) シリーズ:**

  - `kairo-requirements.md` - EARS記法による要件定義
  - `kairo-design.md` - アーキテクチャ設計
  - `kairo-tasks.md` - タスク分割 (TDD/DIRECT)
  - `kairo-task-verify.md` - タスクファイル検証
  - `kairo-implement.md` - TDDによる実装

- **REV (リバースエンジニアリング) シリーズ:**

  - `rev-tasks.md` - コードベースからタスク抽出
  - `rev-design.md` - 設計書の逆生成
  - `rev-requirements.md` - 要件定義の逆生成
  - `rev-specs.md` - テストケースとスペックの逆生成

- **DIRECT (直接作業) シリーズ:**
  - `direct-setup.md` - 環境構築・設定作業
  - `direct-verify.md` - 動作確認・品質チェック

---

## 2. 修正されたファイル (ブランディング変更)

### 2.1 パッケージ名の変更: `@lichtblick` → `@umi`

影響範囲:

- 全パッケージの `package.json`
- import/export文
- 型定義ファイル
- 設定ファイル (tsconfig.json等)

### 2.2 主な変更ファイル:

**ワークスペース設定:**

- `package.json` - ワークスペースパッケージ名更新
- `yarn.lock` - 依存関係の更新

**TypeScript設定:**

- `tsconfig.json`, `tsconfig.eslint.json` - パス解決の更新
- `web/src/tsconfig.json` - パスエイリアスの変更

**アプリケーションエントリーポイント:**

- `web/src/entrypoint.tsx` - `@lichtblick/suite-web` → `@umi/suite-web`
- `web/src/index.tsx` - 新規追加 (型定義)
- `web/integration-test/startup.test.ts` - import更新
- `web/webpack.config.ts` - ビルド設定の更新

**ライセンスヘッダー:**

- `lichtblick@bmwgroup.com` → `umi@bmwgroup.com`

**SonarQube設定:**

- `sonar-project.properties` - プロジェクトキーの変更

---

## 3. 新規追加ファイル (その他)

### 3.1 テスト用ディレクトリ

**`test_dirs/`**

- `test_dirs/oss/` - OSSバージョンのテストコード
  - `package.json`, `index.js`, `legacy.js`
- `test_dirs/custom/` - カスタム版のテストコード
  - `package.json`, `index.js`, `config.js`

### 3.2 差分チェッカーツール

**`diff-checker/`**

- `diff-checker.sh` - 差分チェックスクリプト
- `diff-analyzer.py` - Python製差分分析ツール
- `git-diff-helper.sh` - Git差分ヘルパー
- `diff-tools-README.md` - ツールのドキュメント

### 3.3 ドキュメント

**`docs/`**

- `docs/original-rename.md` - リネーム履歴
- `docs/tasks.md` - タスク管理 (空)
- `docs/contribution/github-discussion-layout-marketplace-ja-simplified.md` - コントリビューションガイド (日本語)
- デプロイメント関連ドキュメント (AWS設計書等)

---

## 4. マーケットプレイス機能の実装内容

### 4.1 拡張機能マーケットプレイス

**アーキテクチャ:**

- JSONベースのメタデータ管理
- 静的ファイルサーバーによる配信
- バリデーション機能付き

**データ構造:**

```json
{
  "id": "publisher.extension-name",
  "name": "Extension Name",
  "publisher": "Publisher Name",
  "description": "...",
  "homepage": "https://...",
  "license": "MIT",
  "tags": ["tag1", "tag2"],
  "namespace": "official",
  "readme": "https://raw.githubusercontent.com/.../README.md",
  "changelog": "https://raw.githubusercontent.com/.../CHANGELOG.md",
  "versions": {
    "v1.0.0": {
      "version": "v1.0.0",
      "publishedDate": "2025-10-04T01:21:25Z",
      "sha256sum": "...",
      "foxe": "https://github.com/.../download/.../extension.foxe"
    }
  }
}
```

### 4.2 レイアウトマーケットプレイス

**アーキテクチャ:**

- JSONベースのレイアウト定義
- パネル設定、グローバル変数、再生設定を含む
- ユースケース別の事前定義レイアウト

**データ構造:**

```json
{
  "id": "layout-id",
  "name": "Layout Name",
  "publisher": "Publisher Name",
  "description": "...",
  "tags": ["tag1", "tag2"],
  "layout": "http://localhost:3001/layouts/layout-file.json"
}
```

**提供されるレイアウト:**

1. **Robotics Dashboard** - ロボティクス用総合ダッシュボード
2. **Autonomous Vehicle Layout** - 自動運転開発用レイアウト
3. **Drone Monitoring** - ドローン監視用レイアウト
4. **Minimal Debug Layout** - デバッグ用シンプルレイアウト
5. **Sample Layout 1** - サンプルレイアウト

### 4.3 開発ワークフロー

Claude AIコマンドによる開発自動化:

**フォワードエンジニアリング (KAIRO):**

```
要件定義 → 設計 → タスク分割 → TDD実装
```

**リバースエンジニアリング (REV):**

```
既存コード → タスク抽出 → 設計書生成 → 要件定義生成 → テストスペック生成
```

**直接作業 (DIRECT):**

```
環境構築・設定 → 動作確認
```

---

## 5. 使わなくなったファイル・機能

### 5.1 削除されたファイル

本差分では、mainブランチから削除されたファイルは**確認されませんでした**。

### 5.2 非推奨になった可能性のある機能

- `@lichtblick` namespaceのパッケージ (全て `@umi` に移行)

---

## 6. マーケットプレイス機能の使用方法

### 6.1 サーバーの起動

```bash
# serverディレクトリに移動
cd server

# サーバー起動
npm start

# または開発モード (自動再起動)
npm run dev
```

サーバーが起動すると:

- http://localhost:3001/extensions/extensions.json - 拡張機能一覧
- http://localhost:3001/layouts/layouts.json - レイアウト一覧

### 6.2 環境変数の設定

アプリケーション側で以下の環境変数を設定:

```bash
EXTENSION_MARKETPLACE_URL=http://localhost:3001/extensions/extensions.json
LAYOUT_MARKETPLACE_URL=http://localhost:3001/layouts/layouts.json
```

### 6.3 バリデーション

マーケットプレイスデータの検証:

```bash
# 全ファイルを検証
npm run validate

# 拡張機能のみ検証
npm run validate:extensions

# レイアウトのみ検証
npm run validate:layouts
```

---

## 7. まとめ

### 7.1 主要な変更点

1. **マーケットプレイス機能の追加**

   - 拡張機能マーケットプレイス (3つの拡張機能を含む)
   - レイアウトマーケットプレイス (5つのレイアウトを含む)
   - 開発用静的ファイルサーバー
   - バリデーション機能

2. **ブランディングの変更**

   - `@lichtblick` → `@umi` への全面的なリネーム
   - メールアドレスの変更 (`lichtblick@bmwgroup.com` → `umi@bmwgroup.com`)

3. **開発ワークフローの強化**

   - Claude AIコマンドによる自動化
   - フォワード/リバースエンジニアリング対応
   - TDD/DIRECT実装プロセス

4. **テスト・ツール環境の整備**
   - 差分チェッカーツール
   - テスト用ディレクトリ構造

### 7.2 削除・非推奨のファイル

現時点では**削除されたファイルは確認されませんでした**。ただし、以下は非推奨となりました:

- `@lichtblick` namespaceを使用した全てのimport/require

### 7.3 次のステップ

1. マーケットプレイス機能のリファクタリング計画立案
2. エラーハンドリングの強化
3. セキュリティ検証
4. パフォーマンス最適化
5. ドキュメントの充実化
