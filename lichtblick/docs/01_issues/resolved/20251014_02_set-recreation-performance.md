# Set操作の無駄な再作成によるパフォーマンス問題

**発見日**: 2025年10月14日
**発見場所**: `LayoutMarketplaceSettings.tsx`
**重要度**: 🟡 Medium
**ステータス**: ✅ 解決済み (2025年10月14日)

---

## 問題の詳細

### 影響範囲

`packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`

### 問題のコード

```typescript
// ❌ Before: 毎回新しいSetを作成
setInstallingIds((prev) => new Set(prev).add(layout.id));

// ... later
setInstallingIds((prev) => {
  const next = new Set(prev);
  next.delete(layout.id);
  return next;
});
```

### なぜ問題か

1. **不要なメモリ割り当て**

   - 既に含まれているIDを追加する際も新しいSetを作成
   - 含まれていないIDを削除する際も新しいSetを作成
   - Reactの不変性は保つ必要があるが、無駄な再作成は避けられる

2. **パフォーマンスへの影響**

   - Set全体のコピー（O(n)）が不要なケースで発生
   - 不要な再レンダリングを引き起こす可能性

3. **ベストプラクティス違反**
   - 状態更新前に変更の必要性をチェックすべき
   - 変更がない場合は同じオブジェクトを返すべき

---

## 解決方法

### 実装内容

変更が必要な場合のみSetを作成するように最適化:

```typescript
// ✅ After: 変更が必要な場合のみSetを作成
setInstallingIds((prev) => {
  // 既に含まれている場合は何もしない
  if (prev.has(layout.id)) {
    return prev;
  }
  const next = new Set(prev);
  next.add(layout.id);
  return next;
});

// ... later
setInstallingIds((prev) => {
  // 含まれていない場合は何もしない
  if (!prev.has(layout.id)) {
    return prev;
  }
  const next = new Set(prev);
  next.delete(layout.id);
  return next;
});
```

### 修正箇所

1. **handleInstall()** - レイアウトインストール処理
2. **handleUninstall()** - レイアウトアンインストール処理
3. **handlePreview()** - レイアウトプレビュー処理

各処理で以下の2箇所を修正:

- 処理開始時のID追加
- 処理完了時のID削除

---

## 影響と効果

### パフォーマンス改善

**Before**:

```
ユーザーアクション
  ↓
Set全体をコピー (O(n)) ← 無条件に実行
  ↓
IDを追加/削除
  ↓
新しいSetを返す
  ↓
再レンダリング
```

**After**:

```
ユーザーアクション
  ↓
変更が必要かチェック (O(1))
  ↓
変更不要 → 既存のSetを返す (早期リターン)
変更必要 → Set全体をコピー (O(n))
  ↓
IDを追加/削除
  ↓
新しいSetを返す
  ↓
再レンダリング（変更があった場合のみ）
```

### 期待される効果

- ✅ 不要なメモリ割り当ての削減
- ✅ 不要な再レンダリングの防止
- ✅ コードの意図が明確に（変更の必要性を明示的にチェック）

---

## 変更ファイル

- ✅ `packages/suite-base/src/components/LayoutMarketplaceSettings.tsx`

---

## 追加検討事項

分析レポートでは、さらなる最適化として以下も提案されています（今回は未実装）:

### Record<string, boolean>への変更

小規模なSetの場合、Recordを使う方が効率的な可能性:

```typescript
// Setの代わりにRecordを使用
const [installingIds, setInstallingIds] = useState<Record<string, boolean>>({});

// 追加
setInstallingIds((prev) => ({ ...prev, [layout.id]: true }));

// 削除
setInstallingIds((prev) => {
  const { [layout.id]: _, ...rest } = prev;
  return rest;
});

// チェック
const isInstalling = installingIds[layout.id] === true;
```

**検討が必要な理由**:

- Setの要素数が少ない（< 10個程度）場合、Recordの方が高速な可能性
- スプレッド演算子によるコピーコストとSetコピーコストの比較が必要
- ベンチマークテストで実測すべき

---

## 学んだこと

1. **Reactの状態更新パターン**

   - 状態更新前に変更の必要性をチェックする
   - 変更がない場合は同じオブジェクトを返す
   - これにより不要な再レンダリングを防止

2. **パフォーマンス最適化の基本**

   - 推測ではなく計測に基づいて最適化
   - 小さな改善でも積み重ねが重要
   - コードの可読性とのバランスを取る

3. **Setの操作コスト**
   - `new Set(prev)` はO(n)のコスト
   - `prev.has(id)` はO(1)のコスト
   - 事前チェックで無駄なコピーを避ける

---

## 次のアクション

- [ ] 同様のパターンが他のコンポーネントにないか確認
- [ ] パフォーマンステストで効果を実測
- [ ] Record vs Set のベンチマーク実施（必要に応じて）

---

**解決日**: 2025年10月14日
**解決者**: GitHub Copilot
**関連作業ログ**: [20251014_03_marketplace-code-quality-improvements.md](../../../08_worklogs/2025_10/20251014/20251014_03_marketplace-code-quality-improvements.md)
