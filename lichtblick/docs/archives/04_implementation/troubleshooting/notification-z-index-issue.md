# 通知（Snackbar）がダイアログの背後に表示される問題

## 日付

2025年10月9日

## 問題の概要

マーケットプレイスからレイアウトやExtensionをインストールする際、成功/エラー通知がダイアログ（設定ダイアログなど）の背後に隠れて表示されない問題が発生していました。

## 原因

### 技術的な原因

- **z-indexの優先順位の問題**: MUI Dialogのデフォルトのz-index（1300）とnotistackのSnackbarのz-indexの競合
- **コンポーネント階層の問題**: SnackbarとDialogが同じコンポーネントツリー内にあり、z-indexの計算が複雑になる

### 影響範囲

- Layout Marketplace でのレイアウトインストール時
- Extension Marketplace でのExtensionインストール時
- その他、ダイアログを開いた状態での通知全般

## 解決方法

### ベースライブラリ（lichtblick）への修正案

`packages/suite-base/src/components/StudioToastProvider.tsx`に以下の修正を加えることで解決できます。

#### 修正1: z-indexの明示的な設定

```typescript
const useContainerStyles = makeStyles()((theme) => ({
  /* eslint-disable tss-unused-classes/unused-classes */
  containerAnchorOriginBottomCenter: {
    ...anchorWithOffset("bottom"),
    "&.notistack-SnackbarContainer": {
      top: undefined,
      // Set z-index higher than MUI Dialog (1300) and Modal (1300) to ensure snackbars appear above dialogs
      // MUI default: modal: 1300, snackbar: 1400, tooltip: 1500
      zIndex: `${theme.zIndex.modal + 100} !important`,
    },
  },
  containerAnchorOriginBottomRight: {
    ...anchorWithOffset("bottom"),
    "&.notistack-SnackbarContainer": {
      top: undefined,
      zIndex: `${theme.zIndex.modal + 100} !important`,
    },
  },
  containerAnchorOriginBottomLeft: {
    ...anchorWithOffset("bottom"),
    "&.notistack-SnackbarContainer": {
      top: undefined,
      zIndex: `${theme.zIndex.modal + 100} !important`,
    },
  },
  containerAnchorOriginTopCenter: {
    ...anchorWithOffset("top"),
    "&.notistack-SnackbarContainer": {
      top: APP_BAR_HEIGHT,
      zIndex: `${theme.zIndex.modal + 100} !important`,
    },
  },
  containerAnchorOriginTopRight: {
    ...anchorWithOffset("top"),
    "&.notistack-SnackbarContainer": {
      top: APP_BAR_HEIGHT,
      zIndex: `${theme.zIndex.modal + 100} !important`,
    },
  },
  containerAnchorOriginTopLeft: {
    ...anchorWithOffset("top"),
    "&.notistack-SnackbarContainer": {
      top: APP_BAR_HEIGHT,
      zIndex: `${theme.zIndex.modal + 100} !important`,
    },
  },
  /* eslint-enable tss-unused-classes/unused-classes */
}));
```

#### 修正2: domRootプロパティの追加

```typescript
export default function StudioToastProvider({ children }: PropsWithChildren): React.JSX.Element {
  const { classes: containerClasses } = useContainerStyles();
  const { classes } = useStyles();
  return (
    <SnackbarProvider
      // ... 既存のprops
      classes={containerClasses}
      // Render snackbars in document.body instead of within the component tree
      // This helps ensure they appear above all dialogs and modals
      domRoot={document.body}
    >
      {children}
    </SnackbarProvider>
  );
}
```

### なぜこの修正が効果的か

1. **z-indexの明示的な設定**

   - MUI Modalのz-index（1300）より確実に高い値（1400）を設定
   - `!important`で他のスタイルより優先される

2. **domRootプロパティ**
   - Snackbarを`document.body`の直接の子要素としてレンダリング
   - コンポーネントツリーの階層による影響を受けない
   - ダイアログとは完全に独立した階層になる

### MUI z-index階層

参考: MUIのデフォルトz-index値

```
appBar: 1100
drawer: 1200
modal: 1300
snackbar: 1400  ← 今回の対策で確実にこの値以上にする
tooltip: 1500
```

## 現在の対応状況

**2025年10月9日時点**:

- ✅ 修正方法を確認し、動作を検証済み
- ⚠️ `StudioToastProvider.tsx`はベースライブラリ（lichtblick）の実装のため、修正は保留
- 📝 本ドキュメントに解決方法を記録

## 将来的な対応

### オプション1: 上流（lichtblick）へのPR

- lichtblickプロジェクトに対して、この修正のPRを送る
- 他のフォーク/ユーザーも恩恵を受けられる

### オプション2: ローカルでの修正維持

- 必要に応じて、Umi固有の修正として保持
- アップストリームのマージ時に注意が必要

### オプション3: 代替実装

- 独自の`UmiToastProvider`を作成し、`StudioToastProvider`をラップする
- ベースライブラリを変更せずに対応可能

## 関連ファイル

- `packages/suite-base/src/components/StudioToastProvider.tsx` - 通知プロバイダー
- `packages/suite-base/src/hooks/useInstallingLayoutsState.tsx` - レイアウトインストール通知
- `packages/suite-base/src/hooks/useInstallingExtensionsState.tsx` - Extension インストール通知
- `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx` - レイアウトマーケットプレイス

## 検証方法

### 問題の再現手順

1. アプリケーションを起動
2. 設定ダイアログ（Preferences）を開く
3. Layouts または Extensions タブに移動
4. マーケットプレイスからアイテムをインストール
5. **問題**: 通知がダイアログの背後に表示される

### 修正後の確認手順

1. 上記の修正を適用
2. 同じ手順でインストールを実行
3. **期待**: 通知がダイアログの前面に表示される

### ブラウザ開発者ツールでの確認

```javascript
// Console で実行
// Snackbarコンテナの要素を取得
const snackbarContainer = document.querySelector(".notistack-SnackbarContainer");

// z-indexを確認
console.log("Snackbar z-index:", getComputedStyle(snackbarContainer).zIndex);

// Dialogの z-indexを確認
const dialog = document.querySelector(".MuiDialog-root");
console.log("Dialog z-index:", getComputedStyle(dialog).zIndex);
```

## 参考情報

- [notistack Documentation](https://notistack.com/api-reference)
- [MUI z-index Documentation](https://mui.com/material-ui/customization/z-index/)
- [CSS z-index and Stacking Context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context)

## 更新履歴

- 2025/10/9: 初版作成 - 問題の特定と解決方法の記録
