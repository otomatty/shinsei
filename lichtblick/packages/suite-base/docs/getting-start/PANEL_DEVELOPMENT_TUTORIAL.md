# Panel Development Tutorial - suite-base

## 📋 概要

このチュートリアルでは、`@lichtblick/suite-base`で新しいパネルを一から作成する方法を詳しく説明します。

## 🎯 学習目標

- パネルアーキテクチャの理解
- 新規パネルの実装手順
- 設定システムの活用
- テストとストーリーの作成

## 🏗️ パネルアーキテクチャ概要

### パネルの構成要素

```
MyPanel/
├── index.tsx                 # エントリーポイント・パネル登録
├── MyPanel.tsx              # メインコンポーネント
├── types.ts                 # 型定義
├── settings.ts              # 設定ツリー定義
├── constants.ts             # 定数定義
├── MyPanel.style.ts         # スタイル定義
├── MyPanel.test.tsx         # テスト
├── index.stories.tsx        # Storybook
└── thumbnail.png            # パネルサムネイル
```

### パネルのライフサイクル

```
1. パネル登録 (index.ts)
2. 初期化 (initPanel)
3. 設定ロード (context.initialState)
4. データ監視 (context.watch)
5. レンダリング (onRender)
6. 設定更新 (updatePanelSettingsEditor)
7. アンマウント (unsubscribeAll)
```

## 🚀 Step-by-Step チュートリアル

### Step 1: プロジェクト構造の準備

```bash
# パネルディレクトリを作成
mkdir packages/suite-base/src/panels/MyCustomPanel
cd packages/suite-base/src/panels/MyCustomPanel
```

### Step 2: 型定義の作成

```typescript
// types.ts
export interface MyCustomPanelConfig {
  path: string;
  title: string;
  color: string;
  showTimestamp: boolean;
}

export interface MyCustomPanelProps {
  context: PanelExtensionContext;
}

export interface MyCustomPanelState {
  config: MyCustomPanelConfig;
  latestData: unknown;
  error?: string;
}
```

### Step 3: 定数の定義

```typescript
// constants.ts
import { MyCustomPanelConfig } from "./types";

export const DEFAULT_CONFIG: MyCustomPanelConfig = {
  path: "",
  title: "My Custom Panel",
  color: "#1976d2",
  showTimestamp: true,
};

export const PANEL_TYPE = "MyCustomPanel";
```

### Step 4: メインコンポーネントの実装

```typescript
// MyCustomPanel.tsx
import { Typography, Paper } from "@mui/material";
import { useCallback, useEffect, useState, useReducer } from "react";

import { parseMessagePath } from "@lichtblick/message-path";
import { SettingsTreeAction, PanelExtensionContext } from "@lichtblick/suite";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useStyles } from "./MyCustomPanel.style";
import { DEFAULT_CONFIG } from "./constants";
import { settingsActionReducer, useSettingsTree } from "./settings";
import { MyCustomPanelConfig, MyCustomPanelProps } from "./types";

export function MyCustomPanel({ context }: MyCustomPanelProps): React.JSX.Element {
  // レンダリング完了コールバック
  const [renderDone, setRenderDone] = useState<() => void>(() => () => {});

  // パネル設定の状態管理
  const [config, setConfig] = useState(() => ({
    ...DEFAULT_CONFIG,
    ...(context.initialState as Partial<MyCustomPanelConfig>),
  }));

  // データの状態管理
  const [latestData, setLatestData] = useState<unknown>();
  const [error, setError] = useState<string>();

  // スタイル
  const { classes } = useStyles({ color: config.color });

  // 設定の保存と初期化
  useEffect(() => {
    context.saveState(config);
    context.setDefaultPanelTitle(config.title);
  }, [config, context]);

  // データ監視の設定
  useEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);

      // メッセージフレームの処理
      if (renderState.currentFrame && config.path) {
        try {
          const parsedPath = parseMessagePath(config.path);
          if (parsedPath?.topicName) {
            const messages = renderState.currentFrame.get(parsedPath.topicName);
            if (messages && messages.length > 0) {
              setLatestData(messages[messages.length - 1]?.message);
              setError(undefined);
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    };

    // 監視する項目を設定
    context.watch("currentFrame");
    context.watch("didSeek");

    return () => {
      context.onRender = undefined;
    };
  }, [context, config.path]);

  // トピック購読の管理
  useEffect(() => {
    if (config.path) {
      try {
        const parsedPath = parseMessagePath(config.path);
        if (parsedPath?.topicName) {
          context.subscribe([{ topic: parsedPath.topicName, preload: false }]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid path");
      }
    }
    return () => {
      context.unsubscribeAll();
    };
  }, [context, config.path]);

  // 設定ツリーの処理
  const settingsActionHandler = useCallback(
    (action: SettingsTreeAction) => {
      setConfig((prevConfig) => settingsActionReducer(prevConfig, action));
    },
    [],
  );

  const settingsTree = useSettingsTree(config, error);
  useEffect(() => {
    context.updatePanelSettingsEditor({
      actionHandler: settingsActionHandler,
      nodes: settingsTree,
    });
  }, [context, settingsActionHandler, settingsTree]);

  // レンダリング完了の通知
  useEffect(() => {
    renderDone();
  }, [renderDone]);

  // レンダリング
  return (
    <Stack fullHeight className={classes.container}>
      <Paper className={classes.paper}>
        <Typography variant="h6" className={classes.title}>
          {config.title}
        </Typography>

        {error ? (
          <Typography color="error">{error}</Typography>
        ) : latestData ? (
          <Stack spacing={2}>
            <Typography variant="body1">
              Data: {JSON.stringify(latestData, null, 2)}
            </Typography>
            {config.showTimestamp && (
              <Typography variant="caption">
                Timestamp: {new Date().toISOString()}
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography color="text.secondary">
            No data available. Please set a valid path in settings.
          </Typography>
        )}
      </Paper>
    </Stack>
  );
}
```

### Step 5: スタイル定義の作成

```typescript
// MyCustomPanel.style.ts
import { makeStyles } from "tss-react/mui";

export const useStyles = makeStyles<{ color: string }>()((theme, { color }) => ({
  container: {
    padding: theme.spacing(1),
  },
  paper: {
    padding: theme.spacing(2),
    height: "100%",
    borderLeft: `4px solid ${color}`,
  },
  title: {
    color: color,
    marginBottom: theme.spacing(2),
  },
}));
```

### Step 6: 設定システムの実装

```typescript
// settings.ts
import { useMemo } from "react";

import { SettingsTreeAction, SettingsTreeNode } from "@lichtblick/suite";

import { MyCustomPanelConfig } from "./types";

export function settingsActionReducer(
  config: MyCustomPanelConfig,
  action: SettingsTreeAction,
): MyCustomPanelConfig {
  if (action.action === "update") {
    const { path, value } = action.payload;
    return { ...config, [path[0]!]: value };
  }
  return config;
}

export function useSettingsTree(
  config: MyCustomPanelConfig,
  error?: string,
): SettingsTreeNode {
  return useMemo(
    (): SettingsTreeNode => ({
      label: "Settings",
      fields: {
        path: {
          label: "Topic Path",
          input: "messagepath",
          value: config.path,
          error: error,
          help: "Path to the topic/field to display",
        },
        title: {
          label: "Panel Title",
          input: "string",
          value: config.title,
          help: "Display title for the panel",
        },
        color: {
          label: "Theme Color",
          input: "rgb",
          value: config.color,
          help: "Color theme for the panel",
        },
        showTimestamp: {
          label: "Show Timestamp",
          input: "boolean",
          value: config.showTimestamp,
          help: "Display timestamp of the data",
        },
      },
    }),
    [config, error],
  );
}
```

### Step 7: エントリーポイントの作成

```typescript
// index.tsx
import { useMemo } from "react";

import { useCrash } from "@lichtblick/hooks";
import { PanelExtensionContext } from "@lichtblick/suite";
import { CaptureErrorBoundary } from "@lichtblick/suite-base/components/CaptureErrorBoundary";
import Panel from "@lichtblick/suite-base/components/Panel";
import { PanelExtensionAdapter } from "@lichtblick/suite-base/components/PanelExtensionAdapter";
import { createSyncRoot } from "@lichtblick/suite-base/panels/createSyncRoot";
import ThemeProvider from "@lichtblick/suite-base/theme/ThemeProvider";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

import { PANEL_TYPE, DEFAULT_CONFIG } from "./constants";
import { MyCustomPanel } from "./MyCustomPanel";
import { MyCustomPanelConfig } from "./types";

function initPanel(crash: ReturnType<typeof useCrash>, context: PanelExtensionContext) {
  return createSyncRoot(
    <CaptureErrorBoundary onError={crash}>
      <ThemeProvider isDark>
        <MyCustomPanel context={context} />
      </ThemeProvider>
    </CaptureErrorBoundary>,
    context.panelElement,
  );
}

type MyCustomPanelAdapterProps = {
  config: MyCustomPanelConfig;
  saveConfig: SaveConfig<MyCustomPanelConfig>;
};

function MyCustomPanelAdapter({ config, saveConfig }: MyCustomPanelAdapterProps) {
  const crash = useCrash();
  const boundInitPanel = useMemo(() => initPanel.bind(undefined, crash), [crash]);

  return (
    <PanelExtensionAdapter
      config={config}
      saveConfig={saveConfig}
      initPanel={boundInitPanel}
      highestSupportedConfigVersion={1}
    />
  );
}

export default Panel(
  Object.assign(MyCustomPanelAdapter, {
    panelType: PANEL_TYPE,
    defaultConfig: DEFAULT_CONFIG,
  }),
);
```

### Step 8: テストの作成

```typescript
// MyCustomPanel.test.tsx
import { render, screen } from "@testing-library/react";
import { MockPanelExtensionContext } from "@lichtblick/suite-base/testing/MockPanelExtensionContext";

import { MyCustomPanel } from "./MyCustomPanel";
import { DEFAULT_CONFIG } from "./constants";

describe("MyCustomPanel", () => {
  let mockContext: MockPanelExtensionContext;

  beforeEach(() => {
    mockContext = new MockPanelExtensionContext();
    mockContext.initialState = DEFAULT_CONFIG;
  });

  afterEach(() => {
    mockContext.cleanup();
  });

  it("should render with default config", () => {
    render(<MyCustomPanel context={mockContext} />);

    expect(screen.getByText(DEFAULT_CONFIG.title)).toBeInTheDocument();
    expect(screen.getByText("No data available. Please set a valid path in settings.")).toBeInTheDocument();
  });

  it("should handle error state", () => {
    mockContext.initialState = {
      ...DEFAULT_CONFIG,
      path: "invalid_path",
    };

    render(<MyCustomPanel context={mockContext} />);

    // エラーが表示されることを確認
    expect(screen.getByText(/Invalid path/)).toBeInTheDocument();
  });

  it("should display data when available", () => {
    const mockData = { value: 42, status: "ok" };
    mockContext.initialState = {
      ...DEFAULT_CONFIG,
      path: "/test_topic.value",
    };

    render(<MyCustomPanel context={mockContext} />);

    // モックデータを送信
    mockContext.mockRender({
      currentFrame: new Map([["/test_topic", [{ message: mockData }]]]),
    });

    expect(screen.getByText(/Data:/)).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });
});
```

### Step 9: Storybookの作成

```typescript
// index.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";

import { MockPanelExtensionContext } from "@lichtblick/suite-base/testing/MockPanelExtensionContext";

import { MyCustomPanel } from "./MyCustomPanel";
import { DEFAULT_CONFIG } from "./constants";

const meta: Meta<typeof MyCustomPanel> = {
  title: "Panels/MyCustomPanel",
  component: MyCustomPanel,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof MyCustomPanel>;

export const Default: Story = {
  render: () => {
    const context = new MockPanelExtensionContext();
    context.initialState = DEFAULT_CONFIG;

    return <MyCustomPanel context={context} />;
  },
};

export const WithData: Story = {
  render: () => {
    const context = new MockPanelExtensionContext();
    context.initialState = {
      ...DEFAULT_CONFIG,
      path: "/test_topic.value",
    };

    // モックデータを設定
    context.mockRender({
      currentFrame: new Map([["/test_topic", [{
        message: { value: 42, status: "active" }
      }]]]),
    });

    return <MyCustomPanel context={context} />;
  },
};

export const WithError: Story = {
  render: () => {
    const context = new MockPanelExtensionContext();
    context.initialState = {
      ...DEFAULT_CONFIG,
      path: "invalid_path",
    };

    return <MyCustomPanel context={context} />;
  },
};
```

### Step 10: パネル登録

```typescript
// packages/suite-base/src/panels/index.ts に追加
export { default as MyCustomPanel } from "./MyCustomPanel";
```

```typescript
// packages/suite-base/src/panels/index.ts の末尾に追加
export const panelsByType = {
  // ... existing panels
  MyCustomPanel,
};
```

## 🔧 高度な機能の実装

### カスタムフックの作成

```typescript
// useMyCustomPanelData.ts
import { useCallback, useEffect, useState } from "react";
import { parseMessagePath } from "@lichtblick/message-path";
import { PanelExtensionContext } from "@lichtblick/suite";

export function useMyCustomPanelData(context: PanelExtensionContext, path: string) {
  const [latestData, setLatestData] = useState<unknown>();
  const [error, setError] = useState<string>();

  const processData = useCallback((renderState: any) => {
    if (!path) return;

    try {
      const parsedPath = parseMessagePath(path);
      if (parsedPath?.topicName && renderState.currentFrame) {
        const messages = renderState.currentFrame.get(parsedPath.topicName);
        if (messages && messages.length > 0) {
          setLatestData(messages[messages.length - 1]?.message);
          setError(undefined);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [path]);

  useEffect(() => {
    context.onRender = (renderState, done) => {
      processData(renderState);
      done();
    };

    return () => {
      context.onRender = undefined;
    };
  }, [context, processData]);

  return { latestData, error };
}
```

### パフォーマンス最適化

```typescript
// MyCustomPanel.tsx での最適化例
import React, { memo, useMemo, useCallback } from "react";

export const MyCustomPanel = memo(({ context }: MyCustomPanelProps) => {
  // 重い計算をmemoize
  const processedData = useMemo(() => {
    if (!latestData) return null;
    return expensiveDataProcessing(latestData);
  }, [latestData]);

  // コールバック関数をmemoize
  const handleSettingsUpdate = useCallback((action: SettingsTreeAction) => {
    setConfig((prev) => settingsActionReducer(prev, action));
  }, []);

  // ... rest of component
});
```

## 🎯 ベストプラクティス

### 1. エラーハンドリング

```typescript
// 適切なエラーハンドリング
try {
  const parsedPath = parseMessagePath(config.path);
  // 処理
} catch (error) {
  setError(error instanceof Error ? error.message : "Parsing failed");
}
```

### 2. メモリリーク防止

```typescript
// useEffect での適切なクリーンアップ
useEffect(() => {
  const subscription = context.subscribe([{ topic: "test" }]);

  return () => {
    context.unsubscribeAll();
  };
}, [context]);
```

### 3. アクセシビリティ

```typescript
// アクセシブルなコンポーネント
<button
  aria-label="Toggle data display"
  onClick={handleToggle}
>
  {isVisible ? "Hide" : "Show"} Data
</button>
```

### 4. 型安全性

```typescript
// 厳密な型定義
interface StrictConfig {
  readonly path: string;
  readonly settings: Readonly<{
    showTimestamp: boolean;
    color: string;
  }>;
}
```

## 🧪 テスト戦略

### 単体テスト

```typescript
describe("MyCustomPanel", () => {
  it("should handle message updates", async () => {
    const { mockContext } = setupTest();
    render(<MyCustomPanel context={mockContext} />);

    // データ更新をテスト
    await act(() => {
      mockContext.mockRender({
        currentFrame: new Map([["topic", [{ message: testData }]]]),
      });
    });

    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
```

### 統合テスト

```typescript
describe("MyCustomPanel Integration", () => {
  it("should work with real message pipeline", async () => {
    const context = createTestContext();
    render(<MyCustomPanel context={context} />);

    // 実際のメッセージパイプラインでテスト
    await waitFor(() => {
      expect(screen.getByTestId("data-display")).toHaveTextContent("expected");
    });
  });
});
```

## 📊 デバッグとトラブルシューティング

### よくある問題

1. **データが表示されない**
   - トピック購読の確認
   - パスの構文確認
   - メッセージ形式の確認

2. **設定が保存されない**
   - `context.saveState(config)` の呼び出し確認
   - 設定ツリーの構造確認

3. **パフォーマンス問題**
   - 不要な再レンダリングの確認
   - メモ化の適用
   - 重い処理の最適化

### デバッグ方法

```typescript
// デバッグ用のログ出力
useEffect(() => {
  console.log("Config updated:", config);
  console.log("Latest data:", latestData);
}, [config, latestData]);
```

## 🚀 デプロイ前チェックリスト

- [ ] すべてのテストがパス
- [ ] Storybookで動作確認
- [ ] TypeScript エラーなし
- [ ] ESLint エラーなし
- [ ] パフォーマンステスト完了
- [ ] アクセシビリティテスト完了
- [ ] ドキュメント更新

## 📚 参考リソース

- [既存パネル実装例](./Indicator/)
- [Panel API ドキュメント](../types/panels.ts)
- [Setting Tree システム](../components/SettingsTreeEditor/)
- [メッセージパス解析](../util/messagePathParsing.ts)

---

このチュートリアルを参考に、効果的なパネル開発を行ってください！
