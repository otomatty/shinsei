# VERSIONタブ機能 実装計画書 v2.0

**作成日**: 2025年10月1日
**対象**: マーケットプレイス機能 - 複数バージョン専用実装
**実装期間**: 3-4日

---

## 📋 実装方針

### 重要な変更点

1. **複数バージョン専用実装**

   - Legacy（単一バージョン）形式のサポートを廃止
   - MultiVersion形式のみに対応
   - HybridExtensionLoaderの削除

2. **必須・推奨機能の完全実装**

   - 必須機能: 全て実装
   - 推奨機能: 全て実装
   - オプション機能: 実装しない

3. **不要なコードの削除**
   - Legacy形式関連のコード
   - Hybrid対応のコード
   - 使用されていないユーティリティ

---

## 🎯 実装する機能

### 必須機能 ✅

1. **バージョン一覧表示**

   - すべての利用可能なバージョンを表示
   - 最新バージョンを明示的にマーク（"Latest" バッジ）
   - 公開日時を表示
   - バージョンを新しい順にソート

2. **インストール状態表示**

   - 各バージョンがインストール済みかどうかを視覚的に表示
   - インストール済みバージョンには「Installed」バッジ
   - 複数バージョンの同時インストール状態を表示

3. **バージョンごとのインストール/アンインストール操作**
   - 各バージョンに個別のInstall/Uninstallボタン
   - 複数バージョンを同時にインストール可能
   - インストール中の状態表示（ローディング）
   - エラーハンドリング

### 推奨機能 ⭕

4. **ファイルサイズ表示**

   - 各バージョンのファイルサイズを表示
   - 人間が読みやすい形式（MB, KB）

5. **安定性レベル表示**

   - stable/beta/alpha/experimental の表示
   - 視覚的なバッジまたはラベル

6. **互換性情報**

   - minLichtblickVersion の表示
   - 現在のLichtblickバージョンとの互換性チェック
   - 互換性がない場合の警告表示

7. **非推奨マーク**
   - deprecated フラグが true の場合の表示
   - 非推奨バージョンの警告

### 実装しない機能 ❌

- 有効化/無効化の切り替え
- バージョン固有のCHANGELOG表示（別タブで対応）
- 依存関係の表示
- バージョン比較機能

---

## 📐 データ構造設計

### MultiVersionExtensionData（APIレスポンス形式）

```typescript
/**
 * マーケットプレイスAPIから返される複数バージョン対応の拡張機能データ
 */
export interface MultiVersionExtensionData {
  // 基本情報
  id: string; // ベースID（例: "foxglove.turtlesim"）
  name: string; // 表示名
  publisher: string; // 発行者
  description: string; // 説明
  homepage?: string; // ホームページURL
  license?: string; // ライセンス
  keywords?: string[]; // 検索キーワード

  // バージョン管理
  versions: {
    [version: string]: VersionDetail;
  };

  latest: string; // 最新バージョン識別子
}

/**
 * 個別バージョンの詳細情報
 */
export interface VersionDetail {
  version: string; // バージョン番号（例: "1.0.0"）
  publishedDate: string; // 公開日時（ISO8601形式）
  sha256sum: string; // ファイルハッシュ（必須）
  foxe: string; // ダウンロードURL（必須）
  readme?: string; // README URL
  changelog?: string; // CHANGELOG URL
  isLatest?: boolean; // 最新バージョンフラグ
  deprecated?: boolean; // 非推奨フラグ
  stability?: StabilityLevel; // 安定性レベル
  minLichtblickVersion?: string; // 必要な最小バージョン
  fileSize?: number; // ファイルサイズ（バイト単位）
}

export type StabilityLevel = "stable" | "beta" | "alpha" | "experimental";
```

### VersionInfo（UI表示用）

```typescript
/**
 * VERSIONタブで表示するための拡張バージョン情報
 */
export interface VersionDisplayInfo {
  version: string;
  publishedDate: string;
  downloadUrl: string;
  fileSize?: number;
  isLatest: boolean;
  installed: boolean;
  deprecated: boolean;
  stability: StabilityLevel;
  minLichtblickVersion?: string;
  compatible: boolean; // 現在のLichtblickバージョンと互換性があるか
  changelog?: string;
  sha256sum: string;
}
```

---

## 🎨 UI設計

### VERSIONタブレイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ VERSION                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ■ v2.1.3  [Latest] [Stable] [Installed]                 ││
│ │                                                          ││
│ │ Published: September 28, 2025                            ││
│ │ Size: 2.3 MB • Compatible with Lichtblick 1.15.0+       ││
│ │                                                          ││
│ │                                    [View Changelog]      ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ■ v2.0.1  [Stable] [Installed]                          ││
│ │                                                          ││
│ │ Published: August 15, 2025                               ││
│ │ Size: 2.1 MB • Compatible with Lichtblick 1.10.0+       ││
│ │                                                          ││
│ │                            [View Changelog] [Uninstall]  ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ □ v1.9.0  [Beta]                                        ││
│ │                                                          ││
│ │ Published: July 10, 2025                                 ││
│ │ Size: 2.0 MB • Compatible with Lichtblick 1.5.0+        ││
│ │                                                          ││
│ │                            [View Changelog] [Install]    ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ □ v1.0.0  [Stable] [Deprecated]                         ││
│ │                                                          ││
│ │ Published: May 10, 2025                                  ││
│ │ Size: 1.8 MB • Compatible with Lichtblick 1.0.0+        ││
│ │ ⚠️ This version is deprecated. Consider upgrading.       ││
│ │                                                          ││
│ │                            [View Changelog] [Install]    ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### バッジデザイン

```typescript
// バッジの種類と色
interface BadgeConfig {
  label: string;
  color: "primary" | "success" | "warning" | "error" | "default";
  variant: "filled" | "outlined";
}

const badges = {
  latest: { label: "Latest", color: "primary", variant: "filled" },
  installed: { label: "Installed", color: "success", variant: "filled" },
  stable: { label: "Stable", color: "default", variant: "outlined" },
  beta: { label: "Beta", color: "warning", variant: "outlined" },
  alpha: { label: "Alpha", color: "warning", variant: "outlined" },
  experimental: { label: "Experimental", color: "error", variant: "outlined" },
  deprecated: { label: "Deprecated", color: "error", variant: "outlined" },
};
```

---

## 🏗️ コンポーネント設計

### ディレクトリ構成

```
packages/suite-base/src/components/shared/MarketplaceUI/
├── VersionTab/
│   ├── index.ts                      # エクスポート
│   ├── VersionTab.tsx                # メインコンポーネント
│   ├── VersionListItem.tsx           # 個別バージョン表示
│   ├── VersionBadge.tsx              # バッジコンポーネント
│   ├── VersionTab.style.ts           # スタイル定義
│   ├── types.ts                      # 型定義
│   └── utils.ts                      # ユーティリティ関数
```

### VersionTab.tsx（メインコンポーネント）

```typescript
/**
 * VERSIONタブのメインコンポーネント
 */
interface VersionTabProps {
  // 拡張機能の基本情報
  baseId: string;
  currentVersion: string;

  // バージョン情報
  versions: VersionDisplayInfo[];

  // コールバック
  onInstall: (version: string) => Promise<void>;
  onUninstall: (version: string) => Promise<void>;
  onViewChangelog: (version: string) => void;

  // 状態
  loading?: boolean;
  error?: Error;
}

export function VersionTab({
  baseId,
  currentVersion,
  versions,
  onInstall,
  onUninstall,
  onViewChangelog,
  loading = false,
  error,
}: VersionTabProps): React.ReactElement {
  // バージョンを公開日でソート（新しい順）
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => {
      const dateA = new Date(a.publishedDate);
      const dateB = new Date(b.publishedDate);
      return dateB.getTime() - dateA.getTime();
    });
  }, [versions]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  if (sortedVersions.length === 0) {
    return <EmptyState message="No versions available" />;
  }

  return (
    <Stack gap={2}>
      {sortedVersions.map((version) => (
        <VersionListItem
          key={version.version}
          version={version}
          isCurrentVersion={version.version === currentVersion}
          onInstall={() => onInstall(version.version)}
          onUninstall={() => onUninstall(version.version)}
          onViewChangelog={() => onViewChangelog(version.version)}
        />
      ))}
    </Stack>
  );
}
```

### VersionListItem.tsx（個別バージョン表示）

```typescript
/**
 * 個別バージョンの表示コンポーネント
 */
interface VersionListItemProps {
  version: VersionDisplayInfo;
  isCurrentVersion: boolean;
  onInstall: () => Promise<void>;
  onUninstall: () => Promise<void>;
  onViewChangelog: () => void;
}

export function VersionListItem({
  version,
  isCurrentVersion,
  onInstall,
  onUninstall,
  onViewChangelog,
}: VersionListItemProps): React.ReactElement {
  const { classes } = useStyles();
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await onInstall();
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async () => {
    setUninstalling(true);
    try {
      await onUninstall();
    } finally {
      setUninstalling(false);
    }
  };

  return (
    <Paper className={classes.versionCard} elevation={1}>
      {/* ヘッダー行 */}
      <div className={classes.header}>
        <div className={classes.versionInfo}>
          <Checkbox
            checked={version.installed}
            disabled
            className={classes.checkbox}
          />
          <Typography variant="h6" className={classes.versionNumber}>
            v{version.version}
          </Typography>

          {/* バッジ群 */}
          <div className={classes.badges}>
            {version.isLatest && (
              <VersionBadge type="latest" />
            )}
            <VersionBadge type={version.stability} />
            {version.installed && (
              <VersionBadge type="installed" />
            )}
            {version.deprecated && (
              <VersionBadge type="deprecated" />
            )}
          </div>
        </div>
      </div>

      {/* 詳細情報 */}
      <div className={classes.details}>
        <Typography variant="body2" color="text.secondary">
          Published: {formatDate(version.publishedDate)}
        </Typography>

        {version.fileSize && (
          <Typography variant="body2" color="text.secondary">
            Size: {formatFileSize(version.fileSize)}
          </Typography>
        )}

        {version.minLichtblickVersion && (
          <Typography
            variant="body2"
            color={version.compatible ? "text.secondary" : "error"}
          >
            {version.compatible ? "Compatible" : "Incompatible"} with Lichtblick {version.minLichtblickVersion}+
          </Typography>
        )}
      </div>

      {/* 非推奨警告 */}
      {version.deprecated && (
        <Alert severity="warning" className={classes.deprecationWarning}>
          ⚠️ This version is deprecated. Consider upgrading to a newer version.
        </Alert>
      )}

      {/* アクションボタン */}
      <div className={classes.actions}>
        <Button
          size="small"
          variant="text"
          onClick={onViewChangelog}
          disabled={!version.changelog}
        >
          View Changelog
        </Button>

        {version.installed ? (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={handleUninstall}
            disabled={uninstalling || !version.compatible}
            startIcon={uninstalling ? <CircularProgress size={16} /> : undefined}
          >
            {uninstalling ? "Uninstalling..." : "Uninstall"}
          </Button>
        ) : (
          <Button
            size="small"
            variant="contained"
            onClick={handleInstall}
            disabled={installing || !version.compatible}
            startIcon={installing ? <CircularProgress size={16} /> : undefined}
          >
            {installing ? "Installing..." : "Install"}
          </Button>
        )}
      </div>
    </Paper>
  );
}
```

### VersionBadge.tsx（バッジコンポーネント）

```typescript
/**
 * バージョン状態を示すバッジコンポーネント
 */
type BadgeType = "latest" | "installed" | "stable" | "beta" | "alpha" | "experimental" | "deprecated";

interface VersionBadgeProps {
  type: BadgeType;
}

const badgeConfig: Record<BadgeType, { label: string; color: ChipProps["color"] }> = {
  latest: { label: "Latest", color: "primary" },
  installed: { label: "Installed", color: "success" },
  stable: { label: "Stable", color: "default" },
  beta: { label: "Beta", color: "warning" },
  alpha: { label: "Alpha", color: "warning" },
  experimental: { label: "Experimental", color: "error" },
  deprecated: { label: "Deprecated", color: "error" },
};

export function VersionBadge({ type }: VersionBadgeProps): React.ReactElement {
  const config = badgeConfig[type];

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant={type === "latest" || type === "installed" ? "filled" : "outlined"}
    />
  );
}
```

---

## 🔄 データフロー

### 1. VERSIONタブの表示

```
ExtensionDetail / LayoutDetail
  ↓
[タブ選択: VERSION]
  ↓
VersionTab コンポーネント
  ↓
MultiVersionDataLoader.getExtensionVersions(baseId)
  ↓
API: /v2/extensions/{baseId}
  ↓
MultiVersionExtensionData
  ↓
変換: toVersionDisplayInfo[]
  ↓
インストール状態と結合
  ↓
VersionListItem × N 表示
```

### 2. バージョンのインストール

```
VersionListItem [Install ボタン]
  ↓
onInstall(version)
  ↓
ExtensionCatalog.downloadExtension(downloadUrl)
  ↓
ExtensionCatalog.installExtensions("local", [data])
  ↓
インストール完了
  ↓
状態更新
  ↓
UI再レンダリング（Installed バッジ表示）
```

### 3. バージョンのアンインストール

```
VersionListItem [Uninstall ボタン]
  ↓
onUninstall(version)
  ↓
versionedId = generateVersionedId(baseId, version)
  ↓
ExtensionCatalog.uninstallExtension("local", versionedId)
  ↓
アンインストール完了
  ↓
状態更新
  ↓
UI再レンダリング（Installed バッジ削除）
```

---

## 🗑️ 削除するファイルとコード

### 削除対象ファイル

1. **HybridExtensionLoader関連**

   ```
   packages/suite-base/src/util/marketplace/
   ├── HybridExtensionLoader.ts          # 削除
   └── extensionDataConverter.ts         # 削除
   ```

2. **Legacy型定義**
   ```typescript
   // packages/suite-base/src/types/HybridExtension.ts
   // 以下の型を削除:
   - LegacyExtensionData
   - LegacyApiResponse
   - LegacyConverter
   - UnifiedExtensionData (dataSource: "legacy" を削除)
   ```

### 修正対象ファイル

1. **ExtensionMarketplaceProvider.tsx**

   - HybridExtensionLoaderの使用を削除
   - MultiVersionDataLoaderに置き換え

2. **ExtensionDetail.tsx / LayoutDetail.tsx**
   - VERSIONタブの追加
   - 複数バージョン対応のデータ取得

---

## 📝 実装タスク

### Day 1: 型定義とデータローダー

#### タスク 1.1: 型定義の整理 ✅

- [ ] `MultiVersionExtensionData` の型定義を確認・更新
- [ ] `VersionDisplayInfo` の型定義を作成
- [ ] `StabilityLevel` の型定義を作成
- [ ] Legacy関連の型を削除

**ファイル**:

- `packages/suite-base/src/types/Extensions.ts`
- `packages/suite-base/src/types/HybridExtension.ts`（削除予定）

#### タスク 1.2: MultiVersionDataLoader の作成 ✅

- [ ] Legacy対応を削除したシンプルなローダーを作成
- [ ] バージョン情報取得メソッドの実装
- [ ] エラーハンドリングの実装

**ファイル**:

- `packages/suite-base/src/util/marketplace/MultiVersionDataLoader.ts`（新規）

#### タスク 1.3: HybridExtensionLoader の削除 ✅

- [ ] `HybridExtensionLoader.ts` を削除
- [ ] `extensionDataConverter.ts` を削除
- [ ] 依存しているファイルを更新

### Day 2: VERSIONタブコンポーネント

#### タスク 2.1: VersionTab コンポーネント ✅

- [ ] `VersionTab.tsx` の実装
- [ ] `VersionListItem.tsx` の実装
- [ ] `VersionBadge.tsx` の実装
- [ ] スタイル定義

**ファイル**:

- `packages/suite-base/src/components/shared/MarketplaceUI/VersionTab/`

#### タスク 2.2: ユーティリティ関数 ✅

- [ ] `formatFileSize()` の実装
- [ ] `formatDate()` の実装
- [ ] `checkCompatibility()` の実装
- [ ] `sortVersions()` の実装

**ファイル**:

- `packages/suite-base/src/components/shared/MarketplaceUI/VersionTab/utils.ts`

### Day 3: 詳細画面への統合

#### タスク 3.1: ExtensionDetail への統合 ✅

- [ ] VERSIONタブの追加
- [ ] バージョンデータの取得
- [ ] インストール/アンインストールハンドラの実装

**ファイル**:

- `packages/suite-base/src/components/ExtensionsSettings/ExtensionDetail.tsx`

#### タスク 3.2: LayoutDetail への統合 ✅

- [ ] VERSIONタブの追加
- [ ] バージョンデータの取得
- [ ] インストール/アンインストールハンドラの実装

**ファイル**:

- `packages/suite-base/src/components/LayoutSettings/LayoutDetail.tsx`

### Day 4: テストと調整

#### タスク 4.1: 動作確認 ✅

- [ ] 拡張機能の複数バージョン表示
- [ ] インストール操作
- [ ] アンインストール操作
- [ ] エラーハンドリング

#### タスク 4.2: UI調整 ✅

- [ ] レイアウト調整
- [ ] レスポンシブ対応
- [ ] アクセシビリティ確認

#### タスク 4.3: ドキュメント更新 ✅

- [ ] 実装ログの作成
- [ ] README の更新
- [ ] コードコメントの追加

---

## 🧪 テストシナリオ

### シナリオ 1: バージョン一覧の表示

1. 拡張機能の詳細画面を開く
2. VERSIONタブを選択
3. 複数のバージョンが新しい順に表示される
4. 最新バージョンに"Latest"バッジが表示される
5. インストール済みバージョンに"Installed"バッジが表示される

### シナリオ 2: バージョンのインストール

1. VERSIONタブで未インストールのバージョンを選択
2. "Install"ボタンをクリック
3. ローディング表示が出る
4. インストール完了後、"Installed"バッジが表示される
5. ボタンが"Uninstall"に変わる

### シナリオ 3: バージョンのアンインストール

1. VERSIONタブでインストール済みのバージョンを選択
2. "Uninstall"ボタンをクリック
3. ローディング表示が出る
4. アンインストール完了後、"Installed"バッジが消える
5. ボタンが"Install"に変わる

### シナリオ 4: 複数バージョンの同時インストール

1. VERSIONタブを開く
2. バージョン1.0.0をインストール
3. バージョン2.0.0をインストール
4. 両方のバージョンに"Installed"バッジが表示される

### シナリオ 5: 非推奨バージョンの表示

1. 非推奨バージョンに"Deprecated"バッジが表示される
2. 警告メッセージが表示される
3. インストールは可能だが警告が出る

### シナリオ 6: 互換性チェック

1. 現在のLichtblickバージョンと互換性のないバージョンを表示
2. "Incompatible"の表示が出る
3. Installボタンが無効化される

---

## 📚 参考資料

### 既存コンポーネント

- `VersionAccordion.tsx` - バージョンアコーディオンの既存実装
- `ActionButtons.tsx` - アクションボタンのパターン
- `MarketplaceCard.tsx` - カードレイアウトのパターン

### 関連ドキュメント

- `version-tab-current-specification.md` - 現在の仕様まとめ
- `phase8-version-tab-implementation-plan.md` - 当初の実装計画
- `marketplace-api-specification.md` - マーケットプレイスAPI仕様

---

## ✅ 完了条件

- [ ] すべてのバージョンが正しく表示される
- [ ] インストール/アンインストールが正常に動作する
- [ ] 複数バージョンの同時インストールが可能
- [ ] バッジが正しく表示される
- [ ] ファイルサイズ、安定性レベル、互換性情報が表示される
- [ ] 非推奨バージョンに警告が表示される
- [ ] エラーハンドリングが適切に実装されている
- [ ] レスポンシブデザインに対応している
- [ ] Legacy関連のコードが削除されている
- [ ] ドキュメントが更新されている

---

**作成者**: GitHub Copilot
**更新履歴**:

- 2025-10-01: v2.0 作成 - 複数バージョン専用、必須・推奨機能の完全実装
