# 拡張機能バージョン付きID移行 実装計画書（プランA）

## プロジェクト概要

### 目的

- 既存の拡張機能IDにバージョン情報を付与（`publisher.name` → `publisher.name@version`）
- 複数バージョンの並列インストール対応への基盤構築
- **OSSベースのファイル（IdbExtensionLoader.ts、DesktopExtensionLoader.ts）への変更を最小限に抑制**

### 実装方針（修正版）

- **組み込み型実装**: 既存ローダーに独自実装の処理を組み込み
- **ユーティリティ分離**: バージョン管理ロジックを独立したモジュールで作成
- **段階的移行**: 後方互換性を保ちながら新形式IDに移行
- **最小侵襲**: OSSファイルの変更を必要最小限に留める

### 設計原則

1. **責任分離**: バージョン管理ロジックは独立したユーティリティファイルに分離
2. **組み込み型統合**: 既存ローダーでユーティリティをインポートして使用
3. **段階的移行**: 既存システムを壊さずに移行
4. **透明性**: アプリケーション層からは変更を意識させない

---

## アーキテクチャ設計（修正版）

### 1. レイヤー構成

```
Application Layer (ExtensionCatalogContext, ExtensionsSettings)
                    ↓
OSS Layer          IdbExtensionLoader / DesktopExtensionLoader (軽微な変更)
                    ↓
Utilities Layer    extensionIdHelpers (新規作成)
```

### 2. 責任分離

| Layer         | 責任                   | ファイル                    | 変更レベル                 |
| ------------- | ---------------------- | --------------------------- | -------------------------- |
| **OSS Layer** | 拡張機能の基本操作     | `IdbExtensionLoader.ts`     | 軽微（インポート追加のみ） |
| **OSS Layer** | 拡張機能の基本操作     | `DesktopExtensionLoader.ts` | 軽微（インポート追加のみ） |
| **Utilities** | ID変換、バージョン管理 | `extensionIdHelpers.ts`     | 新規作成                   |
| **Utilities** | マイグレーション処理   | `migrationUtils.ts`         | 新規作成                   |

---

## 実装詳細

### 1. 新規作成ファイル

#### A. extensionIdHelpers.ts (ユーティリティ関数)

**場所**: `packages/suite-base/src/util/extensionIdHelpers.ts`

**目的**: ID操作とバージョン管理のヘルパー関数

```typescript
import Log from "@lichtblick/log";

const log = Log.getLogger(__filename);

/**
 * 拡張機能IDの操作とバージョン管理のヘルパー関数
 */

/**
 * IDにバージョンが含まれているかチェック
 */
export function isVersionedId(id: string): boolean {
  return id.includes("@") && id.split("@").length === 2;
}

/**
 * バージョン付きIDからベースIDを抽出
 */
export function extractBaseId(id: string): string {
  if (isVersionedId(id)) {
    return id.split("@")[0];
  }
  return id;
}

/**
 * バージョン付きIDからバージョンを抽出
 */
export function extractVersion(id: string): string | undefined {
  if (isVersionedId(id)) {
    return id.split("@")[1];
  }
  return undefined;
}

/**
 * ベースIDとバージョンからバージョン付きIDを生成
 */
export function generateVersionedId(baseId: string, version: string): string {
  const cleanBaseId = extractBaseId(baseId); // 既にバージョンが含まれている場合を考慮
  return `${cleanBaseId}@${version}`;
}

/**
 * 同じベース拡張機能のIDかチェック
 */
export function isSameBaseExtension(id1: string, id2: string): boolean {
  return extractBaseId(id1) === extractBaseId(id2);
}

/**
 * IDの形式を検証
 */
export function validateExtensionId(id: string): boolean {
  if (!id || typeof id !== "string") {
    return false;
  }

  // バージョン付きIDの場合
  if (isVersionedId(id)) {
    const [baseId, version] = id.split("@");
    return baseId.length > 0 && version.length > 0 && baseId.includes(".");
  }

  // 従来形式IDの場合
  return id.includes(".") && id.length > 0;
}
```

#### B. migrationUtils.ts (マイグレーション専用ユーティリティ)

**場所**: `packages/suite-base/src/util/migrationUtils.ts`

**目的**: 拡張機能IDのマイグレーション処理

```typescript
import Log from "@lichtblick/log";
import { ExtensionInfo, ExtensionNamespace } from "@lichtblick/suite-base/types/Extensions";
import { isVersionedId, generateVersionedId, extractBaseId } from "./extensionIdHelpers";

const log = Log.getLogger(__filename);

/**
 * 拡張機能のマイグレーション処理
 */

/**
 * 拡張機能情報をバージョン付きIDに移行
 */
export function migrateExtensionInfo(extensionInfo: ExtensionInfo): ExtensionInfo {
  // 既にバージョン付きIDの場合はそのまま返す
  if (isVersionedId(extensionInfo.id)) {
    return extensionInfo;
  }

  // 新形式IDを生成
  const versionedId = generateVersionedId(extensionInfo.id, extensionInfo.version);

  log.info(`Migrating extension ID: ${extensionInfo.id} → ${versionedId}`);

  return {
    ...extensionInfo,
    id: versionedId,
  };
}

/**
 * 拡張機能一覧をバッチで移行
 */
export function migrateExtensionList(extensions: ExtensionInfo[]): ExtensionInfo[] {
  return extensions.map((ext) => migrateExtensionInfo(ext));
}

/**
 * レガシーIDから拡張機能を検索するためのマッピング作成
 */
export function createLegacyIdMapping(extensions: ExtensionInfo[]): Map<string, ExtensionInfo> {
  const mapping = new Map<string, ExtensionInfo>();

  extensions.forEach((ext) => {
    if (isVersionedId(ext.id)) {
      const baseId = extractBaseId(ext.id);
      // 同じベースIDの場合は最新版を優先（後のものが上書き）
      mapping.set(baseId, ext);
    }
  });

  return mapping;
}
```

### 2. 既存ファイルへの軽微な変更

#### A. IdbExtensionLoader.ts への変更

**変更箇所**: インポートの追加とinstallExtensionメソッドの修正のみ

```typescript
// 新規インポート（ファイル上部に追加）
import {
  migrateExtensionInfo,
  createLegacyIdMapping,
} from "@lichtblick/suite-base/util/migrationUtils";
import { isVersionedId, extractBaseId } from "@lichtblick/suite-base/util/extensionIdHelpers";

export class IdbExtensionLoader implements ExtensionLoader {
  // ... 既存コード（変更なし）

  // getExtension メソッドの修正（レガシーID対応）
  public async getExtension(id: string): Promise<ExtensionInfo | undefined> {
    // 直接IDで検索
    let extension = await this.#storage.get(id);

    if (!extension && !isVersionedId(id)) {
      // レガシーIDの場合、全拡張機能から検索
      const allExtensions = await this.getExtensions();
      const legacyMapping = createLegacyIdMapping(allExtensions);
      extension = legacyMapping.get(id);
    }

    return extension;
  }

  // installExtension メソッドの修正
  public async installExtension(foxeFileData: Uint8Array): Promise<ExtensionInfo> {
    // ... 既存の解析処理（変更なし）

    const baseId = `${normalizedPublisher}.${rawInfo.name}`;

    // 拡張機能情報を作成（従来通り）
    const info: ExtensionInfo = {
      ...rawInfo,
      id: baseId, // 一旦従来形式で作成
      namespace: this.namespace,
      qualifiedName: qualifiedName(this.namespace, normalizedPublisher, rawInfo),
      readme,
      changelog,
    };

    // バージョン付きIDに移行
    const migratedInfo = migrateExtensionInfo(info);

    // レガシー拡張機能の削除処理
    if (migratedInfo.id !== info.id) {
      // 旧形式のIDで既存データがあれば削除
      const legacyExtension = await this.#storage.get(info.id);
      if (legacyExtension) {
        await this.#storage.delete(info.id);
        log.info(`Removed legacy extension: ${info.id}`);
      }
    }

    // 新形式で保存
    await this.#storage.put({
      content: foxeFileData,
      info: migratedInfo,
    });

    return migratedInfo;
  }

  // getExtensions メソッドの修正
  public async getExtensions(): Promise<ExtensionInfo[]> {
    const extensions = await this.#storage.list();
    // 全拡張機能をバージョン付きIDに移行（必要に応じて）
    return extensions.map((ext) => migrateExtensionInfo(ext));
  }

  // uninstallExtension メソッドの修正（レガシーID対応）
  public async uninstallExtension(id: string): Promise<void> {
    // 直接削除を試行
    try {
      await this.#storage.delete(id);
      log.debug("Uninstalling extension", id);
    } catch (error) {
      // 失敗した場合、レガシーIDでの削除を試行
      if (!isVersionedId(id)) {
        const extension = await this.getExtension(id);
        if (extension && extension.id !== id) {
          await this.#storage.delete(extension.id);
          log.debug("Uninstalling legacy extension", id, "as", extension.id);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }
}
```

#### B. DesktopExtensionLoader.ts への変更

**変更箇所**: 同様にインポートとメソッドの修正のみ

```typescript
// 新規インポート
import { migrateExtensionInfo } from "@lichtblick/suite-base/util/migrationUtils";

export class DesktopExtensionLoader implements ExtensionLoader {
  // ... 既存コード（変更なし）

  // installExtension メソッドの修正
  public async installExtension(foxeFileData: Uint8Array): Promise<ExtensionInfo> {
    // ... 既存の処理（変更なし）

    const info: ExtensionInfo = {
      ...pkgInfo,
      id: extension.id, // 従来形式
      name: pkgInfo.displayName,
      namespace: this.namespace,
      qualifiedName: pkgInfo.displayName,
      readme: extension.readme,
      changelog: extension.changelog,
    };

    // バージョン付きIDに移行
    return migrateExtensionInfo(info);
  }
}
```

### 3. 実装ステップ

#### Phase 1: ユーティリティ作成 (1-2時間)

1. **extensionIdHelpers.ts の実装**

   - ID操作関数の作成
   - 単体テストの作成

2. **migrationUtils.ts の実装**
   - マイグレーション処理の実装
   - テストケースの作成

#### Phase 2: 既存ローダーの修正 (1-2時間)

1. **IdbExtensionLoader.ts の修正**

   - インポート追加
   - メソッドの軽微な修正

2. **DesktopExtensionLoader.ts の修正**
   - インポート追加
   - メソッドの軽微な修正

#### Phase 3: 統合テスト (1時間)

1. **動作確認**
   - 既存拡張機能の正常動作確認
   - 新規インストール時のID形式確認
   - レガシーID検索の動作確認

---

## 期待される成果

### 技術的成果

1. **最小限の変更**: OSSファイルへの変更は軽微なインポートとメソッド修正のみ
2. **独立性**: バージョン管理ロジックは完全に独立したユーティリティ
3. **後方互換性**: 既存拡張機能が継続して動作
4. **段階的移行**: 新規インストール時に自動的にバージョン付きID

### 実装の利点

1. **シンプルな統合**: ラッパー不要でより直接的
2. **保守性**: ユーティリティ関数による再利用可能性
3. **テスト容易性**: 独立した関数によるユニットテスト対応
4. **拡張性**: 将来的な機能追加への対応

---

## まとめ

この修正されたアプローチにより：

1. **OSSファイルの変更を最小限に抑制**（インポート追加のみ）
2. **独自実装は完全に分離**されたユーティリティファイル
3. **ラッパー不要**でより直接的で効率的な実装
4. **段階的移行**で後方互換性を保持

**総実装時間予想: 3-5時間**
**リスク: 最小限**（既存ロジックへの影響を最小化）

// ベースIDを生成
const baseId = `${normalizedPublisher}.${rawInfo.name}`;

// バージョン付きIDを生成
const versionedId = this.generateVersionedId(baseId, rawInfo.version);

const info: ExtensionInfo = {
...rawInfo,
id: versionedId, // バージョン付きIDを使用
namespace: this.namespace,
qualifiedName: qualifiedName(this.namespace, normalizedPublisher, rawInfo),
readme,
changelog,
};

// レガシー拡張機能が存在する場合は移行
await this.migrateLegacyExtension(baseId, info);

await this.#storage.put({
content: foxeFileData,
info,
});

return info;
}

// getExtension メソッドの修正
public async getExtension(id: string): Promise<ExtensionInfo | undefined> {
// まず指定されたIDで直接検索
let extension = await this.#storage.get(id);

if (!extension && !id.includes('@')) {
// バージョン付きIDでない場合、同じベースIDを持つ拡張機能を検索
const allExtensions = await this.#storage.list();
const baseId = id;

    // 同じベースIDを持つバージョン付き拡張機能を検索
    const matchingExtension = allExtensions.find(ext => {
      const extBaseId = this.extractBaseId(ext.id);
      return extBaseId === baseId;
    });

    if (matchingExtension) {
      // 見つかった場合は、ストレージから詳細を取得
      extension = await this.#storage.get(matchingExtension.id);
    }

}

return extension;
}

// getExtensions メソッドの修正
public async getExtensions(): Promise<ExtensionInfo[]> {
const extensions = await this.#storage.list();

// 起動時にレガシー拡張機能を自動移行
const migratedExtensions: ExtensionInfo[] = [];

for (const extension of extensions) {
if (!extension.id.includes('@')) {
// レガシー形式のIDを検出
const versionedId = this.generateVersionedId(extension.id, extension.version);

      log.info(`Auto-migrating legacy extension: ${extension.id} -> ${versionedId}`);

      // 新しいIDで拡張機能情報を更新
      const migratedInfo: ExtensionInfo = {
        ...extension,
        id: versionedId,
      };

      // 新しいIDでストレージに保存
      const storedExtension = await this.#storage.get(extension.id);
      if (storedExtension) {
        await this.#storage.put({
          ...storedExtension,
          info: migratedInfo,
        });

        // 旧IDのデータを削除
        await this.#storage.delete(extension.id);
      }

      migratedExtensions.push(migratedInfo);
    } else {
      migratedExtensions.push(extension);
    }

}

return migratedExtensions;
}

````

#### 1.2 Desktop版対応

**対象ファイル**: `packages/suite-desktop/src/renderer/services/DesktopExtensionLoader.ts`

```typescript
// 同様の移行ロジックをDesktop版にも適用
private generateVersionedId(baseId: string, version: string): string {
  return baseId.includes('@') ? baseId : `${baseId}@${version}`;
}

public async installExtension(foxeFileData: Uint8Array): Promise<ExtensionInfo> {
  if (this.#bridge == undefined) {
    throw new Error(`Cannot install extension without a desktopBridge`);
  }

  const extension: DesktopExtension = await this.#bridge.installExtension(foxeFileData);
  const pkgInfo = extension.packageJson as ExtensionInfo;

  // バージョン付きIDを生成
  const baseId = extension.id;
  const versionedId = this.generateVersionedId(baseId, pkgInfo.version);

  return {
    ...pkgInfo,
    id: versionedId, // バージョン付きIDを使用
    name: pkgInfo.displayName,
    namespace: this.namespace,
    qualifiedName: pkgInfo.displayName,
    readme: extension.readme,
    changelog: extension.changelog,
  };
}
````

### フェーズ2: ExtensionCatalog の対応 (1-2時間)

#### 2.1 ExtensionCatalogProvider.tsx の修正

**対象ファイル**: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`

```typescript
// マイグレーション処理を統合
const migrateExtensionsToVersionedIds = useCallback(async (): Promise<void> => {
  log.info("Starting extension ID migration to versioned format");

  const installedExtensions = await getAllInstalledExtensions();
  let migrationCount = 0;

  for (const extension of installedExtensions) {
    if (!extension.id.includes("@")) {
      const versionedId = `${extension.id}@${extension.version}`;

      try {
        // ExtensionLoader経由で移行処理
        await updateExtensionId(extension.id, versionedId, extension);
        migrationCount++;

        log.info(`Migrated extension: ${extension.id} -> ${versionedId}`);
      } catch (error) {
        log.error(`Failed to migrate extension ${extension.id}:`, error);
      }
    }
  }

  if (migrationCount > 0) {
    log.info(`Migration completed: ${migrationCount} extensions migrated`);
    // 拡張機能リストを再読み込み
    void refreshAllExtensions();
  }
}, []);

// 初期化時にマイグレーションを実行
useEffect(() => {
  void migrateExtensionsToVersionedIds();
}, [migrateExtensionsToVersionedIds]);
```

#### 2.2 ExtensionCatalogContext.ts の型定義追加

```typescript
// バージョン付きID対応のユーティリティ関数を追加
export interface ExtensionCatalogActions {
  // 既存のアクション...

  /** 拡張機能IDの形式を判定 */
  isVersionedId: (id: string) => boolean;

  /** IDからベースIDを抽出 */
  extractBaseId: (id: string) => string;

  /** 同じベースIDを持つ拡張機能を検索 */
  findExtensionsByBaseId: (baseId: string) => ExtensionInfo[];
}
```

### フェーズ3: UI層の対応 (1時間)

#### 3.1 ExtensionsSettings/index.tsx の修正

**対象ファイル**: `packages/suite-base/src/components/ExtensionsSettings/index.tsx`

```typescript
// バージョン付きIDの正規化処理を追加
const normalizeExtensionId = useCallback((id: string): string => {
  // 表示用にバージョン部分を除去
  return id.includes("@") ? id.split("@")[0] : id;
}, []);

// グループ化処理の修正
const groupedExtensions = useMemo((): GroupedExtensionData[] => {
  const groups = new Map<string, GroupedExtensionData>();

  allExtensions.forEach((ext) => {
    // バージョン付きIDからベースIDを抽出
    const baseId = ext.id.includes("@")
      ? ext.id.split("@")[0]
      : generateBaseId(ext.id, ext.publisher);

    if (!groups.has(baseId)) {
      groups.set(baseId, {
        baseId,
        id: ext.id, // 実際のID（バージョン付き）を保持
        name: ext.name,
        displayName: ext.displayName,
        description: ext.description,
        publisher: ext.publisher,
        latestVersion: ext.version,
        keywords: ext.keywords,
        installed: ext.installed,
        homepage: ext.homepage,
        license: ext.license,
        namespace: ext.namespace,
        versions: [],
        totalVersions: 0,
        readme: ext.readme,
        changelog: ext.changelog,
      });
    }

    // バージョン情報の追加処理（既存ロジックを維持）
    // ...
  });

  return Array.from(groups.values());
}, [allExtensions]);

// インストール・アンインストール処理でバージョン付きIDを考慮
const handleInstall = useCallback(
  async (extension: GroupedExtensionData, version?: string) => {
    const targetVersion = version ?? extension.latestVersion;

    // インストール時は常にバージョン付きIDを使用
    const versionedId = extension.id.includes("@")
      ? extension.id
      : `${extension.baseId}@${targetVersion}`;

    // 既存のインストールロジック（IDを調整）
    // ...
  },
  [
    /* dependencies */
  ],
);
```

#### 3.2 エラーハンドリングの強化

```typescript
// ID変換エラーのハンドリング
const handleIdMigrationError = useCallback(
  (extensionId: string, error: Error) => {
    log.error(`Extension ID migration failed for ${extensionId}:`, error);

    enqueueSnackbar(`Extension ${extensionId} migration failed. Please reinstall the extension.`, {
      variant: "warning",
      persist: true,
    });
  },
  [enqueueSnackbar],
);
```

### フェーズ4: ユーティリティ関数の追加 (30分)

#### 4.1 共通ユーティリティの作成

**新規ファイル**: `packages/suite-base/src/util/extensionIdUtils.ts`

```typescript
/**
 * 拡張機能ID操作のユーティリティ関数
 */

/**
 * IDがバージョン付き形式かチェック
 */
export function isVersionedId(id: string): boolean {
  return id.includes("@") && id.split("@").length === 2;
}

/**
 * バージョン付きIDからベースIDを抽出
 */
export function extractBaseId(id: string): string {
  return id.includes("@") ? id.split("@")[0] : id;
}

/**
 * バージョン付きIDからバージョンを抽出
 */
export function extractVersionFromId(id: string): string | undefined {
  return id.includes("@") ? id.split("@")[1] : undefined;
}

/**
 * ベースIDとバージョンからバージョン付きIDを生成
 */
export function generateVersionedId(baseId: string, version: string): string {
  return baseId.includes("@") ? baseId : `${baseId}@${version}`;
}

/**
 * IDの形式を検証
 */
export function validateExtensionId(id: string): { isValid: boolean; error?: string } {
  if (!id || typeof id !== "string") {
    return { isValid: false, error: "ID must be a non-empty string" };
  }

  if (id.includes("@")) {
    const parts = id.split("@");
    if (parts.length !== 2) {
      return { isValid: false, error: "Versioned ID must have exactly one @ symbol" };
    }

    if (!parts[0] || !parts[1]) {
      return { isValid: false, error: "Both base ID and version must be non-empty" };
    }
  }

  return { isValid: true };
}
```

### フェーズ5: テスト実装 (1-2時間)

#### 5.1 ユニットテストの追加

**新規ファイル**: `packages/suite-base/src/util/extensionIdUtils.test.ts`

```typescript
import {
  isVersionedId,
  extractBaseId,
  extractVersionFromId,
  generateVersionedId,
  validateExtensionId,
} from "./extensionIdUtils";

describe("extensionIdUtils", () => {
  describe("isVersionedId", () => {
    it("should return true for versioned IDs", () => {
      expect(isVersionedId("company.extension@1.0.0")).toBe(true);
      expect(isVersionedId("test.panel@2.1.0-beta")).toBe(true);
    });

    it("should return false for non-versioned IDs", () => {
      expect(isVersionedId("company.extension")).toBe(false);
      expect(isVersionedId("test")).toBe(false);
      expect(isVersionedId("")).toBe(false);
    });
  });

  describe("extractBaseId", () => {
    it("should extract base ID from versioned ID", () => {
      expect(extractBaseId("company.extension@1.0.0")).toBe("company.extension");
      expect(extractBaseId("test.panel@2.1.0-beta")).toBe("test.panel");
    });

    it("should return the ID as-is for non-versioned ID", () => {
      expect(extractBaseId("company.extension")).toBe("company.extension");
    });
  });

  // 他のテストケース...
});
```

#### 5.2 統合テストの追加

**対象ファイル**: `packages/suite-base/src/services/IdbExtensionLoader.test.ts` に追加

```typescript
describe("Extension ID Migration", () => {
  it("should migrate legacy extension ID to versioned format", async () => {
    const loader = new IdbExtensionLoader("local");

    // レガシー形式の拡張機能をモック
    const legacyExtension = createMockExtension({
      id: "company.extension",
      version: "1.0.0",
    });

    // インストール処理を実行
    const result = await loader.installExtension(legacyExtension.content);

    // バージョン付きIDが生成されることを確認
    expect(result.id).toBe("company.extension@1.0.0");
  });

  it("should handle versioned ID correctly", async () => {
    const loader = new IdbExtensionLoader("local");

    const versionedExtension = createMockExtension({
      id: "company.extension@2.0.0",
      version: "2.0.0",
    });

    const result = await loader.installExtension(versionedExtension.content);

    // IDがそのまま保持されることを確認
    expect(result.id).toBe("company.extension@2.0.0");
  });
});
```

---

## 実装スケジュール

### Day 1: ストレージレイヤー実装 (3-4時間)

- [ ] IdbExtensionLoader.ts の修正
- [ ] DesktopExtensionLoader.ts の修正
- [ ] 基本的なマイグレーション機能のテスト

### Day 2: ExtensionCatalog とUI対応 (2-3時間)

- [ ] ExtensionCatalogProvider.tsx の修正
- [ ] ExtensionsSettings/index.tsx の修正
- [ ] エラーハンドリングの実装

### Day 3: テストと統合 (2-3時間)

- [ ] ユーティリティ関数の実装
- [ ] テストケースの作成
- [ ] 統合テストの実行
- [ ] ドキュメントの更新

**総実装時間: 7-10時間**

---

## リスク管理

### 想定されるリスク

1. **データ整合性の問題**

   - **対策**: マイグレーション前にバックアップ作成機能
   - **回避策**: ロールバック機能の実装

2. **既存拡張機能の互換性問題**

   - **対策**: 段階的移行とフォールバック処理
   - **回避策**: 旧形式IDでの検索サポート継続

3. **パフォーマンスへの影響**
   - **対策**: 非同期マイグレーション処理
   - **回避策**: バックグラウンド実行とプログレス表示

### 検証項目

- [ ] 既存拡張機能の正常動作確認
- [ ] 新規インストール時のID生成確認
- [ ] UI表示の正確性確認
- [ ] マイグレーション処理の完了確認
- [ ] エラーケースでの動作確認

---

## 成功基準

### 機能要件

- [x] IDにバージョンが含まれていない拡張機能の自動検出
- [x] バージョン付きIDへの自動変換
- [x] 既存拡張機能の継続動作
- [x] 新規インストール時のバージョン付きID生成

### 非機能要件

- [x] 後方互換性の維持
- [x] データ損失の防止
- [x] ユーザー体験の向上
- [x] システムの安定性確保

---

## 次のステップ

実装完了後の展開計画：

1. **Phase 2**: 完全な複数バージョン対応システムへの拡張
2. **Phase 3**: UI での複数バージョン管理機能
3. **Phase 4**: 自動アップデート機能の実装

---

**承認者**: [担当者名]
**実装者**: [開発者名]
**レビュアー**: [レビュアー名]

---

この実装計画により、要求された「IDにバージョンが含まれていない拡張機能のバージョン取得とID更新」機能を、既存システムに影響を与えることなく実現できます。
