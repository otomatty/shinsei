# マーケットプレイス機能実装状況調査レポート

**調査日**: 2025年10月9日
**対象**: Extension & Layout Marketplace機能

## 1. エグゼクティブサマリー

### 現状

- サーバー側は複数バージョン対応の新しいデータ構造（ExtensionItemV2）で実装済み
- アプリ側は古い単一バージョン仕様と新しい複数バージョン仕様が混在している状態
- **重大な問題**: `HybridExtension.ts` ファイルが存在せず、複数のファイルでインポートエラーが発生

### 推奨アクション

1. HybridExtension関連の実装を削除または再実装
2. サーバー側のデータ構造（ExtensionItemV2）に合わせてアプリ側を統一
3. 既存のmarketplace.tsの型定義を基本として使用

---

## 2. サーバー側データ構造

### 2.1 Extensions（複数バージョン対応）

**ファイル**: `/server/assets/extensions/extensions.json`

```json
{
  "id": "foxglove.blank-panel-extension",
  "name": "Blank Panel",
  "publisher": "foxglove",
  "description": "Add a little space to your layout",
  "homepage": "https://github.com/foxglove/blank-panel-extension",
  "license": "MIT",
  "tags": ["blank", "panel", "empty", "logo", "spacer"],
  "thumbnail": null,
  "namespace": "official",
  "versions": {
    "1.0.0": {
      "version": "1.0.0",
      "publishedDate": "2025-10-04T01:21:25Z",
      "sha256sum": "fa2b11af8ed7c420ca6e541196bca608661c0c1a81cd1f768c565c72a55a63c8",
      "foxe": "https://github.com/foxglove/blank-panel-extension/releases/download/1.0.0/foxglove.blank-panel-extension-1.0.0.foxe",
      "readme": "https://raw.githubusercontent.com/foxglove/blank-panel-extension/main/README.md",
      "changelog": "https://raw.githubusercontent.com/foxglove/blank-panel-extension/main/CHANGELOG.md"
    }
  },
  "latest": "1.0.0",
  "supported": ["1.0.0"]
}
```

**特徴**:

- ✅ 複数バージョンをversionsオブジェクトで管理
- ✅ latestフィールドで最新バージョンを指定
- ✅ 各バージョンに個別のメタデータ（sha256sum, foxe, readme, changelog）
- ✅ namespaceフィールド（official）

### 2.2 Layouts（シンプルな構造）

**ファイル**: `/server/assets/layouts/layouts.json`

```json
{
  "id": "robotics-dashboard",
  "name": "Robotics Dashboard",
  "publisher": "Robotics Team",
  "description": "A comprehensive dashboard for robotics data visualization",
  "tags": ["robotics", "dashboard", "visualization"],
  "thumbnail": null,
  "layoutUrl": "/layouts/robotics-dashboard.json"
}
```

**特徴**:

- ✅ バージョン管理なし（レイアウトはシンプル）
- ✅ layoutUrlで外部JSONファイルを参照
- ✅ 基本的なメタデータのみ

---

## 3. アプリ側実装状況

### 3.1 型定義

#### A. marketplace.ts（複数バージョン対応 - 新仕様）✅

**パス**: `packages/suite-base/src/types/marketplace.ts`

```typescript
// 複数バージョン対応のExtension定義
export interface ExtensionItemV2 {
  id: string;
  name: string;
  publisher: string;
  description: string;
  homepage?: string;
  license?: string;
  tags: string[];
  thumbnail?: string;
  namespace?: string;
  versions: Record<string, VersionDetail>; // ✅ 複数バージョン
  latest: string;
  supported?: string[];
  deprecated?: string[];
}

export interface VersionDetail {
  version: string;
  publishedDate: string;
  sha256sum?: string;
  foxe?: string;
  readme?: string;
  changelog?: string;
  deprecated?: boolean;
}
```

**状態**: ✅ 完全実装済み、サーバー側と一致

#### B. HybridExtension.ts（存在しない）❌

**パス**: `packages/suite-base/src/types/HybridExtension.ts`

**問題点**:

- ❌ ファイルが存在しない
- ❌ 以下のファイルでインポートエラー発生:
  - `ExtensionCatalogContext.ts`
  - `extensionDataConverter.ts`
  - `HybridExtensionLoader.ts`

**想定されていた型** (コードから推測):

```typescript
// 存在しないが、以下の型が期待されている
export interface UnifiedExtensionData {
  id: string;
  baseId: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  homepage?: string;
  license?: string;
  keywords?: string[];
  isLatest: boolean;
  publishedDate: string;
  foxe?: string;
  dataSource: "legacy" | "multi-version";
}

export interface DataSourceInfo {
  type: "legacy" | "multi-version";
  extensionCount: number;
  versionCount: number;
  fetchedAt: string;
  sourceUrl: string;
}

export interface LegacyExtensionData {
  // 単一バージョン形式
}

export interface MultiVersionExtensionData {
  // 複数バージョン形式（ExtensionItemV2と同等）
}
```

#### C. Extensions.ts（単一バージョン - 旧仕様）⚠️

**パス**: `packages/suite-base/src/types/Extensions.ts`

```typescript
export type ExtensionInfo = {
  id: string;
  name: string;
  version: string; // ⚠️ 単一バージョンのみ
  publisher: string;
  description: string;
  // ...
};
```

**状態**: ⚠️ 単一バージョン想定、インストール済み拡張機能で使用中

### 3.2 API実装

#### ExtensionMarketplaceAPI.ts ✅

**パス**: `packages/suite-base/src/api/marketplace/ExtensionMarketplaceAPI.ts`

```typescript
export class ExtensionMarketplaceAPI implements IExtensionMarketplace {
  public async getExtensions(): Promise<ExtensionApiData[]>;
  public async getExtension(id: string): Promise<ExtensionApiData | undefined>;
  public async searchExtensions(params: SearchExtensionsRequest): Promise<ExtensionSearchResponse>;
  public async getVersions(params: GetVersionsRequest): Promise<VersionsResponse>;
  public async downloadExtension(params: DownloadRequest): Promise<DownloadResponse>;
}
```

**状態**: ✅ 実装済み、HttpServiceを使用

#### types.ts（API DTO）✅

**パス**: `packages/suite-base/src/api/marketplace/types.ts`

```typescript
export interface ExtensionApiData {
  id: string;
  version: string; // ⚠️ 単一バージョン（APIレスポンス）
  // ...
}

export interface VersionInfo {
  version: string;
  releaseDate: string;
  downloadUrl: string;
  sha256?: string;
  changelog?: string;
  deprecated?: boolean;
}
```

**状態**: ✅ 実装済みだが、ExtensionApiDataは単一バージョン想定

### 3.3 Context & Provider

#### ExtensionMarketplaceContext.ts ⚠️

**パス**: `packages/suite-base/src/context/ExtensionMarketplaceContext.ts`

```typescript
export type ExtensionMarketplaceDetail = ExtensionInfo & {
  sha256sum?: string;
  foxe?: string;
  time?: Record<string, string>; // ⚠️ バージョン別タイムスタンプ（複数バージョンの名残）
};
```

**状態**: ⚠️ 単一バージョンと複数バージョンが混在

#### ExtensionCatalogContext.ts ❌

**パス**: `packages/suite-base/src/context/ExtensionCatalogContext.ts`

```typescript
import type { UnifiedExtensionData, DataSourceInfo } from "@umi/suite-base/types/HybridExtension";
//                                                                        ^^^^^^^^^^^^^^^^ ❌ 存在しない

export type ExtensionCatalog = {
  getMarketplaceExtensions: () => Promise<UnifiedExtensionData[]>;
  getExtensionVersions: (baseId: string) => Promise<UnifiedExtensionData[]>;
  getLatestExtensions: () => Promise<UnifiedExtensionData[]>;
  searchMarketplaceExtensions: (query: string) => Promise<UnifiedExtensionData[]>;
  // ...
  marketplaceExtensions: undefined | UnifiedExtensionData[];
};
```

**問題点**: ❌ HybridExtension.tsが存在しないためビルドエラー

### 3.4 Utility

#### extensionDataConverter.ts ❌

**パス**: `packages/suite-base/src/util/marketplace/extensionDataConverter.ts`

```typescript
import {
  DataSourceType,
  LegacyExtensionData,
  MultiVersionExtensionData,
  UnifiedExtensionData,
} from "@umi/suite-base/types/HybridExtension"; // ❌ 存在しない
```

**問題点**: ❌ インポートエラー

#### HybridExtensionLoader.ts ❌

**パス**: `packages/suite-base/src/util/marketplace/HybridExtensionLoader.ts`

```typescript
import {
  DataSourceInfo,
  HybridLoaderConfig,
  HybridLoaderError,
  LegacyExtensionData,
  MultiVersionExtensionData,
  UnifiedExtensionData,
  UniversalExtensionLoader,
} from "@umi/suite-base/types/HybridExtension"; // ❌ 存在しない

export class HybridExtensionLoader implements UniversalExtensionLoader {
  // レガシー形式と複数バージョン形式の両方をサポート
}
```

**問題点**: ❌ インポートエラー

### 3.5 UI Component

#### ExtensionMarketplaceSettings.tsx ⚠️

**パス**: `packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx`

```typescript
const marketplaceExtensions = useExtensionCatalog((state) => state.marketplaceExtensions);
// marketplaceExtensions の型は UnifiedExtensionData[] | undefined
// しかし、コンポーネント内でExtensionDataに変換している

const allExtensions = useMemo(() => {
  const hybridMarketplaceData: ExtensionData[] =
    marketplaceExtensions && marketplaceExtensions.length > 0
      ? marketplaceExtensions.map((ext): ExtensionData => ({
          id: ext.id,
          name: ext.name,
          displayName: ext.name,  // ⚠️ UnifiedExtensionDataにdisplayNameがない
          // ...
        }))
      : // フォールバック
}, []);
```

**状態**: ⚠️ 型の不一致を手動で吸収している

---

## 4. 問題点と課題

### 4.1 インポートエラー（クリティカル）❌

**影響を受けるファイル**:

1. `ExtensionCatalogContext.ts`
2. `extensionDataConverter.ts`
3. `HybridExtensionLoader.ts`

**原因**: `@umi/suite-base/types/HybridExtension` ファイルが存在しない

**影響**: ビルド失敗の可能性

### 4.2 型定義の不統一⚠️

| ファイル                                    | バージョン対応 | 用途                 | 状態          |
| ------------------------------------------- | -------------- | -------------------- | ------------- |
| `marketplace.ts` (ExtensionItemV2)          | ✅ 複数        | サーバーデータ定義   | ✅ 完全       |
| `Extensions.ts` (ExtensionInfo)             | ❌ 単一        | インストール済み拡張 | ⚠️ 旧仕様     |
| `types.ts` (ExtensionApiData)               | ❌ 単一        | API DTO              | ⚠️ 単一想定   |
| `HybridExtension.ts` (UnifiedExtensionData) | ✅ 複数        | 統合型               | ❌ 存在しない |

### 4.3 データフロー混乱⚠️

```
サーバー (ExtensionItemV2, 複数バージョン)
    ↓
API (ExtensionApiData, 単一バージョン)  ← ⚠️ ミスマッチ
    ↓
Context (UnifiedExtensionData)  ← ❌ 型が存在しない
    ↓
Component (ExtensionData)  ← ⚠️ 手動変換
```

### 4.4 マイグレーション未実装⚠️

`marketplace.ts`にマイグレーション関数は定義されているが:

```typescript
export function migrateLegacyExtension(legacy: LegacyExtensionItem): ExtensionItemV2;
```

**課題**:

- 既存のインストール済み拡張機能のマイグレーション処理が不明
- バージョン管理のマイグレーション戦略が未定義

---

## 5. サーバー側との整合性

### 5.1 Extensions

| 項目      | サーバー (extensions.json)    | アプリ (marketplace.ts)       | 一致 |
| --------- | ----------------------------- | ----------------------------- | ---- |
| 基本構造  | ExtensionItemV2相当           | ExtensionItemV2               | ✅   |
| versions  | Record<string, VersionDetail> | Record<string, VersionDetail> | ✅   |
| latest    | ✅                            | ✅                            | ✅   |
| namespace | ✅                            | ✅                            | ✅   |
| tags      | string[]                      | string[]                      | ✅   |

**結論**: ✅ marketplace.tsの定義はサーバー側と完全一致

### 5.2 Layouts

| 項目           | サーバー (layouts.json) | アプリ (marketplace.ts) | 一致 |
| -------------- | ----------------------- | ----------------------- | ---- |
| 基本構造       | シンプル                | LayoutItemV2            | ✅   |
| layoutUrl      | ✅                      | ✅                      | ✅   |
| バージョン管理 | ❌ なし                 | ❌ なし                 | ✅   |

**結論**: ✅ layouts定義もサーバー側と一致

---

## 6. 推奨される実装方針

### 6.1 HybridExtension関連の処理方針（3つの選択肢）

#### 選択肢A: HybridExtension.tsを新規作成 ⭐推奨

**メリット**:

- 既存コードの大幅な変更不要
- レガシー形式との互換性維持

**デメリット**:

- 追加の型定義層が必要
- 複雑性の増加

**作業内容**:

1. `types/HybridExtension.ts` を作成
2. UnifiedExtensionData等の型を定義
3. marketplace.tsのExtensionItemV2との変換関数を実装

#### 選択肢B: HybridExtension関連を削除してmarketplace.tsに統一 ⭐⭐最推奨

**メリット**:

- ✅ サーバー側データ構造と完全一致
- ✅ 型の統一による保守性向上
- ✅ 不要な変換処理の削除

**デメリット**:

- 既存コードの大幅な書き換えが必要

**作業内容**:

1. HybridExtension関連のインポートを削除
2. ExtensionCatalogContext等でExtensionItemV2を使用
3. HybridExtensionLoader, extensionDataConverterを削除または書き換え
4. ExtensionInfoを複数バージョン対応に拡張

#### 選択肢C: API層でバージョン展開 ⚠️非推奨

**メリット**:

- 既存のExtensionInfo（単一バージョン）をそのまま使用可能

**デメリット**:

- ❌ サーバー側の複数バージョン構造を活かせない
- ❌ バージョン管理機能が制限される

### 6.2 データフロー設計（選択肢Bの場合）

```
サーバー (ExtensionItemV2)
    ↓ JSON fetch
API Layer (ExtensionItemV2のまま受信)
    ↓
ExtensionCatalog (ExtensionItemV2を保持)
    ↓
Component (ExtensionItemV2から必要なバージョンを選択)
    ↓
Install (選択されたバージョンを ExtensionInfo に変換)
```

### 6.3 型定義の統合方針

#### 統合後の型階層

```typescript
// 1. サーバーデータ型（複数バージョン対応）
ExtensionItemV2 {
  versions: Record<string, VersionDetail>
  latest: string
}

// 2. インストール済み拡張機能型（単一バージョン）
ExtensionInfo {
  version: string  // インストールされている特定バージョン
  sourceVersions?: ExtensionItemV2  // 元のマーケットプレイス情報への参照
}

// 3. UI表示用の拡張型
ExtensionDisplayData {
  baseInfo: ExtensionItemV2
  installedVersion?: string
  availableVersions: VersionDetail[]
  latestVersion: string
}
```

---

## 7. マイグレーション戦略

### 7.1 既存データのマイグレーション

#### インストール済み拡張機能

```typescript
// 既存: ExtensionInfo (単一バージョン)
{
  id: "publisher.extension-name",
  version: "1.0.0",
  // ...
}

// 移行後: そのまま維持（インストール済みは単一バージョン）
// ただし、元のマーケットプレイス情報へのリンクを追加
{
  id: "publisher.extension-name",
  version: "1.0.0",
  marketplaceId: "publisher.extension-name",  // ✅ 追加
  // ...
}
```

#### マーケットプレイスデータ

```typescript
// 旧: 単一バージョン配列
[
  { id: "ext1", version: "1.0.0" },
  { id: "ext1", version: "2.0.0" },  // 別エントリ
]

// 新: 複数バージョン統合（サーバー形式）
{
  id: "ext1",
  versions: {
    "1.0.0": { ... },
    "2.0.0": { ... }
  },
  latest: "2.0.0"
}
```

**マイグレーション不要**: サーバー側が既に新形式のため、アプリ側を対応させるだけ

### 7.2 後方互換性

#### 旧形式のマーケットプレイスソース対応

```typescript
// marketplace.tsに既存のマイグレーション関数を活用
export function migrateLegacyExtension(legacy: LegacyExtensionItem): ExtensionItemV2;
```

---

## 8. 実装ロードマップ

### Phase 1: 緊急対応（ビルドエラー解消）🔴

**優先度**: 最高
**期間**: 1日

1. ❌ 一時的にHybridExtension関連のインポートをコメントアウト
2. ⚠️ marketplaceExtensionsの型をanyまたはExtensionItemV2[]に変更
3. ✅ ビルド成功を確認

### Phase 2: 型定義の統一 🟡

**優先度**: 高
**期間**: 2-3日

1. HybridExtension.tsを作成（選択肢A）または削除（選択肢B）
2. ExtensionCatalogContextの型を更新
3. API層の型定義を整理（ExtensionApiData → ExtensionItemV2）

### Phase 3: データフロー実装 🟢

**優先度**: 中
**期間**: 3-5日

1. ExtensionMarketplaceAPIをExtensionItemV2対応に修正
2. ExtensionCatalogProviderでマーケットプレイスデータを取得
3. バージョン選択UIの実装

### Phase 4: マイグレーション & テスト 🔵

**優先度**: 中
**期間**: 2-3日

1. 既存データのマイグレーションテスト
2. 複数バージョンのインストール/アンインストールテスト
3. ドキュメント更新

---

## 9. 結論

### 現状評価

- ❌ **クリティカル**: HybridExtension.tsが存在せずビルドエラーの可能性
- ⚠️ **重要**: 型定義が統一されておらず、保守性が低い
- ✅ **良好**: サーバー側データ構造は明確で複数バージョン対応済み
- ✅ **良好**: marketplace.tsの型定義はサーバー側と一致

### 推奨アクション（優先順位順）

1. **即座に**: HybridExtension関連のビルドエラーを解消（Phase 1）
2. **短期**: 選択肢Bを採用してmarketplace.tsに統一（Phase 2-3）
3. **中期**: 複数バージョン対応UIの実装（Phase 3-4）

### HybridExtension.tsについての最終判断

**結論**: ❌ **不要、削除を推奨**

**理由**:

- サーバー側は既にExtensionItemV2で実装済み
- marketplace.tsで同等の型定義が存在
- 中間層を追加すると複雑性が増すだけ
- 直接ExtensionItemV2を使用する方がシンプルで保守しやすい

**代替案**:

- ExtensionItemV2をベースとした統一データフロー
- バージョン展開が必要な場合は、marketplace.tsのユーティリティ関数を使用
  - `flattenExtensionVersions()`
  - `getLatestVersion()`

---

## 10. 次のアクション

### 開発者への質問

1. HybridExtension関連の削除で問題ないか？
2. 選択肢A（作成）vs 選択肢B（削除）どちらを選ぶか？
3. 既存のインストール済み拡張機能との互換性をどう保つか？

### 実装前の確認事項

- [ ] ExtensionCatalogProviderの実装状況確認
- [ ] インストール済み拡張機能のストレージ形式確認
- [ ] バージョン選択UIの設計レビュー
- [ ] APIエンドポイントの動作確認
