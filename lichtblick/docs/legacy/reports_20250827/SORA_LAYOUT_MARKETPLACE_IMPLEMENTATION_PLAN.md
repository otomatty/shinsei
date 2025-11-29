# Sora レイアウトマーケットプレイス 実装計画書

## 1. プロジェクト概要

### 1.1 目標

Lichtblick Suiteから派生したSoraにおいて、タグベース分類と拡張機能依存関係を持つ複数バージョン対応の独立したレイアウトマーケットプレイスシステムを構築する。

### 1.2 実装方針

- **名前空間**: `"sora-marketplace"` で既存システムと完全独立
- **タグシステム**: 柔軟な分類のためのマルチタグ対応
- **拡張機能統合**: 必須・推奨拡張機能の依存関係管理
- **バージョン管理**: 同一レイアウトの複数バージョン並列管理
- **段階的実装**: 既存システムとの共存を保ちながら機能追加

## 2. 実装フェーズ

### Phase 1: 基盤システム構築 (3-4週間)

#### 2.1 型定義・インターフェース

**ファイル**: `packages/suite-base/src/types/SoraLayouts.ts`

```typescript
import { Layout, LayoutData, LayoutID } from "../services/ILayoutStorage";
import { SemVer } from "semver";

// Sora拡張レイアウト名前空間
export type SoraLayoutNamespace = "sora-marketplace";

// 拡張機能依存関係
export interface SoraExtensionDependency {
  required?: string[]; // 必須拡張機能（baseId形式）
  optional?: string[]; // 推奨拡張機能（baseId形式）
}

// Soraレイアウト情報
export interface SoraLayoutInfo extends Omit<Layout, "id" | "namespace"> {
  // バージョン管理
  id: string; // "publisher.name@version"
  baseId: string; // "publisher.name"
  version: string; // "1.0.0"
  semver: SemVer; // パース済みバージョン

  // マーケットプレイス情報
  namespace: SoraLayoutNamespace;
  publisher: string; // 公開者
  description?: string; // レイアウト説明
  tags?: string[]; // タグベース分類
  license?: string; // ライセンス情報
  homepage?: string; // ホームページURL

  // メタデータ
  screenshots?: string[]; // スクリーンショットURL
  readme?: string; // README URL
  changelog?: string; // CHANGELOG URL

  // 拡張機能依存関係
  extensions?: SoraExtensionDependency;

  // 管理情報
  isActive: boolean; // アクティブバージョンか
  installDate: Date; // インストール日時
  publishDate: Date; // 公開日時
}

// ストレージ用
export interface StoredSoraLayout {
  content: ArrayBuffer; // レイアウトファイル（JSON形式）
  info: SoraLayoutInfo;
}

// バージョン管理インデックス
export interface SoraLayoutVersionIndex {
  baseId: string;
  versions: Array<{
    version: string;
    id: string;
    isActive: boolean;
    installDate: Date;
    publishDate: Date;
  }>;
}

// タグインデックス
export interface SoraLayoutTagIndex {
  tag: string;
  layoutBaseIds: string[];
}

// 拡張機能依存関係インデックス
export interface SoraExtensionDependencyIndex {
  extensionBaseId: string;
  dependentLayoutBaseIds: string[];
  dependencyType: "required" | "optional";
}

// マーケットプレイス詳細情報
export interface SoraLayoutMarketplaceDetail extends SoraLayoutInfo {
  downloadUrl?: string; // ダウンロードURL
  sha256sum?: string; // ファイルハッシュ
}

// 依存関係チェック結果
export interface DependencyCheckResult {
  missing: string[]; // 不足している拡張機能
  available: string[]; // インストール可能な拡張機能
  conflicting: string[]; // 競合する拡張機能
}

// インストール結果
export interface LayoutInstallResult {
  layout: SoraLayoutInfo;
  installedExtensions: string[];
  warnings: string[];
}
```

#### 2.2 ストレージシステム実装

**ファイル**: `packages/suite-base/src/services/SoraLayoutStorage.ts`

```typescript
import * as IDB from "idb/with-async-ittr";
import {
  SoraLayoutInfo,
  StoredSoraLayout,
  SoraLayoutVersionIndex,
  SoraLayoutTagIndex,
  SoraExtensionDependencyIndex,
} from "../types/SoraLayouts";

const DATABASE_NAME = "sora-layout-marketplace";
const METADATA_STORE = "metadata";
const LAYOUTS_STORE = "layouts";
const VERSION_INDEX_STORE = "versionIndex";
const TAG_INDEX_STORE = "tagIndex";
const DEPENDENCY_INDEX_STORE = "dependencyIndex";

interface SoraLayoutMarketplaceDB extends IDB.DBSchema {
  metadata: {
    key: string; // "publisher.name@version"
    value: SoraLayoutInfo;
  };
  layouts: {
    key: string; // "publisher.name@version"
    value: StoredSoraLayout;
  };
  versionIndex: {
    key: string; // "publisher.name"
    value: SoraLayoutVersionIndex;
  };
  tagIndex: {
    key: string; // tag name
    value: SoraLayoutTagIndex;
  };
  dependencyIndex: {
    key: string; // extension base ID + dependency type
    value: SoraExtensionDependencyIndex;
  };
}

export interface ISoraLayoutStorage {
  // 基本CRUD操作
  list(): Promise<SoraLayoutInfo[]>;
  get(id: string): Promise<StoredSoraLayout | undefined>;
  put(layout: StoredSoraLayout): Promise<void>;
  delete(id: string): Promise<void>;

  // バージョン管理
  getVersions(baseId: string): Promise<SoraLayoutInfo[]>;
  updateActive(id: string, isActive: boolean): Promise<void>;
  getActiveVersion(baseId: string): Promise<SoraLayoutInfo | undefined>;

  // タグ検索
  getLayoutsByTag(tag: string): Promise<SoraLayoutInfo[]>;
  getAllTags(): Promise<string[]>;
  getTagUsageStats(): Promise<Array<{ tag: string; count: number }>>;

  // 拡張機能依存関係
  getLayoutsByExtension(extensionBaseId: string): Promise<SoraLayoutInfo[]>;
  getDependentLayouts(extensionBaseId: string): Promise<{
    required: SoraLayoutInfo[];
    optional: SoraLayoutInfo[];
  }>;
  getAllExtensionDependencies(): Promise<string[]>;
}

export class SoraLayoutStorage implements ISoraLayoutStorage {
  #db: Promise<IDB.IDBPDatabase<SoraLayoutMarketplaceDB>>;

  constructor() {
    this.#db = IDB.openDB<SoraLayoutMarketplaceDB>(DATABASE_NAME, 1, {
      upgrade: (db) => {
        // メタデータストア
        db.createObjectStore(METADATA_STORE, { keyPath: "id" });

        // レイアウトストア
        db.createObjectStore(LAYOUTS_STORE, { keyPath: "info.id" });

        // バージョンインデックスストア
        db.createObjectStore(VERSION_INDEX_STORE, { keyPath: "baseId" });

        // タグインデックスストア
        db.createObjectStore(TAG_INDEX_STORE, { keyPath: "tag" });

        // 依存関係インデックスストア
        db.createObjectStore(DEPENDENCY_INDEX_STORE, { keyPath: "extensionBaseId" });
      },
    });
  }

  async list(): Promise<SoraLayoutInfo[]> {
    const db = await this.#db;
    return await db.getAll(METADATA_STORE);
  }

  async get(id: string): Promise<StoredSoraLayout | undefined> {
    const db = await this.#db;
    return await db.get(LAYOUTS_STORE, id);
  }

  async put(layout: StoredSoraLayout): Promise<void> {
    const db = await this.#db;
    const tx = db.transaction(
      [METADATA_STORE, LAYOUTS_STORE, VERSION_INDEX_STORE, TAG_INDEX_STORE, DEPENDENCY_INDEX_STORE],
      "readwrite",
    );

    // メタデータとコンテンツを保存
    await tx.objectStore(METADATA_STORE).put(layout.info);
    await tx.objectStore(LAYOUTS_STORE).put(layout);

    // インデックス更新
    await this.updateVersionIndex(tx, layout.info);
    await this.updateTagIndex(tx, layout.info);
    await this.updateDependencyIndex(tx, layout.info);

    await tx.done;
  }

  async delete(id: string): Promise<void> {
    const db = await this.#db;
    const tx = db.transaction(
      [METADATA_STORE, LAYOUTS_STORE, VERSION_INDEX_STORE, TAG_INDEX_STORE, DEPENDENCY_INDEX_STORE],
      "readwrite",
    );

    // 削除対象の情報を取得
    const info = await tx.objectStore(METADATA_STORE).get(id);
    if (!info) return;

    // メタデータとコンテンツを削除
    await tx.objectStore(METADATA_STORE).delete(id);
    await tx.objectStore(LAYOUTS_STORE).delete(id);

    // インデックス更新
    await this.removeFromVersionIndex(tx, info);
    await this.removeFromTagIndex(tx, info);
    await this.removeFromDependencyIndex(tx, info);

    await tx.done;
  }

  async getVersions(baseId: string): Promise<SoraLayoutInfo[]> {
    const all = await this.list();
    return all
      .filter((layout) => layout.baseId === baseId)
      .sort((a, b) => a.semver.compare(b.semver) * -1); // 新しい順
  }

  async updateActive(id: string, isActive: boolean): Promise<void> {
    const db = await this.#db;
    const tx = db.transaction([METADATA_STORE, VERSION_INDEX_STORE], "readwrite");

    const info = await tx.objectStore(METADATA_STORE).get(id);
    if (!info) return;

    info.isActive = isActive;
    await tx.objectStore(METADATA_STORE).put(info);

    // バージョンインデックスも更新
    const versionIndex = await tx.objectStore(VERSION_INDEX_STORE).get(info.baseId);
    if (versionIndex) {
      const versionEntry = versionIndex.versions.find((v) => v.id === id);
      if (versionEntry) {
        versionEntry.isActive = isActive;
        await tx.objectStore(VERSION_INDEX_STORE).put(versionIndex);
      }
    }

    await tx.done;
  }

  async getActiveVersion(baseId: string): Promise<SoraLayoutInfo | undefined> {
    const versions = await this.getVersions(baseId);
    return versions.find((layout) => layout.isActive);
  }

  async getLayoutsByTag(tag: string): Promise<SoraLayoutInfo[]> {
    const db = await this.#db;
    const tagIndex = await db.get(TAG_INDEX_STORE, tag);

    if (!tagIndex) return [];

    const layouts: SoraLayoutInfo[] = [];
    for (const baseId of tagIndex.layoutBaseIds) {
      const activeLayout = await this.getActiveVersion(baseId);
      if (activeLayout) {
        layouts.push(activeLayout);
      }
    }

    return layouts;
  }

  async getAllTags(): Promise<string[]> {
    const db = await this.#db;
    const tagIndices = await db.getAll(TAG_INDEX_STORE);
    return tagIndices.map((index) => index.tag);
  }

  async getTagUsageStats(): Promise<Array<{ tag: string; count: number }>> {
    const db = await this.#db;
    const tagIndices = await db.getAll(TAG_INDEX_STORE);
    return tagIndices.map((index) => ({
      tag: index.tag,
      count: index.layoutBaseIds.length,
    }));
  }

  async getLayoutsByExtension(extensionBaseId: string): Promise<SoraLayoutInfo[]> {
    const db = await this.#db;
    const dependencyIndex = await db.get(DEPENDENCY_INDEX_STORE, extensionBaseId);

    if (!dependencyIndex) return [];

    const layouts: SoraLayoutInfo[] = [];
    for (const baseId of dependencyIndex.dependentLayoutBaseIds) {
      const activeLayout = await this.getActiveVersion(baseId);
      if (activeLayout) {
        layouts.push(activeLayout);
      }
    }

    return layouts;
  }

  async getDependentLayouts(extensionBaseId: string): Promise<{
    required: SoraLayoutInfo[];
    optional: SoraLayoutInfo[];
  }> {
    const allLayouts = await this.list();
    const required: SoraLayoutInfo[] = [];
    const optional: SoraLayoutInfo[] = [];

    for (const layout of allLayouts) {
      if (layout.extensions?.required?.includes(extensionBaseId)) {
        required.push(layout);
      } else if (layout.extensions?.optional?.includes(extensionBaseId)) {
        optional.push(layout);
      }
    }

    return { required, optional };
  }

  async getAllExtensionDependencies(): Promise<string[]> {
    const db = await this.#db;
    const dependencyIndices = await db.getAll(DEPENDENCY_INDEX_STORE);
    return dependencyIndices.map((index) => index.extensionBaseId);
  }

  // プライベートメソッド
  private async updateVersionIndex(
    tx: IDB.IDBPTransaction<SoraLayoutMarketplaceDB, any, "readwrite">,
    info: SoraLayoutInfo,
  ): Promise<void> {
    const store = tx.objectStore(VERSION_INDEX_STORE);
    let index = await store.get(info.baseId);

    if (!index) {
      index = {
        baseId: info.baseId,
        versions: [],
      };
    }

    const existingIndex = index.versions.findIndex((v) => v.id === info.id);
    const versionEntry = {
      version: info.version,
      id: info.id,
      isActive: info.isActive,
      installDate: info.installDate,
      publishDate: info.publishDate,
    };

    if (existingIndex >= 0) {
      index.versions[existingIndex] = versionEntry;
    } else {
      index.versions.push(versionEntry);
    }

    await store.put(index);
  }

  private async updateTagIndex(
    tx: IDB.IDBPTransaction<SoraLayoutMarketplaceDB, any, "readwrite">,
    info: SoraLayoutInfo,
  ): Promise<void> {
    const store = tx.objectStore(TAG_INDEX_STORE);

    if (!info.tags) return;

    for (const tag of info.tags) {
      let tagIndex = await store.get(tag);

      if (!tagIndex) {
        tagIndex = {
          tag,
          layoutBaseIds: [],
        };
      }

      if (!tagIndex.layoutBaseIds.includes(info.baseId)) {
        tagIndex.layoutBaseIds.push(info.baseId);
      }

      await store.put(tagIndex);
    }
  }

  private async updateDependencyIndex(
    tx: IDB.IDBPTransaction<SoraLayoutMarketplaceDB, any, "readwrite">,
    info: SoraLayoutInfo,
  ): Promise<void> {
    const store = tx.objectStore(DEPENDENCY_INDEX_STORE);

    if (!info.extensions) return;

    // 必須依存関係の処理
    if (info.extensions.required) {
      for (const extensionBaseId of info.extensions.required) {
        await this.updateSingleDependencyIndex(store, extensionBaseId, info.baseId, "required");
      }
    }

    // 推奨依存関係の処理
    if (info.extensions.optional) {
      for (const extensionBaseId of info.extensions.optional) {
        await this.updateSingleDependencyIndex(store, extensionBaseId, info.baseId, "optional");
      }
    }
  }

  private async updateSingleDependencyIndex(
    store: IDB.IDBPObjectStore<
      SoraLayoutMarketplaceDB,
      ["dependencyIndex"],
      "dependencyIndex",
      "readwrite"
    >,
    extensionBaseId: string,
    layoutBaseId: string,
    dependencyType: "required" | "optional",
  ): Promise<void> {
    let dependencyIndex = await store.get(extensionBaseId);

    if (!dependencyIndex) {
      dependencyIndex = {
        extensionBaseId,
        dependentLayoutBaseIds: [],
        dependencyType,
      };
    }

    if (!dependencyIndex.dependentLayoutBaseIds.includes(layoutBaseId)) {
      dependencyIndex.dependentLayoutBaseIds.push(layoutBaseId);
    }

    await store.put(dependencyIndex);
  }

  private async removeFromVersionIndex(
    tx: IDB.IDBPTransaction<SoraLayoutMarketplaceDB, any, "readwrite">,
    info: SoraLayoutInfo,
  ): Promise<void> {
    const store = tx.objectStore(VERSION_INDEX_STORE);
    const index = await store.get(info.baseId);

    if (!index) return;

    index.versions = index.versions.filter((v) => v.id !== info.id);

    if (index.versions.length === 0) {
      await store.delete(info.baseId);
    } else {
      await store.put(index);
    }
  }

  private async removeFromTagIndex(
    tx: IDB.IDBPTransaction<SoraLayoutMarketplaceDB, any, "readwrite">,
    info: SoraLayoutInfo,
  ): Promise<void> {
    const store = tx.objectStore(TAG_INDEX_STORE);

    if (!info.tags) return;

    for (const tag of info.tags) {
      const tagIndex = await store.get(tag);
      if (!tagIndex) continue;

      tagIndex.layoutBaseIds = tagIndex.layoutBaseIds.filter((id) => id !== info.baseId);

      if (tagIndex.layoutBaseIds.length === 0) {
        await store.delete(tag);
      } else {
        await store.put(tagIndex);
      }
    }
  }

  private async removeFromDependencyIndex(
    tx: IDB.IDBPTransaction<SoraLayoutMarketplaceDB, any, "readwrite">,
    info: SoraLayoutInfo,
  ): Promise<void> {
    const store = tx.objectStore(DEPENDENCY_INDEX_STORE);

    if (!info.extensions) return;

    const allExtensions = [
      ...(info.extensions.required ?? []),
      ...(info.extensions.optional ?? []),
    ];

    for (const extensionBaseId of allExtensions) {
      const dependencyIndex = await store.get(extensionBaseId);
      if (!dependencyIndex) continue;

      dependencyIndex.dependentLayoutBaseIds = dependencyIndex.dependentLayoutBaseIds.filter(
        (id) => id !== info.baseId,
      );

      if (dependencyIndex.dependentLayoutBaseIds.length === 0) {
        await store.delete(extensionBaseId);
      } else {
        await store.put(dependencyIndex);
      }
    }
  }
}
```

#### 2.3 レイアウトローダー実装

**ファイル**: `packages/suite-base/src/services/SoraLayoutLoader.ts`

```typescript
import * as semver from "semver";
import Log from "@lichtblick/log";
import {
  SoraLayoutInfo,
  StoredSoraLayout,
  DependencyCheckResult,
  LayoutInstallResult,
  SoraExtensionDependency,
} from "../types/SoraLayouts";
import { SoraLayoutStorage, ISoraLayoutStorage } from "./SoraLayoutStorage";
import { SoraExtensionLoader } from "./SoraExtensionLoader"; // 拡張機能システムとの連携

const log = Log.getLogger(__filename);

function parsePackageName(name: string): { publisher?: string; name: string } {
  const match = /^@([^/]+)\/(.+)/.exec(name);
  if (!match) {
    return { name };
  }
  return { publisher: match[1], name: match[2]! };
}

function validateLayoutPackageInfo(info: any): {
  publisher: string;
  name: string;
  version: string;
  [key: string]: any;
} {
  if (!info.name || info.name.length === 0) {
    throw new Error("Invalid layout: missing name");
  }

  const { publisher: parsedPublisher, name } = parsePackageName(info.name);
  const publisher = info.publisher ?? parsedPublisher;

  if (!publisher || publisher.length === 0) {
    throw new Error("Invalid layout: missing publisher");
  }

  if (!info.version || !semver.valid(info.version)) {
    throw new Error("Invalid layout: missing or invalid version");
  }

  return { ...info, publisher, name: name.toLowerCase(), version: info.version };
}

export class SoraLayoutLoader {
  readonly namespace = "sora-marketplace";
  readonly #storage: ISoraLayoutStorage;
  readonly #extensionLoader: SoraExtensionLoader;

  constructor(extensionLoader: SoraExtensionLoader) {
    this.#storage = new SoraLayoutStorage();
    this.#extensionLoader = extensionLoader;
  }

  async getLayout(id: string): Promise<SoraLayoutInfo | undefined> {
    const stored = await this.#storage.get(id);
    return stored?.info;
  }

  async getLayouts(): Promise<SoraLayoutInfo[]> {
    return await this.#storage.list();
  }

  async getLayoutVersions(baseId: string): Promise<SoraLayoutInfo[]> {
    return await this.#storage.getVersions(baseId);
  }

  async setActiveVersion(baseId: string, version: string): Promise<void> {
    const versions = await this.#storage.getVersions(baseId);

    // 全バージョンを非アクティブに
    for (const layout of versions) {
      await this.#storage.updateActive(layout.id, false);
    }

    // 指定バージョンをアクティブに
    const targetId = `${baseId}@${version}`;
    const targetLayout = versions.find((layout) => layout.id === targetId);

    if (!targetLayout) {
      throw new Error(`Version ${version} not found for ${baseId}`);
    }

    await this.#storage.updateActive(targetId, true);
  }

  async getActiveVersion(baseId: string): Promise<SoraLayoutInfo | undefined> {
    return await this.#storage.getActiveVersion(baseId);
  }

  async installLayout(layoutFileData: ArrayBuffer): Promise<SoraLayoutInfo> {
    log.debug("Installing Sora layout");

    // レイアウトファイル解析（JSON形式を想定）
    const layoutText = new TextDecoder().decode(layoutFileData);
    const layoutPackage = JSON.parse(layoutText);

    // package.jsonが含まれている場合の処理
    if (!layoutPackage.name || !layoutPackage.version) {
      throw new Error("Layout file does not contain valid package information");
    }

    const rawInfo = validateLayoutPackageInfo(layoutPackage);

    // バージョン付きID生成
    const normalizedPublisher = rawInfo.publisher.replace(/[^A-Za-z0-9_\s]+/g, "");
    const baseId = `${normalizedPublisher}.${rawInfo.name}`;
    const versionedId = `${baseId}@${rawInfo.version}`;

    // 既存バージョン確認
    const existingVersions = await this.#storage.getVersions(baseId);
    const isFirstInstall = existingVersions.length === 0;
    const parsedVersion = semver.parse(rawInfo.version);

    if (!parsedVersion) {
      throw new Error(`Invalid version format: ${rawInfo.version}`);
    }

    // 既存バージョンがある場合、同じバージョンのチェック
    const existingVersion = existingVersions.find((layout) => layout.version === rawInfo.version);
    if (existingVersion) {
      throw new Error(`Version ${rawInfo.version} already installed for ${baseId}`);
    }

    const info: SoraLayoutInfo = {
      ...rawInfo,
      id: versionedId,
      baseId,
      semver: parsedVersion,
      isActive: isFirstInstall, // 初回インストール時のみアクティブ
      installDate: new Date(),
      publishDate: new Date(rawInfo.publishDate ?? Date.now()),
      namespace: "sora-marketplace",

      // マーケットプレイス情報
      publisher: normalizedPublisher,
      description: rawInfo.description,
      tags: rawInfo.tags,
      license: rawInfo.license,
      homepage: rawInfo.homepage,
      screenshots: rawInfo.screenshots,
      readme: rawInfo.readme,
      changelog: rawInfo.changelog,
      extensions: rawInfo.extensions,

      // 既存レイアウト情報を維持
      baseline: rawInfo.baseline ?? {
        data: rawInfo.data ?? rawInfo.layout,
        savedAt: undefined,
      },
      working: undefined,
      syncInfo: undefined,
    };

    await this.#storage.put({
      content: layoutFileData,
      info,
    });

    log.debug(`Sora layout installed: ${versionedId}`);
    return info;
  }

  async uninstallLayout(id: string): Promise<void> {
    log.debug("Uninstalling Sora layout:", id);

    const layout = await this.getLayout(id);
    if (!layout) {
      throw new Error(`Layout not found: ${id}`);
    }

    await this.#storage.delete(id);

    // アクティブバージョンを削除した場合、最新バージョンをアクティブに
    if (layout.isActive) {
      const remainingVersions = await this.#storage.getVersions(layout.baseId);
      if (remainingVersions.length > 0) {
        const latestVersion = remainingVersions[0]; // すでにソート済み
        await this.#storage.updateActive(latestVersion.id, true);
      }
    }

    log.debug(`Sora layout uninstalled: ${id}`);
  }

  async uninstallAllVersions(baseId: string): Promise<void> {
    const versions = await this.#storage.getVersions(baseId);
    for (const layout of versions) {
      await this.#storage.delete(layout.id);
    }
  }

  // タグ検索機能
  async getLayoutsByTag(tag: string): Promise<SoraLayoutInfo[]> {
    return await this.#storage.getLayoutsByTag(tag);
  }

  async getAllTags(): Promise<string[]> {
    return await this.#storage.getAllTags();
  }

  async getTagUsageStats(): Promise<Array<{ tag: string; count: number }>> {
    return await this.#storage.getTagUsageStats();
  }

  // 拡張機能依存関係管理
  async getLayoutsByExtension(extensionBaseId: string): Promise<SoraLayoutInfo[]> {
    return await this.#storage.getLayoutsByExtension(extensionBaseId);
  }

  async checkExtensionDependencies(layout: SoraLayoutInfo): Promise<DependencyCheckResult> {
    const missing: string[] = [];
    const available: string[] = [];
    const conflicting: string[] = [];

    if (!layout.extensions) {
      return { missing, available, conflicting };
    }

    // 必須拡張機能のチェック
    if (layout.extensions.required) {
      for (const extensionBaseId of layout.extensions.required) {
        const installedExtension = await this.#extensionLoader.getActiveVersion(extensionBaseId);
        if (!installedExtension) {
          // インストールされていない場合、マーケットプレイスで利用可能かチェック
          const availableVersions =
            await this.#extensionLoader.getExtensionVersions(extensionBaseId);
          if (availableVersions.length > 0) {
            available.push(extensionBaseId);
          } else {
            missing.push(extensionBaseId);
          }
        }
      }
    }

    // 推奨拡張機能のチェック（参考情報として）
    if (layout.extensions.optional) {
      for (const extensionBaseId of layout.extensions.optional) {
        const installedExtension = await this.#extensionLoader.getActiveVersion(extensionBaseId);
        if (!installedExtension) {
          const availableVersions =
            await this.#extensionLoader.getExtensionVersions(extensionBaseId);
          if (availableVersions.length > 0) {
            available.push(extensionBaseId);
          }
        }
      }
    }

    return { missing, available, conflicting };
  }

  async installLayoutWithDependencies(layout: SoraLayoutInfo): Promise<LayoutInstallResult> {
    const warnings: string[] = [];
    const installedExtensions: string[] = [];

    // 依存関係をチェック
    const dependencyCheck = await this.checkExtensionDependencies(layout);

    // 必須拡張機能が不足している場合はエラー
    if (dependencyCheck.missing.length > 0) {
      throw new Error(`Missing required extensions: ${dependencyCheck.missing.join(", ")}`);
    }

    // 利用可能な拡張機能を自動インストール
    for (const extensionBaseId of dependencyCheck.available) {
      try {
        const versions = await this.#extensionLoader.getExtensionVersions(extensionBaseId);
        if (versions.length > 0) {
          const latestVersion = versions[0]; // 最新バージョンをインストール
          await this.#extensionLoader.setActiveVersion(extensionBaseId, latestVersion.version);
          installedExtensions.push(extensionBaseId);
        }
      } catch (error) {
        warnings.push(
          `Failed to install extension ${extensionBaseId}: ${(error as Error).message}`,
        );
      }
    }

    return {
      layout,
      installedExtensions,
      warnings,
    };
  }

  // 検索機能
  async searchLayouts(query: string): Promise<SoraLayoutInfo[]> {
    const allLayouts = await this.getLayouts();
    const searchTerms = query.toLowerCase().split(/\s+/);

    return allLayouts.filter((layout) => {
      const searchText = [layout.name, layout.description, layout.publisher, ...(layout.tags ?? [])]
        .join(" ")
        .toLowerCase();

      return searchTerms.every((term) => searchText.includes(term));
    });
  }
}
```

### Phase 2: UI実装 (2-3週間)

#### 2.1 レイアウトマーケットプレイス統合

**ファイル**: `packages/suite-base/src/components/LayoutBrowser/SoraMarketplaceTab.tsx`

```typescript
import {
  Alert,
  AlertTitle,
  Button,
  Chip,
  Typography,
  TextField,
  Autocomplete,
  Box,
  Card,
  CardContent,
  CardMedia,
  CardActions,
} from "@mui/material";
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import Stack from "@lichtblick/suite-base/components/Stack";
import { SoraLayoutInfo, DependencyCheckResult } from "@lichtblick/suite-base/types/SoraLayouts";
import { useSoraLayoutMarketplace } from "../hooks/useSoraLayoutMarketplace";

interface SoraMarketplaceTabProps {
  onLayoutInstall: (layout: SoraLayoutInfo) => Promise<void>;
  onLayoutUninstall: (id: string) => Promise<void>;
  onVersionSwitch: (baseId: string, version: string) => Promise<void>;
}

export default function SoraMarketplaceTab({
  onLayoutInstall,
  onLayoutUninstall,
  onVersionSwitch,
}: SoraMarketplaceTabProps): React.ReactElement {
  const { t } = useTranslation("layoutBrowser");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [focusedLayout, setFocusedLayout] = useState<SoraLayoutInfo | undefined>();

  const {
    layouts,
    installedLayouts,
    allTags,
    isLoading,
    error,
    searchLayouts,
    getLayoutsByTag,
    refreshLayouts,
  } = useSoraLayoutMarketplace();

  // フィルタリングされたレイアウト
  const filteredLayouts = useMemo(() => {
    let result = layouts;

    // 検索クエリでフィルタ
    if (searchQuery.trim()) {
      result = result.filter(layout =>
        layout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        layout.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        layout.publisher.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // タグでフィルタ
    if (selectedTags.length > 0) {
      result = result.filter(layout =>
        selectedTags.every(tag => layout.tags?.includes(tag))
      );
    }

    return result;
  }, [layouts, searchQuery, selectedTags]);

  const handleInstall = useCallback(async (layout: SoraLayoutInfo) => {
    try {
      await onLayoutInstall(layout);
    } catch (error) {
      console.error("Failed to install layout:", error);
    }
  }, [onLayoutInstall]);

  const handleUninstall = useCallback(async (layoutId: string) => {
    try {
      await onLayoutUninstall(layoutId);
    } catch (error) {
      console.error("Failed to uninstall layout:", error);
    }
  }, [onLayoutUninstall]);

  if (focusedLayout) {
    return (
      <SoraLayoutDetail
        layout={focusedLayout}
        onBack={() => setFocusedLayout(undefined)}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
        onVersionSwitch={onVersionSwitch}
      />
    );
  }

  return (
    <Stack gap={2} padding={2}>
      <Typography variant="h6">Layout Marketplace</Typography>

      {error && (
        <Alert severity="error" action={
          <Button color="inherit" onClick={refreshLayouts}>Retry</Button>
        }>
          <AlertTitle>Failed to load marketplace</AlertTitle>
          {error.message}
        </Alert>
      )}

      {/* 検索とフィルタ */}
      <Stack gap={2}>
        <TextField
          fullWidth
          placeholder="Search layouts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
        />

        <Autocomplete
          multiple
          options={allTags}
          value={selectedTags}
          onChange={(_, newValue) => setSelectedTags(newValue)}
          renderInput={(params) => (
            <TextField {...params} placeholder="Filter by tags..." size="small" />
          )}
          renderTags={(tags, getTagProps) =>
            tags.map((tag, index) => (
              <Chip {...getTagProps({ index })} key={tag} label={tag} size="small" />
            ))
          }
        />
      </Stack>

      {/* レイアウト一覧 */}
      {isLoading ? (
        <Typography>Loading layouts...</Typography>
      ) : (
        <Stack gap={1}>
          {filteredLayouts.map((layout) => (
            <SoraLayoutCard
              key={layout.id}
              layout={layout}
              isInstalled={installedLayouts.some(installed => installed.baseId === layout.baseId)}
              onInstall={() => handleInstall(layout)}
              onUninstall={() => handleUninstall(layout.id)}
              onViewDetails={() => setFocusedLayout(layout)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// レイアウトカードコンポーネント
interface SoraLayoutCardProps {
  layout: SoraLayoutInfo;
  isInstalled: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onViewDetails: () => void;
}

function SoraLayoutCard({
  layout,
  isInstalled,
  onInstall,
  onUninstall,
  onViewDetails,
}: SoraLayoutCardProps): React.ReactElement {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" gap={2}>
          {/* スクリーンショット */}
          {layout.screenshots && layout.screenshots.length > 0 && (
            <CardMedia
              component="img"
              sx={{ width: 120, height: 80, objectFit: 'cover' }}
              image={layout.screenshots[0]}
              alt={layout.name}
            />
          )}

          {/* レイアウト情報 */}
          <Stack flex={1} gap={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Typography variant="h6">{layout.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                v{layout.version}
              </Typography>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              by {layout.publisher}
            </Typography>

            {layout.description && (
              <Typography variant="body2" noWrap>
                {layout.description}
              </Typography>
            )}

            {/* タグ */}
            {layout.tags && layout.tags.length > 0 && (
              <Box>
                {layout.tags.slice(0, 3).map((tag) => (
                  <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />
                ))}
                {layout.tags.length > 3 && (
                  <Typography variant="caption" color="text.secondary">
                    +{layout.tags.length - 3} more
                  </Typography>
                )}
              </Box>
            )}

            {/* 拡張機能依存関係 */}
            {layout.extensions && (
              <Typography variant="caption" color="text.secondary">
                {layout.extensions.required && layout.extensions.required.length > 0 && (
                  <>Requires: {layout.extensions.required.join(", ")}</>
                )}
                {layout.extensions.optional && layout.extensions.optional.length > 0 && (
                  <>Optional: {layout.extensions.optional.join(", ")}</>
                )}
              </Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>

      <CardActions>
        <Button size="small" onClick={onViewDetails}>
          Details
        </Button>
        {isInstalled ? (
          <Button size="small" color="error" onClick={onUninstall}>
            Uninstall
          </Button>
        ) : (
          <Button size="small" variant="contained" onClick={onInstall}>
            Install
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

// レイアウト詳細コンポーネント
interface SoraLayoutDetailProps {
  layout: SoraLayoutInfo;
  onBack: () => void;
  onInstall: (layout: SoraLayoutInfo) => void;
  onUninstall: (layoutId: string) => void;
  onVersionSwitch: (baseId: string, version: string) => Promise<void>;
}

function SoraLayoutDetail({
  layout,
  onBack,
  onInstall,
  onUninstall,
  onVersionSwitch,
}: SoraLayoutDetailProps): React.ReactElement {
  // 詳細ページの実装...
  return (
    <Stack gap={2} padding={2}>
      <Button onClick={onBack}>← Back to Marketplace</Button>
      <Typography variant="h5">{layout.name}</Typography>
      {/* 詳細情報の表示... */}
    </Stack>
  );
}
```

## 3. サーバーサイド実装

### 3.1 API設計

**エンドポイント構成**:

```
GET  /api/layouts              # レイアウトカタログ取得
GET  /api/layouts/:baseId      # 特定レイアウト詳細
GET  /api/layouts/:baseId/:version/download # レイアウトダウンロード
GET  /api/tags                 # 利用可能タグ一覧
GET  /api/extensions           # 依存関係のある拡張機能一覧
POST /api/layouts/upload       # レイアウトアップロード（認証必要）
```

## 4. 統合・テスト

### 4.1 既存システムとの統合

既存の`LayoutBrowser`コンポーネントにタブを追加：

```typescript
// LayoutBrowser/index.tsx に追加
const [activeTab, setActiveTab] = useState<"personal" | "shared" | "marketplace">("personal");

const tabs = [
  { label: "Personal", value: "personal" },
  { label: "Shared", value: "shared" },
  { label: "Marketplace", value: "marketplace" },
];
```

### 4.2 依存関係管理の統合

拡張機能システムとの連携により、レイアウトインストール時に必要な拡張機能を自動チェック・インストール提案する機能を実装。

## 5. 利点と考慮事項

### 5.1 利点

1. **柔軟な分類**: タグシステムによる多面的な分類
2. **統合エコシステム**: 拡張機能との密結合による高度な機能提供
3. **段階的導入**: 既存システムへの影響なし
4. **スケーラビリティ**: 将来的な機能拡張に対応

### 5.2 考慮事項

1. **複雑性増加**: 依存関係管理による複雑性
2. **ストレージ使用量**: タグ・依存関係インデックスによる容量増大
3. **同期処理**: 拡張機能との同期処理の複雑化

---

この実装計画により、タグベース分類と拡張機能依存関係を持つ包括的なレイアウトマーケットプレイスシステムを構築できる。
