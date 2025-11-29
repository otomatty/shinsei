# ハイブリッドバージョンデータ構造設計書

**作成日**: 2025年9月29日
**対象**: 単一バージョン（既存）と複数バージョン（新規）の共存仕様
**目標**: 後方互換性を保ちながら段階的な移行を実現

## 📋 概要

### 設計目標

1. **後方互換性**: 既存のextensions.json構造を完全サポート
2. **段階的移行**: 単一→複数バージョンへのスムーズな移行
3. **透明性**: アプリケーション側でのデータ構造差分を吸収
4. **拡張性**: 将来的な機能拡張に対応

### アプローチ

- **データレイヤーでの統一**: 異なる構造を内部で統一された形式に変換
- **型安全性**: TypeScriptによる型チェックで安全性確保
- **自動検出**: データ構造を自動判別して適切に処理

## 🏗️ データ構造仕様

### 1. 既存構造（単一バージョン）

```typescript
// 現在のextensions.json形式
interface LegacyExtensionData {
  id: string;
  name: string;
  version: string; // 単一バージョン文字列
  publisher: string;
  description: string;
  homepage?: string;
  readme?: string;
  changelog?: string;
  license?: string;
  sha256sum?: string;
  foxe?: string;
  keywords?: string[];
}
```

### 2. 新規構造（複数バージョン対応）

```typescript
// 新しい複数バージョン対応形式
interface MultiVersionExtensionData {
  id: string; // baseId として機能
  name: string;
  publisher: string;
  description: string;
  homepage?: string;
  license?: string;
  keywords?: string[];

  // 複数バージョン情報
  versions: {
    [version: string]: {
      version: string;
      publishedDate: string;
      sha256sum?: string;
      foxe?: string;
      readme?: string;
      changelog?: string;
      isLatest?: boolean;
      deprecated?: boolean;
    };
  };

  // メタデータ
  latest: string; // 最新バージョン識別子
  supported: string[]; // サポート対象バージョン一覧
}
```

### 3. 統一内部形式

```typescript
// アプリケーション内部で使用する統一形式
interface UnifiedExtensionData {
  // 基本情報
  baseId: string; // グループ識別子
  id: string; // 個別バージョン識別子 (baseId@version)
  name: string;
  publisher: string;
  description: string;
  homepage?: string;
  license?: string;
  keywords?: string[];

  // バージョン情報
  version: string; // 現在のバージョン
  isLatest: boolean;
  publishedDate?: string;

  // リソース
  sha256sum?: string;
  foxe?: string;
  readme?: string;
  changelog?: string;

  // メタデータ
  dataSource: "legacy" | "multi-version";
  availableVersions?: string[]; // このbaseIdで利用可能な全バージョン
}
```

## 🔄 データ変換ロジック

### 1. 自動検出機能

```typescript
// データ構造自動判別
function detectDataStructure(data: unknown): "legacy" | "multi-version" | "unknown" {
  if (Array.isArray(data)) {
    // 配列の場合、最初の要素を確認
    const sample = data[0];
    if (!sample) return "unknown";

    // versionsフィールドの存在で判別
    if (typeof sample === "object" && sample !== null) {
      if ("versions" in sample && typeof sample.versions === "object") {
        return "multi-version";
      } else if ("version" in sample && typeof sample.version === "string") {
        return "legacy";
      }
    }
  }

  return "unknown";
}
```

### 2. Legacy → Unified変換

```typescript
function convertLegacyToUnified(legacy: LegacyExtensionData): UnifiedExtensionData {
  return {
    baseId: legacy.id,
    id: `${legacy.id}@${legacy.version}`,
    name: legacy.name,
    publisher: legacy.publisher,
    description: legacy.description,
    homepage: legacy.homepage,
    license: legacy.license,
    keywords: legacy.keywords,

    version: legacy.version,
    isLatest: true, // 単一バージョンなので常にlatest
    publishedDate: undefined,

    sha256sum: legacy.sha256sum,
    foxe: legacy.foxe,
    readme: legacy.readme,
    changelog: legacy.changelog,

    dataSource: "legacy",
    availableVersions: [legacy.version],
  };
}
```

### 3. MultiVersion → Unified変換

```typescript
function convertMultiVersionToUnified(multi: MultiVersionExtensionData): UnifiedExtensionData[] {
  const results: UnifiedExtensionData[] = [];

  Object.entries(multi.versions).forEach(([versionKey, versionData]) => {
    results.push({
      baseId: multi.id,
      id: `${multi.id}@${versionData.version}`,
      name: multi.name,
      publisher: multi.publisher,
      description: multi.description,
      homepage: multi.homepage,
      license: multi.license,
      keywords: multi.keywords,

      version: versionData.version,
      isLatest: versionData.version === multi.latest,
      publishedDate: versionData.publishedDate,

      sha256sum: versionData.sha256sum,
      foxe: versionData.foxe,
      readme: versionData.readme,
      changelog: versionData.changelog,

      dataSource: "multi-version",
      availableVersions: Object.keys(multi.versions),
    });
  });

  return results;
}
```

## 🌐 API設計

### 1. データローダー抽象化

```typescript
interface UniversalExtensionLoader {
  /**
   * 全拡張機能データを統一形式で取得
   */
  getAllExtensions(): Promise<UnifiedExtensionData[]>;

  /**
   * 特定baseIdの全バージョンを取得
   */
  getExtensionVersions(baseId: string): Promise<UnifiedExtensionData[]>;

  /**
   * 最新バージョンのみを取得
   */
  getLatestExtensions(): Promise<UnifiedExtensionData[]>;

  /**
   * データソース情報を取得
   */
  getDataSourceInfo(): Promise<{
    type: "legacy" | "multi-version" | "hybrid";
    extensionCount: number;
    versionCount: number;
  }>;
}
```

### 2. 実装例

```typescript
class HybridExtensionLoader implements UniversalExtensionLoader {
  private cache: Map<string, UnifiedExtensionData[]> = new Map();

  async getAllExtensions(): Promise<UnifiedExtensionData[]> {
    const cacheKey = "all-extensions";
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // まず新形式を試行
      const multiVersionData = await this.fetchMultiVersionData();
      if (multiVersionData) {
        const unified = this.processMultiVersionData(multiVersionData);
        this.cache.set(cacheKey, unified);
        return unified;
      }
    } catch (error) {
      console.warn("Multi-version data fetch failed, falling back to legacy:", error);
    }

    // フォールバック: 既存形式
    const legacyData = await this.fetchLegacyData();
    const unified = this.processLegacyData(legacyData);
    this.cache.set(cacheKey, unified);
    return unified;
  }

  private async fetchLegacyData(): Promise<LegacyExtensionData[]> {
    const response = await fetch(
      "https://raw.githubusercontent.com/foxglove/studio-extension-marketplace/main/extensions.json",
    );
    return await response.json();
  }

  private async fetchMultiVersionData(): Promise<MultiVersionExtensionData[]> {
    // 将来的な新API
    const response = await fetch("https://api.lichtblick.io/v2/extensions");
    return await response.json();
  }

  private processLegacyData(data: LegacyExtensionData[]): UnifiedExtensionData[] {
    return data.map(convertLegacyToUnified);
  }

  private processMultiVersionData(data: MultiVersionExtensionData[]): UnifiedExtensionData[] {
    const results: UnifiedExtensionData[] = [];
    data.forEach((item) => {
      results.push(...convertMultiVersionToUnified(item));
    });
    return results;
  }
}
```

## 🎯 UI適応戦略

### 1. コンポーネント抽象化

```typescript
// 統一されたpropsインターフェース
interface UniversalExtensionCardProps {
  extension: UnifiedExtensionData;
  showVersionSelector?: boolean;  // 複数バージョン表示制御
  onVersionChange?: (version: string) => void;
  mode: 'single' | 'multi' | 'auto';
}

function UniversalExtensionCard({
  extension,
  showVersionSelector = true,
  mode = 'auto'
}: UniversalExtensionCardProps) {
  // データソースに基づいて表示を調整
  const isMultiVersion = extension.dataSource === 'multi-version' &&
                         extension.availableVersions &&
                         extension.availableVersions.length > 1;

  const shouldShowVersions = showVersionSelector &&
                            (mode === 'multi' || (mode === 'auto' && isMultiVersion));

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{extension.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          by {extension.publisher}
        </Typography>

        {/* バージョン表示 */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption">
            v{extension.version}
          </Typography>
          {extension.isLatest && (
            <Chip label="Latest" size="small" color="primary" />
          )}
          {extension.dataSource === 'legacy' && (
            <Chip label="Legacy" size="small" variant="outlined" />
          )}
        </Stack>

        {/* 複数バージョン選択UI */}
        {shouldShowVersions && extension.availableVersions && (
          <VersionSelector
            versions={extension.availableVersions}
            currentVersion={extension.version}
            onVersionChange={onVersionChange}
          />
        )}

        <Typography variant="body2" gutterBottom>
          {extension.description}
        </Typography>
      </CardContent>
    </Card>
  );
}
```

### 2. 段階的表示制御

```typescript
// 設定による表示モード制御
interface MarketplaceSettings {
  versionDisplay: "legacy-only" | "latest-only" | "all-versions";
  enableVersionSelector: boolean;
  showDataSourceIndicator: boolean;
}

function useMarketplaceExtensions(settings: MarketplaceSettings) {
  const loader = new HybridExtensionLoader();

  const { data, loading, error } = useAsync(async () => {
    const allExtensions = await loader.getAllExtensions();

    switch (settings.versionDisplay) {
      case "legacy-only":
        return allExtensions.filter((ext) => ext.dataSource === "legacy");

      case "latest-only":
        return allExtensions.filter((ext) => ext.isLatest);

      case "all-versions":
      default:
        return allExtensions;
    }
  });

  return { extensions: data, loading, error };
}
```

## 🔧 実装手順

### Phase 1: 基盤実装 (2-3日)

1. **型定義作成**

   ```typescript
   // packages/suite-base/src/types/UniversalExtension.ts
   export * from "./LegacyExtension";
   export * from "./MultiVersionExtension";
   export * from "./UnifiedExtension";
   ```

2. **変換ロジック実装**

   ```typescript
   // packages/suite-base/src/utils/extensionDataConverter.ts
   export { convertLegacyToUnified, convertMultiVersionToUnified, detectDataStructure };
   ```

3. **ハイブリッドローダー実装**
   ```typescript
   // packages/suite-base/src/context/HybridExtensionContext.ts
   export { HybridExtensionLoader, useHybridExtensions };
   ```

### Phase 2: UI適応 (2-3日)

1. **共通コンポーネント拡張**

   - UniversalExtensionCard
   - VersionSelector（条件付き表示）
   - DataSourceIndicator

2. **既存コンポーネント更新**
   - ExtensionsSettings
   - ExtensionDetails
   - MarketplaceCard

### Phase 3: 設定・制御機能 (1-2日)

1. **設定UI実装**

   ```typescript
   // バージョン表示モード選択
   // データソース表示制御
   // デバッグ情報表示
   ```

2. **管理ツール実装**
   ```typescript
   // データ構造診断
   // キャッシュ管理
   // 移行状況表示
   ```

## 🧪 テスト戦略

### 1. データ変換テスト

```typescript
describe("Data Conversion", () => {
  test("Legacy to Unified conversion", () => {
    const legacy: LegacyExtensionData = {
      id: "test.extension",
      name: "Test Extension",
      version: "1.0.0",
      publisher: "Test Publisher",
      description: "Test description",
    };

    const unified = convertLegacyToUnified(legacy);

    expect(unified.baseId).toBe("test.extension");
    expect(unified.id).toBe("test.extension@1.0.0");
    expect(unified.dataSource).toBe("legacy");
    expect(unified.isLatest).toBe(true);
  });

  test("Multi-version to Unified conversion", () => {
    const multiVersion: MultiVersionExtensionData = {
      id: "test.extension",
      name: "Test Extension",
      publisher: "Test Publisher",
      description: "Test description",
      latest: "2.0.0",
      versions: {
        "1.0.0": { version: "1.0.0", publishedDate: "2024-01-01" },
        "2.0.0": { version: "2.0.0", publishedDate: "2024-06-01" },
      },
    };

    const unified = convertMultiVersionToUnified(multiVersion);

    expect(unified).toHaveLength(2);
    expect(unified.find((u) => u.version === "2.0.0")?.isLatest).toBe(true);
    expect(unified.find((u) => u.version === "1.0.0")?.isLatest).toBe(false);
  });
});
```

### 2. 統合テスト

```typescript
describe("Hybrid Extension Loader", () => {
  test("Handles mixed data sources", async () => {
    const loader = new HybridExtensionLoader();
    const extensions = await loader.getAllExtensions();

    // 両方のデータソースを適切に処理
    expect(extensions.some((ext) => ext.dataSource === "legacy")).toBe(true);
    expect(extensions.every((ext) => ext.baseId)).toBe(true);
    expect(extensions.every((ext) => ext.version)).toBe(true);
  });
});
```

## 📊 移行計画

### Stage 1: 準備フェーズ

- ハイブリッドローダー実装
- 既存機能の後方互換性確保
- 内部テスト実施

### Stage 2: ソフトロールアウト

- ベータユーザーでの動作確認
- パフォーマンス監視
- フィードバック収集

### Stage 3: 本格運用

- 全ユーザーに展開
- 新API（複数バージョン）の段階的導入
- 旧API（単一バージョン）の段階的廃止

## 🔍 利点と考慮事項

### ✅ 利点

1. **無停止移行**: 既存機能を中断することなく新機能を導入
2. **段階的展開**: リスクを最小化した計画的な移行
3. **ユーザー選択**: 表示モードをユーザーが選択可能
4. **開発効率**: 統一されたインターフェースで開発効率向上

### ⚠️ 考慮事項

1. **複雑性増加**: データ変換ロジックによる複雑性
2. **パフォーマンス**: 変換処理によるオーバーヘッド
3. **キャッシュ管理**: 異なるデータソースのキャッシュ戦略
4. **デバッグ難易度**: 多層化による問題特定の困難さ

## 🎯 結論

このハイブリッドデータ構造により、既存のextensions.jsonとの完全な後方互換性を保ちながら、将来的な複数バージョン対応への段階的移行が可能になります。

ユーザーは移行期間中も継続して既存機能を利用でき、開発者は新機能を安全に導入・テストできる環境が整います。

**次のステップ**: Phase 1の基盤実装から開始し、段階的に機能を拡張していくことを推奨します。
