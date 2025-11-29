---
title: TextContent - カスタムフック実装の詳細ファイル構成
created: 2025-10-17
updated: 2025-10-17
category: Implementation Plan
priority: High
---

## 📁 推奨ファイル構成

### Option 1: 汎用フック化（推奨）

プロジェクト全体で再利用可能な汎用フックとして実装:

```
packages/suite-base/src/
├── hooks/
│   ├── index.ts                          # 既存（変更あり）
│   ├── useImageError.ts                  # ← 新規作成
│   ├── useImageError.test.ts             # ← テストファイル（任意）
│   ├── markdown/                         # ← 新規ディレクトリ
│   │   └── useMarkdownImage.ts           # ← Markdown 特化版（オプション）
│   └── marketplace/
│       ├── useSoraMarketplaceSearch.ts
│       └── ...
└── components/
    ├── TextContent.tsx                   # 変更あり
    └── ...
```

---

## 🔧 具体的な実装コード

### 1. `hooks/useImageError.ts`（メインフック）

````typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { useCallback, useState } from "react";

/**
 * Configuration options for useImageError hook
 */
export interface UseImageErrorOptions {
  /** Callback when image fails to load */
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  /** Initial error state */
  initialError?: boolean;
}

/**
 * Return value of useImageError hook
 */
export interface UseImageErrorResult {
  /** Whether image has failed to load */
  hasError: boolean;
  /** Error handler for img element */
  handleError: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  /** Manual reset function */
  reset: () => void;
}

/**
 * Custom hook for handling image loading errors
 *
 * @example
 * ```tsx
 * const { hasError, handleError } = useImageError({
 *   onError: (e) => console.log('Image failed:', e),
 * });
 *
 * return (
 *   <>
 *     {hasError ? <NoImagePlaceholder /> : null}
 *     <img src="..." onError={handleError} />
 *   </>
 * );
 * ```
 */
export function useImageError(options?: UseImageErrorOptions): UseImageErrorResult {
  const { onError, initialError = false } = options ?? {};
  const [hasError, setHasError] = useState(initialError);

  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      onError?.(event);
      setHasError(true);
    },
    [onError],
  );

  const reset = useCallback(() => {
    setHasError(false);
  }, []);

  return { hasError, handleError, reset };
}
````

**ファイルサイズ:** ~60行

---

### 2. `hooks/index.ts`（変更）

既存のエクスポートに追加:

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// These are exported from here to avoid circular imports via suite-base/index.

export { useAppConfigurationValue } from "./useAppConfigurationValue";
export { useAppTimeFormat } from "./useAppTimeFormat";
export { useImageError } from "./useImageError"; // ← 新規追加
```

---

### 3. `components/TextContent.tsx`（変更最小化）

現在の実装から以下の変更:

```typescript
import { Link } from "@mui/material";
import { CSSProperties, PropsWithChildren, useCallback, useContext } from "react";  // useState 削除
import Markdown from "react-markdown";
import { PluggableList } from "react-markdown/lib";
import rehypeRaw from "rehype-raw";
import { makeStyles } from "tss-react/mui";

import SoraNoImage from "@lichtblick/suite-base/components/shared/SoraNoImage";
import { useImageError } from "@lichtblick/suite-base/hooks/useImageError";  // ← 新規追加
import LinkHandlerContext from "@lichtblick/suite-base/context/LinkHandlerContext";

// ... useStyles definition ...

type Props = {
  style?: CSSProperties;
  allowMarkdownHtml?: boolean;
};

/**
 * Custom image component with error handling
 * Displays a SoraNoImage placeholder when image fails to load
 */
function MarkdownImage(
  imgProps: React.ImgHTMLAttributes<HTMLImageElement>,
): React.ReactElement {
  const { hasError, handleError } = useImageError();  // ← フック使用

  if (hasError) {
    return <SoraNoImage alt={imgProps.alt} showAltText={true} />;
  }

  return (
    <img
      {...imgProps}
      onError={handleError}  // ← ハンドラ差し替え
    />
  );
}

export default function TextContent(
  props: PropsWithChildren<Props>,
): React.ReactElement | ReactNull {
  // ... 以下変更なし ...
}
```

**変更内容:**

- インポート: `useState` 削除、`useImageError` 追加
- `MarkdownImage` 関数内: `useState` 削除、`useImageError` フック使用に変更

---

## Option 2: Markdown 特化版（高度な構成）

より詳細な制御が必要な場合:

```
packages/suite-base/src/hooks/
├── markdown/
│   ├── index.ts
│   ├── useMarkdownImage.ts          # Markdown 用特化版
│   └── useMarkdownImage.test.ts
```

### `hooks/markdown/useMarkdownImage.ts`

```typescript
import { useImageError } from "../useImageError";

export interface MarkdownImageOptions {
  fallbackComponent?: React.ComponentType<{ alt?: string }>;
  maxRetries?: number;
}

/**
 * Specialized hook for Markdown image rendering
 * Wraps useImageError with Markdown-specific enhancements
 */
export function useMarkdownImage(options?: MarkdownImageOptions) {
  const { fallbackComponent: FallbackComponent, maxRetries = 0 } = options ?? {};
  const { hasError, handleError, reset } = useImageError();

  return {
    hasError,
    handleError,
    reset,
    maxRetries,
    FallbackComponent,
  };
}
```

---

## 📊 ファイル構成の比較

| 項目       | Option 1（推奨）       | Option 2        |
| ---------- | ---------------------- | --------------- |
| ファイル数 | 1 新規 + 1 変更        | 4 新規 + 1 変更 |
| 複雑度     | 低                     | 中              |
| 再利用性   | 汎用（全プロジェクト） | Markdown 特化   |
| テスト対象 | 単純                   | 複雑            |
| 保守性     | 高                     | 中～高          |

---

## ✅ 実装チェックリスト

### Phase 1: フックの追加

- [ ] `hooks/useImageError.ts` を作成
- [ ] `hooks/index.ts` にエクスポート追加
- [ ] TypeScript 型チェック実行

### Phase 2: TextContent.tsx 更新

- [ ] `useState` をインポート削除
- [ ] `useImageError` をインポート追加
- [ ] `MarkdownImage` 関数内の実装更新
- [ ] 動作確認

### Phase 3: テスト

- [ ] TextContent.tsx の既存テスト実行
- [ ] 画像エラーハンドリング動作確認
- [ ] (オプション) `useImageError.test.ts` 追加

### Phase 4: ドキュメント

- [ ] フック API ドキュメント作成
- [ ] 使用例を README に追記

---

## 🎯 推奨実装パス

```
1. hooks/useImageError.ts を作成 (~60行)
   ↓
2. hooks/index.ts を更新 (1行追加)
   ↓
3. TextContent.tsx を更新 (5行変更)
   ↓
4. テスト実行 & 動作確認
   ↓
5. (将来) 他コンポーネントで再利用可能
```

**総変更行数: 約 20行** → 保守性を大幅向上

---

## 📝 関連ドキュメント

- 親タスク: `docs/issues/open/20251017_01_textcontent-soranoimge-refactoring-analysis.md`
- 既存フック例: `packages/suite-base/src/hooks/useCallbackWithToast.ts`
- Marketplace フック: `packages/suite-base/src/hooks/marketplace/useSoraMarketplaceSearch.ts`

---

## 🔍 参考: 既存フック命名規則

プロジェクト内の命名規則:

- **汎用フック**: `use{機能名}.ts` (例: `useImageError.ts`)
- **Sora 特化版**: `useSora{機能名}.ts` (例: `useSoraMarketplaceSearch.ts`)
- **ドメイン別**: `{domain}/use{機能名}.ts` (例: `marketplace/useSoraMarketplaceSearch.ts`)

**推奨**: `useImageError.ts` でシンプルに → 将来の Sora 特化版は `markdown/` ディレクトリで管理
