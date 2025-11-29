---
title: TextContent における SoraNoImage 導入の変更量削減分析
created: 2025-10-17
updated: 2025-10-17
category: Architecture Review
priority: Medium
---

## 概要

コミット `672d07f22` で TextContent.tsx に `NoImage` コンポーネント（後に `SoraNoImage` にリネーム）を導入した際の実装方法を検証し、変更量をさらに最小限に抑える方法を検討します。

## 現在の実装（コミット 672d07f22 時点）

### TextContent.tsx での変更

```tsx
// 追加されたインポート
import NoImage from "@lichtblick/suite-base/components/shared/NoImage";
import { useState } from "react";

// 新規関数
function MarkdownImage(imgProps: React.ImgHTMLAttributes<HTMLImageElement>): React.ReactElement {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return <NoImage alt={imgProps.alt} showAltText={true} />;
  }

  return (
    <img
      {...imgProps}
      onError={() => {
        setImageError(true);
      }}
    />
  );
}

// components prop に追加
components={{
  a: linkRenderer,
  img: MarkdownImage,  // ← 新規追加
}}
```

### 変更内容の詳細

| 項目             | 変更内容                  |
| ---------------- | ------------------------- |
| インポート追加   | 2行（NoImage + useState） |
| 関数追加         | 21行（MarkdownImage）     |
| components 変更  | 2行（img: MarkdownImage） |
| **合計変更行数** | **25行**                  |

## 問題点と改善案

### 現在の実装の問題

1. **MarkdownImage コンポーネントの肥大化リスク**

   - 画像処理ロジックが TextContent に直接含まれている
   - 将来の拡張が TextContent に影響する

2. **状態管理の分散**

   - 各画像要素ごとに `useState` で状態を持つ
   - 複数画像の場合、複数の状態インスタンスが生成される

3. **ステップ的アプローチの欠如**
   - 抽象化やカスタムフックへの移行が後から必要になる

### 改善策 1: カスタムフックの活用（推奨）

```tsx
// hooks/useMarkdownImage.ts（新規作成）
export function useMarkdownImage() {
  const [imageError, setImageError] = useState(false);
  return { imageError, setImageError };
}

// TextContent.tsx
import { useMarkdownImage } from "@/hooks/useMarkdownImage";
import SoraNoImage from "@lichtblick/suite-base/components/shared/SoraNoImage";

function MarkdownImage(imgProps: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { imageError, setImageError } = useMarkdownImage();
  if (imageError) return <SoraNoImage alt={imgProps.alt} showAltText />;
  return <img {...imgProps} onError={() => setImageError(true)} />;
}
```

**メリット:**

- TextContent への変更を最小化
- 状態管理ロジックの再利用可能
- テストが容易

**変更行数: -3行** → 関数内容は同じだが、ロジックの分離で保守性向上

---

### 改善策 2: ErrorBoundary パターン

```tsx
// 既存の react-markdown の機能を活用
<Markdown
  components={{
    a: linkRenderer,
    img: (imgProps) => (
      <img
        {...imgProps}
        onError={(e) => {
          // 画像の src を削除して CSS でプレースホルダーを表示
          e.currentTarget.style.display = "none";
          // 隣に プレースホルダーを挿入する親ロジック
        }}
      />
    ),
  }}
/>
```

**メリット:**

- MarkdownImage 関数を削除
- useState が不要

**デメリット:**

- DOM 操作に依存
- プレースホルダー表示が複雑

---

### 改善策 3: CSS ベースのフォールバック（最小変更量）

```tsx
// TextContent.tsx
const useStyles = makeStyles()(...);

// styles に追加
img: {
  maxWidth: "100%",
  height: "auto",
  "&:not([src])::after": {
    // content: ""; // CSS ファイルで管理
    display: "block",
    width: "100%",
    height: "200px",
    backgroundColor: theme.palette.action.hover,
  },
}

// 実装
function MarkdownImage(imgProps) {
  return <img {...imgProps} onError={(e) => e.currentTarget.removeAttribute('src')} />;
}
```

**メリット:**

- コンポーネントの肥大化なし
- CSS のみで UI 制御

**デメリット:**

- CSS 擬似要素に依存
- 代替テキスト表示が限定的

---

## 推奨される最小変更実装

**最小限かつ将来の拡張性を考慮した実装:**

```tsx
// TextContent.tsx（最小限の変更）

import { useState, useCallback } from "react";
import SoraNoImage from "@lichtblick/suite-base/components/shared/SoraNoImage";

function MarkdownImage({ alt, onError, ...imgProps }) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return <SoraNoImage alt={alt} showAltText />;
  }

  return (
    <img
      {...imgProps}
      alt={alt}
      onError={(e) => {
        onError?.(e);
        setImageError(true);
      }}
    />
  );
}

// 使用
components={{
  a: linkRenderer,
  img: MarkdownImage,
}}
```

**変更量:**

- インポート: +2 行（useState 追加）
- 関数: +18 行
- components: +1 行
- **合計: 約 20 行** → 現在の 25 行から -5 行削減可能

---

## 過去のリネーム履歴との関連

現在の `SoraNoImage` への命名は、以下の経緯を経ています:

1. **672d07f22** (2025-10-02): `NoImage` コンポーネント新規作成
2. **b1d32fa4a** (後続): パス修正（重複パス bug 修正）
3. **c254058ba** (後続): ブランディング変更 (@lichtblick → @umi)
4. **e614f7da6** (後続): ブランディング戻し (@umi → @lichtblick)
5. **b007ebe68** (最新): `NoImage` → `SoraNoImage` にリネーム

**リネーム背景:**

- マーケットプレイスの大規模リファクタリング
- コンポーネントの命名規則統一（Sora プリフィックス導入）

---

## 関連ドキュメント

- 実装計画: `docs/04_implementation/plans/`
- 設計: `docs/03_design/features/`
- テスト仕様: `docs/05_testing/`

## 次のステップ

1. ✅ 現在の実装の検証完了
2. ⏳ カスタムフック化の検討
3. ⏳ パフォーマンステストの実施
4. ⏳ リファクタリング計画の策定
