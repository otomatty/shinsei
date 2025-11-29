# CSS-in-JS基礎知識 🎨

## 📋 概要

このドキュメントでは、CSS-in-JSの基本概念と、なぜ当プロジェクトで`tss-react/mui`を採用しているのかを説明します。

## 🎯 なぜCSS-in-JSが必要なのか？

### 1. 従来のCSSの問題点

```css
/* ❌ 従来のCSS */
.button {
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
}

.button:hover {
  background-color: #0056b3;
}

.button.primary {
  background-color: #28a745;
}

.button.primary:hover {
  background-color: #1e7e34;
}
```

**従来のCSSの問題点**

1. **グローバルスコープ**: すべてのスタイルがグローバルに影響
2. **命名の衝突**: 同じクラス名が複数箇所で定義される危険性
3. **未使用コードの蓄積**: 削除されたコンポーネントのスタイルが残る
4. **動的スタイリング困難**: JavaScriptの値に基づくスタイル変更が複雑

### 2. CSS-in-JSの利点

```typescript
// ✅ CSS-in-JS
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles()((theme) => ({
  button: {
    padding: theme.spacing(1.5, 3),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    border: "none",
    borderRadius: theme.shape.borderRadius,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
  },
  primaryButton: {
    backgroundColor: theme.palette.success.main,
    "&:hover": {
      backgroundColor: theme.palette.success.dark,
    },
  },
}));

function MyButton({ variant, children }: ButtonProps) {
  const { classes, cx } = useStyles();

  return (
    <button
      className={cx(classes.button, {
        [classes.primaryButton]: variant === "primary",
      })}
    >
      {children}
    </button>
  );
}
```

**CSS-in-JSの利点**

1. **コンポーネントスコープ**: スタイルが自動的に特定のコンポーネントに限定
2. **動的スタイリング**: JavaScriptの値に基づいてスタイルを変更可能
3. **型安全性**: TypeScriptと連携してスタイルの型チェック
4. **自動削除**: 未使用のスタイルが自動的に削除される

## 🏗️ tss-react/muiを選ぶ理由

### 1. Material-UIとの統合

```typescript
// ✅ Material-UIのテーマシステムと完全統合
const useStyles = makeStyles()((theme) => ({
  container: {
    // テーマの値を直接使用
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderRadius: theme.shape.borderRadius,

    // レスポンシブ対応
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
    },
  },
  title: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.fontWeightBold,
    marginBottom: theme.spacing(2),
  },
}));
```

### 2. パフォーマンス最適化

```typescript
// ✅ 効率的なスタイル生成
const useStyles = makeStyles()((theme) => ({
  // スタイルはコンポーネントの外で生成され、再利用される
  button: {
    padding: theme.spacing(1, 2),
    // 条件付きスタイルも効率的に処理
    backgroundColor: theme.palette.primary.main,
  },
}));

function MyComponent() {
  const { classes } = useStyles();

  // クラス名の生成は最適化されている
  return <button className={classes.button}>Click me</button>;
}
```

### 3. 開発者体験

```typescript
// ✅ 優れた開発者体験
const useStyles = makeStyles<{ isActive: boolean }>()((theme, { isActive }) => ({
  button: {
    padding: theme.spacing(1, 2),
    backgroundColor: isActive
      ? theme.palette.primary.main
      : theme.palette.grey[300],
    color: isActive
      ? theme.palette.primary.contrastText
      : theme.palette.text.secondary,

    // ホバー状態も簡単に定義
    "&:hover": {
      backgroundColor: isActive
        ? theme.palette.primary.dark
        : theme.palette.grey[400],
    },
  },
}));

function ToggleButton({ isActive, onClick }: Props) {
  const { classes } = useStyles({ isActive });

  return (
    <button className={classes.button} onClick={onClick}>
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
```

## 🚫 避けるべきスタイリング手法

### 1. sxプロパティの問題点

```typescript
// ❌ sxプロパティは避ける
import { Box } from "@mui/material";

function BadExample() {
  return (
    <Box
      sx={{
        padding: 2,
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        '&:hover': {
          backgroundColor: 'primary.dark',
        },
      }}
    >
      Content
    </Box>
  );
}
```

**sxプロパティの問題点**

1. **パフォーマンス**: 毎回新しいスタイルオブジェクトが生成される
2. **再利用性**: 同じスタイルを他のコンポーネントで再利用困難
3. **保守性**: インラインスタイルのため、管理が難しい
4. **型安全性**: 文字列ベースのため、型チェックが効きにくい

### 2. @emotion/styledの問題点

```typescript
// ❌ @emotion/styledは避ける
import styled from "@emotion/styled";

const StyledButton = styled.button`
  padding: 12px 24px;
  background-color: ${({ theme }) => theme.palette.primary.main};
  color: ${({ theme }) => theme.palette.primary.contrastText};

  &:hover {
    background-color: ${({ theme }) => theme.palette.primary.dark};
  }
`;
```

**@emotion/styledの問題点**

1. **文字列テンプレート**: 型安全性に欠ける
2. **パフォーマンス**: 実行時のスタイル生成によるオーバーヘッド
3. **Material-UIとの統合**: テーマシステムの統合が不完全
4. **開発者体験**: IDE支援が限定的

### 3. @mui/material/styledの問題点

```typescript
// ❌ @mui/materialのstyledも避ける
import { styled } from "@mui/material/styles";

const StyledComponent = styled("div")(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
}));
```

**@mui/material/styledの問題点**

1. **一貫性**: プロジェクト内でのスタイリング手法が統一されない
2. **学習コスト**: 複数のAPIを覚える必要がある
3. **保守性**: 異なるスタイリング手法が混在する

## 🎯 tss-react/muiのベストプラクティス

### 1. 効率的なスタイル定義

```typescript
// ✅ 効率的なスタイル定義
const useStyles = makeStyles()((theme) => ({
  // 基本スタイル
  root: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
  },

  // 修飾子は別のクラスとして定義
  elevated: {
    boxShadow: theme.shadows[2],
  },

  // 状態に応じたスタイル
  disabled: {
    opacity: 0.6,
    pointerEvents: "none",
  },

  // レスポンシブ対応
  responsive: {
    [theme.breakpoints.up("md")]: {
      padding: theme.spacing(3),
    },
  },
}));
```

### 2. 条件付きスタイル

```typescript
// ✅ 条件付きスタイルの適用
function MyComponent({ variant, disabled, elevated }: Props) {
  const { classes, cx } = useStyles();

  return (
    <div
      className={cx(
        classes.root,
        classes.responsive,
        {
          [classes.elevated]: elevated,
          [classes.disabled]: disabled,
        }
      )}
    >
      Content
    </div>
  );
}
```

### 3. 動的スタイル

```typescript
// ✅ 動的スタイルの実装
const useStyles = makeStyles<{
  color: string;
  size: "small" | "medium" | "large"
}>()((theme, { color, size }) => ({
  button: {
    backgroundColor: color,
    color: theme.palette.getContrastText(color),
    padding: theme.spacing(
      size === "small" ? 0.5 : size === "medium" ? 1 : 1.5,
      size === "small" ? 1 : size === "medium" ? 2 : 3
    ),
    fontSize:
      size === "small" ? theme.typography.caption.fontSize :
      size === "medium" ? theme.typography.body1.fontSize :
      theme.typography.h6.fontSize,
  },
}));

function DynamicButton({ color, size, children }: Props) {
  const { classes } = useStyles({ color, size });

  return (
    <button className={classes.button}>
      {children}
    </button>
  );
}
```

## 🔧 実践的な例

### 1. 複雑なレイアウト

```typescript
// ✅ 複雑なレイアウトの実装
const useStyles = makeStyles()((theme) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.default,
    minHeight: "100vh",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing(2),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderRadius: theme.shape.borderRadius,
  },

  content: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: theme.spacing(2),
  },

  card: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],

    "&:hover": {
      boxShadow: theme.shadows[3],
      transform: "translateY(-2px)",
    },

    transition: theme.transitions.create(["box-shadow", "transform"], {
      duration: theme.transitions.duration.short,
    }),
  },
}));

function Dashboard() {
  const { classes } = useStyles();

  return (
    <div className={classes.container}>
      <header className={classes.header}>
        <h1>Dashboard</h1>
        <button>Settings</button>
      </header>

      <main className={classes.content}>
        <div className={classes.card}>Card 1</div>
        <div className={classes.card}>Card 2</div>
        <div className={classes.card}>Card 3</div>
      </main>
    </div>
  );
}
```

### 2. テーマ対応

```typescript
// ✅ ダークモード対応
const useStyles = makeStyles()((theme) => ({
  root: {
    backgroundColor:
      theme.palette.mode === "dark" ? theme.palette.grey[900] : theme.palette.grey[50],
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,

    // カスタムカラー
    "& .highlight": {
      backgroundColor:
        theme.palette.mode === "dark" ? theme.palette.warning.dark : theme.palette.warning.light,
    },
  },
}));
```

## 🔍 パフォーマンスの考慮点

### 1. スタイルの再利用

```typescript
// ✅ スタイルの再利用
const useCommonStyles = makeStyles()((theme) => ({
  card: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
  },

  button: {
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    border: "none",
    borderRadius: theme.shape.borderRadius,
    cursor: "pointer",
  },
}));

// 複数のコンポーネントで再利用
function ComponentA() {
  const { classes } = useCommonStyles();
  return <div className={classes.card}>Content A</div>;
}

function ComponentB() {
  const { classes } = useCommonStyles();
  return <div className={classes.card}>Content B</div>;
}
```

### 2. 条件付きスタイルの最適化

```typescript
// ✅ 効率的な条件付きスタイル
const useStyles = makeStyles<{ variant: "primary" | "secondary" }>()((theme, { variant }) => ({
  button: {
    padding: theme.spacing(1, 2),
    border: "none",
    borderRadius: theme.shape.borderRadius,
    cursor: "pointer",

    // 条件付きスタイルをオブジェクトで定義
    ...(variant === "primary" && {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      "&:hover": {
        backgroundColor: theme.palette.primary.dark,
      },
    }),

    ...(variant === "secondary" && {
      backgroundColor: theme.palette.secondary.main,
      color: theme.palette.secondary.contrastText,
      "&:hover": {
        backgroundColor: theme.palette.secondary.dark,
      },
    }),
  },
}));
```

## 🎛️ 開発ツールとの連携

### 1. TypeScriptとの統合

```typescript
// ✅ 型安全なスタイル定義
interface StyleProps {
  color: string;
  isActive: boolean;
  size: "small" | "medium" | "large";
}

const useStyles = makeStyles<StyleProps>()((theme, { color, isActive, size }) => ({
  button: {
    backgroundColor: color,
    opacity: isActive ? 1 : 0.6,
    fontSize:
      size === "small" ? theme.typography.caption.fontSize :
      size === "medium" ? theme.typography.body1.fontSize :
      theme.typography.h6.fontSize,
  },
}));

// 使用時に型チェックが効く
function StyledButton(props: ButtonProps) {
  const { classes } = useStyles({
    color: props.color, // 型チェック
    isActive: props.isActive, // 型チェック
    size: props.size, // "small" | "medium" | "large"
  });

  return <button className={classes.button}>{props.children}</button>;
}
```

### 2. IDE支援

```typescript
// ✅ IDE支援を活用
const useStyles = makeStyles()((theme) => ({
  container: {
    // 自動補完とエラーチェック
    padding: theme.spacing(2), // ✅ 正しい
    // padding: theme.spacing("invalid"), // ❌ 型エラー

    // CSSプロパティの自動補完
    display: "flex", // ✅ 自動補完
    flexDirection: "column", // ✅ 自動補完

    // 疑似クラス・疑似要素の自動補完
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },

    "& .child": {
      marginTop: theme.spacing(1),
    },
  },
}));
```

## 📚 まとめ

`tss-react/mui`を使用することで、以下の恩恵を受けられます：

1. **パフォーマンス**: 最適化されたスタイル生成とキャッシュ
2. **保守性**: コンポーネントスコープによる安全なスタイル管理
3. **開発効率**: Material-UIテーマシステムとの完全統合
4. **型安全性**: TypeScriptによる型チェック

**重要なポイント**:

- `sx`プロパティや`@emotion/styled`は避ける
- `makeStyles`を使用してスタイルを定義
- テーマシステムを活用して一貫性を保つ
- 条件付きスタイルは効率的に実装する

これらの原則を守ることで、高性能で保守性の高いスタイリングシステムを構築できます！
