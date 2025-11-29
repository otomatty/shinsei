# Lichtblick 拡張機能システム アーキテクチャ

## 概要

Lichtblick の拡張機能システムは、パネル、メッセージコンバーター、カメラモデルなどの機能を動的に追加できる柔軟で拡張可能なアーキテクチャを提供します。このシステムは Web 版と Desktop 版の両方で動作し、異なるストレージメカニズムを使用しながら統一されたインターフェースを提供します。

## 全体アーキテクチャ

### 主要コンポーネント

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  ExtensionCatalogProvider                                   │
│  ├─ ExtensionLoader (Interface)                             │
│  │  ├─ IdbExtensionLoader (Web)                            │
│  │  └─ DesktopExtensionLoader (Desktop)                    │
│  ├─ buildContributionPoints                                 │
│  └─ ExtensionCatalog (Zustand Store)                       │
├─────────────────────────────────────────────────────────────┤
│  PanelCatalogProvider                                       │
│  ├─ Built-in Panels                                        │
│  └─ Extension Panels (via PanelExtensionAdapter)           │
├─────────────────────────────────────────────────────────────┤
│  UI Components                                              │
│  ├─ ExtensionsSettings                                      │
│  ├─ ExtensionDetails                                        │
│  └─ ExtensionList                                           │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

1. **拡張機能の読み込み**

   - ExtensionLoader → ExtensionCatalogProvider → buildContributionPoints
   - 拡張機能のソースコードを動的実行し、機能を抽出

2. **パネル統合**

   - ExtensionCatalog → PanelCatalogProvider → PanelExtensionAdapter
   - 拡張機能パネルをビルトインパネルと統合

3. **UI 表示**
   - ExtensionCatalog → ExtensionsSettings → ExtensionList
   - インストール済み拡張機能の表示と管理

## 拡張機能の実行システム

### buildContributionPoints の仕組み

`buildContributionPoints` は拡張機能システムの中核となる関数で、以下の処理を行います：

```typescript
export function buildContributionPoints(
  extension: ExtensionInfo,
  unwrappedExtensionSource: string,
): ContributionPoints {
  // 1. 拡張機能のコンテキストを作成
  const ctx: ExtensionContext = {
    registerPanel: (args) => {
      /* パネル登録 */
    },
    registerMessageConverter: (args) => {
      /* メッセージコンバーター登録 */
    },
    registerTopicAliases: (args) => {
      /* トピックエイリアス登録 */
    },
    registerCameraModel: (args) => {
      /* カメラモデル登録 */
    },
    // ...
  };

  // 2. 制限されたrequire関数を提供
  const require = (name: string) => {
    return { react: React, "react-dom": ReactDOM }[name];
  };

  // 3. 拡張機能コードを動的実行
  const fn = new Function("module", "require", unwrappedExtensionSource);
  fn(module, require, {});

  // 4. activate関数を呼び出し
  const wrappedExtensionModule = module.exports as ExtensionModule;
  wrappedExtensionModule.activate(ctx);

  // 5. 登録された機能を返却
  return {
    panels,
    messageConverters,
    topicAliasFunctions,
    panelSettings,
    cameraModels,
  };
}
```

### セキュリティ考慮事項

- **制限されたrequire**: React と ReactDOM のみ利用可能
- **独立したモジュールスコープ**: 各拡張機能は独立した実行環境
- **エラーの隔離**: 拡張機能のエラーはアプリケーション全体に影響しない

## Web版とDesktop版の違い

### Web版 (IdbExtensionLoader)

```typescript
// 2つの名前空間を使用
const extensionLoaders = [
  new IdbExtensionLoader("org"), // 組織管理の拡張機能
  new IdbExtensionLoader("local"), // ローカル拡張機能
];
```

**特徴:**

- **ストレージ**: IndexedDB を使用
- **インストール**: ブラウザ内でのファイル処理
- **制約**: ブラウザセキュリティ制限
- **配布**: Web からの直接インストール

### Desktop版 (DesktopExtensionLoader)

```typescript
// 単一の名前空間
const extensionLoaders = [
  new IdbExtensionLoader("org"), // 組織管理
  new DesktopExtensionLoader(desktopBridge), // ローカル拡張機能
];
```

**特徴:**

- **ストレージ**: ファイルシステム (`~/.lichtblick-suite/extensions`)
- **インストール**: IPC を通じたファイル操作
- **制約**: より少ない制限
- **配布**: ファイルシステムベース

### 実装の詳細

#### IdbExtensionLoader

```typescript
export class IdbExtensionLoader implements ExtensionLoader {
  public async installExtension(foxeFileData: Uint8Array): Promise<ExtensionInfo> {
    // 1. .foxeファイルを展開
    const pkgInfoText = await getFileContent(foxeFileData, "package.json");
    const readme = (await getFileContent(foxeFileData, "README.md")) ?? "";
    const changelog = (await getFileContent(foxeFileData, "CHANGELOG.md")) ?? "";

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
}
```

#### DesktopExtensionLoader

```typescript
export class DesktopExtensionLoader implements ExtensionLoader {
  public async installExtension(foxeFileData: Uint8Array): Promise<ExtensionInfo> {
    // 1. IPCを通じてメインプロセスに処理を委譲
    const extension = await this.#bridge?.installExtension(foxeFileData);

    // 2. ExtensionInfoに変換
    return {
      ...extension.packageJson,
      id: extension.id,
      namespace: this.namespace,
      readme: extension.readme,
      changelog: extension.changelog,
    };
  }
}
```

## パネル拡張の統合

### PanelCatalogProvider

```typescript
const wrappedExtensionPanels = useMemo<PanelInfo[]>(() => {
  return Object.values(extensionPanels ?? {}).map((panel) => {
    // 完全修飾IDで名前衝突を防止
    const panelType = `${panel.extensionName}.${panel.registration.name}`;

    const PanelWrapper = (panelProps: PanelProps) => {
      return (
        <PanelExtensionAdapter
          config={panelProps.config}
          saveConfig={panelProps.saveConfig}
          initPanel={panel.registration.initPanel}
        />
      );
    };

    return {
      category: "misc",
      title: panel.registration.name,
      type: panelType,
      module: async () => ({ default: Panel(PanelWrapper) }),
      extensionNamespace: panel.extensionNamespace,
    };
  });
}, [extensionPanels]);
```

### PanelExtensionAdapter

PanelExtensionAdapter は拡張機能パネルをアプリケーションに統合するためのアダプターです：

- **ライフサイクル管理**: パネルの初期化と破棄
- **メッセージパイプライン**: データストリームとの連携
- **設定管理**: パネル設定の永続化
- **パフォーマンス監視**: 低速レンダリングの検出

## 拡張機能の種類

### 1. パネル拡張

```typescript
context.registerPanel({
  name: "MyCustomPanel",
  initPanel: (context) => {
    // パネルの初期化ロジック
    context.onRender = (renderState, done) => {
      // レンダリングロジック
      done();
    };
  },
});
```

### 2. メッセージコンバーター

```typescript
context.registerMessageConverter({
  fromSchemaName: "custom_msgs/CustomMessage",
  toSchemaName: "sensor_msgs/PointCloud2",
  converter: (inputMessage) => {
    // メッセージ変換ロジック
    return convertedMessage;
  },
});
```

### 3. トピックエイリアス

```typescript
context.registerTopicAliases({
  aliasFunction: (topics) => {
    // トピック名の別名解決
    return aliasedTopics;
  },
});
```

### 4. カメラモデル

```typescript
context.registerCameraModel({
  name: "custom_camera_model",
  build: (info) => {
    // カスタムカメラモデルの構築
    return new CustomCameraModel(info);
  },
});
```

## 拡張機能の管理

### インストール処理

```typescript
// 拡張機能のダウンロード
const extensionData = await catalog.downloadExtension(url);

// バッチインストール
const results = await catalog.installExtensions("local", [extensionData]);

// 結果の処理
results.forEach((result) => {
  if (result.success) {
    console.log("インストール成功:", result.info?.name);
  } else {
    console.error("インストール失敗:", result.error);
  }
});
```

### アンインストール処理

```typescript
await catalog.uninstallExtension("local", extensionId);
```

### 状態管理

ExtensionCatalog は Zustand ストアを使用して状態を管理：

```typescript
interface ExtensionCatalog {
  // 状態
  loadedExtensions: Set<string>;
  installedExtensions: ExtensionInfo[];
  installedPanels: Record<string, RegisteredPanel>;
  installedMessageConverters: RegisterMessageConverterArgs<unknown>[];
  installedTopicAliasFunctions: TopicAliasFunctions[];
  installedCameraModels: CameraModelsMap;
  panelSettings: ExtensionSettings;

  // アクション
  downloadExtension: (url: string) => Promise<Uint8Array>;
  installExtensions: (namespace: string, data: Uint8Array[]) => Promise<InstallExtensionsResult[]>;
  uninstallExtension: (namespace: string, id: string) => Promise<void>;
  refreshAllExtensions: () => Promise<void>;
  isExtensionInstalled: (id: string) => boolean;
}
```

## ファイル形式

### .foxe ファイル

拡張機能は `.foxe` ファイル（ZIP 形式）として配布されます：

```
extension.foxe
├── package.json      # 拡張機能のメタデータ
├── README.md         # 説明文書
├── CHANGELOG.md      # 変更履歴
├── index.js          # メインコード
└── assets/           # リソースファイル
```

### package.json の例

```json
{
  "name": "my-extension",
  "displayName": "My Custom Extension",
  "version": "1.0.0",
  "description": "A custom extension for Lichtblick",
  "publisher": "MyCompany",
  "main": "index.js",
  "license": "MIT",
  "keywords": ["robotics", "visualization"],
  "homepage": "https://example.com"
}
```

## パフォーマンス最適化

### バッチ処理

```typescript
// 拡張機能の読み込みはバッチで実行
const MAX_REFRESH_EXTENSIONS_BATCH = 1;
const MAX_INSTALL_EXTENSIONS_BATCH = 1;

// バッチサイズに分割してインストール
for (let i = 0; i < data.length; i += MAX_INSTALL_EXTENSIONS_BATCH) {
  const chunk = data.slice(i, i + MAX_INSTALL_EXTENSIONS_BATCH);
  const result = await promisesInBatch(chunk, namespaceLoader);
  results.push(...result);
}
```

### メモリ管理

- 拡張機能のコードは必要時のみロード
- 未使用の拡張機能は自動的にアンロード
- メモリリークの防止

## エラーハンドリング

### 拡張機能レベル

```typescript
try {
  const fn = new Function("module", "require", unwrappedExtensionSource);
  fn(module, require, {});
  const wrappedExtensionModule = module.exports as ExtensionModule;
  wrappedExtensionModule.activate(ctx);
} catch (err: unknown) {
  log.error(err);
  // エラーは伝播させず、アプリケーションの安定性を保つ
}
```

### システムレベル

- 拡張機能のエラーはアプリケーション全体に影響しない
- 適切なログ記録とユーザーへの通知
- 破損した拡張機能の自動無効化

## 今後の拡張可能性

### 新しい拡張ポイント

- **データソース拡張**: カスタムデータソースの追加
- **レイアウト拡張**: カスタムレイアウトエンジン
- **テーマ拡張**: カスタムテーマとスタイル
- **プラグインAPI**: より高度なプラグインシステム

### セキュリティ強化

- **サンドボックス化**: より厳密な実行環境
- **権限システム**: 拡張機能の権限管理
- **署名検証**: 拡張機能の信頼性確保

## 参考リンク

- [PR #389: Extension Handling Refactor](https://github.com/otomatty/lichtblick/pull/389)
- [PR #448: Extension Installation and Player Handling](https://github.com/otomatty/lichtblick/pull/448)
- [PR #495: Local Extension Readme and Changelog](https://github.com/otomatty/lichtblick/pull/495)
- [PR #508: Custom Camera Models Support](https://github.com/otomatty/lichtblick/pull/508)
