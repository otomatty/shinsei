# マーケットプレイスJSON規格 再検討まとめ

**日付**: 2025-10-08
**バージョン**: v2.0
**ステータス**: 設計完了・実装準備中

---

## 📋 実施内容

### 1. 規格の再検討と設計

extensions.jsonとlayouts.jsonの規格を見直し、以下の要件に基づいて新しい規格v2.0を設計しました。

#### ✅ 採用された要件:

- `author` → `publisher` に統一
- `tags` フィールドを標準化（必須）
- Extensionsは複数バージョン対応
- Layoutsはバージョン管理なし（シンプルに保つ）
- サムネイル対応（自動生成は今回実装せず）
- Layoutの`layout`オブジェクトを外部ファイルに分離
- メタデータの追加は不要

---

## 📁 作成されたファイル

### ドキュメント

- **`docs/marketplace/json-schema-v2.md`**
  - 新しいJSON規格v2.0の完全な仕様書
  - フィールド定義、データ例、移行ガイドを含む
  - JSON Schemaによる検証スキーマも記載

### データファイル（v2形式）

- **`server/data/extensions-v2.json`**

  - 複数バージョン対応の新形式Extensions
  - 全24個の拡張機能を変換済み

- **`server/data/layouts-v2.json`**

  - 外部ファイル参照形式の新しいLayouts
  - 全4個のレイアウトを変換済み

- **`server/data/layouts/`**（新規ディレクトリ）
  - `robotics-dashboard.json`
  - `autonomous-vehicle-layout.json`
  - `drone-monitoring.json`
  - `minimal-debug.json`
  - 各レイアウトの実際の構造データ

### TypeScript型定義

- **`packages/suite-base/src/types/MarketplaceV2.ts`**

  - 新規格v2.0の型定義
  - ヘルパー関数（検証、変換、取得）
  - 移行用のユーティリティ関数

- **`packages/suite-base/src/types/HybridExtension.ts`**（更新）
  - v2型定義への参照を追加
  - 後方互換性を維持

---

## 🔄 主な変更点

### Extensions (v1 → v2)

#### 変更前（v1）:

```json
{
  "id": "example.extension",
  "name": "Example",
  "version": "1.0.0",
  "publisher": "Publisher",
  "tags": ["tag1"]
}
```

#### 変更後（v2）:

```json
{
  "id": "example.extension",
  "name": "Example",
  "publisher": "Publisher",
  "tags": ["tag1"],
  "versions": {
    "1.0.0": {
      "version": "1.0.0",
      "publishedDate": "2025-10-04T01:21:25Z",
      "foxe": "https://..."
    }
  },
  "latest": "1.0.0",
  "supported": ["1.0.0"]
}
```

**主な変更:**

- ✅ `version`フィールドを削除
- ✅ `versions`オブジェクトを追加（複数バージョン対応）
- ✅ `latest`フィールドを追加（最新バージョン識別）
- ✅ `supported`フィールドを追加（サポート対象バージョン）

### Layouts (v1 → v2)

#### 変更前（v1）:

```json
{
  "id": "example-layout",
  "name": "Example",
  "author": "Creator",
  "tags": ["tag1"],
  "layout": {
    /* 大きなオブジェクト */
  }
}
```

#### 変更後（v2）:

**layouts-v2.json:**

```json
{
  "id": "example-layout",
  "name": "Example",
  "publisher": "Creator",
  "tags": ["tag1"],
  "layoutUrl": "/layouts/example-layout.json"
}
```

**layouts/example-layout.json:**

```json
{
  "configById": {},
  "globalVariables": {},
  "userNodes": {},
  "playbackConfig": { "speed": 1 },
  "layout": {}
}
```

**主な変更:**

- ✅ `author` → `publisher` に変更
- ✅ `layout`オブジェクトを外部ファイルに分離
- ✅ `layoutUrl`フィールドを追加

---

## 📊 データ統計

### Extensions

- **総数**: 24個
- **名前空間**: すべて`official`
- **バージョン**: 各拡張機能に1バージョンずつ（v2形式で準備済み）
- **サムネイル**: すべて`null`（未設定）

### Layouts

- **総数**: 4個
- **分離されたファイル**: 4個
- **サムネイル**: すべて`null`（未設定）

---

## 🛠️ 技術的な詳細

### 型定義の構造

#### ExtensionItemV2

```typescript
interface ExtensionItemV2 {
  id: string;
  name: string;
  publisher: string;
  description: string;
  homepage?: string;
  license?: string;
  tags: string[];
  thumbnail?: string | null;
  namespace?: string;
  versions: Record<string, VersionDetail>;
  latest: string;
  supported?: string[];
  deprecated?: string[];
}
```

#### LayoutItemV2

```typescript
interface LayoutItemV2 {
  id: string;
  name: string;
  publisher: string;
  description: string;
  tags: string[];
  thumbnail?: string | null;
  layoutUrl: string;
}
```

### ヘルパー関数

**flattenExtensionVersions**

- 複数バージョンを持つ拡張機能を個別のバージョンオブジェクトに展開

**getLatestVersion**

- 最新バージョンのみを取得

**migrateLegacyExtension**

- v1形式からv2形式への変換

**migrateLegacyLayout**

- v1形式からv2形式への変換（レイアウトデータも分離）

**validateExtension / validateLayout**

- データの妥当性検証

---

## 📂 ディレクトリ構造

```
server/data/
├── extensions.json          # 既存のv1形式（保持）
├── extensions-v2.json       # 新しいv2形式
├── layouts.json             # 既存のv1形式（保持）
├── layouts-v2.json          # 新しいv2形式
└── layouts/                 # レイアウトファイル（新規）
    ├── robotics-dashboard.json
    ├── autonomous-vehicle-layout.json
    ├── drone-monitoring.json
    └── minimal-debug.json

docs/marketplace/
├── json-schema-v2.md        # 新規格の仕様書
└── ... (その他のドキュメント)

packages/suite-base/src/types/
├── MarketplaceV2.ts         # 新しい型定義
└── HybridExtension.ts       # 更新済み（v2型への参照追加）
```

---

## 🔜 次のステップ

### 優先度：高

1. **サーバー側の実装更新**

   - Hono/Express/Goサーバーで新規格v2に対応
   - `/layouts/:id/data`エンドポイントの追加（外部レイアウトファイル取得用）
   - エラーハンドリングの修正

2. **フロントエンド側の対応**

   - ExtensionMarketplaceProviderでv2形式に対応
   - LayoutMarketplaceProviderでv2形式に対応
   - 外部レイアウトファイルの読み込み処理

3. **HybridExtensionLoaderの更新**
   - v2形式のデータソースに対応
   - 複数バージョンの取得・選択機能

### 優先度：中

4. **移行ツールの作成**

   - v1→v2自動変換スクリプト
   - バリデーションツール
   - テストデータ生成ツール

5. **テストの追加**

   - 型定義のテスト
   - データバリデーションのテスト
   - APIエンドポイントのテスト

6. **ドキュメントの更新**
   - API仕様書の更新
   - 開発者ガイドの更新
   - マイグレーションガイドの詳細化

### 優先度：低

7. **サムネイル機能の実装**

   - サムネイル画像のアップロード機能
   - 自動生成機能（オプション）
   - プレースホルダー画像の設定

8. **パフォーマンス最適化**
   - レイアウトファイルのキャッシュ戦略
   - バージョン情報の遅延読み込み
   - 検索インデックスの最適化

---

## ⚠️ 注意事項

### 後方互換性

- 既存のv1形式のファイルは保持されています
- 新しいファイル名に`-v2`サフィックスを使用
- 段階的な移行が可能

### 破壊的変更

以下の変更は破壊的変更となるため、クライアント側の更新が必要です：

1. **Extensionsの構造変更**

   - `version`フィールドが`versions`オブジェクトに変更
   - `latest`フィールドが追加

2. **Layoutsの構造変更**

   - `author` → `publisher` に変更
   - `layout`オブジェクトが`layoutUrl`参照に変更

3. **APIエンドポイントの追加**
   - レイアウトファイル取得用の新しいエンドポイントが必要

### データ移行

- すべての既存データをv2形式に変換済み
- 元のデータは保持されているため、ロールバック可能
- 本番環境での移行前に十分なテストが必要

---

## 📝 変更ログ

| 日付       | バージョン | 変更内容                                                  |
| ---------- | ---------- | --------------------------------------------------------- |
| 2025-10-08 | v2.0       | 複数バージョン対応、レイアウトファイル分離、publisher統一 |
| 2025-10-04 | v1.0       | 初版リリース（既存の形式）                                |

---

## 🎯 期待される効果

### Extensions

1. **複数バージョン管理**

   - 過去バージョンへのロールバックが容易
   - バージョン履歴の追跡が可能
   - 段階的な機能追加・非推奨化が管理しやすい

2. **拡張性の向上**
   - 新しいバージョンの追加が容易
   - バージョン別のメタデータ管理
   - より柔軟なバージョン選択UI

### Layouts

1. **ファイルサイズの削減**

   - layouts.jsonのサイズが大幅に削減
   - ネットワーク転送量の削減
   - 初期ロード時間の短縮

2. **保守性の向上**

   - レイアウトの個別編集が容易
   - Git diffが見やすい
   - バージョン管理が効率的

3. **キャッシング効率の向上**
   - 個別のレイアウトファイルをキャッシュ可能
   - 変更のないレイアウトは再読み込み不要

---

## 📞 サポート

質問や問題がある場合：

1. `docs/marketplace/json-schema-v2.md` を参照
2. 既存のドキュメントを確認
3. 開発チームに問い合わせ

---

**作成者**: AI Assistant
**レビュー**: 未実施
**承認**: 未実施
