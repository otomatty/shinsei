# Phase 6 実装完了レポート

**実装日**: 2025年10月9日
**Phase**: 6 - 複数バージョン対応のDBマイグレーション
**ステータス**: ✅ 実装完了

---

## 📋 実装概要

IndexedDBのマイグレーション処理を実装し、拡張機能の複数バージョン同時インストールに対応しました。

---

## 🎯 実装内容

### 1. マイグレーション処理ファイルの作成 ✅

**ファイル**: `/packages/suite-base/src/services/extension/IdbExtensionStorageMigration.ts`

**実装機能**:

- `migrateV1ToV2()`: V1→V2マイグレーション処理
- `migrateMetadataStore()`: メタデータストアのマイグレーション
- `migrateExtensionsStore()`: 拡張機能ストアのマイグレーション
- `isV2Format()`: V2形式判定
- `toV2Id()`: V1→V2 ID変換
- `extractBaseId()`: ベースID抽出
- `extractVersion()`: バージョン抽出

**マイグレーション処理**:

```typescript
// V1形式: "publisher.name" → V2形式: "publisher.name@version"
const oldId = "foxglove.blank-panel";
const newId = "foxglove.blank-panel@1.0.0";
const marketplaceId = "foxglove.blank-panel";
```

**特徴**:

- トランザクション内で安全に実行
- エラーが発生してもスキップして続行
- ログ出力による進捗確認
- V2形式データは自動スキップ（冪等性）

### 2. IdbExtensionStorageの更新 ✅

**ファイル**: `/packages/suite-base/src/services/extension/IdbExtensionStorage.ts`

**変更内容**:

- DBバージョンを1→2に変更
- upgrade関数でマイグレーション処理を呼び出し
- V1スキーマとV2マイグレーションの両方をサポート

**実装**:

```typescript
const CURRENT_DB_VERSION = 2;

this.#db = IDB.openDB<ExtensionsDB>([DATABASE_BASE_NAME, namespace].join("-"), CURRENT_DB_VERSION, {
  upgrade: async (db, oldVersion, _newVersion, transaction) => {
    // Version 1: Initial schema creation
    if (oldVersion < 1) {
      // ストア作成
    }

    // Version 2: Multi-version support migration
    if (oldVersion < 2) {
      await migrateV1ToV2(transaction as any, METADATA_STORE_NAME, EXTENSION_STORE_NAME);
    }
  },
});
```

### 3. IdbExtensionLoaderの更新 ✅

**ファイル**: `/packages/suite-base/src/services/extension/IdbExtensionLoader.ts`

**変更内容**:

- ID生成ロジックをV2形式に変更
- `marketplaceId`の設定を追加

**実装**:

```typescript
const baseId = `${normalizedPublisher}.${rawInfo.name}`;
const versionedId = toV2Id(baseId, rawInfo.version);

const newExtension: StoredExtension = {
  content: foxeFileData,
  info: {
    ...rawInfo,
    id: versionedId, // V2 format: includes version
    marketplaceId: baseId, // Base ID for marketplace linking
    // ...
  },
};
```

### 4. 型定義の確認 ✅

**ファイル**: `/packages/suite-base/src/types/Extensions.ts`

**確認内容**:

- `marketplaceId?: string` - 既に定義済み
- `availableVersions?: string[]` - 既に定義済み

**ExtensionInfo型**:

```typescript
export type ExtensionInfo = {
  id: string; // V2: "publisher.name@version"
  version: string;
  marketplaceId?: string; // "publisher.name"
  availableVersions?: string[]; // ["1.0.0", "1.1.0"]
  // ... その他のフィールド
};
```

---

## 🔄 マイグレーション動作フロー

### ユーザーの操作

1. **アプリ起動**
2. **IndexedDB接続** → バージョンチェック
3. **自動マイグレーション実行**（V1データが存在する場合）
4. **拡張機能ロード** → V2形式で動作

### マイグレーション処理

```
起動時
  ↓
IndexedDB V1を検出
  ↓
upgrade関数が自動実行
  ↓
V1 → V2マイグレーション
  ├── Metadataストアを変換
  │   ├── 既存レコードを読み取り
  │   ├── IDにバージョンを追加
  │   ├── marketplaceIdを設定
  │   └── 古いレコードを削除 → 新レコード作成
  │
  └── Extensionsストアを変換
      ├── 既存レコードを読み取り
      ├── info.idにバージョンを追加
      ├── info.marketplaceIdを設定
      └── 古いレコードを削除 → 新レコード作成
  ↓
マイグレーション完了
  ↓
V2形式で動作開始
```

### 新規インストール時

```
拡張機能インストール
  ↓
IdbExtensionLoader.installExtension()
  ↓
ID生成: toV2Id(baseId, version)
  ↓
"publisher.name@1.0.0"形式で保存
  ↓
marketplaceId: "publisher.name"を設定
```

---

## 🧪 テストシナリオ

### シナリオ1: 既存V1データのマイグレーション

**前提条件**:

- V1データベースに拡張機能が1つ以上存在
- ID形式: `"foxglove.blank-panel"`

**実行手順**:

1. アプリを起動
2. Developer Toolsのコンソールを確認

**期待結果**:

- ログに「Upgrading to V2」が表示
- ID が `"foxglove.blank-panel@1.0.0"` に変換
- `marketplaceId` が `"foxglove.blank-panel"` として設定
- マイグレーション完了ログが表示

### シナリオ2: 新規インストール（V2環境）

**前提条件**:

- 空のデータベース、またはV2データベース

**実行手順**:

1. 拡張機能をインストール

**期待結果**:

- ID が `"publisher.name@version"` 形式で保存
- `marketplaceId` が `"publisher.name"` として設定

### シナリオ3: 複数バージョンの同時インストール

**前提条件**:

- V2データベース

**実行手順**:

1. 同じ拡張機能のv1.0.0をインストール
2. 同じ拡張機能のv1.1.0をインストール

**期待結果**:

- 両バージョンが共存
- ID:
  - `"publisher.name@1.0.0"`
  - `"publisher.name@1.1.0"`
- 両方の`marketplaceId`が`"publisher.name"`

### シナリオ4: マイグレーション済みデータの再起動

**前提条件**:

- V2データベース（既にマイグレーション済み）

**実行手順**:

1. アプリを再起動

**期待結果**:

- マイグレーションスキップ（IDに`@`が含まれるため）
- データは変更されない

---

## 📊 マイグレーション統計

### 処理時間の見積もり

- **1拡張機能**: ~10ms
- **10拡張機能**: ~100ms
- **100拡張機能**: ~1秒

### データサイズの変化

- **V1レコード**: ~100KB/拡張機能
- **V2レコード**: ~100KB/拡張機能（サイズ変化なし）
- **追加フィールド**: `marketplaceId` (~50 bytes)

---

## 🚨 注意事項

### ダウングレード不可

V2→V1へのダウングレードはサポートされていません。

### バックアップ推奨

マイグレーション前に以下をバックアップ:

1. IndexedDBのエクスポート（Developer Tools）
2. インストール済み拡張機能のスクリーンショット

### ロールバック手順

マイグレーション失敗時:

1. Developer Tools → Application → IndexedDB
2. データベースを削除: `{workspace}.umi-extensions-{namespace}`
3. アプリを再起動
4. 拡張機能を再インストール

---

## 📝 変更ファイル一覧

### 新規作成

- `/packages/suite-base/src/services/extension/IdbExtensionStorageMigration.ts` (205行)

### 修正

- `/packages/suite-base/src/services/extension/IdbExtensionStorage.ts` (+13行)
- `/packages/suite-base/src/services/extension/IdbExtensionLoader.ts` (+5行)

### 確認済み（変更なし）

- `/packages/suite-base/src/types/Extensions.ts`（既に対応済み）

---

## 🎉 完了チェックリスト

- [x] マイグレーション処理ファイルの作成
- [x] IdbExtensionStorageのupgrade関数実装
- [x] IdbExtensionLoaderのID生成ロジック更新
- [x] 型定義の確認（marketplaceId, availableVersions）
- [x] エラーハンドリングの実装
- [x] ログ出力の実装
- [x] 冪等性の確保（再実行時のスキップ）

---

## 🚀 次のステップ

### 推奨作業

1. **統合テスト**

   - 実際のアプリでマイグレーションを実行
   - 既存拡張機能の動作確認
   - 複数バージョンのインストールテスト

2. **ドキュメント更新**

   - ユーザーマニュアルの更新
   - 開発者ガイドの更新

3. **モニタリング**
   - マイグレーションエラーの監視
   - パフォーマンス測定

---

**実装者**: AI Assistant
**レビュー**: 未実施
**承認**: 未実施
**デプロイ**: 未実施
