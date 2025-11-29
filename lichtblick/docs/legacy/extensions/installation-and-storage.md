# Lichtblick 拡張機能のインストールと格納

## 概要

Lichtblick の拡張機能は、Web版とDesktop版で異なるストレージメカニズムを使用しています。このドキュメントでは、各プラットフォームでの拡張機能のインストール方法、格納場所、および管理方法について詳しく説明します。

## 拡張機能の格納場所

### Desktop版

#### 格納場所

```
~/.lichtblick-suite/extensions/
```

#### 特徴

- **ストレージ**: ファイルシステムベース
- **管理**: `ExtensionsHandler` クラスが処理
- **構造**: 各拡張機能が独自のディレクトリを持つ
- **アクセス**: IPCを通じたファイル操作

#### ディレクトリ構造例

```
~/.lichtblick-suite/extensions/
├── publisher.extension-name-1.0.0/
│   ├── package.json
│   ├── index.js
│   ├── README.md
│   └── CHANGELOG.md
└── another-publisher.other-extension-2.1.0/
    ├── package.json
    ├── index.js
    └── assets/
        └── icon.png
```

### Web版

#### 格納場所

```
IndexedDB (ブラウザ内ストレージ)
```

#### 特徴

- **ストレージ**: IndexedDB を使用
- **管理**: `IdbExtensionLoader` が処理
- **制約**: ブラウザセキュリティ制限
- **永続性**: ブラウザデータと連動

#### データベース構造

```
Database: foxglove-extensions-{namespace}
├── Store: metadata
│   └── 拡張機能のメタデータ
└── Store: extensions
    └── 拡張機能のバイナリデータ
```

## 名前空間による管理

両プラットフォームとも、以下の2つの名前空間で拡張機能を管理します：

### `local` 名前空間

- **用途**: ユーザーが手動でインストールした拡張機能
- **インストール方法**:
  - `.foxe` ファイルのドラッグ&ドロップ
  - ファイル選択ダイアログ
  - 開発者モードでの直接配置

### `org` 名前空間

- **用途**: 組織によってリモート管理される拡張機能
- **インストール方法**:
  - 組織の拡張機能サーバーからの自動配布
  - 管理者による一括インストール

## インストール方法

### Desktop版のインストール

#### 1. 手動インストール

```typescript
// ExtensionsHandler.install() の処理フロー
public async install(foxeFileData: Uint8Array): Promise<DesktopExtension> {
  // 1. .foxeファイル（ZIP）を展開
  const archive = await JSZip.loadAsync(foxeFileData);

  // 2. package.jsonを検証
  const pkgJson = JSON.parse(await pkgJsonZipObj.async("string"));

  // 3. 拡張機能ディレクトリを作成
  const extensionBaseDir = pathJoin(this.userExtensionsDir, dir);
  await mkdir(extensionBaseDir, { recursive: true });

  // 4. 全ファイルを展開
  for (const [relPath, zipObj] of Object.entries(archive.files)) {
    const filePath = pathJoin(extensionBaseDir, relPath);
    const fileData = await zipObj.async("uint8array");
    await writeFile(filePath, fileData);
  }

  return extensionInfo;
}
```

#### 2. 開発者モード

```bash
# 開発中の拡張機能を直接配置
cp -r my-extension/ ~/.lichtblick-suite/extensions/
```

### Web版のインストール

#### 1. ブラウザ内処理

```typescript
// IdbExtensionLoader.installExtension() の処理フロー
public async installExtension(foxeFileData: Uint8Array): Promise<ExtensionInfo> {
  // 1. .foxeファイルを解析
  const pkgInfoText = await getFileContent(foxeFileData, "package.json");
  const readme = await getFileContent(foxeFileData, "README.md");
  const changelog = await getFileContent(foxeFileData, "CHANGELOG.md");

  // 2. 拡張機能情報を作成
  const info: ExtensionInfo = {
    id: `${normalizedPublisher}.${rawInfo.name}`,
    namespace: this.namespace,
    qualifiedName: qualifiedName(this.namespace, normalizedPublisher, rawInfo),
    readme,
    changelog,
  };

  // 3. IndexedDBに保存
  await this.#storage.put({ content: foxeFileData, info });
  return info;
}
```

## 拡張機能の読み込み処理

### Desktop版の読み込み

```typescript
// ExtensionsHandler.load() の処理
public async load(id: string): Promise<string> {
  // 1. 拡張機能ディレクトリを特定
  const extension = await this.get(id);

  // 2. package.jsonからメインファイルを取得
  const packageJson = JSON.parse(await readFile(packagePath, "utf-8"));
  const sourcePath = pathJoin(extension.directory, packageJson.main);

  // 3. ソースコードを読み込み
  return await readFile(sourcePath, "utf-8");
}
```

### Web版の読み込み

```typescript
// IdbExtensionLoader.loadExtension() の処理
public async loadExtension(id: string): Promise<string> {
  // 1. IndexedDBから拡張機能データを取得
  const storedExtension = await this.#storage.get(id);

  // 2. .foxeファイルを展開
  const archive = await JSZip.loadAsync(storedExtension.content);

  // 3. メインファイルを読み込み
  const mainFile = archive.files[packageJson.main];
  return await mainFile.async("string");
}
```

## 拡張機能の管理

### 一覧取得

#### Desktop版

```typescript
// ファイルシステムから拡張機能を検索
public async list(): Promise<DesktopExtension[]> {
  const extensions: DesktopExtension[] = [];
  const rootFolderContents = await readdir(this.userExtensionsDir);

  for (const entry of rootFolderContents) {
    if (entry.isDirectory()) {
      const packagePath = pathJoin(extensionRootPath, "package.json");
      const packageJson = JSON.parse(await readFile(packagePath, "utf-8"));
      extensions.push({ id, packageJson, directory: extensionRootPath });
    }
  }

  return extensions;
}
```

#### Web版

```typescript
// IndexedDBから拡張機能を検索
public async getExtensions(): Promise<ExtensionInfo[]> {
  const extensions: ExtensionInfo[] = [];
  const db = await this.#db;
  const tx = db.transaction(EXTENSION_STORE_NAME, "readonly");

  for await (const cursor of tx.store) {
    extensions.push(cursor.value.info);
  }

  return extensions;
}
```

### アンインストール

#### Desktop版

```typescript
// ディレクトリを削除
public async uninstall(id: string): Promise<void> {
  const extension = await this.get(id);
  await rm(extension.directory, { recursive: true, force: true });
}
```

#### Web版

```typescript
// IndexedDBからデータを削除
public async uninstallExtension(id: string): Promise<void> {
  const db = await this.#db;
  const tx = db.transaction([EXTENSION_STORE_NAME, METADATA_STORE_NAME], "readwrite");

  await tx.objectStore(EXTENSION_STORE_NAME).delete(id);
  await tx.objectStore(METADATA_STORE_NAME).delete(id);
  await tx.done;
}
```

## Desktop版の拡張機能配布について

### 配布方法

Desktop版では、以下の方法で拡張機能を配布できます：

#### 1. ローカルファイル配布

- **方法**: `.foxe` ファイルを直接配布
- **インストール**: ユーザーがファイルをドラッグ&ドロップ
- **用途**: 社内配布、開発者向け

#### 2. Web/クラウドからのダウンロード

- **方法**: HTTPSでの `.foxe` ファイル配布
- **実装例**:

```typescript
// 拡張機能のダウンロード
const downloadExtension = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download extension: ${response.statusText}`);
  }
  return new Uint8Array(await response.arrayBuffer());
};

// インストール
const extensionData = await downloadExtension("https://example.com/my-extension.foxe");
await catalog.installExtensions("local", [extensionData]);
```

#### 3. 組織管理による配布

- **方法**: `org` 名前空間を使用した自動配布
- **特徴**:
  - 管理者が一括管理
  - 自動更新対応
  - 企業内での統一配布

### 配布時の考慮事項

#### セキュリティ

- **HTTPS必須**: 拡張機能のダウンロードはHTTPS経由
- **署名検証**: 将来的な署名機能の対応準備
- **サンドボックス**: 制限されたrequire関数による実行環境

#### パフォーマンス

- **キャッシュ**: ダウンロード済み拡張機能のキャッシュ
- **バッチ処理**: 複数拡張機能の効率的なインストール
- **遅延読み込み**: 必要時のみ拡張機能を読み込み

## 実装例

### 拡張機能カタログでの統合管理

```typescript
// ExtensionCatalogProvider での統合処理
const extensionLoaders = [
  new IdbExtensionLoader("org"), // 組織管理
  new DesktopExtensionLoader(bridge), // Desktop版ローカル
];

// 拡張機能のインストール
const installExtensions = async (namespace: string, data: Uint8Array[]) => {
  const namespaceLoader = loaders.find((loader) => loader.namespace === namespace);

  const results = await Promise.all(
    data.map(async (extensionData) => {
      try {
        const info = await namespaceLoader.installExtension(extensionData);
        const source = await namespaceLoader.loadExtension(info.id);
        const contributionPoints = buildContributionPoints(info, source);

        mergeState(info, contributionPoints);
        return { success: true, info };
      } catch (error) {
        return { success: false, error };
      }
    }),
  );

  return results;
};
```

### 開発者向けツール

```typescript
// 開発用の拡張機能インストール
const installDevelopmentExtension = async (extensionPath: string) => {
  // 1. 開発ディレクトリから.foxeファイルを生成
  const foxeData = await createFoxeFromDirectory(extensionPath);

  // 2. インストール
  const result = await catalog.installExtensions("local", [foxeData]);

  // 3. 結果確認
  if (result[0]?.success) {
    console.log("Development extension installed successfully");
  } else {
    console.error("Installation failed:", result[0]?.error);
  }
};
```

## トラブルシューティング

### よくある問題

#### 1. 拡張機能が見つからない

```bash
# Desktop版での確認
ls -la ~/.lichtblick-suite/extensions/

# 権限確認
chmod 755 ~/.lichtblick-suite/extensions/
```

#### 2. インストールに失敗する

- **原因**: 不正な `.foxe` ファイル
- **対処**: `package.json` の形式確認
- **ログ**: 開発者ツールでエラーログを確認

#### 3. 拡張機能が読み込まれない

- **原因**: メインファイルの指定ミス
- **対処**: `package.json` の `main` フィールドを確認
- **デバッグ**: `buildContributionPoints` の実行ログを確認

### デバッグ方法

```typescript
// 拡張機能の読み込み状況を確認
const catalog = useExtensionCatalog();
console.log("Loaded extensions:", catalog.getState().loadedExtensions);
console.log("Installed panels:", catalog.getState().installedPanels);
```

## 今後の拡張予定

### 計画中の機能

1. **署名機能**: 拡張機能の署名と検証
2. **自動更新**: 拡張機能の自動更新機能
3. **依存関係管理**: 拡張機能間の依存関係解決
4. **パフォーマンス監視**: 拡張機能の実行時間監視
5. **マーケットプレース**: 公式拡張機能ストア

### 技術的改善

1. **ストレージ最適化**: より効率的なストレージ利用
2. **セキュリティ強化**: より厳格なサンドボックス環境
3. **開発者体験**: より良い開発ツールの提供

---

このドキュメントは、Lichtblick v1.17.0 時点の情報に基づいています。最新の情報については、公式ドキュメントを参照してください。
