# displayName の起源調査レポート

## 基本情報

- **調査日**: 2025-10-16
- **目的**: `displayName`がどこから登場しているのかを追跡
- **結論**: `displayName`は拡張機能の`package.json`に含まれ、`.foxe`ファイルからロードされる

## 調査結果

### 🔍 displayName の起源

#### 1. ExtensionInfo 型定義

```typescript
// packages/suite-base/src/types/Extensions.ts
export type ExtensionInfo = {
  id: string;
  description: string;
  displayName: string; // ✓ 必須フィールド
  homepage: string;
  keywords: string[];
  license: string;
  name: string;
  // ...
};
```

- `ExtensionInfo`型で`displayName`は**必須フィールド**として定義されている

#### 2. 拡張機能のpackage.jsonに含まれる

**実際の拡張機能の例**:

```json
// extensions/mcap-indexing-extension/package.json
{
  "name": "mcap-indexing-extension",
  "displayName": "MCAP Indexing Tool", // ✓ displayNameが含まれる
  "description": "Create indexed versions of MCAP files for better performance",
  "publisher": "lichtblick-tools",
  "version": "1.0.0",
  "keywords": [
    // ✓ keywordsも含まれる
    "mcap",
    "indexing",
    "performance",
    "lichtblick"
  ]
}
```

```json
// extensions/autonomous-driving-monitor/package.json
{
  "name": "autonomous-driving-monitor",
  "displayName": "Autonomous Driving Monitor", // ✓ displayNameが含まれる
  "description": "Real-time visualization tools for autonomous driving systems",
  "publisher": "lichtblick-demo",
  "version": "0.1.0",
  "keywords": [] // ✓ keywordsも含まれる
}
```

#### 3. .foxeファイルからのロード

**IdbExtensionLoader.ts** (Line 83-112):

```typescript
public async installExtension({
  foxeFileData,
  externalId,
}: InstallExtensionProps): Promise<ExtensionInfo> {
  log.debug("[IndexedDB] Installing extension");

  const decompressedData = await decompressFile(foxeFileData);

  // package.jsonを.foxeファイルから抽出
  const rawPackageFile = await extractFoxeFileContent(decompressedData, ALLOWED_FILES.PACKAGE);
  if (!rawPackageFile) {
    throw new Error(
      `Corrupted extension. File "${ALLOWED_FILES.PACKAGE}" is missing in the extension source.`,
    );
  }

  const readme = (await extractFoxeFileContent(decompressedData, ALLOWED_FILES.README)) ?? "";
  const changelog = (await extractFoxeFileContent(decompressedData, ALLOWED_FILES.CHANGELOG)) ?? "";

  // package.jsonをパースしてExtensionInfoを生成
  const rawInfo = validatePackageInfo(JSON.parse(rawPackageFile) as Partial<ExtensionInfo>);
  // ↑ この時点で displayName, keywords, name などがすべて含まれる

  const normalizedPublisher = rawInfo.publisher.replace(/[^A-Za-z0-9_\s]+/g, "");

  // Generate V2 format ID: "publisher.name@version"
  const baseId = `${normalizedPublisher}.${rawInfo.name}`;
  const versionedId = toVersionedId(baseId, rawInfo.version);

  const newExtension: StoredExtension = {
    content: foxeFileData,
    info: {
      ...rawInfo,  // displayName, keywords, name などがすべて含まれる
      id: versionedId,
      namespace: this.namespace,
      qualifiedName: qualifiedName(this.namespace, normalizedPublisher, rawInfo),
      readme,
      changelog,
      externalId,
    },
  };

  const storedExtension = await this.#storage.put(newExtension);
  return storedExtension.info;
}
```

**処理フロー**:

1. `.foxe`ファイルを解凍
2. `package.json`を抽出
3. `package.json`をパースして`ExtensionInfo`を生成
4. この時点で`displayName`, `keywords`, `name`などがすべて含まれる

#### 4. validatePackageInfo の処理

```typescript
// packages/suite-base/src/services/extension/utils/validatePackageInfo.ts
export default function validatePackageInfo(info: Partial<ExtensionInfo>): ExtensionInfo {
  if (!info.name || info.name.length === 0) {
    throw new Error("Invalid extension: missing name");
  }
  const { publisher: parsedPublisher, name } = parsePackageName(info.name);
  const publisher = info.publisher ?? parsedPublisher;
  if (!publisher || publisher.length === 0) {
    throw new Error("Invalid extension: missing publisher");
  }

  // info に displayName が含まれていることを前提としている
  return { ...info, publisher, name: name.toLowerCase() } as ExtensionInfo;
}
```

- `package.json`に含まれるすべてのフィールド（`displayName`, `keywords`含む）がそのまま`ExtensionInfo`に含まれる

### 🎯 重要な発見

#### ✅ displayName は .foxe ファイルから来る

1. **拡張機能の`package.json`には`displayName`が含まれる** (Lichtblickの標準)
2. `.foxe`ファイルをインストールする際、`package.json`から`displayName`が読み込まれる
3. `ExtensionInfo`型は`displayName`を必須フィールドとして定義している

#### ✅ keywords も .foxe ファイルから来る

1. 拡張機能の`package.json`には`keywords`配列が含まれる
2. `.foxe`ファイルから`keywords`が読み込まれる
3. `ExtensionInfo`型は`keywords`を必須フィールドとして定義している

#### ❌ サーバーの extensions.json には不要

**サーバーの`extensions.json`には以下が必要**:

- `id`, `name`, `publisher`, `description`, `homepage`, `license`
- `namespace`, `readme`, `changelog`, `versions`
- `thumbnail` (マーケットプレイス独自)
- ~~`displayName`~~ (不要: `.foxe`から取得)
- ~~`keywords`~~ (不要: `.foxe`から取得)

**理由**:

- サーバーの`extensions.json`は`.foxe`ファイルへのリンクと基本情報のみを提供
- 実際に拡張機能をインストールする際、`.foxe`ファイルから`package.json`を読み込む
- `package.json`に含まれる`displayName`と`keywords`が`ExtensionInfo`に反映される

## 結論

### 📌 displayName と keywords の流れ

```
拡張機能開発者
  ↓
package.json に displayName と keywords を記述
  ↓
.foxe ファイルを作成 (package.json を含む)
  ↓
サーバーに .foxe ファイルをアップロード
  ↓
サーバーの extensions.json に基本情報を登録
  (displayName と keywords は不要)
  ↓
ユーザーが拡張機能をインストール
  ↓
.foxe ファイルをダウンロード
  ↓
package.json を抽出
  ↓
displayName と keywords を含む ExtensionInfo を生成
  ↓
IndexedDB に保存
```

### 🎯 修正方針の見直し

#### ❌ 誤った理解

- サーバーの`extensions.json`に`displayName`と`keywords`を追加する必要がある

#### ✅ 正しい理解

1. **サーバーの`extensions.json`には`displayName`と`keywords`は不要**

   - `.foxe`ファイルの`package.json`から自動的に取得される

2. **型エラーの真の原因**

   - `useExtensionSettings`で`.foxe`から読み込まれた`ExtensionInfo`を使用しているが、
   - 一部の処理で`displayName`と`keywords`が抜け落ちていた

3. **修正すべき箇所**
   - サーバーの`extensions.json`ではなく、
   - フロントエンドの型定義と処理を修正する

### 📝 正しい修正方針

#### Phase 1: サーバースキーマの修正 (オプション)

```javascript
// server/schemas.js
export const extensionSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  // displayName: 不要 (.foxe から取得)
  publisher: { type: "string", required: true },
  description: { type: "string", required: true },
  homepage: { type: "string", required: false },
  license: { type: "string", required: false },
  // keywords: 不要 (.foxe から取得)
  thumbnail: { type: "string|null", required: false }, // マーケットプレイス独自
  namespace: { type: "string", required: true },
  readme: { type: "string", required: false },
  changelog: { type: "string", required: false },
  versions: { type: "object", required: true },
};
```

#### Phase 2: ExtensionInfo 型に thumbnail を追加

```typescript
// packages/suite-base/src/types/Extensions.ts
export type ExtensionInfo = {
  id: string;
  description: string;
  displayName: string; // .foxe から取得
  homepage: string;
  keywords: string[]; // .foxe から取得
  license: string;
  name: string;
  namespace?: Namespace;
  publisher: string;
  qualifiedName: string;
  version: string;
  readme?: string;
  changelog?: string;
  externalId?: string;
  thumbnail?: string; // ✅ 追加: マーケットプレイス独自
};
```

#### Phase 3: useExtensionSettings の修正

```typescript
// packages/suite-base/src/components/ExtensionsSettings/hooks/useExtensionSettings.ts
return {
  id: entry.id,
  installed: true,
  name: entry.name,
  displayName: entry.displayName, // ✅ .foxe から取得済み
  description: entry.description,
  publisher: entry.publisher,
  homepage: entry.homepage,
  license: entry.license,
  version: entry.version,
  keywords: entry.keywords, // ✅ .foxe から取得済み
  thumbnail: entry.thumbnail, // ✅ 追加
  namespace: entry.namespace,
  qualifiedName: entry.qualifiedName,
  readme: entry.readme,
  changelog: entry.changelog,
};
```

## 次のアクション

1. ⬜ サーバースキーマから`keywords`と`displayName`を削除（オプション）
2. ⬜ `ExtensionInfo`型に`thumbnail`を追加
3. ⬜ `useExtensionSettings`で`displayName`と`keywords`をそのまま使用
4. ⬜ Sora関連ファイルで`name`を使用している箇所を`displayName`に変更
5. ⬜ テストの実行と確認

## 関連イシュー

- [20251016_01_useExtensionSettings-type-mismatch.md](./20251016_01_useExtensionSettings-type-mismatch.md)
- [20251016_02_useExtensionSettings-usage-analysis.md](./20251016_02_useExtensionSettings-usage-analysis.md)
- [20251016_03_sora-extension-type-independence-analysis.md](./20251016_03_sora-extension-type-independence-analysis.md)
- [20251016_04_root-cause-solution-keywords-displayname-thumbnail.md](./20251016_04_root-cause-solution-keywords-displayname-thumbnail.md)
