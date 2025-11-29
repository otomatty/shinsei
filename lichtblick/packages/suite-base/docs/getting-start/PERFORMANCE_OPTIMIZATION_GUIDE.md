# Performance Optimization Guide - suite-base

## 📋 概要

このガイドでは、`@lichtblick/suite-base`パッケージでのパフォーマンス最適化の手法とベストプラクティスを説明します。

## 🎯 パフォーマンス最適化の重要性

### Lichtblick Suiteでのパフォーマンス要件

- **リアルタイム性**: ROSメッセージの即座な表示
- **大量データ処理**: 高頻度・大容量のセンサーデータ
- **複数パネル**: 同時に多数のパネルが動作
- **レスポンシブ性**: 60fps でのスムーズなUI
- **メモリ効率**: 長時間の連続動作

## 🚀 React パフォーマンス最適化

### 1. React.memo の適切な使用

```typescript
// ✅ 良い例 - プロパティが変更された時のみ再レンダリング
const ExpensiveComponent = React.memo(({ data, onUpdate }: Props) => {
  return (
    <div>
      {/* 重い計算やレンダリング */}
      {data.map(item => <ComplexItem key={item.id} item={item} />)}
    </div>
  );
});

// ✅ カスタム比較関数で細かい制御
const OptimizedComponent = React.memo(({ data, timestamp }: Props) => {
  return <div>{data.value}</div>;
}, (prevProps, nextProps) => {
  // timestamp以外の変更は無視
  return prevProps.data.value === nextProps.data.value;
});

// ❌ 悪い例 - 不要なmemo使用
const SimpleComponent = React.memo(({ label }: { label: string }) => {
  return <span>{label}</span>; // シンプルすぎてmemoの効果なし
});
```

### 2. useMemo による計算結果のキャッシュ

```typescript
// ✅ 良い例 - 重い計算をキャッシュ
function DataVisualization({ rawData, filters }: Props) {
  const processedData = useMemo(() => {
    return rawData
      .filter(filters.predicate)
      .map(transformDataPoint)
      .sort(sortByTimestamp); // 重い処理
  }, [rawData, filters.predicate]);

  const chartConfig = useMemo(() => ({
    datasets: processedData.map(createDataset),
    options: {
      responsive: true,
      animation: false, // アニメーション無効でパフォーマンス向上
    },
  }), [processedData]);

  return <Chart data={chartConfig} />;
}

// ❌ 悪い例 - 毎回計算実行
function BadDataVisualization({ rawData, filters }: Props) {
  // 毎回レンダリング時に重い計算が実行される
  const processedData = rawData.filter(filters.predicate).map(transformDataPoint);

  return <Chart data={processedData} />;
}
```

### 3. useCallback によるコールバック最適化

```typescript
// ✅ 良い例 - コールバック関数をキャッシュ
function ParentComponent({ items, onUpdate }: Props) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // コールバックをキャッシュして子コンポーネントの不要な再レンダリングを防ぐ
  const handleItemSelect = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const handleBatchUpdate = useCallback(() => {
    onUpdate(Array.from(selectedItems));
  }, [onUpdate, selectedItems]);

  return (
    <div>
      {items.map(item => (
        <ItemComponent
          key={item.id}
          item={item}
          isSelected={selectedItems.has(item.id)}
          onSelect={handleItemSelect} // 毎回同じ関数参照
        />
      ))}
      <button onClick={handleBatchUpdate}>Update Selected</button>
    </div>
  );
}
```

### 4. 仮想化リストによる大量データ処理

```typescript
// react-window を使用した仮想化リスト
import { FixedSizeList as List } from "react-window";

interface VirtualizedTopicListProps {
  topics: TopicInfo[];
  height: number;
}

function VirtualizedTopicList({ topics, height }: VirtualizedTopicListProps) {
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const topic = topics[index];
    return (
      <div style={style}>
        <TopicRow topic={topic} />
      </div>
    );
  }, [topics]);

  return (
    <List
      height={height}
      itemCount={topics.length}
      itemSize={35} // 固定行高
      overscanCount={5} // 画面外の予備描画数
    >
      {Row}
    </List>
  );
}

// AutoSizer で動的サイズ対応
import AutoSizer from "react-virtualized-auto-sizer";

function ResponsiveTopicList({ topics }: { topics: TopicInfo[] }) {
  return (
    <AutoSizer>
      {({ height, width }) => (
        <VirtualizedTopicList topics={topics} height={height} />
      )}
    </AutoSizer>
  );
}
```

## 🎨 スタイリングパフォーマンス

### 1. tss-react/mui の最適化

```typescript
// ✅ 良い例 - スタイルをキャッシュ
const useStyles = makeStyles<{ color: string; size: number }>()((theme, { color, size }) => ({
  container: {
    backgroundColor: color,
    width: size,
    height: size,
    // 複雑なスタイル計算
    transform: `scale(${size / 100})`,
    transition: theme.transitions.create(["transform"], {
      duration: theme.transitions.duration.shortest,
    }),
  },
  content: {
    padding: theme.spacing(1),
    // GPU加速のためのtransform使用
    transform: "translateZ(0)",
    willChange: "transform", // ブラウザにGPU使用をヒント
  },
}));

// ✅ 条件付きスタイルの最適化
const useConditionalStyles = makeStyles<{ isActive: boolean }>()((theme, { isActive }) => ({
  button: {
    // 条件付きスタイルをmakeStyles内で処理
    backgroundColor: isActive ? theme.palette.primary.main : theme.palette.grey[300],
    "&:hover": {
      backgroundColor: isActive ? theme.palette.primary.dark : theme.palette.grey[400],
    },
  },
}));
```

### 2. Material-UI最適化

```typescript
// ✅ 良い例 - アニメーション無効化
import { createTheme, ThemeProvider } from "@mui/material/styles";

const performanceTheme = createTheme({
  transitions: {
    // 重いアニメーションを無効化
    create: () => "none",
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true, // リップルエフェクト無効
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0, // 影の計算コスト削減
      },
    },
  },
});

// ❌ 悪い例 - sx プロパティの大量使用
<Box sx={{
  padding: 2,
  margin: 1,
  backgroundColor: 'primary.main',
  '&:hover': { backgroundColor: 'primary.dark' }
}}>
  {/* sx はランタイムでスタイル生成するため重い */}
</Box>
```

## 📊 データ処理最適化

### 1. メッセージパイプライン最適化

```typescript
// ✅ 良い例 - 効率的なデータ購読
function OptimizedPanel({ context }: PanelProps) {
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  // 必要なトピックのみ購読
  useEffect(() => {
    if (config.topicPath) {
      const topicName = parseMessagePath(config.topicPath)?.topicName;
      if (topicName && !subscriptions.includes(topicName)) {
        context.subscribe([{
          topic: topicName,
          preload: false, // 過去データの読み込みを避ける
          convertTo: "image/compressed", // データ変換指定
        }]);
        setSubscriptions(prev => [...prev, topicName]);
      }
    }
  }, [config.topicPath, context, subscriptions]);

  // バッチ処理で効率化
  const processMessages = useCallback((messages: MessageEvent[]) => {
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < messages.length; i += batchSize) {
      batches.push(messages.slice(i, i + batchSize));
    }

    // バッチごとに処理
    batches.forEach(batch => {
      const processedBatch = batch.map(transformMessage);
      updateDisplay(processedBatch);
    });
  }, []);
}
```

### 2. ダウンサンプリング

```typescript
// TimeBasedChart での効率的なダウンサンプリング
class PerformantDownsampler {
  private cache = new Map<string, DataPoint[]>();

  public downsample(
    data: DataPoint[],
    targetWidth: number,
    method: "minmax" | "average" = "minmax"
  ): DataPoint[] {
    const cacheKey = `${data.length}-${targetWidth}-${method}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result = method === "minmax"
      ? this.minMaxDownsample(data, targetWidth)
      : this.averageDownsample(data, targetWidth);

    // LRUキャッシュでメモリ管理
    this.cache.set(cacheKey, result);
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    return result;
  }

  private minMaxDownsample(data: DataPoint[], targetWidth: number): DataPoint[] {
    if (data.length <= targetWidth) return data;

    const bucketSize = Math.ceil(data.length / targetWidth);
    const result: DataPoint[] = [];

    for (let i = 0; i < data.length; i += bucketSize) {
      const bucket = data.slice(i, i + bucketSize);
      const min = bucket.reduce((a, b) => a.value < b.value ? a : b);
      const max = bucket.reduce((a, b) => a.value > b.value ? a : b);

      if (min.timestamp < max.timestamp) {
        result.push(min, max);
      } else {
        result.push(max, min);
      }
    }

    return result;
  }
}
```

## 🧠 メモリ管理

### 1. メモリリーク防止

```typescript
// ✅ 良い例 - 適切なクリーンアップ
function PanelWithResources({ context }: PanelProps) {
  const [subscriptions] = useState(() => new Set<string>());
  const animationRef = useRef<number>();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // アニメーションループ
    const animate = () => {
      updateVisualization();
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    // タイマー
    timeoutRef.current = setTimeout(() => {
      performDelayedUpdate();
    }, 1000);

    return () => {
      // 必須: リソースのクリーンアップ
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      context.unsubscribeAll();
      subscriptions.clear();
    };
  }, [context, subscriptions]);
}

// ✅ WeakMap/WeakSet の使用
class ResourceManager {
  private resources = new WeakMap<object, Resource>();

  public getResource(key: object): Resource {
    if (!this.resources.has(key)) {
      this.resources.set(key, new Resource());
    }
    return this.resources.get(key)!;
  }

  // keyオブジェクトがGCされると自動的にResourceも解放される
}
```

### 2. 効率的な状態管理

```typescript
// ✅ 良い例 - 状態の正規化
interface NormalizedState {
  topics: {
    byId: Record<string, Topic>;
    allIds: string[];
  };
  messages: {
    byTopicId: Record<string, Message[]>;
  };
  ui: {
    selectedTopicId: string | null;
    filters: FilterState;
  };
}

// ✅ Immer での不変更新最適化
import { produce } from "immer";

const reducer = produce((draft: State, action: Action) => {
  switch (action.type) {
    case "ADD_MESSAGE":
      // Immerが効率的な不変更新を実行
      const topicId = action.payload.topicId;
      if (!draft.messages.byTopicId[topicId]) {
        draft.messages.byTopicId[topicId] = [];
      }
      draft.messages.byTopicId[topicId].push(action.payload.message);

      // 古いメッセージを削除してメモリを節約
      if (draft.messages.byTopicId[topicId].length > 1000) {
        draft.messages.byTopicId[topicId] =
          draft.messages.byTopicId[topicId].slice(-1000);
      }
      break;
  }
});
```

## ⚡ WebWorker 活用

### 1. 重い計算のオフロード

```typescript
// worker/dataProcessor.ts
self.onmessage = function(e) {
  const { data, operation } = e.data;

  let result;
  switch (operation) {
    case "downsample":
      result = performDownsampling(data);
      break;
    case "transform":
      result = transformDataPoints(data);
      break;
    case "analyze":
      result = analyzeDataPatterns(data);
      break;
  }

  self.postMessage({ result, operation });
};

// メインスレッド
class WorkerManager {
  private worker: Worker;
  private pendingOperations = new Map<string, (result: any) => void>();

  constructor() {
    this.worker = new Worker("/worker/dataProcessor.js");
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }

  public async processData(data: any[], operation: string): Promise<any> {
    const operationId = generateId();

    return new Promise((resolve) => {
      this.pendingOperations.set(operationId, resolve);
      this.worker.postMessage({ data, operation, operationId });
    });
  }

  private handleWorkerMessage(e: MessageEvent) {
    const { result, operationId } = e.data;
    const callback = this.pendingOperations.get(operationId);
    if (callback) {
      callback(result);
      this.pendingOperations.delete(operationId);
    }
  }
}
```

### 2. Chart.js の WebWorker 最適化

```typescript
// packages/suite-base/src/components/Chart/worker/ChartJSManager.ts の例
export class ChartJSManager {
  private chart: Chart | undefined;
  private pendingUpdates: ChartData[] = [];
  private isUpdating = false;

  public async updateChart(data: ChartData): Promise<void> {
    // バッチ更新でパフォーマンス向上
    this.pendingUpdates.push(data);

    if (!this.isUpdating) {
      this.isUpdating = true;
      await this.processPendingUpdates();
      this.isUpdating = false;
    }
  }

  private async processPendingUpdates(): Promise<void> {
    if (this.pendingUpdates.length === 0) return;

    // 最新のデータのみ使用
    const latestData = this.pendingUpdates[this.pendingUpdates.length - 1];
    this.pendingUpdates = [];

    if (this.chart) {
      this.chart.data = latestData;
      this.chart.update("none"); // アニメーション無しで更新
    }
  }
}
```

## 🔧 Bundle Size 最適化

### 1. Tree Shaking の活用

```typescript
// ✅ 良い例 - 名前付きインポート
import { Button, TextField, Grid } from "@mui/material";
import { debounce } from "lodash";

// ❌ 悪い例 - バンドル全体をインポート
import * as MUI from "@mui/material";
import _ from "lodash";
```

### 2. Dynamic Import による遅延ローディング

```typescript
// ✅ 良い例 - 重いコンポーネントの遅延ローディング
const Heavy3DVisualization = lazy(() =>
  import("./Heavy3DVisualization").then(module => ({
    default: module.Heavy3DVisualization
  }))
);

function ConditionalVisualization({ show3D }: Props) {
  if (!show3D) {
    return <SimpleVisualization />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Heavy3DVisualization />
    </Suspense>
  );
}
```

## 📱 レスポンシブ最適化

### 1. 画面サイズに応じた最適化

```typescript
function ResponsivePanel({ data }: Props) {
  const [windowSize, setWindowSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const handleResize = debounce(() => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 100);

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      handleResize.cancel();
    };
  }, []);

  // 画面サイズに応じてレンダリング方法を変更
  const itemCount = useMemo(() => {
    if (windowSize.width < 768) return 10; // モバイル
    if (windowSize.width < 1200) return 50; // タブレット
    return 100; // デスクトップ
  }, [windowSize.width]);

  return (
    <VirtualizedList
      items={data.slice(0, itemCount)}
      height={windowSize.height}
    />
  );
}
```

## 🔍 パフォーマンス測定

### 1. React DevTools Profiler

```typescript
// 本番環境でもプロファイルを有効にする場合
if (process.env.NODE_ENV === "development") {
  import("@welldone-software/why-did-you-render").then(whyDidYouRender => {
    whyDidYouRender.default(React, {
      trackAllPureComponents: true,
    });
  });
}
```

### 2. カスタムパフォーマンス計測

```typescript
// Performance Observer API の活用
class PerformanceMonitor {
  private observer: PerformanceObserver;

  constructor() {
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "measure") {
          console.log(`${entry.name}: ${entry.duration}ms`);
        }
      }
    });

    this.observer.observe({ entryTypes: ["measure"] });
  }

  public measure(name: string, startMark: string, endMark: string) {
    performance.measure(name, startMark, endMark);
  }

  public mark(name: string) {
    performance.mark(name);
  }
}

// 使用例
const monitor = new PerformanceMonitor();

function HeavyComponent() {
  useEffect(() => {
    monitor.mark("heavy-component-start");

    // 重い処理
    performHeavyCalculation();

    monitor.mark("heavy-component-end");
    monitor.measure(
      "heavy-component-duration",
      "heavy-component-start",
      "heavy-component-end"
    );
  }, []);
}
```

### 3. Bundle Analyzer

```bash
# webpack-bundle-analyzer でバンドルサイズを分析
yarn storybook:build --webpack-stats-json
npx webpack-bundle-analyzer storybook-static/webpack-stats.json
```

## 🎯 パフォーマンステスト

### 1. 自動化されたパフォーマンステスト

```typescript
// Performance.test.tsx
describe("Performance Tests", () => {
  it("should render large dataset within 100ms", async () => {
    const largeDataset = generateLargeDataset(10000);

    const startTime = performance.now();
    render(<DataVisualization data={largeDataset} />);

    await waitFor(() => {
      expect(screen.getByTestId("visualization")).toBeInTheDocument();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(100);
  });

  it("should handle rapid updates without memory leaks", async () => {
    const { rerender } = render(<Component data={initialData} />);

    const initialMemory = (performance as any).memory?.usedJSHeapSize;

    // 1000回の高速更新をシミュレート
    for (let i = 0; i < 1000; i++) {
      rerender(<Component data={generateRandomData()} />);
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // ガベージコレクションを強制実行（テスト環境のみ）
    if (global.gc) {
      global.gc();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize;
    const memoryIncrease = finalMemory - initialMemory;

    // メモリ増加が許容範囲内であることを確認
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
  });
});
```

### 2. 実環境でのモニタリング

```typescript
// 本番環境でのパフォーマンス監視
if (typeof window !== "undefined" && "PerformanceObserver" in window) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Long Task の検出
      if (entry.entryType === "longtask") {
        console.warn(`Long task detected: ${entry.duration}ms`);

        // 分析サーバーに送信
        sendPerformanceData({
          type: "longtask",
          duration: entry.duration,
          startTime: entry.startTime,
        });
      }
    }
  });

  observer.observe({ entryTypes: ["longtask"] });
}
```

## 📚 ベストプラクティス まとめ

### DO's (推奨)

- React.memo、useMemo、useCallback の適切な使用
- 仮想化によるリスト最適化
- WebWorker での重い処理のオフロード
- バンドルサイズの最小化
- パフォーマンス測定の自動化
- メモリリークの防止

### DON'Ts (非推奨)

- 不要な再レンダリング
- sx プロパティの大量使用
- 同期的な重い計算
- メモリリークの放置
- パフォーマンス測定の怠慢

## 🔧 開発ツール

### パフォーマンス分析ツール

```bash
# React DevTools Profiler
# Chrome DevTools Performance
# webpack-bundle-analyzer

# パフォーマンステスト実行
yarn test:performance
```

---

このガイドを参考に、高パフォーマンスなLichtblick Suiteコンポーネントを開発してください！
