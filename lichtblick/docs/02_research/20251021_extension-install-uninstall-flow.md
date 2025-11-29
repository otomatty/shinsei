# Lichtblick デスクトップ版 Extension のインストール/アンインストール処理フロー

**作成日**: 2025年10月21日
**対象**: Lichtblick デスクトップ版（v1.20.0以降）
**調査スコープ**: Extension のライフサイクル管理（インストール/アンインストール）

## 1. アーキテクチャ概要

Lichtblick のデスクトップ版では、Extension のインストール/アンインストールは複数のレイヤーを通して実行されます：

```
┌─────────────────────────────────────┐
│      React UI Components             │
│ (ExtensionDetails/MarketplaceCard)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  ExtensionCatalogProvider (Zustand)  │
│  - installExtensions()               │
│  - uninstallExtension()              │
│  - downloadExtension()               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  IExtensionLoader Implementations    │
│  - DesktopExtensionLoader            │
│  - IdbExtensionLoader                │
│  - RemoteExtensionLoader             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Preload Bridge (contextBridge)    │
│   - installExtension()               │
│   - uninstallExtension()             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Preload ExtensionHandler           │
│   - install()                        │
│   - uninstall()                      │
│   - list()                           │
│   - load()                           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   ファイルシステム操作                │
│   (ZipLib, fs/promises)              │
└──────────────────────────────────────┘
```

## 2. Namespace（名前空間）について

拡張機能は以下の複数の名前空間で管理されます：

| 名前空間    | 説明                               | 保存場所                          | Loader                                     |
| ----------- | ---------------------------------- | --------------------------------- | ------------------------------------------ |
| `local`     | ユーザーがインストールした拡張機能 | `~/.lichtblick-suite/extensions/` | DesktopExtensionLoader                     |
| `org`       | Lichtblick が提供する公式拡張機能  | サーバー+IndexedDB                | RemoteExtensionLoader + IdbExtensionLoader |
| `community` | コミュニティ提供の拡張機能         | -                                 | RemoteExtensionLoader                      |

各 Loader は独立して動作し、割り当てられた名前空間の拡張機能のみを管理します。

## 3. インストール処理フロー

### 3.1 全体フロー

```
1. ユーザーが [Install] をクリック
   ↓
2. UI層: downloadAndInstall() 実行
   ├─ Marketplace から foxe URLを取得
   ├─ downloadExtension(url) を呼び出し
   └─ Uint8Array 形式で .foxe ファイルを取得
   ↓
3. ExtensionCatalogProvider: installExtensions() 実行
   ├─ namespace に対応する Loader を検索
   ├─ Loader の installExtension() を呼び出し
   ├─ パッケージ情報を解析
   ├─ 状態にマージ
   └─ markExtensionAsInstalled() を実行
   ↓
4. DesktopExtensionLoader: installExtension() 実行
   ├─ namespace を Package.json に追加
   └─ Desktop Bridge の installExtension() を呼び出し
   ↓
5. ExtensionHandler (Preload): install() 実行
   ├─ .foxe ファイルを JSZip で解凍
   ├─ package.json を検証
   ├─ ディレクトリを作成 (~/.lichtblick-suite/extensions/{id}-{version}/)
   ├─ namespace を package.json に追加
   └─ 全ファイルをディレクトリに展開
   ↓
6. UI 層に成功通知を表示
```

### 3.2 詳細ステップ

#### ステップ 1: UI 層 - ダウンロード & インストール開始

**ファイル**: `packages/suite-base/src/components/ExtensionDetails.tsx`

```typescript
const downloadAndInstall = useCallback(async () => {
  // 1. DesktopApp かどうか確認
  if (!isDesktopApp()) {
    enqueueSnackbar("Download the desktop app to use marketplace extensions.", {
      variant: "error",
    });
    return;
  }

  // 2. foxe URL を取得
  const url = extension.foxe;
  if (url === undefined) {
    throw new Error(`Cannot install extension ${extension.id}, "foxe" URL is missing`);
  }

  // 3. ローディング状態に更新
  setOperationStatus(OperationStatus.INSTALLING);

  // 4. 拡張機能をダウンロード
  const extensionBuffer = await downloadExtension(url);

  // 5. ExtensionCatalog を通じてインストール
  await installExtensions("local", [{ buffer: extensionBuffer }]);

  // 6. 成功通知
  setIsInstalled(true);
  setOperationStatus(OperationStatus.IDLE);
  analytics.logEvent(AppEvent.EXTENSION_INSTALL, { type: extension.id });
}, [...dependencies]);
```

#### ステップ 2: ExtensionCatalogProvider - バッチ処理

**ファイル**: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`

```typescript
const installExtensions = async (namespace: Namespace, extensions: ExtensionData[]) => {
  // 1. 指定された namespace に対応する Loader を検索
  const namespaceLoaders: IExtensionLoader[] = loaders.filter(
    (loader) => loader.namespace === namespace,
  );

  if (namespaceLoaders.length === 0) {
    throw new Error(`No extension loader found for namespace ${namespace}`);
  }

  // 2. 各拡張機能をバッチ処理
  return await Promise.all(
    extensions.map(async (extension: ExtensionData) => {
      const loaderResults: Array<LoadExtensionsResult> = [];

      // 3. 複数の Loader に対応する場合の処理
      //    (例: org namespace では server と browser Loader を使用)
      for (const loader of namespaceLoaders) {
        try {
          // 4. Loader 経由でインストール
          const info = await loader.installExtension({
            foxeFileData: extension.buffer,
          });

          // 5. 拡張機能を読み込む
          const { raw } = await loader.loadExtension(info.id);

          // 6. Contribution Points を構築
          const contributionPoints = buildContributionPoints(info, raw);

          // 7. ストアの状態にマージ
          get().mergeState(info, contributionPoints);
          get().markExtensionAsInstalled(info.id);

          loaderResults.push({
            loaderType: loader.type,
            success: true,
          });
        } catch (error) {
          loaderResults.push({
            loaderType: loader.type,
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }

      // 8. 結果を返す
      if (hasAnySuccess) {
        return {
          success: true,
          info: mergedInfo,
          loaderResults,
        };
      } else {
        return {
          success: false,
          error: new Error("All loaders failed"),
          loaderResults,
        };
      }
    }),
  );
};
```

#### ステップ 3: DesktopExtensionLoader

**ファイル**: `packages/suite-desktop/src/renderer/services/DesktopExtensionLoader.ts`

```typescript
public async installExtension({ foxeFileData }: InstallExtensionProps): Promise<ExtensionInfo> {
  if (this.#bridge === undefined) {
    throw new Error(`Cannot install extension without a desktopBridge`);
  }

  // 1. このローダーの namespace をブリッジに渡す
  log.debug(`Installing extension with namespace "${this.namespace}"`);

  // 2. Bridge 経由でインストール（Preload スクリプトへ委譲）
  const extension: DesktopExtension = await this.#bridge.installExtension(
    foxeFileData,
    this.namespace,  // namespace をここで渡す
  );

  // 3. Package.json 情報を抽出
  const pkgInfo = extension.packageJson as ExtensionInfo;

  // 4. 拡張機能情報を構築して返す
  return {
    ...pkgInfo,
    id: extension.id,
    name: pkgInfo.displayName,
    namespace: this.namespace,  // namespace を設定
    qualifiedName: pkgInfo.displayName,
    readme: extension.readme,
    changelog: extension.changelog,
  };
}
```

#### ステップ 4: ExtensionHandler (Preload)

**ファイル**: `packages/suite-desktop/src/preload/ExtensionHandler.ts`

```typescript
public async install(foxeFileData: Uint8Array, namespace?: string): Promise<DesktopExtension> {
  // 1. .foxe ファイル（ZIP形式）を解凍
  const archive = await JSZip.loadAsync(foxeFileData);

  // 2. package.json を検証
  const pkgJsonZipObj = archive.files["package.json"];
  if (pkgJsonZipObj === undefined) {
    throw new Error(`Extension does not contain a package.json file`);
  }

  let pkgJson: ExtensionPackageJson;
  try {
    pkgJson = JSON.parse(await pkgJsonZipObj.async("string"));
  } catch (err) {
    throw new Error(`Extension contains an invalid package.json`);
  }

  // 3. namespace パラメータが指定されている場合は package.json に追加
  if (namespace !== undefined) {
    pkgJson.namespace = namespace;
  }

  // 4. README と CHANGELOG を抽出
  const readmeZipObj = archive.files["README.md"];
  const changelogZipObj = archive.files["CHANGELOG.md"];
  const readme = readmeZipObj ? await readmeZipObj.async("string") : "";
  const changelog = changelogZipObj ? await changelogZipObj.async("string") : "";

  // 5. パッケージ ID を計算
  const packageId = ExtensionsHandler.getPackageId(pkgJson);

  // 6. インストールディレクトリを決定
  const dir = ExtensionsHandler.getPackageDirname(pkgJson);
  // 例: "lichtblick.suite-extension-turtlesim-1.0.0"

  // 7. 既存の同じディレクトリを削除
  const extensionBaseDir = pathJoin(this.userExtensionsDir, dir);
  await rm(extensionBaseDir, { recursive: true, force: true });
  await mkdir(extensionBaseDir, { recursive: true });

  // 8. 全ファイルを展開
  for (const [relPath, zipObj] of Object.entries(archive.files)) {
    const filePath = pathJoin(extensionBaseDir, relPath);

    if (zipObj.dir) {
      // ディレクトリの場合
      await mkdir(dirname(filePath), { recursive: true });
    } else {
      // ファイルの場合
      if (relPath === "package.json" && namespace !== undefined) {
        // package.json は namespace 付きで書き込む
        const updatedPackageJson = JSON.stringify(pkgJson, undefined, 2);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, updatedPackageJson, { encoding: "utf-8" });
      } else {
        // その他のファイルはそのまま書き込む
        const fileData = await zipObj.async("uint8array");
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, fileData);
      }
    }
  }

  // 9. 拡張機能情報を返す
  return {
    id: packageId,
    packageJson: pkgJson,
    directory: extensionBaseDir,
    readme,
    changelog,
  };
}
```

### 3.3 Package ID の計算方法

```typescript
private static getPackageId(pkgJson: ExtensionPackageJson): string {
  // 例: "name": "@lichtblick/suite-extension-turtlesim"
  //     "publisher": "lichtblick"
  //  → "lichtblick.suite-extension-turtlesim"

  const { name, publisher } = pkgJson;

  // publisher が指定されていない場合は、@-prefixed name から抽出
  const extensionPublisher = publisher ?? extractNamespaceFromName(name);

  // パブリッシャーを小文字に統一し、特殊文字を除去
  const cleanPublisher = extensionPublisher.toLowerCase().replace(/\W+/g, "");

  // 名前を抽出（@namespace/name の場合は name のみ）
  const parsedName = parsePackageName(name).name;

  return `${cleanPublisher}.${parsedName}`;
}

// ディレクトリ名の構成
private static getPackageDirname(pkgJson: ExtensionPackageJson): string {
  // 例: "lichtblick.suite-extension-turtlesim-1.0.0"
  const pkgId = ExtensionsHandler.getPackageId(pkgJson);
  const dir = `${pkgId}-${pkgJson.version}`;
  return dir;
}
```

## 4. アンインストール処理フロー

### 4.1 全体フロー

```
1. ユーザーが [Uninstall] をクリック
   ↓
2. UI層: uninstall() 実行
   ├─ 200ms 待機（UX改善用）
   ├─ uninstallExtension(namespace, id) を呼び出し
   └─ 成功/失敗通知
   ↓
3. ExtensionCatalogProvider: uninstallExtension() 実行
   ├─ namespace に対応する Loader を検索
   ├─ 指定された namespace で拡張機能を検索
   ├─ 見つからない場合は他の namespace を検索（後方互換性）
   ├─ Loader の uninstallExtension() を呼び出し
   ├─ ストアから拡張機能データを削除
   └─ unMarkExtensionAsInstalled() を実行
   ↓
4. DesktopExtensionLoader: uninstallExtension() 実行
   └─ Desktop Bridge の uninstallExtension() を呼び出し
   ↓
5. ExtensionHandler (Preload): uninstall() 実行
   ├─ 拡張機能を検索
   ├─ ディレクトリを削除
   └─ 成功/失敗を返す
   ↓
6. UI 層に成功通知を表示
```

### 4.2 詳細ステップ

#### ステップ 1: UI 層 - アンインストール開始

**ファイル**: `packages/suite-base/src/components/ExtensionDetails.tsx`

```typescript
const uninstall = useCallback(async () => {
  try {
    setOperationStatus(OperationStatus.UNINSTALLING);

    // UX - ボタンのちらつきを避ける
    await new Promise((resolve) => setTimeout(resolve, 200));

    // ExtensionCatalog を通じてアンインストール
    await uninstallExtension(extension.namespace ?? "local", extension.id);

    // 成功通知
    enqueueSnackbar(`${extension.name} uninstalled successfully`, { variant: "success" });
    setIsInstalled(false);
    setOperationStatus(OperationStatus.IDLE);
    analytics.logEvent(AppEvent.EXTENSION_UNINSTALL, { type: extension.id });
  } catch (e: unknown) {
    const err = e as Error;
    enqueueSnackbar(`Failed to uninstall extension ${extension.id}. ${err.message}`, {
      variant: "error",
    });
    setOperationStatus(OperationStatus.IDLE);
  }
}, [
  analytics,
  extension.id,
  extension.namespace,
  isMounted,
  uninstallExtension,
  enqueueSnackbar,
  extension.name,
]);
```

#### ステップ 2: ExtensionCatalogProvider - 複雑な検索ロジック

**ファイル**: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`

```typescript
const uninstallExtension = async (namespace: Namespace, id: string) => {
  log.info(`[uninstallExtension] Starting uninstall for ${id} in namespace ${namespace}`);

  // 1. 指定された namespace に対応する Loader を検索
  let namespaceLoaders = loaders.filter((loader) => loader.namespace === namespace);

  if (namespaceLoaders.length === 0) {
    throw new Error(`No extension loader found for namespace ${namespace}`);
  }

  let extension: ExtensionInfo | undefined;
  let foundInLoader: IExtensionLoader | undefined;

  // 2. 最初に指定された namespace で検索
  for (const loader of namespaceLoaders) {
    extension = await loader.getExtension(id);
    if (extension) {
      log.info(`[uninstallExtension] Found extension in loader ${loader.type}`);
      foundInLoader = loader;
      break;
    }
  }

  // 3. 見つからない場合は他の namespace も検索（後方互換性）
  if (!extension) {
    log.warn(
      `[uninstallExtension] Extension not found in namespace ${namespace}, searching in other namespaces...`,
    );

    for (const loader of loaders) {
      if (loader.namespace === namespace) {
        continue; // 既に検索済み
      }

      extension = await loader.getExtension(id);
      if (extension) {
        log.info(`[uninstallExtension] Found in different namespace`);
        foundInLoader = loader;
        namespaceLoaders = [loader];
        break;
      }
    }
  }

  // 4. 見つからない場合は早期リターン
  if (!extension || !foundInLoader) {
    log.warn(`[uninstallExtension] Extension not found`);
    return;
  }

  // 5. 各 Loader からアンインストール
  for (const loader of namespaceLoaders) {
    try {
      // server Loader の場合は externalId を使用
      const uninstallId = loader.type === "server" ? extension.externalId! : extension.id;
      log.info(`[uninstallExtension] Uninstalling from ${loader.type}`);
      await loader.uninstallExtension(uninstallId);
      log.info(`[uninstallExtension] Successfully uninstalled`);
    } catch (error) {
      log.warn(`[uninstallExtension] Failed to uninstall from ${loader.type}:`, error);
    }
  }

  // 6. ストアから拡張機能データを削除
  set((state: ExtensionCatalog) => removeExtensionData({ id: extension!.id, state }));
  get().unMarkExtensionAsInstalled(id);
  log.info(`[uninstallExtension] Uninstall completed`);
};
```

#### ステップ 3: DesktopExtensionLoader

**ファイル**: `packages/suite-desktop/src/renderer/services/DesktopExtensionLoader.ts`

```typescript
public async uninstallExtension(id: string): Promise<void> {
  // Bridge 経由でアンインストール（Preload スクリプトへ委譲）
  await this.#bridge?.uninstallExtension(id);
}
```

#### ステップ 4: ExtensionHandler (Preload)

**ファイル**: `packages/suite-desktop/src/preload/ExtensionHandler.ts`

```typescript
public async uninstall(id: string): Promise<boolean> {
  this.log.debug("[extension]", `Uninstalling ${id}`);

  // 1. 拡張機能を検索
  const extension = await this.get(id);

  if (!extension) {
    this.log.warn("[extension]", `Extension ${id} not found`);
    return false;
  }

  // 2. ディレクトリを削除
  await rm(extension.directory, {
    recursive: true,
    force: true,
  });

  return true;
}
```

### 4.3 データ削除の詳細

```typescript
function removeExtensionData({
  id,
  state,
}: {
  id: string;
  state: ExtensionCatalog;
}): Partial<ExtensionCatalog> {
  // 1. installedExtensions から削除
  const installedExtensions = state.installedExtensions?.filter(
    ({ id: extensionId }) => extensionId !== id,
  );

  // 2. installedPanels から削除
  const installedPanels = _.pickBy(state.installedPanels, ({ extensionId }) => extensionId !== id);

  // 3. installedMessageConverters から削除
  const installedMessageConverters = state.installedMessageConverters?.filter(
    ({ extensionId }) => extensionId !== id,
  );

  // 4. installedTopicAliasFunctions から削除
  const installedTopicAliasFunctions = state.installedTopicAliasFunctions?.filter(
    ({ extensionId }) => extensionId !== id,
  );

  // 5. installedCameraModels から削除
  const installedCameraModels = new Map(
    [...state.installedCameraModels].filter(([, { extensionId }]) => extensionId !== id),
  );

  return {
    installedExtensions,
    installedPanels,
    installedMessageConverters,
    installedTopicAliasFunctions,
    installedCameraModels,
  };
}
```

## 5. ファイルシステムのディレクトリ構造

### 拡張機能の格納場所

```
~/.lichtblick-suite/
├── extensions/
│   ├── lichtblick.suite-extension-turtlesim-0.0.1/
│   │   ├── package.json
│   │   ├── lib/
│   │   │   ├── index.js
│   │   │   └── ...
│   │   ├── README.md
│   │   └── CHANGELOG.md
│   ├── lichtblick.suite-extension-other-1.0.0/
│   │   ├── package.json
│   │   └── ...
│   └── ...
└── layouts/
```

### Package.json の構造

```json
{
  "name": "@lichtblick/suite-extension-turtlesim",
  "displayName": "Turtlesim",
  "version": "0.0.1",
  "publisher": "lichtblick",
  "namespace": "local", // インストール時に自動追加
  "main": "lib/index.js",
  "description": "...",
  "license": "...",
  "homepage": "..."
}
```

## 6. 重要な処理の特性

### 6.1 名前空間の役割

- **分離管理**: 異なる名前空間の拡張機能は異なる Loader で管理
- **動的ロード**: 複数の Loader を並行して実行可能
- **後方互換性**: アンインストール時に他の namespace を検索

### 6.2 Batch Processing

```typescript
// 複数の拡張機能を同時にインストール
await installExtensions("local", [
  { buffer: extensionData1 },
  { buffer: extensionData2 },
  { buffer: extensionData3 },
]);
```

- 各拡張機能は `Promise.all()` で並行処理
- エラーが発生した拡張機能は個別に処理
- 部分的な成功を許容

### 6.3 UX 改善

```typescript
// UX - ボタンのちらつきを避ける
await new Promise((resolve) => setTimeout(resolve, 200));
```

- 操作が完了する前に 200ms 待機
- ボタンの状態遷移が視覚的に分かりやすく

### 6.4 コンポーネントマウント状態の確認

```typescript
const isMounted = useMountedState(); // react-use から

if (isMounted()) {
  setIsInstalled(true); // アンマウント後の状態更新を防止
  setOperationStatus(OperationStatus.IDLE);
}
```

- React のメモリリーク防止

## 7. エラーハンドリング

### インストール時

1. **Desktop アプリチェック**: Web 版では不可
2. **URL 検証**: foxe URL が存在するか確認
3. **Package.json 検証**: 必須フィールドをチェック
4. **ZIP 解凍エラー**: 無効なアーカイブを検出
5. **ファイルシステムエラー**: ディレクトリ作成/書き込み失敗

### アンインストール時

1. **拡張機能検索失敗**: 複数 namespace を検索（後方互換性）
2. **Loader 不在**: エラーをスロー
3. **ディレクトリ削除失敗**: ログに記録（完全には失敗しない）
4. **部分的な削除**: 複数 Loader 時は各 Loader 個別に処理

## 8. 主要なコントリビューションポイント（Contribution Points）

インストールされた拡張機能から抽出される機能：

```typescript
interface ContributionPoints {
  // カスタムパネルの定義
  panels: Record<string, RegisteredPanel>;

  // メッセージコンバーターの定義
  messageConverters: RegisterMessageConverterArgs<unknown>[];

  // パネルごとの設定スキーマ
  panelSettings: Record<string, any>;

  // トピック別名関数
  topicAliasFunctions: TopicAliasFunctions[];

  // カメラモデルの定義
  cameraModels: Map<string, CameraModelBuilder>;
}
```

## 9. 重要な制限事項

### org（公式）名前空間の拡張機能

- ✅ インストール可能
- ❌ **アンインストール不可**（UI層で警告を表示）

```typescript
if (namespace === "org") {
  enqueueSnackbar(`Cannot uninstall system extension ${extension.displayName}`, {
    variant: "warning",
  });
  return;
}
```

## 10. ログ出力について

デバッグ時に便利なログ出力：

```
[uninstallExtension] Starting uninstall for {id} in namespace {namespace}
[uninstallExtension] Found {count} loaders for namespace {namespace}
[uninstallExtension] Found extension {id} in loader {type}
[uninstallExtension] Successfully uninstalled from loader {type}
[uninstallExtension] Uninstall completed for {id}
```

## 参考ファイル

| ファイル                                                                 | 役割                                 |
| ------------------------------------------------------------------------ | ------------------------------------ |
| `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`         | 状態管理・ビジネスロジック           |
| `packages/suite-desktop/src/renderer/services/DesktopExtensionLoader.ts` | Desktop Loader 実装                  |
| `packages/suite-desktop/src/preload/ExtensionHandler.ts`                 | ファイル操作・実際のインストール処理 |
| `packages/suite-desktop/src/preload/index.ts`                            | Bridge インターフェース              |
| `packages/suite-base/src/services/extension/IExtensionLoader.ts`         | Loader インターフェース              |
| `packages/suite-base/src/components/ExtensionDetails.tsx`                | UI コンポーネント                    |
| `e2e/tests/desktop/extension/uninstall-extension.desktop.spec.ts`        | E2E テスト例                         |

## 11. フロー図

### インストールフロー（詳細版）

```
┌─────────────────────────────────────────┐
│ User Clicks "Install" Button            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │ downloadAndInstall()│
        │ (ExtensionDetails)  │
        └──────────┬──────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
  Check if          Get foxe URL
  Desktop App       from Marketplace
      │                         │
      └────────────┬────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ downloadExtension()  │
        │ (fetch .foxe file)   │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ installExtensions()      │
        │ (ExtensionCatalog)       │
        │ namespace: "local"       │
        └──────────┬───────────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
  Find Loader for       Loop through
  namespace "local"     extensions array
      │                         │
      └────────────┬────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ loader.installExtension()│
        │ (DesktopExtensionLoader) │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌────────────────────────────┐
        │ bridge.installExtension()  │
        │ (pass namespace param)     │
        └──────────┬─────────────────┘
                   │
                   ▼
        ┌────────────────────────────┐
        │ ExtensionHandler.install() │
        │ (Preload)                  │
        └──────────┬─────────────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
    Unzip      Parse         Add
    .foxe      package.json   namespace
    archive    & validate     to pkg
       │           │           │
       └───────────┴───────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Create directory:        │
        │ ~/.lichtblick-suite/     │
        │ extensions/{id}-{ver}/   │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Extract all files from   │
        │ ZIP to directory         │
        │ (with namespace in pkg)  │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Return DesktopExtension  │
        │ object to Loader         │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ loader.loadExtension()   │
        │ (load source code)       │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ buildContributionPoints()│
        │ (extract panels, etc)    │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ mergeState()             │
        │ (update Zustand store)   │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ markExtensionAsInstalled()
        │ (add to loadedExtensions)│
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Return result to UI      │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Show Success Toast:      │
        │ "{name} installed"       │
        └──────────────────────────┘
```

### アンインストールフロー（詳細版）

```
┌─────────────────────────────────────────┐
│ User Clicks "Uninstall" Button          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │ uninstall()         │
        │ (ExtensionDetails)  │
        └──────────┬──────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Wait 200ms           │
        │ (UX improvement)     │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ uninstallExtension()     │
        │ (ExtensionCatalog)       │
        │ namespace: from ext      │
        │ id: extensionId          │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Find Loader for          │
        │ specified namespace      │
        └──────────┬───────────────┘
                   │
        ┌──────────▼──────────┐
        │ Found?              │
        └──────────┬──────────┘
           YES │NO │
               │  └─────────────┐
               │                │
               ▼                ▼
        Search in other    Throw Error
        namespaces for     "No loader found"
        backward compat.       │
               │                │
               │                ▼
               │         [ERROR HANDLING]
               │
               ▼
        ┌──────────────────────────┐
        │ Extension found?         │
        └──────────┬───────────────┘
           YES │NO │
               │  └─────────────┐
               │                │
               ▼                ▼
        Continue           Early Return
               │           (log warning)
               │                │
               ▼                ▼
        ┌──────────────────┐   [END]
        │ Loop through     │
        │ all Loaders for  │
        │ namespace        │
        └──────────┬───────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Get uninstallId:         │
        │ - server Loader: use     │
        │   externalId             │
        │ - other: use id          │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ loader.uninstallExtension│
        │ (DesktopExtensionLoader) │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ bridge.uninstallExtension
        │ (pass id)                │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ ExtensionHandler.        │
        │ uninstall()              │
        │ (Preload)                │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Search for extension in  │
        │ ~/.lichtblick-suite/     │
        │ extensions/              │
        └──────────┬───────────────┘
                   │
        ┌──────────▼──────────┐
        │ Extension found?    │
        └──────────┬──────────┘
           YES │NO │
               │  └─────────────┐
               │                │
               ▼                ▼
        Continue          Log warning &
               │           return false
               │                │
               ▼                ▼
        ┌──────────────────┐   [ERROR]
        │ Delete extension │
        │ directory:       │
        │ rm -rf {dir}     │
        └──────────┬───────┘
                   │
        ┌──────────▼──────────┐
        │ Success?            │
        └──────────┬──────────┘
           YES │NO │
               │  └─────────────┐
               │                │
               ▼                ▼
        Return true       Log error
               │                │
               └────────┬────────┘
                        │
                        ▼
        ┌──────────────────────────┐
        │ Back in Catalog:         │
        │ removeExtensionData()    │
        │ - installedExtensions   │
        │ - installedPanels       │
        │ - messageConverters     │
        │ - cameraModels          │
        │ etc.                     │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ unMarkExtensionAsInstalled
        │ (remove from loadedExt)  │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Return to UI layer       │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Show Success Toast:      │
        │ "{name} uninstalled"     │
        └──────────────────────────┘
```

## 12. トラブルシューティング

### インストール失敗時の確認事項

1. **ログの確認**

   ```bash
   # Electron メインプロセス のログ
   cat ~/.lichtblick-suite/logs/main.log

   # ディレクトリの確認
   ls -la ~/.lichtblick-suite/extensions/
   ```

2. **Package.json の検証**

   - `name` フィールドが存在か
   - `version` フィールドが存在か
   - `publisher` フィールドが存在するか、または `@namespace` 形式か

3. **ディスク容量の確認**
   ```bash
   df -h
   ```

### アンインストール失敗時の確認事項

1. **拡張機能の存在確認**

   ```bash
   ls -la ~/.lichtblick-suite/extensions/ | grep {id}
   ```

2. **権限の確認**

   ```bash
   ls -ld ~/.lichtblick-suite/extensions/
   ```

3. **Loader の確認**
   - Namespace が正しいか
   - 別の namespace に存在していないか

---

**最終更新**: 2025年10月21日
