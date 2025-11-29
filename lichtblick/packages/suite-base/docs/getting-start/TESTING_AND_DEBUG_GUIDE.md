# Testing and Debug Guide - suite-base

## 📋 概要

このガイドでは、`@lichtblick/suite-base`パッケージにおけるテスト手法とデバッグのベストプラクティスを説明します。

## 🧪 テスト環境構成

### テストフレームワーク

- **Jest**: テストランナー・アサーション
- **@testing-library/react**: React コンポーネントテスト
- **jest-canvas-mock**: Canvas API のモック
- **fake-indexeddb**: IndexedDB のモック

### Jest設定

```json
// packages/suite-base/jest.config.json
{
  "testMatch": ["<rootDir>/src/**/*.test.ts(x)?"],
  "setupFiles": [
    "<rootDir>/src/test/setup.ts",
    "jest-canvas-mock",
    "fake-indexeddb/auto"
  ],
  "setupFilesAfterEnv": ["<rootDir>/src/test/setupTestFramework.ts"],
  "restoreMocks": true
}
```

### テスト実行コマンド

```bash
# 全テスト実行
yarn test

# ウォッチモード（開発中推奨）
yarn test:watch

# カバレッジ付きテスト
yarn test:coverage

# デバッグモード
yarn test:debug

# 特定ファイルのテスト
yarn test MyComponent.test.tsx

# 特定パターンのテスト
yarn test --testNamePattern="should render"
```

## 🎯 テスト作成ガイドライン

### 1. コンポーネントテストの基本

```typescript
// MyComponent.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent title="Test Title" />);

    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("should handle click events", () => {
    const mockOnClick = jest.fn();
    render(<MyComponent title="Test" onClick={mockOnClick} />);

    fireEvent.click(screen.getByRole("button"));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("should update state correctly", () => {
    render(<MyComponent initialValue="initial" />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "updated" } });

    expect(input).toHaveValue("updated");
  });
});
```

### 2. カスタムフックのテスト

```typescript
// useMyHook.test.ts
import { renderHook, act } from "@testing-library/react";
import { useMyHook } from "./useMyHook";

describe("useMyHook", () => {
  it("should initialize with default value", () => {
    const { result } = renderHook(() => useMyHook("initial"));

    expect(result.current.value).toBe("initial");
  });

  it("should update value correctly", () => {
    const { result } = renderHook(() => useMyHook("initial"));

    act(() => {
      result.current.setValue("updated");
    });

    expect(result.current.value).toBe("updated");
  });
});
```

### 3. 非同期処理のテスト

```typescript
// AsyncComponent.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { AsyncComponent } from "./AsyncComponent";

describe("AsyncComponent", () => {
  it("should handle async data loading", async () => {
    // API呼び出しをモック
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ data: "test data" }),
    } as Response);

    render(<AsyncComponent />);

    // ローディング状態を確認
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText("test data")).toBeInTheDocument();
    });

    mockFetch.mockRestore();
  });

  it("should handle errors", async () => {
    const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValue(
      new Error("API Error")
    );

    render(<AsyncComponent />);

    await waitFor(() => {
      expect(screen.getByText("Error: API Error")).toBeInTheDocument();
    });

    mockFetch.mockRestore();
  });
});
```

### 4. Context・Provider のテスト

```typescript
// ContextComponent.test.tsx
import { render, screen } from "@testing-library/react";
import { MyContextProvider, useMyContext } from "./MyContext";

// テスト用コンポーネント
function TestComponent() {
  const { value, setValue } = useMyContext();
  return (
    <div>
      <span data-testid="value">{value}</span>
      <button onClick={() => setValue("updated")}>Update</button>
    </div>
  );
}

describe("MyContext", () => {
  it("should provide context value", () => {
    render(
      <MyContextProvider initialValue="test">
        <TestComponent />
      </MyContextProvider>
    );

    expect(screen.getByTestId("value")).toHaveTextContent("test");
  });
});
```

## 🔧 モックとスタブ

### 1. 外部ライブラリのモック

```typescript
// __mocks__/@mui/material.tsx
export const Button = ({ children, onClick, ...props }: any) => (
  <button onClick={onClick} {...props}>
    {children}
  </button>
);

export const TextField = ({ onChange, value, ...props }: any) => (
  <input onChange={onChange} value={value} {...props} />
);
```

### 2. APIコールのモック

```typescript
// ApiService.test.ts
import { ApiService } from "./ApiService";

// fetch をモック
global.fetch = jest.fn();

describe("ApiService", () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it("should fetch data correctly", async () => {
    const mockData = { id: 1, name: "Test" };
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await ApiService.getData();

    expect(fetch).toHaveBeenCalledWith("/api/data");
    expect(result).toEqual(mockData);
  });
});
```

### 3. カスタムモックの作成

```typescript
// setupTests.ts
import { jest } from '@jest/globals';

// グローバルモックの設定
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ResizeObserver のモック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
```

## 🔍 デバッグ手法

### 1. VSCode でのデバッグ設定

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--no-coverage",
        "${relativeFile}"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": {
        "CI": "true"
      }
    },
    {
      "name": "Debug Specific Test",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--no-coverage",
        "--testNamePattern=${input:testName}"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ],
  "inputs": [
    {
      "id": "testName",
      "description": "Test name pattern",
      "default": "",
      "type": "promptString"
    }
  ]
}
```

### 2. Chrome DevTools でのデバッグ

```bash
# Node.js インスペクターでデバッグ
yarn test:debug

# Chrome で chrome://inspect を開く
# "Open dedicated DevTools for Node" をクリック
```

### 3. コンソールデバッグ

```typescript
// テスト内でのデバッグ出力
describe("MyComponent", () => {
  it("should debug state", () => {
    const { debug } = render(<MyComponent />);

    // DOM構造を出力
    debug();

    // 特定要素のみ出力
    debug(screen.getByTestId("specific-element"));

    // カスタムデバッグ情報
    console.log("Current state:", component.state);
  });
});
```

### 4. ブレークポイントの設定

```typescript
// テストコードにブレークポイント
describe("MyComponent", () => {
  it("should handle complex logic", () => {
    render(<MyComponent />);

    // デバッガーで停止
    debugger;

    fireEvent.click(screen.getByRole("button"));

    // 期待値をチェック
    expect(screen.getByText("Result")).toBeInTheDocument();
  });
});
```

## 📊 テストカバレッジ

### カバレッジレポート生成

```bash
# カバレッジ付きでテスト実行
yarn test:coverage

# HTMLレポート生成（coverage/lcov-report/index.html）
open coverage/lcov-report/index.html
```

### カバレッジ設定

```json
// jest.config.json
{
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.stories.{ts,tsx}",
    "!src/**/*.d.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 70,
      "lines": 70,
      "statements": 70
    }
  }
}
```

### カバレッジ向上のコツ

```typescript
// エッジケースのテスト
describe("MyComponent edge cases", () => {
  it("should handle empty data", () => {
    render(<MyComponent data={[]} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("should handle error state", () => {
    render(<MyComponent error="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should handle loading state", () => {
    render(<MyComponent loading />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
```

## 🚀 パフォーマンステスト

### レンダリングパフォーマンス

```typescript
// Performance.test.tsx
import { render } from "@testing-library/react";
import { performance } from "perf_hooks";

describe("Performance Tests", () => {
  it("should render within acceptable time", () => {
    const start = performance.now();

    render(<LargeComponent data={largeMockData} />);

    const end = performance.now();
    const renderTime = end - start;

    // 100ms以内でレンダリング完了を期待
    expect(renderTime).toBeLessThan(100);
  });
});
```

### メモリリークテスト

```typescript
// MemoryLeak.test.tsx
describe("Memory Leak Tests", () => {
  it("should cleanup resources on unmount", () => {
    const { unmount } = render(<ComponentWithResources />);

    // リソースが作成されることを確認
    expect(global.mockResourceTracker.created).toBe(1);

    unmount();

    // アンマウント時にリソースが解放されることを確認
    expect(global.mockResourceTracker.cleaned).toBe(1);
  });
});
```

## 🎯 E2Eテスト

### Playwright設定

```typescript
// e2e/myComponent.spec.ts
import { test, expect } from "@playwright/test";

test.describe("MyComponent E2E", () => {
  test("should work in real browser", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // コンポーネントが表示されることを確認
    await expect(page.getByText("My Component")).toBeVisible();

    // ユーザーインタラクションをテスト
    await page.getByRole("button", { name: "Click me" }).click();

    // 結果を確認
    await expect(page.getByText("Clicked!")).toBeVisible();
  });
});
```

### E2E実行

```bash
# Web版E2E
yarn test:e2e:web

# Desktop版E2E
yarn test:e2e:desktop

# デバッグモード
yarn test:e2e:web:debug
```

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. モックが効かない

```typescript
// 問題: モジュールモックが適用されない
// 解決: jest.mock を正しい位置に配置

// ❌ 悪い例
import { MyModule } from "./MyModule";
jest.mock("./MyModule");

// ✅ 良い例
jest.mock("./MyModule");
import { MyModule } from "./MyModule";
```

#### 2. 非同期テストの失敗

```typescript
// 問題: 非同期処理の完了を待たない
// 解決: waitFor や await を適切に使用

// ❌ 悪い例
test("async test", () => {
  render(<AsyncComponent />);
  expect(screen.getByText("Data loaded")).toBeInTheDocument();
});

// ✅ 良い例
test("async test", async () => {
  render(<AsyncComponent />);
  await waitFor(() => {
    expect(screen.getByText("Data loaded")).toBeInTheDocument();
  });
});
```

#### 3. テスト間の状態干渉

```typescript
// 問題: テスト間でモックが共有される
// 解決: beforeEach でクリア

describe("MyComponent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // テストケース
});
```

### デバッグTips

```typescript
// 1. DOM状態の確認
screen.debug(); // 全DOM構造を出力
screen.debug(screen.getByTestId("target")); // 特定要素のみ

// 2. 要素の存在確認
console.log(screen.queryByText("Not found")); // null if not found
console.log(screen.getByText("Found")); // throws error if not found

// 3. イベント前後の状態確認
fireEvent.click(button);
screen.debug(); // クリック後のDOM状態

// 4. 非同期処理の待機
await waitFor(() => {
  console.log("Checking condition...");
  expect(element).toBeInTheDocument();
});
```

## 📚 ベストプラクティス

### テスト作成の原則

1. **AAA パターン**: Arrange, Act, Assert
2. **単一責任**: 1テストケース = 1つの検証
3. **独立性**: テスト間の依存関係を避ける
4. **可読性**: テスト名と実装を明確に
5. **保守性**: リファクタリングに耐えるテスト

### 推奨テスト戦略

```typescript
// 1. コンポーネントの振る舞いをテスト（実装詳細はテストしない）
// ✅ 良い例
test("should show error message when validation fails", () => {
  render(<LoginForm />);
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  expect(screen.getByText("Email is required")).toBeInTheDocument();
});

// ❌ 悪い例 - 実装詳細をテスト
test("should call useState with error message", () => {
  const mockSetState = jest.fn();
  jest.spyOn(React, 'useState').mockReturnValue([null, mockSetState]);
  // ... テスト実装
});
```

## 🎯 チェックリスト

### テスト作成チェックリスト

- [ ] 正常系のテストケース
- [ ] 異常系・エラーケースのテスト
- [ ] エッジケース（空データ、境界値）のテスト
- [ ] ユーザーインタラクションのテスト
- [ ] 非同期処理のテスト
- [ ] アクセシビリティのテスト
- [ ] パフォーマンスのテスト

### デバッグチェックリスト

- [ ] エラーメッセージの確認
- [ ] ブレークポイントの設定
- [ ] DOM状態の確認
- [ ] ネットワークリクエストの確認
- [ ] 状態管理の確認
- [ ] コンソールログの確認

---

このガイドを参考に、効果的なテストとデバッグを実践してください！
