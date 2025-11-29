# 重複する getLatestVersion 関数の実装

**発見日**: 2025-10-15
**カテゴリ**: Code Quality / Duplication
**重要度**: Medium
**ステータス**: Open

## 問題の概要

`getLatestVersion` という同名の関数が3箇所に存在しており、それぞれ異なる目的と実装を持っています。このうち1つは全く使用されておらず、デッドコードとなっています。

## 発見場所

### 1. `marketplace.ts` の `getLatestVersion` ❌ **未使用 (削除対象)**

**ファイルパス**: `packages/suite-base/src/types/marketplace.ts`

```typescript
/**
 * Get only the latest version (determined by publishedDate)
 */
export function getLatestVersion(extension: ExtensionItem): ExtensionVersion | undefined {
  const versions = Object.values(extension.versions);
  if (versions.length === 0) {
    return undefined;
  }

  // Sort by publishedDate in descending order
  const latestVersionDetail = versions.sort(
    (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime(),
  )[0];

  // ...
}
```

**引数**: `ExtensionItem` (単一の拡張機能オブジェクト)
**戻り値**: `ExtensionVersion | undefined`
**判定基準**: `publishedDate` (公開日時)
**使用状況**: ❌ **どこからも呼び出されていない**

### 2. `versionDisplay.ts` の `getLatestVersion` ✅ **使用中 (保持)**

**ファイルパス**: `packages/suite-base/src/components/shared/Marketplace/utils/version/versionDisplay.ts`

```typescript
/**
 * Get the latest version from a list of versions
 * @param versions - Array of version strings
 * @returns Latest version string
 */
export function getLatestVersion(versions: string[]): string {
  if (versions.length === 0) {
    return "1.0.0";
  }

  return versions.reduce((latest, current) => {
    return compareVersions(normalizeVersion(current), normalizeVersion(latest)) > 0
      ? current
      : latest;
  });
}
```

**引数**: `string[]` (バージョン文字列の配列)
**戻り値**: `string` (最新バージョン文字列)
**判定基準**: セマンティックバージョニング (compareVersions)
**使用状況**: ✅ `Marketplace/utils/version/index.ts` からエクスポートされている

### 3. `VersionManager.ts` の `getLatestVersion` ✅ **使用中 (保持)**

**ファイルパス**: `packages/suite-base/src/services/extensions/VersionManager.ts`

```typescript
/**
 * Get latest version of extension among multiple versions
 */
public getLatestVersion(extensions: ExtensionInfo[]): ExtensionInfo | undefined {
  if (extensions.length === 0) {
    return undefined;
  }

  return extensions.reduce((latest, current) => {
    if (!latest.version || !current.version) {
      return current.version ? current : latest;
    }

    const comparison = this.compareVersions(current.version, latest.version);
    return comparison.isNewer ? current : latest;
  });
}
```

**引数**: `ExtensionInfo[]` (拡張機能情報の配列)
**戻り値**: `ExtensionInfo | undefined`
**判定基準**: セマンティックバージョニング (this.compareVersions)
**使用状況**: ✅ `IdMigrationHandler.ts` で使用されている

```typescript
// IdMigrationHandler.ts:45
const latestVersion = this.versionManager.getLatestVersion(matchingExtensions);
```

## 問題の詳細

### なぜ問題なのか

1. **混乱を招く**: 同じ名前で異なる実装が複数存在
2. **デッドコード**: `marketplace.ts` の実装は使用されておらず、メンテナンスコスト増
3. **目的の不明確さ**: どの関数を使うべきか判断しにくい
4. **型安全性の低下**: 異なる型を扱う同名関数が存在

### 影響範囲

- **デッドコード**: `marketplace.ts` の `getLatestVersion` は削除可能
- **保守性**: 不要なコードが存在することで、将来の開発者が混乱する可能性
- **テスト**: 使用されない関数に対するテストも不要

## 提案する解決策

### 1. デッドコードの削除 (優先度: High)

`packages/suite-base/src/types/marketplace.ts` から `getLatestVersion` 関数を削除:

```typescript
// 削除対象 (187-217行目)
export function getLatestVersion(extension: ExtensionItem): ExtensionVersion | undefined {
  // ...
}
```

**理由**:

- どこからも呼び出されていない
- 同様の機能は `VersionManager.getLatestVersion` で提供されている
- `publishedDate` による判定が必要な場合は、別の明確な名前の関数として実装すべき

### 2. 関数名の明確化 (優先度: Low - 将来的な改善)

もし `publishedDate` による最新版判定が将来必要になった場合:

```typescript
// 新しい明確な名前で実装
export function getLatestVersionByPublishedDate(
  extension: ExtensionItem,
): ExtensionVersion | undefined {
  // ...
}
```

### 3. 既存の2つの関数は保持

- `versionDisplay.ts` の `getLatestVersion`: UI表示用のユーティリティ
- `VersionManager.ts` の `getLatestVersion`: 拡張機能管理のビジネスロジック

これらは異なる責務を持ち、それぞれの文脈で使用されているため保持すべき。

## 実装手順

1. ✅ 使用状況の確認 (`grep_search`, `list_code_usages` で検証済み)
2. ✅ `marketplace.ts` から `getLatestVersion` 関数を削除
3. ✅ `flattenExtensionVersions` 関数も未使用か確認 → 未使用のため削除
4. ✅ TypeScript のコンパイルエラーがないことを確認 → エラーなし
5. ⬜ 既存のテストが通ることを確認
6. ⬜ このissueを `resolved` に移動

## 実施した変更

### 削除したコード

**ファイル**: `packages/suite-base/src/types/marketplace.ts`

1. **`flattenExtensionVersions` 関数** (165-186行目) - 削除

   - 理由: どこからも呼び出されていない
   - 機能: ExtensionItemを個別バージョン情報の配列に展開

2. **`getLatestVersion` 関数** (188-217行目) - 削除
   - 理由: どこからも呼び出されていない
   - 機能: publishedDateで最新バージョンを取得

### 削除後の状態

- TypeScriptのコンパイルエラー: なし
- 残存する`getLatestVersion`実装:
  - ✅ `versionDisplay.ts`: UI表示用のユーティリティ
  - ✅ `VersionManager.ts`: 拡張機能管理のビジネスロジック

## 関連ドキュメント

- プロジェクトガイドライン: `docs/.github/copilot-instructions.md`
  - "無駄なコード・デッドコード: 使用されていないコードを発見したら必ず報告"
  - "ボーイスカウトルール: コードを見つけた時よりも良い状態で残す"

## メモ

- `flattenExtensionVersions` 関数も同じファイルに存在し、こちらも使用状況を確認する必要がある
- `services/extension/` と `services/extensions/` の重複ディレクトリ問題も別途対応が必要
