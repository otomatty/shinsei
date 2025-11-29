# テスト基礎知識 🧪

## 📋 概要

このドキュメントでは、テストの基本概念と、なぜテストが重要なのか、良いテストの書き方について説明します。

## 🎯 なぜテストが必要なのか？

### 1. テストなしの問題

```typescript
// ❌ テストなしのコード
function calculateTotal(items: Item[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// この関数は正しく動作するのか？
// - 空の配列を渡した場合は？
// - priceが負の値の場合は？
// - quantityが0の場合は？
// - 未定義のプロパティがある場合は？
```

### 2. テストありの安心感

```typescript
// ✅ テストありのコード
function calculateTotal(items: Item[]): number {
  if (!items || items.length === 0) {
    return 0;
  }

  let total = 0;
  for (const item of items) {
    if (item.price < 0 || item.quantity < 0) {
      throw new Error("Price and quantity must be non-negative");
    }
    total += item.price * item.quantity;
  }
  return total;
}

// describe("calculateTotal", () => {
//   it("should return 0 for empty array", () => {
//     expect(calculateTotal([])).toBe(0);
//   });
//
//   it("should calculate total correctly", () => {
//     const items = [
//       { price: 10, quantity: 2 },
//       { price: 5, quantity: 3 }
//     ];
//     expect(calculateTotal(items)).toBe(35);
//   });
//
//   it("should throw error for negative values", () => {
//     const items = [{ price: -10, quantity: 2 }];
//     expect(() => calculateTotal(items)).toThrow();
//   });
// });
```

**テストの利点**

1. **信頼性**: コードが期待通りに動作することを保証
2. **安全性**: リファクタリング時の回帰バグを防止
3. **ドキュメント**: コードの使用例と期待される動作を示す
4. **設計改善**: テストしやすいコードは良い設計になりやすい

## 🏗️ テストの種類

### 1. 単体テスト（Unit Test）

```typescript
// ✅ 関数の単体テスト
describe("formatPrice", () => {
  it("should format price with currency symbol", () => {
    expect(formatPrice(1234.56)).toBe("$1,234.56");
  });

  it("should handle zero price", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("should handle negative price", () => {
    expect(formatPrice(-100)).toBe("-$100.00");
  });
});

// ✅ フックの単体テスト
describe("useCounter", () => {
  it("should initialize with default value", () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it("should increment count", () => {
    const { result } = renderHook(() => useCounter());
    act(() => {
      result.current.increment();
    });
    expect(result.current.count).toBe(1);
  });
});
```

**単体テストの特徴**

- **対象**: 個別の関数、コンポーネント、フック
- **速度**: 高速実行
- **独立性**: 他のコードに依存しない
- **目的**: ロジックの正確性を検証

### 2. 統合テスト（Integration Test）

```typescript
// ✅ コンポーネントの統合テスト
describe("UserProfile", () => {
  it("should display user information", async () => {
    const mockUser = {
      id: "1",
      name: "John Doe",
      email: "john@example.com"
    };

    // APIモック
    jest.spyOn(api, "getUser").mockResolvedValue(mockUser);

    render(<UserProfile userId="1" />);

    // ローディング状態
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // データ表示待ち
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    // API呼び出し確認
    expect(api.getUser).toHaveBeenCalledWith("1");
  });
});
```

**統合テストの特徴**

- **対象**: 複数のコンポーネントの連携
- **速度**: 中程度
- **依存性**: 外部API、ストア、ルーターなど
- **目的**: コンポーネント間の協調動作を検証

### 3. E2Eテスト（End-to-End Test）

```typescript
// ✅ E2Eテスト（Playwright例）
test("user can complete purchase flow", async ({ page }) => {
  // ログイン
  await page.goto("/login");
  await page.fill("[data-testid=email]", "user@example.com");
  await page.fill("[data-testid=password]", "password");
  await page.click("[data-testid=login-button]");

  // 商品選択
  await page.goto("/products");
  await page.click("[data-testid=product-1]");
  await page.click("[data-testid=add-to-cart]");

  // 購入
  await page.click("[data-testid=cart-icon]");
  await page.click("[data-testid=checkout-button]");

  // 確認
  await expect(page.locator("[data-testid=success-message]")).toBeVisible();
});
```

**E2Eテストの特徴**

- **対象**: アプリケーション全体の動作
- **速度**: 低速
- **環境**: 実際のブラウザ・サーバー
- **目的**: ユーザーシナリオの検証

## 🎨 良いテストの書き方

### 1. AAA（Arrange-Act-Assert）パターン

```typescript
// ✅ AAA パターン
describe("shoppingCart", () => {
  it("should calculate discount correctly", () => {
    // Arrange（準備）
    const cart = new ShoppingCart();
    const items = [
      { id: "1", price: 100, quantity: 2 },
      { id: "2", price: 50, quantity: 1 },
    ];
    const discountRate = 0.1;

    // Act（実行）
    cart.addItems(items);
    const total = cart.getTotalWithDiscount(discountRate);

    // Assert（検証）
    expect(total).toBe(225); // (100*2 + 50*1) * 0.9 = 225
  });
});
```

### 2. 境界値テスト

```typescript
// ✅ 境界値のテスト
describe("validateAge", () => {
  it("should handle boundary values", () => {
    // 最小値未満
    expect(validateAge(-1)).toBe(false);

    // 最小値
    expect(validateAge(0)).toBe(true);

    // 有効な値
    expect(validateAge(25)).toBe(true);

    // 最大値
    expect(validateAge(120)).toBe(true);

    // 最大値超過
    expect(validateAge(121)).toBe(false);
  });
});
```

### 3. エラーケースのテスト

```typescript
// ✅ エラーケースのテスト
describe("divideNumbers", () => {
  it("should divide numbers correctly", () => {
    expect(divideNumbers(10, 2)).toBe(5);
  });

  it("should throw error when dividing by zero", () => {
    expect(() => divideNumbers(10, 0)).toThrow("Division by zero");
  });

  it("should handle invalid inputs", () => {
    expect(() => divideNumbers(NaN, 2)).toThrow("Invalid input");
    expect(() => divideNumbers(10, NaN)).toThrow("Invalid input");
  });
});
```

## 🔧 Reactコンポーネントのテスト

### 1. 基本的なレンダリングテスト

```typescript
// ✅ 基本的なレンダリング
describe("Button", () => {
  it("should render with correct text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("should handle disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

### 2. ユーザーインタラクションテスト

```typescript
// ✅ ユーザーインタラクション
describe("Counter", () => {
  it("should increment when button is clicked", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const incrementButton = screen.getByRole("button", { name: /increment/i });
    const countDisplay = screen.getByTestId("count");

    expect(countDisplay).toHaveTextContent("0");

    await user.click(incrementButton);
    expect(countDisplay).toHaveTextContent("1");

    await user.click(incrementButton);
    expect(countDisplay).toHaveTextContent("2");
  });
});
```

### 3. フォームテスト

```typescript
// ✅ フォームのテスト
describe("ContactForm", () => {
  it("should submit form with valid data", async () => {
    const user = userEvent.setup();
    const mockSubmit = jest.fn();

    render(<ContactForm onSubmit={mockSubmit} />);

    // フォーム入力
    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText(/message/i), "Hello world");

    // 送信
    await user.click(screen.getByRole("button", { name: /submit/i }));

    // 検証
    expect(mockSubmit).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@example.com",
      message: "Hello world"
    });
  });

  it("should show validation errors", async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={jest.fn()} />);

    // 空のまま送信
    await user.click(screen.getByRole("button", { name: /submit/i }));

    // エラーメッセージ確認
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });
});
```

## 🎣 フックのテスト

### 1. カスタムフックテスト

```typescript
// ✅ カスタムフックのテスト
describe("useApi", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("should fetch data successfully", async () => {
    const mockData = { id: 1, name: "Test" };
    fetchMock.mockResponseOnce(JSON.stringify(mockData));

    const { result } = renderHook(() => useApi("/api/test"));

    // 初期状態
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    // データ取得完了待ち
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 結果確認
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
  });

  it("should handle error", async () => {
    fetchMock.mockRejectOnce(new Error("API Error"));

    const { result } = renderHook(() => useApi("/api/test"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toEqual(new Error("API Error"));
  });
});
```

## 🎭 モックとスタブ

### 1. 関数のモック

```typescript
// ✅ 関数のモック
describe("UserService", () => {
  it("should call API with correct parameters", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: "John" }),
    });

    // グローバルfetchをモック
    global.fetch = mockFetch;

    const result = await UserService.getUser("123");

    expect(mockFetch).toHaveBeenCalledWith("/api/users/123");
    expect(result).toEqual({ id: 1, name: "John" });
  });
});
```

### 2. モジュールのモック

```typescript
// ✅ モジュールのモック
jest.mock("../services/api", () => ({
  getUser: jest.fn(),
  updateUser: jest.fn(),
}));

describe("UserProfile", () => {
  it("should load user data on mount", async () => {
    const mockUser = { id: "1", name: "John" };
    (api.getUser as jest.Mock).mockResolvedValue(mockUser);

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText("John")).toBeInTheDocument();
    });

    expect(api.getUser).toHaveBeenCalledWith("1");
  });
});
```

### 3. タイマーのモック

```typescript
// ✅ タイマーのモック
describe("Timer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should update every second", () => {
    render(<Timer />);

    expect(screen.getByTestId("seconds")).toHaveTextContent("0");

    // 1秒進める
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("seconds")).toHaveTextContent("1");

    // さらに5秒進める
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByTestId("seconds")).toHaveTextContent("6");
  });
});
```

## 🚫 避けるべきテストパターン

### 1. 実装の詳細をテストしない

```typescript
// ❌ 実装詳細のテスト
it("should call useState with initial value", () => {
  const useStateSpy = jest.spyOn(React, "useState");
  render(<Counter />);
  expect(useStateSpy).toHaveBeenCalledWith(0);
});

// ✅ 動作のテスト
it("should display initial count", () => {
  render(<Counter />);
  expect(screen.getByTestId("count")).toHaveTextContent("0");
});
```

### 2. 過度に複雑なテスト

```typescript
// ❌ 複雑すぎるテスト
it("should handle complete user workflow", async () => {
  const user = userEvent.setup();
  render(<App />);

  // 10個の異なる操作をテスト
  await user.click(screen.getByText("Login"));
  await user.type(screen.getByLabelText("Email"), "test@example.com");
  // ... 多すぎる操作

  expect(screen.getByText("Success")).toBeInTheDocument();
});

// ✅ 単一責任のテスト
it("should login with valid credentials", async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  await user.type(screen.getByLabelText("Email"), "test@example.com");
  await user.type(screen.getByLabelText("Password"), "password");
  await user.click(screen.getByRole("button", { name: /login/i }));

  expect(screen.getByText("Login successful")).toBeInTheDocument();
});
```

### 3. スナップショットテストの乱用

```typescript
// ❌ 意味のないスナップショット
it("should match snapshot", () => {
  const { container } = render(<ComplexComponent />);
  expect(container).toMatchSnapshot(); // 何をテストしているかが不明
});

// ✅ 意味のあるテスト
it("should display user information correctly", () => {
  const user = { name: "John", email: "john@example.com" };
  render(<UserCard user={user} />);

  expect(screen.getByText("John")).toBeInTheDocument();
  expect(screen.getByText("john@example.com")).toBeInTheDocument();
});
```

## 🎯 テストのベストプラクティス

### 1. わかりやすいテスト名

```typescript
// ❌ わかりにくいテスト名
it("test 1", () => {});
it("works", () => {});
it("should work correctly", () => {});

// ✅ わかりやすいテスト名
it("should return empty array when no items are provided", () => {});
it("should throw error when price is negative", () => {});
it("should display loading spinner while fetching data", () => {});
```

### 2. テストの独立性

```typescript
// ❌ テスト間で状態を共有
let sharedData: any;

describe("Calculator", () => {
  it("should add numbers", () => {
    sharedData = { result: 5 };
    expect(add(2, 3)).toBe(sharedData.result);
  });

  it("should subtract numbers", () => {
    // sharedDataに依存している
    expect(subtract(sharedData.result, 2)).toBe(3);
  });
});

// ✅ 独立したテスト
describe("Calculator", () => {
  it("should add numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("should subtract numbers", () => {
    expect(subtract(5, 2)).toBe(3);
  });
});
```

### 3. 適切なアサーション

```typescript
// ❌ 弱いアサーション
it("should return something", () => {
  const result = processData(input);
  expect(result).toBeTruthy(); // 何でも通る
});

// ✅ 具体的なアサーション
it("should return processed data with correct structure", () => {
  const input = { name: "John", age: 30 };
  const result = processData(input);

  expect(result).toEqual({
    displayName: "John",
    ageGroup: "adult",
    isValid: true,
  });
});
```

## 📚 まとめ

効果的なテストを書くことで、以下の恩恵を受けられます：

1. **品質保証**: バグの早期発見と修正
2. **安心感**: リファクタリング時の回帰テスト
3. **ドキュメント**: コードの使用方法と期待値の明示
4. **設計改善**: テスタブルなコードは良い設計

**重要なポイント**:

- ユーザーの視点でテストを書く
- 実装詳細ではなく動作をテストする
- テストは simple で focused に保つ
- 適切なモックを使用して依存関係を分離する

これらの原則を守ることで、信頼性が高く保守しやすいテストスイートを構築できます！
