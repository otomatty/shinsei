# レイアウトマーケットプレイス プレビュー機能 実装ログ

## 📅 実装日

2025年10月3日

---

## 📋 概要

レイアウトマーケットプレイスにプレビュー機能を実装し、ユーザーがレイアウトをインストールする前に内容を確認できるようにしました。

---

## 🎯 実装目標

- ✅ レイアウトをインストール前にプレビュー表示
- ✅ プレビュー中であることを示す明確なUI
- ✅ プレビューから直接インストール、またはキャンセルして元に戻す機能
- ✅ 既存システムへの影響を最小限に抑えた実装

---

## 📁 作成・変更ファイル一覧

### 新規作成ファイル (2ファイル)

#### 1. `packages/suite-base/src/context/PreviewLayoutContext.tsx`

**役割**: プレビューモードの状態管理

**主な機能**:

- プレビュー状態の管理（isPreviewMode, previewLayoutData, originalLayoutDataなど）
- プレビュー開始処理（`startPreview`）
- プレビュー確定処理（`confirmPreview`）
- プレビューキャンセル処理（`cancelPreview`）

**主要インターフェース**:

```typescript
interface PreviewLayoutState {
  isPreviewMode: boolean;
  previewLayoutData: LayoutData | undefined;
  previewLayoutDetail: LayoutMarketplaceDetail | undefined;
  originalLayoutId: LayoutID | undefined;
  originalLayoutData: LayoutData | undefined;
}

interface PreviewLayoutActions {
  startPreview: (detail: LayoutMarketplaceDetail, data: LayoutData) => Promise<void>;
  confirmPreview: () => Promise<void>;
  cancelPreview: () => Promise<void>;
}
```

**実装のポイント**:

- `lodash-es`を使用して元のレイアウトデータをディープクローン
- `useCurrentLayoutActions`を使用してレイアウトの適用と復元を実装
- エラーハンドリングとユーザー通知（snackbar）の実装

#### 2. `packages/suite-base/src/components/PreviewConfirmationBanner.tsx`

**役割**: プレビュー中の確認UI

**主な機能**:

- 画面上部に固定表示されるバナー
- レイアウト名の表示
- 「すぐに使う」ボタン（プレビュー確定）
- 「キャンセル」ボタン（プレビュー解除）
- ローディング状態の管理

**スタイリング**:

- `tss-react/mui`を使用（パフォーマンス最適化）
- MUI Portalを使用して最上位に配置
- 半透明背景とぼかし効果

**主要スタイル**:

```typescript
{
  position: "fixed",
  top: 0,
  zIndex: theme.zIndex.snackbar,
  backgroundColor: "rgba(0, 0, 0, 0.90)",
  backdropFilter: "blur(10px)",
  borderBottom: `2px solid ${theme.palette.primary.main}`,
}
```

### 変更ファイル (3ファイル)

#### 3. `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`

**変更内容**:

**追加したインポート**:

```typescript
import { useSnackbar } from "notistack";
import { usePreviewLayout } from "@lichtblick/suite-base/context/PreviewLayoutContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
```

**追加した状態管理**:

```typescript
const { actions: previewActions } = usePreviewLayout();
const { dialogActions } = useWorkspaceActions();
const { enqueueSnackbar } = useSnackbar();
```

**追加した機能**: `handlePreview`関数

```typescript
const handlePreview = useCallback(
  async (layout: LayoutMarketplaceDetail) => {
    try {
      setInstallingIds((prev) => new Set(prev).add(layout.id));
      const layoutData = await marketplace.downloadLayout(layout.layoutUrl);
      dialogActions.preferences.close();
      await previewActions.startPreview(layout, layoutData);
    } catch (err) {
      enqueueSnackbar(`Failed to preview layout: ${err.message}`, { variant: "error" });
    } finally {
      setInstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(layout.id);
        return next;
      });
    }
  },
  [marketplace, dialogActions, previewActions, enqueueSnackbar],
);
```

**MarketplaceCard への追加**:

```typescript
<MarketplaceCard
  // ... 既存のプロップ
  onViewDetails={async () => {
    await handlePreview(layout);
  }}
/>
```

#### 4. `packages/suite-base/src/Workspace.tsx`

**変更内容**:

**追加したインポート**:

```typescript
import { PreviewConfirmationBanner } from "@lichtblick/suite-base/components/PreviewConfirmationBanner";
import { usePreviewLayout } from "./context/PreviewLayoutContext";
```

**追加した状態管理**:

```typescript
const { state: previewState, actions: previewActions } = usePreviewLayout();
```

**追加したハンドラー**:

```typescript
// プレビュー確定ハンドラー
const handleConfirmPreview = useCallback(async () => {
  await previewActions.confirmPreview();
}, [previewActions]);

// プレビューキャンセルハンドラー
const handleCancelPreview = useCallback(async () => {
  await previewActions.cancelPreview();
  dialogActions.preferences.open("layouts");
}, [previewActions, dialogActions]);
```

**UIへの統合**:

```typescript
return (
  <PanelStateContextProvider>
    {/* プレビュー確認バナー */}
    {previewState.isPreviewMode && previewState.previewLayoutDetail && (
      <PreviewConfirmationBanner
        layoutName={previewState.previewLayoutDetail.name}
        onConfirm={handleConfirmPreview}
        onCancel={handleCancelPreview}
      />
    )}
    {/* ... 既存のコンテンツ */}
  </PanelStateContextProvider>
);
```

#### 5. `packages/suite-base/src/StudioApp.tsx`

**変更内容**:

**追加したインポート**:

```typescript
import { PreviewLayoutProvider } from "./context/PreviewLayoutContext";
import LayoutCatalogProvider from "./providers/LayoutCatalogProvider";
import LayoutMarketplaceProvider from "./providers/LayoutMarketplaceProvider";
```

**Provider の追加と依存関係の整理**:

```typescript
// Layout-related providers in dependency order:
// 1. LayoutManagerProvider (base)
// 2. UserProfileLocalStorageProvider
// 3. CurrentLayoutProvider (depends on LayoutManagerProvider)
// 4. LayoutMarketplaceProvider (independent)
// 5. LayoutCatalogProvider (depends on LayoutMarketplaceProvider)
// 6. PreviewLayoutProvider (depends on CurrentLayoutProvider and LayoutCatalogProvider)
providers.unshift(<PreviewLayoutProvider />);
providers.unshift(<LayoutCatalogProvider />);
providers.unshift(<LayoutMarketplaceProvider />);
providers.unshift(<CurrentLayoutProvider />);
providers.unshift(<UserProfileLocalStorageProvider />);
providers.unshift(<LayoutManagerProvider />);
```

---

## 🔧 技術的な実装詳細

### アーキテクチャの選択

**Context API パターンの採用**

新しい`PreviewLayoutContext`を作成し、既存の`CurrentLayoutProvider`とは独立して管理することで：

- ✅ 既存システムへの影響を最小化
- ✅ 明確な責務分離
- ✅ テストとデバッグが容易
- ✅ 将来的な機能拡張が可能

### データフロー

```
1. ユーザーが「詳細」ボタンをクリック
   ↓
2. LayoutMarketplaceSettings.handlePreview()
   - レイアウトデータをダウンロード
   - ダイアログを閉じる
   ↓
3. PreviewLayoutContext.startPreview()
   - 現在のレイアウト状態を保存
   - プレビューレイアウトを一時的に適用
   ↓
4. PreviewConfirmationBanner が表示される
   ↓
5a. 「すぐに使う」をクリック
   - confirmPreview() → レイアウトをインストール

5b. 「キャンセル」をクリック
   - cancelPreview() → 元のレイアウトに復元
   - マーケットプレイスダイアログを再度開く
```

### 状態管理の設計

**PreviewLayoutState の構造**:

```typescript
{
  isPreviewMode: boolean,              // プレビューモードフラグ
  previewLayoutData: LayoutData,       // プレビュー中のレイアウトデータ
  previewLayoutDetail: LayoutMarketplaceDetail, // マーケットプレイス情報
  originalLayoutId: LayoutID,          // 元のレイアウトID
  originalLayoutData: LayoutData,      // 元のレイアウトデータ（復元用）
}
```

### エラーハンドリング

各主要機能でtry-catch-finallyパターンを実装：

- レイアウトダウンロード失敗
- プレビュー適用失敗
- インストール失敗
- 復元失敗

すべてのエラーでユーザーにsnackbar通知を表示。

---

## 🐛 発生した問題と解決策

### 問題1: Provider 依存関係エラー

**エラー内容**:

```
Error: A LayoutMarketplaceContext provider is required to useLayoutMarketplace
```

**原因**:
`LayoutCatalogProvider`が`LayoutMarketplaceContext`を必要としているのに、Providerの順序が間違っていた。

**解決策**:
Provider の依存関係を正しい順序に並べ替え：

1. LayoutManagerProvider
2. UserProfileLocalStorageProvider
3. CurrentLayoutProvider
4. LayoutMarketplaceProvider ← **これを先に配置**
5. LayoutCatalogProvider ← **これが4に依存**
6. PreviewLayoutProvider ← **これが3と5に依存**

### 問題2: ESLintエラー（sx propの使用）

**エラー内容**:

```
Use of the sx prop is not advised due to performance issues.
```

**解決策**:
MUIの`sx`プロップの代わりに`tss-react/mui`の`makeStyles`を使用してスタイリング。

### 問題3: TypeScript型エラー（useCurrentLayoutActions）

**エラー内容**:

```
プロパティ 'actions' は型に存在しません
```

**原因**:
`useCurrentLayoutActions()`は直接アクション関数を返すのに、`.actions`でアクセスしようとした。

**解決策**:

```typescript
// ❌ 間違い
layoutActions.actions.changePanelLayout(...)

// ✅ 正しい
layoutActions.changePanelLayout(...)
```

---

## ✅ 実装の検証

### コンパイルエラーチェック

```bash
# すべてのファイルでエラーなし
✓ PreviewLayoutContext.tsx
✓ PreviewConfirmationBanner.tsx
✓ LayoutMarketplaceSettings.tsx
✓ Workspace.tsx
✓ StudioApp.tsx
```

### 実装完了確認

- ✅ プレビュー機能の実装
- ✅ プレビュー確認UIの実装
- ✅ インストール機能の実装
- ✅ キャンセル機能の実装
- ✅ エラーハンドリングの実装
- ✅ Provider依存関係の修正

---

## 📊 コード統計

### 追加されたコード量

| ファイル                      | 行数       | 主な内容                          |
| ----------------------------- | ---------- | --------------------------------- |
| PreviewLayoutContext.tsx      | ~260行     | Context, Provider, アクション実装 |
| PreviewConfirmationBanner.tsx | ~115行     | UIコンポーネント, スタイリング    |
| LayoutMarketplaceSettings.tsx | +40行      | プレビューハンドラー追加          |
| Workspace.tsx                 | +20行      | バナー統合, ハンドラー            |
| StudioApp.tsx                 | +10行      | Provider追加                      |
| **合計**                      | **~445行** |                                   |

### 影響範囲

- **新規ファイル**: 2
- **変更ファイル**: 3
- **削除ファイル**: 0
- **既存機能への影響**: 最小限（既存のレイアウトシステムは変更なし）

---

## 🧪 テスト項目

### 手動テスト項目（実施推奨）

#### 基本動作

- [ ] レイアウトマーケットプレイスを開く
- [ ] レイアウトカードの「詳細」ボタンをクリック
- [ ] プレビューバナーが画面上部に表示される
- [ ] レイアウトがワークスペースに適用される

#### プレビュー確定

- [ ] 「すぐに使う」ボタンをクリック
- [ ] レイアウトが正式にインストールされる
- [ ] 成功通知が表示される
- [ ] バナーが消える

#### プレビューキャンセル

- [ ] 「キャンセル」ボタンをクリック
- [ ] 元のレイアウトに戻る
- [ ] マーケットプレイスダイアログが再度開く
- [ ] バナーが消える

#### エラーケース

- [ ] ネットワークエラー時のハンドリング
- [ ] 無効なレイアウトデータのハンドリング
- [ ] インストール失敗時のエラー表示

#### エッジケース

- [ ] プレビュー中に他のレイアウトに切り替えようとする
- [ ] 複数回連続でプレビューを実行
- [ ] プレビュー中にダイアログを開こうとする

---

## 📝 残タスク・今後の改善案

### 残タスク

1. **実際の動作テスト**

   - アプリケーションを起動してプレビュー機能をテスト
   - 上記のテスト項目を実施

2. **ユニットテストの作成**（オプション）

   - PreviewLayoutContextのテスト
   - PreviewConfirmationBannerのテスト

3. **ドキュメント更新**（オプション）
   - ユーザーマニュアルへの追加
   - 開発者向けドキュメントの更新

### 今後の改善案

1. **UIの改善**

   - プレビュー中のアニメーション効果
   - より詳細なプレビュー情報の表示
   - サムネイル画像のプレビュー

2. **機能拡張**

   - 複数レイアウトの比較プレビュー
   - プレビュー履歴の保存
   - プレビュー中のレイアウト編集

3. **パフォーマンス最適化**

   - レイアウトデータのキャッシュ
   - 非同期処理の最適化
   - メモリ使用量の削減

4. **アクセシビリティ**
   - キーボードショートカット対応
   - スクリーンリーダー対応
   - ARIA属性の追加

---

## 📚 参考資料

- [実装計画書](./layout-preview-feature-implementation-plan.md)
- [Layout API Impact Analysis](./layout-api-impact-analysis.md)
- [React Context API Documentation](https://react.dev/reference/react/useContext)
- [tss-react Documentation](https://www.tss-react.dev/)

---

## 👥 作成者

- 実装日: 2025年10月3日
- 実装者: AI Assistant with User

---

## 📄 ライセンス

このプロジェクトのライセンスに従います。

SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
SPDX-License-Identifier: MPL-2.0
