# 配列のスプレッド演算子による不要なコピー

**発見日**: 2025年10月14日
**発見場所**: `ExtensionMarketplaceSettings.tsx`
**重要度**: 🟢 Low
**ステータス**: ✅ 解決済み (2025年10月14日)

---

## 問題の詳細

### 影響範囲

`packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx`

### 問題のコード

```typescript
// ❌ Before: スプレッド演算子で配列を結合してから処理
const unique = new Map<string, ExtensionData>();
[...installedData, ...hybridMarketplaceData].forEach((ext) => {
  if (!unique.has(ext.id) || ext.installed) {
    unique.set(ext.id, ext);
  }
});

return Array.from(unique.values());
```

### なぜ問題か

1. **不要な配列作成**

   - `[...installedData, ...hybridMarketplaceData]` で新しい配列を作成
   - メモリの無駄な割り当て
   - 結合した配列は一度しか使用されない

2. **パフォーマンスへの影響**

   - 配列の結合: O(n + m)
   - 結合後の処理: O(n + m)
   - 合計: O(2(n + m)) → 2倍のコスト

3. **ロジックの複雑さ**
   - `|| ext.installed` の条件が分かりにくい
   - インストール済み拡張機能を優先する意図が不明確

---

## 解決方法

### 実装内容

配列を結合せず、直接処理するように最適化:

```typescript
// ✅ After: 直接処理（配列コピー不要）
const unique = new Map<string, ExtensionData>();

// インストール済み拡張機能を優先して追加
installedData.forEach((ext) => {
  unique.set(ext.id, ext);
});

// マーケットプレイスデータを追加（既存は上書きしない）
hybridMarketplaceData.forEach((ext) => {
  if (!unique.has(ext.id)) {
    unique.set(ext.id, ext);
  }
});

return Array.from(unique.values());
```

### 改善ポイント

1. **明確な優先順位**

   - インストール済みデータを先に処理
   - マーケットプレイスデータは後から追加（重複は無視）
   - コードの意図が明確

2. **パフォーマンス**

   - 配列結合のコストを削減
   - O(2(n + m)) → O(n + m)
   - メモリ使用量も削減

3. **可読性**
   - 2段階の処理で意図が明確
   - コメントで優先順位を明記

---

## 影響と効果

### パフォーマンス改善

**Before**:

```
installedData (n個) + hybridMarketplaceData (m個)
  ↓
スプレッド演算子で結合 → 新しい配列 (n + m個) を作成
  ↓
forEach で処理 (n + m回)
  ↓
合計コスト: 配列作成 O(n + m) + 処理 O(n + m) = O(2(n + m))
```

**After**:

```
installedData.forEach (n回)
  ↓
hybridMarketplaceData.forEach (m回)
  ↓
合計コスト: O(n + m)
```

### 期待される効果

- ✅ 配列結合のコスト削減
- ✅ メモリ使用量の削減
- ✅ コードの可読性向上
- ✅ 優先順位の明確化

---

## 変更ファイル

- ✅ `packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx`

---

## ベンチマーク（参考）

仮に100個のインストール済み拡張機能と200個のマーケットプレイス拡張機能がある場合:

**Before**:

- 配列結合: 300個の要素をコピー
- forEach処理: 300回の反復
- 合計: 600回の操作

**After**:

- installedData処理: 100回の反復
- hybridMarketplaceData処理: 200回の反復
- 合計: 300回の操作

**改善率**: 約50%のコスト削減

---

## 学んだこと

1. **配列操作の最適化**

   - スプレッド演算子は便利だが、不要なコピーを避ける
   - 一度しか使わない配列は作成しない
   - 直接処理できる場合は直接処理する

2. **意図の明確化**

   - 条件分岐（`|| ext.installed`）よりも処理順序で優先度を表現
   - コメントで意図を明記
   - コードの可読性とパフォーマンスを両立

3. **Map/Setの活用**
   - 重複排除にはMapが適している
   - 順序を保ちながら重複を排除できる
   - 処理順序で優先度を制御できる

---

## 類似パターンの検索

他の箇所でも同様のパターンがないか確認する:

```bash
# スプレッド演算子による配列結合を検索
grep -r "\[\.\.\..*,\s*\.\.\..*\]" packages/suite-base/src/
```

---

## 次のアクション

- [ ] 他のコンポーネントで同様のパターンがないか確認
- [ ] パフォーマンステストで効果を実測（大量データでのベンチマーク）
- [ ] コードレビューで類似パターンを指摘

---

**解決日**: 2025年10月14日
**解決者**: GitHub Copilot
**関連作業ログ**: [20251014_03_marketplace-code-quality-improvements.md](../../../08_worklogs/2025_10/20251014/20251014_03_marketplace-code-quality-improvements.md)
