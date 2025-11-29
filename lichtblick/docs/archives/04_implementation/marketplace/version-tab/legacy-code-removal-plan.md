# Legacy関連コード削除計画書

**作成日**: 2025年10月1日
**目的**: 複数バージョン専用実装への移行に伴い、Legacy関連のコードを削除する

---

## 🎯 削除方針

マーケットプレイス機能を複数バージョン専用とするため、以下を削除します:

1. **HybridExtensionLoader** - Legacy/MultiVersion両対応のローダー
2. **extensionDataConverter** - データ変換ユーティリティ
3. **Legacy関連の型定義** - `HybridExtension.ts`内のLegacy型
4. **不要なユーティリティ** - Legacy ID処理など

**注意**: レイアウトマイグレーション関連のLegacy処理は**削除しない**（パネル移行に必要）

---

## 🗑️ 削除対象ファイル

### 完全削除

```
packages/suite-base/src/util/marketplace/
├── HybridExtensionLoader.ts          ❌ 削除
└── extensionDataConverter.ts         ❌ 削除
```

### 部分削除（型定義の整理）

```
packages/suite-base/src/types/
└── HybridExtension.ts                ⚠️ 修正（Legacy型を削除）
```

---

## 📝 削除対象コード詳細

### 1. HybridExtensionLoader.ts（完全削除）

**ファイルパス**: `packages/suite-base/src/util/marketplace/HybridExtensionLoader.ts`

**削除理由**:

- Legacy形式とMultiVersion形式の両方に対応するハイブリッドローダー
- 複数バージョン専用実装では不要
- 新規作成する`MultiVersionDataLoader`に置き換え

**影響範囲**:

- このファイルをインポートしているファイルを更新する必要あり
- 主に`ExtensionMarketplaceProvider`で使用

---

### 2. extensionDataConverter.ts（完全削除）

**ファイルパス**: `packages/suite-base/src/util/marketplace/extensionDataConverter.ts`

**削除理由**:

- Legacy形式からUnified形式への変換処理
- 複数バージョン専用実装では不要

**主な機能**:

- `convertLegacyToUnified()` - Legacy → Unified変換
- `convertMultiVersionToUnified()` - MultiVersion → Unified変換
- `detectDataStructure()` - データ構造の自動判定

**影響範囲**:

- `HybridExtensionLoader`のみで使用
- `HybridExtensionLoader`削除と同時に削除可能

---

### 3. HybridExtension.ts（部分削除）

**ファイルパス**: `packages/suite-base/src/types/HybridExtension.ts`

**削除する型**:

```typescript
// ❌ 削除対象

// Legacy Data Structure
export interface LegacyExtensionData { ... }
export type LegacyApiResponse = LegacyExtensionData[];
export type LegacyConverter = (data: LegacyExtensionData) => UnifiedExtensionData;

// Unified Data Structure（一部）
export interface UnifiedExtensionData {
  // ...
  dataSource: "legacy" | "multi-version";  // "legacy" を削除
  // ...
}
```

**保持する型**:

```typescript
// ✅ 保持

// Multi-Version Data Structure
export interface MultiVersionExtensionData { ... }
export interface VersionDetail { ... }
export interface MultiVersionApiResponse { ... }

// Loader Interface
export interface UniversalExtensionLoader { ... }

// Data Source Detection
export type DataSourceType = "multi-version" | "unknown";  // "legacy" を削除
export interface DataSourceInfo { ... }
```

---

### 4. extensionIdHelpers.ts（部分修正）

**ファイルパス**: `packages/suite-base/src/util/marketplace/extensionIdHelpers.ts`

**修正内容**:

```typescript
// 87行目付近のコメント削除または修正
// ❌ 削除
// For legacy format ID

// または
// ✅ 修正
// For backward compatibility with existing IDs
```

**理由**:

- Legacy ID処理自体は残す（既存のインストール済み拡張機能との互換性のため）
- コメントのみ修正

---

## 📋 影響を受けるファイル

### 主要な修正対象

#### 1. ExtensionMarketplaceProvider.tsx

**ファイルパス**: `packages/suite-base/src/providers/ExtensionMarketplaceProvider.tsx`

**現在の実装**:

```typescript
import { HybridExtensionLoader } from "@lichtblick/suite-base/util/marketplace/HybridExtensionLoader";

const loader = new HybridExtensionLoader({
  legacyApiUrl: "https://...",
  multiVersionApiUrl: "https://...",
});
```

**修正後**:

```typescript
import { MultiVersionDataLoader } from "@lichtblick/suite-base/util/marketplace/MultiVersionDataLoader";

const loader = new MultiVersionDataLoader({
  apiUrl: "https://api.lichtblick.io/v2/extensions",
});
```

#### 2. 型定義を参照しているファイル

**検索対象**:

- `LegacyExtensionData`をインポートしているファイル
- `UnifiedExtensionData`を使用しているファイル

**修正方針**:

- `UnifiedExtensionData` → `MultiVersionExtensionData`に置き換え
- または削除して`ExtensionInfo`を直接使用

---

## 🔄 置き換え計画

### MultiVersionDataLoader の作成

**新規ファイル**: `packages/suite-base/src/util/marketplace/MultiVersionDataLoader.ts`

**実装内容**:

```typescript
/**
 * 複数バージョン専用のデータローダー
 * Legacy形式のサポートを削除し、シンプルで高速な実装
 */
export class MultiVersionDataLoader {
  private readonly apiUrl: string;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(config: { apiUrl: string }) {
    this.apiUrl = config.apiUrl;
  }

  /**
   * 全拡張機能を取得（最新バージョンのみ）
   */
  async getAllExtensions(): Promise<MultiVersionExtensionData[]> {
    const response = await fetch(this.apiUrl);
    const data = (await response.json()) as MultiVersionApiResponse;
    return data.extensions;
  }

  /**
   * 特定の拡張機能の全バージョンを取得
   */
  async getExtensionVersions(baseId: string): Promise<VersionDetail[]> {
    const response = await fetch(`${this.apiUrl}/${baseId}`);
    const data = (await response.json()) as MultiVersionExtensionData;
    return Object.values(data.versions);
  }

  /**
   * 特定バージョンを取得
   */
  async getExtension(baseId: string, version: string): Promise<VersionDetail | undefined> {
    const versions = await this.getExtensionVersions(baseId);
    return versions.find((v) => v.version === version);
  }

  /**
   * 最新バージョンを取得
   */
  async getLatestExtension(baseId: string): Promise<VersionDetail | undefined> {
    const response = await fetch(`${this.apiUrl}/${baseId}`);
    const data = (await response.json()) as MultiVersionExtensionData;
    return data.versions[data.latest];
  }
}
```

**特徴**:

- Legacy形式のサポートを削除
- フォールバック処理を削除
- シンプルで理解しやすいAPI
- キャッシング機能は必要に応じて実装

---

## ⚠️ 削除しないファイル（注意）

以下のファイルには`legacy`という文字列が含まれますが、**削除しません**:

### 1. migrateLayout 関連

```
packages/suite-base/src/services/migrateLayout/
├── migrateLegacyToNew3DPanels.ts      ✅ 保持
└── migrateLegacyToNewImagePanels.ts   ✅ 保持
```

**理由**:

- レイアウトのパネル移行処理に必要
- 古いLichtblickバージョンからの移行サポート
- マーケットプレイスのLegacy形式とは無関係

### 2. PlayerSelectionContext.ts

```typescript
legacyIds?: string[];  // ✅ 保持
```

**理由**:

- プレイヤー選択の互換性維持に必要
- マーケットプレイスのLegacy形式とは無関係

---

## 📋 削除手順

### Step 1: 影響範囲の確認 ✅

```bash
# HybridExtensionLoaderの使用箇所を検索
cd /Users/sugaiakimasa/apps/lichtblick
grep -r "HybridExtensionLoader" packages/suite-base/src/

# extensionDataConverterの使用箇所を検索
grep -r "extensionDataConverter" packages/suite-base/src/

# Legacy型の使用箇所を検索
grep -r "LegacyExtensionData\|LegacyApiResponse" packages/suite-base/src/
```

### Step 2: MultiVersionDataLoader の作成 ✅

- [ ] `MultiVersionDataLoader.ts`を新規作成
- [ ] 基本的なデータ取得メソッドを実装
- [ ] エラーハンドリングを実装
- [ ] 必要に応じてキャッシング機能を実装

### Step 3: ExtensionMarketplaceProvider の更新 ✅

- [ ] `HybridExtensionLoader`のインポートを削除
- [ ] `MultiVersionDataLoader`のインポートを追加
- [ ] ローダーの初期化コードを更新
- [ ] APIエンドポイントのURLを更新

### Step 4: 型定義の整理 ✅

- [ ] `HybridExtension.ts`からLegacy型を削除
- [ ] `dataSource`型から`"legacy"`を削除
- [ ] 不要になった型エイリアスを削除

### Step 5: ファイルの削除 ✅

- [ ] `HybridExtensionLoader.ts`を削除
- [ ] `extensionDataConverter.ts`を削除
- [ ] Git履歴を確認

### Step 6: 動作確認 ✅

- [ ] アプリケーションのビルドが成功することを確認
- [ ] 拡張機能一覧が正しく表示されることを確認
- [ ] エラーが発生しないことを確認

### Step 7: ドキュメント更新 ✅

- [ ] 削除ログの作成
- [ ] 関連ドキュメントの更新

---

## 🧪 テスト項目

### 削除前の確認

- [ ] 現在のマーケットプレイス機能が正常に動作している
- [ ] 拡張機能の一覧表示が正常
- [ ] 拡張機能の詳細表示が正常

### 削除後の確認

- [ ] アプリケーションがビルドできる
- [ ] マーケットプレイス機能が正常に動作する
- [ ] 拡張機能の一覧表示が正常（MultiVersion APIから取得）
- [ ] 拡張機能の詳細表示が正常
- [ ] インストール/アンインストールが正常に動作
- [ ] エラーログにLegacy関連のエラーが出ない

---

## 📊 削除による影響

### メリット ✅

1. **コードベースの簡素化**

   - 約400行のコード削除
   - 複雑な変換処理の削除
   - メンテナンスコストの削減

2. **パフォーマンス向上**

   - データ変換処理の削減
   - シンプルなデータフローによる高速化

3. **バグリスクの低減**
   - 条件分岐の削減
   - テストケースの削減

### デメリット ⚠️

1. **既存のLegacy APIとの互換性喪失**

   - Legacy形式のAPIからデータを取得できなくなる
   - 対策: MultiVersion APIのみを使用する前提で実装

2. **ロールバックの制約**
   - Legacy形式に戻す場合は再実装が必要
   - 対策: Gitのコミット履歴に残すことで復元可能

### リスク軽減策

1. **段階的な削除**

   - まず`MultiVersionDataLoader`を作成して動作確認
   - その後、Legacy関連コードを削除

2. **バックアップ**

   - 削除前にGitブランチを作成
   - 必要時にロールバック可能

3. **十分なテスト**
   - 削除後の動作確認を徹底
   - エラーログの監視

---

## ✅ 完了条件

- [ ] `HybridExtensionLoader.ts`が削除されている
- [ ] `extensionDataConverter.ts`が削除されている
- [ ] `HybridExtension.ts`からLegacy型が削除されている
- [ ] `MultiVersionDataLoader`が作成されている
- [ ] `ExtensionMarketplaceProvider`が更新されている
- [ ] アプリケーションがビルドできる
- [ ] マーケットプレイス機能が正常に動作する
- [ ] 削除ログが作成されている
- [ ] 関連ドキュメントが更新されている

---

**作成者**: GitHub Copilot
**更新履歴**:

- 2025-10-01: 初版作成 - Legacy関連コードの削除計画
