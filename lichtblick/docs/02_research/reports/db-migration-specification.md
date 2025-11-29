# IndexedDB マイグレーション仕様書

**作成日**: 2025年10月9日
**対象**: IdbExtensionStorage (拡張機能ストレージ)
**マイグレーション**: Version 1 → Version 2
**目的**: 複数バージョン対応（同じ拡張機能の複数バージョンを同時インストール可能にする）

---

## 📋 概要

現在の`IdbExtensionStorage`は単一バージョンのみをサポートしており、同じ拡張機能の異なるバージョンをインストールすると上書きされてしまいます。Version 2では、バージョンをIDに含めることで、複数バージョンの共存を可能にします。

---

## 🗄️ 現在のデータ構造（Version 1）

### データベース情報

- **データベース名**: `{workspace}.umi-extensions-{namespace}`
- **バージョン**: 1
- **ストア**:
  - `metadata`: ExtensionInfo（メタデータのみ）
  - `extensions`: StoredExtension（メタデータ + バイナリコンテンツ）

### ExtensionInfo（Version 1）

```typescript
{
  id: "foxglove.blank-panel",           // バージョンなし
  name: "blank-panel",
  publisher: "foxglove",
  version: "1.0.0",                     // バージョンは別フィールド
  qualifiedName: "local.foxglove.blank-panel",
  namespace: "local",
  // ... その他のメタデータ
}
```

### 問題点

1. **IDが一意でない**: 同じ`id`で異なるバージョンをインストールすると上書きされる
2. **マーケットプレイスとの紐付けが困難**: どのマーケットプレイスアイテムに対応するか不明
3. **アップデート管理の複雑さ**: 旧バージョンと新バージョンの関係が不明確

---

## 🔄 新しいデータ構造（Version 2）

### データベース情報

- **データベース名**: `{workspace}.umi-extensions-{namespace}`（変更なし）
- **バージョン**: 2
- **ストア**:
  - `metadata`: ExtensionInfo（メタデータのみ）
  - `extensions`: StoredExtension（メタデータ + バイナリコンテンツ）

### ExtensionInfo（Version 2）

```typescript
{
  id: "foxglove.blank-panel@1.0.0",     // バージョン含む（一意）
  name: "blank-panel",
  publisher: "foxglove",
  version: "1.0.0",
  marketplaceId: "foxglove.blank-panel", // マーケットプレイスとの紐付け
  qualifiedName: "local.foxglove.blank-panel",
  namespace: "local",
  availableVersions: ["1.0.0", "1.1.0"], // オプション: 利用可能なバージョン
  // ... その他のメタデータ
}
```

### 変更点

1. **IDにバージョンを含める**: `{publisher}.{name}@{version}` 形式
2. **marketplaceIdの追加**: バージョンなしのベースID（`{publisher}.{name}`）
3. **availableVersionsの追加**: アップデート確認用（オプション）

### メリット

1. ✅ **複数バージョンの共存**: 同じ拡張機能の異なるバージョンを同時にインストール可能
2. ✅ **マーケットプレイス連携**: `marketplaceId`でマーケットプレイスアイテムと紐付け
3. ✅ **アップデート管理**: 同じ`marketplaceId`でグルーピング、アップデート検出が容易
4. ✅ **後方互換性**: 既存データを自動マイグレーション

---

## 🔧 マイグレーション処理の詳細

### マイグレーション処理フロー

```
既存データ（V1）
├── metadata ストア
│   └── id: "foxglove.blank-panel"
│       version: "1.0.0"
│
└── extensions ストア
    └── info.id: "foxglove.blank-panel"
        info.version: "1.0.0"

↓ マイグレーション（V1 → V2）

新データ（V2）
├── metadata ストア
│   └── id: "foxglove.blank-panel@1.0.0"  ← バージョン追加
│       marketplaceId: "foxglove.blank-panel"  ← 新規追加
│       version: "1.0.0"
│
└── extensions ストア
    └── info.id: "foxglove.blank-panel@1.0.0"  ← バージョン追加
        info.marketplaceId: "foxglove.blank-panel"  ← 新規追加
        info.version: "1.0.0"
```

### 実装ステップ

#### Step 1: DBバージョンを2に上げる

```typescript
this.#db = IDB.openDB<ExtensionsDB>(
  [DATABASE_BASE_NAME, namespace].join("-"),
  2, // ← 1から2に変更
  {
    upgrade: async (db, oldVersion, newVersion, transaction) => {
      // マイグレーション処理
    },
  },
);
```

#### Step 2: V1からV2へのマイグレーション

```typescript
if (oldVersion < 2) {
  log.info("Migrating extension storage to v2: multi-version support");

  const metadataStore = transaction.objectStore(METADATA_STORE_NAME);
  const extensionsStore = transaction.objectStore(EXTENSION_STORE_NAME);

  // 1. メタデータストアのマイグレーション
  const metadataRecords = await metadataStore.getAll();
  for (const extension of metadataRecords) {
    // IDにバージョンが含まれていない場合のみマイグレーション
    if (!extension.id.includes("@")) {
      const oldId = extension.id;
      const newId = `${extension.id}@${extension.version}`;
      const marketplaceId = extension.id; // 既存のIDをmarketplaceIdとして保存

      // 古いレコードを削除
      await metadataStore.delete(oldId);

      // 新しいレコードを作成
      await metadataStore.put({
        ...extension,
        id: newId,
        marketplaceId,
      });

      log.debug(`Migrated metadata: ${oldId} → ${newId}`);
    }
  }

  // 2. 拡張機能ストアのマイグレーション
  const extensionRecords = await extensionsStore.getAll();
  for (const stored of extensionRecords) {
    if (!stored.info.id.includes("@")) {
      const oldId = stored.info.id;
      const newId = `${stored.info.id}@${stored.info.version}`;
      const marketplaceId = stored.info.id;

      // 古いレコードを削除
      await extensionsStore.delete(oldId);

      // 新しいレコードを作成
      await extensionsStore.put({
        ...stored,
        info: {
          ...stored.info,
          id: newId,
          marketplaceId,
        },
      });

      log.debug(`Migrated extension: ${oldId} → ${newId}`);
    }
  }

  log.info("Extension storage migration to v2 completed");
}
```

### マイグレーション対象の判定

**条件**: IDに `@` が含まれていない場合にマイグレーション

- ✅ `foxglove.blank-panel` → マイグレーション対象
- ❌ `foxglove.blank-panel@1.0.0` → 既にV2形式（スキップ）

### エラーハンドリング

1. **トランザクション失敗**: 全体をロールバック（IndexedDBの標準動作）
2. **個別レコードエラー**: ログに記録し、次のレコードに進む
3. **データ破損**: バリデーションエラーとしてログに記録

---

## 🧪 テストケース

### 1. 新規インストール（V2データベース）

**前提**: DBバージョン2で初めて拡張機能をインストール

**期待結果**:

- IDが `publisher.name@version` 形式で保存される
- `marketplaceId` が `publisher.name` として設定される

### 2. マイグレーション（V1 → V2）

**前提**: V1データベースに既存データが存在

**入力データ（V1）**:

```json
{
  "id": "foxglove.blank-panel",
  "version": "1.0.0",
  "publisher": "foxglove",
  "name": "blank-panel"
}
```

**期待結果（V2）**:

```json
{
  "id": "foxglove.blank-panel@1.0.0",
  "version": "1.0.0",
  "publisher": "foxglove",
  "name": "blank-panel",
  "marketplaceId": "foxglove.blank-panel"
}
```

### 3. 複数バージョンのインストール

**前提**: 同じ拡張機能の異なるバージョンをインストール

**期待結果**:

```json
[
  {
    "id": "foxglove.blank-panel@1.0.0",
    "marketplaceId": "foxglove.blank-panel",
    "version": "1.0.0"
  },
  {
    "id": "foxglove.blank-panel@1.1.0",
    "marketplaceId": "foxglove.blank-panel",
    "version": "1.1.0"
  }
]
```

### 4. マイグレーション済みデータの再マイグレーション

**前提**: 既にV2形式のデータ

**期待結果**:

- スキップされる（IDに `@` が含まれているため）
- データは変更されない

---

## 🔍 検証項目

### データ整合性

- [ ] 両方のストア（metadata、extensions）で同じIDが使用されている
- [ ] `marketplaceId` が全てのレコードに存在する
- [ ] IDに `@` とバージョンが含まれている

### 機能検証

- [ ] 既存のインストール済み拡張機能が読み込める
- [ ] 新規インストール時にV2形式で保存される
- [ ] 同じ拡張機能の複数バージョンを同時にインストールできる
- [ ] `marketplaceId` でマーケットプレイスアイテムと紐付けできる
- [ ] アンインストール時にバージョン付きIDで削除される

### パフォーマンス

- [ ] マイグレーション処理が5秒以内に完了する（100拡張機能想定）
- [ ] 読み込み時のパフォーマンス低下がない
- [ ] インストール時のパフォーマンス低下がない

---

## 🚨 注意事項

### ダウングレード非対応

V2からV1へのダウングレードはサポートされません。V2データベースをV1クライアントで開こうとすると、バージョン不一致エラーが発生します。

### バックアップ推奨

マイグレーション前に、以下のバックアップを推奨します：

1. IndexedDBのエクスポート（Developer Tools）
2. インストール済み拡張機能のリスト保存

### ロールバック手順

マイグレーション失敗時:

1. IndexedDBをクリア: `indexedDB.deleteDatabase("{workspace}.umi-extensions-{namespace}")`
2. アプリケーションを再起動
3. 拡張機能を再インストール

---

## 📅 実装スケジュール

### Phase 6.1: マイグレーション処理実装

- **作業内容**: `IdbExtensionStorage.ts` のマイグレーション処理追加
- **検証**: ユニットテスト、統合テスト

### Phase 6.2: インストールロジック更新

- **作業内容**: `IdbExtensionLoader.ts` のID生成ロジック更新
- **検証**: 新規インストールと複数バージョンインストールのテスト

### Phase 6.3: UI連携確認

- **作業内容**: ExtensionSettings コンポーネントとの統合確認
- **検証**: E2Eテスト、手動テスト

---

## 📖 参考情報

### 関連ファイル

- `/packages/suite-base/src/services/extension/IdbExtensionStorage.ts` - ストレージ実装
- `/packages/suite-base/src/services/extension/IdbExtensionLoader.ts` - ローダー実装
- `/packages/suite-base/src/types/Extensions.ts` - 型定義
- `/packages/suite-base/src/types/marketplace.ts` - マーケットプレイス型定義

### IndexedDB仕様

- [IndexedDB API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [IDB Library - jakearchibald/idb](https://github.com/jakearchibald/idb)

---

**作成者**: AI Assistant
**レビュー**: 未実施
**承認**: 未実施
