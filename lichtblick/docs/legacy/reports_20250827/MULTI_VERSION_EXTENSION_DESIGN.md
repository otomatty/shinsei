# 複数バージョン対応拡張機能システム 設計書

## 1. 現在の問題点

### 1.1 バージョン制限の原因

現在のLichtblick実装では、拡張機能IDが以下の形式で生成されている：

```typescript
// packages/suite-base/src/services/IdbExtensionLoader.ts
id: `${normalizedPublisher}.${rawInfo.name}`;
```

この方式では、同一のpublisher.name組み合わせは常に同じIDになるため、**複数バージョンの並列インストールが不可能**である。

### 1.2 ストレージレベルの制限

**IndexedDB（Web版）**:

```typescript
interface ExtensionsDB extends IDB.DBSchema {
  metadata: {
    key: string; // extension ID（バージョンなし）
    value: ExtensionInfo;
  };
  extensions: {
    key: string; // extension ID（バージョンなし）
    value: StoredExtension;
  };
}
```

**ファイルシステム（Desktop版）**:

```bash
~/.lichtblick-suite/extensions/
├── publisher.extension-name-1.0.0/  # ディレクトリ名にバージョン含む
└── publisher.extension-name-2.0.0/  # でもIDは同じ
```

## 2. 解決方針

### 2.1 バージョン付きID体系

```typescript
// 新しいID生成方式
id: `${normalizedPublisher}.${rawInfo.name}@${rawInfo.version}`;

// 例:
// "mycompany.awesome-panel@1.0.0"
// "mycompany.awesome-panel@2.0.0"
// "mycompany.awesome-panel@3.0.0-beta.1"
```

### 2.2 独立実装戦略

既存システムと独立させるため、**新しい名前空間**を導入：

```typescript
export type ExtensionNamespace =
  | "local" // 既存：ローカルインストール拡張機能
  | "org" // 既存：組織管理拡張機能
  | "sora-local"; // 新規：Sora複数バージョン対応拡張機能
```

## 3. 詳細設計

### 3.1 新しい拡張機能情報構造

```typescript
export interface MultiVersionExtensionInfo extends ExtensionInfo {
  // バージョン付きID
  id: string; // "publisher.name@version"

  // バージョン管理用
  baseId: string; // "publisher.name"（バージョンなし）
  version: string; // "1.0.0"
  semver: SemVer; // パース済みバージョン

  // 並列管理用
  isActive: boolean; // このバージョンがアクティブか
  installDate: Date; // インストール日時

  // 既存フィールドはそのまま継承
  name: string;
  displayName: string;
  // ...
}
```

### 3.2 マルチバージョン対応ストレージ

#### Web版（IndexedDB）

```typescript
interface MultiVersionExtensionsDB extends IDB.DBSchema {
  // バージョン付きメタデータ
  metadata: {
    key: string; // "publisher.name@version"
    value: MultiVersionExtensionInfo;
  };

  // バージョン付き拡張機能
  extensions: {
    key: string; // "publisher.name@version"
    value: StoredMultiVersionExtension;
  };

  // バージョン管理インデックス
  versionIndex: {
    key: string; // "publisher.name"
    value: {
      baseId: string;
      versions: Array<{
        version: string;
        id: string;
        isActive: boolean;
        installDate: Date;
      }>;
    };
  };
}
```

#### Desktop版（ファイルシステム）

```bash
~/.lichtblick-suite/extensions/sora-local/
├── mycompany.awesome-panel@1.0.0/
│   ├── package.json
│   ├── dist/extension.js
│   └── .version-meta.json    # バージョン管理メタデータ
├── mycompany.awesome-panel@2.0.0/
│   ├── package.json
│   ├── dist/extension.js
│   └── .version-meta.json
└── .version-registry.json    # 全バージョン管理ファイル
```

### 3.3 新しいExtensionLoader実装

```typescript
export class MultiVersionExtensionLoader implements ExtensionLoader {
  readonly namespace = "sora-local";
  readonly #storage: IMultiVersionExtensionStorage;

  // バージョン付きID管理
  async getExtension(id: string): Promise<MultiVersionExtensionInfo | undefined> {
    return await this.#storage.get(id);
  }

  // 全バージョン取得
  async getExtensions(): Promise<MultiVersionExtensionInfo[]> {
    return await this.#storage.list();
  }

  // 特定拡張機能の全バージョン取得
  async getExtensionVersions(baseId: string): Promise<MultiVersionExtensionInfo[]> {
    const all = await this.getExtensions();
    return all
      .filter((ext) => ext.baseId === baseId)
      .sort((a, b) => semver.rcompare(a.version, b.version));
  }

  // アクティブバージョン取得
  async getActiveExtension(baseId: string): Promise<MultiVersionExtensionInfo | undefined> {
    const versions = await this.getExtensionVersions(baseId);
    return versions.find((ext) => ext.isActive);
  }

  // バージョン切り替え
  async setActiveVersion(baseId: string, version: string): Promise<void> {
    const versions = await this.getExtensionVersions(baseId);

    // 全バージョンを非アクティブに
    for (const ext of versions) {
      await this.#storage.updateActive(ext.id, false);
    }

    // 指定バージョンをアクティブに
    const targetId = `${baseId}@${version}`;
    await this.#storage.updateActive(targetId, true);
  }

  // 拡張機能ロード（アクティブバージョンのみ）
  async loadExtension(baseId: string): Promise<string> {
    const activeExt = await this.getActiveExtension(baseId);
    if (!activeExt) {
      throw new Error(`No active version found for extension: ${baseId}`);
    }

    const storedExt = await this.#storage.get(activeExt.id);
    if (!storedExt) {
      throw new Error(`Extension not found: ${activeExt.id}`);
    }

    // JSZipでコンテンツ展開
    const content = await new JSZip().loadAsync(storedExt.content);
    const rawContent = await content.file("dist/extension.js")?.async("string");

    if (!rawContent) {
      throw new Error(`Extension corrupted: ${activeExt.id}`);
    }

    return rawContent;
  }

  // インストール（バージョン付きID生成）
  async installExtension(foxeFileData: Uint8Array): Promise<MultiVersionExtensionInfo> {
    // package.json解析
    const pkgInfo = await this.parsePackageInfo(foxeFileData);

    // バージョン付きID生成
    const baseId = `${pkgInfo.publisher}.${pkgInfo.name}`;
    const versionedId = `${baseId}@${pkgInfo.version}`;

    // 既存バージョン確認
    const existingVersions = await this.getExtensionVersions(baseId);
    const isFirstInstall = existingVersions.length === 0;

    const info: MultiVersionExtensionInfo = {
      ...pkgInfo,
      id: versionedId,
      baseId,
      semver: semver.parse(pkgInfo.version)!,
      isActive: isFirstInstall, // 初回インストール時のみアクティブ
      installDate: new Date(),
      namespace: this.namespace,
      qualifiedName: this.generateQualifiedName(baseId, pkgInfo),
    };

    await this.#storage.put({
      content: foxeFileData,
      info,
    });

    return info;
  }

  // アンインストール（特定バージョン）
  async uninstallExtension(id: string): Promise<void> {
    const ext = await this.getExtension(id);
    if (!ext) {
      throw new Error(`Extension not found: ${id}`);
    }

    await this.#storage.delete(id);

    // アクティブバージョンを削除した場合、最新バージョンをアクティブに
    if (ext.isActive) {
      const remainingVersions = await this.getExtensionVersions(ext.baseId);
      if (remainingVersions.length > 0) {
        const latestVersion = remainingVersions[0]; // すでにソート済み
        await this.setActiveVersion(ext.baseId, latestVersion.version);
      }
    }
  }

  // 全バージョン削除
  async uninstallAllVersions(baseId: string): Promise<void> {
    const versions = await this.getExtensionVersions(baseId);
    for (const ext of versions) {
      await this.#storage.delete(ext.id);
    }
  }
}
```

### 3.4 UI拡張

#### バージョン管理コンポーネント

```typescript
export function ExtensionVersionManager({
  baseId,
  versions
}: {
  baseId: string;
  versions: MultiVersionExtensionInfo[];
}) {
  const [activeVersion, setActiveVersion] = useState<string>();

  const handleVersionSwitch = async (version: string) => {
    const loader = useMultiVersionExtensionLoader();
    await loader.setActiveVersion(baseId, version);
    setActiveVersion(version);
  };

  return (
    <div className="version-manager">
      <Typography variant="h6">Installed Versions</Typography>

      {versions.map(ext => (
        <div key={ext.id} className="version-item">
          <Chip
            label={ext.version}
            color={ext.isActive ? "primary" : "default"}
            onClick={() => handleVersionSwitch(ext.version)}
          />
          <Typography variant="caption">
            Installed: {ext.installDate.toLocaleDateString()}
          </Typography>
          <Button
            size="small"
            onClick={() => uninstallVersion(ext.id)}
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}
```

#### 拡張設定画面の拡張

```typescript
export function MultiVersionExtensionsSettings() {
  const multiLoader = useMultiVersionExtensionLoader();
  const [groupedExtensions, setGroupedExtensions] = useState<GroupedExtensions>({});

  useEffect(() => {
    loadExtensions();
  }, []);

  const loadExtensions = async () => {
    const extensions = await multiLoader.getExtensions();
    const grouped = groupBy(extensions, 'baseId');
    setGroupedExtensions(grouped);
  };

  return (
    <div className="multi-version-settings">
      <Typography variant="h5">Multi-Version Extensions</Typography>

      {Object.entries(groupedExtensions).map(([baseId, versions]) => (
        <ExtensionCard key={baseId}>
          <ExtensionBasicInfo extension={versions[0]} />
          <ExtensionVersionManager
            baseId={baseId}
            versions={versions}
          />
        </ExtensionCard>
      ))}
    </div>
  );
}
```

## 4. サーバー側実装

### 4.1 パブリックAPI設計

```typescript
// GET /api/extensions
interface MultiVersionExtensionCatalog {
  extensions: {
    [baseId: string]: {
      name: string;
      displayName: string;
      description: string;
      publisher: string;
      homepage?: string;
      license?: string;
      keywords?: string[];

      versions: {
        [version: string]: {
          version: string;
          foxe: string; // ダウンロードURL
          sha256sum: string; // ハッシュ
          readme?: string; // README URL
          changelog?: string; // CHANGELOG URL
          publishDate: string;
          dependencies?: Record<string, string>;
        };
      };

      latest: string; // 最新バージョン
      recommended?: string; // 推奨バージョン
    };
  };
}
```

### 4.2 サーバー実装例（Express.js）

```typescript
import express from "express";
import multer from "multer";
import { S3Client } from "@aws-sdk/client-s3";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// パブリック拡張機能カタログ
app.get("/api/extensions", async (req, res) => {
  try {
    const catalog = await extensionService.getPublicCatalog();
    res.json(catalog);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch extensions" });
  }
});

// 特定拡張機能の詳細
app.get("/api/extensions/:baseId", async (req, res) => {
  try {
    const { baseId } = req.params;
    const extension = await extensionService.getExtension(baseId);

    if (!extension) {
      return res.status(404).json({ error: "Extension not found" });
    }

    res.json(extension);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch extension" });
  }
});

// 特定バージョンのダウンロード
app.get("/api/extensions/:baseId/:version/download", async (req, res) => {
  try {
    const { baseId, version } = req.params;
    const downloadUrl = await extensionService.getDownloadUrl(baseId, version);

    if (!downloadUrl) {
      return res.status(404).json({ error: "Version not found" });
    }

    // S3の署名付きURLにリダイレクト
    res.redirect(downloadUrl);
  } catch (error) {
    res.status(500).json({ error: "Failed to get download URL" });
  }
});

// 拡張機能アップロード（認証必要）
app.post(
  "/api/extensions/upload",
  authenticateUser, // 認証ミドルウェア
  upload.single("foxe"),
  async (req, res) => {
    try {
      const foxeFile = req.file;
      if (!foxeFile) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const result = await extensionService.uploadExtension(foxeFile.buffer, req.user.id);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload extension" });
    }
  },
);

// バージョン削除
app.delete(
  "/api/extensions/:baseId/:version",
  authenticateUser,
  authorizeExtensionOwner,
  async (req, res) => {
    try {
      const { baseId, version } = req.params;
      await extensionService.deleteVersion(baseId, version, req.user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete version" });
    }
  },
);
```

### 4.3 ストレージ構成

```yaml
# AWS S3バケット構成
my-extensions-bucket/
├── extensions/
│   ├── mycompany.awesome-panel/
│   │   ├── 1.0.0/
│   │   │   ├── mycompany.awesome-panel-1.0.0.foxe
│   │   │   ├── README.md
│   │   │   └── CHANGELOG.md
│   │   ├── 2.0.0/
│   │   │   ├── mycompany.awesome-panel-2.0.0.foxe
│   │   │   ├── README.md
│   │   │   └── CHANGELOG.md
│   │   └── metadata.json
│   └── catalog.json  # 全体カタログ
├── uploads/           # 一時アップロード領域
└── manifests/         # バージョン管理マニフェスト
```

## 5. 移行戦略

### 5.1 段階的導入

**Phase 1: 基盤実装**

- MultiVersionExtensionLoader実装
- 新しいストレージシステム構築
- 基本UI追加

**Phase 2: サーバー構築**

- パブリックAPIサーバー実装
- S3ストレージ設定
- アップロード機能

**Phase 3: 高度な機能**

- バージョン推奨システム
- 依存関係管理
- 自動更新通知

### 5.2 既存システムとの共存

```typescript
// 既存ExtensionCatalogProviderを拡張
export default function EnhancedExtensionCatalogProvider({
  children,
  loaders,
  mockMessageConverters,
}: PropsWithChildren<{
  loaders: readonly ExtensionLoader[];
  mockMessageConverters?: readonly RegisterMessageConverterArgs<unknown>[];
}>) {

  // 既存ローダーに加えて、新しいMultiVersionLoaderを追加
  const enhancedLoaders = useMemo(() => [
    ...loaders,
    new MultiVersionExtensionLoader("sora-local"),
  ], [loaders]);

  return (
    <ExtensionCatalogProvider
      loaders={enhancedLoaders}
      mockMessageConverters={mockMessageConverters}
    >
      {children}
    </ExtensionCatalogProvider>
  );
}
```

## 6. 利点と考慮事項

### 6.1 利点

1. **完全独立**: 既存システムへの影響なし
2. **段階的移行**: 既存拡張機能は従来通り動作
3. **柔軟なバージョン管理**: 開発者が複数バージョンを並列テスト可能
4. **ロールバック対応**: 問題のあるバージョンから即座に戻せる
5. **パブリック配布**: 誰でもアクセス可能な拡張機能ストア

### 6.2 考慮事項

1. **ストレージ使用量増加**: 複数バージョン保持により容量増大
2. **UI複雑化**: バージョン選択UIが必要
3. **依存関係管理**: バージョン間の互換性問題
4. **テスト負荷**: 複数バージョンでのテストが必要

## 7. 実装優先度

### 高優先度

- [x] MultiVersionExtensionLoader基本実装
- [x] バージョン付きID体系
- [x] ストレージ拡張

### 中優先度

- [ ] UI拡張（バージョン管理画面）
- [ ] サーバーAPI基本実装
- [ ] パブリックカタログ機能

### 低優先度

- [ ] 依存関係管理
- [ ] 自動更新システム
- [ ] 推奨バージョン機能

---

この設計により、既存Lichtblickとの互換性を保ちながら、複数バージョン対応の拡張機能システムを構築できる。独立した名前空間`"sora-local"`を使用することで、将来的なマージ作業の負担も最小化される。
