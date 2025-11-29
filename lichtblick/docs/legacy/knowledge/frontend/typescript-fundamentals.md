# TypeScript基礎知識 📚

## 📋 概要

このドキュメントでは、TypeScriptの基本概念と、なぜ当プロジェクトで特定のルールを採用しているのかを説明します。

## 🎯 なぜTypeScriptを使うのか？

### 1. 型安全性による早期バグ発見

```typescript
// ❌ JavaScript では実行時にエラーが発生
function greet(name) {
  return "Hello, " + name.toUpperCase();
}

greet(123); // 実行時エラー: name.toUpperCase is not a function

// ✅ TypeScript では開発時にエラーを検出
function greet(name: string): string {
  return "Hello, " + name.toUpperCase();
}

greet(123); // コンパイルエラー: Argument of type 'number' is not assignable to parameter of type 'string'
```

**なぜ重要？**

- **開発効率向上**: バグを早期発見できるため、デバッグ時間が短縮される
- **リファクタリング安全性**: 型チェックにより、変更による影響範囲を把握できる
- **ドキュメント効果**: 型定義が関数の使い方を明確にする

### 2. IDE支援の強化

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function processUser(user: User) {
  // IDE が user. を入力した時点で id, name, email を自動補完
  return user.name.toUpperCase();
}
```

**なぜ重要？**

- **自動補完**: プロパティ名やメソッド名を正確に入力できる
- **エラー検出**: 存在しないプロパティにアクセスしようとすると即座に警告
- **リファクタリング支援**: 名前変更時に関連する箇所を一括変更

## 🏗️ 型定義の基本

### interface vs type

```typescript
// ✅ interface を優先使用（推奨）
interface UserData {
  id: string;
  name: string;
  email?: string;
}

// 📝 type は特定の場面で使用
type Status = "loading" | "success" | "error";
type UserWithStatus = UserData & { status: Status };
```

**なぜ interface を優先するのか？**

1. **拡張性**: 同名のinterfaceを複数回定義すると自動的にマージされる

```typescript
interface Window {
  customProperty: string;
}

// 既存のWindowインターフェースが拡張される
```

2. **可読性**: オブジェクトの構造を表現する際の意図が明確
3. **パフォーマンス**: TypeScriptコンパイラの処理が高速

### 明示的な型注釈 vs 型推論

```typescript
// ✅ 推論が不明確な場合は明示的に型注釈
const userId: string = getUserId(); // 戻り値の型が不明確な場合

// ✅ 推論が明確な場合は型注釈不要
const count = 0; // number型と推論される
const users = []; // any[]型になるので注意

// ✅ 配列の場合は初期化時に型を明示
const users: User[] = [];
```

**なぜ明示的な型注釈が重要？**

- **意図の明確化**: 変数の用途を明確に示す
- **型エラーの早期発見**: 想定外の値が代入される前に検出
- **リファクタリング安全性**: 型の変更による影響を把握

## 🚫 避けるべき型の使い方

### any型の問題

```typescript
// ❌ any型は型安全性を破壊
const userData: any = getUserData();
userData.nonExistentProperty; // エラーにならない（実行時エラーの原因）

// ✅ 適切な型定義を使用
interface UserData {
  id: string;
  name: string;
}

const userData: UserData = getUserData();
userData.nonExistentProperty; // コンパイルエラー
```

**any型の問題点**

1. **型チェック無効化**: TypeScriptの恩恵を受けられない
2. **実行時エラー**: 存在しないプロパティへのアクセスが可能
3. **IDE支援不可**: 自動補完やエラー検出が機能しない
4. **技術的負債**: 後から型を付けるのが困難

### null vs undefined

```typescript
// ❌ null の使用は避ける
const user: User | null = getUser();
if (user !== null) {
  console.log(user.name);
}

// ✅ undefined を使用（推奨）
const user: User | undefined = getUser();
if (user !== undefined) {
  console.log(user.name);
}

// ✅ Optional chaining を活用
console.log(user?.name);
```

**なぜ undefined を優先するのか？**

1. **JavaScript の自然な動作**: 初期化されていない変数はundefined
2. **Optional chaining**: `?.`演算子でundefinedを安全に扱える
3. **一貫性**: JavaScriptエンジンの動作と一致

```typescript
// JavaScript の自然な動作
let uninitialized; // undefined
const obj = { prop: undefined }; // undefined
const arr = [1, 2]; // arr[5] は undefined
```

### 例外: ReactでのNull使用

```typescript
// ✅ React refs/components では ReactNull を使用
import { ReactNull } from "@lichtblick/suite-base/types";

const ref = useRef<HTMLDivElement | ReactNull>(ReactNull);

// React.RefObject<T> の初期値として null が適切
```

**なぜReactでは null を使うのか？**

- **React API**: `useRef`の初期値として`null`が慣例
- **DOM要素**: マウント前の状態を表現するため

## 🔍 実践的な型定義

### 関数の型定義

```typescript
// ✅ 引数と戻り値の型を明示
function processData(data: UserData[]): ProcessedData[] {
  return data.map((user) => ({
    id: user.id,
    displayName: user.name.toUpperCase(),
  }));
}

// ✅ 非同期関数の型定義
async function fetchUserData(id: string): Promise<UserData> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

### イベントハンドラーの型定義

```typescript
// ✅ React のイベントハンドラー
function handleClick(event: React.MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
  console.log("Button clicked");
}

// ✅ カスタムイベントハンドラー
function handleSubmit(data: FormData): void {
  console.log("Form submitted:", data);
}
```

## 🎯 型安全性のベストプラクティス

### 1. 型ガードの活用

```typescript
// ✅ 型ガード関数
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function processValue(value: unknown): string {
  if (isString(value)) {
    return value.toUpperCase(); // string と推論される
  }
  return "Invalid value";
}
```

### 2. ユニオン型の活用

```typescript
// ✅ ユニオン型で状態を表現
type LoadingState = "idle" | "loading" | "success" | "error";

interface AsyncState<T> {
  status: LoadingState;
  data?: T;
  error?: Error;
}
```

### 3. ジェネリクスの活用

```typescript
// ✅ 再利用可能な型定義
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  return fetch(url).then((res) => res.json());
}

// 使用例
const userData: ApiResponse<User> = await fetchData<User>("/api/user");
```

## 🔧 実際のコードでの適用

### コンポーネントの型定義

```typescript
// ✅ Props の型定義
interface ButtonProps {
  children: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

function Button({ children, onClick, disabled = false, variant = "primary" }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}
```

### Hookの型定義

```typescript
// ✅ カスタムフックの型定義
interface UseApiResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

function useApi<T>(url: string): UseApiResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(url);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

## 📚 まとめ

TypeScriptの型システムは、以下の恩恵をもたらします：

1. **開発時の安全性**: コンパイル時エラーによる早期バグ発見
2. **開発効率**: IDE支援による生産性向上
3. **保守性**: コードの意図が明確になり、メンテナンスが容易
4. **チーム開発**: 型定義により、API契約が明確化

**重要なポイント**:

- `any`型は極力避け、適切な型定義を心がける
- `interface`を優先し、必要に応じて`type`を使用
- `undefined`を優先し、`null`は特定の場面のみ使用
- 型注釈は意図を明確にするために積極的に使用

これらの原則を守ることで、安全で保守性の高いTypeScriptコードを書くことができます！
