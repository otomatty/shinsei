# マーケットプレイス JSON規格 v2.0

**作成日**: 2025-10-08
**バージョン**: 2.0.0

## 概要

このドキュメントは、Lichtblickマーケットプレイスで使用するextensions.jsonとlayouts.jsonの新しい規格を定義します。

### 主な変更点（v1.0からの変更）

1. **Extensions**: 複数バージョン対応の構造に変更
2. **Layouts**: `author` → `publisher` に統一
3. **Layouts**: `layout` オブジェクトを外部ファイルに分離
4. **共通**: `tags` フィールドを標準化
5. **共通**: `thumbnail` フィールドのサポート

---

## 1. extensions.json 規格

### 概要

複数バージョンをサポートするExtension定義。各拡張機能は`versions`フィールド内に複数のバージョン情報を持ちます。

### JSONスキーマ

```typescript
interface ExtensionItem {
  // 基本情報
  id: string; // 拡張機能の一意識別子
  name: string; // 拡張機能名
  publisher: string; // 発行者/組織名
  description: string; // 説明文

  // メタデータ
  homepage?: string; // ホームページURL
  license?: string; // ライセンス識別子
  tags: string[]; // 検索・フィルタリング用タグ
  thumbnail?: string | null; // サムネイル画像URL
  namespace?: string; // 名前空間

  // バージョン管理
  versions: {
    [version: string]: VersionDetail;
  };
  latest: string; // 最新バージョンの識別子
  supported?: string[]; // サポート対象バージョン一覧
  deprecated?: string[]; // 非推奨バージョン一覧
}

interface VersionDetail {
  version: string; // バージョン文字列
  publishedDate: string; // 公開日時 (ISO 8601)
  sha256sum?: string; // SHA256ハッシュ
  foxe?: string; // .foxeファイルのダウンロードURL
  readme?: string; // README.mdのURL
  changelog?: string; // CHANGELOG.mdのURL
  deprecated?: boolean; // 非推奨フラグ
}
```

### データ例

```json
{
  "id": "foxglove.blank-panel-extension",
  "name": "Blank Panel",
  "publisher": "foxglove",
  "description": "Add a little space to your layout",
  "homepage": "https://github.com/foxglove/blank-panel-extension",
  "license": "MIT",
  "tags": ["blank", "panel", "empty", "logo", "spacer"],
  "thumbnail": "https://example.com/thumbnails/blank-panel.png",
  "namespace": "official",
  "versions": {
    "1.0.0": {
      "version": "1.0.0",
      "publishedDate": "2025-10-04T01:21:25Z",
      "sha256sum": "fa2b11af8ed7c420ca6e541196bca608661c0c1a81cd1f768c565c72a55a63c8",
      "foxe": "https://github.com/foxglove/blank-panel-extension/releases/download/1.0.0/foxglove.blank-panel-extension-1.0.0.foxe",
      "readme": "https://raw.githubusercontent.com/foxglove/blank-panel-extension/main/README.md",
      "changelog": "https://raw.githubusercontent.com/foxglove/blank-panel-extension/main/CHANGELOG.md"
    },
    "1.1.0": {
      "version": "1.1.0",
      "publishedDate": "2025-10-05T10:30:00Z",
      "sha256sum": "abc123...",
      "foxe": "https://github.com/foxglove/blank-panel-extension/releases/download/1.1.0/foxglove.blank-panel-extension-1.1.0.foxe",
      "readme": "https://raw.githubusercontent.com/foxglove/blank-panel-extension/v1.1.0/README.md",
      "changelog": "https://raw.githubusercontent.com/foxglove/blank-panel-extension/v1.1.0/CHANGELOG.md"
    }
  },
  "latest": "1.1.0",
  "supported": ["1.0.0", "1.1.0"],
  "deprecated": []
}
```

### フィールド詳細

#### 基本情報フィールド

| フィールド    | 型     | 必須 | 説明                                                     |
| ------------- | ------ | ---- | -------------------------------------------------------- |
| `id`          | string | ✅   | 拡張機能の一意識別子（例: `"publisher.extension-name"`） |
| `name`        | string | ✅   | 拡張機能の表示名                                         |
| `publisher`   | string | ✅   | 発行者/組織名                                            |
| `description` | string | ✅   | 拡張機能の説明文                                         |

#### メタデータフィールド

| フィールド  | 型             | 必須 | 説明                                                  |
| ----------- | -------------- | ---- | ----------------------------------------------------- |
| `homepage`  | string         | ❌   | ホームページURL（通常はGitHubリポジトリ）             |
| `license`   | string         | ❌   | ライセンス識別子（例: `"MIT"`, `"Apache-2.0"`)        |
| `tags`      | string[]       | ✅   | 検索・フィルタリング用のタグ配列（空配列可）          |
| `thumbnail` | string \| null | ❌   | サムネイル画像のURL。未設定の場合は`null`または省略   |
| `namespace` | string         | ❌   | 名前空間（例: `"official"`, `"community"`, `"local"`) |

#### バージョン管理フィールド

| フィールド   | 型       | 必須 | 説明                                             |
| ------------ | -------- | ---- | ------------------------------------------------ |
| `versions`   | object   | ✅   | バージョン情報のマップ。キーはバージョン文字列   |
| `latest`     | string   | ✅   | 最新バージョンの識別子（`versions`のキーと一致） |
| `supported`  | string[] | ❌   | サポート対象バージョン一覧                       |
| `deprecated` | string[] | ❌   | 非推奨バージョン一覧                             |

#### VersionDetail フィールド

| フィールド      | 型      | 必須 | 説明                                      |
| --------------- | ------- | ---- | ----------------------------------------- |
| `version`       | string  | ✅   | セマンティックバージョン（例: `"1.0.0"`） |
| `publishedDate` | string  | ✅   | 公開日時（ISO 8601形式）                  |
| `sha256sum`     | string  | ❌   | パッケージファイルのSHA256ハッシュ        |
| `foxe`          | string  | ❌   | .foxeファイルのダウンロードURL            |
| `readme`        | string  | ❌   | README.mdファイルのURL                    |
| `changelog`     | string  | ❌   | CHANGELOG.mdファイルのURL                 |
| `deprecated`    | boolean | ❌   | 非推奨フラグ（デフォルト: `false`）       |

---

## 2. layouts.json 規格

### 概要

レイアウト定義。バージョン管理は行わず、シンプルな構造を維持します。実際の`layout`オブジェクトは外部ファイルに分離し、URLで参照します。

### JSONスキーマ

```typescript
interface LayoutItem {
  // 基本情報
  id: string; // レイアウトの一意識別子
  name: string; // レイアウト名
  publisher: string; // 発行者/作成者名
  description: string; // 説明文

  // メタデータ
  tags: string[]; // 検索・フィルタリング用タグ
  thumbnail?: string | null; // サムネイル画像URL

  // レイアウトデータ
  layoutUrl: string; // レイアウトJSONファイルのURL
}
```

### データ例

```json
{
  "id": "robotics-dashboard",
  "name": "Robotics Dashboard",
  "publisher": "Robotics Team",
  "description": "A comprehensive dashboard for robotics data visualization",
  "tags": ["robotics", "dashboard", "visualization"],
  "thumbnail": "https://example.com/thumbnails/robotics-dashboard.png",
  "layoutUrl": "https://example.com/layouts/robotics-dashboard.json"
}
```

### フィールド詳細

| フィールド    | 型             | 必須 | 説明                                                 |
| ------------- | -------------- | ---- | ---------------------------------------------------- |
| `id`          | string         | ✅   | レイアウトの一意識別子（ケバブケース推奨）           |
| `name`        | string         | ✅   | レイアウトの表示名                                   |
| `publisher`   | string         | ✅   | 発行者/作成者名                                      |
| `description` | string         | ✅   | レイアウトの説明文                                   |
| `tags`        | string[]       | ✅   | 検索・フィルタリング用のタグ配列（空配列可）         |
| `thumbnail`   | string \| null | ❌   | サムネイル画像のURL。未設定の場合は`null`または省略  |
| `layoutUrl`   | string         | ✅   | レイアウトJSONファイルのURL（相対パスまたは絶対URL） |

---

## 3. レイアウトファイル規格

### 概要

`layouts.json`から参照される個別のレイアウトファイル。Lichtblickのレイアウト形式に従います。

### ファイル名規則

- パターン: `{layout-id}.json`
- 例: `robotics-dashboard.json`, `autonomous-vehicle-layout.json`

### 配置場所

```
server/data/
├── extensions.json
├── layouts.json
└── layouts/                    # レイアウトファイル用ディレクトリ
    ├── robotics-dashboard.json
    ├── autonomous-vehicle-layout.json
    ├── drone-monitoring.json
    └── minimal-debug.json
```

### JSONスキーマ

```typescript
interface LayoutData {
  configById: Record<string, unknown>;
  globalVariables: Record<string, unknown>;
  userNodes: Record<string, unknown>;
  playbackConfig: {
    speed: number;
  };
  layout: LayoutStructure;
}

interface LayoutStructure {
  first: string | LayoutStructure;
  second?: string | LayoutStructure;
  direction?: "row" | "column";
  splitPercentage?: number;
}
```

### データ例

`robotics-dashboard.json`:

```json
{
  "configById": {
    "3D!1": {
      "layers": {
        "grid": {
          "visible": true
        }
      },
      "cameraState": {
        "perspective": true,
        "distance": 10,
        "phi": 45,
        "thetaOffset": 45
      }
    },
    "Plot!1": {
      "paths": [
        {
          "value": "/diagnostics.data.temperature",
          "enabled": true,
          "timestampMethod": "receiveTime"
        }
      ],
      "showLegend": true,
      "isSynced": true
    }
  },
  "globalVariables": {},
  "userNodes": {},
  "playbackConfig": {
    "speed": 1
  },
  "layout": {
    "first": "3D!1",
    "second": {
      "first": "Plot!1",
      "second": "RawMessages!1",
      "direction": "column"
    },
    "direction": "row",
    "splitPercentage": 60
  }
}
```

---

## 4. 移行ガイド

### v1.0 から v2.0 への移行

#### Extensions の移行

**変更前 (v1.0)**:

```json
{
  "id": "example.extension",
  "name": "Example Extension",
  "version": "1.0.0",
  "publisher": "Example Publisher",
  "description": "An example extension",
  "tags": ["example"],
  "sha256sum": "abc123...",
  "foxe": "https://example.com/download/1.0.0.foxe"
}
```

**変更後 (v2.0)**:

```json
{
  "id": "example.extension",
  "name": "Example Extension",
  "publisher": "Example Publisher",
  "description": "An example extension",
  "tags": ["example"],
  "versions": {
    "1.0.0": {
      "version": "1.0.0",
      "publishedDate": "2025-10-01T00:00:00Z",
      "sha256sum": "abc123...",
      "foxe": "https://example.com/download/1.0.0.foxe"
    }
  },
  "latest": "1.0.0",
  "supported": ["1.0.0"]
}
```

#### Layouts の移行

**変更前 (v1.0)**:

```json
{
  "id": "example-layout",
  "name": "Example Layout",
  "author": "Layout Creator",
  "description": "An example layout",
  "tags": ["example"],
  "layout": {
    "configById": {},
    "globalVariables": {},
    "userNodes": {},
    "playbackConfig": { "speed": 1 },
    "layout": {}
  }
}
```

**変更後 (v2.0)**:

`layouts.json`:

```json
{
  "id": "example-layout",
  "name": "Example Layout",
  "publisher": "Layout Creator",
  "description": "An example layout",
  "tags": ["example"],
  "layoutUrl": "/layouts/example-layout.json"
}
```

`layouts/example-layout.json`:

```json
{
  "configById": {},
  "globalVariables": {},
  "userNodes": {},
  "playbackConfig": { "speed": 1 },
  "layout": {}
}
```

---

## 5. ベストプラクティス

### Extensions

1. **バージョニング**: セマンティックバージョニングを使用
2. **非推奨の管理**: `deprecated`配列で非推奨バージョンを明示
3. **サポート範囲**: `supported`配列で積極的にサポートするバージョンを明示
4. **タグ**: 検索性を高めるため、適切なタグを付与（3〜7個推奨）

### Layouts

1. **ID命名**: ケバブケース（例: `robotics-dashboard`）
2. **ファイル分離**: レイアウトデータは必ず外部ファイルに分離
3. **URL形式**: 相対パスまたは絶対URLで参照
4. **タグ**: 用途や対象領域を示すタグを付与

### サムネイル

1. **推奨サイズ**: 400x300px（4:3比率）
2. **ファイル形式**: PNG または JPEG
3. **最大サイズ**: 100KB以下
4. **未設定時**: `null`または省略（UIでデフォルトアイコンを表示）

---

## 6. 検証スキーマ（JSON Schema）

### Extensions JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "name", "publisher", "description", "tags", "versions", "latest"],
    "properties": {
      "id": { "type": "string" },
      "name": { "type": "string" },
      "publisher": { "type": "string" },
      "description": { "type": "string" },
      "homepage": { "type": "string", "format": "uri" },
      "license": { "type": "string" },
      "tags": { "type": "array", "items": { "type": "string" } },
      "thumbnail": { "type": ["string", "null"], "format": "uri" },
      "namespace": { "type": "string" },
      "versions": {
        "type": "object",
        "additionalProperties": {
          "type": "object",
          "required": ["version", "publishedDate"],
          "properties": {
            "version": { "type": "string" },
            "publishedDate": { "type": "string", "format": "date-time" },
            "sha256sum": { "type": "string" },
            "foxe": { "type": "string", "format": "uri" },
            "readme": { "type": "string", "format": "uri" },
            "changelog": { "type": "string", "format": "uri" },
            "deprecated": { "type": "boolean" }
          }
        }
      },
      "latest": { "type": "string" },
      "supported": { "type": "array", "items": { "type": "string" } },
      "deprecated": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

### Layouts JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "name", "publisher", "description", "tags", "layoutUrl"],
    "properties": {
      "id": { "type": "string" },
      "name": { "type": "string" },
      "publisher": { "type": "string" },
      "description": { "type": "string" },
      "tags": { "type": "array", "items": { "type": "string" } },
      "thumbnail": { "type": ["string", "null"], "format": "uri" },
      "layoutUrl": { "type": "string" }
    }
  }
}
```

---

## 7. 変更履歴

| バージョン | 日付       | 変更内容                                                  |
| ---------- | ---------- | --------------------------------------------------------- |
| 2.0.0      | 2025-10-08 | 複数バージョン対応、レイアウトファイル分離、publisher統一 |
| 1.0.0      | 2025-10-04 | 初版リリース                                              |

---

## 8. 参考資料

- [Semantic Versioning 2.0.0](https://semver.org/)
- [ISO 8601 Date and Time format](https://en.wikipedia.org/wiki/ISO_8601)
- [JSON Schema Specification](https://json-schema.org/)
