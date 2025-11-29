# レイアウトインストール通知機能の実装

## 日付

2025年10月9日

## 概要

マーケットプレイスからレイアウトをインストールする際に、Extensionと同様の通知（Snackbar）を表示する機能を実装しました。

## 実装内容

### 作成したファイル

#### 1. `useInstallingLayoutsStore.tsx`

レイアウトインストールの進行状態を管理するZustandストア。

**場所**: `packages/suite-base/src/hooks/useInstallingLayoutsStore.tsx`

**機能**:

- インストール進行状況の管理（installed/total/inProgress）
- 進行状況の更新
- 進行状況のリセット

**使用例**:

```typescript
const {
  installingProgress,
  setInstallingProgress,
  startInstallingProgress,
  resetInstallingProgress,
} = useInstallingLayoutsStore();
```

#### 2. `useInstallingLayoutsState.tsx`

レイアウトインストール処理と通知を管理するカスタムフック。

**場所**: `packages/suite-base/src/hooks/useInstallingLayoutsState.tsx`

**機能**:

- 単一または複数のレイアウトの一括インストール
- 成功/エラー/部分成功時の通知
- Extensionインストールと同じUXパターン
- UIをクリーンに保つため、進行中の通知は表示しない

**使用例**:

```typescript
const { installLayouts, progress } = useInstallingLayoutsState();

// 単一レイアウトのインストール
await installLayouts([{ detail: layoutDetail }]);

// 複数レイアウトの一括インストール
await installLayouts([{ detail: layoutDetail1, name: "Custom Name 1" }, { detail: layoutDetail2 }]);
```

### 更新したファイル

#### 3. `LayoutMarketplaceSettings.tsx`

新しいフックを使用するように更新。

**場所**: `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`

**変更内容**:

- `useInstallingLayoutsState`フックの導入
- `installLayout`関数を新しいフックを使用するように変更
- 通知の自動表示（成功/エラー/進行中）

**修正前**:

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
      // 通知なし
    } finally {
      setInstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(layout.id);
        return next;
      });
    }
  },
  [catalog],
);
```

**修正後**:

```typescript
const { installLayouts } = useInstallingLayoutsState();

const installLayout = useCallback(
  async (layout: LayoutMarketplaceDetail) => {
    setInstallingIds((prev) => new Set(prev).add(layout.id));
    try {
      await installLayouts([{ detail: layout }]);
    } finally {
      setInstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(layout.id);
        return next;
      });
    }
  },
  [installLayouts],
);
```

## 通知の種類

> **注意**: インストール進行中の通知は表示されません。UIをクリーンに保つため、成功/失敗時のみ通知します。

### 1. 成功時

**単一レイアウト**:

```
Successfully installed layout "レイアウト名"
```

**複数レイアウト**:

```
Successfully installed all X layouts
```

- variant: `success`

### 2. エラー時

**単一レイアウト**:

```
Failed to install layout "レイアウト名"
Error: [エラー詳細]
```

**複数レイアウト（全失敗）**:

```
Failed to install all X layouts
Error: [最初のエラー詳細]
```

- variant: `error`
- persist: `true` (ユーザーが手動で閉じるまで表示)

### 3. 部分成功時

```
Installed X of Y layouts successfully
Z layout(s) failed to install
```

- 1つ目: variant: `warning`
- 2つ目: variant: `error`, persist: `true`

## アーキテクチャ

### 設計パターン

Extensionのインストール実装（`useInstallingExtensionsState.tsx`）と同じパターンを採用:

1. **Zustandストアで状態管理**

   - グローバルな進行状況の管理
   - 複数コンポーネントからの参照可能

2. **カスタムフックでビジネスロジック**

   - インストール処理
   - 通知の表示タイミング制御
   - エラーハンドリング

3. **notistackによる通知**
   - MUIと統合されたSnackbar
   - 複数の通知を同時表示可能
   - 自動/手動での閉じる制御

### コンポーネント構成

```
LayoutMarketplaceSettings
  ↓ useInstallingLayoutsState()
  ├─ useInstallingLayoutsStore (状態管理)
  ├─ useLayoutCatalog (インストール処理)
  └─ useSnackbar (通知表示)
```

## Extensionとの比較

| 機能                        | Extension | Layout | 備考                         |
| --------------------------- | --------- | ------ | ---------------------------- |
| 進行状況通知                | ❌        | ❌     | UIをクリーンに保つため非表示 |
| 成功通知                    | ✅        | ✅     | 同じパターン                 |
| エラー通知                  | ✅        | ✅     | 同じパターン                 |
| 部分成功通知                | ✅        | ✅     | 同じパターン                 |
| バッチインストール          | ✅        | ✅     | 同じパターン                 |
| ローカル/リモート保存の区別 | ✅        | ❌     | Extensionのみ                |
| ネームスペース管理          | ✅        | ❌     | Extensionのみ                |

## 使用技術

### 主要ライブラリ

- **Zustand**: 状態管理
- **notistack**: 通知UI

### 型定義

```typescript
export type LayoutInstallData = {
  detail: LayoutMarketplaceDetail;
  name?: string;
};

export type LayoutInstallResult = {
  layoutId: string;
  layoutName: string;
  success: boolean;
  error?: Error;
};

export type UseInstallingLayoutsState = {
  installLayouts: (layouts: LayoutInstallData[]) => Promise<LayoutInstallResult[]>;
  progress: {
    installed: number;
    total: number;
    inProgress: boolean;
  };
};
```

## テスト

### 手動テスト手順

1. **単一レイアウトのインストール**

   - マーケットプレイスから1つのレイアウトをインストール
   - 成功通知が表示されることを確認

2. **エラーハンドリング**
   - 無効なレイアウトをインストール（存在しないURLなど）
   - エラー通知が表示されることを確認

### 確認項目

- [ ] 単一レイアウトのインストール成功通知
- [ ] 単一レイアウトのインストールエラー通知
- [ ] 通知がダイアログの前面に表示される
- [ ] 通知の自動クローズ（成功時）
- [ ] 通知の手動クローズ（エラー時）
- [ ] 重複通知の抑制（`preventDuplicate`）
- [ ] 進行中の通知が表示されない（UIがクリーン）

## 今後の拡張案

### 1. バッチインストール対応

現在は単一レイアウトのみだが、将来的に複数レイアウトの一括インストールに対応可能:

```typescript
// 例: 複数レイアウトの一括インストール
const results = await installLayouts([
  { detail: layout1 },
  { detail: layout2 },
  { detail: layout3 },
]);
```

### 2. アンインストール通知

レイアウトのアンインストール時にも通知を表示:

```typescript
const uninstallLayout = async (layoutId: string) => {
  try {
    await catalog.uninstallMarketplaceLayout(layoutId);
    enqueueSnackbar(`Layout uninstalled successfully`, { variant: "success" });
  } catch (error) {
    enqueueSnackbar(`Failed to uninstall layout`, { variant: "error" });
  }
};
```

### 3. 更新通知

レイアウトの更新時にも通知を表示:

```typescript
const updateLayout = async (layoutId: string, newDetail: LayoutMarketplaceDetail) => {
  try {
    const result = await catalog.updateMarketplaceLayout(layoutId, newDetail);
    if (result.success) {
      enqueueSnackbar(`Layout updated successfully`, { variant: "success" });
    }
  } catch (error) {
    enqueueSnackbar(`Failed to update layout`, { variant: "error" });
  }
};
```

### 4. 詳細なエラー情報

エラー通知に詳細ボタンを追加:

```typescript
enqueueSnackbar(
  <div>
    Failed to install layout
    <Link onClick={() => showErrorDetails(error)}>
      (see details)
    </Link>
  </div>,
  { variant: "error" }
);
```

## 関連ドキュメント

- [Extension Marketplace Fix Log](../development/extension-marketplace-fix-log.md)
- [Notification Z-Index Issue](./notification-z-index-issue.md)
- [Layout Marketplace Implementation](../marketplace/guides/layout-documentation.md)

## 関連ファイル

### 新規作成

- `packages/suite-base/src/hooks/useInstallingLayoutsStore.tsx`
- `packages/suite-base/src/hooks/useInstallingLayoutsState.tsx`

### 更新

- `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`

### 参考

- `packages/suite-base/src/hooks/useInstallingExtensionsStore.tsx`
- `packages/suite-base/src/hooks/useInstallingExtensionsState.tsx`
- `packages/suite-base/src/components/StudioToastProvider.tsx`

## 更新履歴

- 2025/10/9: 初版作成 - レイアウトインストール通知機能の実装完了
- 2025/10/9: 更新 - 進行中の通知を削除（UIをクリーンに保つため）
