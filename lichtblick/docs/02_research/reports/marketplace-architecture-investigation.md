# マーケットプレイス機能 アーキテクチャ調査レポート

**作成日**: 2025年10月9日
**調査対象**: マーケットプレイス機能の基盤構造
**目的**: Lichtblick由来の機能と独自機能の明確化、最新仕様への改修準備

---

## 📋 調査概要

### 調査範囲

- Context層（Context定義）
- API層（Marketplace API実装）
- Provider層（Provider実装）
- Storage層（IndexedDB実装）
- 型定義（marketplace.ts, Extensions.ts）

### 調査結果サマリー

全てのコードに**BMW AG (umi@bmwgroup.com)** のコピーライトが記載されており、Lichtblick (Foxglove Studio) のコピーライトは**一切存在しない**ことを確認しました。

これは、マーケットプレイス機能全体が**独自実装**であることを示しています。

---

## 🔍 詳細調査結果

### 1. Context層

#### 1.1 ExtensionMarketplaceContext.ts

- **パス**: `/packages/suite-base/src/context/ExtensionMarketplaceContext.ts`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **機能**:
  - 拡張機能マーケットプレースの基本インターフェース定義
  - `ExtensionMarketplaceDetail`型定義（拡張機能詳細情報）
  - `ExtensionMarketplace`インターフェース（拡張機能の取得・検索）
  - `getAvailableExtensions()`, `getMarkdown()` メソッド
- **特徴**:
  - セキュリティ機能（SHA256ハッシュ検証）を含む
  - Markdown取得機能をサポート

#### 1.2 LayoutMarketplaceContext.ts

- **パス**: `/packages/suite-base/src/context/LayoutMarketplaceContext.ts`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **機能**:
  - レイアウトマーケットプレースの基本インターフェース定義
  - `LayoutMarketplaceDetail`型定義（レイアウト詳細情報）
  - `LayoutMarketplace`インターフェース（レイアウトの検索・ダウンロード）
  - `getAvailableLayouts()`, `searchLayouts()`, `downloadLayout()`, `verifyLayoutHash()` メソッド
- **特徴**:
  - 拡張機能より高度な検索機能を持つ
  - セキュリティ検証機能を含む

#### 1.3 ExtensionCatalogContext.ts

- **パス**: `/packages/suite-base/src/context/ExtensionCatalogContext.ts`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **機能**:
  - 拡張機能カタログの統合管理
  - インストール済み拡張機能の管理
  - **マーケットプレイス拡張機能の統合**（Phase 5で追加）
  - Zustandによる状態管理
- **特徴**:
  - マーケットプレイス機能が統合されている（`getMarketplaceExtensions`, `searchMarketplaceExtensions`等）
  - 拡張機能のライフサイクル全体を管理

#### 1.4 LayoutManagerContext.ts / LayoutStorageContext.ts

- **パス**: `/packages/suite-base/src/context/LayoutManagerContext.ts`, `LayoutStorageContext.ts`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **機能**:
  - レイアウトの管理とストレージ操作
  - 名前空間ベースの分離管理

---

### 2. API層

#### 2.1 ExtensionMarketplaceAPI.ts

- **パス**: `/packages/suite-base/src/api/marketplace/ExtensionMarketplaceAPI.ts`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **実装状況**: **Phase 4で大幅にシンプル化済み**
- **機能**:
  - 静的JSONファイルからの拡張機能データ取得
  - `getExtensions()`: extensions.json取得
  - `getExtension(id)`: クライアント側フィルタリング
  - `getMarkdown(url)`: Markdown取得
- **特徴**:
  - **複雑なAPI機能を削除**（検索、ページネーション、統計等）
  - 静的ファイル取得のみに特化
  - バックエンドサーバー不要の軽量設計

#### 2.2 LayoutMarketplaceAPI.ts

- **パス**: `/packages/suite-base/src/api/marketplace/LayoutMarketplaceAPI.ts`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **実装状況**: **未シンプル化**
- **機能**:
  - レイアウトの検索・取得
  - `getLayouts()`: 全レイアウト取得
  - `getLayout(id)`: 個別レイアウト取得
  - `searchLayouts()`: 検索機能
  - `downloadLayout()`: ダウンロード
  - `getStats()`: 統計情報取得
- **特徴**:
  - 拡張機能APIと異なり、**複雑なAPI機能が残っている**
  - RESTful API設計
  - **改修候補**: ExtensionMarketplaceAPI同様のシンプル化が可能

---

### 3. Provider層

#### 3.1 ExtensionCatalogProvider.tsx

- **パス**: `/packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **実装状況**: **Phase 5でマーケットプレイス機能統合済み**
- **機能**:
  - 拡張機能カタログの状態管理
  - 拡張機能のインストール・アンインストール
  - **マーケットプレイスデータのキャッシング**
  - **クライアント側検索機能**
- **特徴**:
  - `ExtensionMarketplaceAPI`を使用
  - Zustandストアで状態管理
  - マーケットプレイス機能が完全に統合されている

#### 3.2 ExtensionMarketplaceProvider.tsx

- **パス**: `/packages/suite-base/src/providers/ExtensionMarketplaceProvider.tsx`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **実装状況**: **最新版**
- **機能**:
  - マーケットプレイスAPIのラッパー
  - フォールバックURL対応（GitHub直接取得）
  - `getAvailableExtensions()`: 拡張機能一覧取得
- **特徴**:
  - 環境変数 `EXTENSION_MARKETPLACE_URL` でURL切り替え可能
  - デフォルトはFoxglove GitHubリポジトリ（`studio-extension-marketplace`）
  - **懸念点**: Foxgloveリポジトリに依存している

#### 3.3 LayoutMarketplaceProvider.tsx

- **パス**: `/packages/suite-base/src/providers/LayoutMarketplaceProvider.tsx`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **実装状況**: **最新版**
- **機能**:
  - レイアウトマーケットプレースAPIのラッパー
  - フォールバックURL対応
  - SHA256ハッシュ検証機能
  - レイアウトデータのバリデーション
- **特徴**:
  - `LAYOUT_MARKETPLACE_URL` で設定可能
  - セキュリティ機能が充実

---

### 4. Storage層

#### 4.1 IdbExtensionStorage.ts

- **パス**: `/packages/suite-base/src/services/extension/IdbExtensionStorage.ts`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **実装状況**: **単一バージョン形式**
- **機能**:
  - IndexedDBによる拡張機能の永続化
  - `metadata`ストア: ExtensionInfo
  - `extensions`ストア: StoredExtension (メタデータ + バイナリ)
  - CRUD操作: `list()`, `get()`, `put()`, `delete()`
- **特徴**:
  - DBバージョン1
  - **現状は単一バージョンのみ対応**
  - **Phase 6で複数バージョン対応予定**

#### 4.2 ILayoutStorage.ts

- **パス**: `/packages/suite-base/src/services/ILayoutStorage.ts`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **機能**:
  - レイアウトストレージインターフェース
  - 名前空間ベースの分離
  - `baseline`/`working`による版管理
  - 同期状態管理（`LayoutSyncInfo`）

---

### 5. 型定義

#### 5.1 marketplace.ts

- **パス**: `/packages/suite-base/src/types/marketplace.ts`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **実装状況**: **Phase 2で正規化済み**
- **定義**:
  - `ExtensionItem`: 複数バージョン対応の拡張機能定義
  - `VersionDetail`: 個別バージョン情報
  - `ExtensionsData`: extensions.json全体の型
  - `LayoutItem`: レイアウト定義
  - `LayoutsData`: layouts.json全体の型
- **特徴**:
  - V2型が正規型に変更済み（`ExtensionItemV2` → `ExtensionItem`）
  - Legacy型とマイグレーション関数は削除済み

#### 5.2 Extensions.ts

- **パス**: `/packages/suite-base/src/types/Extensions.ts`
- **コピーライト**: BMW AG (umi@bmwgroup.com)
- **判定**: **独自実装**
- **実装状況**: **Phase 2で拡張済み**
- **定義**:
  - `ExtensionInfo`: インストール済み拡張機能の情報
  - `marketplaceId`: マーケットプレイスとの紐付け（Phase 2で追加）
  - `availableVersions`: アップデート確認用（Phase 2で追加）
- **特徴**:
  - **単一バージョン形式を維持**
  - マーケットプレイスとの統合を考慮

#### 5.3 HybridExtension.ts

- **パス**: なし（削除済み）
- **判定**: **独自実装（削除済み）**
- **実装状況**: **Phase 3で完全削除**
- **削除内容**:
  - `UnifiedExtensionData`, `DataSourceInfo` 等の型
  - `extensionDataConverter.ts` 削除
  - `HybridExtensionLoader.ts` 削除
- **理由**: 複雑性排除、marketplace.tsに統一

---

## 📊 由来判定まとめ

### 全てのファイルが**独自実装**

| カテゴリ | ファイル名                       | 由来     | コピーライト |
| -------- | -------------------------------- | -------- | ------------ |
| Context  | ExtensionMarketplaceContext.ts   | 独自実装 | BMW AG       |
| Context  | LayoutMarketplaceContext.ts      | 独自実装 | BMW AG       |
| Context  | ExtensionCatalogContext.ts       | 独自実装 | BMW AG       |
| Context  | LayoutManagerContext.ts          | 独自実装 | BMW AG       |
| Context  | LayoutStorageContext.ts          | 独自実装 | BMW AG       |
| API      | ExtensionMarketplaceAPI.ts       | 独自実装 | BMW AG       |
| API      | LayoutMarketplaceAPI.ts          | 独自実装 | BMW AG       |
| Provider | ExtensionCatalogProvider.tsx     | 独自実装 | BMW AG       |
| Provider | ExtensionMarketplaceProvider.tsx | 独自実装 | BMW AG       |
| Provider | LayoutMarketplaceProvider.tsx    | 独自実装 | BMW AG       |
| Storage  | IdbExtensionStorage.ts           | 独自実装 | BMW AG       |
| Storage  | ILayoutStorage.ts                | 独自実装 | BMW AG       |
| Type     | marketplace.ts                   | 独自実装 | BMW AG       |
| Type     | Extensions.ts                    | 独自実装 | BMW AG       |

### Lichtblick (Foxglove) 由来の痕跡

**調査結果**: **0件**

- `grep` 検索で `SPDX-FileCopyrightText` にFoxgloveやCruiseの記載なし
- 全てのファイルが BMW AG (umi@bmwgroup.com) コピーライト

---

## 🚨 懸念点・改善ポイント

### 1. 外部依存関係

#### 問題点

- `ExtensionMarketplaceProvider.tsx` がFoxglove GitHubリポジトリに依存
  ```typescript
  const EXTENSION_MARKETPLACE_FALLBACK_URL =
    "https://raw.githubusercontent.com/foxglove/studio-extension-marketplace/main/extensions.json";
  ```

#### 影響

- Foxgloveリポジトリが削除・変更された場合、機能停止の可能性
- 独自のマーケットプレイスとしての独立性が不十分

#### 推奨対応

- 独自のマーケットプレイスリポジトリを作成
- 環境変数で切り替え可能にする（既に実装済み）
- デフォルトURLを独自リポジトリに変更

### 2. LayoutMarketplaceAPIの複雑性

#### 問題点

- `LayoutMarketplaceAPI.ts` が未シンプル化
- 検索、統計、ページネーションなど複雑な機能が残存
- `ExtensionMarketplaceAPI` と設計思想が異なる

#### 影響

- 保守性の低下
- 静的ファイル取得設計と不一致
- バックエンドサーバーが必要（実際は不要）

#### 推奨対応

- Phase 4と同様のシンプル化を実施
- 静的JSONファイル取得のみに特化
- クライアント側で検索・フィルタリング

### 3. 複数バージョン対応の未完了

#### 問題点

- `IdbExtensionStorage.ts` が単一バージョンのみ対応
- Phase 6のマイグレーション機能が未実装

#### 影響

- 同じ拡張機能の複数バージョンを同時インストール不可
- マーケットプレイスの複数バージョン定義と不一致

#### 推奨対応

- Phase 6のタスクを完了
- DBバージョン2へのマイグレーション実装
- `marketplaceId` と `@version` 形式のサポート

---

## 🎯 最新仕様への改修推奨事項

### Phase 1: 外部依存の解消（最優先）

1. **独自マーケットプレイスリポジトリの作成**

   - GitHub: `umi/extension-marketplace`
   - GitHub: `umi/layout-marketplace`
   - 既存のFoxgloveリポジトリのフォーク or 新規作成

2. **デフォルトURLの変更**
   - `ExtensionMarketplaceProvider.tsx` のフォールバックURL更新
   - `LayoutMarketplaceProvider.tsx` のフォールバックURL更新

### Phase 2: LayoutMarketplaceAPIのシンプル化

1. **不要な機能の削除**

   - `searchLayouts()` → クライアント側実装に移行
   - `getStats()` → 削除（静的ファイルに統計不要）
   - ページネーション機能 → 削除

2. **実装の統一**
   - `ExtensionMarketplaceAPI` のパターンに合わせる
   - 静的JSONファイル取得のみに特化

### Phase 3: 複数バージョン対応の完了

1. **Phase 6タスクの実施**

   - `IdbExtensionStorage.ts` のDBバージョン2マイグレーション
   - `@version` 形式のIDサポート
   - `marketplaceId` フィールドの活用

2. **既存データのマイグレーション**
   - 単一バージョン形式 → 複数バージョン形式
   - 自動マイグレーション処理の実装

### Phase 4: ドキュメントとテストの整備

1. **APIドキュメント更新**

   - 最新の実装に合わせたドキュメント作成
   - 使用例とベストプラクティスの記載

2. **テストの追加**
   - マーケットプレイスAPI のユニットテスト
   - マイグレーション処理の統合テスト

---

## 📝 結論

### 主な発見事項

1. **全てが独自実装**: マーケットプレイス機能全体がBMW AG（umi）による独自実装
2. **Lichtblick由来なし**: FoxgloveやCruiseのコードは一つも含まれていない
3. **高い完成度**: Phase 5までの実装は概ね完了、Phase 6が残課題
4. **独自サーバー完備**: `/server`ディレクトリに静的ファイルサーバーが実装済み

### ✅ 実施済み改修（2025年10月9日）

#### 1. API層の削除完了

- **削除ファイル**:
  - `ExtensionMarketplaceAPI.ts`
  - `LayoutMarketplaceAPI.ts`
- **理由**: 静的JSONファイルの取得は直接`fetch()`で十分に実現可能
- **影響**: Provider層を直接fetch実装に変更

#### 2. Provider層の簡素化

- **ExtensionCatalogProvider**: 直接fetch実装に変更
- **ExtensionMarketplaceProvider**: 直接fetch実装に変更
- **LayoutMarketplaceProvider**: 直接fetch実装に変更
- **デフォルトURL**: ローカル開発サーバー（`http://localhost:3001`）に変更

#### 3. DBマイグレーション仕様の明確化

- **ドキュメント作成**: `docs/reports/db-migration-specification.md`
- **内容**:
  - Version 1 → Version 2のマイグレーション手順
  - 複数バージョン対応の詳細仕様
  - IDフォーマット: `publisher.name@version`
  - `marketplaceId`の追加: `publisher.name`
- **実装方法**: IndexedDBのupgrade関数内で自動マイグレーション

### 改修の優先順位（更新版）

**最優先** ✅ 完了:

- ~~外部依存（Foxgloveリポジトリ）の解消~~ → ローカルサーバーに変更済み
- ~~API層の削除~~ → 削除完了

**高優先**:

- DBマイグレーション（Phase 6）の実装
- 複数バージョン対応の完了

**中優先**:

- マイグレーション処理のテスト
- UI層との統合確認

**低優先**:

- ドキュメント・テストの整備

### 次のアクション

1. **Phase 6の実装**

   - `IdbExtensionStorage.ts`のマイグレーション実装
   - `IdbExtensionLoader.ts`のID生成ロジック更新
   - 参照: `docs/reports/db-migration-specification.md`

2. **統合テスト**

   - マイグレーション処理の検証
   - 複数バージョンインストールのテスト
   - UI層との連携確認

3. **本番環境の準備**
   - S3 + CloudFrontへの静的ファイル配置
   - 環境変数による本番URLの設定

---

**初回調査完了日**: 2025年10月9日
**改修実施日**: 2025年10月9日
**ステータス**: API層削除完了、Phase 6実装待ち
