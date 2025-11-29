# マーケットプレイス「Available」タブの動作修正

## 問題点

インストール済みのアイテムが「Available」タブにも表示されていた。これは以下の理由で問題がある：

1. **タブの意味が曖昧**: 「Available（利用可能）」なのに既にインストール済みのものが表示される
2. **UX的に不自然**: 一般的なマーケットプレイス（VS Code、Chrome Web Store等）では、利用可能タブにはインストール済みを含めない
3. **タブ間の重複**: 同じアイテムが両方のタブに表示される

## 修正内容

### 1. ExtensionMarketplaceSettings.tsx

#### タブフィルタリングの修正

**修正前:**

```tsx
const tabFilteredExtensions = useMemo(() => {
  if (activeTab === "installed") {
    return groupedExtensions.filter((ext) => ext.installed);
  }
  return groupedExtensions; // すべて（インストール済みも含む）
}, [groupedExtensions, activeTab]);
```

**修正後:**

```tsx
const tabFilteredExtensions = useMemo(() => {
  if (activeTab === "installed") {
    return groupedExtensions.filter((ext) => ext.installed);
  }
  // Available タブではインストール済みを除外
  return groupedExtensions.filter((ext) => !ext.installed);
}, [groupedExtensions, activeTab]);
```

#### カウント計算の修正

**修正前:**

```tsx
const getFilteredCountForTab = useCallback(
  (tabType: MarketplaceTab) => {
    const tabData =
      tabType === "installed"
        ? groupedExtensions.filter((ext) => ext.installed)
        : groupedExtensions; // すべて
    // ...
  },
  [groupedExtensions, searchQuery, selectedTags],
);
```

**修正後:**

```tsx
const getFilteredCountForTab = useCallback(
  (tabType: MarketplaceTab) => {
    const tabData =
      tabType === "installed"
        ? groupedExtensions.filter((ext) => ext.installed)
        : groupedExtensions.filter((ext) => !ext.installed); // インストール済みを除外
    // ...
  },
  [groupedExtensions, searchQuery, selectedTags],
);
```

### 2. LayoutMarketplaceSettings.tsx

#### タブフィルタリングの修正

**修正前:**

```tsx
const tabFilteredLayouts = useMemo(() => {
  if (activeTab === "installed") {
    return groupedLayouts.filter((layout) => layout.installed === true);
  }
  return groupedLayouts; // すべて
}, [groupedLayouts, activeTab]);
```

**修正後:**

```tsx
const tabFilteredLayouts = useMemo(() => {
  if (activeTab === "installed") {
    return groupedLayouts.filter((layout) => layout.installed === true);
  }
  // Available タブではインストール済みを除外
  return groupedLayouts.filter((layout) => layout.installed !== true);
}, [groupedLayouts, activeTab]);
```

> **注**: レイアウトでは `installed !== true` を使用（`!layout.installed` はlint エラーになるため）

#### カウント計算の修正

**修正前:**

```tsx
const getFilteredCountForTab = useCallback(
  (tabType: MarketplaceTab) => {
    const tabData =
      tabType === "installed"
        ? groupedLayouts.filter((layout) => layout.installed === true)
        : groupedLayouts; // すべて
    // ...
  },
  [groupedLayouts, searchQuery, selectedTags],
);
```

**修正後:**

```tsx
const getFilteredCountForTab = useCallback(
  (tabType: MarketplaceTab) => {
    const tabData =
      tabType === "installed"
        ? groupedLayouts.filter((layout) => layout.installed === true)
        : groupedLayouts.filter((layout) => layout.installed !== true); // インストール済みを除外
    // ...
  },
  [groupedLayouts, searchQuery, selectedTags],
);
```

## 修正後の動作

### Available タブ

- インストール**されていない**アイテムのみを表示
- インストール可能なアイテムを見つけやすい
- タブカウントも正確に表示

### Installed タブ

- インストール**済み**のアイテムのみを表示
- 既にインストールしたアイテムを管理しやすい
- タブカウントも正確に表示

## UXパターンの比較

### 修正前（重複表示型）

- **Available**: すべて（インストール済み含む）
- **Installed**: インストール済みのみ
- ❌ 同じアイテムが両方に表示される
- ❌ タブの意味が曖昧

### 修正後（完全分離型）✅

- **Available**: インストールされていないもののみ
- **Installed**: インストール済みのもののみ
- ✅ タブの意味が明確
- ✅ 一般的なマーケットプレイスと同じUX
- ✅ VS Code Extensions、Chrome Web Storeと同じパターン

## テスト方法

### 拡張機能マーケットプレイスでのテスト

1. アプリを起動し、設定 > Extensions に移動
2. **Available タブ**:
   - インストール済みの拡張機能が表示されないことを確認
   - タブのカウント数が正しいことを確認
3. **Installed タブ**:
   - インストール済みの拡張機能のみが表示されることを確認
   - タブのカウント数が正しいことを確認
4. 拡張機能をインストール:
   - Available タブから消えることを確認
   - Installed タブに表示されることを確認
   - 両タブのカウント数が更新されることを確認

### レイアウトマーケットプレイスでのテスト

1. アプリを起動し、設定 > Layouts に移動
2. **Available タブ**:
   - インストール済みのレイアウトが表示されないことを確認
   - タブのカウント数が正しいことを確認
3. **Installed タブ**:
   - インストール済みのレイアウトのみが表示されることを確認
   - タブのカウント数が正しいことを確認
4. レイアウトをインストール:
   - Available タブから消えることを確認
   - Installed タブに表示されることを確認
   - 両タブのカウント数が更新されることを確認

## 関連ファイル

- ✅ `/packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx`
- ✅ `/packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`

## まとめ

この修正により、マーケットプレイスのタブが一般的なUXパターンに準拠し、ユーザーにとって直感的で使いやすいインターフェースになりました。

- ✅ タブの意味が明確化
- ✅ アイテムの重複表示がなくなった
- ✅ 一般的なマーケットプレイスと同じUX
- ✅ タブカウントが正確に表示される
