# 6. 開発時のポイント

## 🎯 コンポーネント開発のベストプラクティス

### **型安全性の確保**

TypeScript の型システムを最大限活用し、実行時エラーを防止します。

**実際の使用例**:

- 型定義: `packages/suite-base/src/types/panels.ts` (1行目〜)
- Panel型定義: `packages/suite-base/src/components/Panel.tsx` (1行目〜)

```typescript
// packages/suite-base/src/types/panels.ts (型定義例)
export interface PanelProps<Config = unknown> {
  config: Config;
  saveConfig: (config: Config) => void;
  updatePanelSettingsTree: (settings: SettingsTree) => void;
}

export interface PanelInfo {
  title: string;
  type: string;
  description?: string;
  config: unknown;
  defaultConfig: unknown;
  hasSettings?: boolean;
  supportsStrictMode?: boolean;
}

// 厳密な型定義でエラーを防止
export interface PlotConfig {
  paths: readonly string[];
  xAxisVal: "timestamp" | "index";
  yAxisVal: "value" | "custom";
  showLegend: boolean;
  // オプショナルプロパティの明示的な定義
  minValue?: number;
  maxValue?: number;
  lineWidth?: number;
  pointSize?: number;
}
```

### **パフォーマンスの最適化**

React.memo、useMemo、useCallback を適切に使用して、不要な再レンダリングを防止します。

**実際の使用例**:

- メモ化例: `packages/suite-base/src/components/MessagePipeline/index.tsx` (1行目〜)
- Hook最適化: `packages/suite-base/src/hooks/useMessagesByTopic.ts` (1行目〜)

```typescript
// packages/suite-base/src/hooks/useMessagesByTopic.ts (最適化例)
export function useMessagesByTopic({
  topics,
  historySize = 1,
  preload = false,
}: UseMessagesByTopicProps): MessageEvent[] {
  const subscriberId = useUniqueId();

  // 購読設定のメモ化
  const subscriptions = useMemo(() => {
    return topics.map(topic => ({
      ...topic,
      preload,
    }));
  }, [topics, preload]); // 依存配列を適切に設定

  // MessagePipeline セレクターのメモ化
  const messagePipelineSelector = useCallback((ctx: MessagePipelineContext) => {
    return {
      subscribe: ctx.subscribe,
      unsubscribe: ctx.unsubscribe,
      messagesBySubscriberId: ctx.messagesBySubscriberId,
    };
  }, []);

  const { subscribe, unsubscribe, messagesBySubscriberId } =
    useMessagePipeline(messagePipelineSelector);

  // 購読の管理
  useEffect(() => {
    subscribe(subscriberId, subscriptions);

    return () => {
      unsubscribe(subscriberId);
    };
  }, [subscribe, unsubscribe, subscriberId, subscriptions]);

  // メッセージの取得とフィルタリング
  const messages = useMemo(() => {
    const allMessages = messagesBySubscriberId.get(subscriberId) ?? [];

    // 履歴サイズでフィルタリング
    if (historySize === Infinity) {
      return allMessages;
    }

    return allMessages.slice(-historySize);
  }, [messagesBySubscriberId, subscriberId, historySize]);

  return messages;
}

// Panel コンポーネントのメモ化例
const MemoizedPanel = React.memo<PanelProps<PlotConfig>>(function PlotPanel({
  config,
  saveConfig,
}) {
  // 重い計算をメモ化
  const processedData = useMemo(() => {
    return processLargeDataset(config.paths);
  }, [config.paths]);

  // イベントハンドラーをメモ化
  const handleConfigChange = useCallback((newConfig: Partial<PlotConfig>) => {
    saveConfig({ ...config, ...newConfig });
  }, [config, saveConfig]);

  return (
    <div>
      <PlotVisualization data={processedData} />
      <PlotControls onChange={handleConfigChange} />
    </div>
  );
});
```

### **エラーハンドリング**

適切なエラーバウンダリーとエラーハンドリングを実装します。

**実際の使用例**:

- エラーバウンダリー: `packages/suite-base/src/components/ErrorBoundary.tsx` (1行目〜)
- Panel エラーハンドリング: `packages/suite-base/src/components/Panel.tsx` (1行目〜)

```typescript
// packages/suite-base/src/components/ErrorBoundary.tsx (エラーバウンダリー)
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{
    actions?: React.ReactNode;
    hideSourceLocs?: boolean;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // エラーレポートの送信
    this.props.onError?.(error, errorInfo);

    this.setState({ error, errorInfo });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", border: "1px solid red" }}>
          <h2>Something went wrong.</h2>
          <details style={{ marginTop: "10px" }}>
            <summary>Error details</summary>
            <pre>{this.state.error?.stack}</pre>
            {!this.props.hideSourceLocs && (
              <pre>{this.state.errorInfo?.componentStack}</pre>
            )}
          </details>
          <div style={{ marginTop: "10px" }}>
            {this.props.actions}
            <button onClick={() => this.setState({ hasError: false })}>
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### **非同期処理の適切な管理**

Promise やasync/awaitを適切に使用し、メモリリークを防止します。

**実際の使用例**:

- 非同期Hook: `packages/suite-base/src/hooks/useAsync.ts` (1行目〜)
- Player非同期処理: `packages/suite-base/src/players/Ros1Player.ts` (430行目〜)

```typescript
// packages/suite-base/src/hooks/useAsync.ts (非同期Hook)
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  dependencies: React.DependencyList,
): {
  loading: boolean;
  error: Error | undefined;
  value: T | undefined;
} {
  const [state, setState] = useState<{
    loading: boolean;
    error: Error | undefined;
    value: T | undefined;
  }>({
    loading: true,
    error: undefined,
    value: undefined,
  });

  const cancelRef = useRef<AbortController>();

  useEffect(() => {
    // 前の処理をキャンセル
    cancelRef.current?.abort();

    // 新しいAbortControllerを作成
    const abortController = new AbortController();
    cancelRef.current = abortController;

    setState({ loading: true, error: undefined, value: undefined });

    asyncFn()
      .then((value) => {
        if (!abortController.signal.aborted) {
          setState({ loading: false, error: undefined, value });
        }
      })
      .catch((error) => {
        if (!abortController.signal.aborted) {
          setState({ loading: false, error, value: undefined });
        }
      });

    return () => {
      abortController.abort();
    };
  }, dependencies);

  // コンポーネントのアンマウント時にキャンセル
  useEffect(() => {
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return state;
}
```

## 🚀 パフォーマンス最適化

### **メッセージ処理の最適化**

大量のメッセージを効率的に処理するためのテクニック。

**実際の使用例**:

- バッチ処理: `packages/suite-base/src/components/MessagePipeline/store.ts` (683行目〜)
- メッセージフィルタリング: `packages/suite-base/src/components/MessagePipeline/subscriptions.ts` (70行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/store.ts (バッチ処理)
function batchMessageProcessing(
  messages: MessageEvent[],
  batchSize: number = 1000,
): MessageEvent[][] {
  const batches: MessageEvent[][] = [];

  for (let i = 0; i < messages.length; i += batchSize) {
    batches.push(messages.slice(i, i + batchSize));
  }

  return batches;
}

// 効率的なメッセージフィルタリング
function filterMessagesByTimeRange(
  messages: MessageEvent[],
  startTime: Time,
  endTime: Time,
): MessageEvent[] {
  // バイナリサーチを使用して開始位置を特定
  const startIndex = binarySearchByTime(messages, startTime);
  const endIndex = binarySearchByTime(messages, endTime);

  return messages.slice(startIndex, endIndex + 1);
}

function binarySearchByTime(messages: MessageEvent[], targetTime: Time): number {
  let left = 0;
  let right = messages.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midTime = messages[mid]?.receiveTime;

    if (!midTime) break;

    if (compareTime(midTime, targetTime) < 0) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return left;
}
```

### **メモリ使用量の最適化**

メモリリークを防ぎ、効率的なメモリ使用を実現します。

**実際の使用例**:

- メモリ管理: `packages/suite-base/src/hooks/useMessagesByTopic.ts` (1行目〜)
- Worker活用: `packages/den/src/worker/ComlinkWrap.ts` (1行目〜)

```typescript
// メモリ効率的なメッセージ管理
export function useMessageMemoryOptimization(
  messages: MessageEvent[],
  maxMemoryUsage: number = 100 * 1024 * 1024, // 100MB
): MessageEvent[] {
  const [optimizedMessages, setOptimizedMessages] = useState<MessageEvent[]>([]);

  useEffect(() => {
    let currentMemoryUsage = 0;
    const result: MessageEvent[] = [];

    // 新しいメッセージから処理（最新を優先）
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageSize = message.sizeInBytes ?? estimateMessageSize(message);

      if (currentMemoryUsage + messageSize > maxMemoryUsage) {
        break; // メモリ制限に達したら停止
      }

      result.unshift(message);
      currentMemoryUsage += messageSize;
    }

    setOptimizedMessages(result);
  }, [messages, maxMemoryUsage]);

  return optimizedMessages;
}

// メッセージサイズの推定
function estimateMessageSize(message: MessageEvent): number {
  try {
    // JSON.stringify を使用したサイズ推定
    return JSON.stringify(message).length * 2; // UTF-16なので2倍
  } catch {
    // fallback
    return 1024; // 1KB as default
  }
}
```

### **Worker を使用した重い処理のオフロード**

**実際の使用例**:

- Worker実装: `packages/den/src/worker/ComlinkWrap.ts` (1行目〜)

```typescript
// packages/den/src/worker/ComlinkWrap.ts (Worker実装)
import { expose, transfer } from "comlink";

export interface WorkerAPI {
  processLargeDataset: (data: ArrayBuffer) => Promise<ProcessedData>;
  calculateStatistics: (messages: MessageEvent[]) => Promise<Statistics>;
}

const workerAPI: WorkerAPI = {
  async processLargeDataset(data: ArrayBuffer): Promise<ProcessedData> {
    // 重い処理をメインスレッドから分離
    const view = new DataView(data);
    const result = new Float32Array(data.byteLength / 4);

    // 大量データの処理
    for (let i = 0; i < result.length; i++) {
      result[i] = view.getFloat32(i * 4, true);
    }

    // 処理結果をTransferableとして返す
    return transfer(
      {
        data: result,
        length: result.length,
        timestamp: Date.now(),
      },
      [result.buffer],
    );
  },

  async calculateStatistics(messages: MessageEvent[]): Promise<Statistics> {
    // 統計計算をWorkerで実行
    const values = messages.map((msg) => extractNumericValue(msg));

    return {
      count: values.length,
      mean: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      standardDeviation: calculateStandardDeviation(values),
    };
  },
};

expose(workerAPI);
```

## 🔧 デバッグのコツ

### **開発者ツールの活用**

効率的なデバッグのためのツールとテクニック。

**実際の使用例**:

- デバッグHook: `packages/suite-base/src/hooks/useDebugValue.ts` (1行目〜)
- パフォーマンス監視: `packages/suite-base/src/components/MessagePipeline/index.tsx` (1行目〜)

```typescript
// packages/suite-base/src/hooks/useDebugValue.ts (デバッグHook)
export function useDebugValue<T>(value: T, format?: (value: T) => string): void {
  React.useDebugValue(value, format);
}

// カスタムHookでのデバッグ情報
export function useMessagesByTopic({
  topics,
  historySize = 1,
}: UseMessagesByTopicProps): MessageEvent[] {
  const subscriberId = useUniqueId();
  const messages = useMessagePipeline(/* ... */);

  // デバッグ情報の表示
  useDebugValue(
    {
      subscriberId,
      topicCount: topics.length,
      messageCount: messages.length,
      historySize,
    },
    (debugInfo) => `Topics: ${debugInfo.topicCount}, Messages: ${debugInfo.messageCount}`,
  );

  return messages;
}

// パフォーマンス監視
export function usePerformanceMonitor(componentName: string): void {
  const renderCount = useRef(0);
  const startTime = useRef<number>();

  useEffect(() => {
    renderCount.current++;
    const endTime = performance.now();

    if (startTime.current) {
      const renderTime = endTime - startTime.current;
      console.log(`${componentName} render #${renderCount.current}: ${renderTime.toFixed(2)}ms`);
    }

    startTime.current = endTime;
  });

  // 開発環境でのみ動作
  if (process.env.NODE_ENV === "development") {
    console.log(`${componentName} performance monitoring enabled`);
  }
}
```

### **ログ出力の最適化**

**実際の使用例**:

- Logger実装: `packages/log/src/index.ts` (1行目〜)

```typescript
// packages/log/src/index.ts (Logger実装)
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

export class Logger {
  private minLevel: LogLevel;
  private entries: LogEntry[] = [];
  private maxEntries: number;

  constructor(minLevel: LogLevel = LogLevel.INFO, maxEntries: number = 1000) {
    this.minLevel = minLevel;
    this.maxEntries = maxEntries;
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  public error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
    };

    this.entries.push(entry);

    // エントリ数の制限
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // コンソールへの出力
    this.outputToConsole(entry);
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] ${LogLevel[entry.level]}:`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.context);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.context);
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.context);
        break;
    }
  }
}

// グローバルLoggerインスタンス
export const logger = new Logger();
```

### **テストの書き方**

**実際の使用例**:

- Hook テスト: `packages/hooks/src/useCrash.test.ts` (1行目〜)
- コンポーネントテスト: `packages/suite-base/src/components/App.test.tsx` (1行目〜)

```typescript
// packages/hooks/src/useCrash.test.ts (Hook テスト)
import { renderHook, act } from "@testing-library/react";
import { useMessagesByTopic } from "./useMessagesByTopic";

describe("useMessagesByTopic", () => {
  it("should return messages for subscribed topics", async () => {
    const topics = [{ topic: "/test/topic" }];

    const { result } = renderHook(() => useMessagesByTopic({ topics }));

    expect(result.current).toEqual([]);

    // メッセージの追加をシミュレート
    act(() => {
      // MessagePipelineの状態を更新
      mockMessagePipeline.addMessage({
        topic: "/test/topic",
        message: { value: 42 },
        receiveTime: { sec: 1, nsec: 0 },
        sizeInBytes: 100,
        schemaName: "test_schema",
      });
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]?.message).toEqual({ value: 42 });
  });

  it("should limit messages by historySize", async () => {
    const topics = [{ topic: "/test/topic" }];
    const historySize = 2;

    const { result } = renderHook(() => useMessagesByTopic({ topics, historySize }));

    // 3つのメッセージを追加
    act(() => {
      for (let i = 0; i < 3; i++) {
        mockMessagePipeline.addMessage({
          topic: "/test/topic",
          message: { value: i },
          receiveTime: { sec: i, nsec: 0 },
          sizeInBytes: 100,
          schemaName: "test_schema",
        });
      }
    });

    // 最後の2つのメッセージのみが残る
    expect(result.current).toHaveLength(2);
    expect(result.current[0]?.message).toEqual({ value: 1 });
    expect(result.current[1]?.message).toEqual({ value: 2 });
  });
});
```

## 🚀 次のステップ

開発時のポイントを理解したら、最後の章に進んでください：

**[実践的な開発例](./07_practical_examples.md)** - 具体的な実装例とコード

---

**💡 学習のポイント**

- **段階的な最適化**: 最初は動くものを作り、その後パフォーマンスを最適化
- **適切なテスト**: 重要な機能には必ずテストを書く
- **エラーハンドリング**: 予期しないエラーに対する適切な処理
- **デバッグ環境**: 開発効率を向上させるためのツール整備
