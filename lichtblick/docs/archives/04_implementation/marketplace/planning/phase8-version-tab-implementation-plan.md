# Phase 8: VERSIONタブ追加機能 実装計画書（複数バージョン対応版）

**作成日**: 2025年9月29日
**対象フェーズ**: Phase 8 詳細ページ情報拡充（追加実装）
**目標期間**: 2-3日
**更新**: 複数バージョン同時インストール対応に変更

## 📋 実装概要

### 問題分析

1. **バージョン表示問題**

   - `extension.version`が`[object Object]`として表示される
   - `time`フィールドが`Record<string, string>`型で、直接表示しようとしている

2. **機能要件（更新）**
   - READMEとCHANGELOGタブに加えて、VERSIONタブを追加
   - 拡張機能とレイアウトで共通のUI実装
   - **複数バージョンの同時インストール対応**
   - **各バージョンごとのインストール状態管理**
   - **OSS上流への影響を最小限に抑制**

### 設計方針（複数バージョン対応版）

- **複数バージョン管理**: 各拡張機能・レイアウトで複数バージョンの同時インストール対応
- **個別バージョン状態**: 各バージョンごとの個別インストール・有効化状態管理
- **バージョン選択UI**: ユーザーが使用したいバージョンを選択可能なインターフェース
- **自動更新廃止**: 再生ファイルに応じた適切なバージョン選択のため自動更新機能を削除
- **OSS互換性重視**: ExtensionDetails.tsxへの変更を最小限に抑制
- **独立コンポーネント**: LayoutDetailsを完全新規作成
- **部分共通化**: VERSIONタブ関連のみ共通コンポーネント化

## 🏗️ 実装計画（改訂版）

### Phase 8.1: バージョン表示問題修正 (半日)

#### 8.1.1 ExtensionDetailsの最小限修正

**ファイル**: `packages/suite-base/src/components/ExtensionDetails.tsx`

**修正方針**: OSS上流への影響を最小化

- バージョン表示問題のみ修正
- タブ構造は既存のまま維持
- VERSIONタブ追加のみ

**修正内容**:

```typescript
// 1. バージョン表示修正（212行目付近）
{`v${typeof extension.version === 'string' ? extension.version :
     Array.isArray(extension.version) ? extension.version[0] :
     'Unknown'}`}

// 2. VERSIONタブ追加（既存のTabs内）
<Tab disableRipple label="README" value={0} />
<Tab disableRipple label="CHANGELOG" value={1} />
<Tab disableRipple label="VERSION" value={2} />

// 3. VERSIONタブコンテンツ追加（既存のStack内）
{activeTab === 0 && <TextContent>{readmeContent}</TextContent>}
{activeTab === 1 && <TextContent>{changelogContent}</TextContent>}
{activeTab === 2 && <VersionTabContent extension={extension} />}
```

### Phase 8.2: VERSIONタブ専用コンポーネント作成 (1日)

#### 8.2.1 VERSION表示専用コンポーネント

**新規ファイル**: `packages/suite-base/src/components/shared/VersionTab/`

```
VersionTab/
├── index.ts                    # エクスポート
├── VersionTabContent.tsx       # VERSION表示コンポーネント
├── types.ts                    # 型定義
└── utils.ts                    # バージョン処理ユーティリティ
```

**型定義**:

```typescript
// types.ts
export interface TabConfig {
  id: string;
  label: string;
  value: number;
}

export interface DetailTabsProps {
  readmeContent?: string;
  changelogContent?: string;
  versionData?: VersionData;
  loading?: boolean;
}

export interface VersionData {
  currentVersion: string;
  versions: VersionInfo[];
  timeData?: Record<string, string>;
}

export interface VersionInfo {
  version: string;
  publishedDate?: string;
  downloadUrl?: string;
  isLatest?: boolean;
  installed?: boolean;
  enabled?: boolean; // 新規追加：そのバージョンが有効化されているか
  compatible?: boolean; // 新規追加：現在のLichtblickバージョンと互換性があるか
  changelog?: string;
  dependencies?: string[]; // 新規追加：依存関係
  fileSize?: number; // 新規追加：ファイルサイズ
}
```

#### 8.2.2 DetailTabsContainer実装

**ファイル**: `DetailTabsContainer.tsx`

```typescript
interface DetailTabsContainerProps {
  tabs: TabConfig[];
  defaultTab?: number;
  children: React.ReactNode;
  className?: string;
}

export function DetailTabsContainer({
  tabs,
  defaultTab = 0,
  children,
  className
}: DetailTabsContainerProps) {
  const [activeTab, setActiveTab] = useState<number>(defaultTab);

  return (
    <Stack className={className}>
      <Stack paddingTop={2} style={{ marginLeft: -16, marginRight: -16 }}>
        <Tabs
          textColor="inherit"
          value={activeTab}
          onChange={(_event, newValue: number) => setActiveTab(newValue)}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              disableRipple
              label={tab.label}
              value={tab.value}
            />
          ))}
        </Tabs>
        <Divider />
      </Stack>

      <Stack flex="auto" paddingY={2}>
        {React.Children.map(children, (child, index) =>
          activeTab === index ? child : null
        )}
      </Stack>
    </Stack>
  );
}
```

### Phase 8.3: バージョンタブ実装 (1日)

#### 8.3.1 VersionTab コンポーネント（複数バージョン対応）

**ファイル**: `VersionTab.tsx`

```typescript
interface VersionTabProps {
  versionData: VersionData;
  onVersionSelect?: (version: string) => void;
  onVersionInstall?: (version: string) => void;
  onVersionUninstall?: (version: string) => void;
  onVersionEnable?: (version: string) => void;
  onVersionDisable?: (version: string) => void;
}

export function VersionTab({
  versionData,
  onVersionSelect,
  onVersionInstall,
  onVersionUninstall,
  onVersionEnable,
  onVersionDisable
}: VersionTabProps) {
  const { currentVersion, versions, timeData } = versionData;

  // バージョンを日付順でソート
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => {
      const dateA = new Date(a.publishedDate ?? 0);
      const dateB = new Date(b.publishedDate ?? 0);
      return dateB.getTime() - dateA.getTime(); // 新しい順
    });
  }, [versions]);

  // インストール済みバージョンの統計
  const installedVersions = versions.filter(v => v.installed);
  const enabledVersions = versions.filter(v => v.installed && v.enabled);

  return (
    <Stack spacing={2}>
      <Typography variant="h6" gutterBottom>
        Version Management
      </Typography>

      {/* バージョン統計 */}
      <Stack direction="row" spacing={2}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Latest Version
          </Typography>
          <Typography variant="h6">
            v{currentVersion}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Installed Versions
          </Typography>
          <Typography variant="h6">
            {installedVersions.length}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Enabled Versions
          </Typography>
          <Typography variant="h6">
            {enabledVersions.length}
          </Typography>
        </Paper>
      </Stack>

      {/* バージョンリスト */}
      <Typography variant="subtitle1" gutterBottom>
        Available Versions
      </Typography>

      <List>
        {sortedVersions.map((version) => (
          <VersionListItem
            key={version.version}
            version={version}
            isCurrent={version.version === currentVersion}
            onSelect={onVersionSelect}
            onInstall={onVersionInstall}
            onUninstall={onVersionUninstall}
            onEnable={onVersionEnable}
            onDisable={onVersionDisable}
          />
        ))}
      </List>

      {timeData && Object.keys(timeData).length > 0 && (
        <VersionTimeline timeData={timeData} />
      )}
    </Stack>
  );
}

// バージョンリストアイテム（複数バージョン対応）
function VersionListItem({
  version,
  isCurrent,
  onSelect,
  onInstall,
  onUninstall,
  onEnable,
  onDisable
}: {
  version: VersionInfo;
  isCurrent: boolean;
  onSelect?: (version: string) => void;
  onInstall?: (version: string) => void;
  onUninstall?: (version: string) => void;
  onEnable?: (version: string) => void;
  onDisable?: (version: string) => void;
}) {
  return (
    <ListItem
      sx={{
        bgcolor: isCurrent ? 'action.selected' : 'transparent',
        borderRadius: 1,
        mb: 1,
        flexDirection: 'column',
        alignItems: 'stretch',
      }}
    >
      <ListItemText
        primary={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2">
              v{version.version}
            </Typography>
            {version.isLatest && (
              <Chip label="Latest" size="small" color="primary" />
            )}
            {version.installed && (
              <Chip
                label={version.enabled ? "Enabled" : "Installed"}
                size="small"
                color={version.enabled ? "success" : "default"}
              />
            )}
            {!version.compatible && (
              <Chip label="Incompatible" size="small" color="error" />
            )}
            {version.fileSize && (
              <Chip
                label={`${(version.fileSize / 1024 / 1024).toFixed(1)}MB`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        }
        secondary={
          <Stack spacing={0.5}>
            {version.publishedDate && (
              <Typography variant="caption" color="text.secondary">
                Published: {formatDate(version.publishedDate)}
              </Typography>
            )}
            {version.dependencies && version.dependencies.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                Dependencies: {version.dependencies.join(', ')}
              </Typography>
            )}
          </Stack>
        }
      />

      {/* アクションボタン群 */}
      <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1}>
        {onSelect && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => onSelect(version.version)}
          >
            View Details
          </Button>
        )}

        {!version.installed && onInstall && version.compatible && (
          <Button
            size="small"
            variant="contained"
            onClick={() => onInstall(version.version)}
          >
            Install
          </Button>
        )}

        {version.installed && !version.enabled && onEnable && (
          <Button
            size="small"
            variant="contained"
            color="success"
            onClick={() => onEnable(version.version)}
          >
            Enable
          </Button>
        )}

        {version.installed && version.enabled && onDisable && (
          <Button
            size="small"
            variant="outlined"
            color="warning"
            onClick={() => onDisable(version.version)}
          >
            Disable
          </Button>
        )}

        {version.installed && onUninstall && (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => onUninstall(version.version)}
          >
            Uninstall
          </Button>
        )}
      </Stack>
    </ListItem>
  );
}

// バージョンタイムライン表示
function VersionTimeline({ timeData }: { timeData: Record<string, string> }) {
  const timeEntries = Object.entries(timeData)
    .filter(([key]) => key !== 'created' && key !== 'modified')
    .sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Release Timeline</Typography>
      <Timeline>
        {timeEntries.map(([version, timestamp]) => (
          <TimelineItem key={version}>
            <TimelineSeparator>
              <TimelineDot color="primary" />
              <TimelineConnector />
            </TimelineSeparator>
            <TimelineContent>
              <Typography variant="body2">
                v{version}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(timestamp)}
              </Typography>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Stack>
  );
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}
```

### Phase 8.3: LayoutDetails完全新規作成 (1日)

#### 8.3.1 LayoutDetails独立コンポーネント

**新規ファイル**: `packages/suite-base/src/components/LayoutDetails.tsx`

**設計方針**: ExtensionDetailsと同じUI/UXを提供するが完全独立

```typescript
import { useState, useCallback, useMemo } from "react";
import { Button, Tab, Tabs, Typography, Divider } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Stack from "@lichtblick/suite-base/components/Stack";
import TextContent from "@lichtblick/suite-base/components/TextContent";
import { VersionTabContent } from "@lichtblick/suite-base/components/shared/VersionTab";
import { LayoutMarketplaceDetail } from "@lichtblick/suite-base/context/LayoutMarketplaceContext";

interface LayoutDetailsProps {
  layout: LayoutMarketplaceDetail;
  onClose: () => void;
  installed?: boolean;
}

export function LayoutDetails({ layout, onClose, installed }: LayoutDetailsProps) {
  const [activeTab, setActiveTab] = useState<number>(0);

  // ExtensionDetailsと同じ構造で実装
  return (
    <Stack fullHeight flex="auto" gap={1}>
      {/* ヘッダー部分 - ExtensionDetailsと同じスタイル */}
      <div>
        <Button
          onClick={onClose}
          size="small"
          startIcon={<ChevronLeftIcon />}
        >
          Back
        </Button>
        <Typography variant="h3" fontWeight={500}>
          {layout.name}
        </Typography>
      </div>

      {/* 詳細情報 */}
      <Stack gap={1} alignItems="flex-start">
        <Typography variant="body2" gutterBottom>
          {layout.description}
        </Typography>
        {/* インストール/アンインストールボタン */}
      </Stack>

      {/* タブ部分 - ExtensionDetailsと同じ構造 */}
      <Stack paddingTop={2} style={{ marginLeft: -16, marginRight: -16 }}>
        <Tabs
          textColor="inherit"
          value={activeTab}
          onChange={(_event, newValue: number) => setActiveTab(newValue)}
        >
          <Tab disableRipple label="README" value={0} />
          <Tab disableRipple label="CHANGELOG" value={1} />
          <Tab disableRipple label="VERSION" value={2} />
        </Tabs>
        <Divider />
      </Stack>

      {/* タブコンテンツ */}
      <Stack flex="auto" paddingY={2}>
        {activeTab === 0 && <TextContent>{layout.readme}</TextContent>}
        {activeTab === 1 && <TextContent>{layout.changelog}</TextContent>}
        {activeTab === 2 && <VersionTabContent layout={layout} />}
      </Stack>
    </Stack>
  );
}
```

### Phase 8.4: LayoutMarketplaceSettingsへの統合 (半日)

#### 8.4.1 LayoutDetailsの組み込み

```typescript
// LayoutMarketplaceSettings.tsx の更新
import { LayoutDetails } from "@lichtblick/suite-base/components/LayoutDetails";

// 詳細表示状態の追加
const [selectedLayout, setSelectedLayout] = useState<LayoutMarketplaceDetail | null>(null);

// 詳細表示ハンドラ
const handleViewDetails = useCallback((layout: LayoutMarketplaceDetail) => {
  setSelectedLayout(layout);
}, []);

// レンダリング部分
if (selectedLayout) {
  return (
    <LayoutDetails
      layout={selectedLayout}
      onClose={() => setSelectedLayout(null)}
      installed={/* インストール状態の判定 */}
    />
  );
}
```

## 🎯 実装順序（改訂版）

### Day 1: ExtensionDetails最小限修正

1. ✅ ExtensionDetails.tsxのバージョン表示問題修正
2. ✅ VERSIONタブの追加（既存タブ構造内）
3. ✅ VersionTabContentコンポーネントの作成

### Day 2: LayoutDetails完全新規作成

1. ✅ LayoutDetails.tsxの完全新規実装
2. ✅ ExtensionDetailsと同じUI/UX構造の再現
3. ✅ VersionTabContentの共通利用

### Day 3: 統合・テスト

1. ✅ LayoutMarketplaceSettingsへのLayoutDetails統合
2. ✅ 両方のコンポーネントでの動作テスト
3. ✅ OSS上流マージ準備確認

## 🔍 品質保証

### テスト項目

1. **バージョン表示**

   - ✅ 正常なバージョン文字列の表示
   - ✅ オブジェクト型の適切な変換
   - ✅ undefined/null の処理

2. **タブ機能**

   - ✅ タブ切り替えの正常動作
   - ✅ デフォルトタブの表示
   - ✅ 各タブコンテンツの表示

3. **バージョンタブ**

   - ✅ バージョン履歴の表示
   - ✅ 日付順ソート
   - ✅ 現在バージョンのハイライト
   - ✅ タイムライン表示

4. **共通性**
   - ✅ 拡張機能とレイアウトでの同一UI
   - ✅ レスポンシブ対応

### パフォーマンス考慮

- **メモ化**: バージョンデータの計算結果をuseMemoでキャッシュ
- **遅延読み込み**: タブコンテンツの条件レンダリング
- **リスト最適化**: 大量バージョンでの仮想化（必要に応じて）

## 📊 成功指標

### 機能指標

- ✅ バージョン表示問題の完全解決
- ✅ VERSIONタブの正常動作
- ✅ 拡張機能・レイアウト両方での利用可能

### UX指標

- ✅ タブ切り替えの滑らかな動作
- ✅ バージョン情報の見やすい表示
- ✅ 直感的なバージョン選択UI
- ✅ ExtensionDetailsとLayoutDetailsの統一感

### OSS互換性指標

- ✅ ExtensionDetails.tsxへの最小限変更
- ✅ 上流OSSからのマージ時コンフリクト最小化
- ✅ 新規ファイルによる機能拡張
- ✅ 既存動作の完全保持

## 🔄 後続計画

### Phase 8.6: 発展機能（オプション）

1. **バージョン比較機能**: 2つのバージョン間の差分表示
2. **ダウンロード統計**: バージョン別のダウンロード数表示
3. **互換性情報**: Lichtblickバージョンとの互換性表示
4. **依存関係グラフ**: バージョン間の依存関係を視覚化
5. **使用統計**: どのバージョンが最も使用されているかの表示

### Phase 9連携（仕様変更）

Phase 9（複数バージョン管理強化）では、このVERSIONタブをベースに以下を追加：

- **個別バージョンインストール**: VERSIONタブから直接各バージョンをインストール
- **バージョン依存性解決**: 依存関係のあるバージョンの自動インストール提案
- **プロファイル機能**: 再生ファイルタイプ別の推奨バージョン設定
- **バージョンセット管理**: 複数の拡張機能・レイアウトのバージョンを一括管理
- **互換性チェック**: インストール前の互換性自動検証

### 削除される機能

- **自動更新機能**: 複数バージョン同時インストール方針のため廃止
- **ロールバック機能**: 各バージョンが独立して管理されるため不要
- **単一バージョン強制**: ユーザーが必要に応じて複数バージョンを選択可能

## 📝 OSSマージ戦略まとめ

### 推奨アプローチの利点

1. **上流への影響最小化**: ExtensionDetails.tsxは最小限の変更のみ
2. **コンフリクト回避**: 新規ファイル（LayoutDetails.tsx）による機能拡張
3. **段階的マージ**: 必要に応じてExtensionDetails変更を上流に提案可能
4. **保守性**: 独立したコンポーネントで機能追加が容易

### マージ時の対応

- **ExtensionDetails**: バージョン表示修正のみなので軽微な差分
- **LayoutDetails**: 完全新規ファイルなのでマージコンフリクトなし
- **VersionTabContent**: 共通コンポーネントとして再利用性高

---

**策定者**: 開発チーム
**レビュー**: Phase 8 完了時
**更新予定**: 実装進行に応じて随時更新
**改訂履歴**:

- 2025/9/29 - OSSマージ戦略を考慮した設計に変更
- 2025/9/29 - 複数バージョン同時インストール対応に仕様変更

---

## 📝 複数バージョン対応の変更要約

### 主な仕様変更

1. **バージョン管理方針の変更**

   - 単一アクティブバージョン → 複数バージョン同時有効化
   - 自動更新機能の廃止
   - 個別バージョンの有効化・無効化機能

2. **インターフェース変更**

   - `setActiveVersion()` → `enableVersion()` / `disableVersion()`
   - `getActiveVersion()` → `getEnabledVersions()`
   - バッチ操作の複数バージョン対応

3. **UI変更**
   - バージョンごとの個別操作ボタン（Install/Enable/Disable/Uninstall）
   - 有効化されたバージョンの表示
   - バージョン統計情報の表示

### 変更理由

再生したいファイルによって対応している拡張機能のバージョンが異なるため、複数バージョンを同時にインストール・有効化できる仕様に変更しました。これにより、ユーザーは用途に応じて適切なバージョンを選択できるようになります。
