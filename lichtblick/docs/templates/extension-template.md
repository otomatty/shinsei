# Lichtblick 拡張機能テンプレート

このテンプレートは、Lichtblick拡張機能開発の標準的な構造とベストプラクティスを提供します。

## 📋 プロジェクト構造

```
my-extension/
├── package.json                 # プロジェクトメタデータ
├── tsconfig.json               # TypeScript設定
├── .eslintrc.yaml              # ESLint設定
├── .prettierrc.yaml            # Prettier設定
├── jest.config.json            # Jest設定
├── README.md                   # プロジェクト説明
├── CHANGELOG.md                # 変更履歴
├── LICENSE                     # ライセンス
│
├── src/                        # ソースコード
│   ├── index.ts               # エントリーポイント
│   ├── components/            # Reactコンポーネント
│   │   ├── MyPanel.tsx
│   │   └── shared/
│   ├── hooks/                 # カスタムフック
│   ├── types/                 # 型定義
│   ├── utils/                 # ユーティリティ関数
│   └── __tests__/             # テストファイル
│
├── assets/                     # 静的アセット
│   ├── icons/
│   ├── images/
│   └── models/
│
└── docs/                      # ドキュメント
    ├── README.md
    ├── API.md
    └── examples/
```

## 🚀 クイックスタート

### 1. プロジェクト初期化

```bash
# create-lichtblick-extension を使用
npm init lichtblick-extension@latest my-extension
cd my-extension
npm install
```

### 2. 基本設定

#### package.json

```json
{
  "name": "my-extension",
  "displayName": "My Custom Extension",
  "description": "A description of what this extension does",
  "publisher": "Your Name/Organization",
  "version": "0.1.0",
  "license": "MIT",
  "keywords": ["lichtblick", "extension", "robotics", "visualization"],
  "main": "./dist/extension.js",
  "scripts": {
    "build": "lichtblick-extension build",
    "lint": "eslint .",
    "lint:fix": "eslint --fix .",
    "test": "jest",
    "test:watch": "jest --watch",
    "local-install": "lichtblick-extension install",
    "package": "lichtblick-extension package"
  }
}
```

### 3. エントリーポイント実装

#### src/index.ts

```typescript
/**
 * My Extension
 *
 * DEPENDENCY MAP:
 *
 * Dependencies (依存先):
 *   ├─ @lichtblick/suite (ExtensionContext)
 *   ├─ ./components/MyPanel
 *   └─ ./types/
 *
 * Related Files:
 *   ├─ Spec: ./index.spec.md
 *   ├─ Tests: src/__tests__/index.test.ts
 *   └─ Config: package.json
 */

import { ExtensionContext } from "@lichtblick/suite";

import { initMyPanel } from "./components/MyPanel";
import { initMyMessageConverter } from "./converters/MyConverter";

export function activate(extensionContext: ExtensionContext): void {
  try {
    console.log("[My Extension] Activating extension...");

    // パネル登録
    extensionContext.registerPanel({
      name: "My Custom Panel",
      initPanel: initMyPanel,
    });

    // MessageConverter登録（オプション）
    if (initMyMessageConverter) {
      extensionContext.registerMessageConverter(initMyMessageConverter());
    }

    console.log("[My Extension] Successfully activated");
  } catch (error) {
    console.error("[My Extension] Failed to activate:", error);
    throw error;
  }
}
```

## 🎨 パネルコンポーネント実装

### 基本パネル

#### src/components/MyPanel.tsx

```typescript
/**
 * MyPanel Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用元):
 *   └─ src/index.ts
 *
 * Dependencies (依存先):
 *   ├─ @lichtblick/suite (PanelExtensionContext, Topic, MessageEvent)
 *   ├─ react (useState, useLayoutEffect)
 *   ├─ react-dom/client (createRoot)
 *   └─ ../hooks/useMyCustomHook
 *
 * Related Files:
 *   ├─ Spec: ./MyPanel.spec.md
 *   ├─ Tests: src/__tests__/MyPanel.test.tsx
 *   └─ Styles: ./MyPanel.module.css
 */

import { PanelExtensionContext, Topic, MessageEvent } from "@lichtblick/suite";
import { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { useMyCustomHook } from "../hooks/useMyCustomHook";
import { MyPanelConfig, MyMessageType } from "../types";

interface MyPanelProps {
  context: PanelExtensionContext;
}

function MyPanel({ context }: MyPanelProps): JSX.Element {
  // 状態管理
  const [topics, setTopics] = useState<Topic[]>();
  const [messages, setMessages] = useState<MessageEvent<MyMessageType>[]>();
  const [config, setConfig] = useState<MyPanelConfig>();
  const [error, setError] = useState<string>();

  // カスタムフック
  const { processedData, analytics } = useMyCustomHook(messages);

  // レンダリングハンドラー
  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      try {
        // 状態更新
        setTopics(renderState.topics);
        setMessages(renderState.currentFrame as MessageEvent<MyMessageType>[]);
        setConfig(renderState.config as MyPanelConfig);
        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        done();
      }
    };

    // 監視対象設定
    context.watch("topics");
    context.watch("currentFrame");
    context.watch("config");

    // トピック購読
    context.subscribe([
      { topic: "/robot/status" },
      { topic: "/sensor/data" },
    ]);
  }, [context]);

  // エラー表示
  if (error) {
    return (
      <div style={{ padding: "1rem", color: "red" }}>
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", padding: "1rem", display: "flex", flexDirection: "column" }}>
      {/* ヘッダー */}
      <header style={{ marginBottom: "1rem" }}>
        <h2>My Custom Panel</h2>
        <div style={{ fontSize: "0.8rem", color: "#666" }}>
          Topics: {topics?.length || 0} |
          Messages: {messages?.length || 0} |
          Refresh Rate: {config?.refreshRate || 10}Hz
        </div>
      </header>

      {/* メインコンテンツ */}
      <main style={{ flex: 1, overflow: "auto" }}>
        {/* データ表示 */}
        <section style={{ marginBottom: "1rem" }}>
          <h3>Live Data</h3>
          {processedData ? (
            <div>
              <pre>{JSON.stringify(processedData, null, 2)}</pre>
            </div>
          ) : (
            <p>No data available</p>
          )}
        </section>

        {/* 分析結果 */}
        <section style={{ marginBottom: "1rem" }}>
          <h3>Analytics</h3>
          {analytics && (
            <div>
              <p>Average: {analytics.average.toFixed(2)}</p>
              <p>Count: {analytics.count}</p>
              <p>Trend: {analytics.trend}</p>
            </div>
          )}
        </section>

        {/* メッセージリスト */}
        <section>
          <h3>Recent Messages</h3>
          <div style={{ maxHeight: "200px", overflow: "auto" }}>
            {messages?.slice(-10).map((msg, idx) => (
              <div key={idx} style={{
                padding: "0.5rem",
                borderBottom: "1px solid #eee",
                fontSize: "0.8rem"
              }}>
                <strong>{msg.topic}</strong>: {JSON.stringify(msg.message)}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export function initMyPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<MyPanel context={context} />);

  return () => {
    root.unmount();
  };
}
```

### 高度なパネル（設定可能）

#### src/components/AdvancedPanel.tsx

```typescript
import { PanelExtensionContext, SettingsTree } from "@lichtblick/suite";
import { useLayoutEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";

interface AdvancedPanelConfig {
  refreshRate: number;
  showGrid: boolean;
  colorScheme: "light" | "dark" | "auto";
  dataFilters: Array<{
    field: string;
    operator: ">" | "<" | "=" | "!=";
    value: number | string;
  }>;
}

function AdvancedPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [config, setConfig] = useState<AdvancedPanelConfig>({
    refreshRate: 10,
    showGrid: true,
    colorScheme: "auto",
    dataFilters: [],
  });

  // 設定更新
  const updateConfig = useCallback((updates: Partial<AdvancedPanelConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    context.saveState(newConfig);
  }, [config, context]);

  // 設定スキーマの更新
  useLayoutEffect(() => {
    const settingsTree: SettingsTree = {
      general: {
        label: "General Settings",
        fields: {
          refreshRate: {
            label: "Refresh Rate (Hz)",
            input: "number",
            min: 1,
            max: 60,
            value: config.refreshRate,
          },
          showGrid: {
            label: "Show Grid",
            input: "boolean",
            value: config.showGrid,
          },
          colorScheme: {
            label: "Color Scheme",
            input: "select",
            options: [
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
              { label: "Auto", value: "auto" },
            ],
            value: config.colorScheme,
          },
        },
      },
      filters: {
        label: "Data Filters",
        fields: {
          // 動的フィールド生成
          ...Object.fromEntries(
            config.dataFilters.map((filter, idx) => [
              `filter_${idx}`,
              {
                label: `Filter ${idx + 1}`,
                input: "string",
                value: `${filter.field} ${filter.operator} ${filter.value}`,
              },
            ])
          ),
        },
      },
    };

    context.updatePanelSettingsEditor(settingsTree);
  }, [config, context]);

  // レンダリング処理
  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      if (renderState.config) {
        setConfig(renderState.config as AdvancedPanelConfig);
      }
      done();
    };

    context.watch("config");
  }, [context]);

  return (
    <div style={{
      height: "100%",
      backgroundColor: config.colorScheme === "dark" ? "#333" : "#fff",
      color: config.colorScheme === "dark" ? "#fff" : "#333"
    }}>
      <h2>Advanced Panel</h2>

      {/* 設定表示 */}
      <div>
        <p>Refresh Rate: {config.refreshRate}Hz</p>
        <p>Grid: {config.showGrid ? "On" : "Off"}</p>
        <p>Theme: {config.colorScheme}</p>
      </div>

      {/* フィルター表示 */}
      <div>
        <h3>Active Filters</h3>
        {config.dataFilters.map((filter, idx) => (
          <div key={idx}>
            {filter.field} {filter.operator} {filter.value}
          </div>
        ))}
      </div>
    </div>
  );
}

export function initAdvancedPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<AdvancedPanel context={context} />);
  return () => root.unmount();
}
```

## 🔄 MessageConverter実装

#### src/converters/MyConverter.ts

```typescript
/**
 * MyConverter
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用元):
 *   └─ src/index.ts
 *
 * Dependencies (依存先):
 *   ├─ @lichtblick/suite (RegisterMessageConverterArgs)
 *   └─ ../types/
 */

import { RegisterMessageConverterArgs } from "@lichtblick/suite";

import { MyInputMessage, MyOutputMessage } from "../types";

export function initMyMessageConverter(): RegisterMessageConverterArgs<MyInputMessage> {
  return {
    fromSchemaName: "custom_msgs/MyInput",
    toSchemaName: "std_msgs/MyOutput",
    converter: convertMessage,
  };
}

async function convertMessage(input: MyInputMessage): Promise<MyOutputMessage> {
  try {
    // 変換処理
    const converted: MyOutputMessage = {
      header: {
        stamp: input.timestamp,
        frame_id: input.source_id,
      },
      data: processCustomData(input.raw_data),
      metadata: {
        conversion_time: Date.now(),
        converter_version: "1.0.0",
      },
    };

    return converted;
  } catch (error) {
    console.error("Conversion failed:", error);

    // フォールバック
    return getDefaultMessage();
  }
}

function processCustomData(rawData: any): any {
  // カスタム処理ロジック
  return {
    processed: true,
    result: rawData,
  };
}

function getDefaultMessage(): MyOutputMessage {
  return {
    header: {
      stamp: { sec: 0, nanosec: 0 },
      frame_id: "default",
    },
    data: {},
    metadata: {
      conversion_time: Date.now(),
      converter_version: "1.0.0",
    },
  };
}
```

## 🎣 カスタムフック

#### src/hooks/useMyCustomHook.ts

```typescript
/**
 * useMyCustomHook
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用元):
 *   └─ src/components/MyPanel.tsx
 *
 * Dependencies (依存先):
 *   ├─ react (useState, useEffect, useMemo)
 *   └─ ../utils/analytics
 */

import { useState, useEffect, useMemo } from "react";
import { MessageEvent } from "@lichtblick/suite";

import { calculateAnalytics } from "../utils/analytics";
import { MyMessageType } from "../types";

interface AnalyticsResult {
  average: number;
  count: number;
  trend: "up" | "down" | "stable";
}

export function useMyCustomHook(messages?: MessageEvent<MyMessageType>[]) {
  const [processedData, setProcessedData] = useState<any>();
  const [analytics, setAnalytics] = useState<AnalyticsResult>();

  // データ処理
  useEffect(() => {
    if (!messages || messages.length === 0) {
      setProcessedData(undefined);
      return;
    }

    const latestMessage = messages[messages.length - 1];
    const processed = {
      timestamp: latestMessage.receiveTime,
      topic: latestMessage.topic,
      processedValue: latestMessage.message.value * 2, // 例: 2倍処理
    };

    setProcessedData(processed);
  }, [messages]);

  // 分析処理
  const analyticsResult = useMemo(() => {
    if (!messages || messages.length < 2) {
      return undefined;
    }

    return calculateAnalytics(messages.map((m) => m.message.value));
  }, [messages]);

  useEffect(() => {
    setAnalytics(analyticsResult);
  }, [analyticsResult]);

  return {
    processedData,
    analytics,
  };
}
```

## 📝 型定義

#### src/types/index.ts

```typescript
/**
 * Type definitions for My Extension
 */

export interface MyMessageType {
  value: number;
  timestamp: { sec: number; nanosec: number };
  metadata?: Record<string, unknown>;
}

export interface MyPanelConfig {
  refreshRate: number;
  showGrid: boolean;
  colorScheme: "light" | "dark" | "auto";
  customSettings?: Record<string, unknown>;
}

export interface MyInputMessage {
  timestamp: { sec: number; nanosec: number };
  source_id: string;
  raw_data: any;
}

export interface MyOutputMessage {
  header: {
    stamp: { sec: number; nanosec: number };
    frame_id: string;
  };
  data: any;
  metadata: {
    conversion_time: number;
    converter_version: string;
  };
}
```

## 🧪 テスト実装

#### src/**tests**/MyPanel.test.tsx

```typescript
/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { PanelExtensionContext } from "@lichtblick/suite";

import { initMyPanel } from "../components/MyPanel";

// モックコンテキスト
const createMockContext = (): Partial<PanelExtensionContext> => ({
  panelElement: document.createElement("div"),
  onRender: jest.fn(),
  watch: jest.fn(),
  subscribe: jest.fn(),
  saveState: jest.fn(),
});

describe("MyPanel", () => {
  let mockContext: Partial<PanelExtensionContext>;
  let cleanup: () => void;

  beforeEach(() => {
    mockContext = createMockContext();
    cleanup = initMyPanel(mockContext as PanelExtensionContext);
  });

  afterEach(() => {
    cleanup();
  });

  it("should render panel correctly", () => {
    expect(mockContext.watch).toHaveBeenCalledWith("topics");
    expect(mockContext.watch).toHaveBeenCalledWith("currentFrame");
    expect(mockContext.watch).toHaveBeenCalledWith("config");
    expect(mockContext.subscribe).toHaveBeenCalled();
  });

  it("should handle render state updates", () => {
    const mockRenderState = {
      topics: [{ name: "/test", schemaName: "test_msgs/Test" }],
      currentFrame: [],
      config: { refreshRate: 10 },
    };

    // onRenderコールバックをシミュレート
    const onRenderFn = (mockContext.onRender as jest.Mock).mock.calls[0][0];
    const doneFn = jest.fn();

    onRenderFn(mockRenderState, doneFn);

    expect(doneFn).toHaveBeenCalled();
  });
});
```

## 📚 ドキュメント

#### README.md

````markdown
# My Extension

Brief description of what this extension does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

1. Download the `.foxe` file
2. Open Lichtblick
3. Go to Extensions > Install Extension
4. Select the downloaded file

## Usage

Describe how to use the extension.

## Configuration

Explain available settings and configuration options.

## Development

```bash
npm install
npm run build
npm run local-install
```
````

## License

MIT

````

## 🔧 開発スクリプト

#### package.json scripts
```json
{
  "scripts": {
    "build": "lichtblick-extension build",
    "build:watch": "lichtblick-extension build --watch",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "local-install": "lichtblick-extension install",
    "package": "lichtblick-extension package",
    "clean": "rm -rf dist *.foxe",
    "dev": "npm run build:watch & npm run test:watch"
  }
}
````

## 🌟 ベストプラクティス

### 1. エラーハンドリング

- 必ずtry-catchを使用
- ユーザーフレンドリーなエラーメッセージ
- フォールバック処理の実装

### 2. パフォーマンス

- 重い処理は非同期で実行
- 適切なメモ化の使用
- リソースの適切なクリーンアップ

### 3. TypeScript活用

- 厳密な型定義
- インターフェースの活用
- 型安全な実装

### 4. テスト

- 単体テスト・統合テストの実装
- モックの適切な使用
- エッジケースのテスト

## 🔗 参考リンク

- [拡張機能開発ガイド](../rules/extension-development.md)
- [MessageConverterガイド](../rules/messageconverter-guide.md)
- [パネル拡張性について](../rules/panel-extensibility.md)
- [@lichtblick/suite API](https://github.com/Lichtblick-Suite/lichtblick/tree/main/packages/suite)
