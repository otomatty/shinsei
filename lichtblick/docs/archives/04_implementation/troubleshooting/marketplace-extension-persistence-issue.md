# マーケットプレイス拡張機能の永続化問題

## 問題の概要

マーケットプレイスから拡張機能をインストールすると、インストール成功の通知が表示され、UI上も「Installed」に新しくインストールした拡張機能が登録されるが、デスクトップ版を再起動すると、インストールしたはずの拡張機能が消えてしまう。

**発生環境**: デスクトップ版 (Electron)
**発生日**: 2025年10月4日
**影響範囲**: マーケットプレイスからインストールしたすべての拡張機能

---

## 調査結果

### アーキテクチャ概要

現在のマーケットプレイス機能は以下の3層構造で実装されています:

```
┌─────────────────────────────────────────────────────────┐
│ UI Layer                                                │
│ ExtensionMarketplaceSettings.tsx                        │
│ - マーケットプレイスのUI表示                                │
│ - インストール/アンインストール操作                          │
└─────────────────────────────────────────────────────────┘
                          ↓↑
┌─────────────────────────────────────────────────────────┐
│ Business Logic Layer                                    │
│ ExtensionCatalogProvider.tsx                            │
│ - 拡張機能の状態管理 (Zustand)                            │
│ - インストール/ロードの統合処理                             │
└─────────────────────────────────────────────────────────┘
                          ↓↑
┌─────────────────────────────────────────────────────────┐
│ Persistence Layer                                       │
│ - IdbExtensionLoader (IndexedDB)                        │
│ - DesktopExtensionLoader (File System)                  │
│ - RemoteExtensionLoader (Server API)                    │
└─────────────────────────────────────────────────────────┘
```

### インストールフロー

#### 1. UI層でのインストール開始

**ファイル**: `packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx`

```typescript
const handleInstall = async (extension: GroupedExtensionData, version?: string) => {
  // 1. マーケットプレイスエントリから対象拡張機能を検索
  let marketplaceEntry = marketplaceEntries.value?.find(
    (entry) => entry.id === extensionId && entry.version === targetVersion,
  );

  // 2. namespace を決定 (デフォルトは "official")
  const targetNamespace = (marketplaceEntry.namespace ?? "official") as "local" | "official";

  // 3. 拡張機能をダウンロード
  const buffer = await downloadExtension(marketplaceEntry.foxe);

  // 4. 拡張機能をインストール
  const results = await installExtensions(targetNamespace, [
    { buffer, namespace: targetNamespace },
  ]);
};
```

**ポイント**: マーケットプレイスからの拡張機能は **`official` namespace** に保存される

#### 2. ビジネスロジック層でのインストール処理

**ファイル**: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`

```typescript
const installExtensions = async (namespace: Namespace, extensions: ExtensionData[]) => {
  // 指定されたnamespaceに対応するローダーを取得
  const namespaceLoaders = loaders.filter((loader) => loader.namespace === namespace);

  // 各ローダーに対してインストールを試行
  for (const loader of sortedLoaders) {
    try {
      // ローダー固有のインストール処理
      const info = await loader.installExtension({
        foxeFileData: extension.buffer,
        file: extension.file,
        externalId: loader.type === "server" ? undefined : externalId,
      });

      // 成功した場合、状態をマージ
      const contributionPoints = buildContributionPoints(info, unwrappedExtensionSource);
      get().mergeState(info, contributionPoints);
      get().markExtensionAsInstalled(info.id);
    } catch (error) {
      // エラーハンドリング
    }
  }
};
```

#### 3. 永続化層での保存

デスクトップ版では以下の3つのローダーが登録されています:

**ファイル**: `packages/suite-desktop/src/renderer/Root.tsx`

```typescript
const [extensionLoaders] = useState(() => [
  new IdbExtensionLoader("org"), // namespace: "org", type: "browser"
  new IdbExtensionLoader("official"), // namespace: "official", type: "browser"
  new DesktopExtensionLoader(bridge), // namespace: "local", type: "filesystem"
]);
```

##### a. IndexedDB への保存

**ファイル**: `packages/suite-base/src/services/extension/IdbExtensionLoader.ts`

```typescript
public async installExtension({ foxeFileData, externalId }: InstallExtensionProps) {
  // 1. FOXEファイルを解凍
  const decompressedData = await decompressFile(foxeFileData);

  // 2. package.json を抽出・パース
  const rawPackageFile = await extractFoxeFileContent(decompressedData, "package.json");
  const rawInfo = validatePackageInfo(JSON.parse(rawPackageFile));

  // 3. README と CHANGELOG を抽出
  const readme = await extractFoxeFileContent(decompressedData, "README.md") ?? "";
  const changelog = await extractFoxeFileContent(decompressedData, "CHANGELOG.md") ?? "";

  // 4. IndexedDB に保存
  const newExtension: StoredExtension = {
    content: foxeFileData,  // バイナリデータをそのまま保存
    info: {
      ...rawInfo,
      id: `${normalizedPublisher}.${rawInfo.name}`,
      namespace: this.namespace,  // "official" が設定される
      qualifiedName: qualifiedName(this.namespace, normalizedPublisher, rawInfo),
      readme,
      changelog,
      externalId,
    },
  };

  await this.#storage.put(newExtension);
  return storedExtension.info;
}
```

**保存先**: IndexedDB → `extensions-{namespace}` データベース
**保存内容**: FOXEファイル全体のバイナリデータ + メタデータ

##### b. ファイルシステムへの保存

**ファイル**: `packages/suite-desktop/src/preload/ExtensionHandler.ts`

```typescript
public async install(foxeFileData: Uint8Array) {
  // 1. ZIPファイルとして展開
  const archive = await JSZip.loadAsync(foxeFileData);

  // 2. package.json を取得してパース
  const pkgJson = JSON.parse(await archive.files["package.json"].async("string"));
  const packageId = ExtensionsHandler.getPackageId(pkgJson);

  // 3. ディレクトリ名を生成
  const dir = `${packageId}-${pkgJson.version}`;
  const extensionBaseDir = pathJoin(
    this.userExtensionsDir,  // ~/.lichtblick-suite/extensions
    dir
  );

  // 4. 既存ディレクトリを削除して再作成
  await rm(extensionBaseDir, { recursive: true, force: true });
  await mkdir(extensionBaseDir, { recursive: true });

  // 5. すべてのファイルを展開
  for (const [relPath, zipObj] of Object.entries(archive.files)) {
    const filePath = pathJoin(extensionBaseDir, relPath);
    if (!zipObj.dir) {
      const fileData = await zipObj.async("uint8array");
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, fileData);
    }
  }

  return { id: packageId, packageJson: pkgJson, directory: extensionBaseDir };
}
```

**保存先**: `~/.lichtblick-suite/extensions/{publisher}.{name}-{version}/`
**保存内容**: 展開されたすべてのファイル (package.json, extension.js, README.md など)

#### 4. メモリ上の状態更新

```typescript
// ExtensionCatalogProvider.tsx

// インストール済みとしてマーク (メモリ上のSetに追加)
const markExtensionAsInstalled = (extensionId: string) => {
  const updatedExtensions = new Set(get().loadedExtensions);
  updatedExtensions.add(extensionId);
  set({ loadedExtensions: updatedExtensions }); // ⚠️ メモリ上のみ
};

// インストール状態の確認
const isExtensionInstalled = (extensionId: string) => {
  return get().loadedExtensions.has(extensionId); // ⚠️ メモリ上のSetのみ参照
};
```

**問題点**: `loadedExtensions` は Zustand の state で、メモリ上のみに存在。永続化されていない。

---

### 再起動時のロードフロー

#### 1. アプリケーション起動

**ファイル**: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`

```typescript
export function ExtensionCatalogProvider({ children, loaders }: Props) {
  const store = useMemo(() => createExtensionRegistryStore(loaders, undefined), [loaders]);

  useEffect(() => {
    const refresh = async () => {
      await store.getState().refreshAllExtensions();
    };
    void refresh();
  }, [store]);

  return (
    <ExtensionCatalogContext.Provider value={store}>
      {children}
    </ExtensionCatalogContext.Provider>
  );
}
```

#### 2. 全拡張機能のリフレッシュ

**ファイル**: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx` (L285付近)

```typescript
const refreshAllExtensions = async () => {
  log.debug("Refreshing all extensions");

  const installedExtensions: ExtensionInfo[] = [];
  const contributionPoints: ContributionPoints = {
    messageConverters: [],
    panels: {},
    panelSettings: {},
    topicAliasFunctions: [],
    cameraModels: new Map(),
  };

  // 各ローダーから拡張機能を取得
  const processLoader = async (loader: IExtensionLoader) => {
    try {
      const extensions = await loader.getExtensions();
      await loadInBatch({
        batch: extensions,
        contributionPoints,
        installedExtensions,
        loader,
      });
    } catch (err: unknown) {
      log.error("Error loading extension list", err);
    }
  };

  // ⚠️ ここが問題: ローダーをフィルタリングしている
  const localAndRemoteLoaders = loaders.filter(
    (loader) => loader.namespace === "local" || loader.type === "server",
  );

  await Promise.all(localAndRemoteLoaders.map(processLoader));

  // ストアを更新
  set({
    installedExtensions,
    installedPanels: contributionPoints.panels,
    installedMessageConverters: contributionPoints.messageConverters,
    installedTopicAliasFunctions: contributionPoints.topicAliasFunctions,
    installedCameraModels: contributionPoints.cameraModels,
    panelSettings: contributionPoints.panelSettings,
  });
};
```

---

## 🔴 根本原因

### 1. フィルタリングロジックの不備

**ファイル**: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx` (L313付近)

```typescript
const localAndRemoteLoaders = loaders.filter(
  (loader) => loader.namespace === "local" || loader.type === "server",
);
```

このフィルタリング条件により、以下のローダーが**除外**されます:

| ローダー                         | namespace    | type           | フィルタリング結果 |
| -------------------------------- | ------------ | -------------- | ------------------ |
| `IdbExtensionLoader("org")`      | `"org"`      | `"browser"`    | ❌ **除外**        |
| `IdbExtensionLoader("official")` | `"official"` | `"browser"`    | ❌ **除外**        |
| `DesktopExtensionLoader`         | `"local"`    | `"filesystem"` | ✅ 含まれる        |

### 2. デスクトップ版でのストレージの不適切な使用

デスクトップ版では、ファイルシステムを使用できるにも関わらず、ブラウザ向けのIndexedDBを併用しています。

**現在の構成**:

```typescript
// packages/suite-desktop/src/renderer/Root.tsx
const [extensionLoaders] = useState(() => [
  new IdbExtensionLoader("org"), // IndexedDB (ブラウザ向け)
  new IdbExtensionLoader("official"), // IndexedDB (ブラウザ向け)
  new DesktopExtensionLoader(bridge), // ファイルシステム (デスクトップ向け)
]);
```

**問題点**:

- デスクトップ版でIndexedDBを使う必然性がない
- ファイルシステムの方が管理・バックアップが容易
- 2つのストレージシステムが混在して複雑化

### 3. DesktopExtensionLoaderが単一namespaceのみ対応

**現在の実装**:

```typescript
// packages/suite-desktop/src/renderer/services/DesktopExtensionLoader.ts
export class DesktopExtensionLoader implements IExtensionLoader {
  public readonly namespace: Namespace = "local"; // ハードコード
  public readonly type: TypeExtensionLoader = "filesystem";
  // ...
}
```

`IExtensionLoader`インターフェースが`readonly namespace`を要求するため、1つのインスタンスは1つのnamespaceしか扱えません。

### 問題の流れ

```
┌─────────────────────────────────────────────────────────┐
│ インストール時                                             │
├─────────────────────────────────────────────────────────┤
│ 1. マーケットプレイスから拡張機能をダウンロード              │
│ 2. namespace = "official" でインストール                   │
│ 3. IdbExtensionLoader("official") に保存 ✅               │
│ 4. DesktopExtensionLoader("local") に保存 ✅              │
│ 5. メモリ上の loadedExtensions に追加 ✅                  │
│ 6. UI上で "Installed" と表示される ✅                      │
└─────────────────────────────────────────────────────────┘
                          ↓
                     【再起動】
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 再起動時                                                  │
├─────────────────────────────────────────────────────────┤
│ 1. refreshAllExtensions() が実行される                    │
│ 2. ローダーをフィルタリング:                                │
│    namespace === "local" OR type === "server"            │
│                                                          │
│    → IdbExtensionLoader("official") が除外される ❌       │
│                                                          │
│ 3. DesktopExtensionLoader("local") からのみロード         │
│    → マーケットプレイスの拡張機能は "official" に保存       │
│       されているため見つからない ❌                         │
│                                                          │
│ 4. loadedExtensions Set は空のまま ❌                     │
│ 5. UI上で拡張機能が表示されない ❌                         │
└─────────────────────────────────────────────────────────┘
```

### データは保存されている

重要なポイント: **拡張機能自体はIndexedDBとファイルシステムに正常に保存されています**

確認方法:

```javascript
// ブラウザのDevToolsで実行
const db = await indexedDB.databases();
console.log(db); // "extensions-official" が存在することを確認

// IndexedDBの中身を確認
const request = indexedDB.open("extensions-official");
request.onsuccess = (event) => {
  const db = event.target.result;
  const transaction = db.transaction(["extensions"], "readonly");
  const store = transaction.objectStore("extensions");
  const getAllRequest = store.getAll();
  getAllRequest.onsuccess = () => {
    console.log("Stored extensions:", getAllRequest.result);
  };
};
```

ファイルシステム:

```bash
ls -la ~/.lichtblick-suite/extensions/
# インストールした拡張機能のディレクトリが存在することを確認
```

---

## 🔧 解決策

### 解決策1: デスクトップ版をファイルシステムのみに統一 (推奨)

デスクトップ版では、IndexedDBを使わずに、ファイルシステムのみを使用する設計に変更します。

#### 1-1. DesktopExtensionLoaderをnamespace対応に

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
  // ...
}
```

#### 1-2. ExtensionHandlerをnamespaceごとのサブディレクトリ対応に

**ファイル**: `packages/suite-desktop/src/preload/ExtensionHandler.ts`

```typescript
export class ExtensionsHandler {
  private readonly baseExtensionsDir: string;
  private readonly namespace: string;

  public constructor(baseDir: string, namespace: string) {
    this.baseExtensionsDir = baseDir;
    this.namespace = namespace;
  }

  // namespaceごとのディレクトリパスを取得
  private getExtensionsDir(): string {
    return pathJoin(this.baseExtensionsDir, this.namespace);
  }
  // ...
}
```

**ディレクトリ構造**:

```
~/.lichtblick-suite/extensions/
├── org/
│   └── system.extension-1.0.0/
├── official/
│   └── marketplace.extension-1.0.0/
└── local/
    └── custom.extension-1.0.0/
```

#### 1-3. Root.tsxでIdbExtensionLoaderを削除

**ファイル**: `packages/suite-desktop/src/renderer/Root.tsx`

```typescript
// 修正前
const [extensionLoaders] = useState(() => [
  new IdbExtensionLoader("org"),
  new IdbExtensionLoader("official"),
  new DesktopExtensionLoader(desktopBridge),
]);

// 修正後
const [extensionLoaders] = useState(() => [
  new DesktopExtensionLoader(desktopBridge, "org"),
  new DesktopExtensionLoader(desktopBridge, "official"),
  new DesktopExtensionLoader(desktopBridge, "local"),
]);
```

#### 1-4. フィルタリングを削除

**ファイル**: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`

```typescript
// 修正前
const localAndRemoteLoaders = loaders.filter(
  (loader) => loader.namespace === "local" || loader.type === "server",
);
await Promise.all(localAndRemoteLoaders.map(processLoader));

// 修正後
await Promise.all(loaders.map(processLoader));
```

#### 1-5. Web版にIdbExtensionLoader("official")を追加

**ファイル**: `packages/suite-web/src/WebRoot.tsx`

```typescript
// 修正前
const [extensionLoaders] = useState(() => [
  new IdbExtensionLoader("org"),
  new IdbExtensionLoader("local"),
]);

// 修正後
const [extensionLoaders] = useState(() => [
  new IdbExtensionLoader("org"),
  new IdbExtensionLoader("official"),
  new IdbExtensionLoader("local"),
]);
```

**メリット**:

- ✅ デスクトップ版はファイルシステムのみで一貫性がある
- ✅ ファイルを直接確認・編集・バックアップが可能
- ✅ IndexedDBの容量制限を回避
- ✅ Web版はIndexedDBのみで適切なストレージを使用
- ✅ 各環境に最適化されたストレージ戦略

**デメリット**:

- 既存のIndexedDBに保存された拡張機能の移行が必要

---

### 解決策2: フィルタリングのみを修正 (一時的対応)

最小限の変更で問題を解決する場合。

**ファイル**: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`

```typescript
// すべてのローダーから拡張機能をロードする
await Promise.all(loaders.map(processLoader));
```

**メリット**:

- シンプルで最小限の変更
- すべてのnamespaceが動作する

**デメリット**:

- デスクトップ版でIndexedDBとファイルシステムが混在する問題は解決しない
- 根本的な設計の改善にはならない

---

## 🎯 推奨される修正

**解決策1 (デスクトップ版をファイルシステムのみに統一)** を推奨します。

### 理由

1. **環境に最適化**: 各環境で最適なストレージを使用
2. **管理性向上**: デスクトップ版ではファイルを直接確認可能
3. **一貫性**: 各環境で単一のストレージシステム
4. **将来性**: 拡張性の高い設計

### 実装手順

詳細な実装ガイドは `/docs/implementation/desktop-extension-loader-improvement.md` を参照してください。

1. ✅ ExtensionHandlerを namespace 対応に修正
2. ✅ Preloadの bridge メソッドに namespace パラメータを追加
3. ✅ DesktopExtensionLoaderに namespace パラメータを追加
4. ✅ Root.tsxでIdbExtensionLoaderを削除、DesktopExtensionLoaderを3つ作成
5. ✅ Web版に IdbExtensionLoader("official") を追加
6. ✅ refreshAllExtensions のフィルタリングを削除
7. ✅ IndexedDBからファイルシステムへのマイグレーション処理を追加

### 検証手順

1. **修正を適用**

   ```bash
   # ExtensionCatalogProvider.tsx を上記のように修正
   ```

2. **デスクトップ版をビルド**

   ```bash
   yarn desktop:serve
   yarn desktop:start
   ```

3. **マーケットプレイスから拡張機能をインストール**

   - マーケットプレイス画面を開く
   - 任意の拡張機能をインストール
   - "Installed" に表示されることを確認

4. **アプリケーションを再起動**

   - デスクトップ版を完全に終了
   - 再度起動

5. **拡張機能が保持されていることを確認**
   - マーケットプレイス画面の "Installed" タブを確認
   - インストールした拡張機能が表示されることを確認
   - 拡張機能が実際に動作することを確認

---

## 📝 追加の改善提案

### 1. インストール状態の判定ロジック改善

現在の実装では、`isExtensionInstalled` がメモリ上の `loadedExtensions` Set のみを参照しています。

```typescript
// 現在の実装
const isExtensionInstalled = (extensionId: string) => {
  return get().loadedExtensions.has(extensionId);
};
```

**改善案**: ローダーから実際にクエリする

```typescript
const isExtensionInstalled = async (extensionId: string): Promise<boolean> => {
  // メモリ上のキャッシュをチェック
  if (get().loadedExtensions.has(extensionId)) {
    return true;
  }

  // ローダーから実際に確認
  for (const loader of loaders) {
    const extension = await loader.getExtension(extensionId);
    if (extension) {
      return true;
    }
  }

  return false;
};
```

### 2. ロギングの強化

デバッグを容易にするため、詳細なログを追加:

```typescript
const refreshAllExtensions = async () => {
  log.info(`[ExtensionCatalog] Starting refresh with ${loaders.length} loaders`);

  for (const loader of loaders) {
    log.info(`[ExtensionCatalog] Loading from: namespace=${loader.namespace}, type=${loader.type}`);
    const extensions = await loader.getExtensions();
    log.info(`[ExtensionCatalog] Loaded ${extensions.length} extensions from ${loader.namespace}`);
  }

  log.info(`[ExtensionCatalog] Total loaded: ${installedExtensions.length} extensions`);
};
```

### 3. エラーハンドリングの改善

個別のローダーエラーがアプリケーション全体に影響しないように:

```typescript
const processLoader = async (loader: IExtensionLoader) => {
  try {
    const extensions = await loader.getExtensions();
    await loadInBatch({
      batch: extensions,
      contributionPoints,
      installedExtensions,
      loader,
    });
  } catch (err: unknown) {
    log.error(
      `[ExtensionCatalog] Failed to load extensions from ${loader.namespace} (${loader.type}):`,
      err,
    );
    // エラーを握りつぶして、他のローダーの処理を継続
  }
};
```

---

## 🧪 テストケース

修正後、以下のシナリオをテストする必要があります:

### 基本動作

- [ ] マーケットプレイスから拡張機能をインストールできる
- [ ] インストール後、"Installed" タブに表示される
- [ ] 再起動後も拡張機能が保持される
- [ ] 拡張機能が実際に動作する (パネルが表示されるなど)

### エッジケース

- [ ] 複数の拡張機能を連続してインストール
- [ ] 拡張機能をアンインストールして再インストール
- [ ] 異なる namespace の拡張機能が共存
- [ ] IndexedDB が無効な環境での動作
- [ ] ファイルシステムアクセスが制限された環境での動作

### 後方互換性

- [ ] 既存のローカル拡張機能が正常に動作
- [ ] 既存の org 拡張機能が正常に動作
- [ ] レイアウトに保存された拡張機能設定が保持される

---

## 📚 関連ドキュメント

### 実装ガイド

- [デスクトップ版拡張機能ローダーの改善提案](/docs/implementation/desktop-extension-loader-improvement.md) - **推奨される修正方法の詳細**
- [拡張機能とレイアウトの読み込み機構](/docs/technical/extension-and-layout-loading.md) - namespace変更の影響分析

---

## 📚 関連ファイル

### コア実装

| ファイル                                                                                 | 役割                 |
| ---------------------------------------------------------------------------------------- | -------------------- |
| `packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx` | マーケットプレイスUI |
| `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`                         | 拡張機能の状態管理   |
| `packages/suite-base/src/context/ExtensionCatalogContext.ts`                             | 型定義とContext      |

### ローダー実装

| ファイル                                                                 | 役割                            |
| ------------------------------------------------------------------------ | ------------------------------- |
| `packages/suite-base/src/services/extension/IExtensionLoader.ts`         | ローダーインターフェース        |
| `packages/suite-base/src/services/extension/IdbExtensionLoader.ts`       | IndexedDB ローダー              |
| `packages/suite-desktop/src/renderer/services/DesktopExtensionLoader.ts` | デスクトップローダー (ブリッジ) |
| `packages/suite-desktop/src/preload/ExtensionHandler.ts`                 | ファイルシステム操作            |

### 初期化

| ファイル                                       | 役割                         |
| ---------------------------------------------- | ---------------------------- |
| `packages/suite-desktop/src/renderer/Root.tsx` | デスクトップ版のローダー登録 |
| `packages/suite-web/src/WebRoot.tsx`           | Web版のローダー登録          |

---

## 🔍 デバッグ方法

### IndexedDB の確認

Chrome DevTools を開いて:

```javascript
// データベース一覧
await indexedDB.databases();

// 特定のデータベースを開く
const request = indexedDB.open("extensions-official");
request.onsuccess = (event) => {
  const db = event.target.result;
  const transaction = db.transaction(["extensions"], "readonly");
  const store = transaction.objectStore("extensions");
  const getAllRequest = store.getAll();
  getAllRequest.onsuccess = () => {
    console.table(
      getAllRequest.result.map((ext) => ({
        id: ext.info.id,
        name: ext.info.displayName,
        version: ext.info.version,
        namespace: ext.info.namespace,
      })),
    );
  };
};
```

### ファイルシステムの確認

```bash
# 拡張機能ディレクトリの確認
ls -la ~/.lichtblick-suite/extensions/

# 特定の拡張機能の内容確認
cat ~/.lichtblick-suite/extensions/{publisher}.{name}-{version}/package.json
```

### ログの確認

DevTools Console で以下のログを確認:

- `[ExtensionCatalog]` で始まるログ
- `[IndexedDB]` で始まるログ
- `[extension]` で始まるログ

---

## 📊 影響分析

### 修正の影響範囲

| 項目           | 影響                          | リスク |
| -------------- | ----------------------------- | ------ |
| 既存の拡張機能 | なし                          | 低     |
| パフォーマンス | 微増 (すべてのローダーを処理) | 低     |
| データ整合性   | 改善                          | なし   |
| 後方互換性     | 維持                          | なし   |

### パフォーマンス考察

- **現在**: 2つのローダーのみ処理
- **修正後**: 3つのローダーを処理
- **増加**: 1ローダー分 (IndexedDB読み込み)
- **影響**: 起動時のみ、数ミリ秒程度の増加

IndexedDBの読み込みは非同期で高速なため、体感できるパフォーマンス低下はないと予想されます。

---

## 📅 タイムライン

- **2025年10月4日**: 問題発見・調査
- **2025年10月4日**: 根本原因特定
- **2025年10月4日**: ドキュメント作成

---

## ✅ チェックリスト

修正実装時:

- [ ] `ExtensionCatalogProvider.tsx` のフィルタリングロジックを修正
- [ ] ビルドが成功することを確認
- [ ] 基本動作テストを実施
- [ ] エッジケーステストを実施
- [ ] ログ出力を確認
- [ ] コードレビューを実施
- [ ] ドキュメントを更新

---

## 🎓 学んだこと

1. **永続化の重要性**: メモリ上の状態と永続化されたデータの整合性を保つことの重要性
2. **フィルタリングロジック**: 意図が不明確なフィルタリングは予期しない動作を引き起こす
3. **デバッグ手法**: IndexedDBの内容を確認することで、データが実際に保存されていることを確認できた
4. **マルチローダー設計**: 複数のストレージバックエンドを持つ場合、ロードロジックが複雑になる

---

## 🔗 参考リンク

- [IndexedDB API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Electron IPC Communication](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Zustand State Management](https://github.com/pmndrs/zustand)
