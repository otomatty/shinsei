# Coding Standards - suite-base

## 📋 概要

このドキュメントでは、`@lichtblick/suite-base`パッケージの開発で遵守すべきコーディング規約を説明します。

## 🛠️ 開発ツール

### 必須ツール

- **TypeScript**: 型安全性を確保
- **ESLint**: コード品質とスタイルの統一
- **Prettier**: コードフォーマッティング
- **Jest**: テスティングフレームワーク

### 設定ファイル

- `.eslintrc.yaml` - ESLint設定
- `.prettierrc.yaml` - Prettier設定
- `tsconfig.json` - TypeScript設定

## 📏 コードフォーマッティング

### Prettier設定

```yaml
# .prettierrc.yaml
printWidth: 100
```

### 基本的なフォーマット規則

```typescript
// ✅ 良い例
const longVariableName = someFunction(
  parameter1,
  parameter2,
  parameter3,
  parameter4,
);

// ❌ 悪い例 - 100文字を超える
const longVariableName = someFunction(parameter1, parameter2, parameter3, parameter4, parameter5, parameter6);
```

### 自動フォーマッティング

```bash
# 手動でフォーマッティング実行
yarn lint

# VS Codeの設定でsave時に自動フォーマット
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## 🎯 TypeScript規約

### 型定義

```typescript
// ✅ 良い例 - interface を優先使用
interface UserData {
  id: string;
  name: string;
  email?: string;
}

// ✅ 良い例 - 明示的な型注釈（推論より安全）
const userId: string = "user-123";

// ❌ 悪い例 - any 型の使用は禁止
const userData: any = getUserData();

// ❌ 悪い例 - null の使用は避ける
const user: User | null = null; // undefined を使用する
```

### アクセス修飾子

```typescript
// ✅ 良い例 - 明示的なアクセス修飾子
class ComponentManager {
  public readonly id: string;
  private readonly _internalState: StateType;
  protected config: ConfigType;

  public constructor(id: string) {
    this.id = id;
  }

  private _initialize(): void {
    // 実装
  }
}
```

### 型推論の活用

```typescript
// ✅ 良い例 - 型推論を活用しつつ、必要な場所では明示
const handleClick = useCallback((event: MouseEvent) => {
  // event の型は明示が必要
  console.log(event.target);
}, []);

// ✅ 良い例 - 戻り値の型は推論に任せる
function createUser(name: string, email: string) {
  return { id: generateId(), name, email };
}
```

## ⚛️ React コンポーネント規約

### 関数型コンポーネント（必須）

```typescript
// ✅ 良い例 - 関数型コンポーネント
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

function MyComponent({ title, onSubmit }: Props): React.JSX.Element {
  return <div>{title}</div>;
}

// ❌ 悪い例 - クラスコンポーネント（使用禁止）
class MyComponent extends React.Component<Props> {
  render() {
    return <div>{this.props.title}</div>;
  }
}
```

### JSX規約

```typescript
// ✅ 良い例 - 不要な波括弧を使わない
<MyComponent title="Hello" isActive />

// ❌ 悪い例 - 不要な波括弧
<MyComponent title={"Hello"} isActive={true} />

// ✅ 良い例 - Fragmentの使用
<>
  <Header />
  <Content />
</>

// ❌ 悪い例 - 不要なdiv
<div>
  <Header />
  <Content />
</div>
```

### フック使用規約

```typescript
// ✅ 良い例 - exhaustive-deps を遵守
useEffect(() => {
  fetchData(userId);
}, [userId, fetchData]); // すべての依存関係を明記

// ✅ 良い例 - useCallback の適切な使用
const handleSubmit = useCallback((data: FormData) => {
  onSubmit(data);
}, [onSubmit]);

// ❌ 悪い例 - useEffectOnce は使用禁止
useEffectOnce(() => { // ESLintエラー
  fetchData();
});
```

## 🎨 スタイリング規約

### tss-react/mui の使用（推奨）

```typescript
// ✅ 良い例 - tss-react/mui を使用
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles()((theme) => ({
  container: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
  },
  title: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.fontWeightBold,
  },
}));

function MyComponent() {
  const { classes } = useStyles();
  return <div className={classes.container}>Content</div>;
}
```

### 禁止されるスタイリング方法

```typescript
// ❌ 悪い例 - sx プロパティ（パフォーマンス問題）
<Box sx={{ padding: 2, backgroundColor: 'white' }}>
  Content
</Box>

// ❌ 悪い例 - @emotion/styled
import styled from "@emotion/styled";
const StyledDiv = styled.div`
  padding: 16px;
`;

// ❌ 悪い例 - @mui/material の styled
import { styled } from "@mui/material/styles";
const StyledComponent = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
}));

// ❌ 悪い例 - Box コンポーネント
import { Box } from "@mui/material";
<Box p={2}>Content</Box>
```

## 🚫 禁止事項

### コンソール出力

```typescript
// ✅ 許可されるコンソール出力
console.warn("警告メッセージ");
console.error("エラーメッセージ");
console.debug("デバッグ情報");
console.assert(condition, "アサーション失敗");

// ❌ 禁止されるコンソール出力
console.log("情報メッセージ"); // ESLintエラー
console.info("情報メッセージ"); // ESLintエラー
```

### Promise.race の使用

```typescript
// ❌ 悪い例 - Promise.race は禁止
const result = await Promise.race([promise1, promise2]);

// ✅ 良い例 - @lichtblick/den/async を使用
import { race } from "@lichtblick/den/async";
const result = await race([promise1, promise2]);
```

### null の使用

```typescript
// ❌ 悪い例 - null の使用は避ける
const user: User | null = getUser();

// ✅ 良い例 - undefined を使用
const user: User | undefined = getUser();

// ✅ 例外 - React refs/components では ReactNull を使用
import { ReactNull } from "@lichtblick/suite-base/types";
const ref = useRef<HTMLDivElement | ReactNull>(ReactNull);
```

### TODO/FIXME コメント

```typescript
// ❌ 悪い例 - TODO コメント（ESLintエラー）
// TODO: この部分を後で修正する

// ❌ 悪い例 - FIXME コメント（ESLintエラー）
// FIXME: バグがある

// ✅ 良い例 - 具体的な GitHub Issue に言及
// See: https://github.com/lichtblick-suite/lichtblick/issues/123
// 実装方針を明確にしてから対応
```

## 🔒 アクセス制御

### プライベートメンバー

```typescript
// ✅ 良い例 - プライベートメンバーのネーミング
class ComponentManager {
  private readonly _privateField: string;
  private _privateMethod(): void {}

  // public メソッドは _ を付けない
  public publicMethod(): void {}
}

// ✅ 良い例 - # private fields（推奨）
class ModernComponent {
  #privateField: string;
  #privateMethod(): void {}
}
```

### getter/setter の禁止

```typescript
// ❌ 悪い例 - getter/setter は禁止
class BadExample {
  get value(): string {
    return this._value;
  }

  set value(val: string) {
    this._value = val;
  }
}

// ✅ 良い例 - 関数として実装
class GoodExample {
  getValue(): string {
    return this._value;
  }

  setValue(val: string): void {
    this._value = val;
  }
}
```

## 📁 ファイル・ディレクトリ命名規則

### ファイル命名

```
# コンポーネントファイル
MyComponent.tsx
MyComponent.test.tsx
MyComponent.stories.tsx
MyComponent.style.ts

# フック
useMyHook.ts
useMyHook.test.ts

# ユーティリティ
myUtility.ts
myUtility.test.ts

# 型定義
types.ts
```

### ディレクトリ配置

```
src/
├── components/
│   ├── MyComponent/
│   │   ├── index.tsx          # メインコンポーネント
│   │   ├── types.ts           # 型定義
│   │   ├── MyComponent.test.tsx
│   │   └── MyComponent.stories.tsx
│   └── AnotherComponent.tsx    # 単一ファイルコンポーネント
├── hooks/
│   └── useMyHook.ts
├── services/
│   └── myService.ts
└── types/
    └── index.ts
```

## 🧪 テスト規約

### テストファイル命名

```typescript
// ✅ 良い例 - describe と it の使用
describe("MyComponent", () => {
  it("should render correctly", () => {
    // テスト実装
  });

  it("should handle click events", () => {
    // テスト実装
  });
});

// ✅ 良い例 - カスタムアサーション関数
expect.extend({
  toBeRendered() {
    // カスタムマッチャー
  }
});
```

### テストの配置

```typescript
// ✅ 良い例 - コンポーネントと同じディレクトリ
src/components/MyComponent/
├── index.tsx
├── MyComponent.test.tsx
└── types.ts

// ✅ 良い例 - ユーティリティのテスト
src/utils/
├── myUtility.ts
└── myUtility.test.ts
```

## 📦 インポート規約

### インポート順序

```typescript
// 1. Node.js 標準ライブラリ
import { readFile } from "fs/promises";

// 2. 外部ライブラリ
import React from "react";
import { Button } from "@mui/material";

// 3. 内部ライブラリ（@lichtblick）
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks";

// 4. 相対インポート
import { MyComponent } from "./MyComponent";
import type { Props } from "./types";
```

### 絶対パス vs 相対パス

```typescript
// ✅ 良い例 - @lichtblick/suite-base からの絶対パス
import { Panel } from "@lichtblick/suite-base/components/Panel";

// ✅ 良い例 - 同一ディレクトリ内の相対パス
import { helper } from "./helper";

// ❌ 悪い例 - 長い相対パス
import { Panel } from "../../../components/Panel";
```

## 🔍 コード品質チェック

### 事前コミットフック

```bash
# コミット前に自動実行される
yarn lint           # ESLint + 自動修正
yarn test           # テスト実行
yarn tsc --noEmit   # 型チェック
```

### CI/CD チェック

```bash
# CI環境での厳格チェック
yarn lint:ci                # 修正なしでのリント
yarn test:coverage          # カバレッジ付きテスト
yarn lint:dependencies     # 依存関係チェック
yarn lint:unused-exports   # 未使用エクスポート確認
```

## 🎯 パフォーマンス規約

### React最適化

```typescript
// ✅ 良い例 - React.memo の適切な使用
const MyComponent = React.memo(({ title, onClick }: Props) => {
  return <button onClick={onClick}>{title}</button>;
});

// ✅ 良い例 - useMemo の適切な使用
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// ❌ 悪い例 - 不要な再レンダリング
function ParentComponent() {
  const handleClick = () => {}; // 毎回新しい関数が作成される
  return <ChildComponent onClick={handleClick} />;
}
```

### バンドルサイズ最適化

```typescript
// ✅ 良い例 - 名前付きインポート
import { Button, TextField } from "@mui/material";

// ❌ 悪い例 - デフォルトインポート（バンドルサイズ増加）
import * as MUI from "@mui/material";
```

## 📚 参考リソース

- [ESLint設定](./.eslintrc.yaml)
- [Prettier設定](./.prettierrc.yaml)
- [TypeScript設定](./tsconfig.json)
- [Material-UI パフォーマンスガイド](https://mui.com/material-ui/guides/minimizing-bundle-size/)
- [tss-react ドキュメント](https://www.tss-react.dev/)

## 🚀 実践チェックリスト

### コード作成時

- [ ] TypeScript の型安全性を確保
- [ ] ESLint エラーを解消
- [ ] Prettier フォーマットを適用
- [ ] 適切なテストを作成
- [ ] パフォーマンスを考慮した実装

### コードレビュー時

- [ ] 命名規則の確認
- [ ] 型定義の適切性
- [ ] テストカバレッジの確認
- [ ] パフォーマンスの考慮
- [ ] アクセシビリティの確認

---

このコーディング規約を遵守することで、高品質で保守性の高いコードを維持できます！
