# Lichtblick プロジェクト - 主要ライブラリ使用方法ドキュメント

## 概要
Lichtblickは、ロボティクスのための統合可視化・診断ツールで、ブラウザやデスクトップアプリ（Linux、Windows、macOS）で利用可能です。このドキュメントでは、プロジェクトで使用されている主要なライブラリとその使用方法について解説します。

## 主要ライブラリ

### 1. React & React-DOM
**バージョン**: 18.3.12
**役割**: UIコンポーネント開発のためのメインフレームワーク

#### 使用方法
- **プロジェクト内での使用**: すべてのUIコンポーネントがReactで構築されている
- **主要な実装パターン**:
  - 関数コンポーネントとHooksの使用
  - コンテキストプロバイダーパターン
  - 状態管理とライフサイクル管理

```typescript
// 例: packages/suite-base/src/Workspace.tsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
```

### 2. Material-UI (@mui/material)
**バージョン**: 5.13.5
**役割**: UIコンポーネントライブラリ

#### 使用方法
- **プロジェクト内での使用**: ボタン、フォーム、メニュー、ダイアログなどのUI要素
- **実装例**:
  - アプリバー、ツールバー、サイドバー
  - パネル設定やダイアログ
  - カスタムテーマによる一貫したデザイン

```typescript
// 例: packages/suite-base/src/components/AppBar/index.tsx
import { Avatar, IconButton, Tooltip } from "@mui/material";

// カスタムテーマの実装
// packages/suite-base/src/theme/ThemeProvider.tsx
import { ThemeProvider as MuiThemeProvider } from "@mui/material";
import { createMuiTheme } from "@lichtblick/theme";
```

### 3. TypeScript
**バージョン**: 5.3.3
**役割**: 型安全な開発環境の提供

#### 使用方法
- **プロジェクト内での使用**: すべてのコードがTypeScriptで記述
- **設定ファイル**:
  - `tsconfig.json` - メインの設定
  - `tsconfig.eslint.json` - ESLint用の設定
- **型定義**: `packages/@types/`ディレクトリに独自の型定義を配置

### 4. Electron
**バージョン**: 36.3.2
**役割**: デスクトップアプリケーション開発

#### 使用方法
- **プロジェクト内での使用**: デスクトップ版のLichtblickアプリケーション
- **実装場所**: `packages/suite-desktop/`
- **主要な機能**:
  - メインプロセス (`src/main/index.ts`)
  - プリロードスクリプト (`src/preload/index.ts`)
  - ファイル操作とネイティブ機能への橋渡し

```typescript
// 例: packages/suite-desktop/src/main/index.ts
import { app, BrowserWindow, ipcMain, Menu, nativeTheme, session } from "electron";
```

### 5. Webpack
**バージョン**: 5.99.9
**役割**: バンドラーとしてフロントエンドリソースのビルド

#### 使用方法
- **プロジェクト内での使用**: Web版とDesktop版の両方のビルド
- **設定ファイル**:
  - `web/webpack.config.ts` - Web版
  - `desktop/webpack.config.ts` - Desktop版
  - `benchmark/webpack.config.ts` - ベンチマーク用
- **主要な機能**:
  - TypeScript変換
  - Hot Module Replacement (HMR)
  - コードスプリット

### 6. Jest
**バージョン**: 29.7.0
**役割**: ユニットテストフレームワーク

#### 使用方法
- **プロジェクト内での使用**: コンポーネントとロジックのテスト
- **設定ファイル**: `jest.config.json`
- **テストパターン**:
  - `*.test.ts` - ユニットテスト
  - `*.test.tsx` - Reactコンポーネントのテスト
  - `@testing-library/react` との組み合わせ

```typescript
// 例: packages/suite-base/src/App.test.tsx
import { render, screen } from "@testing-library/react";
import React from "react";
```

### 7. Playwright
**バージョン**: 1.52.0
**役割**: E2Eテストフレームワーク

#### 使用方法
- **プロジェクト内での使用**: ブラウザ自動化とE2Eテスト
- **テストディレクトリ**: `e2e/tests/`
- **対象**:
  - Web版のテスト (`e2e/tests/web/`)
  - Desktop版のテスト (`e2e/tests/desktop/`)

```typescript
// 例: e2e/tests/web/open-files/open-mcap-via-url.web.spec.ts
import { test, expect } from "@playwright/test";
```

### 8. Storybook
**バージョン**: 8.6.14
**役割**: UIコンポーネントの開発・文書化環境

#### 使用方法
- **プロジェクト内での使用**: コンポーネントの独立した開発とテスト
- **設定ディレクトリ**: `.storybook/`
- **ストーリーファイル**: `*.stories.tsx`
- **機能**:
  - コンポーネントのビジュアルテスト
  - インタラクションテスト
  - アクセシビリティテスト

```typescript
// 例: packages/suite-base/src/panels/RawMessages/index.stories.tsx
import { StoryObj } from "@storybook/react";
```

### 9. ESLint & Prettier
**バージョン**: ESLint 8.57, Prettier 3.3.2
**役割**: コード品質と一貫性の維持

#### 使用方法
- **プロジェクト内での使用**: コードの自動フォーマットと品質チェック
- **設定ファイル**:
  - `.eslintrc.yaml` - 開発用
  - `.eslintrc.ci.yaml` - CI用
  - `.prettierrc.yaml` - フォーマット設定
- **カスタムルール**: `@lichtblick/eslint-plugin-suite`

### 10. React DnD & React Mosaic
**役割**: ドラッグ&ドロップ機能とパネルレイアウト管理

#### 使用方法
- **React DnD**: パネルの移動、ツールバータブの並び替え
- **React Mosaic**: パネルの分割レイアウト管理
- **実装例**:
  - パネルカタログからのパネル追加
  - パネルの分割・結合
  - タブの並び替え

```typescript
// 例: packages/suite-base/src/components/PanelLayout.tsx
import { useDrop } from "react-dnd";
import { Mosaic, MosaicNode, MosaicWindow } from "react-mosaic-component";
```

### 11. React i18next
**役割**: 国際化（i18n）対応

#### 使用方法
- **プロジェクト内での使用**: 多言語対応のためのテキスト管理
- **主要フック**: `useTranslation()`
- **実装パターン**:
  - 翻訳キーによるテキスト管理
  - 動的言語切り替え
  - 複数形・文脈対応

```typescript
// 例: packages/suite-base/src/Workspace.tsx
import { useTranslation } from "react-i18next";
import { Trans, useTranslation } from "react-i18next";
```

### 12. TSS-React (TypeScript Style System)
**役割**: Material-UIとTypeScriptでの型安全なスタイリング

#### 使用方法
- **プロジェクト内での使用**: コンポーネントのスタイル定義
- **主要API**: `makeStyles()`
- **利点**:
  - TypeScript完全対応
  - Material-UIテーマとの統合
  - パフォーマンス最適化

```typescript
// 例: packages/suite-base/src/components/AppBar/index.tsx
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles<{ debugDragRegion?: boolean }, "avatar">()((
  theme,
  { debugDragRegion = false },
  classes
) => ({
  // スタイル定義
}));
```

## 開発ワークフロー

### 開発環境起動
```bash
# Web版の開発
yarn web:serve

# Desktop版の開発
yarn desktop:serve
yarn desktop:start

# Storybook
yarn storybook
```

### テスト実行
```bash
# ユニットテスト
yarn test

# E2Eテスト
yarn test:e2e:web
yarn test:e2e:desktop
```

### ビルド
```bash
# Web版ビルド
yarn web:build:prod

# Desktop版ビルド
yarn desktop:build:prod
yarn package:linux
yarn package:win
yarn package:darwin
```

## まとめ

Lichtblickプロジェクトは、これらの主要ライブラリを組み合わせて：

1. **React + Material-UI + TSS-React** - 型安全で一貫したUI開発
2. **Electron** - クロスプラットフォーム対応のデスクトップアプリ
3. **Webpack** - 効率的なビルドシステム
4. **Jest + Playwright** - 包括的なテスト環境
5. **Storybook** - コンポーネント開発の効率化
6. **React DnD + Mosaic** - 柔軟なパネルレイアウト
7. **i18next** - 多言語対応

これらのライブラリの組み合わせにより、スケーラブルで保守性の高いロボティクス可視化ツールが実現されています。
