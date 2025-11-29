# マーケットプレイス データ構造 変更履歴

このドキュメントは、Extensionsおよびlayoutsのデータ構造に関する変更履歴を記録します。

---

## [1.2.0] - 2025-10-07

### 削除 (Removed)

- ✅ **Layoutsから`version`フィールドを削除**

  - レイアウトにはバージョン管理が不要と判断
  - Extensionsのように複数バージョンを管理する必要がない
  - よりシンプルで直感的なデータ構造を実現

- ✅ **Layoutsから`createdAt`と`updatedAt`フィールドを削除**
  - Layoutsのデータ構造を簡素化
  - Extensionsとは異なり、Layoutsはバージョン管理やタイムスタンプ追跡を必要としない
  - より軽量で管理しやすいデータ構造を実現

### 影響範囲 (Impact)

#### データファイル

- `/server/data/layouts.json` - 全エントリーから`version`、`createdAt`、`updatedAt`を削除

#### サーバー実装

- Express (`/server/express/src/index.ts`)

  - `Layout`インターフェース: `version`、`createdAt`、`updatedAt`を削除

- Hono (`/server/hono/src/index.ts`)

  - `Layout`インターフェース: `version`、`createdAt`、`updatedAt`を削除

- Go (`/server/go/main.go`)
  - `Layout`構造体: `Version`、`CreatedAt`、`UpdatedAt`を削除

#### フロントエンド実装

- 型定義

  - `LayoutMarketplaceDetail` (`/packages/suite-base/src/context/LayoutMarketplaceContext.ts`): `version`、`createdAt`、`updatedAt`を削除

- コンポーネント
  - `MarketplaceCard`: `version`プロップをオプショナルに変更
  - `CardHeader`: `version`が存在する場合のみ表示
  - `LayoutMarketplaceSettings`: レイアウトカード表示時に`version`プロップを渡さないように修正

### 理由 (Rationale)

- Layoutsはシンプルな設定ファイルとして機能し、複雑なバージョン管理を必要としない
- Extensionsとは異なり、README、CHANGELOG、バージョン履歴などが不要
- タイムスタンプ情報を管理する必要性が低く、データ構造を簡素化することでメンテナンス性を向上

### 移行ガイド (Migration Guide)

既存コードで`version`、`createdAt`、`updatedAt`を参照している場合は削除してください。

```typescript
// ❌ 変更前
const layout: Layout = {
  id: "dashboard",
  name: "Dashboard",
  version: "1.0.0",
  createdAt: "2024-01-15T00:00:00Z",
  updatedAt: "2024-03-10T00:00:00Z",
  // ...
};

// ✅ 変更後
const layout: Layout = {
  id: "dashboard",
  name: "Dashboard",
  // ...
};
```

```tsx
// ❌ 変更前（レイアウト表示）
<MarketplaceCard
  name={layout.name}
  version={layout.version}
  // ...
/>

// ✅ 変更後（versionプロップなし）
<MarketplaceCard
  name={layout.name}
  // ...
/>
```

---

## [1.1.0] - 2025-10-07

### 追加 (Added)

- ✅ **`thumbnail`フィールドの追加**
  - Extensions および Layouts に`thumbnail`フィールドを追加
  - 既存のすべてのExtensionsエントリーに`"thumbnail": null`を設定
  - UIはサムネイルがない場合に適切なフォールバック表示を実装済み

### 変更 (Changed)

- ✅ **`keywords` → `tags` への統一**
  - Extensionsの`keywords`フィールドを`tags`に変更
  - Layoutsでは既に`tags`を使用していたため、命名の一貫性を向上
  - 検索・フィルタリング機能で統一的に使用可能

### 影響範囲 (Impact)

#### データファイル

- `/server/data/extensions.json` - 全エントリーで`keywords` → `tags`、`thumbnail`追加
- `/server/data/layouts.json` - 変更なし（既存の`tags`と`thumbnail`をそのまま使用）

#### サーバー実装

- Express (`/server/express/src/index.ts`)

  - `Extension`インターフェース: `keywords` → `tags`、`thumbnail`追加
  - 検索処理: `ext.keywords` → `ext.tags`

- Hono (`/server/hono/src/index.ts`)

  - `Extension`インターフェース: `keywords` → `tags`、`thumbnail`追加
  - 検索処理: `ext.keywords` → `ext.tags`

- Go (`/server/go/main.go`)
  - `Extension`構造体: `Keywords` → `Tags`、`Thumbnail`追加
  - 検索関数: `ext.Keywords` → `ext.Tags`

#### フロントエンド実装

- 型定義

  - `ExtensionInfo` (`/packages/suite-base/src/types/Extensions.ts`): `keywords` → `tags`、`thumbnail`追加
  - `HybridExtension` (`/packages/suite-base/src/types/HybridExtension.ts`): 全バージョン型で対応
  - API型定義 (`/packages/suite-base/src/api/marketplace/types.ts`): `thumbnailUrl` → `thumbnail`に統一

- コンポーネント

  - `ExtensionMarketplaceSettings.tsx`: インターフェースとマッピング処理を更新
  - `ExtensionsAPI.ts`: APIリクエストボディで`keywords` → `tags`

- テストコード
  - `ExtensionAdapter.test.ts`: モックデータで`keywords` → `tags`
  - `ExtensionsAPI.test.ts`: モックデータで`keywords` → `tags`

### 移行ガイド (Migration Guide)

#### 既存のExtensionデータを更新する場合

**Before:**

```json
{
  "id": "example.extension",
  "name": "Example Extension",
  "keywords": ["tag1", "tag2"],
  ...
}
```

**After:**

```json
{
  "id": "example.extension",
  "name": "Example Extension",
  "thumbnail": null,
  "tags": ["tag1", "tag2"],
  ...
}
```

#### バルク更新コマンド

```bash
# keywordsをtagsに変更
sed -i '' 's/"keywords":/"tags":/g' extensions.json

# thumbnailフィールドを追加（jq使用）
jq 'map(. + {thumbnail: null} | {id, name, description, thumbnail, publisher, homepage, readme, changelog, license, version, sha256sum, foxe, tags, namespace, time})' extensions.json > extensions_temp.json
mv extensions_temp.json extensions.json
```

### 後方互換性 (Backward Compatibility)

- ⚠️ **Breaking Change**: `keywords`フィールドは`tags`に変更されました

  - 古いAPIクライアントは更新が必要です
  - サーバー側では`keywords`を受け付けなくなります

- ✅ **Non-Breaking**: `thumbnail`フィールドはオプショナルのため、既存の実装に影響なし
  - `thumbnail`が`null`または未設定の場合、UIは適切にフォールバック表示

---

## [1.0.0] - 2025-10-04 (初版)

### 初期リリース

#### Extensions データ構造

**必須フィールド:**

- `id`: 一意識別子
- `name`: 表示名
- `description`: 説明文
- `publisher`: 発行者名
- `version`: バージョン

**オプションフィールド:**

- `homepage`: ホームページURL
- `readme`: README URL
- `changelog`: CHANGELOG URL
- `license`: ライセンス識別子
- `sha256sum`: SHA256ハッシュ
- `foxe`: パッケージURL
- `keywords`: キーワード配列（後に`tags`に変更）
- `namespace`: 名前空間
- `time`: バージョン別タイムスタンプ

#### Layouts データ構造

**必須フィールド:**

- `id`: 一意識別子
- `name`: 表示名
- `description`: 説明文
- `layout`: レイアウト構造オブジェクト

**オプションフィールド:**

- `thumbnail`: サムネイルURL
- `tags`: タグ配列
- `author`: 作成者名
- `version`: バージョン
- `createdAt`: 作成日時
- `updatedAt`: 更新日時

---

## 変更の理由

### `keywords` → `tags` への変更

**問題点:**

- Extensionsでは`keywords`、Layoutsでは`tags`と命名が不統一
- UIのタグフィルター機能で2つの異なるプロパティ名を扱う必要があった

**解決策:**

- Layoutsで既に使用していた`tags`に統一
- 「タグ」という用語の方が検索・フィルタリング用途に直感的

**メリット:**

1. データ構造の一貫性向上
2. コードの可読性向上
3. フィルタリングロジックの簡素化
4. ユーザーインターフェースとの整合性

### `thumbnail` フィールドの追加

**問題点:**

- Extensionsには`thumbnail`フィールドが存在しなかった
- Layoutsには`thumbnail`フィールドが存在
- UI実装は`thumbnail`に対応済み

**解決策:**

- 全Extensionsに`thumbnail`フィールドを追加
- 当面は`null`を設定（将来的に画像URLを追加可能）

**メリット:**

1. ExtensionsとLayoutsの構造統一
2. 将来的なサムネイル画像の追加が容易
3. UI実装との整合性
4. 視覚的なマーケットプレイス体験の向上

---

## 今後の予定 (Roadmap)

### v1.2.0 (予定)

#### 検討中の機能

- [ ] `rating`: ユーザー評価機能
- [ ] `downloadCount`: ダウンロード数
- [ ] `compatibility`: Lichtblickバージョン互換性情報
- [ ] `screenshots`: 複数のスクリーンショットURL配列

#### データ構造の拡張案

```json
{
  "id": "example.extension",
  "name": "Example Extension",
  "rating": 4.5,
  "downloadCount": 1234,
  "compatibility": {
    "minVersion": "2.0.0",
    "maxVersion": "3.0.0"
  },
  "screenshots": ["https://example.com/screenshot1.png", "https://example.com/screenshot2.png"]
}
```

### v1.3.0 (予定)

#### 多言語対応

- [ ] `i18n`: 多言語対応フィールド

```json
{
  "name": "Extension Name",
  "description": "English description",
  "i18n": {
    "ja": {
      "name": "拡張機能名",
      "description": "日本語の説明"
    },
    "zh": {
      "name": "扩展名称",
      "description": "中文描述"
    }
  }
}
```

---

## 廃止予定 (Deprecations)

### なし

現在、廃止予定のフィールドはありません。

---

## セキュリティ (Security)

### SHA256ハッシュ検証

- すべてのパッケージファイル（`.foxe`）には`sha256sum`フィールドを設定することを推奨
- ダウンロード後の整合性検証に使用
- セキュリティ向上とファイル改ざん防止

### HTTPS必須

- すべてのURL（`homepage`, `readme`, `changelog`, `foxe`, `thumbnail`）はHTTPSを使用することを推奨
- 中間者攻撃の防止

---

## 参考資料

- [データ構造ガイド](./data-structure-guide.md)
- [クイックリファレンス](./data-structure-quick-reference.md)
- [API仕様書](./api-specification.md)

---

**最終更新**: 2025-10-07
**メンテナー**: Lichtblick Development Team
