# Sora拡張機能システム 実装計画書

## 1. プロジェクト概要

### 1.1 目標

Lichtblick Suiteから派生したSoraにおいて、複数バージョン対応の独立した拡張機能システムを構築する。

### 1.2 実装方針

- **名前空間**: `"sora-local"` で完全独立
- **既存システム**: 一切変更せずに共存
- **段階的実装**: 機能を段階的に追加
- **マージ負担軽減**: 独立したモジュール構成

## 2. 実装フェーズ

### Phase 1: 基盤システム構築 (2-3週間)

#### 2.1 型定義・インターフェース拡張

**ファイル**: `packages/suite-base/src/types/SoraExtensions.ts`

```typescript
import { ExtensionInfo, ExtensionNamespace } from "./Extensions";
import { SemVer } from "semver";

// 名前空間拡張
export type SoraExtensionNamespace = ExtensionNamespace | "sora-local";

// Sora拡張機能情報
export interface SoraExtensionInfo extends ExtensionInfo {
  id: string; // "publisher.name@version"
  baseId: string; // "publisher.name"
  version: string;
  semver: SemVer;
  isActive: boolean;
  installDate: Date;
  namespace: "sora-local";
}

// ストレージ用
export interface StoredSoraExtension {
  content: Uint8Array;
  info: SoraExtensionInfo;
}

// バージョン管理インデックス
export interface SoraVersionIndex {
  baseId: string;
  versions: Array<{
    version: string;
    id: string;
    isActive: boolean;
    installDate: Date;
  }>;
}
```

#### 2.2 ストレージシステム実装

**ファイル**: `packages/suite-base/src/services/SoraExtensionStorage.ts`

```typescript
import * as IDB from "idb/with-async-ittr";
import { SoraExtensionInfo, StoredSoraExtension, SoraVersionIndex } from "../types/SoraExtensions";

const DATABASE_NAME = "sora-extensions";
const METADATA_STORE = "metadata";
const EXTENSIONS_STORE = "extensions";
const VERSION_INDEX_STORE = "versionIndex";

interface SoraExtensionsDB extends IDB.DBSchema {
  metadata: {
    key: string; // "publisher.name@version"
    value: SoraExtensionInfo;
  };
  extensions: {
    key: string; // "publisher.name@version"
    value: StoredSoraExtension;
  };
  versionIndex: {
    key: string; // "publisher.name"
    value: SoraVersionIndex;
  };
}

export interface ISoraExtensionStorage {
  list(): Promise<SoraExtensionInfo[]>;
  get(id: string): Promise<StoredSoraExtension | undefined>;
  put(extension: StoredSoraExtension): Promise<void>;
  delete(id: string): Promise<void>;

  // バージョン管理専用メソッド
  getVersions(baseId: string): Promise<SoraExtensionInfo[]>;
  updateActive(id: string, isActive: boolean): Promise<void>;
  getActiveVersion(baseId: string): Promise<SoraExtensionInfo | undefined>;
}

export class SoraExtensionStorage implements ISoraExtensionStorage {
  #db: Promise<IDB.IDBPDatabase<SoraExtensionsDB>>;

  constructor() {
    this.#db = IDB.openDB<SoraExtensionsDB>(DATABASE_NAME, 1, {
      upgrade: (db) => {
        // メタデータストア
        db.createObjectStore(METADATA_STORE, { keyPath: "id" });

        // 拡張機能ストア
        db.createObjectStore(EXTENSIONS_STORE, { keyPath: "info.id" });

        // バージョンインデックスストア
        db.createObjectStore(VERSION_INDEX_STORE, { keyPath: "baseId" });
      },
    });
  }

  async list(): Promise<SoraExtensionInfo[]> {
    const db = await this.#db;
    return await db.getAll(METADATA_STORE);
  }

  async get(id: string): Promise<StoredSoraExtension | undefined> {
    const db = await this.#db;
    return await db.get(EXTENSIONS_STORE, id);
  }

  async put(extension: StoredSoraExtension): Promise<void> {
    const db = await this.#db;
    const tx = db.transaction([METADATA_STORE, EXTENSIONS_STORE, VERSION_INDEX_STORE], "readwrite");

    // メタデータとコンテンツを保存
    await tx.objectStore(METADATA_STORE).put(extension.info);
    await tx.objectStore(EXTENSIONS_STORE).put(extension);

    // バージョンインデックス更新
    await this.updateVersionIndex(tx, extension.info);

    await tx.done;
  }

  async delete(id: string): Promise<void> {
    const db = await this.#db;
    const tx = db.transaction([METADATA_STORE, EXTENSIONS_STORE, VERSION_INDEX_STORE], "readwrite");

    // 削除対象の情報を取得
    const info = await tx.objectStore(METADATA_STORE).get(id);
    if (!info) return;

    // メタデータとコンテンツを削除
    await tx.objectStore(METADATA_STORE).delete(id);
    await tx.objectStore(EXTENSIONS_STORE).delete(id);

    // バージョンインデックス更新
    await this.removeFromVersionIndex(tx, info);

    await tx.done;
  }

  async getVersions(baseId: string): Promise<SoraExtensionInfo[]> {
    const all = await this.list();
    return all
      .filter((ext) => ext.baseId === baseId)
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

  async getActiveVersion(baseId: string): Promise<SoraExtensionInfo | undefined> {
    const versions = await this.getVersions(baseId);
    return versions.find((ext) => ext.isActive);
  }

  private async updateVersionIndex(
    tx: IDB.IDBPTransaction<
      SoraExtensionsDB,
      ["metadata", "extensions", "versionIndex"],
      "readwrite"
    >,
    info: SoraExtensionInfo,
  ): Promise<void> {
    const store = tx.objectStore(VERSION_INDEX_STORE);
    let index = await store.get(info.baseId);

    if (!index) {
      index = {
        baseId: info.baseId,
        versions: [],
      };
    }

    // 既存バージョンエントリを更新または追加
    const existingIndex = index.versions.findIndex((v) => v.id === info.id);
    const versionEntry = {
      version: info.version,
      id: info.id,
      isActive: info.isActive,
      installDate: info.installDate,
    };

    if (existingIndex >= 0) {
      index.versions[existingIndex] = versionEntry;
    } else {
      index.versions.push(versionEntry);
    }

    await store.put(index);
  }

  private async removeFromVersionIndex(
    tx: IDB.IDBPTransaction<
      SoraExtensionsDB,
      ["metadata", "extensions", "versionIndex"],
      "readwrite"
    >,
    info: SoraExtensionInfo,
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
}
```

#### 2.3 拡張機能ローダー実装

**ファイル**: `packages/suite-base/src/services/SoraExtensionLoader.ts`

```typescript
import JSZip from "jszip";
import * as semver from "semver";
import Log from "@lichtblick/log";
import { ExtensionLoader } from "./ExtensionLoader";
import { SoraExtensionInfo, StoredSoraExtension } from "../types/SoraExtensions";
import { SoraExtensionStorage, ISoraExtensionStorage } from "./SoraExtensionStorage";

const log = Log.getLogger(__filename);

function parsePackageName(name: string): { publisher?: string; name: string } {
  const match = /^@([^/]+)\/(.+)/.exec(name);
  if (!match) {
    return { name };
  }
  return { publisher: match[1], name: match[2]! };
}

function validatePackageInfo(info: any): {
  publisher: string;
  name: string;
  version: string;
  [key: string]: any;
} {
  if (!info.name || info.name.length === 0) {
    throw new Error("Invalid extension: missing name");
  }

  const { publisher: parsedPublisher, name } = parsePackageName(info.name);
  const publisher = info.publisher ?? parsedPublisher;

  if (!publisher || publisher.length === 0) {
    throw new Error("Invalid extension: missing publisher");
  }

  if (!info.version || !semver.valid(info.version)) {
    throw new Error("Invalid extension: missing or invalid version");
  }

  return { ...info, publisher, name: name.toLowerCase(), version: info.version };
}

export class SoraExtensionLoader implements ExtensionLoader {
  readonly namespace = "sora-local";
  readonly #storage: ISoraExtensionStorage;

  constructor() {
    this.#storage = new SoraExtensionStorage();
  }

  async getExtension(id: string): Promise<SoraExtensionInfo | undefined> {
    const stored = await this.#storage.get(id);
    return stored?.info;
  }

  async getExtensions(): Promise<SoraExtensionInfo[]> {
    return await this.#storage.list();
  }

  // baseIdまたはversionedIdの両方に対応
  async loadExtension(id: string): Promise<string> {
    let targetId = id;

    // baseIdが渡された場合はアクティブバージョンを取得
    if (!id.includes("@")) {
      const activeExt = await this.#storage.getActiveVersion(id);
      if (!activeExt) {
        throw new Error(`No active version found for extension: ${id}`);
      }
      targetId = activeExt.id;
    }

    const stored = await this.#storage.get(targetId);
    if (!stored) {
      throw new Error(`Extension not found: ${targetId}`);
    }

    const content = await new JSZip().loadAsync(stored.content);
    const rawContent = await content.file("dist/extension.js")?.async("string");

    if (!rawContent) {
      throw new Error(`Extension corrupted: missing dist/extension.js in ${targetId}`);
    }

    return rawContent;
  }

  async installExtension(foxeFileData: Uint8Array): Promise<SoraExtensionInfo> {
    log.debug("Installing Sora extension");

    // package.json解析
    const zip = new JSZip();
    const content = await zip.loadAsync(foxeFileData);

    const pkgJsonFile = content.file("package.json");
    if (!pkgJsonFile) {
      throw new Error("Extension does not contain package.json");
    }

    const pkgJsonText = await pkgJsonFile.async("string");
    const rawInfo = validatePackageInfo(JSON.parse(pkgJsonText));

    // README・CHANGELOG取得
    const readmeFile = content.file("README.md");
    const changelogFile = content.file("CHANGELOG.md");
    const readme = readmeFile ? await readmeFile.async("string") : "";
    const changelog = changelogFile ? await changelogFile.async("string") : "";

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
    const existingVersion = existingVersions.find((ext) => ext.version === rawInfo.version);
    if (existingVersion) {
      throw new Error(`Version ${rawInfo.version} already installed for ${baseId}`);
    }

    const info: SoraExtensionInfo = {
      ...rawInfo,
      id: versionedId,
      baseId,
      semver: parsedVersion,
      isActive: isFirstInstall, // 初回インストール時のみアクティブ
      installDate: new Date(),
      namespace: this.namespace,
      qualifiedName: `sora-local:${normalizedPublisher}:${rawInfo.name}`,
      readme,
      changelog,
    };

    await this.#storage.put({
      content: foxeFileData,
      info,
    });

    log.debug(`Sora extension installed: ${versionedId}`);
    return info;
  }

  async uninstallExtension(id: string): Promise<void> {
    log.debug("Uninstalling Sora extension:", id);

    const ext = await this.getExtension(id);
    if (!ext) {
      throw new Error(`Extension not found: ${id}`);
    }

    await this.#storage.delete(id);

    // アクティブバージョンを削除した場合、最新バージョンをアクティブに
    if (ext.isActive) {
      const remainingVersions = await this.#storage.getVersions(ext.baseId);
      if (remainingVersions.length > 0) {
        const latestVersion = remainingVersions[0]; // すでにソート済み
        await this.#storage.updateActive(latestVersion.id, true);
      }
    }

    log.debug(`Sora extension uninstalled: ${id}`);
  }

  // Sora拡張機能専用メソッド
  async getExtensionVersions(baseId: string): Promise<SoraExtensionInfo[]> {
    return await this.#storage.getVersions(baseId);
  }

  async setActiveVersion(baseId: string, version: string): Promise<void> {
    const versions = await this.#storage.getVersions(baseId);

    // 全バージョンを非アクティブに
    for (const ext of versions) {
      await this.#storage.updateActive(ext.id, false);
    }

    // 指定バージョンをアクティブに
    const targetId = `${baseId}@${version}`;
    const targetExt = versions.find((ext) => ext.id === targetId);

    if (!targetExt) {
      throw new Error(`Version ${version} not found for ${baseId}`);
    }

    await this.#storage.updateActive(targetId, true);
  }

  async getActiveVersion(baseId: string): Promise<SoraExtensionInfo | undefined> {
    return await this.#storage.getActiveVersion(baseId);
  }

  async uninstallAllVersions(baseId: string): Promise<void> {
    const versions = await this.#storage.getVersions(baseId);
    for (const ext of versions) {
      await this.#storage.delete(ext.id);
    }
  }
}
```

### Phase 2: UI実装 (1-2週間)

#### 2.1 Sora拡張機能管理コンポーネント

**ファイル**: `packages/suite-base/src/components/SoraExtensionSettings/index.tsx`

```typescript
import { Alert, AlertTitle, Button, Chip, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import Stack from "@lichtblick/suite-base/components/Stack";
import SearchBar from "@lichtblick/suite-base/components/SearchBar/SearchBar";
import { useSoraExtensionSettings } from "./hooks/useSoraExtensionSettings";
import SoraExtensionList from "./components/SoraExtensionList";
import SoraExtensionDetails from "./components/SoraExtensionDetails";

export default function SoraExtensionSettings(): React.ReactElement {
  const { t } = useTranslation("extensionsSettings");
  const [focusedExtension, setFocusedExtension] = useState<string | undefined>();
  const [filterText, setFilterText] = useState("");

  const {
    groupedExtensions,
    isLoading,
    error,
    refreshExtensions,
  } = useSoraExtensionSettings(filterText);

  const handleExtensionSelect = useCallback((baseId: string) => {
    setFocusedExtension(baseId);
  }, []);

  if (focusedExtension) {
    return (
      <SoraExtensionDetails
        baseId={focusedExtension}
        onClose={() => setFocusedExtension(undefined)}
      />
    );
  }

  return (
    <Stack gap={1}>
      <Typography variant="h4">Sora Extensions</Typography>

      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={refreshExtensions}>
              Retry
            </Button>
          }
        >
          <AlertTitle>Failed to load extensions</AlertTitle>
          {error.message}
        </Alert>
      )}

      <SearchBar
        placeholder={t("searchExtensions")}
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        onClear={() => setFilterText("")}
      />

      {isLoading ? (
        <Typography>Loading...</Typography>
      ) : (
        Object.entries(groupedExtensions).map(([baseId, versions]) => (
          <SoraExtensionList
            key={baseId}
            baseId={baseId}
            versions={versions}
            onSelect={handleExtensionSelect}
          />
        ))
      )}
    </Stack>
  );
}
```

#### 2.2 フック実装

**ファイル**: `packages/suite-base/src/components/SoraExtensionSettings/hooks/useSoraExtensionSettings.ts`

```typescript
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import * as _ from "lodash-es";

import { SoraExtensionInfo } from "@lichtblick/suite-base/types/SoraExtensions";
import { SoraExtensionLoader } from "@lichtblick/suite-base/services/SoraExtensionLoader";

export function useSoraExtensionSettings(filterText: string) {
  const [extensions, setExtensions] = useState<SoraExtensionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [debouncedFilterText] = useDebounce(filterText, 300);

  const loader = useMemo(() => new SoraExtensionLoader(), []);

  const refreshExtensions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      const allExtensions = await loader.getExtensions();
      setExtensions(allExtensions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    refreshExtensions();
  }, [refreshExtensions]);

  const groupedExtensions = useMemo(() => {
    const filtered = extensions.filter(
      (ext) =>
        ext.name.toLowerCase().includes(debouncedFilterText.toLowerCase()) ||
        ext.displayName.toLowerCase().includes(debouncedFilterText.toLowerCase()) ||
        ext.description?.toLowerCase().includes(debouncedFilterText.toLowerCase()),
    );

    return _.groupBy(filtered, "baseId");
  }, [extensions, debouncedFilterText]);

  return {
    groupedExtensions,
    isLoading,
    error,
    refreshExtensions,
  };
}
```

### Phase 3: マーケットプレイス連携 (2-3週間)

#### 3.1 Soraマーケットプレイス プロバイダー

**ファイル**: `packages/suite-base/src/providers/SoraMarketplaceProvider.tsx`

```typescript
import React, { useCallback } from "react";
import { useShallowMemo } from "@lichtblick/hooks";
import { SoraMarketplaceContext, SoraExtensionMarketplaceDetail } from "../context/SoraMarketplaceContext";

// Soraマーケットプレイス専用URL
const SORA_MARKETPLACE_URL =
  process.env.SORA_MARKETPLACE_URL ??
  "https://api.sora-extensions.example.com/api/extensions";

export default function SoraMarketplaceProvider({
  children,
}: React.PropsWithChildren): React.JSX.Element {

  const getAvailableExtensions = useCallback(async (): Promise<SoraExtensionMarketplaceDetail[]> => {
    const res = await fetch(SORA_MARKETPLACE_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch Sora extensions: ${res.statusText}`);
    }

    const catalog = await res.json();

    // カタログ形式を配列形式に変換
    const extensions: SoraExtensionMarketplaceDetail[] = [];

    for (const [baseId, extensionData] of Object.entries(catalog.extensions)) {
      for (const [version, versionData] of Object.entries(extensionData.versions)) {
        extensions.push({
          ...extensionData,
          ...versionData,
          id: `${baseId}@${version}`,
          baseId,
          namespace: "sora-local",
        });
      }
    }

    return extensions;
  }, []);

  const getMarkdown = useCallback(async (url: string): Promise<string> => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch markdown: ${res.statusText}`);
    }
    return await res.text();
  }, []);

  const marketplace = useShallowMemo({
    getAvailableExtensions,
    getMarkdown,
  });

  return (
    <SoraMarketplaceContext.Provider value={marketplace}>
      {children}
    </SoraMarketplaceContext.Provider>
  );
}
```

### Phase 4: 統合・テスト (1週間)

#### 4.1 アプリケーション統合

**ファイル**: `packages/suite-base/src/StudioApp.tsx` への追加

```typescript
// 既存のインポートに追加
import SoraMarketplaceProvider from "./providers/SoraMarketplaceProvider";
import { SoraExtensionLoader } from "./services/SoraExtensionLoader";

// StudioApp内でプロバイダーを追加
function StudioApp(): JSX.Element {
  // 既存のextension loadersに追加
  const extensionLoaders = useMemo(() => [
    ...existingLoaders,
    new SoraExtensionLoader(),
  ], [existingLoaders]);

  return (
    <ExtensionMarketplaceProvider>
      <SoraMarketplaceProvider>
        <ExtensionCatalogProvider loaders={extensionLoaders}>
          {/* 既存のコンテンツ */}
        </ExtensionCatalogProvider>
      </SoraMarketplaceProvider>
    </ExtensionMarketplaceProvider>
  );
}
```

#### 4.2 設定画面統合

**ファイル**: `packages/suite-base/src/components/AppSettingsDialog/AppSettingsDialog.tsx`

```typescript
// 設定タブに"Sora Extensions"を追加
import SoraExtensionSettings from "../SoraExtensionSettings";

const SETTINGS_TABS = [
  // 既存のタブ...
  { value: "sora-extensions", label: "Sora Extensions" },
];

// TabPanelにSoraExtensionSettingsを追加
{value === "sora-extensions" && <SoraExtensionSettings />}
```

## 3. ファイル構造

```
packages/suite-base/src/
├── types/
│   └── SoraExtensions.ts                    # 型定義
├── services/
│   ├── SoraExtensionStorage.ts             # ストレージ実装
│   └── SoraExtensionLoader.ts              # ローダー実装
├── providers/
│   └── SoraMarketplaceProvider.tsx         # マーケットプレイスプロバイダー
├── context/
│   └── SoraMarketplaceContext.ts           # Contextの定義
├── components/
│   └── SoraExtensionSettings/              # UI コンポーネント
│       ├── index.tsx                       # メイン設定画面
│       ├── hooks/
│       │   └── useSoraExtensionSettings.ts # フック
│       └── components/
│           ├── SoraExtensionList.tsx       # 拡張機能リスト
│           ├── SoraExtensionDetails.tsx    # 詳細ページ
│           └── SoraVersionManager.tsx      # バージョン管理
└── __tests__/
    └── sora-extensions/                    # テストファイル
        ├── SoraExtensionLoader.test.ts
        ├── SoraExtensionStorage.test.ts
        └── components/
```

## 4. テスト戦略

### 4.1 ユニットテスト

**重要テストケース**:

- バージョン付きID生成・解析
- 複数バージョンインストール
- アクティブバージョン切り替え
- ストレージのCRUD操作
- エラーハンドリング

### 4.2 統合テスト

**シナリオ**:

1. 新規拡張機能インストール
2. 同一拡張機能の異なるバージョンインストール
3. バージョン切り替え
4. 旧バージョン削除
5. 全バージョン削除

### 4.3 E2Eテスト

**ユーザーフロー**:

1. Sora Extensions設定画面を開く
2. マーケットプレイスから拡張機能を検索
3. 複数バージョンをインストール
4. アクティブバージョンを切り替え
5. 拡張機能が正常に動作することを確認

## 5. デプロイメント計画

### 5.1 段階的リリース

**Stage 1: Beta版**

- 限定ユーザーでのテスト
- 基本機能のみ（インストール・アンインストール）

**Stage 2: RC版**

- 社内全体でのテスト
- バージョン管理機能追加

**Stage 3: Production**

- 一般リリース
- マーケットプレイス連携

### 5.2 フィーチャーフラグ

```typescript
// 機能の段階的有効化
const FEATURE_FLAGS = {
  SORA_EXTENSIONS_ENABLED: process.env.SORA_EXTENSIONS_ENABLED === "true",
  SORA_MARKETPLACE_ENABLED: process.env.SORA_MARKETPLACE_ENABLED === "true",
  SORA_VERSION_MANAGEMENT: process.env.SORA_VERSION_MANAGEMENT === "true",
};
```

## 6. 運用・監視

### 6.1 ログ・メトリクス

```typescript
// 重要イベントのログ出力
enum SoraExtensionEvents {
  INSTALL = "sora_extension_install",
  UNINSTALL = "sora_extension_uninstall",
  VERSION_SWITCH = "sora_extension_version_switch",
  LOAD_ERROR = "sora_extension_load_error",
}

// 使用例
log.info(SoraExtensionEvents.INSTALL, {
  baseId: extension.baseId,
  version: extension.version,
  installDate: extension.installDate.toISOString(),
});
```

### 6.2 エラー処理

```typescript
// 統一エラーハンドリング
export class SoraExtensionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly baseId?: string,
    public readonly version?: string,
  ) {
    super(message);
    this.name = "SoraExtensionError";
  }
}

// エラーコード
export enum SoraExtensionErrorCodes {
  INVALID_PACKAGE = "INVALID_PACKAGE",
  VERSION_CONFLICT = "VERSION_CONFLICT",
  STORAGE_ERROR = "STORAGE_ERROR",
  LOAD_ERROR = "LOAD_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}
```

## 7. マイグレーション戦略

### 7.1 既存システムからの移行

```typescript
// 既存拡張機能の自動検出・移行オプション
export class SoraMigrationService {
  async migrateFromLegacyExtensions(): Promise<void> {
    const legacyExtensions = await this.detectLegacyExtensions();

    for (const legacy of legacyExtensions) {
      const confirmation = await this.confirmMigration(legacy);
      if (confirmation) {
        await this.migrateSingleExtension(legacy);
      }
    }
  }

  private async migrateSingleExtension(legacy: ExtensionInfo): Promise<void> {
    // レガシー拡張機能をSora形式に変換
    // バージョン情報の推定・補完
    // 新しいストレージに保存
  }
}
```

### 7.2 データフォーマット移行

- IndexedDBスキーマのバージョニング
- 下位互換性の確保
- 段階的データ移行

## 8. 成功指標 (KPI)

### 8.1 技術指標

- **インストール成功率**: 95%以上
- **バージョン切り替え応答時間**: 500ms以下
- **ストレージ使用効率**: 旧システム比20%改善

### 8.2 ユーザー指標

- **複数バージョン利用率**: 30%以上
- **拡張機能採用率**: 既存システム比50%増
- **ユーザー満足度**: 4.0/5.0以上

## 9. リスク対策

### 9.1 技術リスク

- **IndexedDB容量制限**: 警告システム・自動クリーンアップ
- **メモリリーク**: 適切なライフサイクル管理
- **パフォーマンス劣化**: 遅延読み込み・キャッシュ戦略

### 9.2 運用リスク

- **データ損失**: 自動バックアップ・復旧機能
- **互換性問題**: 徹底したテスト・段階的ロールアウト
- **セキュリティ**: ハッシュ検証・署名確認

---

この実装計画に従って開発を進めることで、既存Lichtblickとの互換性を保ちながら、Sora独自の複数バージョン対応拡張機能システムを構築できる。段階的な実装により、リスクを最小化しながら確実に機能を追加していくことが可能である。
