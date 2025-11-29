# バージョン正規化実装ログ

## 概要

マーケットプレイスUIでバージョン表示の不整合を修正するため、データ処理レベルでのバージョン正規化機能を実装。

**実装日**: 2025年9月28日
**対象**: マーケットプレイス拡張機能・レイアウト管理機能
**目的**: `1.0.0` と `v1.0.0` の重複バージョン問題の解決

## 問題の背景

### 発見された問題

1. **重複バージョン表示**: 同じバージョンが `1.0.0` と `v1.0.0` として別々に認識される
2. **不正確なバージョン数**: 実際は1つのバージョンなのに "2 versions available" と表示
3. **空のアコーディオン**: バージョンアコーディオンに空のセクションが表示される
4. **比較ロジックの問題**: バージョン比較で v-prefix の有無により正しく動作しない

### 根本原因

- `extensions.json` に混在するバージョン形式 (`1.0.0`, `v1.0.0`)
- データ処理時にバージョン文字列をそのまま使用
- 表示レベルでの対応では根本解決に至らない

## 実装内容

### 1. バージョンユーティリティ関数の拡張

**ファイル**: `packages/suite-base/src/util/versionUtils.ts`

#### 追加された関数

```typescript
/**
 * バージョン文字列を正規化（v-prefixを除去）
 */
export function normalizeVersion(version: string): string {
  return version.startsWith("v") ? version.slice(1) : version;
}

/**
 * 表示用のバージョン文字列をフォーマット
 */
export function formatVersionForDisplay(version: string): string {
  const normalized = normalizeVersion(version);
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}
```

#### 既存関数の修正

```typescript
export function compareVersions(a: string, b: string): number {
  // バージョン文字列を正規化してから比較
  const normalizedA = normalizeVersion(a);
  const normalizedB = normalizeVersion(b);

  // セマンティックバージョニング対応の比較ロジック
  const partsA = normalizedA.split(".").map(Number);
  const partsB = normalizedB.split(".").map(Number);

  const maxLength = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLength; i++) {
    const partA = partsA[i] ?? 0;
    const partB = partsB[i] ?? 0;

    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }

  return 0;
}
```

### 2. 拡張機能設定の正規化実装

**ファイル**: `packages/suite-base/src/components/ExtensionsSettings/index.tsx`

#### データ処理ロジックの修正

```typescript
// バージョン情報を追加（正規化してから処理）
const group = groups.get(baseId)!;
const normalizedVersion = normalizeVersion(extension.version);

// 同じ正規化バージョンが既に存在するかチェック
const existingVersion = group.versions.find(
  (v) => normalizeVersion(v.version) === normalizedVersion,
);
if (existingVersion) {
  // 既に同じバージョンが存在する場合はスキップ
  return;
}

const versionInfo: VersionInfo = {
  version: extension.version, // 元のバージョン文字列を保持（表示用）
  publishedDate: extension.updatedAt,
  isLatest: false,
  installed: installedExtensions.some((ext) => ext.id === extension.id),
};

group.versions.push(versionInfo);
group.totalVersions = group.versions.length;

// 最新バージョンかチェック（正規化バージョンで比較）
const currentLatestNormalized = normalizeVersion(group.latestVersion);
if (
  normalizedVersion === currentLatestNormalized ||
  getLatestVersion([normalizedVersion, currentLatestNormalized]) === normalizedVersion
) {
  group.latestVersion = extension.version;
  group.id = extension.id;
  group.description = extension.description;
  group.thumbnail = extension.thumbnail;
}
```

#### 最新バージョン決定の正規化

```typescript
// 各グループの最新バージョンをマーク（正規化バージョンで比較）
groups.forEach((group) => {
  const normalizedVersions = group.versions.map((v) => normalizeVersion(v.version));
  const latestNormalized = getLatestVersion(normalizedVersions);
  group.versions = sortVersions(group.versions).map((v) => ({
    ...v,
    isLatest: normalizeVersion(v.version) === latestNormalized,
  }));
});
```

### 3. レイアウト設定の正規化実装

**ファイル**: `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`

#### 同様の正規化ロジックを適用

- 拡張機能設定と同じバージョン正規化処理を実装
- レイアウト固有の処理に対応した調整
- データ処理レベルでの重複排除ロジック

### 4. インポート文の更新

各ファイルで `normalizeVersion` 関数のインポートを追加：

```typescript
import {
  normalizeVersion,
  getLatestVersion,
  sortVersions,
} from "@lichtblick/suite-base/util/versionUtils";
```

## 技術的な改善点

### 1. データ整合性の向上

- バージョン重複の排除
- 正確なバージョン数の表示
- 一貫したバージョン比較ロジック

### 2. UIの品質改善

- 空のアコーディオンセクションの解消
- 正確な「X versions available」表示
- 統一されたバージョン形式

### 3. 保守性の向上

- 中央集約されたバージョン処理ロジック
- 再利用可能なユーティリティ関数
- 明確な責任分離（データ処理 vs 表示）

## テスト観点

### 確認すべき項目

1. **バージョン重複の解消**: `1.0.0` と `v1.0.0` が1つのバージョンとして扱われる
2. **正確なカウント**: バージョン数の表示が正確になる
3. **アコーディオンの動作**: 空のセクションが表示されない
4. **最新バージョンの判定**: 正規化後のバージョンで正しく最新版が選ばれる
5. **表示の一貫性**: すべてのバージョンが統一された形式で表示される

### 確認方法

```bash
# extensions.json のバージョン形式確認
curl -s "https://raw.githubusercontent.com/foxglove/studio-extension-marketplace/main/extensions.json" | jq -r '.[] | select(.version | startswith("v")) | {name: .name, version: .version, id: .id}'
```

## 今後の改善案

### 1. パフォーマンス最適化

- バージョン正規化のメモ化
- 大量データでの処理効率化

### 2. エラーハンドリング強化

- 不正なバージョン形式への対応
- フォールバック処理の実装

### 3. テストカバレッジ

- ユニットテストの追加
- エッジケースの検証

## 実装完了日

2025年9月28日

## 関連ドキュメント

- [version-ui-plan.md](./version-ui-plan.md): マルチバージョンUI実装計画
- [unified-implementation-log.md](./unified-implementation-log.md): 統合実装ログ
- [architecture.md](./architecture.md): マーケットプレイスアーキテクチャ

## 変更ファイル一覧

- `packages/suite-base/src/util/versionUtils.ts` - バージョンユーティリティ関数拡張
- `packages/suite-base/src/components/ExtensionsSettings/index.tsx` - 拡張機能設定の正規化実装
- `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx` - レイアウト設定の正規化実装

---

**ステータス**: ✅ 実装完了
**次のステップ**: 統合テストおよびユーザー受け入れテスト
