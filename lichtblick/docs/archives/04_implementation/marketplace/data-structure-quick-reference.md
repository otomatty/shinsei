# マーケットプレイス データ構造 クイックリファレンス

## 📋 概要

このドキュメントは、Extensions（拡張機能）とLayouts（レイアウト）のデータ構造を簡潔にまとめたリファレンスです。

---

## 🔌 Extensions（拡張機能）

### 最小構成

```json
{
  "id": "publisher.extension-name",
  "name": "Extension Name",
  "description": "Brief description",
  "publisher": "publisher-name",
  "version": "1.0.0"
}
```

### 完全な例

```json
{
  "id": "foxglove.blank-panel-extension",
  "name": "Blank Panel",
  "description": "Add a little space to your layout",
  "thumbnail": null,
  "publisher": "foxglove",
  "homepage": "https://github.com/foxglove/blank-panel-extension",
  "readme": "https://raw.githubusercontent.com/.../README.md",
  "changelog": "https://raw.githubusercontent.com/.../CHANGELOG.md",
  "license": "MIT",
  "version": "1.0.0",
  "sha256sum": "fa2b11af8ed7c420...",
  "foxe": "https://github.com/.../extension.foxe",
  "tags": ["blank", "panel", "spacer"],
  "namespace": "official",
  "time": {
    "1.0.0": "2025-10-04T01:21:25Z"
  }
}
```

### フィールド一覧

| フィールド    | 型             | 必須 | 説明                       |
| ------------- | -------------- | :--: | -------------------------- |
| `id`          | string         |  ✅  | 一意識別子                 |
| `name`        | string         |  ✅  | 表示名                     |
| `description` | string         |  ✅  | 説明文                     |
| `thumbnail`   | string \| null |  -   | サムネイルURL              |
| `publisher`   | string         |  ✅  | 発行者名                   |
| `homepage`    | string         |  -   | ホームページURL            |
| `readme`      | string         |  -   | README URL                 |
| `changelog`   | string         |  -   | CHANGELOG URL              |
| `license`     | string         |  -   | ライセンス                 |
| `version`     | string         |  ✅  | バージョン                 |
| `sha256sum`   | string         |  -   | SHA256ハッシュ             |
| `foxe`        | string         |  -   | パッケージURL              |
| `tags`        | string[]       |  -   | タグ配列                   |
| `namespace`   | string         |  -   | 名前空間                   |
| `time`        | object         |  -   | バージョン別タイムスタンプ |

---

## 📐 Layouts（レイアウト）

### 最小構成

```json
{
  "id": "layout-id",
  "name": "Layout Name",
  "description": "Brief description",
  "layout": {
    "configById": {},
    "globalVariables": {},
    "userNodes": {},
    "playbackConfig": {},
    "layout": "structure"
  }
}
```

### 完全な例

```json
{
  "id": "robotics-dashboard",
  "name": "Robotics Dashboard",
  "description": "Comprehensive dashboard for robotics",
  "thumbnail": null,
  "tags": ["robotics", "dashboard", "visualization"],
  "author": "Robotics Team",
  "layout": {
    /* layout structure */
  }
}
```

### フィールド一覧

| フィールド    | 型             | 必須 | 説明           |
| ------------- | -------------- | :--: | -------------- |
| `id`          | string         |  ✅  | 一意識別子     |
| `name`        | string         |  ✅  | 表示名         |
| `description` | string         |  ✅  | 説明文         |
| `thumbnail`   | string \| null |  -   | サムネイルURL  |
| `tags`        | string[]       |  -   | タグ配列       |
| `author`      | string         |  -   | 作成者名       |
| `layout`      | object         |  ✅  | レイアウト構造 |

---

## 🔍 検索・フィルタリング

### Extensions検索対象

- `name`
- `description`
- `tags`
- `publisher`

### Layouts検索対象

- `name`
- `description`
- `tags`
- `author`

### タグフィルター例

```typescript
// 単一タグでフィルター
GET /renderer/extensions?tag=robotics

// 複数タグでフィルター（AND条件）
const filtered = items.filter(item =>
  selectedTags.every(tag => item.tags?.includes(tag))
);
```

---

## 🎯 共通ガイドライン

### 命名規則

| 項目       | 形式                         | 例                               |
| ---------- | ---------------------------- | -------------------------------- |
| ID         | `publisher.name`             | `foxglove.blank-panel-extension` |
| バージョン | セマンティックバージョニング | `1.0.0`, `2.1.3`                 |
| タグ       | 小文字、ハイフン区切り       | `"robotics"`, `"data-viz"`       |
| 日時       | ISO 8601                     | `"2025-10-07T00:00:00Z"`         |

### サムネイル

```json
// 未設定の場合
"thumbnail": null

// 設定する場合
"thumbnail": "https://example.com/image.png"
```

**UI動作:**

1. `thumbnail`あり → 画像表示
2. `thumbnail`なし & `icon`あり → アイコン表示
3. どちらもなし → "No Image"プレースホルダー

---

## 📝 データ追加テンプレート

### Extension追加

```json
{
  "id": "YOUR_ORG.YOUR_EXTENSION",
  "name": "Your Extension Name",
  "description": "What does your extension do?",
  "thumbnail": null,
  "publisher": "YOUR_ORG",
  "homepage": "https://github.com/YOUR_ORG/YOUR_EXTENSION",
  "readme": "https://raw.githubusercontent.com/YOUR_ORG/YOUR_EXTENSION/main/README.md",
  "changelog": "https://raw.githubusercontent.com/YOUR_ORG/YOUR_EXTENSION/main/CHANGELOG.md",
  "license": "MIT",
  "version": "1.0.0",
  "sha256sum": "CALCULATE_SHA256_HASH",
  "foxe": "https://github.com/YOUR_ORG/YOUR_EXTENSION/releases/download/v1.0.0/extension.foxe",
  "tags": ["tag1", "tag2"],
  "namespace": "official",
  "time": {
    "1.0.0": "2025-10-07T00:00:00Z"
  }
}
```

### Layout追加

```json
{
  "id": "your-layout-id",
  "name": "Your Layout Name",
  "description": "What does your layout show?",
  "thumbnail": null,
  "tags": ["tag1", "tag2"],
  "author": "Your Name",
  "layout": {
    "configById": {},
    "globalVariables": {},
    "userNodes": {},
    "playbackConfig": {
      "speed": 1
    },
    "layout": {}
  }
}
```

---

## ✅ チェックリスト

### Extension追加前

- [ ] `id`が一意である
- [ ] `version`がセマンティックバージョニング形式
- [ ] URLがすべて有効である
- [ ] SHA256ハッシュが正しい
- [ ] タグが適切に設定されている
- [ ] `namespace`が設定されている

### Layout追加前

- [ ] `id`が一意である
- [ ] `layout`オブジェクトが有効なLichtblick形式
- [ ] タグが適切に設定されている
- [ ] タイムスタンプがISO 8601形式

---

## 🚨 よくあるエラー

### ❌ 間違い

```json
// タグが文字列
"tags": "robotics, dashboard"

// バージョンが数値
"version": 1.0
```

### ✅ 正しい

```json
// タグは配列
"tags": ["robotics", "dashboard"]

// バージョンは文字列
"version": "1.0.0"
```

---

## 📚 関連リソース

- [詳細ガイド](./data-structure-guide.md)
- [API仕様](./api-specification.md)
- [型定義](../../packages/suite-base/src/types/)

---

**最終更新**: 2025-10-07
