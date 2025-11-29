# マーケットプレイス データ構造ガイド

## 目次

- [概要](#概要)
- [Extensions（拡張機能）データ構造](#extensions拡張機能データ構造)
- [Layouts（レイアウト）データ構造](#layoutsレイアウトデータ構造)
- [データの整合性](#データの整合性)
- [API実装](#api実装)
- [フロントエンド型定義](#フロントエンド型定義)

---

## 概要

Lichtblickのマーケットプレイス機能では、拡張機能（Extensions）とレイアウト（Layouts）の2種類のアイテムを管理します。これらのデータは統一された構造を持ち、検索・フィルタリング・表示機能を提供します。

### データファイルの場所

```
server/data/
├── extensions.json  # 拡張機能マーケットプレースデータ
└── layouts.json     # レイアウトマーケットプレースデータ
```

---

## Extensions（拡張機能）データ構造

### JSONスキーマ

```json
{
  "id": "string (required)",
  "name": "string (required)",
  "description": "string (required)",
  "thumbnail": "string | null (optional)",
  "publisher": "string (required)",
  "homepage": "string (optional)",
  "readme": "string (optional)",
  "changelog": "string (optional)",
  "license": "string (optional)",
  "version": "string (required)",
  "sha256sum": "string (optional)",
  "foxe": "string (optional)",
  "tags": ["string"] (optional),
  "namespace": "string (optional)",
  "time": {
    "version": "ISO 8601 timestamp"
  } (optional)
}
```

### フィールド詳細

| フィールド    | 型             | 必須 | 説明                                                          |
| ------------- | -------------- | ---- | ------------------------------------------------------------- |
| `id`          | string         | ✅   | 拡張機能の一意識別子 (例: `"foxglove.blank-panel-extension"`) |
| `name`        | string         | ✅   | 拡張機能の表示名                                              |
| `description` | string         | ✅   | 拡張機能の説明文                                              |
| `thumbnail`   | string \| null | ❌   | サムネイル画像のURL。未設定の場合は`null`                     |
| `publisher`   | string         | ✅   | 発行者/組織名                                                 |
| `homepage`    | string         | ❌   | ホームページURL（通常はGitHubリポジトリ）                     |
| `readme`      | string         | ❌   | README.mdファイルのURL                                        |
| `changelog`   | string         | ❌   | CHANGELOG.mdファイルのURL                                     |
| `license`     | string         | ❌   | ライセンス識別子 (例: `"MIT"`, `"Apache-2.0"`)                |
| `version`     | string         | ✅   | セマンティックバージョン (例: `"1.0.0"`)                      |
| `sha256sum`   | string         | ❌   | パッケージファイルのSHA256ハッシュ（整合性検証用）            |
| `foxe`        | string         | ❌   | パッケージファイル（.foxe）のダウンロードURL                  |
| `tags`        | string[]       | ❌   | 検索・フィルタリング用のタグ配列                              |
| `namespace`   | string         | ❌   | 名前空間 (例: `"official"`, `"local"`, `"org"`)               |
| `time`        | object         | ❌   | バージョン別のタイムスタンプ情報                              |

### データ例

```json
{
  "id": "foxglove.blank-panel-extension",
  "name": "Blank Panel",
  "description": "Add a little space to your layout",
  "thumbnail": null,
  "publisher": "foxglove",
  "homepage": "https://github.com/foxglove/blank-panel-extension",
  "readme": "https://raw.githubusercontent.com/foxglove/blank-panel-extension/main/README.md",
  "changelog": "https://raw.githubusercontent.com/foxglove/blank-panel-extension/main/CHANGELOG.md",
  "license": "MIT",
  "version": "1.0.0",
  "sha256sum": "fa2b11af8ed7c420ca6e541196bca608661c0c1a81cd1f768c565c72a55a63c8",
  "foxe": "https://github.com/foxglove/blank-panel-extension/releases/download/1.0.0/foxglove.blank-panel-extension-1.0.0.foxe",
  "tags": ["blank", "panel", "empty", "logo", "spacer"],
  "namespace": "official",
  "time": {
    "1.0.0": "2025-10-04T01:21:25Z"
  }
}
```

---

## Layouts（レイアウト）データ構造

### JSONスキーマ

```json
{
  "id": "string (required)",
  "name": "string (required)",
  "description": "string (required)",
  "thumbnail": "string | null (optional)",
  "tags": ["string"] (optional)",
  "author": "string (optional)",
  "layout": "object (required)"
}
```

### フィールド詳細

| フィールド    | 型             | 必須 | 説明                                                     |
| ------------- | -------------- | ---- | -------------------------------------------------------- |
| `id`          | string         | ✅   | レイアウトの一意識別子                                   |
| `name`        | string         | ✅   | レイアウトの表示名                                       |
| `description` | string         | ✅   | レイアウトの説明文                                       |
| `thumbnail`   | string \| null | ❌   | サムネイル画像のURL。未設定の場合は`null`                |
| `tags`        | string[]       | ❌   | 検索・フィルタリング用のタグ配列                         |
| `author`      | string         | ❌   | 作成者名                                                 |
| `layout`      | object         | ✅   | レイアウト設定オブジェクト（Lichtblickのレイアウト形式） |

### データ例

```json
{
  "id": "robotics-dashboard",
  "name": "Robotics Dashboard",
  "description": "A comprehensive dashboard for robotics data visualization",
  "thumbnail": null,
  "tags": ["robotics", "dashboard", "visualization"],
  "author": "Robotics Team",
  "layout": {
    "configById": {
      "3D!1": {
        "layers": {
          "grid": {
            "visible": true
          }
        }
      }
    },
    "globalVariables": {},
    "userNodes": {},
    "playbackConfig": {
      "speed": 1
    }
  }
}
```

---

## データの整合性

### 共通プロパティの統一

Extensions と Layouts は以下のプロパティで一貫性を保っています：

| プロパティ    | Extensions | Layouts | 用途                 |
| ------------- | ---------- | ------- | -------------------- |
| `tags`        | ✅         | ✅      | 検索・フィルタリング |
| `thumbnail`   | ✅         | ✅      | サムネイル表示       |
| `description` | ✅         | ✅      | 説明文               |

### 命名規則の変更履歴

#### ✅ 2025-10-07: `keywords` → `tags` に統一

- **理由**: Layoutsでは既に`tags`を使用していたため
- **影響範囲**:
  - JSONデータファイル
  - サーバー側の型定義（Express, Hono, Go）
  - フロントエンド型定義

#### ✅ 2025-10-07: `thumbnail` フィールドを追加

- **理由**: データ構造の一貫性とUI対応
- **実装**: すべてのExtensionsエントリーに`"thumbnail": null`を追加
- **注意**: UIは`thumbnail`が`null`または未設定の場合、アイコンまたはプレースホルダーを表示

---

## API実装

### サーバー側の型定義

#### Express / Hono (TypeScript)

```typescript
interface Extension {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  publisher: string;
  homepage?: string;
  readme?: string;
  changelog?: string;
  license?: string;
  version: string;
  sha256sum?: string;
  foxe?: string;
  tags?: string[];
  namespace?: string;
  time?: Record<string, string>;
}

interface Layout {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  tags?: string[];
  author?: string;
  layout: any; // Lichtblickのレイアウト形式
}
```

#### Go

```go
type Extension struct {
    ID          string            `json:"id"`
    Name        string            `json:"name"`
    Description string            `json:"description"`
    Thumbnail   string            `json:"thumbnail,omitempty"`
    Publisher   string            `json:"publisher"`
    Homepage    string            `json:"homepage,omitempty"`
    Readme      string            `json:"readme,omitempty"`
    Changelog   string            `json:"changelog,omitempty"`
    License     string            `json:"license,omitempty"`
    Version     string            `json:"version"`
    SHA256Sum   string            `json:"sha256sum,omitempty"`
    Foxe        string            `json:"foxe,omitempty"`
    Tags        []string          `json:"tags,omitempty"`
    Namespace   string            `json:"namespace,omitempty"`
    Time        map[string]string `json:"time,omitempty"`
}

type Layout struct {
    ID          string                 `json:"id"`
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    Thumbnail   string                 `json:"thumbnail,omitempty"`
    Tags        []string               `json:"tags,omitempty"`
    Author      string                 `json:"author,omitempty"`
    Layout      map[string]interface{} `json:"layout"`
}
```

### APIエンドポイント

#### Extensions API

```
GET  /renderer/extensions                     # 全拡張機能の取得
GET  /renderer/extensions/:id                 # 特定の拡張機能を取得
GET  /renderer/extensions/:id/versions        # 拡張機能の全バージョンを取得
GET  /renderer/extensions/search?q=keyword    # 拡張機能を検索
```

**検索対象フィールド:**

- `name`
- `description`
- `tags`
- `publisher`

#### Layouts API

```
GET  /renderer/layouts                        # 全レイアウトの取得
GET  /renderer/layouts/:id                    # 特定のレイアウトを取得
GET  /renderer/layouts/search?q=keyword       # レイアウトを検索
GET  /renderer/layouts?tag=robotics           # タグでフィルタリング
```

**検索対象フィールド:**

- `name`
- `description`
- `tags`
- `author`

---

## フロントエンド型定義

### TypeScript型定義

#### ExtensionInfo型

```typescript
// packages/suite-base/src/types/Extensions.ts
export type ExtensionInfo = {
  /** 拡張機能の一意識別子 */
  id: string;
  /** 拡張機能の説明 */
  description: string;
  /** 拡張機能の表示名 */
  displayName: string;
  /** 拡張機能のホームページURL */
  homepage: string;
  /** 検索とフィルタリング用のタグ配列 */
  tags: string[];
  /** サムネイル画像URL */
  thumbnail?: string;
  /** ライセンス情報 */
  license: string;
  /** 拡張機能の名前 */
  name: string;
  namespace?: Namespace;
  publisher: string;
  /** 完全修飾名 */
  qualifiedName: string;
  /** バージョン文字列 */
  version: string;
  /** README文書 */
  readme?: string;
  /** 変更履歴 */
  changelog?: string;
  externalId?: string;
};
```

#### ExtensionMarketplaceDetail型

```typescript
// packages/suite-base/src/context/ExtensionMarketplaceContext.ts
export type ExtensionMarketplaceDetail = ExtensionInfo & {
  /** ファイルの整合性検証用SHA256ハッシュ */
  sha256sum?: string;
  /** 拡張機能パッケージ（.foxe）ファイルのURL */
  foxe?: string;
  /** バージョン別のタイムスタンプ情報 */
  time?: Record<string, string>;
};
```

#### HybridExtension型

```typescript
// packages/suite-base/src/types/HybridExtension.ts

// 既存のextensions.json形式
export interface LegacyExtensionData {
  id: string;
  name: string;
  version: string;
  publisher: string;
  description: string;
  homepage?: string;
  readme?: string;
  changelog?: string;
  license?: string;
  sha256sum?: string;
  foxe?: string;
  tags?: string[];
  thumbnail?: string;
}

// 複数バージョン対応の新形式
export interface MultiVersionExtensionData {
  id: string;
  name: string;
  publisher: string;
  description: string;
  homepage?: string;
  license?: string;
  tags?: string[];
  thumbnail?: string;
  versions: {
    [version: string]: VersionDetail;
  };
  latest: string;
  supported?: string[];
  deprecated?: string[];
}

// 内部統一形式
export interface UnifiedExtensionData {
  baseId: string;
  id: string;
  name: string;
  publisher: string;
  description: string;
  homepage?: string;
  license?: string;
  tags?: string[];
  thumbnail?: string;
  version: string;
  isLatest: boolean;
  publishedDate?: string;
  stability?: "stable" | "beta" | "alpha" | "experimental";
  deprecated?: boolean;
  sha256sum?: string;
  foxe?: string;
  readme?: string;
  changelog?: string;
}
```

### API型定義

```typescript
// packages/suite-base/src/api/marketplace/types.ts

export interface ExtensionApiData {
  id: string;
  name: string;
  displayName?: string;
  publisher: string;
  version: string;
  description: string;
  homepage?: string;
  license?: string;
  tags?: string[];
  thumbnail?: string;
  qualifiedName?: string;
  readme?: string;
  changelog?: string;
  downloadUrl?: string;
  sha256?: string;
  installCount?: number;
  rating?: number;
  updatedAt?: string;
  createdAt?: string;
}

export interface LayoutApiData {
  id: string;
  name: string;
  publisher: string;
  description: string;
  homepage?: string;
  license?: string;
  tags?: string[];
  thumbnail?: string;
  downloadUrl?: string;
  sha256?: string;
  installCount?: number;
  rating?: number;
  category?: string;
  compatibleExtensions?: string[];
}
```

---

## データ追加ガイド

### 新しいExtensionを追加する

1. **extensions.json**に新しいエントリーを追加:

```json
{
  "id": "your-org.your-extension",
  "name": "Your Extension Name",
  "description": "Brief description of what your extension does",
  "thumbnail": null,
  "publisher": "your-org",
  "homepage": "https://github.com/your-org/your-extension",
  "readme": "https://raw.githubusercontent.com/your-org/your-extension/main/README.md",
  "changelog": "https://raw.githubusercontent.com/your-org/your-extension/main/CHANGELOG.md",
  "license": "MIT",
  "version": "1.0.0",
  "sha256sum": "YOUR_SHA256_HASH",
  "foxe": "https://github.com/your-org/your-extension/releases/download/v1.0.0/your-extension.foxe",
  "tags": ["tag1", "tag2", "tag3"],
  "namespace": "official",
  "time": {
    "1.0.0": "2025-10-07T00:00:00Z"
  }
}
```

2. **サムネイルを追加する場合**:

```json
{
  "thumbnail": "https://raw.githubusercontent.com/your-org/your-extension/main/screenshot.png"
}
```

### 新しいLayoutを追加する

1. **layouts.json**に新しいエントリーを追加:

```json
{
  "id": "your-layout-id",
  "name": "Your Layout Name",
  "description": "Brief description of the layout",
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
    "layout": "YourLayoutStructure"
  }
}
```

---

## バリデーション

### 必須フィールドのチェック

Extensions:

- ✅ `id`
- ✅ `name`
- ✅ `description`
- ✅ `publisher`
- ✅ `version`

Layouts:

- ✅ `id`
- ✅ `name`
- ✅ `description`
- ✅ `layout`

### データ整合性チェック

1. **IDの一意性**: 各`id`はファイル内で一意である必要があります
2. **バージョン形式**: `version`はセマンティックバージョニング形式（例: `1.0.0`）
3. **URL形式**: `homepage`, `readme`, `changelog`, `foxe`は有効なURL
4. **タグ**: `tags`配列は小文字の文字列を推奨
5. **タイムスタンプ**: ISO 8601形式（例: `2025-10-07T00:00:00Z`）

---

## トラブルシューティング

### よくある問題

#### 1. 拡張機能が表示されない

**原因**: 必須フィールドが不足している
**解決**: `id`, `name`, `description`, `publisher`, `version`が設定されているか確認

#### 2. サムネイルが表示されない

**原因**: `thumbnail`が`null`または無効なURL
**解決**:

- `null`の場合: デフォルトアイコンが表示される（正常動作）
- URLの場合: URLが有効でアクセス可能か確認

#### 3. タグフィルターが動作しない

**原因**: `tags`フィールドが配列でない
**解決**: `tags`は文字列配列形式で設定する

```json
"tags": ["tag1", "tag2"]  // ✅ 正しい
"tags": "tag1, tag2"       // ❌ 間違い
```

#### 4. 検索で見つからない

**原因**: 検索対象フィールドに該当する文字列がない
**解決**: `name`, `description`, `tags`, `publisher`（または`author`）に検索キーワードを含める

---

## 関連ドキュメント

- [API仕様書](./api-specification.md)
- [マーケットプレイス開発ガイド](./development-guide.md)
- [フロントエンド実装ガイド](./frontend-implementation.md)

---

## 変更履歴

| 日付       | 変更内容                                         | 担当者           |
| ---------- | ------------------------------------------------ | ---------------- |
| 2025-10-07 | 初版作成、`keywords`→`tags`統一、`thumbnail`追加 | Development Team |
