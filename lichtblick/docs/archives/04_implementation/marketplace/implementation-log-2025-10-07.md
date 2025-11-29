# マーケットプレイス機能実装ログ - 2025年10月7日

## 概要

マーケットプレイス機能（拡張機能とレイアウト）に対して、以下の改善と機能追加を実施しました：

1. 検索バーの虫眼鏡アイコン表示問題の修正
2. 検索とタグフィルターの統合機能の実装
3. レイアウトマーケットプレイスへの高度な検索機能の追加

---

## 1. 検索バーの虫眼鏡アイコン表示問題の修正

### 問題の発見

マーケットプレイスの検索バーにおいて、検索対象が0個の場合は虫眼鏡アイコンが表示されるが、検索対象が1個以上の場合は虫眼鏡アイコンが表示されないという問題が発見されました。

### 原因分析

**ファイル**: `/packages/suite-base/src/components/shared/MarketplaceUI/MarketplaceHeader.tsx`

**問題箇所**: 165行目付近

```tsx
{enableSearchSuggestions && searchSuggestions.length > 0 ? (
  <Autocomplete
    // 虫眼鏡アイコンのInputAdornmentが無い
    renderInput={(params) => (
      <TextField {...params} />
    )}
  />
) : (
  <SearchBar  // こちらは虫眼鏡アイコンが含まれている
    placeholder={`Search ${title.toLowerCase()}...`}
    value={searchValue}
    onChange={...}
  />
)}
```

**原因**:

- `searchSuggestions.length > 0`（検索対象が1個以上）の場合は`Autocomplete`コンポーネントを使用
- `searchSuggestions.length === 0`の場合は`SearchBar`コンポーネントを使用
- `SearchBar`コンポーネントはデフォルトで`<SearchIcon />`を含む
- `Autocomplete`の`TextField`には虫眼鏡アイコンが追加されていない

### 解決方法

#### 変更1: インポートの追加

```tsx
import SearchIcon from "@mui/icons-material/Search";
import {
  // ... 既存のインポート
  InputAdornment,
} from "@mui/material";
```

#### 変更2: Autocompleteの修正

```tsx
renderInput={(params) => (
  <TextField
    {...params}
    placeholder={`Search ${title.toLowerCase()}...`}
    variant="filled"
    fullWidth
    InputProps={{
      ...params.InputProps,
      startAdornment: (
        <>
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
          {params.InputProps.startAdornment}
        </>
      ),
    }}
    // ... その他のprops
  />
)}
```

### 結果

- 検索対象の数に関わらず、常に虫眼鏡アイコンが表示されるようになった
- UIの一貫性が向上

---

## 2. 検索とタグフィルターの統合機能の実装

### 目的

検索機能とタグフィルター機能を統合し、以下のようなシームレスなユーザーフローを実現：

1. ユーザーが検索欄でタグ名を入力
2. 検索候補にタグ名が表示される
3. ユーザーが検索候補のタグをクリック
4. タグフィルターが動作し、クリックしたタグでフィルタリング

### 実装内容

#### 変更1: AutocompleteにonChangeハンドラーを追加

**ファイル**: `/packages/suite-base/src/components/shared/MarketplaceUI/MarketplaceHeader.tsx`

```tsx
<Autocomplete
  freeSolo
  options={searchSuggestions.map((suggestion) => suggestion.value)}
  value={searchValue}
  onInputChange={(_, newValue, reason) => {
    // IME入力中はスキップ
    if (!isComposing && reason === "input") {
      onSearchChange(newValue);
    }
  }}
  onChange={(_, newValue) => {
    // ドロップダウンからの選択を処理
    if (newValue && typeof newValue === "string") {
      const suggestion = searchSuggestions.find((s) => s.value === newValue);

      // タグが選択された場合、タグフィルターに追加
      if (suggestion?.type === "tag" && onTagFilterChange) {
        const currentTags = selectedTags;
        if (!currentTags.includes(newValue)) {
          onTagFilterChange([...currentTags, newValue]);
        }
        // タグ追加後、検索入力をクリア
        onSearchChange("");
      } else {
        // タグ以外の候補の場合、検索値を更新
        onSearchChange(newValue);
      }
    }
  }}
  // ...
/>
```

#### 変更2: タグ候補の視覚的識別の改善

タグタイプの候補に「Click to filter」ヒントとフィルターアイコンを追加：

```tsx
renderOption={(props, option) => {
  const suggestion = searchSuggestions.find((s) => s.value === option);
  const isTag = suggestion?.type === "tag";

  return (
    <li {...props} key={option}>
      <div className={classes.suggestionItem}>
        <Chip
          size="small"
          label={suggestion?.type ?? ""}
          className={classes.suggestionTypeChip}
          style={{
            backgroundColor: typeColor[suggestion?.type ?? "keyword"],
          }}
        />
        <span className={classes.suggestionText}>{option}</span>
        {suggestion?.count != undefined && suggestion.count > 1 && (
          <Chip
            size="small"
            label={suggestion.count}
            variant="outlined"
            className={classes.suggestionCountChip}
          />
        )}
        {isTag && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.75rem",
              color: theme.palette.text.secondary,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FilterListIcon fontSize="small" style={{ fontSize: "14px" }} />
            Click to filter
          </span>
        )}
      </div>
    </li>
  );
}}
```

### 実装の特徴

- **重複防止**: 既に選択されているタグは再度追加されない
- **検索欄のクリア**: タグ選択後、検索欄が自動的にクリアされる
- **視覚的フィードバック**: タグ候補には「Click to filter」テキストとアイコンが表示される
- **統一された体験**: 検索とフィルタリングがシームレスに連携

---

## 3. レイアウトマーケットプレイスへの高度な検索機能の追加

### 目的

拡張機能マーケットプレイスと同様の高度な検索機能をレイアウトマーケットプレイスにも実装し、一貫したユーザーエクスペリエンスを提供する。

### 実装内容

#### 変更1: LayoutMarketplaceSettings.tsx の更新

**追加した機能**:

1. **高度な検索オプションの状態管理**

```tsx
const {
  searchQuery,
  setSearchQuery,
  selectedTags,
  setSelectedTags,
  activeTab,
  setActiveTab,
  filteredItems: filteredLayouts,
  tagStats,
  searchSuggestions,
  tabs,
  tagFilterMode,
  setTagFilterMode,
  advancedSearchOptions, // 追加
  setAdvancedSearchOptions, // 追加
} = useMarketplaceSearch({
  items: layouts,
  enableSuggestions: true,
  maxSuggestions: 15,
});
```

2. **利用可能な著者リストの生成**

```tsx
// レイアウトデータから利用可能な著者リストを抽出
const availableAuthors = React.useMemo(() => {
  const authors = new Set<string>();
  layouts.forEach((layout) => {
    if (layout.author) {
      authors.add(layout.author);
    }
  });
  return Array.from(authors).sort();
}, [layouts]);
```

3. **MarketplaceHeaderへのプロパティ追加**

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
  tagFilterMode={tagFilterMode}
  onTagFilterModeChange={setTagFilterMode}
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  error={error}
  onRetry={loadLayouts}
  enableSearchSuggestions={true}
  searchSuggestions={searchSuggestions}
  enableAdvancedSearch={true} // 追加
  advancedSearchOptions={advancedSearchOptions} // 追加
  onAdvancedSearchChange={setAdvancedSearchOptions} // 追加
  availableAuthors={availableAuthors} // 追加
/>
```

#### 変更2: types.ts の更新

`AdvancedSearchOptions`型に`sortOrder`プロパティを追加：

```typescript
export interface AdvancedSearchOptions {
  /** Filter by author/publisher */
  authorFilter?: string;

  /** Filter by version range */
  versionRange?: {
    min?: string;
    max?: string;
  };

  /** Sort order (combined format for easier use) */
  sortOrder?: "name-asc" | "name-desc" | "date-asc" | "date-desc" | "author-asc" | "author-desc";

  /** Sort order */
  sortBy?: "name" | "author" | "date" | "downloads" | "rating";

  /** Sort direction */
  sortDirection?: "asc" | "desc";

  /** Filter by license */
  licenseFilter?: string[];

  /** Show only verified items */
  verifiedOnly?: boolean;
}
```

**理由**: `AdvancedSearchPanel`コンポーネントは`sortOrder`を直接使用するため、両方のフォーマットをサポート。

#### 変更3: useMarketplaceSearch.ts の更新

`sortOrder`と`sortBy + sortDirection`の両方のフォーマットをサポートするように修正：

```typescript
// Apply search and tag filters
const filteredItems = useMemo(() => {
  let result = tabFilteredItems;

  // Text search and tag filtering
  result = filterItemsBySearchAndTags(result, searchQuery, selectedTags, tagFilterMode);

  // Advanced search options (if any)
  if (
    advancedSearchOptions.authorFilter ||
    advancedSearchOptions.sortBy ||
    advancedSearchOptions.sortOrder
  ) {
    // Support both sortBy+sortDirection and direct sortOrder
    const sortOrder:
      | "name-asc"
      | "name-desc"
      | "date-asc"
      | "date-desc"
      | "author-asc"
      | "author-desc"
      | undefined =
      advancedSearchOptions.sortOrder ??
      (advancedSearchOptions.sortBy
        ? (`${advancedSearchOptions.sortBy}-${advancedSearchOptions.sortDirection ?? "asc"}` as
            | "name-asc"
            | "name-desc"
            | "date-asc"
            | "date-desc"
            | "author-asc"
            | "author-desc")
        : undefined);

    const advancedOpts = {
      authorFilter: advancedSearchOptions.authorFilter,
      versionRange: advancedSearchOptions.versionRange,
      sortOrder,
    };
    result = filterAndSortWithAdvancedOptions(result, "", [], advancedOpts);
  }

  return result;
}, [tabFilteredItems, searchQuery, selectedTags, tagFilterMode, advancedSearchOptions]);
```

### 利用可能な機能

レイアウトマーケットプレイスで以下の機能が使えるようになりました：

1. **著者フィルター**

   - ドロップダウンから特定の著者を選択してフィルタリング
   - 「All Authors」を選択すると全著者のレイアウトを表示

2. **ソート機能**

   - Name (A-Z / Z-A)
   - Author (A-Z / Z-A)
   - Newest First / Oldest First

3. **統合された検索体験**
   - テキスト検索
   - タグフィルター（AND/OR切り替え可能）
   - 検索候補（タグ、著者、名前、キーワード）
   - タグ候補クリックでのフィルター適用
   - 高度な検索オプション

---

## 変更されたファイル一覧

### 修正されたファイル

1. `/packages/suite-base/src/components/shared/MarketplaceUI/MarketplaceHeader.tsx`

   - `SearchIcon`と`InputAdornment`のインポートを追加
   - `Autocomplete`に虫眼鏡アイコンを追加
   - `Autocomplete`に`onChange`ハンドラーを追加してタグフィルター統合
   - `renderOption`にタグ候補用のヒントUIを追加

2. `/packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`

   - `advancedSearchOptions`と`setAdvancedSearchOptions`を追加
   - `availableAuthors`リストを生成
   - `MarketplaceHeader`に高度な検索プロパティを追加

3. `/packages/suite-base/src/components/shared/MarketplaceUI/types.ts`

   - `AdvancedSearchOptions`に`sortOrder`プロパティを追加

4. `/packages/suite-base/src/components/shared/MarketplaceUI/useMarketplaceSearch.ts`
   - `sortOrder`と`sortBy + sortDirection`の両方のフォーマットをサポート

---

## テスト方法

### 1. 虫眼鏡アイコンの表示確認

1. マーケットプレイス画面を開く
2. 検索欄が空の状態で虫眼鏡アイコンが表示されることを確認
3. 文字を入力して検索候補が表示される状態でも虫眼鏡アイコンが表示されることを確認

### 2. タグ検索とフィルターの統合

1. マーケットプレイス画面を開く
2. 検索欄に既存のタグ名を入力（例：「visualization」「data」など）
3. ドロップダウンに表示されたタグ候補（「tag」ラベルと「Click to filter」付き）を確認
4. タグ候補をクリック
5. タグフィルターパネルに選択したタグが追加され、フィルタリングが適用されることを確認
6. 検索欄がクリアされることを確認

### 3. レイアウトマーケットプレイスの高度な検索

1. レイアウトマーケットプレイス画面を開く
2. 検索バーの右側にある**歯車アイコン**をクリック
3. **Advanced Search Options**パネルが表示されることを確認
4. 著者フィルターのドロップダウンから著者を選択し、フィルタリングが機能することを確認
5. ソート順序を変更し、レイアウトが正しくソートされることを確認
6. 「Clear All」ボタンですべてのフィルターがクリアされることを確認

---

## 技術的な詳細

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│            Application Layer                                │
│  ExtensionMarketplaceSettings / LayoutMarketplaceSettings   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Container Component                            │
│           useMarketplaceSearch Hook                         │
│  - Search state management                                  │
│  - Tag filtering (AND/OR)                                   │
│  - Advanced search options                                  │
│  - Suggestions generation                                   │
│  - Tab filtering                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│            Presentation Components                          │
│  - MarketplaceHeader                                        │
│  - AdvancedSearchPanel                                      │
│  - TagFilterPanel                                           │
│  - SearchBar / Autocomplete                                 │
└─────────────────────────────────────────────────────────────┘
```

### 共有コンポーネントとロジック

- **useMarketplaceSearch フック**: 拡張機能とレイアウトの両方で使用
- **MarketplaceHeader コンポーネント**: 統一されたヘッダーUI
- **AdvancedSearchPanel コンポーネント**: 著者フィルターとソート機能
- **tagUtils.ts**: 検索、フィルタリング、ソートのユーティリティ関数

### パフォーマンス最適化

- `useMemo`を使用してフィルタリングとソートを最適化
- 重複する計算を避けるため、依存関係配列を適切に設定
- 大量のアイテムでも効率的に動作するようにロジックを設計

---

## 今後の改善案

1. **検索履歴機能**

   - ユーザーの検索履歴を保存し、再利用できるようにする

2. **フィルターのプリセット**

   - よく使うフィルター設定を保存できる機能

3. **アナリティクス**

   - ユーザーの検索パターンを分析し、人気のあるタグや検索語を表示

4. **パフォーマンスモニタリング**

   - 大量のアイテムでのパフォーマンス測定と最適化

5. **アクセシビリティ改善**
   - キーボードナビゲーションの強化
   - スクリーンリーダー対応の改善

---

## 参考ドキュメント

- [SEARCH_FUNCTIONALITY_SPECIFICATION.md](./SEARCH_FUNCTIONALITY_SPECIFICATION.md)
- [marketplace-japanese-input-fix.md](../troubleshooting/marketplace-japanese-input-fix.md)
- [marketplace-japanese-input-issue.md](../troubleshooting/marketplace-japanese-input-issue.md)

---

## まとめ

今回の実装により、マーケットプレイス機能が大幅に改善されました：

- ✅ UI/UXの一貫性が向上（虫眼鏡アイコンの表示）
- ✅ 検索とフィルタリングのシームレスな統合
- ✅ 拡張機能とレイアウトで統一された高度な検索機能
- ✅ ユーザーフレンドリーなインターフェース

これらの改善により、ユーザーは目的のアイテムをより簡単に見つけられるようになりました。
