# 拡張機能とレイアウトの読み込み機構

## 📋 概要

このドキュメントでは、Lichtblickアプリケーションにおける拡張機能とレイアウトの読み込み機構について詳しく説明します。特に、namespace変更が既存機能に与える影響がないことを技術的に解説します。

---

## 🏗️ アーキテクチャ概要

### レイヤー構造

```
┌─────────────────────────────────────────────────────────┐
│ UI Layer                                                │
│ - PanelCatalog (パネル選択UI)                           │
│ - AddPanelMenu (パネル追加メニュー)                     │
│ - ExtensionsSettings (拡張機能管理画面)                 │
└─────────────────────────────────────────────────────────┘
                          ↓↑
┌─────────────────────────────────────────────────────────┐
│ Context Layer                                           │
│ - PanelCatalogContext (パネル一覧管理)                  │
│ - ExtensionCatalogContext (拡張機能管理)                │
│ - CurrentLayoutContext (レイアウト管理)                 │
└─────────────────────────────────────────────────────────┘
                          ↓↑
┌─────────────────────────────────────────────────────────┐
│ Provider Layer                                          │
│ - PanelCatalogProvider (パネル統合)                     │
│ - ExtensionCatalogProvider (拡張機能統合)               │
└─────────────────────────────────────────────────────────┘
                          ↓↑
┌─────────────────────────────────────────────────────────┐
│ Loader Layer                                            │
│ - IdbExtensionLoader (IndexedDB)                        │
│ - DesktopExtensionLoader (File System)                  │
│ - RemoteExtensionLoader (Server API)                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 拡張機能の識別機構

### パネルタイプの生成

拡張機能パネルは、**namespace とは無関係に** `extensionName.panelName` 形式で識別されます。

**実装**: `packages/suite-base/src/providers/PanelCatalogProvider.tsx`

```typescript
const wrappedExtensionPanels = useMemo<PanelInfo[]>(() => {
  return Object.values(extensionPanels ?? {}).map((panel) => {
    // 拡張機能パネルの一意な型名を生成
    // namespace は含まれない！
    const panelType = `${panel.extensionName}.${panel.registration.name}`;

    // ...

    return {
      category: "misc",
      title: panel.registration.name,
      type: panelType, // "publisher.extension-name.PanelName"
      module: async () => ({ default: Panel(PanelWrapper) }),
      extensionNamespace: panel.extensionNamespace, // 表示用のみ
    };
  });
}, [extensionPanels]);
```

### パネルID生成の仕組み

**実装**: `packages/suite-base/src/util/layout.ts`

```typescript
/**
 * パネルタイプから一意なパネルIDを生成
 * @param type - パネルタイプ（例: "publisher.extension.Panel"）
 * @returns パネルID（例: "publisher.extension.Panel!abc123"）
 */
export function getPanelIdForType(type: string): string {
  const factor = 1e10;
  const rnd = Math.round(Math.random() * factor).toString(36);
  // パネルIDの形式: {type}!{randomId}
  return `${type}!${rnd}`;
}

/**
 * パネルIDからパネルタイプを抽出
 * @param id - パネルID（例: "publisher.extension.Panel!abc123"）
 * @returns パネルタイプ（例: "publisher.extension.Panel"）
 */
export function getPanelTypeFromId(id: string): string {
  return id.split("!")[0] ?? "";
}
```

### 重要なポイント

✅ **namespace はパネルタイプに含まれない**
✅ **パネルIDに namespace は含まれない**
✅ **レイアウトファイルに namespace は保存されない**

---

## 📦 拡張機能の保存形式

### ExtensionInfo 構造

**型定義**: `packages/suite-base/src/types/Extensions.ts`

```typescript
export type ExtensionInfo = {
  id: string; // "publisher.extension-name"
  name: string; // "extension-name"
  displayName: string; // "My Extension"
  description?: string;
  publisher: string; // "publisher"
  version: string; // "1.0.0"
  homepage?: string;
  license?: string;
  keywords?: readonly string[];

  // namespace は保存されるが、識別には使われない
  namespace?: Namespace; // "local" | "official" | "org"
  qualifiedName?: string;
  externalId?: string;

  readme?: string;
  changelog?: string;
};
```

### IndexedDBストレージ構造

```javascript
// データベース名: extensions-{namespace}
// 例: "extensions-official", "extensions-local"

// ObjectStore: "extensions"
{
  id: "publisher.extension-name",  // プライマリキー
  content: Uint8Array,             // FOXEファイルのバイナリ
  info: {
    id: "publisher.extension-name",
    name: "extension-name",
    displayName: "My Extension",
    namespace: "official",         // namespace は含まれるが...
    version: "1.0.0",
    // ...
  }
}
```

### ファイルシステム構造

```
~/.lichtblick-suite/extensions/
├── publisher.extension-name-1.0.0/
│   ├── package.json
│   ├── extension.js
│   ├── README.md
│   └── CHANGELOG.md
└── another.extension-2.0.0/
    ├── package.json
    └── extension.js
```

**ディレクトリ名**: `{id}-{version}`
**namespace は含まれない！**

---

## 🗂️ レイアウトの保存形式

### レイアウトファイル構造

```json
{
  "name": "My Custom Layout",
  "configById": {
    "Plot!abc123": {
      "paths": ["/camera/image"],
      "lichtblickPanelTitle": "Camera View"
    },
    "publisher.custom-extension.CustomPanel!xyz789": {
      "showGrid": true,
      "gridSize": 10
    }
  },
  "globalVariables": {},
  "userNodes": {},
  "playbackConfig": {
    "speed": 1
  },
  "layout": {
    "direction": "row",
    "first": "Plot!abc123",
    "second": "publisher.custom-extension.CustomPanel!xyz789",
    "splitPercentage": 50
  }
}
```

### 重要なポイント

✅ **パネルIDは `type!randomId` 形式**
✅ **namespace は保存されない**
✅ **拡張機能の識別は `publisher.extension.PanelName` のみ**

---

## 🔄 パネルの読み込みフロー

### 1. レイアウトのロード

```typescript
// CurrentLayoutContext で実行

// レイアウトJSONから configById を取得
const configById = layout.configById;
// {
//   "publisher.extension.Panel!abc123": { /* config */ },
//   "Plot!def456": { /* config */ }
// }

// レイアウトツリーから各パネルIDを取得
const panelIds = getLeaves(layout.layout);
// ["publisher.extension.Panel!abc123", "Plot!def456"]
```

### 2. パネルタイプの抽出

```typescript
// packages/suite-base/src/util/layout.ts

for (const panelId of panelIds) {
  // パネルIDからタイプを抽出
  const panelType = getPanelTypeFromId(panelId);
  // "publisher.extension.Panel!abc123" → "publisher.extension.Panel"

  // PanelCatalogから対応するパネル情報を取得
  const panelInfo = panelCatalog.getPanelByType(panelType);
}
```

### 3. PanelCatalogからパネル取得

```typescript
// packages/suite-base/src/providers/PanelCatalogProvider.tsx

const provider = useMemo<PanelCatalog>(() => {
  return {
    /**
     * タイプによるパネル検索
     * namespace は使用されない！
     */
    getPanelByType(type: string) {
      return panelsByType.get(type);
    },
    panels: visiblePanels,
  };
}, [panelsByType, visiblePanels]);
```

### 4. パネルのレンダリング

```typescript
// packages/suite-base/src/components/Panel.tsx

function ConnectedPanel(props: Props<Config>) {
  const { childId } = props;  // "publisher.extension.Panel!abc123"

  // パネルタイプを取得
  const panelType = getPanelTypeFromId(childId);
  // "publisher.extension.Panel"

  // パネル情報を取得（namespace は不要）
  const panelInfo = panelCatalog.getPanelByType(panelType);

  // パネルモジュールをロード
  const PanelComponent = await panelInfo.module();

  // パネルをレンダリング
  return <PanelComponent config={config} saveConfig={saveConfig} />;
}
```

---

## 🎯 namespace の実際の役割

### 1. ストレージの分離とローダー選択

```typescript
// 異なるnamespaceは異なるストレージまたはディレクトリを使用

// IndexedDB (Web版)
const db1 = indexedDB.open("extensions-official");
const db2 = indexedDB.open("extensions-local");
const db3 = indexedDB.open("extensions-org");

// ファイルシステム (デスクトップ版 - 推奨実装)
// ~/.lichtblick-suite/extensions/
//   ├── org/
//   ├── official/
//   └── local/
```

**目的**: データの整理、アクセス制御、環境に応じた最適なストレージの使用

**現在の問題点**: デスクトップ版でIndexedDBとファイルシステムが混在している

**推奨される構成**:

- **デスクトップ版**: ファイルシステムのみ（namespaceごとのサブディレクトリ）
- **Web版**: IndexedDBのみ（namespaceごとの別データベース）

### 2. 表示時のグループ化

```typescript
// packages/suite-base/src/components/ExtensionsSettings/hooks/useExtensionSettings.ts

const namespacedData = useMemo(() => {
  const extensions = installedExtensions ?? [];

  // namespace でグループ化（UI表示用）
  const byNamespace = _.groupBy(extensions, (ext) => ext.namespace);

  return Object.entries(byNamespace).map(([namespace, entries]) => ({
    namespace, // "org", "official", "local"
    entries,
  }));
}, [installedExtensions]);
```

**表示例**:

```
拡張機能

┌─ org ─────────────────┐
│ - System Extension    │
└───────────────────────┘

┌─ official ────────────┐
│ - Marketplace Ext 1   │
│ - Marketplace Ext 2   │
└───────────────────────┘

┌─ local ───────────────┐
│ - My Custom Ext       │
└───────────────────────┘
```

### 3. アンインストール時のローダー選択

```typescript
// packages/suite-base/src/providers/ExtensionCatalogProvider.tsx

const uninstallExtension = async (namespace: Namespace, id: string) => {
  // namespace に対応するローダーを取得
  const namespaceLoaders = loaders.filter((loader) => loader.namespace === namespace);

  // 該当するローダーでアンインストール
  for (const loader of namespaceLoaders) {
    await loader.uninstallExtension(id);
  }
};
```

**重要**: アンインストール時のみ namespace が必要

---

## 🧪 namespace 変更の影響テスト

### テストシナリオ1: 既存レイアウトの互換性

#### 前提条件

1. `official` namespace で拡張機能をインストール
2. 拡張機能パネルを含むレイアウトを保存
3. アプリを修正して `local` namespace を使用するように変更

#### レイアウトファイル

```json
{
  "configById": {
    "myext.CustomPanel!abc": { "title": "My Panel" }
  },
  "layout": "myext.CustomPanel!abc"
}
```

#### 検証フロー

```typescript
// 1. レイアウトをロード
const layout = loadLayout("myLayout");

// 2. パネルIDを取得
const panelId = "myext.CustomPanel!abc";

// 3. パネルタイプを抽出
const panelType = getPanelTypeFromId(panelId);
// → "myext.CustomPanel"
// ℹ️ namespace 情報は含まれていない

// 4. PanelCatalogから検索
const panelInfo = panelCatalog.getPanelByType(panelType);
// → { type: "myext.CustomPanel", ... }
// ℹ️ 検索に namespace は使用されない

// 5. ExtensionCatalogから取得
const extensionPanels = extensionCatalog.installedPanels;
// {
//   "myext": {
//     extensionId: "myext",
//     extensionName: "myext",
//     extensionNamespace: "local",  // ← 変更されたnamespace
//     registration: { name: "CustomPanel", ... }
//   }
// }
// ℹ️ キーは extensionId で、namespace は含まれない

// 6. パネルタイプ生成
const type = `${panel.extensionName}.${panel.registration.name}`;
// → "myext.CustomPanel"
// ℹ️ 同じ type が生成される！

// 結論: レイアウトは正常にロードされる ✅
```

### テストシナリオ2: 拡張機能の重複インストール

#### 前提条件

同じ拡張機能を異なるnamespaceにインストール:

- `official` namespace: `myext.CustomPanel`
- `local` namespace: `myext.CustomPanel`

#### ExtensionCatalogの状態

```typescript
// installedExtensions
[
  {
    id: "myext",
    namespace: "official",
    // ...
  },
  {
    id: "myext",
    namespace: "local",
    // ...
  }
]

// installedPanels (Map構造)
{
  "myext": {  // ← キーは extensionId のみ
    extensionId: "myext",
    extensionNamespace: "local",  // ← 後からロードされた方が優先
    registration: { name: "CustomPanel", ... }
  }
}
```

#### PanelCatalogの状態

```typescript
// panels
[
  {
    type: "myext.CustomPanel",  // ← 1つだけ存在
    extensionNamespace: "local",
    // ...
  }
]

// panelsByType (Map構造)
{
  "myext.CustomPanel": {  // ← キーは type のみ
    type: "myext.CustomPanel",
    extensionNamespace: "local",
    // ...
  }
}
```

#### 結果

✅ **重複は自動的に解決される**（後からロードされた方が優先）
✅ **パネルタイプは同じ**（`myext.CustomPanel`）
✅ **レイアウトは正常に動作**

---

## 📊 データフロー図

### インストールから表示まで

```
┌────────────────────────────────────────────────────────┐
│ 1. インストール                                         │
│    namespace: "local" OR "official"                    │
└────────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────────┐
│ 2. ストレージに保存                                     │
│    - IndexedDB: extensions-{namespace}                 │
│    - FileSystem: ~/.lichtblick-suite/extensions/       │
│                                                         │
│    保存データ:                                          │
│    {                                                   │
│      id: "publisher.extension",                       │
│      namespace: "local",  ← 保存されるが...           │
│      // ...                                            │
│    }                                                   │
└─��──────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────────┐
│ 3. ExtensionCatalogProvider - refreshAllExtensions    │
│    - 全namespaceのローダーから拡張機能をロード          │
│    - installedExtensions に追加                        │
│    - installedPanels に追加（キー: extensionId）      │
└────────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────────┐
│ 4. PanelCatalogProvider                                │
│    - extensionPanels から wrappedExtensionPanels 生成 │
│                                                         │
│    パネルタイプ生成:                                    │
│    type = `${extensionName}.${panelName}`             │
│         = "publisher.extension.CustomPanel"           │
│    ↑                                                   │
│    namespace は含まれない！                            │
└────────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────────┐
│ 5. PanelCatalog.panels                                 │
│    [                                                   │
│      {                                                 │
│        type: "publisher.extension.CustomPanel",       │
│        extensionNamespace: "local",  ← 表示用のみ     │
│        // ...                                          │
│      }                                                 │
│    ]                                                   │
└────────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────────┐
│ 6. AddPanelMenu - パネル選択                           │
│    - PanelCatalog.panels から選択                     │
│    - type を使用してパネルを特定                       │
└────────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────────┐
│ 7. パネルID生成                                         │
│    panelId = getPanelIdForType(type)                  │
│            = "publisher.extension.CustomPanel!abc123" │
│    ↑                                                   │
│    namespace は含まれない！                            │
└────────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────────┐
│ 8. レイアウトに保存                                     │
│    {                                                   │
│      layout: "publisher.extension.CustomPanel!abc123",│
│      configById: {                                     │
│        "publisher.extension.CustomPanel!abc123": {}   │
│      }                                                 │
│    }                                                   │
│    ↑                                                   │
│    namespace は保存されない！                          │
└────────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────────┐
│ 9. レイアウトのロード                                   │
│    - panelId から type を抽出                          │
│    - PanelCatalog.getPanelByType(type) で検索         │
│    - namespace は使用されない！                        │
└────────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────────┐
│ 10. パネルのレンダリング                                │
│     - panelInfo.module() でコンポーネントをロード      │
│     - Panel HOC でラップ                               │
│     - 画面に表示                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🔍 namespace 非依存性の証明

### コード解析による証明

#### 1. パネルタイプ生成（namespace なし）

```typescript
// packages/suite-base/src/providers/PanelCatalogProvider.tsx L108

const panelType = `${panel.extensionName}.${panel.registration.name}`;
//                  ↑                    ↑
//                  publisher            PanelName
//
// namespace は使用されていない
```

#### 2. パネルID生成（namespace なし）

```typescript
// packages/suite-base/src/util/layout.ts L51

export function getPanelIdForType(type: string): string {
  const rnd = Math.round(Math.random() * factor).toString(36);
  return `${type}!${rnd}`;
  //       ↑
  //       type のみ使用
  //       namespace は含まれていない
}
```

#### 3. パネル検索（namespace なし）

```typescript
// packages/suite-base/src/providers/PanelCatalogProvider.tsx L173

getPanelByType(type: string) {
  return panelsByType.get(type);
  //                      ↑
  //                      type で検索
  //                      namespace は使用されない
}
```

#### 4. installedPanels のキー（extensionId のみ）

```typescript
// packages/suite-base/src/context/ExtensionCatalogContext.ts

export type RegisteredPanel = {
  extensionId: string; // "publisher.extension"
  extensionName: string; // "My Extension"
  extensionNamespace?: Namespace; // "local" | "official" | "org"
  registration: ExtensionPanelRegistration;
};

// installedPanels の型
installedPanels: Record<string, RegisteredPanel>;
//                      ↑
//                      キーは extensionId
//                      namespace ではない
```

### 結論

**namespace はパネルの識別に一切使用されていない**

使用されているのは:

- ✅ `extensionId` (例: "publisher.extension")
- ✅ `panelType` (例: "publisher.extension.Panel")
- ✅ `panelId` (例: "publisher.extension.Panel!abc123")

---

## 🎯 実践的な検証方法

### 検証1: コンソールでの確認

```javascript
// ブラウザのDevTools Consoleで実行

// 1. PanelCatalogの確認
const panels = /* PanelCatalogContextから取得 */;
console.log("All panels:", panels.map(p => ({
  type: p.type,
  namespace: p.extensionNamespace,
})));

// 出力例:
// [
//   { type: "Plot", namespace: undefined },
//   { type: "myext.CustomPanel", namespace: "local" },
//   { type: "another.Panel", namespace: "official" }
// ]
// ↑ type に namespace は含まれていない

// 2. レイアウトの確認
const layout = /* CurrentLayoutContextから取得 */;
console.log("Layout panels:", Object.keys(layout.configById));

// 出力例:
// [
//   "Plot!abc123",
//   "myext.CustomPanel!def456",
//   "another.Panel!ghi789"
// ]
// ↑ パネルIDに namespace は含まれていない

// 3. パネルタイプの抽出
const panelId = "myext.CustomPanel!def456";
const panelType = panelId.split("!")[0];
console.log("Panel type:", panelType);
// → "myext.CustomPanel"
// ↑ namespace は含まれていない
```

### 検証2: namespace を変更して動作確認

#### 手順

1. **拡張機能を `official` namespaceにインストール**

   ```typescript
   await installExtensions("official", [extensionData]);
   ```

2. **拡張機能パネルを含むレイアウトを保存**

   ```json
   {
     "layout": "myext.Panel!abc",
     "configById": {
       "myext.Panel!abc": { "option": true }
     }
   }
   ```

3. **コードを修正して `local` namespaceを使用**

   ```typescript
   // ExtensionMarketplaceSettings.tsx
   const targetNamespace = "local"; // "official" から変更
   ```

4. **同じ拡張機能を `local` namespaceに再インストール**

   ```typescript
   await installExtensions("local", [extensionData]);
   ```

5. **以前保存したレイアウトを開く**

#### 期待される結果

✅ レイアウトが正常にロードされる
✅ パネルが正常に表示される
✅ パネルの設定が保持される
✅ パネルが正常に動作する

#### 理由

- レイアウトファイルのパネルID: `"myext.Panel!abc"`
- パネルタイプ: `"myext.Panel"`（namespace なし）
- PanelCatalog検索: `getPanelByType("myext.Panel")`
- `local` namespaceの拡張機能も `"myext.Panel"` というタイプで登録される
- **一致！** → パネルが見つかる

---

## 📚 関連コードリファレンス

### 主要ファイル

| ファイル                                                         | 役割                 | namespace の使用        |
| ---------------------------------------------------------------- | -------------------- | ----------------------- |
| `packages/suite-base/src/util/layout.ts`                         | パネルID生成・抽出   | ❌ 使用しない           |
| `packages/suite-base/src/providers/PanelCatalogProvider.tsx`     | パネルカタログ統合   | ❌ 検索に使用しない     |
| `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx` | 拡張機能統合         | ✅ ロード時のみ使用     |
| `packages/suite-base/src/components/Panel.tsx`                   | パネルHOC            | ❌ 使用しない           |
| `packages/suite-base/src/context/PanelCatalogContext.ts`         | パネルカタログ型定義 | ⚠️ メタデータとして保持 |

### 重要な関数

```typescript
// パネルタイプ生成（namespace なし）
function generatePanelType(extensionName: string, panelName: string): string {
  return `${extensionName}.${panelName}`;
}

// パネルID生成（namespace なし）
function getPanelIdForType(type: string): string {
  return `${type}!${randomId}`;
}

// パネルタイプ抽出（namespace なし）
function getPanelTypeFromId(id: string): string {
  return id.split("!")[0];
}

// パネル検索（namespace なし）
function getPanelByType(type: string): PanelInfo | undefined {
  return panelsByType.get(type);
}
```

---

## 🏁 まとめ

### namespace の役割

1. **ストレージの分離**: 異なるソースの拡張機能を異なるストレージまたはディレクトリに保存
   - **Web版**: IndexedDB（namespaceごとに別データベース）
   - **デスクトップ版（推奨）**: ファイルシステム（namespaceごとのサブディレクトリ）
2. **UI表示のグループ化**: 拡張機能一覧でタブ分け
3. **アンインストール時のローダー選択**: 適切なローダーを選択

### 環境ごとの最適なストレージ戦略

| 環境             | 推奨ストレージ   | namespace 対応                                |
| ---------------- | ---------------- | --------------------------------------------- |
| **デスクトップ** | ファイルシステム | `~/.lichtblick-suite/extensions/{namespace}/` |
| **Web**          | IndexedDB        | `extensions-{namespace}` データベース         |

**現在の問題**: デスクトップ版でIndexedDBとファイルシステムが混在
**解決策**: `/docs/implementation/desktop-extension-loader-improvement.md` を参照

### namespace が使用されない場面

1. ✅ **パネルタイプの生成**
2. ✅ **パネルIDの生成**
3. ✅ **レイアウトの保存**
4. ✅ **パネルの検索**
5. ✅ **パネルのレンダリング**

### 結論

**namespace を変更しても、既存のextensionやレイアウトは正常に動作します。**

理由:

- パネルの識別は `extensionName.panelName` 形式のみ
- レイアウトには namespace 情報が含まれない
- パネル検索に namespace は使用されない
- 拡張機能のキーは `extensionId` のみ

### 保証される互換性

✅ **既存レイアウトの動作**: namespace 変更前のレイアウトも正常に開ける
✅ **拡張機能パネルの表示**: すべてのnamespaceの拡張機能パネルが利用可能
✅ **設定の保持**: パネル設定はパネルIDに紐付いており、namespace 非依存
✅ **ドラッグ&ドロップ**: パネルの追加・移動も正常に動作

---

## 🔗 関連ドキュメント

### トラブルシューティング・実装ガイド

- [マーケットプレイス拡張機能永続化問題のトラブルシューティング](/docs/troubleshooting/marketplace-extension-persistence-issue.md)
- [デスクトップ版拡張機能ローダーの改善提案](/docs/implementation/desktop-extension-loader-improvement.md)

### ソースコード

- [PanelCatalogProvider実装](../../packages/suite-base/src/providers/PanelCatalogProvider.tsx)
- [ExtensionCatalogProvider実装](../../packages/suite-base/src/providers/ExtensionCatalogProvider.tsx)
- [Layout Utils実装](../../packages/suite-base/src/util/layout.ts)
- [DesktopExtensionLoader実装](../../packages/suite-desktop/src/renderer/services/DesktopExtensionLoader.ts)
- [IdbExtensionLoader実装](../../packages/suite-base/src/services/extension/IdbExtensionLoader.ts)

---

## 🎓 技術的な深掘り

### なぜ namespace をパネルタイプに含めないのか？

#### 設計上の理由

1. **一意性の保証**: `extensionId` (=`publisher.extension`) が既に一意
2. **シンプルさ**: 追加の識別子が不要
3. **柔軟性**: namespace を変更してもパネルタイプは変わらない
4. **互換性**: レイアウトファイルの移植性が高い

#### 代替案との比較

**案A: namespace を含める** ❌

```typescript
// パネルタイプ: "local.publisher.extension.Panel"
const panelType = `${namespace}.${extensionName}.${panelName}`;

// 問題点:
// - namespace を変更するとパネルタイプも変わる
// - 既存レイアウトとの互換性が失われる
// - 同じ拡張機能を異なるnamespaceにインストールすると別パネルとして扱われる
```

**案B: namespace を含めない（現在の実装）** ✅

```typescript
// パネルタイプ: "publisher.extension.Panel"
const panelType = `${extensionName}.${panelName}`;

// 利点:
// - namespace 変更の影響を受けない
// - レイアウトの互換性が保たれる
// - 同じ拡張機能は同じパネルタイプ
```

### extensionNamespace の存在理由

```typescript
export type PanelInfo = {
  type: string;
  extensionNamespace?: Namespace; // なぜ存在する？
  // ...
};
```

#### 用途

1. **表示用の追加情報**: UI上でどのnamespaceからロードされたかを表示
2. **デバッグ**: 拡張機能のソースを特定
3. **アンインストール**: アンインストール時にnamespaceを指定

#### 重要な点

**識別には使用されない！**

---

以上が、拡張機能とレイアウトの読み込み機構に関する詳細な技術ドキュメントです。
