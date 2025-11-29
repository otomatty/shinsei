# ID操作ユーティリティの重複問題

**発見日**: 2025年10月14日
**発見場所**: マーケットプレイス機能のコードレビュー中
**重要度**: 🔴 High
**ステータス**: ✅ 解決済み (2025年10月14日)

---

## 問題の詳細

### 影響範囲

以下の3つのファイルで、Extension IDの操作機能が重複して実装されていました:

1. `packages/suite-base/src/services/extension/IdbExtensionStorageMigration.ts`
2. `packages/suite-base/src/util/marketplace/extensionIdHelpers.ts`
3. `packages/suite-base/src/components/shared/Marketplace/utils/version/versionIdentifier.ts`

### 重複していた機能

```typescript
// ファイル1: IdbExtensionStorageMigration.ts
export function extractBaseId(versionedId: string): string {
  if (versionedId.includes("@")) {
    const parts = versionedId.split("@");
    return parts[0] ?? versionedId;
  }
  return versionedId;
}

export function toV2Id(baseId: string, version: string): string {
  return `${baseId}@${version}`;
}

// ファイル2: extensionIdHelpers.ts
export function extractBaseId(id: string): string {
  if (isVersionedId(id)) {
    const parts = id.split("@");
    return parts[0] ?? id;
  }
  return id;
}

export function generateVersionedId(baseId: string, version: string): string {
  const cleanBaseId = extractBaseId(baseId);
  return `${cleanBaseId}@${version}`;
}

// ファイル3: versionIdentifier.ts
export function generateBaseId(id: string, publisher: string): string {
  const baseId = id.replace(/(@[\d.]+.*)?$/, "");
  return `${publisher}.${baseId}`;
}
```

### なぜ問題か

1. **保守性の低下**

   - 同じロジックを3箇所で修正する必要がある
   - 変更漏れによるバグのリスク

2. **一貫性の欠如**

   - 微妙に異なる実装（`split("@")`と`indexOf("@")`）
   - テストやデバッグが複雑化

3. **学習コストの増加**
   - どの関数を使うべきか判断が難しい
   - 新しい開発者の混乱を招く

---

## 解決方法

### 実装内容

統一された`ExtensionIdUtils`クラスを作成:

**新規ファイル**: `packages/suite-base/src/util/ExtensionIdUtils.ts`

```typescript
export class ExtensionIdUtils {
  /**
   * Check if ID is in versioned format
   * @example ExtensionIdUtils.isVersioned("publisher.name@1.0.0") // → true
   */
  static isVersioned(id: string): boolean {
    return id.includes("@") && id.split("@").length === 2;
  }

  /**
   * Extract base ID from potentially versioned ID
   * @example ExtensionIdUtils.extractBaseId("publisher.name@1.0.0") // → "publisher.name"
   */
  static extractBaseId(id: string): string {
    const atIndex = id.indexOf("@");
    if (atIndex === -1) {
      return id;
    }
    return id.substring(0, atIndex);
  }

  /**
   * Extract version from versioned ID
   * @example ExtensionIdUtils.extractVersion("publisher.name@1.0.0") // → "1.0.0"
   */
  static extractVersion(id: string): string | undefined {
    const atIndex = id.indexOf("@");
    if (atIndex === -1) {
      return undefined;
    }
    return id.substring(atIndex + 1);
  }

  /**
   * Create versioned ID from base ID and version
   * @example ExtensionIdUtils.toVersionedId("publisher.name", "1.0.0") // → "publisher.name@1.0.0"
   */
  static toVersionedId(baseId: string, version: string): string {
    const cleanBaseId = this.extractBaseId(baseId);
    return `${cleanBaseId}@${version}`;
  }

  /**
   * Check if two IDs refer to the same base extension
   */
  static isSameBaseExtension(id1: string, id2: string): boolean {
    return this.extractBaseId(id1) === this.extractBaseId(id2);
  }

  /**
   * Generate base ID with publisher prefix
   * @example ExtensionIdUtils.withPublisher("my-extension", "acme") // → "acme.my-extension"
   */
  static withPublisher(name: string, publisher: string): string {
    const cleanName = name.replace(/(@[\d.]+.*)?$/, "");
    return `${publisher}.${cleanName}`;
  }

  /**
   * Validate extension ID format
   */
  static validate(id: string): boolean {
    if (!id || typeof id !== "string" || id.length === 0) {
      return false;
    }

    if (this.isVersioned(id)) {
      const baseId = this.extractBaseId(id);
      const version = this.extractVersion(id);
      return (
        baseId.length > 0 && baseId.includes(".") && version != undefined && version.length > 0
      );
    }

    return id.includes(".") && id.length > 0;
  }

  /**
   * Debug: Log detailed ID information
   */
  static debug(id: string): void {
    log.debug("Extension ID Debug:", {
      id,
      isVersioned: this.isVersioned(id),
      baseId: this.extractBaseId(id),
      version: this.extractVersion(id),
      isValid: this.validate(id),
    });
  }
}
```

### 既存コードの更新

3つのファイルを`ExtensionIdUtils`を使用するように更新し、既存の関数には`@deprecated`マークを追加して後方互換性を維持しました。

---

## 影響と効果

### Before

- ✅ コード重複: **3箇所**
- ❌ バグ修正コスト: **3倍**
- ❌ 一貫性: **微妙に異なる実装**

### After

- ✅ コード重複: **1箇所**
- ✅ バグ修正コスト: **1倍**
- ✅ 一貫性: **統一されたAPI**
- ✅ 後方互換性: **維持（@deprecated）**

---

## 変更ファイル

- ✅ `packages/suite-base/src/util/ExtensionIdUtils.ts` (新規作成)
- ✅ `packages/suite-base/src/services/extension/IdbExtensionStorageMigration.ts`
- ✅ `packages/suite-base/src/util/marketplace/extensionIdHelpers.ts`
- ✅ `packages/suite-base/src/components/shared/Marketplace/utils/version/versionIdentifier.ts`

---

## 学んだこと

1. **DRY原則の重要性**

   - コードの重複は初期段階で発見し、統一すべき
   - ユーティリティ関数は一箇所に集約する

2. **段階的な移行戦略**

   - `@deprecated`マークで既存コードとの互換性を維持
   - プロキシパターンで段階的な移行を可能に

3. **ドキュメントの重要性**
   - JSDocコメントで使用例を提供
   - 移行ガイドを明記

---

## 次のアクション

- [ ] 既存コードで`@deprecated`関数を使用している箇所を新しいAPIに移行
- [ ] `ExtensionIdUtils`のユニットテスト作成
- [ ] 他の箇所で同様の重複がないか確認

---

**解決日**: 2025年10月14日
**解決者**: GitHub Copilot
**関連作業ログ**: [20251014_03_marketplace-code-quality-improvements.md](../../../08_worklogs/2025_10/20251014/20251014_03_marketplace-code-quality-improvements.md)
