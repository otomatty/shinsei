# React基礎知識 ⚛️

## 📋 概要

このドキュメントでは、Reactの基本概念と、なぜ当プロジェクトで特定のパターンを採用しているのかを説明します。

## 🎯 なぜReactを使うのか？

### 1. 宣言的UI

```javascript
// ❌ 従来のDOM操作（命令的）
const button = document.createElement("button");
button.textContent = "Click me";
button.addEventListener("click", function () {
  const div = document.getElementById("counter");
  div.textContent = parseInt(div.textContent) + 1;
});
document.body.appendChild(button);

// ✅ React（宣言的）
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>
  );
}
```

**なぜ重要？**

- **可読性**: コードから何が描画されるかが明確
- **予測可能性**: 状態に基づいてUIが決定される
- **保守性**: バグの原因を特定しやすい

### 2. コンポーネントベース設計

```typescript
// ✅ 再利用可能なコンポーネント
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
}

// 使用例
function App() {
  return (
    <div>
      <Button onClick={() => console.log('Save')}>保存</Button>
      <Button onClick={() => console.log('Cancel')} variant="secondary">
        キャンセル
      </Button>
    </div>
  );
}
```

**なぜ重要？**

- **再利用性**: 同じコンポーネントを複数箇所で使用
- **保守性**: 変更が必要な場合、一箇所修正するだけで全体に反映
- **テスト容易性**: 個別のコンポーネントを単体テストできる

## 🔄 関数型コンポーネント vs クラスコンポーネント

### クラスコンポーネントの問題点

```typescript
// ❌ クラスコンポーネント（非推奨）
class UserProfile extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      user: null,
      loading: true,
    };
  }

  componentDidMount() {
    this.fetchUser();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.userId !== this.props.userId) {
      this.fetchUser();
    }
  }

  fetchUser = async () => {
    // 複雑な非同期処理
  };

  render() {
    // レンダリング処理
  }
}
```

**クラスコンポーネントの問題点**

1. **冗長性**: 同じロジックが複数のライフサイクルメソッドに散らばる
2. **thisバインディング**: `this`の理解が必要
3. **複雑性**: 状態管理とライフサイクルが複雑
4. **テストの困難性**: モックやスパイが複雑

### 関数型コンポーネントの利点

```typescript
// ✅ 関数型コンポーネント（推奨）
function UserProfile({ userId }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const userData = await api.getUser(userId);
        setUser(userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]); // userIdが変わったときのみ実行

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

**関数型コンポーネントの利点**

1. **簡潔性**: 短く書ける
2. **理解しやすさ**: 関数の概念のみ理解すれば良い
3. **フック活用**: 関連するロジックを一箇所にまとめられる
4. **テストしやすさ**: 純粋関数として扱える

## 🎣 Reactフックの基本

### useState - 状態管理

```typescript
// ✅ 基本的な状態管理
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>-</button>
    </div>
  );
}

// ✅ 複雑な状態管理
interface FormState {
  name: string;
  email: string;
  errors: Record<string, string>;
}

function ContactForm() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    errors: {},
  });

  const updateField = (field: keyof FormState, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <form>
      <input
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
        placeholder="Name"
      />
      <input
        value={form.email}
        onChange={(e) => updateField('email', e.target.value)}
        placeholder="Email"
      />
    </form>
  );
}
```

### useEffect - 副作用の管理

```typescript
// ✅ 基本的な副作用
function DocumentTitle() {
  const [title, setTitle] = useState('');

  useEffect(() => {
    document.title = title;
  }, [title]); // titleが変わったときのみ実行

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      placeholder="Set document title"
    />
  );
}

// ✅ クリーンアップ付きの副作用
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    // クリーンアップ関数
    return () => {
      clearInterval(interval);
    };
  }, []); // 空の依存配列 = マウント時のみ実行

  return <div>Timer: {seconds}s</div>;
}
```

### 依存関係配列の重要性

```typescript
// ❌ 依存関係の不備
function BadExample({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, []); // userIdが依存関係に含まれていない！

  return <div>{user?.name}</div>;
}

// ✅ 正しい依存関係
function GoodExample({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]); // userIdが変わったときに再実行

  return <div>{user?.name}</div>;
}
```

**なぜ依存関係が重要？**

1. **一貫性**: 状態とUIが同期される
2. **バグ防止**: 古いデータが残ることを防ぐ
3. **予測可能性**: いつ副作用が実行されるかが明確

### useCallback - 関数の最適化

```typescript
// ❌ 毎回新しい関数が作られる
function ParentComponent() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <ChildComponent onClick={handleClick} />
      <p>Count: {count}</p>
    </div>
  );
}

// ✅ useCallbackで関数を最適化
function ParentComponent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount(prev => prev + 1);
  }, []); // 依存関係なし

  return (
    <div>
      <ChildComponent onClick={handleClick} />
      <p>Count: {count}</p>
    </div>
  );
}
```

### useMemo - 計算結果の最適化

```typescript
// ❌ 毎回重い計算が実行される
function ExpensiveComponent({ items }: { items: Item[] }) {
  const expensiveValue = computeExpensiveValue(items); // 毎回計算

  return <div>{expensiveValue}</div>;
}

// ✅ useMemoで計算を最適化
function ExpensiveComponent({ items }: { items: Item[] }) {
  const expensiveValue = useMemo(() => {
    return computeExpensiveValue(items);
  }, [items]); // itemsが変わったときのみ計算

  return <div>{expensiveValue}</div>;
}
```

## 🎯 パフォーマンス最適化

### React.memo - 不要な再レンダリング防止

```typescript
// ❌ 親コンポーネントの再レンダリング時に常に再レンダリング
function ChildComponent({ name }: { name: string }) {
  console.log('ChildComponent rendered');
  return <div>{name}</div>;
}

// ✅ React.memoで最適化
const ChildComponent = React.memo(({ name }: { name: string }) => {
  console.log('ChildComponent rendered');
  return <div>{name}</div>;
});

function ParentComponent() {
  const [count, setCount] = useState(0);
  const [name] = useState('John');

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <ChildComponent name={name} /> {/* nameが変わらない限り再レンダリングされない */}
    </div>
  );
}
```

### 適切なkey属性の使用

```typescript
// ❌ インデックスをkeyとして使用
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((todo, index) => (
        <TodoItem key={index} todo={todo} />
      ))}
    </ul>
  );
}

// ✅ 一意のIDをkeyとして使用
function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
```

**なぜkeyが重要？**

1. **効率的な更新**: Reactが要素を正確に識別できる
2. **状態の保持**: 適切なkey使用により、コンポーネントの状態が正しく管理される
3. **パフォーマンス**: 不要なDOM操作を減らす

### コンポーネントの分割

```typescript
// ❌ 大きなコンポーネント
function UserDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  // 大量のロジックがここに...

  return (
    <div>
      {/* 大量のJSX */}
    </div>
  );
}

// ✅ 小さなコンポーネントに分割
function UserDashboard() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <div>
      <UserProfile user={user} />
      <UserPosts userId={user?.id} />
      <UserComments userId={user?.id} />
    </div>
  );
}

function UserProfile({ user }: { user: User | null }) {
  if (!user) return <div>Loading...</div>;
  return <div>{user.name}</div>;
}

function UserPosts({ userId }: { userId: string | undefined }) {
  const [posts, setPosts] = useState<Post[]>([]);
  // posts関連のロジック
  return <div>{/* posts JSX */}</div>;
}
```

## 🔧 実践的なパターン

### カスタムフックの作成

```typescript
// ✅ 再利用可能なカスタムフック
function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
}

// 使用例
function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading, error } = useApi<User>(`/api/users/${userId}`);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return <div>{user.name}</div>;
}
```

### エラーハンドリング

```typescript
// ✅ エラーバウンダリー
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }

    return this.props.children;
  }
}

// 使用例
function App() {
  return (
    <ErrorBoundary>
      <UserDashboard />
    </ErrorBoundary>
  );
}
```

## 🚫 避けるべきパターン

### 1. 不適切な状態管理

```typescript
// ❌ 複数の状態で同じデータを管理
function BadExample() {
  const [users, setUsers] = useState<User[]>([]);
  const [userCount, setUserCount] = useState(0);

  const addUser = (user: User) => {
    setUsers([...users, user]);
    setUserCount(userCount + 1); // 同期が取れなくなる危険性
  };
}

// ✅ 計算で求められるものは状態にしない
function GoodExample() {
  const [users, setUsers] = useState<User[]>([]);
  const userCount = users.length; // 計算で求める

  const addUser = (user: User) => {
    setUsers([...users, user]);
  };
}
```

### 2. 不適切なuseEffect使用

```typescript
// ❌ useEffectOnce は使用禁止
function BadExample() {
  const [data, setData] = useState(null);

  useEffectOnce(() => {
    fetchData().then(setData);
  });

  return <div>{data}</div>;
}

// ✅ 適切なuseEffect
function GoodExample() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(setData);
  }, []); // 空の依存配列で初回のみ実行
}
```

## 📚 まとめ

Reactの基本概念を理解することで、以下の恩恵を受けられます：

1. **保守性の向上**: 宣言的UIにより、コードの意図が明確
2. **再利用性**: コンポーネントベース設計により、効率的な開発
3. **パフォーマンス**: 適切な最適化により、高速なUI
4. **開発効率**: フックを活用した簡潔なコード

**重要なポイント**:

- 関数型コンポーネントを使用し、フックを活用する
- useEffectの依存関係を適切に管理する
- パフォーマンスを意識したコンポーネント設計を行う
- 適切なkey属性を使用し、コンポーネントを小さく分割する

これらの原則を守ることで、スケーラブルで保守性の高いReactアプリケーションを構築できます！
