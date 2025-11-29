# 開発ツール基礎知識 🛠️

## 📋 概要

このドキュメントでは、ESLint、Prettier、TypeScriptなどの開発ツールの基本概念と、なぜこれらのツールが必要なのかを説明します。

## 🎯 なぜ開発ツールが必要なのか？

### 1. 開発ツールなしの問題

```typescript
// ❌ 開発ツールなしの問題のあるコード
function getUserData(id) {
  const user = users.find((u) => u.id == id);
  if (user) {
    return {
      name: user.name,
      email: user.email,
      age: user.age,
    };
  }
  return null;
}

const result = getUserData("123");
console.log(result.name); // 実行時エラーの可能性
```

**問題点**

1. **型エラー**: 文字列と数値の比較(`==` vs `===`)
2. **実行時エラー**: `result`が`null`の場合のアクセス
3. **統一性不足**: コードスタイルがバラバラ
4. **保守性**: 後から見返した時に理解困難

### 2. 開発ツールありの改善

```typescript
// ✅ 開発ツールで改善されたコード
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

function getUserData(id: string): User | undefined {
  const user = users.find((u) => u.id === id);
  if (user) {
    return {
      name: user.name,
      email: user.email,
      age: user.age,
    };
  }
  return undefined;
}

const result = getUserData("123");
if (result) {
  console.log(result.name); // 安全なアクセス
}
```

**改善点**

1. **型安全性**: TypeScriptによる型チェック
2. **一貫性**: Prettierによる統一されたフォーマット
3. **品質**: ESLintによるコード品質チェック
4. **保守性**: 明確で読みやすいコード

## 🔍 ESLint - コード品質の番人

### ESLintの役割

```typescript
// ❌ ESLintが検出する問題
function BadExample() {
  var count = 0; // ESLint: 'var' is not allowed, use 'const' or 'let'

  if ((count = 5)) {
    // ESLint: Assignment in condition detected
    console.log("count is 5");
  }

  const users = []; // ESLint: 'users' is assigned a value but never used

  function helper() {
    // ESLint: 'helper' is defined but never used
    return "helper";
  }
}
```

### ESLintの設定例

```yaml
# .eslintrc.yaml
extends:
  - "@typescript-eslint/recommended"
  - "plugin:react/recommended"
  - "plugin:react-hooks/recommended"

rules:
  # 型安全性
  "@typescript-eslint/no-explicit-any": "error"
  "@typescript-eslint/no-unused-vars": "error"

  # React関連
  "react-hooks/exhaustive-deps": "error"
  "react/prop-types": "off" # TypeScriptを使用するため

  # 一般的な品質ルール
  "no-console": ["warn", { "allow": ["warn", "error", "debug"] }]
  "prefer-const": "error"
  "no-var": "error"
```

### なぜこれらのルールが重要なのか？

#### 1. `@typescript-eslint/no-explicit-any`

```typescript
// ❌ any型は型安全性を破壊
function processData(data: any) {
  return data.someProperty.anotherProperty; // 実行時エラーの可能性
}

// ✅ 適切な型定義
interface ProcessData {
  someProperty: {
    anotherProperty: string;
  };
}

function processData(data: ProcessData) {
  return data.someProperty.anotherProperty; // 型安全
}
```

#### 2. `react-hooks/exhaustive-deps`

```typescript
// ❌ 依存関係の欠落
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, []); // ESLintエラー: userIdが依存関係に含まれていない

  return <div>{user?.name}</div>;
}

// ✅ 正しい依存関係
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]); // 依存関係を正しく指定

  return <div>{user?.name}</div>;
}
```

#### 3. `prefer-const`

```typescript
// ❌ 再代入されない変数にletを使用
function calculateTotal(items: Item[]) {
  let total = 0; // ESLint: 'total' is never reassigned. Use 'const' instead.

  for (let item of items) {
    total += item.price;
  }

  return total;
}

// ✅ 適切な変数宣言
function calculateTotal(items: Item[]) {
  let total = 0; // 再代入があるのでletが適切

  for (const item of items) {
    // 再代入がないのでconst
    total += item.price;
  }

  return total;
}
```

## 🎨 Prettier - コードフォーマットの統一

### Prettierの役割

```typescript
// ❌ フォーマットがバラバラ
function createUser(name: string, email: string, age: number) {
  const user = { id: generateId(), name, email, age };
  return user;
}

// ✅ Prettierによる統一フォーマット
function createUser(name: string, email: string, age: number) {
  const user = { id: generateId(), name, email, age };
  return user;
}
```

### Prettierの設定

```yaml
# .prettierrc.yaml
printWidth: 100 # 1行の最大文字数
tabWidth: 2 # インデントサイズ
useTabs: false # スペースを使用
semi: true # セミコロンを追加
singleQuote: false # ダブルクォートを使用
trailingComma: "all" # 末尾カンマを追加
```

### なぜフォーマットの統一が重要なのか？

#### 1. 可読性の向上

```typescript
// ❌ 読みにくいコード
const userConfig = {
  name: "John",
  settings: {
    theme: "dark",
    notifications: true,
    preferences: { language: "en", timezone: "UTC" },
  },
};

// ✅ 読みやすいコード
const userConfig = {
  name: "John",
  settings: {
    theme: "dark",
    notifications: true,
    preferences: {
      language: "en",
      timezone: "UTC",
    },
  },
};
```

#### 2. チーム開発の効率化

```typescript
// ❌ 個人のスタイルがバラバラ
// Developer A のスタイル
const handleClick = (event) => {
  event.preventDefault();
  onSubmit(formData);
};

// Developer B のスタイル
const handleClick = (event) => {
  event.preventDefault();
  onSubmit(formData);
};

// ✅ Prettierによる統一スタイル
const handleClick = (event) => {
  event.preventDefault();
  onSubmit(formData);
};
```

#### 3. レビューの効率化

```typescript
// ❌ フォーマットの違いによるノイズ
// 変更前
const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
};

// 変更後（実際の変更 + フォーマット変更）
const config = {
  apiUrl: "https://api.example.com",
  timeout: 10000, // 実際の変更
  retries: 3, // 新しい設定
};

// ✅ 統一フォーマットによる明確な差分
// 変更前
const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
};

// 変更後（実際の変更のみ）
const config = {
  apiUrl: "https://api.example.com",
  timeout: 10000, // 実際の変更
  retries: 3, // 新しい設定
};
```

## 🔧 TypeScript - 型による安全性

### TypeScriptコンパイラーの役割

```typescript
// ❌ JavaScriptでの実行時エラー
function calculateDiscount(price, discountRate) {
  return price * discountRate; // discountRateが文字列だった場合の問題
}

const result = calculateDiscount(100, "0.1"); // "1000.1" という文字列が返る
console.log(result + 50); // "1000.150" という文字列結合になる

// ✅ TypeScriptでの型安全性
function calculateDiscount(price: number, discountRate: number): number {
  return price * discountRate;
}

const result = calculateDiscount(100, "0.1"); // 型エラー：string は number に代入できない
```

### TypeScript設定の重要性

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true, // 厳格な型チェック
    "noImplicitAny": true, // 暗黙のany型を禁止
    "strictNullChecks": true, // null/undefined の厳格チェック
    "noImplicitReturns": true, // 暗黙のreturn文を禁止
    "noUnusedLocals": true, // 未使用の変数を検出
    "noUnusedParameters": true // 未使用のパラメータを検出
  }
}
```

### なぜ厳格な設定が重要なのか？

#### 1. `strict: true`

```typescript
// ❌ 厳格でない設定での問題
function processUser(user) {
  // 型注釈なし
  return user.name.toUpperCase(); // userがnullの場合エラー
}

// ✅ 厳格な設定での改善
function processUser(user: User | null): string {
  if (!user) {
    throw new Error("User is required");
  }
  return user.name.toUpperCase();
}
```

#### 2. `strictNullChecks: true`

```typescript
// ❌ null/undefinedチェックなし
function getUser(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

const user = getUser("123");
console.log(user.name); // 型エラー：user は undefined の可能性

// ✅ null/undefinedチェックあり
const user = getUser("123");
if (user) {
  console.log(user.name); // 安全
}
```

## 🔄 ツールの連携

### 1. ESLint + Prettier

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "prettier" // Prettierと競合するルールを無効化
  ],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": "error" // Prettierルールを適用
  }
}
```

### 2. TypeScript + ESLint

```json
// .eslintrc.json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### 3. 自動化の設定

```json
// package.json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "quality": "npm run type-check && npm run lint && npm run format"
  }
}
```

## 🎯 実践的な使用例

### 1. 事前コミットフック

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run type-check
npm run lint
npm run format
```

### 2. CI/CDでの品質チェック

```yaml
# .github/workflows/quality.yml
name: Code Quality

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check
```

### 3. エディタとの統合

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## 🚫 よくある間違い

### 1. ツールの設定無視

```typescript
// ❌ ESLintルールを無視
/* eslint-disable */
function badFunction() {
  var x = 1; // varの使用
  console.log(x); // console.logの使用
}

// ✅ ルールに従った修正
function goodFunction() {
  const x = 1;
  console.debug(x); // デバッグ用途で許可されている
}
```

### 2. 型定義の回避

```typescript
// ❌ any型で逃げる
function processData(data: any): any {
  return data.someProperty;
}

// ✅ 適切な型定義
interface InputData {
  someProperty: string;
}

function processData(data: InputData): string {
  return data.someProperty;
}
```

### 3. 依存関係の無視

```typescript
// ❌ eslint-disableで逃げる
useEffect(() => {
  fetchData(userId);
}, []); // eslint-disable-next-line react-hooks/exhaustive-deps

// ✅ 正しい依存関係
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

## 📚 まとめ

開発ツールを適切に使用することで、以下の恩恵を受けられます：

1. **品質向上**: ESLintによるコード品質の自動チェック
2. **一貫性**: Prettierによる統一されたコードフォーマット
3. **安全性**: TypeScriptによる型安全性の確保
4. **効率性**: 自動化によるヒューマンエラーの削減

**重要なポイント**:

- ツールの設定は厳格に行い、例外は最小限に
- 自動化を活用して品質を維持
- チーム全体で統一されたツール設定を使用
- エラーを無視せず、根本的な問題を解決

これらの原則を守ることで、高品質で保守性の高いコードベースを維持できます！
