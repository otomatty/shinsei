# Storybook Guide - suite-base

## 📋 概要

このガイドでは、`@lichtblick/suite-base`プロジェクトでのStorybookの活用方法について詳しく説明します。

## 🎯 Storybookの目的

### Lichtblick SuiteでのStorybook活用

- **コンポーネント開発**: 独立した環境でのコンポーネント開発
- **デザインシステム**: 一貫したUIコンポーネントライブラリ
- **ドキュメンテーション**: コンポーネントの使用方法とAPI
- **テスト**: ビジュアルリグレッションテスト
- **コラボレーション**: デザイナーと開発者の連携

## 🚀 Storybook環境のセットアップ

### 起動コマンド

```bash
# Storybook開発サーバーの起動
yarn storybook

# アクセス: http://localhost:9009

# ビルド
yarn storybook:build

# ビルド結果の確認
open storybook-static/index.html
```

### 設定ファイル

```typescript
// .storybook/main.ts
import type { StorybookConfig } from "@storybook/react-webpack5";

const config: StorybookConfig = {
  stories: [
    "../packages/*/src/**/*.stories.@(js|jsx|ts|tsx|mdx)",
    "../packages/*/src/**/*.story.@(js|jsx|ts|tsx|mdx)",
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-actions",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
};

export default config;
```

## 📝 基本的なStoryの作成

### 1. シンプルなコンポーネントのStory

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    backgroundColor: { control: "color" },
    size: {
      control: { type: "select" },
      options: ["small", "medium", "large"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的なStory
export const Primary: Story = {
  args: {
    primary: true,
    label: "Button",
  },
};

export const Secondary: Story = {
  args: {
    label: "Button",
  },
};

export const Large: Story = {
  args: {
    size: "large",
    label: "Button",
  },
};

export const Small: Story = {
  args: {
    size: "small",
    label: "Button",
  },
};
```

### 2. 複雑なコンポーネントのStory

```typescript
// DataVisualization.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { DataVisualization } from "./DataVisualization";
import { generateMockData } from "../test/mockData";

const meta: Meta<typeof DataVisualization> = {
  title: "Panels/DataVisualization",
  component: DataVisualization,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "高性能なデータ可視化コンポーネント。大量のROSメッセージを効率的に表示します。",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100vw", height: "100vh", padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// 空データ状態
export const EmptyState: Story = {
  args: {
    data: [],
    loading: false,
    error: null,
  },
};

// ローディング状態
export const LoadingState: Story = {
  args: {
    data: [],
    loading: true,
    error: null,
  },
};

// エラー状態
export const ErrorState: Story = {
  args: {
    data: [],
    loading: false,
    error: "データの取得に失敗しました",
  },
};

// 通常データ
export const WithData: Story = {
  args: {
    data: generateMockData(100),
    loading: false,
    error: null,
  },
};

// 大量データ
export const LargeDataset: Story = {
  args: {
    data: generateMockData(10000),
    loading: false,
    error: null,
  },
  parameters: {
    docs: {
      description: {
        story: "大量データ（10,000件）でのパフォーマンステスト用",
      },
    },
  },
};

// リアルタイム更新シミュレーション
export const RealTimeUpdates: Story = {
  render: (args) => {
    const [data, setData] = useState(generateMockData(50));

    useEffect(() => {
      const interval = setInterval(() => {
        setData(prev => [
          ...prev.slice(-49), // 最新49件を保持
          generateMockDataPoint(), // 新しいデータを追加
        ]);
      }, 100); // 100ms間隔で更新

      return () => clearInterval(interval);
    }, []);

    return <DataVisualization {...args} data={data} />;
  },
  args: {
    loading: false,
    error: null,
  },
};
```

### 3. パネルコンポーネントのStory

```typescript
// MyPanel.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MockPanelExtensionContext } from "@lichtblick/suite-base/testing/MockPanelExtensionContext";
import { MyPanel } from "./MyPanel";

const meta: Meta<typeof MyPanel> = {
  title: "Panels/MyPanel",
  component: MyPanel,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "800px", height: "600px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// デフォルト設定
export const Default: Story = {
  render: () => {
    const context = new MockPanelExtensionContext();
    context.initialState = {
      path: "",
      title: "My Panel",
      showTimestamp: true,
    };

    return <MyPanel context={context} />;
  },
};

// データ表示
export const WithData: Story = {
  render: () => {
    const context = new MockPanelExtensionContext();
    context.initialState = {
      path: "/robot/status",
      title: "Robot Status",
      showTimestamp: true,
    };

    // モックデータの設定
    context.mockRender({
      currentFrame: new Map([
        ["/robot/status", [{
          message: {
            battery: 85,
            status: "running",
            timestamp: Date.now() / 1000
          }
        }]]
      ]),
    });

    return <MyPanel context={context} />;
  },
};

// エラー状態
export const ErrorState: Story = {
  render: () => {
    const context = new MockPanelExtensionContext();
    context.initialState = {
      path: "invalid.path.format",
      title: "Error Panel",
      showTimestamp: true,
    };

    return <MyPanel context={context} />;
  },
};
```

## 🎨 テーマとスタイリング

### Material-UIテーマの適用

```typescript
// .storybook/preview.ts
import type { Preview } from "@storybook/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme } from "@lichtblick/theme";

const theme = createTheme("dark");

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        {
          name: "light",
          value: "#ffffff",
        },
        {
          name: "dark",
          value: "#1a1a1a",
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
```

### テーマ切り替え対応

```typescript
// ThemeableComponent.stories.tsx
export const LightTheme: Story = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={createTheme("light")}>
        <CssBaseline />
        <div style={{ padding: "1rem", backgroundColor: "#fff" }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  args: {
    // story args
  },
};

export const DarkTheme: Story = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={createTheme("dark")}>
        <CssBaseline />
        <div style={{ padding: "1rem", backgroundColor: "#1a1a1a" }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  args: {
    // story args
  },
};
```

## 🔧 高度なStorybook機能

### 1. Controls（コントロール）の活用

```typescript
// AdvancedControls.stories.tsx
const meta: Meta<typeof AdvancedComponent> = {
  title: "Advanced/Controls",
  component: AdvancedComponent,
  argTypes: {
    // 色選択
    color: {
      control: "color",
      description: "コンポーネントのテーマカラー",
    },

    // セレクトボックス
    variant: {
      control: "select",
      options: ["primary", "secondary", "error", "warning"],
      description: "コンポーネントのバリアント",
    },

    // 数値範囲
    size: {
      control: { type: "range", min: 10, max: 100, step: 5 },
      description: "コンポーネントのサイズ",
    },

    // オブジェクト
    config: {
      control: "object",
      description: "詳細設定オブジェクト",
    },

    // 配列
    items: {
      control: "array",
      description: "表示するアイテムのリスト",
    },

    // ラジオボタン
    alignment: {
      control: "inline-radio",
      options: ["left", "center", "right"],
      description: "テキストの配置",
    },

    // チェックボックス
    features: {
      control: "inline-check",
      options: ["feature1", "feature2", "feature3"],
      description: "有効にする機能",
    },
  },
};
```

### 2. Actions（アクション）の活用

```typescript
// InteractiveComponent.stories.tsx
export const InteractiveExample: Story = {
  args: {
    onClick: action("clicked"),
    onMouseEnter: action("mouse-enter"),
    onMouseLeave: action("mouse-leave"),
    onFocus: action("focused"),
    onBlur: action("blurred"),
    onChange: action("value-changed"),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");

    // 自動的にインタラクションをテスト
    await userEvent.click(button);
    await userEvent.hover(button);
    await userEvent.unhover(button);
  },
};
```

### 3. Docs（ドキュメント）の充実

```typescript
// DocumentedComponent.stories.tsx
const meta: Meta<typeof DocumentedComponent> = {
  title: "Components/DocumentedComponent",
  component: DocumentedComponent,
  parameters: {
    docs: {
      description: {
        component: `
# DocumentedComponent

このコンポーネントは以下の機能を提供します：

- 高性能なデータ表示
- カスタマイズ可能なテーマ
- アクセシビリティ対応

## 使用例

\`\`\`tsx
<DocumentedComponent
  data={myData}
  variant="primary"
  onUpdate={handleUpdate}
/>
\`\`\`

## パフォーマンス考慮事項

大量データを扱う場合は、\`virtualScroll\` オプションを有効にしてください。
        `,
      },
    },
  },
};

export const BasicUsage: Story = {
  args: {
    data: generateMockData(10),
  },
  parameters: {
    docs: {
      description: {
        story: "基本的な使用方法の例。少量のデータを表示します。",
      },
    },
  },
};

export const PerformanceOptimized: Story = {
  args: {
    data: generateMockData(10000),
    virtualScroll: true,
  },
  parameters: {
    docs: {
      description: {
        story: `
大量データのパフォーマンス最適化例。

**特徴:**
- 仮想スクロール有効
- 10,000件のデータ
- 60fps での滑らかな操作
        `,
      },
    },
  },
};
```

### 4. Decorators（デコレーター）の活用

```typescript
// decorators.ts
export const PanelDecorator: Decorator = (Story, context) => {
  return (
    <div
      style={{
        width: "800px",
        height: "600px",
        border: "1px solid #ccc",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <Story />
    </div>
  );
};

export const DataProviderDecorator: Decorator = (Story, context) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    // データの非同期ロード
    loadMockData().then(setData);
  }, []);

  return (
    <DataContext.Provider value={{ data, setData }}>
      <Story />
    </DataContext.Provider>
  );
};

// 使用例
export const WithDecorators: Story = {
  decorators: [PanelDecorator, DataProviderDecorator],
  args: {
    // story args
  },
};
```

## 🧪 テストとの連携

### 1. Visual Regression Testing

```typescript
// VisualTest.stories.tsx
export const VisualBaseline: Story = {
  args: {
    data: FIXED_MOCK_DATA, // 固定データでビジュアルの一貫性を確保
  },
  parameters: {
    // Chromatic用設定
    chromatic: {
      viewports: [320, 768, 1200],
      delay: 1000, // アニメーション完了を待つ
    },
  },
};

export const VisualError: Story = {
  args: {
    error: "Test error message",
  },
  parameters: {
    chromatic: {
      diffThreshold: 0.1, // より厳密な比較
    },
  },
};
```

### 2. Interaction Testing

```typescript
// InteractionTest.stories.tsx
import { expect } from "@storybook/jest";
import { userEvent, within } from "@storybook/testing-library";

export const UserInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // ボタンをクリック
    const button = canvas.getByRole("button", { name: "Submit" });
    await userEvent.click(button);

    // フォーム入力
    const input = canvas.getByLabelText("Username");
    await userEvent.type(input, "testuser");

    // 結果を確認
    await expect(canvas.getByText("Welcome, testuser!")).toBeInTheDocument();
  },
};
```

### 3. アクセシビリティテスト

```typescript
// AccessibilityTest.stories.tsx
export const AccessibleComponent: Story = {
  args: {
    "aria-label": "Data visualization chart",
    "aria-describedby": "chart-description",
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: "color-contrast",
            enabled: true,
          },
          {
            id: "focus-trap",
            enabled: true,
          },
        ],
      },
    },
  },
};
```

## 📊 パフォーマンス測定

### Storybook内でのパフォーマンス測定

```typescript
// PerformanceStory.stories.tsx
export const PerformanceBenchmark: Story = {
  render: (args) => {
    const [renderTime, setRenderTime] = useState(0);
    const startTimeRef = useRef(0);

    useLayoutEffect(() => {
      startTimeRef.current = performance.now();
    });

    useEffect(() => {
      const endTime = performance.now();
      setRenderTime(endTime - startTimeRef.current);
    });

    return (
      <div>
        <div style={{ marginBottom: "1rem" }}>
          Render time: {renderTime.toFixed(2)}ms
        </div>
        <MyComponent {...args} />
      </div>
    );
  },
  args: {
    data: generateLargeDataset(10000),
  },
};
```

## 📚 組織化とメンテナンス

### 1. Story構成のベストプラクティス

```
stories/
├── foundations/          # 基礎要素
│   ├── Colors.stories.tsx
│   ├── Typography.stories.tsx
│   └── Spacing.stories.tsx
├── components/           # 一般的なコンポーネント
│   ├── Button.stories.tsx
│   ├── Input.stories.tsx
│   └── Card.stories.tsx
├── panels/              # パネル固有
│   ├── DataPanel.stories.tsx
│   ├── ChartPanel.stories.tsx
│   └── MapPanel.stories.tsx
└── patterns/            # 使用パターン
    ├── Forms.stories.tsx
    ├── Layouts.stories.tsx
    └── Navigation.stories.tsx
```

### 2. 共通モックデータの管理

```typescript
// stories/mockData.ts
export const MOCK_ROBOT_STATUS = {
  battery: 85,
  status: "operational",
  position: { x: 10, y: 20, z: 0 },
  timestamp: 1640995200,
};

export const MOCK_SENSOR_DATA = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  value: Math.random() * 100,
  timestamp: Date.now() + i * 1000,
}));

export function generateMockTopicData(topicName: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    topic: topicName,
    receiveTime: { sec: Math.floor(Date.now() / 1000), nsec: 0 },
    message: {
      seq: i,
      data: Math.random() * 100,
    },
  }));
}
```

### 3. 再利用可能なDecorator

```typescript
// stories/decorators.ts
export const withMockContext: Decorator = (Story) => {
  const mockContext = new MockPanelExtensionContext();

  return (
    <PanelExtensionContextProvider value={mockContext}>
      <Story />
    </PanelExtensionContextProvider>
  );
};

export const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Story />
    </ThemeProvider>
  );
};
```

## 🚀 本番運用での活用

### 1. 継続的インテグレーション

```yaml
# .github/workflows/storybook.yml
name: Storybook Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: yarn install

      - name: Build Storybook
        run: yarn storybook:build

      - name: Visual Regression Test
        run: yarn chromatic --project-token=${{ secrets.CHROMATIC_TOKEN }}

      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./storybook-static
```

### 2. チーム内での活用

```typescript
// stories/README.stories.mdx
import { Meta } from "@storybook/addon-docs";

<Meta title="Welcome/README" />

# Lichtblick Suite Storybook

## 開発者向けガイド

### 新しいコンポーネントを追加する場合

1. コンポーネントファイル（`.tsx`）を作成
2. Storyファイル（`.stories.tsx`）を作成
3. 最低限以下のStoryを含める：
   - Default
   - With Data
   - Error State
   - Loading State

### デザイナー向けガイド

- **Colors**: 使用可能な色の一覧
- **Typography**: フォントとサイズの定義
- **Components**: 各コンポーネントの見た目と動作

### QA向けガイド

- **Panels**: 各パネルの機能確認
- **Interactions**: ユーザーインタラクションのテスト
- **Accessibility**: アクセシビリティ要件の確認
```

## 🎯 まとめ

### Storybookのメリット

1. **独立した開発環境**: コンポーネントを単体でテスト
2. **ドキュメント自動生成**: コードと同期したドキュメント
3. **ビジュアルテスト**: UIの一貫性を自動で確認
4. **チームコラボレーション**: デザイナーと開発者の連携強化

### 推奨ワークフロー

1. **コンポーネント設計** → Storybookでプロトタイプ作成
2. **実装** → Storyでテストしながら開発
3. **テスト** → Visual RegressionとInteraction Test
4. **ドキュメント** → 使用方法と設計意図を記録
5. **メンテナンス** → 継続的な更新と改善

---

このガイドを参考に、効果的なStorybookを活用してください！
