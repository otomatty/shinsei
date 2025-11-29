# モダンJavaScript/TypeScript コーディングルール

## 📋 目次

1. [概要](#概要)
2. [基本原則](#基本原則)
3. [TypeScript型システム](#typescript型システム)
4. [モダンJavaScript構文](#モダンjavascript構文)
5. [非同期処理](#非同期処理)
6. [React開発](#react開発)
7. [エラーハンドリング](#エラーハンドリング)
8. [パフォーマンス最適化](#パフォーマンス最適化)
9. [コードスタイル](#コードスタイル)
10. [テスト](#テスト)

---

## 概要

このドキュメントは、可読性、保守性が高く、開発速度を向上させるモダンなJavaScript/TypeScriptのコーディング規約を定義します。

### 対象読者

- Lichtblickプロジェクトの開発者
- TypeScript/React開発者
- コードレビュアー

### 目標

- **可読性**: コードが自己文書化され、意図が明確
- **保守性**: 変更が容易で、バグが少ない
- **開発速度**: 型安全性によるリファクタリングの容易さ

---

## 基本原則

### 1. 型安全性を最優先

```typescript
// ✅ 良い例 - 明示的な型定義
interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

function getUserProfile(userId: string): UserProfile {
  // 実装
}

// ❌ 悪い例 - any型の使用
function getUserProfile(userId: any): any {
  // 実装
}
```

### 2. イミュータビリティ（不変性）

```typescript
// ✅ 良い例 - const と readonly
const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
} as const;

interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}

// ✅ 良い例 - 配列の不変操作
const numbers = [1, 2, 3];
const doubled = numbers.map((n) => n * 2); // 新しい配列を作成

// ❌ 悪い例 - 直接変更
let numbers = [1, 2, 3];
numbers.push(4); // 元の配列を変更
```

### 3. 関数型プログラミングの活用

```typescript
// ✅ 良い例 - 純粋関数
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// ❌ 悪い例 - 副作用のある関数
let total = 0;
function addToTotal(price: number): void {
  total += price; // グローバル変数を変更
}
```

---

## TypeScript型システム

### 1. 型定義の基本

```typescript
// ✅ 良い例 - interface を優先
interface User {
  id: string;
  name: string;
  email?: string; // オプショナル
}

// ✅ 良い例 - type は複雑な型定義に使用
type UserID = string;
type UserRole = "admin" | "user" | "guest";
type AsyncResult<T> = Promise<T | undefined>;

// ✅ 良い例 - 型エイリアスとユニオン型
type Status = "idle" | "loading" | "success" | "error";
type Result<T, E = Error> = { status: "success"; data: T } | { status: "error"; error: E };
```

### 2. ジェネリクスの活用

```typescript
// ✅ 良い例 - 再利用可能なジェネリック関数
function createArray<T>(length: number, value: T): T[] {
  return Array(length).fill(value);
}

const numbers = createArray(3, 0); // number[]
const strings = createArray(3, ""); // string[]

// ✅ 良い例 - ジェネリック制約
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

// ✅ 良い例 - 複数の型パラメータ
function mapRecord<K extends string | number, V, U>(
  record: Record<K, V>,
  fn: (value: V) => U,
): Record<K, U> {
  const result = {} as Record<K, U>;
  for (const [key, value] of Object.entries(record)) {
    result[key as K] = fn(value as V);
  }
  return result;
}
```

### 3. 型ガードとナローイング

```typescript
// ✅ 良い例 - 型ガード関数
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" &&
    obj != null &&
    "id" in obj &&
    "name" in obj &&
    typeof (obj as User).id === "string"
  );
}

// ✅ 良い例 - discriminated union
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "square"; size: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "square":
      return shape.size ** 2;
  }
}

// ✅ 良い例 - null/undefined チェック
function processUser(user: User | undefined): string {
  if (user == undefined) {
    return "No user";
  }
  return user.name;
}
```

### 4. null vs undefined

```typescript
// ✅ 良い例 - undefined を優先
interface Config {
  timeout?: number; // undefined を使用
  retries?: number;
}

function getUser(id: string): User | undefined {
  // undefined を返す
}

// ❌ 悪い例 - null の使用は避ける
function getUser(id: string): User | null {
  return null; // 避けるべき
}

// ✅ 例外 - React refs では ReactNull を使用
import { ReactNull } from "@lichtblick/suite-base/types";
const ref = useRef<HTMLDivElement | ReactNull>(ReactNull);
```

---

## モダンJavaScript構文

### 1. アロー関数

```typescript
// ✅ 良い例 - シンプルなアロー関数
const add = (a: number, b: number): number => a + b;

// ✅ 良い例 - オブジェクトを返す
const createUser = (name: string): User => ({
  id: generateId(),
  name,
  createdAt: new Date(),
});

// ✅ 良い例 - 高階関数
const multiplyBy = (factor: number) => (value: number) => value * factor;
const double = multiplyBy(2);
```

### 2. 分割代入

```typescript
// ✅ 良い例 - オブジェクト分割代入
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

function MyComponent({ title, onSubmit, isLoading = false }: Props) {
  // ...
}

// ✅ 良い例 - ネストした分割代入
const {
  user: { name, email },
  settings,
} = data;

// ✅ 良い例 - 配列分割代入
const [first, second, ...rest] = numbers;
const [state, setState] = useState<string>("");
```

### 3. スプレッド演算子とrest

```typescript
// ✅ 良い例 - オブジェクトのマージ
const defaultConfig = { timeout: 5000, retries: 3 };
const userConfig = { retries: 5 };
const finalConfig = { ...defaultConfig, ...userConfig };

// ✅ 良い例 - 配列の結合
const allItems = [...items1, ...items2];

// ✅ 良い例 - rest パラメータ
function sum(...numbers: number[]): number {
  return numbers.reduce((total, n) => total + n, 0);
}

// ✅ 良い例 - オブジェクトの一部を除外
const { password, ...safeUser } = user;
```

### 4. オプショナルチェーン

```typescript
// ✅ 良い例 - 安全なプロパティアクセス
const userName = user?.profile?.name;
const firstItem = items?.[0];

// ✅ 良い例 - 関数呼び出し
const result = onSubmit?.(data);

// ❌ 悪い例 - 冗長なチェック
const userName = user && user.profile && user.profile.name;
```

### 5. Nullish Coalescing

```typescript
// ✅ 良い例 - デフォルト値の設定
const timeout = config.timeout ?? 5000;
const retries = config.retries ?? 3;

// ❌ 悪い例 - || は 0 や "" も false として扱う
const timeout = config.timeout || 5000; // timeout が 0 の場合も 5000 になる
```

### 6. テンプレートリテラル

```typescript
// ✅ 良い例 - 文字列補間
const greeting = `Hello, ${user.name}!`;
const url = `${baseUrl}/api/users/${userId}`;

// ✅ 良い例 - 複数行文字列
const html = `
  <div class="container">
    <h1>${title}</h1>
    <p>${content}</p>
  </div>
`;

// ✅ 良い例 - タグ付きテンプレート
const query = sql`
  SELECT * FROM users
  WHERE id = ${userId}
`;
```

---

## 非同期処理

### 1. async/await の基本

```typescript
// ✅ 良い例 - async/await を優先
async function fetchUserData(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  const data = await response.json();
  return data;
}

// ❌ 悪い例 - Promise チェーン
function fetchUserData(userId: string): Promise<User> {
  return fetch(`/api/users/${userId}`)
    .then((response) => response.json())
    .then((data) => data);
}
```

### 2. エラーハンドリング

```typescript
// ✅ 良い例 - try-catch でエラー処理
async function fetchWithErrorHandling(url: string): Promise<Data | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      console.error("Network error:", error);
    } else if (error instanceof Error) {
      console.error("Fetch error:", error.message);
    }
    return undefined;
  }
}

// ✅ 良い例 - カスタムエラークラス
class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response?: Response,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new ApiError(`API request failed: ${response.statusText}`, response.status, response);
  }
  return await response.json();
}
```

### 3. 並列処理

```typescript
// ✅ 良い例 - Promise.all で並列実行
async function fetchMultipleUsers(ids: string[]): Promise<User[]> {
  const promises = ids.map((id) => fetchUser(id));
  return await Promise.all(promises);
}

// ✅ 良い例 - Promise.allSettled でエラー耐性
async function fetchAllUsers(ids: string[]): Promise<User[]> {
  const results = await Promise.allSettled(ids.map((id) => fetchUser(id)));

  return results
    .filter((result): result is PromiseFulfilledResult<User> => result.status === "fulfilled")
    .map((result) => result.value);
}

// ❌ 悪い例 - Promise.race の直接使用（メモリリーク）
const result = await Promise.race([promise1, promise2]);

// ✅ 良い例 - @lichtblick/den/async を使用
import { race } from "@lichtblick/den/async";
const result = await race([promise1, promise2]);
```

### 4. タイムアウト処理

```typescript
// ✅ 良い例 - promiseTimeout ユーティリティ
import { promiseTimeout } from "@lichtblick/den/async";

async function fetchWithTimeout(url: string, ms: number): Promise<Data> {
  const fetchPromise = fetch(url).then((r) => r.json());
  return await promiseTimeout(fetchPromise, ms);
}

// ✅ 良い例 - AbortController の使用
async function fetchWithAbort(url: string, timeoutMs: number): Promise<Data> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 5. 非同期パターン

```typescript
// ✅ 良い例 - 逐次処理が必要な場合
async function processItems(items: Item[]): Promise<void> {
  for (const item of items) {
    await processItem(item); // 順番に処理
  }
}

// ✅ 良い例 - バッチ処理
async function processBatch(items: Item[], batchSize: number): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map((item) => processItem(item)));
  }
}

// ✅ 良い例 - リトライロジック
async function fetchWithRetry(url: string, maxRetries: number = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error("Unreachable");
}
```

---

## React開発

### 1. 関数コンポーネント（必須）

```typescript
// ✅ 良い例 - 関数コンポーネント
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function Button({ label, onClick, disabled = false }: ButtonProps): React.JSX.Element {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// ✅ 良い例 - React.memo で最適化
const MemoizedButton = React.memo(Button);

// ❌ 悪い例 - クラスコンポーネント（使用禁止）
class Button extends React.Component<ButtonProps> {
  render() {
    return <button>{this.props.label}</button>;
  }
}
```

### 2. Hooks の使用

```typescript
// ✅ 良い例 - useState
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | undefined>();

// ✅ 良い例 - useEffect（依存配列を明示）
useEffect(() => {
  const subscription = subscribe(userId);
  return () => {
    subscription.unsubscribe();
  };
}, [userId]); // 依存配列を必ず指定

// ✅ 良い例 - useCallback
const handleSubmit = useCallback(
  (data: FormData) => {
    onSubmit(data);
  },
  [onSubmit],
);

// ✅ 良い例 - useMemo
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// ✅ 良い例 - useRef
const inputRef = useRef<HTMLInputElement | ReactNull>(ReactNull);
const timerRef = useRef<NodeJS.Timeout | undefined>();

// ❌ 悪い例 - useEffectOnce（禁止）
useEffectOnce(() => {
  fetchData();
});
```

### 3. カスタムHooks

```typescript
// ✅ 良い例 - カスタムHook
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item != undefined ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      try {
        setStoredValue(value);
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(error);
      }
    },
    [key],
  );

  return [storedValue, setValue];
}

// ✅ 良い例 - データフェッチHook
function useUser(userId: string) {
  const [user, setUser] = useState<User | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      try {
        setLoading(true);
        const data = await fetchUserData(userId);
        if (!cancelled) {
          setUser(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { user, loading, error };
}
```

### 4. JSX のベストプラクティス

```typescript
// ✅ 良い例 - 不要な波括弧を使わない
<MyComponent title="Hello" isActive count={10} />

// ❌ 悪い例 - 不要な波括弧
<MyComponent title={"Hello"} isActive={true} />

// ✅ 良い例 - Fragment の使用
<>
  <Header />
  <Content />
</>

// ❌ 悪い例 - 不要な div
<div>
  <Header />
  <Content />
</div>

// ✅ 良い例 - 条件付きレンダリング
{isLoading ? <Spinner /> : <Content data={data} />}
{error && <ErrorMessage error={error} />}

// ✅ 良い例 - リストレンダリング
{items.map((item) => (
  <ListItem key={item.id} item={item} />
))}
```

### 5. スタイリング

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
  return (
    <div className={classes.container}>
      <h1 className={classes.title}>Title</h1>
    </div>
  );
}

// ❌ 悪い例 - sx プロパティ（パフォーマンス問題）
<Box sx={{ padding: 2, backgroundColor: "white" }}>
  Content
</Box>

// ❌ 悪い例 - styled（パフォーマンス問題）
import { styled } from "@mui/material/styles";
const StyledDiv = styled("div")(({ theme }) => ({
  padding: theme.spacing(2),
}));
```

---

## エラーハンドリング

### 1. エラーの種類

```typescript
// ✅ 良い例 - カスタムエラークラス
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

class NetworkError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

// ✅ 良い例 - Result型パターン
type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };

function divide(a: number, b: number): Result<number> {
  if (b === 0) {
    return { success: false, error: new Error("Division by zero") };
  }
  return { success: true, value: a / b };
}
```

### 2. エラーバウンダリ

```typescript
// ✅ 良い例 - ErrorBoundary コンポーネント
import { ErrorBoundary } from "@lichtblick/suite-base/components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary showErrorDetails={true}>
      <MyComponent />
    </ErrorBoundary>
  );
}

// ✅ 良い例 - カスタムErrorBoundary
class CustomErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  { hasError: boolean; error?: Error }
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### 3. エラーハンドリングパターン

```typescript
// ✅ 良い例 - 包括的なエラーハンドリング
async function processData(data: unknown): Promise<ProcessedData | undefined> {
  try {
    // バリデーション
    if (!isValidData(data)) {
      throw new ValidationError("Invalid data format", "data", data);
    }

    // 処理
    const result = await transform(data);
    return result;
  } catch (error) {
    // エラーの種類によって処理を分ける
    if (error instanceof ValidationError) {
      console.error("Validation failed:", error.field, error.value);
      showValidationError(error);
    } else if (error instanceof NetworkError) {
      console.error("Network error:", error.status);
      showNetworkError(error);
    } else if (error instanceof Error) {
      console.error("Unexpected error:", error.message);
      reportError(error);
    } else {
      console.error("Unknown error:", error);
    }
    return undefined;
  }
}

// ✅ 良い例 - エラーログ
function logError(error: Error, context?: Record<string, unknown>): void {
  console.error("[Error]", {
    message: error.message,
    name: error.name,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}
```

---

## パフォーマンス最適化

### 1. React最適化

```typescript
// ✅ 良い例 - React.memo
const ExpensiveComponent = React.memo(({ data }: { data: Data }) => {
  return <div>{/* 重い処理 */}</div>;
});

// ✅ 良い例 - useMemo
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.value - b.value);
}, [items]);

// ✅ 良い例 - useCallback
const handleClick = useCallback((id: string) => {
  onClick(id);
}, [onClick]);

// ✅ 良い例 - 条件付きレンダリングの最適化
{isVisible && <HeavyComponent />}
```

### 2. バンドルサイズ最適化

```typescript
// ✅ 良い例 - 名前付きインポート
import { Button, TextField } from "@mui/material";

// ❌ 悪い例 - 全体インポート
import * as MUI from "@mui/material";

// ✅ 良い例 - 動的インポート
const HeavyComponent = React.lazy(() => import("./HeavyComponent"));

function App() {
  return (
    <React.Suspense fallback={<Loading />}>
      <HeavyComponent />
    </React.Suspense>
  );
}
```

### 3. メモリ管理

```typescript
// ✅ 良い例 - クリーンアップ関数
useEffect(() => {
  const subscription = subscribe(userId);
  const timer = setInterval(() => {
    // 定期処理
  }, 1000);

  return () => {
    subscription.unsubscribe();
    clearInterval(timer);
  };
}, [userId]);

// ✅ 良い例 - WeakMap の使用
const cache = new WeakMap<object, CachedData>();

function getCachedData(key: object): CachedData {
  if (!cache.has(key)) {
    cache.set(key, computeData(key));
  }
  return cache.get(key)!;
}
```

---

## コードスタイル

### 1. 命名規則

```typescript
// ✅ 良い例 - 明確な命名
interface UserProfile {
  userId: string;
  displayName: string;
  emailAddress: string;
}

function calculateTotalPrice(items: CartItem[]): number {
  // ...
}

const isAuthenticated = user != undefined;
const hasPermission = checkPermission(user, "write");

// ❌ 悪い例 - 不明確な命名
const u = { id: "1", n: "John", e: "john@example.com" };
function calc(i: any[]): number {
  /* ... */
}
const flag = true;
```

### 2. コメント

````typescript
// ✅ 良い例 - JSDoc コメント
/**
 * ユーザー情報を取得する
 *
 * @param userId - ユーザーID
 * @returns ユーザー情報。見つからない場合は undefined
 * @throws {NetworkError} ネットワークエラーが発生した場合
 *
 * @example
 * ```ts
 * const user = await fetchUser("user-123");
 * if (user) {
 *   console.log(user.name);
 * }
 * ```
 */
async function fetchUser(userId: string): Promise<User | undefined> {
  // ...
}

// ✅ 良い例 - 複雑なロジックの説明
function calculateDiscount(price: number, quantity: number): number {
  // 10個以上購入で10%割引
  // 50個以上購入で20%割引
  // 100個以上購入で30%割引
  if (quantity >= 100) return price * 0.7;
  if (quantity >= 50) return price * 0.8;
  if (quantity >= 10) return price * 0.9;
  return price;
}

// ❌ 悪い例 - TODO/FIXME コメント（禁止）
// TODO: この部分を後で修正する
// FIXME: バグがある

// ✅ 良い例 - GitHub Issue への言及
// See: https://github.com/lichtblick-suite/lichtblick/issues/123
// 実装方針を明確にしてから対応
````

### 3. ファイル構成

```typescript
// ✅ 良い例 - ファイルの構造
// 1. インポート
import React, { useState, useCallback } from "react";
import { Button } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks";

import { MyComponent } from "./MyComponent";
import type { Props } from "./types";

// 2. 型定義
interface State {
  count: number;
}

// 3. 定数
const DEFAULT_TIMEOUT = 5000;

// 4. ヘルパー関数
function calculateTotal(items: Item[]): number {
  // ...
}

// 5. コンポーネント
function MyComponent({ title }: Props): React.JSX.Element {
  // ...
}

// 6. エクスポート
export default MyComponent;
```

---

## テスト

### 1. テストの基本

```typescript
// ✅ 良い例 - describe と it
describe("calculateTotal", () => {
  it("should return 0 for empty array", () => {
    expect(calculateTotal([])).toBe(0);
  });

  it("should sum up item prices", () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 3 },
    ];
    expect(calculateTotal(items)).toBe(350);
  });

  it("should handle single item", () => {
    const items = [{ price: 100, quantity: 1 }];
    expect(calculateTotal(items)).toBe(100);
  });
});
```

### 2. Reactコンポーネントのテスト

```typescript
// ✅ 良い例 - React Testing Library
import { render, screen, fireEvent } from "@testing-library/react";

describe("Button", () => {
  it("should render with label", () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("should call onClick when clicked", () => {
    const handleClick = jest.fn();
    render(<Button label="Click me" onClick={handleClick} />);

    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Button label="Click me" onClick={() => {}} disabled />);
    expect(screen.getByText("Click me")).toBeDisabled();
  });
});
```

### 3. 非同期テスト

```typescript
// ✅ 良い例 - 非同期テスト
describe("fetchUser", () => {
  it("should fetch user data", async () => {
    const user = await fetchUser("user-123");
    expect(user).toEqual({
      id: "user-123",
      name: "John Doe",
    });
  });

  it("should handle errors", async () => {
    await expect(fetchUser("invalid")).rejects.toThrow("User not found");
  });
});

// ✅ 良い例 - モック
jest.mock("./api", () => ({
  fetchUser: jest.fn(),
}));

import { fetchUser } from "./api";

describe("UserComponent", () => {
  it("should display user name", async () => {
    (fetchUser as jest.Mock).mockResolvedValue({
      id: "1",
      name: "John",
    });

    render(<UserComponent userId="1" />);
    expect(await screen.findByText("John")).toBeInTheDocument();
  });
});
```

---

## 付録

### 禁止事項まとめ

1. **any 型の使用**
2. **null の使用**（React refs 以外）
3. **クラスコンポーネント**
4. **getter/setter**
5. **console.log/console.info**
6. **Promise.race の直接使用**
7. **TODO/FIXME コメント**
8. **sx プロパティ**
9. **@emotion/styled**
10. **@mui/Box コンポーネント**

### 推奨ライブラリ

- **スタイリング**: tss-react/mui
- **非同期処理**: @lichtblick/den/async
- **ユーティリティ**: lodash-es
- **テスト**: Jest, React Testing Library

### 参考リソース

- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs/)
- [React公式ドキュメント](https://react.dev/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [tss-react](https://www.tss-react.dev/)

---

**更新日**: 2025-10-10
**バージョン**: 1.0.0
