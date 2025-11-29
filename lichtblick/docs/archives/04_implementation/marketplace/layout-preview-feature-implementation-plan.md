# レイアウトマーケットプレイス プレビュー機能 実装計画書

## 📋 目次

1. [概要](#概要)
2. [現在の実装状況](#現在の実装状況)
3. [要件定義](#要件定義)
4. [技術的課題と解決策](#技術的課題と解決策)
5. [システム設計](#システム設計)
6. [実装詳細](#実装詳細)
7. [実装手順](#実装手順)
8. [テスト計画](#テスト計画)
9. [リスクと対応策](#リスクと対応策)

---

## 概要

### 目的

レイアウトマーケットプレイスにプレビュー機能を実装し、ユーザーがインストール前にレイアウトの内容を確認できるようにする。

### 背景

現在のマーケットプレイス機能では、レイアウト一覧からインストールボタンを直接クリックするだけの実装となっており、ユーザーがレイアウトの内容を事前に確認できない。これにより以下の問題が発生している：

- レイアウトがどのようなパネル構成なのか分からない
- インストール後に期待と異なる内容だった場合の手戻りが発生
- ユーザー体験の低下

### ゴール

- ユーザーがレイアウトをインストールする前に内容をプレビューできる
- プレビュー中の一時的な状態であることが明確に分かるUI
- プレビューから直接インストール、またはキャンセルして元に戻せる

---

## 現在の実装状況

### 調査結果サマリー

#### 1. マーケットプレイスコンポーネント構成

**`LayoutMarketplaceSettings.tsx`**

```
パス: packages/suite-base/src/components/LayoutMarketplaceSettings.tsx
役割: レイアウトマーケットプレイスのメイン画面
主な機能:
- レイアウト一覧の表示
- 検索・フィルタリング
- インストール処理
- MarketplaceCardコンポーネントの使用
```

**現在のインストールフロー:**

```typescript
const installLayout = useCallback(
  async (layout: LayoutMarketplaceDetail) => {
    setInstallingIds((prev) => new Set(prev).add(layout.id));
    try {
      const result = await catalog.installLayoutFromMarketplace(layout);
      if (!result.success) {
        throw new Error(/* ... */);
      }
    } catch {
      // エラーハンドリング
    } finally {
      setInstallingIds(/* ... */);
    }
  },
  [catalog],
);
```

#### 2. Extensionマーケットプレイスの詳細表示機能

**`ExtensionMarketplaceSettings.tsx`**

```typescript
// Extensionでは既に詳細表示機能を実装済み
const [focusedExtension, setFocusedExtension] = useState<{
  installed: boolean;
  extension: ExtensionMarketplaceDetail;
} | undefined>();

if (focusedExtension) {
  return (
    <ExtensionDetail
      installed={focusedExtension.installed}
      extension={focusedExtension.extension}
      onClose={() => setFocusedExtension(undefined)}
    />
  );
}
```

**`ExtensionDetail.tsx`**

- MarketplaceDetailBaseを使用した統一UI
- README/CHANGELOGの表示
- インストール/アンインストール機能
- バージョン情報表示

#### 3. レイアウト管理システム

**CurrentLayoutProvider (packages/suite-base/src/providers/CurrentLayoutProvider/index.tsx)**

```typescript
// レイアウト状態管理の中核
interface LayoutState {
  selectedLayout?: {
    id: LayoutID;
    loading?: boolean;
    data: LayoutData | undefined;
    name?: string;
    edited?: boolean;
  };
  sharedPanelState?: Record<PanelType, SharedPanelState>;
}

// レイアウト切り替え機能
const setSelectedLayoutId = useCallback(
  async (id: LayoutID | undefined, saveToProfile = true) => {
    if (!id) {
      setLayoutState({ selectedLayout: undefined });
      return;
    }

    const layout = await layoutManager.getLayout(id);
    setLayoutState({
      selectedLayout: {
        loading: false,
        id: layout.id,
        data: layout.working?.data ?? layout.baseline.data,
        name: layout.name,
      },
    });
  },
  [layoutManager, setLayoutState],
);
```

**主要な機能:**

- レイアウトの永続化管理
- パネル配置の状態管理
- ドラッグ&ドロップサポート
- 自動保存機能

#### 4. レイアウトカタログシステム

**LayoutCatalogContext (packages/suite-base/src/context/LayoutCatalogContext.ts)**

```typescript
export interface LayoutCatalog {
  // マーケットプレイスからのインストール
  installLayoutFromMarketplace: (
    detail: LayoutMarketplaceDetail,
    name?: string,
  ) => Promise<InstallLayoutResult>;

  // インストール済みレイアウトの取得
  getInstalledMarketplaceLayouts: () => Promise<Layout[]>;

  // アンインストール
  uninstallMarketplaceLayout: (id: LayoutID) => Promise<void>;

  // マーケットプレイス起源情報の管理
  getMarketplaceOrigin: (layoutId: LayoutID) => Promise<MarketplaceOrigin | undefined>;
  markAsMarketplaceLayout: (layoutId: LayoutID, origin: MarketplaceOrigin) => Promise<void>;
}
```

**LayoutCatalogProvider (packages/suite-base/src/providers/LayoutCatalogProvider.tsx)**

```typescript
// インストール処理の実装
const installLayoutFromMarketplace = useCallback(
  async (detail: LayoutMarketplaceDetail, name?: string): Promise<InstallLayoutResult> => {
    try {
      // 1. レイアウトデータのダウンロード
      const layoutData = await downloadLayoutFromMarketplace(detail);

      // 2. データバリデーション
      const isValid = await validateLayoutData(layoutData);
      if (!isValid) {
        return { success: false, error: new Error("Validation failed") };
      }

      // 3. レイアウトのインストール
      const layout = await layoutManager.saveNewLayout({
        name: name ?? detail.name,
        data: layoutData,
        permission: "CREATOR_WRITE",
      });

      // 4. マーケットプレイス起源情報の記録
      const origin: MarketplaceOrigin = {
        marketplaceId: detail.id,
        installedAt: new Date().toISOString(),
        originalUrl: detail.layoutUrl,
        author: detail.author,
      };
      await markAsMarketplaceLayout(layout.id, origin);

      return { success: true, layout };
    } catch (error) {
      return { success: false, error };
    }
  },
  [downloadLayoutFromMarketplace, layoutManager, markAsMarketplaceLayout, validateLayoutData],
);
```

#### 5. ダイアログシステム

**AppSettingsDialog (packages/suite-base/src/components/AppSettingsDialog/AppSettingsDialog.tsx)**

```typescript
import { Dialog, DialogActions, DialogTitle } from "@mui/material";

export function AppSettingsDialog(
  props: DialogProps & { activeTab?: AppSettingsTab }
): React.JSX.Element {
  return (
    <Dialog {...props} fullWidth maxWidth="md">
      <DialogTitle>Settings</DialogTitle>
      {/* コンテンツ */}
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
```

- MUI Dialogコンポーネントを使用
- フルスクリーンまたはモーダル表示
- タブベースのナビゲーション

#### 6. 共通UIコンポーネント

**MarketplaceCard (packages/suite-base/src/components/shared/MarketplaceUI/MarketplaceCard.tsx)**

```typescript
export interface MarketplaceCardProps {
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags?: string[];
  installed?: boolean;
  loading?: boolean;
  onInstall?: (version?: string) => void;
  onUninstall?: (version?: string) => void;
  onViewDetails?: (version?: string) => void; // 詳細表示用
  icon?: ReactNode;
  thumbnail?: string;
  versions?: VersionInfo[];
}
```

- Extension/Layout両方で使用される統一UI
- アクションボタンのサポート
- サムネイル表示
- タグフィルタリング

### 既存機能の制約と課題

#### 制約事項

1. **レイアウトのインストールが必須**

   - 現在の実装では、レイアウトデータを表示するには`installLayoutFromMarketplace()`を実行する必要がある
   - インストールすると自動的にLayoutManagerに永続化される
   - 一時的な表示のための仕組みが存在しない

2. **レイアウトの切り替えは保存を前提**

   - `setSelectedLayoutId()`は常に永続化されたレイアウトを対象とする
   - 一時的なレイアウト状態を保持する機能がない

3. **CurrentLayoutProviderの状態管理**
   - `selectedLayout`は永続化されたレイアウトIDを持つことを前提としている
   - 一時的なプレビュー状態との区別が必要

#### 技術的課題

1. **一時的なレイアウト表示**

   - インストールせずにレイアウトデータを読み込む必要がある
   - CurrentLayoutProviderに一時的な状態を注入する方法が必要

2. **元のレイアウトへの復元**

   - プレビュー前のレイアウト状態を保存
   - キャンセル時に確実に復元する

3. **UIの状態管理**

   - ダイアログの開閉状態
   - プレビューモードのフラグ
   - 確認UIの表示制御

4. **ユーザー体験の維持**
   - プレビュー中も操作性を維持
   - プレビューであることの明示
   - スムーズな遷移

---

## 要件定義

### 機能要件

#### FR-1: プレビューボタンの配置

- **説明**: MarketplaceCardにPreviewボタンを追加
- **動作**:
  - Layoutマーケットプレイス: Detailボタンの代わりにPreviewボタンを表示
  - Extensionマーケットプレイス: 既存のDetailボタンをそのまま使用（変更なし）
  - クリックでプレビューモードに移行
- **実装方針**:
  - `LayoutMarketplaceSettings`コンポーネントで`onViewDetails`プロップを使用
  - ボタンラベルは「プレビュー」と表示
  - ExtensionマーケットプレイスのDetailボタンには影響を与えない

#### FR-2: ダイアログの一時的な閉じる

- **説明**: プレビューボタンクリック時にマーケットプレイスダイアログを閉じる
- **動作**:
  - ダイアログを非表示
  - ダイアログの状態は保持（再度開いた時に同じ状態）

#### FR-3: レイアウトの一時的な表示

- **説明**: インストールせずにレイアウトをワークスペースに表示
- **動作**:
  1. マーケットプレイスからレイアウトデータをダウンロード
  2. 現在のレイアウト状態を保存
  3. ダウンロードしたレイアウトデータを一時的に適用
  4. ワークスペースにレイアウトを表示
- **制約**:
  - レイアウトマネージャーには保存しない
  - 一時的なプレビュー状態としてマーク

#### FR-4: プレビュー中の確認UI表示

- **説明**: プレビュー中であることを明示するUIを表示
- **UI要素**:
  - バナー型の通知
  - 「このレイアウトを使用しますか？」というメッセージ
  - 「すぐに使う」ボタン
  - 「キャンセル」ボタン
- **配置**:
  - ワークスペースの上部に固定表示
  - 半透明背景で目立つデザイン

#### FR-5: すぐに使うボタンの動作

- **説明**: プレビュー中のレイアウトを正式にインストール
- **動作**:
  1. 確認UIを非表示
  2. レイアウトを正式にインストール（LayoutManagerに保存）
  3. インストール成功の通知を表示
  4. パネルレイアウトは変化なし（既に表示済みのため）
  5. プレビューモードを解除

#### FR-6: キャンセルボタンの動作

- **説明**: プレビューをキャンセルして元のレイアウトに戻る
- **動作**:
  1. 確認UIを非表示
  2. 保存しておいた元のレイアウト状態を復元
  3. マーケットプレイスダイアログを再度開く
  4. プレビューモードを解除

### 非機能要件

#### NFR-1: パフォーマンス

- レイアウトのダウンロード: 3秒以内
- プレビューモードへの切り替え: 1秒以内
- 元のレイアウトへの復元: 1秒以内

#### NFR-2: ユーザビリティ

- プレビュー中であることが一目で分かるUI
- 操作の取り消しが容易
- エラーメッセージが分かりやすい

#### NFR-3: 信頼性

- プレビュー中のエラーで元のレイアウトが失われない
- ネットワークエラー時の適切なハンドリング
- データ整合性の保証

#### NFR-4: 保守性

- 既存のレイアウトシステムへの影響を最小限に
- コードの再利用性を考慮
- テストしやすい設計

---

## 技術的課題と解決策

### 課題1: 一時的なレイアウト表示

**問題:**

- CurrentLayoutProviderは永続化されたレイアウトIDを前提としている
- インストールせずにレイアウトデータを適用する機能がない

**解決策: 新しいContext API を採用**

専用の `PreviewLayoutContext` を作成し、プレビュー機能を独立して管理します。

```typescript
// PreviewLayoutContext.ts
export interface PreviewLayoutContext {
  isPreviewMode: boolean;
  previewLayout: LayoutData | undefined;
  originalLayoutId: LayoutID | undefined;

  startPreview: (layoutData: LayoutData, originalLayoutId: LayoutID) => void;
  confirmPreview: () => Promise<void>;
  cancelPreview: () => Promise<void>;
}
```

**この方針を選択した理由:**

✅ **既存システムへの影響を最小化**

- CurrentLayoutProviderの変更が不要
- 既存のレイアウト管理ロジックと分離
- 段階的な実装とテストが可能

✅ **保守性と拡張性**

- プレビュー機能のロジックが一箇所に集約
- 将来的な機能拡張が容易（例: 複数レイアウトの比較プレビュー）
- テストケースの作成が容易

✅ **明確な責務分離**

- プレビュー状態の管理が明確
- デバッグとトラブルシューティングが容易
- コードの可読性向上

### 課題2: 元のレイアウト状態の保存と復元

**問題:**

- プレビュー前の状態を確実に保存する必要がある
- ユーザーの編集内容も含めて復元する必要がある

**解決策:**

```typescript
interface PreviewState {
  originalLayoutId: LayoutID;
  originalLayoutData: LayoutData; // 念のためデータも保存
  wasEdited: boolean;
}

// 保存
const savePreviewState = (): PreviewState => {
  const currentState = getCurrentLayoutState();
  return {
    originalLayoutId: currentState.selectedLayout!.id,
    originalLayoutData: _.cloneDeep(currentState.selectedLayout!.data),
    wasEdited: currentState.selectedLayout!.edited ?? false,
  };
};

// 復元
const restorePreviewState = async (state: PreviewState) => {
  await setSelectedLayoutId(state.originalLayoutId);
  // 編集状態も復元
  if (state.wasEdited) {
    // 編集フラグをセット
  }
};
```

### 課題3: 確認UIの実装

**問題:**

- ワークスペース上部に固定表示するUIが必要
- 既存のレイアウトシステムと干渉しない配置

**解決策:**

```typescript
// PreviewConfirmationBanner.tsx
export function PreviewConfirmationBanner({
  layoutName,
  onConfirm,
  onCancel,
}: PreviewConfirmationBannerProps): React.JSX.Element {
  return (
    <Portal>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.snackbar,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          borderBottom: '2px solid',
          borderColor: 'primary.main',
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" spacing={2} alignItems="center" py={2}>
            <InfoIcon color="primary" />
            <Typography variant="body1" sx={{ flex: 1 }}>
              このレイアウト "{layoutName}" を使用しますか？
            </Typography>
            <Button variant="contained" onClick={onConfirm}>
              すぐに使う
            </Button>
            <Button variant="outlined" onClick={onCancel}>
              キャンセル
            </Button>
          </Stack>
        </Container>
      </Box>
    </Portal>
  );
}
```

**配置戦略:**

- Portalを使用してDOMツリーの最上位に配置
- z-indexで確実に最前面表示
- 固定位置（fixed）で画面上部に配置

---

## システム設計

### アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────┐
│                  Workspace (Main App)                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │        PreviewConfirmationBanner (Portal)          │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              CurrentLayoutProvider                  │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │         PreviewLayoutProvider               │  │ │
│  │  │  ┌────────────────────────────────────────┐ │  │ │
│  │  │  │         PanelLayout                    │ │  │ │
│  │  │  └────────────────────────────────────────┘ │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           AppSettingsDialog (Marketplace)                │
│  ┌────────────────────────────────────────────────────┐ │
│  │        LayoutMarketplaceSettings                    │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │         MarketplaceCard                      │  │ │
│  │  │    [Install] [Preview]                       │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### コンポーネント構成

#### 1. PreviewLayoutContext & Provider

**責務:**

- プレビューモードの状態管理
- プレビュー開始/確定/キャンセルのロジック
- 元のレイアウト状態の保存と復元

```typescript
// PreviewLayoutContext.ts
export interface PreviewLayoutState {
  isPreviewMode: boolean;
  previewLayoutData: LayoutData | undefined;
  previewLayoutDetail: LayoutMarketplaceDetail | undefined;
  originalLayoutId: LayoutID | undefined;
  originalLayoutData: LayoutData | undefined;
}

export interface PreviewLayoutActions {
  startPreview: (detail: LayoutMarketplaceDetail, data: LayoutData) => Promise<void>;
  confirmPreview: () => Promise<void>;
  cancelPreview: () => Promise<void>;
}

export interface PreviewLayoutContext {
  state: PreviewLayoutState;
  actions: PreviewLayoutActions;
}
```

#### 2. PreviewConfirmationBanner

**責務:**

- プレビュー中の通知UI表示
- すぐに使う/キャンセルボタンの提供

```typescript
// PreviewConfirmationBanner.tsx
export interface PreviewConfirmationBannerProps {
  layoutName: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
  loading?: boolean;
}

export function PreviewConfirmationBanner(props: PreviewConfirmationBannerProps): React.JSX.Element;
```

#### 3. LayoutMarketplaceSettings（拡張）

**責務:**

- Previewボタンハンドラーの追加
- プレビューモードへの遷移

```typescript
// 追加部分
const { actions: previewActions } = usePreviewLayout();
const workspaceActions = useWorkspaceActions();

const handlePreview = useCallback(
  async (layout: LayoutMarketplaceDetail) => {
    try {
      // 1. レイアウトデータのダウンロード
      const layoutData = await marketplace.downloadLayout(layout.layoutUrl);

      // 2. ダイアログを閉じる
      workspaceActions.dialogPreferencesClose();

      // 3. プレビューモード開始
      await previewActions.startPreview(layout, layoutData);
    } catch (error) {
      enqueueSnackbar(`Failed to preview: ${error}`, { variant: "error" });
    }
  },
  [marketplace, previewActions, workspaceActions],
);
```

### データフロー

#### プレビュー開始フロー

```
1. User clicks "Preview" button
   ↓
2. LayoutMarketplaceSettings.handlePreview()
   ↓
3. marketplace.downloadLayout(url) - レイアウトダウンロード
   ↓
4. workspaceActions.dialogPreferencesClose() - ダイアログを閉じる
   ↓
5. previewActions.startPreview(detail, data)
   ├─ 現在のレイアウト状態を保存
   ├─ プレビューモードフラグをセット
   └─ 一時的にレイアウトデータを適用
   ↓
6. PreviewConfirmationBanner表示
   ↓
7. PanelLayoutにプレビューレイアウトを表示
```

#### プレビュー確定フロー

```
1. User clicks "すぐに使う" button
   ↓
2. PreviewConfirmationBanner.onConfirm()
   ↓
3. previewActions.confirmPreview()
   ├─ catalog.installLayoutFromMarketplace() - 正式インストール
   ├─ プレビューモードフラグを解除
   └─ インストール済みレイアウトに切り替え
   ↓
4. PreviewConfirmationBanner非表示
   ↓
5. 成功通知を表示
```

#### プレビューキャンセルフロー

```
1. User clicks "キャンセル" button
   ↓
2. PreviewConfirmationBanner.onCancel()
   ↓
3. previewActions.cancelPreview()
   ├─ 保存しておいた元のレイアウトを復元
   ├─ プレビューモードフラグを解除
   └─ プレビューデータをクリア
   ↓
4. PreviewConfirmationBanner非表示
   ↓
5. workspaceActions.dialogPreferencesOpen() - ダイアログを再度開く
```

### 状態管理

```typescript
// PreviewLayoutProvider内部の状態
const [state, setState] = useState<PreviewLayoutState>({
  isPreviewMode: false,
  previewLayoutData: undefined,
  previewLayoutDetail: undefined,
  originalLayoutId: undefined,
  originalLayoutData: undefined,
});

// CurrentLayoutProviderとの連携
const { actions: layoutActions, getCurrentLayoutState } = useCurrentLayoutActions();
```

---

## 実装詳細

### 1. PreviewLayoutContext & Provider

**ファイル:** `packages/suite-base/src/context/PreviewLayoutContext.tsx`

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { createContext, useCallback, useState } from "react";
import _ from "lodash-es";
import { useSnackbar } from "notistack";

import { useGuaranteedContext } from "@lichtblick/hooks";
import { LayoutData, useCurrentLayoutActions, LayoutID } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { LayoutMarketplaceDetail } from "@lichtblick/suite-base/context/LayoutMarketplaceContext";
import { useLayoutCatalog } from "@lichtblick/suite-base/context/LayoutCatalogContext";

/**
 * プレビューレイアウトの状態
 */
export interface PreviewLayoutState {
  /** プレビューモード中かどうか */
  isPreviewMode: boolean;
  /** プレビュー中のレイアウトデータ */
  previewLayoutData: LayoutData | undefined;
  /** プレビュー中のマーケットプレイス詳細情報 */
  previewLayoutDetail: LayoutMarketplaceDetail | undefined;
  /** 元のレイアウトID */
  originalLayoutId: LayoutID | undefined;
  /** 元のレイアウトデータ（復元用） */
  originalLayoutData: LayoutData | undefined;
}

/**
 * プレビューレイアウトのアクション
 */
export interface PreviewLayoutActions {
  /**
   * プレビューを開始
   * @param detail - マーケットプレイスレイアウトの詳細情報
   * @param data - ダウンロードしたレイアウトデータ
   */
  startPreview: (detail: LayoutMarketplaceDetail, data: LayoutData) => Promise<void>;

  /**
   * プレビューを確定してインストール
   */
  confirmPreview: () => Promise<void>;

  /**
   * プレビューをキャンセルして元に戻す
   */
  cancelPreview: () => Promise<void>;
}

/**
 * プレビューレイアウトコンテキスト
 */
export interface PreviewLayoutContext {
  state: PreviewLayoutState;
  actions: PreviewLayoutActions;
}

const PreviewLayoutContextInternal = createContext<PreviewLayoutContext | undefined>(undefined);

/**
 * プレビューレイアウトコンテキストを使用するフック
 */
export function usePreviewLayout(): PreviewLayoutContext {
  return useGuaranteedContext(PreviewLayoutContextInternal, "PreviewLayoutContext");
}

/**
 * プレビューレイアウトプロバイダー
 */
export function PreviewLayoutProvider({
  children
}: React.PropsWithChildren): React.JSX.Element {
  const [state, setState] = useState<PreviewLayoutState>({
    isPreviewMode: false,
    previewLayoutData: undefined,
    previewLayoutDetail: undefined,
    originalLayoutId: undefined,
    originalLayoutData: undefined,
  });

  const { enqueueSnackbar } = useSnackbar();
  const catalog = useLayoutCatalog();
  const {
    actions: layoutActions,
    getCurrentLayoutState
  } = useCurrentLayoutActions();

  /**
   * プレビューを開始
   */
  const startPreview = useCallback(
    async (detail: LayoutMarketplaceDetail, data: LayoutData) => {
      try {
        // 現在のレイアウト状態を保存
        const currentState = getCurrentLayoutState();
        const originalId = currentState.selectedLayout?.id;
        const originalData = currentState.selectedLayout?.data;

        if (!originalId || !originalData) {
          throw new Error("No layout is currently selected");
        }

        // プレビュー状態を設定
        setState({
          isPreviewMode: true,
          previewLayoutData: data,
          previewLayoutDetail: detail,
          originalLayoutId: originalId,
          originalLayoutData: _.cloneDeep(originalData),
        });

        // 一時的にプレビューレイアウトを適用
        // Note: これはインストールせずに表示するための特別な処理
        layoutActions.changePanelLayout({
          layout: data.layout,
          trimConfigById: false,
        });

        // パネル設定を適用
        layoutActions.savePanelConfigs({
          configs: Object.entries(data.configById).map(([id, config]) => ({
            id,
            config,
          })),
        });

        // グローバル変数を適用
        if (data.globalVariables) {
          layoutActions.setGlobalVariables(data.globalVariables);
        }

        // 再生設定を適用
        if (data.playbackConfig) {
          layoutActions.setPlaybackConfig(data.playbackConfig);
        }

        enqueueSnackbar(`プレビュー中: ${detail.name}`, { variant: "info" });
      } catch (error) {
        enqueueSnackbar(`Failed to start preview: ${error}`, { variant: "error" });
        throw error;
      }
    },
    [getCurrentLayoutState, layoutActions, enqueueSnackbar]
  );

  /**
   * プレビューを確定してインストール
   */
  const confirmPreview = useCallback(async () => {
    try {
      if (!state.isPreviewMode || !state.previewLayoutDetail) {
        throw new Error("Not in preview mode");
      }

      // レイアウトを正式にインストール
      const result = await catalog.installLayoutFromMarketplace(
        state.previewLayoutDetail,
        state.previewLayoutDetail.name
      );

      if (!result.success) {
        throw new Error(result.error?.toString() ?? "Installation failed");
      }

      // インストールしたレイアウトに切り替え
      if (result.layout) {
        await layoutActions.setSelectedLayoutId(result.layout.id);
      }

      // プレビュー状態をクリア
      setState({
        isPreviewMode: false,
        previewLayoutData: undefined,
        previewLayoutDetail: undefined,
        originalLayoutId: undefined,
        originalLayoutData: undefined,
      });

      enqueueSnackbar(`${state.previewLayoutDetail.name} をインストールしました`, {
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar(`Failed to confirm preview: ${error}`, { variant: "error" });
      throw error;
    }
  }, [state, catalog, layoutActions, enqueueSnackbar]);

  /**
   * プレビューをキャンセルして元に戻す
   */
  const cancelPreview = useCallback(async () => {
    try {
      if (!state.isPreviewMode || !state.originalLayoutId || !state.originalLayoutData) {
        throw new Error("Cannot cancel: invalid preview state");
      }

      // 元のレイアウトに戻す
      await layoutActions.setSelectedLayoutId(state.originalLayoutId);

      // 念のため元のレイアウトデータも復元
      layoutActions.changePanelLayout({
        layout: state.originalLayoutData.layout,
        trimConfigById: false,
      });

      layoutActions.savePanelConfigs({
        configs: Object.entries(state.originalLayoutData.configById).map(([id, config]) => ({
          id,
          config,
        })),
      });

      if (state.originalLayoutData.globalVariables) {
        layoutActions.setGlobalVariables(state.originalLayoutData.globalVariables);
      }

      if (state.originalLayoutData.playbackConfig) {
        layoutActions.setPlaybackConfig(state.originalLayoutData.playbackConfig);
      }

      // プレビュー状態をクリア
      setState({
        isPreviewMode: false,
        previewLayoutData: undefined,
        previewLayoutDetail: undefined,
        originalLayoutId: undefined,
        originalLayoutData: undefined,
      });

      enqueueSnackbar("プレビューをキャンセルしました", { variant: "info" });
    } catch (error) {
      enqueueSnackbar(`Failed to cancel preview: ${error}`, { variant: "error" });
      throw error;
    }
  }, [state, layoutActions, enqueueSnackbar]);

  const value: PreviewLayoutContext = {
    state,
    actions: {
      startPreview,
      confirmPreview,
      cancelPreview,
    },
  };

  return (
    <PreviewLayoutContextInternal.Provider value={value}>
      {children}
    </PreviewLayoutContextInternal.Provider>
  );
}
```

### 2. PreviewConfirmationBanner

**ファイル:** `packages/suite-base/src/components/PreviewConfirmationBanner.tsx`

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { InfoOutlined as InfoIcon } from "@mui/icons-material";
import { Box, Button, Container, Portal, Stack, Typography } from "@mui/material";
import { useState } from "react";

export interface PreviewConfirmationBannerProps {
  /** プレビュー中のレイアウト名 */
  layoutName: string;
  /** 確定ボタンクリック時のハンドラー */
  onConfirm: () => void | Promise<void>;
  /** キャンセルボタンクリック時のハンドラー */
  onCancel: () => void | Promise<void>;
  /** ローディング状態 */
  loading?: boolean;
}

/**
 * プレビュー確認バナー
 *
 * プレビューモード中に画面上部に表示される確認UI
 */
export function PreviewConfirmationBanner({
  layoutName,
  onConfirm,
  onCancel,
  loading = false,
}: PreviewConfirmationBannerProps): React.JSX.Element {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      await onCancel();
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <Portal>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.snackbar,
          backgroundColor: "rgba(0, 0, 0, 0.90)",
          backdropFilter: "blur(10px)",
          borderBottom: "2px solid",
          borderColor: "primary.main",
          boxShadow: (theme) => theme.shadows[8],
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            py={2}
            sx={{ minHeight: "64px" }}
          >
            <InfoIcon
              color="primary"
              sx={{ fontSize: 28 }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" component="div" gutterBottom>
                レイアウトプレビュー
              </Typography>
              <Typography variant="body2" color="text.secondary">
                このレイアウト <strong>"{layoutName}"</strong> を使用しますか？
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={handleConfirm}
              disabled={loading || isConfirming || isCanceling}
              sx={{ minWidth: 120 }}
            >
              {isConfirming ? "インストール中..." : "すぐに使う"}
            </Button>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={loading || isConfirming || isCanceling}
              sx={{ minWidth: 120 }}
            >
              {isCanceling ? "戻しています..." : "キャンセル"}
            </Button>
          </Stack>
        </Container>
      </Box>
    </Portal>
  );
}
```

### 3. LayoutMarketplaceSettings の拡張

**ファイル:** `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`

```typescript
// 既存のimportに追加
import { usePreviewLayout } from "@lichtblick/suite-base/context/PreviewLayoutContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";

export default function LayoutMarketplaceSettings({
  className,
}: LayoutMarketplaceSettingsProps): React.ReactElement {
  // 既存のhooksに追加
  const { actions: previewActions } = usePreviewLayout();
  const workspaceActions = useWorkspaceActions();

  // プレビューハンドラーを追加
  const handlePreview = useCallback(
    async (layout: LayoutMarketplaceDetail) => {
      try {
        // ローディング状態を設定
        setInstallingIds((prev) => new Set(prev).add(layout.id));

        // レイアウトデータをダウンロード
        const layoutData = await marketplace.downloadLayout(layout.layoutUrl);

        // データバリデーション
        const isValid = await catalog.validateLayoutData?.(layoutData);
        if (isValid === false) {
          throw new Error("Invalid layout data");
        }

        // ダイアログを閉じる
        workspaceActions.dialogPreferencesClose();

        // プレビューモードを開始
        await previewActions.startPreview(layout, layoutData);
      } catch (error) {
        enqueueSnackbar(
          `Failed to preview layout: ${error instanceof Error ? error.message : String(error)}`,
          { variant: "error" }
        );
      } finally {
        setInstallingIds((prev) => {
          const next = new Set(prev);
          next.delete(layout.id);
          return next;
        });
      }
    },
    [marketplace, catalog, previewActions, workspaceActions, enqueueSnackbar]
  );

  return (
    <Stack gap={3} className={className}>
      {/* 既存のヘッダー */}
      <MarketplaceHeader /* ... */ />

      <MarketplaceGrid>
        {filteredLayouts.map((layout, index) => {
          const testThumbnail =
            index % 3 === 0 ? `https://picsum.photos/120/120?random=${index}` : layout.thumbnail;

          return (
            <MarketplaceCard
              key={layout.id}
              name={layout.name}
              description={layout.description}
              author={layout.author}
              version={layout.updatedAt}
              tags={layout.tags}
              installed={false}
              loading={installingIds.has(layout.id)}
              onTagClick={handleTagClick}
              selectedTags={selectedTags}
              onInstall={async () => {
                await installLayout(layout);
              }}
              // プレビューボタンを追加
              onViewDetails={async () => {
                await handlePreview(layout);
              }}
              thumbnail={testThumbnail}
              icon={<ViewQuiltIcon style={{ fontSize: "24px" }} />}
            />
          );
        })}
      </MarketplaceGrid>
    </Stack>
  );
}
```

### 4. Workspace への統合

**ファイル:** `packages/suite-base/src/Workspace.tsx`

```typescript
// Importに追加
import { PreviewConfirmationBanner } from "@lichtblick/suite-base/components/PreviewConfirmationBanner";
import { usePreviewLayout } from "@lichtblick/suite-base/context/PreviewLayoutContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";

function WorkspaceContent(props: WorkspaceProps): React.JSX.Element {
  // 既存のhooksに追加
  const { state: previewState, actions: previewActions } = usePreviewLayout();
  const workspaceActions = useWorkspaceActions();

  // プレビュー確定ハンドラー
  const handleConfirmPreview = useCallback(async () => {
    await previewActions.confirmPreview();
  }, [previewActions]);

  // プレビューキャンセルハンドラー
  const handleCancelPreview = useCallback(async () => {
    await previewActions.cancelPreview();
    // ダイアログを再度開く
    workspaceActions.dialogPreferencesOpen("layouts");
  }, [previewActions, workspaceActions]);

  return (
    <>
      {/* プレビュー確認バナー */}
      {previewState.isPreviewMode && previewState.previewLayoutDetail && (
        <PreviewConfirmationBanner
          layoutName={previewState.previewLayoutDetail.name}
          onConfirm={handleConfirmPreview}
          onCancel={handleCancelPreview}
        />
      )}

      {/* 既存のワークスペースコンテンツ */}
      <Stack /* ... */>
        {/* ... */}
      </Stack>
    </>
  );
}
```

### 5. StudioApp への Provider 追加

**ファイル:** `packages/suite-base/src/StudioApp.tsx`

```typescript
// Importに追加
import { PreviewLayoutProvider } from "@lichtblick/suite-base/context/PreviewLayoutContext";

export default function StudioApp(props: StudioAppProps): JSX.Element {
  // providersの設定部分で追加
  const providers = [
    /* 既存のproviders */
    <CurrentLayoutProvider />,
    <PreviewLayoutProvider />, // ← 追加（CurrentLayoutProviderの後）
    /* 他のproviders */
  ];

  return (
    <MultiProvider providers={providers}>
      {/* ... */}
    </MultiProvider>
  );
}
```

### 6. LayoutMarketplaceSettings でのボタン表示

**方針:**

- `LayoutMarketplaceSettings` では `onViewDetails` プロップを使用
- `MarketplaceCard` コンポーネントは既存のまま使用（変更不要）
- `ActionButtons` コンポーネントも変更不要
- ボタンラベルは `ActionButtons` 内で自動的に「詳細」または「プレビュー」と表示される

**実装:** `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`

```typescript
// LayoutMarketplaceSettings.tsx での使用例
return (
  <MarketplaceGrid>
    {filteredLayouts.map((layout) => (
      <MarketplaceCard
        key={layout.id}
        name={layout.name}
        description={layout.description}
        // ... 他のプロップ
        onInstall={async () => {
          await installLayout(layout);
        }}
        // プレビューハンドラーを onViewDetails に渡す
        onViewDetails={async () => {
          await handlePreview(layout);
        }}
      />
    ))}
  </MarketplaceGrid>
);
```

**注意:**

- `ExtensionMarketplaceSettings` では引き続き `onViewDetails` で詳細画面を表示
- `ActionButtons` コンポーネントは両方のユースケースに対応（変更不要）
- ボタンラベルの表示は各マーケットプレイス設定コンポーネントで制御される

````

---

## 実装手順

### フェーズ1: 基盤実装（2-3日）

#### Day 1: PreviewLayoutContext & Provider

1. **ファイル作成**

   - `packages/suite-base/src/context/PreviewLayoutContext.tsx`

2. **実装内容**

   - PreviewLayoutState型定義
   - PreviewLayoutActions型定義
   - PreviewLayoutProvider実装
   - usePreviewLayoutフック実装

3. **テスト**
   - 単体テスト作成
   - プレビュー状態の管理テスト
   - 状態遷移のテスト

#### Day 2: PreviewConfirmationBanner

1. **ファイル作成**

   - `packages/suite-base/src/components/PreviewConfirmationBanner.tsx`
   - `packages/suite-base/src/components/PreviewConfirmationBanner.stories.tsx`

2. **実装内容**

   - バナーコンポーネント実装
   - Portalを使用した固定配置
   - ボタンのローディング状態管理

3. **スタイリング**

   - 半透明背景
   - ぼかし効果
   - アニメーション効果

4. **テスト**
   - Storybookでのビジュアルテスト
   - インタラクションテスト

#### Day 3: Workspace統合

1. **Providerの追加**

   - StudioApp.tsxにPreviewLayoutProviderを追加
   - 依存関係の確認

2. **Workspaceへの組み込み**

   - PreviewConfirmationBannerの配置
   - イベントハンドラーの接続

3. **統合テスト**
   - プレビューモードの動作確認
   - バナー表示/非表示のテスト

### フェーズ2: マーケットプレイス統合（2-3日）

#### Day 4: LayoutMarketplaceSettings拡張

1. **実装内容**

   - handlePreviewハンドラー追加
   - レイアウトダウンロード処理
   - エラーハンドリング

2. **MarketplaceCard統合**

   - onViewDetailsプロップの活用
   - プレビューボタンの表示

3. **テスト**
   - プレビューボタンのクリックテスト
   - ダイアログ開閉のテスト

#### Day 5: データフロー接続

1. **実装内容**

   - プレビュー開始時のレイアウト適用
   - 元のレイアウト状態の保存
   - 復元処理の実装

2. **ワークスペースアクションの統合**

   - dialogPreferencesCloseの呼び出し
   - dialogPreferencesOpenの呼び出し

3. **テスト**
   - エンドツーエンドテスト
   - データ整合性のテスト

### フェーズ3: 仕上げとテスト（2-3日）

#### Day 6-7: バグ修正とリファインメント

1. **バグ修正**

   - プレビュー中のエッジケース対応
   - エラーハンドリングの改善
   - UIの微調整

2. **パフォーマンス最適化**

   - 不要な再レンダリングの削減
   - メモ化の最適化

3. **ドキュメント作成**
   - コードコメントの追加
   - 使用方法のドキュメント
   - トラブルシューティングガイド

#### Day 8: 総合テスト

1. **テストシナリオ実行**

   - 正常系フロー
   - 異常系フロー
   - エッジケース

2. **ユーザビリティテスト**

   - UIの使いやすさ確認
   - フィードバック収集

3. **リリース準備**
   - マージリクエスト作成
   - レビュー対応

---

## テスト計画

### 単体テスト

#### PreviewLayoutProvider

```typescript
describe("PreviewLayoutProvider", () => {
  it("should start preview mode", async () => {
    // テストコード
  });

  it("should confirm preview and install layout", async () => {
    // テストコード
  });

  it("should cancel preview and restore original layout", async () => {
    // テストコード
  });

  it("should handle errors during preview", async () => {
    // テストコード
  });
});
````

#### PreviewConfirmationBanner

```typescript
describe("PreviewConfirmationBanner", () => {
  it("should render with layout name", () => {
    // テストコード
  });

  it("should call onConfirm when confirm button is clicked", () => {
    // テストコード
  });

  it("should call onCancel when cancel button is clicked", () => {
    // テストコード
  });

  it("should disable buttons when loading", () => {
    // テストコード
  });
});
```

### 統合テスト

```typescript
describe("Layout Preview Integration", () => {
  it("should preview layout from marketplace", async () => {
    // 1. マーケットプレイスを開く
    // 2. レイアウトを選択
    // 3. プレビューボタンをクリック
    // 4. バナーが表示されることを確認
    // 5. レイアウトが適用されることを確認
  });

  it("should install layout after preview confirmation", async () => {
    // 1. プレビューモードを開始
    // 2. 確定ボタンをクリック
    // 3. レイアウトがインストールされることを確認
    // 4. バナーが消えることを確認
  });

  it("should restore original layout after preview cancellation", async () => {
    // 1. プレビューモードを開始
    // 2. キャンセルボタンをクリック
    // 3. 元のレイアウトに戻ることを確認
    // 4. マーケットプレイスが再度開くことを確認
  });
});
```

### E2Eテスト

```typescript
describe("Layout Preview E2E", () => {
  it("complete preview workflow", async () => {
    // 完全なワークフローのテスト
  });

  it("handles network errors gracefully", async () => {
    // ネットワークエラー時の挙動テスト
  });

  it("maintains data consistency", async () => {
    // データ整合性のテスト
  });
});
```

---

## リスクと対応策

### リスク1: レイアウトデータの不整合

**リスク:**

- プレビュー中にレイアウトデータが破損する
- 元のレイアウトに戻せなくなる

**対応策:**

- 元のレイアウトデータをディープクローンで保存
- try-catch-finallyで確実な復元処理
- エラー時のフォールバック処理を実装

### リスク2: パフォーマンスへの影響

**リスク:**

- プレビューモードの切り替えが遅い
- レイアウトデータのダウンロードに時間がかかる

**対応策:**

- ローディング状態の明示
- レイアウトデータのキャッシュ
- 非同期処理の最適化

### リスク3: 既存機能への影響

**リスク:**

- CurrentLayoutProviderの動作に影響
- 他の機能との競合

**対応策:**

- 新しいContextで独立管理
- 既存コードへの影響を最小限に
- 十分な統合テスト

### リスク4: UIの複雑化

**リスク:**

- プレビューバナーが他のUIと干渉
- ユーザーが混乱する

**対応策:**

- z-indexで確実に最前面表示
- 明確なビジュアルデザイン
- ユーザビリティテストの実施

---

## 補足事項

### 関連ドキュメント

- [Layout API Impact Analysis](./layout-api-impact-analysis.md)
- [Layout Documentation](./guides/layout-documentation.md)
- [Extension Detail Implementation](../components/ExtensionsSettings/ExtensionDetail.tsx)

---

## まとめ

この実装計画により、以下が実現されます：

### 実現される機能

✅ **レイアウトプレビュー機能**

- ユーザーがレイアウトをインストール前にプレビューできる
- プレビュー中であることが明確に分かるUI
- プレビューから直接インストール、またはキャンセルして元に戻せる

✅ **技術的な品質**

- 新しいContext API（`PreviewLayoutContext`）による独立した状態管理
- 既存のレイアウトシステムへの影響を最小限に抑える
- 拡張性の高いアーキテクチャ
- Extension と Layout で異なるUI（DetailボタンとPreviewボタン）を適切に使い分け

✅ **保守性と拡張性**

- 明確な責務分離
- テストしやすい設計
- 将来的な機能拡張が容易

### 実装方針のポイント

1. **Context API による独立管理**: PreviewLayoutContext を新規作成し、CurrentLayoutProvider への影響を最小化
2. **既存コンポーネントの活用**: MarketplaceCard の `onViewDetails` プロップを使用
3. **段階的な実装**: フェーズごとに実装・テストを行い、リスクを最小化

### 推定工数

- **実装期間**: 6-8日
- **工数**: 1人 x 6-8日
- **内訳**:
  - フェーズ1（基盤実装）: 2-3日
  - フェーズ2（マーケットプレイス統合）: 2-3日
  - フェーズ3（仕上げとテスト）: 2-3日

---

**作成日:** 2025-10-03
**最終更新:** 2025-10-03
