# マーケットプレイス検索バー 日本語入力問題の分析レポート

## 問題の概要

マーケットプレイスの検索バー（レイアウトと拡張機能の両方）で日本語入力（IME入力）を行うと、検索候補が表示される際にフォーカスが外れてしまい、日本語をうまく入力できない問題が発生しています。

## 現在の実装構造

### 1. 検索バーの共通実装

マーケットプレイスの検索バーは以下の2つのコンポーネントで実装されています：

#### 1.1 MarketplaceHeader コンポーネント

- **ファイル**: `/packages/suite-base/src/components/shared/MarketplaceUI/MarketplaceHeader.tsx`
- **役割**: レイアウトと拡張機能の両方で使用される共通ヘッダーコンポーネント
- **検索機能**: 検索候補機能の有無で異なるコンポーネントを使用

#### 1.2 検索候補の有無による実装の違い

```tsx
{
  enableSearchSuggestions && searchSuggestions.length > 0 ? (
    // 検索候補がある場合: MUI Autocomplete を使用
    <Autocomplete
      freeSolo
      options={searchSuggestions.map((suggestion) => suggestion.value)}
      value={searchValue}
      onInputChange={(_, newValue) => {
        onSearchChange(newValue);
      }}
      // ... その他のプロパティ
    />
  ) : (
    // 検索候補がない場合: カスタム SearchBar を使用
    <SearchBar
      placeholder={`Search ${title.toLowerCase()}...`}
      value={searchValue}
      onChange={(event) => {
        onSearchChange(event.target.value);
      }}
      // ... その他のプロパティ
    />
  );
}
```

### 2. 実装箇所

#### 2.1 拡張機能マーケットプレイス

- **ファイル**: `/packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx`
- **検索候補**: 有効化されている (`enableSearchSuggestions={true}`)
- **行**: 558

```tsx
<MarketplaceHeader
  title="Extensions"
  subtitle="Manage and discover extensions"
  icon={<ExtensionIcon style={{ fontSize: "28px" }} />}
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  tagStats={tagStats}
  selectedTags={selectedTags}
  onTagFilterChange={setSelectedTags}
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  error={marketplaceEntries.error?.message}
  onRetry={refreshMarketplaceEntries}
  enableSearchSuggestions={true} // ← 検索候補有効
  searchSuggestions={searchSuggestions}
  enableAdvancedSearch={true}
  advancedSearchOptions={advancedSearchOptions}
  onAdvancedSearchChange={setAdvancedSearchOptions}
  availableAuthors={availableAuthors}
/>
```

#### 2.2 レイアウトマーケットプレイス

- **ファイル**: `/packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`
- **検索候補**: 無効化されている (プロパティ未指定)
- **行**: 282-295

```tsx
<MarketplaceHeader
  title="Layouts"
  subtitle="Discover and install pre-configured layouts"
  icon={<ViewQuiltIcon style={{ fontSize: "28px" }} />}
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  tagStats={tagStats}
  selectedTags={selectedTags}
  onTagFilterChange={setSelectedTags}
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  error={error}
  onRetry={loadLayouts}
  // ← enableSearchSuggestions が未指定 (デフォルト: false)
/>
```

### 3. 検索候補生成ロジック

両マーケットプレイスとも、`generateSearchSuggestions` 関数を使用して検索候補を生成しています：

```tsx
// 拡張機能マーケットプレイス (ExtensionMarketplaceSettings.tsx)
const searchSuggestions = useMemo(() => {
  return generateSearchSuggestions(
    tabFilteredExtensions.map((ext) => ({
      name: ext.name,
      displayName: ext.displayName,
      description: ext.description,
      author: ext.publisher,
      tags: ext.keywords,
    })),
    searchQuery,
    15, // 最大15個の候補を表示
  );
}, [tabFilteredExtensions, searchQuery]);
```

## 問題の原因分析

### 1. MUI Autocomplete の onInputChange の挙動

**問題点**: MUIの`Autocomplete`コンポーネントの`onInputChange`イベントは、日本語入力（IME入力）中も発火します。

- IME入力中（変換未確定の状態）でも`onInputChange`が呼ばれる
- 入力値が変わるたびに親コンポーネントの状態が更新される
- 検索候補リストが再レンダリングされる
- **結果**: フォーカスが外れ、日本語入力が中断される

### 2. IME対応の欠如

**調査結果**: プロジェクト全体で以下のIME関連イベントハンドラーが使用されていない:

```bash
# grep 検索結果
onCompositionStart  # 0件
onCompositionEnd    # 0件
onComposition       # 0件
isComposing         # 0件（IME入力関連のフラグ）
```

これは、日本語入力（IME）を適切に処理するためのReactイベントが実装されていないことを示しています。

### 3. 正しいIME処理の実装パターン

日本語入力を適切に処理するには、以下の3つのCompositionイベントを使用する必要があります：

```tsx
const [isComposing, setIsComposing] = useState(false);

<TextField
  onCompositionStart={() => setIsComposing(true)}
  onCompositionEnd={(e) => {
    setIsComposing(false);
    // 変換確定時に処理を実行
    handleInputChange(e.currentTarget.value);
  }}
  onChange={(e) => {
    // IME入力中は処理をスキップ
    if (!isComposing) {
      handleInputChange(e.target.value);
    }
  }}
/>;
```

## 影響範囲

### 影響を受けるコンポーネント

1. **拡張機能マーケットプレイス** (`ExtensionMarketplaceSettings.tsx`)

   - 検索候補機能が有効
   - 日本語入力時に問題が発生

2. **レイアウトマーケットプレイス** (`LayoutMarketplaceSettings.tsx`)
   - 現在は検索候補機能が無効
   - 検索候補を有効化すると同じ問題が発生する可能性

### 影響を受けないコンポーネント

- `SearchBar`コンポーネントを使用している箇所（検索候補なし）
- 通常の`TextField`を使用している箇所

## 解決策の提案

### 方法1: Autocomplete コンポーネントにIME対応を追加（推奨）

MarketplaceHeader内のAutocompleteにCompositionイベントハンドラーを追加：

```tsx
const [isComposing, setIsComposing] = useState(false);

<Autocomplete
  freeSolo
  options={searchSuggestions.map((suggestion) => suggestion.value)}
  value={searchValue}
  onInputChange={(_, newValue, reason) => {
    // IME入力中は処理をスキップ
    if (!isComposing && reason === "input") {
      onSearchChange(newValue);
    }
  }}
  renderInput={(params) => (
    <TextField
      {...params}
      placeholder={`Search ${title.toLowerCase()}...`}
      variant="filled"
      fullWidth
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={(e) => {
        setIsComposing(false);
        // 変換確定時に検索を実行
        onSearchChange(e.currentTarget.value);
      }}
      style={{
        borderRadius: "12px",
      }}
    />
  )}
  // ... その他のプロパティ
/>;
```

**メリット**:

- 既存の検索候補機能を維持
- 日本語入力が正しく動作
- 他の言語の入力にも影響なし

**デメリット**:

- 実装がやや複雑
- 状態管理が増える

### 方法2: useDebounce を使用した入力遅延

`onSearchChange`の呼び出しをデバウンスして、入力が安定してから処理を実行：

```tsx
import { useDebouncedCallback } from "use-debounce";

const debouncedSearchChange = useDebouncedCallback(
  (value: string) => {
    onSearchChange(value);
  },
  300, // 300msの遅延
);

<Autocomplete
  onInputChange={(_, newValue) => {
    debouncedSearchChange(newValue);
  }}
  // ...
/>;
```

**メリット**:

- 実装が簡単
- パフォーマンスの向上（検索処理の頻度が減る）

**デメリット**:

- 検索候補の表示に遅延が発生
- 根本的な解決ではない

### 方法3: カスタムAutocompleteコンポーネントの作成

プロジェクト内に既存の`Autocomplete`コンポーネントがあり、それを拡張：

- **ファイル**: `/packages/suite-base/src/components/Autocomplete/Autocomplete.tsx`
- このコンポーネントにIME対応を追加し、MarketplaceHeaderで使用

**メリット**:

- 一箇所の修正で全体に適用可能
- 再利用性が高い

**デメリット**:

- 既存コンポーネントの変更が必要
- 影響範囲が広い

## 次のステップ

1. **方法1（推奨）を実装**

   - MarketplaceHeader.tsxにIME対応を追加
   - 拡張機能マーケットプレイスでテスト
   - レイアウトマーケットプレイスで検索候補を有効化してテスト

2. **テストケースの追加**

   - 日本語入力のテストケースを追加
   - 他の言語（中国語、韓国語など）のIME入力もテスト

3. **ドキュメント更新**
   - IME対応のベストプラクティスをドキュメント化
   - 他のコンポーネントでも同様の対応を推奨

## 関連ファイル

- `/packages/suite-base/src/components/shared/MarketplaceUI/MarketplaceHeader.tsx` - 検索バー実装
- `/packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx` - 拡張機能マーケットプレイス
- `/packages/suite-base/src/components/LayoutMarketplaceSettings.tsx` - レイアウトマーケットプレイス
- `/packages/suite-base/src/components/SearchBar/SearchBar.tsx` - カスタム検索バー
- `/packages/suite-base/src/components/Autocomplete/Autocomplete.tsx` - カスタムオートコンプリート
- `/packages/suite-base/src/components/shared/MarketplaceUI/tagUtils.ts` - 検索候補生成ユーティリティ

## まとめ

日本語入力の問題は、MUIの`Autocomplete`コンポーネントがIME入力中も`onInputChange`イベントを発火することが原因です。Compositionイベント（`onCompositionStart`、`onCompositionEnd`）を使用してIME入力の状態を管理し、変換確定時のみ検索処理を実行するように修正することで解決できます。

現在、拡張機能マーケットプレイスでのみこの問題が発生していますが、レイアウトマーケットプレイスで検索候補を有効化する場合も同様の対応が必要になります。
