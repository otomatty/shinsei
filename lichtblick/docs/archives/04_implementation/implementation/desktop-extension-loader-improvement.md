# デスクトップ版拡張機能ローダーの改善提案

> **関連ドキュメント**:
>
> - [マーケットプレイス拡張機能永続化問題のトラブルシューティング](/docs/troubleshooting/marketplace-extension-persistence-issue.md) - 問題の詳細な調査結果
> - [拡張機能とレイアウトの読み込み機構](/docs/technical/extension-and-layout-loading.md) - namespace変更が既存機能に影響しない理由

---

## 修正方針

### 現在の問題

- デスクトップ版でIdbExtensionLoaderとDesktopExtensionLoaderが混在
- 各環境に最適なストレージが使われていない
- マーケットプレイスからインストールした拡張機能が再起動後に消える

### 改善後

- **デスクトップ版**: ファイルシステムのみ使用
- **Web版**: IndexedDBのみ使用
- マーケットプレイス拡張機能が正しく永続化される

---

## 実装方法

### 方法1: DesktopExtensionLoaderをnamespace対応に（推奨）

#### 1-1: DesktopExtensionLoaderの修正

**ファイル**: `packages/suite-desktop/src/renderer/services/DesktopExtensionLoader.ts`

```typescript
export class DesktopExtensionLoader implements IExtensionLoader {
  #bridge?: Desktop;
  public readonly namespace: Namespace;
  public readonly type: TypeExtensionLoader = "filesystem";

  // namespaceをコンストラクタで受け取る
  public constructor(bridge: Desktop, namespace: Namespace) {
    this.#bridge = bridge;
    this.namespace = namespace;
  }

  // 他のメソッドは変更なし（namespaceをExtensionHandlerに渡す）
  // ...
}
```

#### 1-2: ExtensionHandlerの修正

**ファイル**: `packages/suite-desktop/src/preload/ExtensionHandler.ts`

```typescript
export class ExtensionsHandler {
  private readonly log = Logger.getLogger(__filename);
  private readonly baseExtensionsDir: string = "";
  private readonly namespace: string; // 追加

  public constructor(baseDir: string, namespace: string) {
    this.baseExtensionsDir = baseDir;
    this.namespace = namespace;
    // namespaceごとのサブディレクトリを使用
    this.log.debug("[extension]", `Using directory: ${this.getExtensionsDir()}`);
  }

  // namespaceごとのディレクトリパスを取得
  private getExtensionsDir(): string {
    return pathJoin(this.baseExtensionsDir, this.namespace);
  }

  public async list(): Promise<DesktopExtension[]> {
    const extensionsDir = this.getExtensionsDir();
    if (!existsSync(extensionsDir)) {
      return [];
    }
    // 既存の実装を extensionsDir に対して実行
    // ...
  }

  // install, uninstall なども同様に getExtensionsDir() を使用
}
```

#### 1-3: Preloadの修正

**ファイル**: `packages/suite-desktop/src/preload/index.ts`

```typescript
const getExtensionHandler = async (namespace: string): Promise<ExtensionsHandler> => {
  const homePath = (await ipcRenderer.invoke("getHomePath")) as string;
  const baseExtensionsDir = pathJoin(homePath, ".lichtblick-suite", "extensions");

  // namespaceごとにハンドラーを作成（キャッシュ可能）
  return new ExtensionsHandler(baseExtensionsDir, namespace);
};

const desktopBridge: Desktop = {
  // ...
  async getExtensions(namespace?: string) {
    const ns = namespace ?? "local";
    const handler = await getExtensionHandler(ns);
    return await handler.list();
  },
  async loadExtension(id: string, namespace?: string) {
    const ns = namespace ?? "local";
    const handler = await getExtensionHandler(ns);
    return await handler.load(id);
  },
  async installExtension(foxeFileData: Uint8Array, namespace?: string) {
    const ns = namespace ?? "local";
    const handler = await getExtensionHandler(ns);
    return await handler.install(foxeFileData);
  },
  async uninstallExtension(id: string, namespace?: string): Promise<boolean> {
    const ns = namespace ?? "local";
    const handler = await getExtensionHandler(ns);
    return await handler.uninstall(id);
  },
};
```

#### 1-4: DesktopExtensionLoaderの修正（続き）

```typescript
export class DesktopExtensionLoader implements IExtensionLoader {
  #bridge?: Desktop;
  public readonly namespace: Namespace;
  public readonly type: TypeExtensionLoader = "filesystem";

  public constructor(bridge: Desktop, namespace: Namespace) {
    this.#bridge = bridge;
    this.namespace = namespace;
  }

  public async getExtensions(): Promise<ExtensionInfo[]> {
    const extensionList = (await this.#bridge?.getExtensions(this.namespace)) ?? [];
    log.debug(`Loaded ${extensionList.length} extension(s) from ${this.namespace}`);

    const extensions = extensionList.map((extension: DesktopExtension): ExtensionInfo => {
      const pkgInfo = extension.packageJson as ExtensionInfo;
      return {
        ...pkgInfo,
        id: extension.id,
        name: pkgInfo.displayName,
        namespace: this.namespace, // 正しいnamespaceを設定
        qualifiedName: pkgInfo.displayName,
        readme: extension.readme,
        changelog: extension.changelog,
      };
    });

    return extensions;
  }

  public async loadExtension(id: string): Promise<LoadedExtension> {
    if (!this.#bridge) {
      throw new Error("Cannot load extension without a desktopBridge");
    }
    return await this.#bridge.loadExtension(id, this.namespace);
  }

  public async installExtension({ foxeFileData }: InstallExtensionProps): Promise<ExtensionInfo> {
    if (this.#bridge == undefined) {
      throw new Error(`Cannot install extension without a desktopBridge`);
    }

    const extension: DesktopExtension = await this.#bridge.installExtension(
      foxeFileData,
      this.namespace,
    );
    const pkgInfo = extension.packageJson as ExtensionInfo;

    return {
      ...pkgInfo,
      id: extension.id,
      name: pkgInfo.displayName,
      namespace: this.namespace,
      qualifiedName: pkgInfo.displayName,
      readme: extension.readme,
      changelog: extension.changelog,
    };
  }

  public async uninstallExtension(id: string): Promise<void> {
    await this.#bridge?.uninstallExtension(id, this.namespace);
  }
}
```

#### 1-5: Root.tsxの修正

**ファイル**: `packages/suite-desktop/src/renderer/Root.tsx`

```typescript
const [extensionLoaders] = useState(() => [
  // IdbExtensionLoaderを削除
  // new IdbExtensionLoader("org"),
  // new IdbExtensionLoader("official"),

  // DesktopExtensionLoaderを3つのnamespaceで作成
  new DesktopExtensionLoader(desktopBridge, "org"),
  new DesktopExtensionLoader(desktopBridge, "official"),
  new DesktopExtensionLoader(desktopBridge, "local"),
]);
```

---

### 方法2: 単一のマルチnamespace対応ローダー（代替案）

`IExtensionLoader`インターフェースを拡張する必要があるため、より複雑です。

---

## ディレクトリ構造

### 修正後

```
~/.lichtblick-suite/extensions/
├── org/
│   └── system.extension-1.0.0/
│       ├── package.json
│       └── extension.js
├── official/
│   ├── marketplace.ext1-1.0.0/
│   │   ├── package.json
│   │   └── extension.js
│   └── marketplace.ext2-2.0.0/
│       ├── package.json
│       └── extension.js
└── local/
    └── custom.extension-1.0.0/
        ├── package.json
        └── extension.js
```

---

## 修正のメリット

### デスクトップ版

✅ ファイルシステムのみ使用（ネイティブストレージ）
✅ 直接ファイルを確認・編集可能
✅ バックアップ・共有が容易
✅ IndexedDBの容量制限を回避

### Web版

✅ IndexedDBのみ使用（適切なストレージ）
✅ ブラウザ環境に最適化
✅ オフライン対応

---

## 実装手順

1. ✅ ExtensionHandlerを namespace 対応に修正
2. ✅ Preloadの bridge メソッドに namespace パラメータを追加
3. ✅ DesktopExtensionLoaderに namespace パラメータを追加
4. ✅ Root.tsxでIdbExtensionLoaderを削除、DesktopExtensionLoaderを3つ作成
5. ✅ Web版に IdbExtensionLoader("official") を追加
6. ✅ refreshAllExtensions のフィルタリングを削除

---

## テスト

### デスクトップ版

```bash
# ディレクトリ構造を確認
ls -la ~/.lichtblick-suite/extensions/
ls -la ~/.lichtblick-suite/extensions/org/
ls -la ~/.lichtblick-suite/extensions/official/
ls -la ~/.lichtblick-suite/extensions/local/

# マーケットプレイスからインストール
# → ~/.lichtblick-suite/extensions/official/ に保存される

# 再起動
# → official から正常にロード
```

### Web版

```javascript
// IndexedDBを確認
const dbs = await indexedDB.databases();
console.log(dbs);
// → extensions-official が存在する

// マーケットプレイスからインストール
// → extensions-official に保存される

// リロード
// → extensions-official から正常にロード
```

---

## マイグレーション

### 既存データの移行

デスクトップ版で既にIndexedDBにインストールされている拡張機能を、ファイルシステムに移行：

```typescript
// packages/suite-desktop/src/renderer/Root.tsx

async function migrateIndexedDBToFileSystem() {
  const migrationKey = "extensions_migration_idb_to_fs_v1";
  const migrated = localStorage.getItem(migrationKey);

  if (migrated === "true") {
    return;
  }

  try {
    // IndexedDBから拡張機能を取得
    const idbLoader = new IdbExtensionLoader("official");
    const extensions = await idbLoader.getExtensions();

    if (extensions.length === 0) {
      localStorage.setItem(migrationKey, "true");
      return;
    }

    log.info(`[Migration] Migrating ${extensions.length} extensions from IndexedDB to FileSystem`);

    // DesktopExtensionLoaderに移行
    const fsLoader = new DesktopExtensionLoader(desktopBridge, "official");

    for (const ext of extensions) {
      try {
        // IndexedDBからロード
        const { raw, buffer } = await idbLoader.loadExtension(ext.id);

        if (!buffer) {
          log.warn(`[Migration] No buffer for ${ext.id}, skipping`);
          continue;
        }

        // ファイルシステムにインストール
        await fsLoader.installExtension({ foxeFileData: buffer });
        log.info(`[Migration] Migrated ${ext.id} to FileSystem`);

        // IndexedDBから削除
        await idbLoader.uninstallExtension(ext.id);
      } catch (err) {
        log.error(`[Migration] Failed to migrate ${ext.id}:`, err);
      }
    }

    localStorage.setItem(migrationKey, "true");
    log.info(`[Migration] Migration completed`);
  } catch (err) {
    log.error("[Migration] Migration failed:", err);
  }
}

// useEffect で実行
useEffect(() => {
  void migrateIndexedDBToFileSystem();
}, []);
```

---

## まとめ

### 変更点

1. **デスクトップ版**: IdbExtensionLoaderを削除、DesktopExtensionLoaderのみ使用
2. **DesktopExtensionLoader**: namespace対応に拡張
3. **ExtensionHandler**: namespaceごとのサブディレクトリを使用
4. **Web版**: IdbExtensionLoader("official")を追加
5. **共通**: refreshAllExtensionsのフィルタリングを削除

### メリット

- 各環境に最適なストレージを使用
- デスクトップ版はファイルシステムで管理しやすい
- Web版はブラウザに適したIndexedDB
- namespace対応により拡張性が向上
