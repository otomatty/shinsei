# 4. 主要コンポーネント

## 📱 App.tsx vs StudioApp.tsx

### **App.tsx - アプリケーション全体のルートコンポーネント**

アプリケーションの最上位コンポーネントで、Provider の階層を管理します。

**実際の使用例**:

- App.tsx: `packages/suite-base/src/components/App.tsx` (1行目〜)

```typescript
// packages/suite-base/src/components/App.tsx (App.tsx実装例)
export function App(props: AppProps): JSX.Element {
  const [extensionLoaders] = useState(() => props.extensionLoaders);

  return (
    <AppConfigurationContext.Provider value={props.appConfiguration}>
      <AppParametersProvider>
        <ColorSchemeThemeProvider>
          <CssBaseline enableColorScheme>
            <ErrorBoundary>
              <MultiProvider>
                <StudioApp />
              </MultiProvider>
            </ErrorBoundary>
          </CssBaseline>
        </ColorSchemeThemeProvider>
      </AppParametersProvider>
    </AppConfigurationContext.Provider>
  );
}
```

### **StudioApp.tsx - 実際のアプリケーションロジック**

メインのアプリケーションコンテンツとレイアウトを管理します。

**実際の使用例**:

- StudioApp.tsx: `packages/suite-base/src/components/StudioApp.tsx` (1行目〜)

```typescript
// packages/suite-base/src/components/StudioApp.tsx (StudioApp実装例)
export function StudioApp(): JSX.Element {
  const { isSignedIn, user } = useCurrentUser();

  // データソース選択の状態管理
  const [selectedSource, setSelectedSource] = useState<DataSource | undefined>();

  // レイアウトの状態管理
  const currentLayout = useCurrentLayout();

  if (!selectedSource) {
    return <WelcomeLayout onSelectSource={setSelectedSource} />;
  }

  return (
    <MessagePipelineProvider>
      <Workspace>
        <AppBar />
        <WorkspaceContent>
          <SidebarWrapper />
          <PanelLayout layout={currentLayout} />
        </WorkspaceContent>
        <PlaybackControls />
      </Workspace>
    </MessagePipelineProvider>
  );
}
```

## 🔄 MessagePipeline

データの流れを管理する中核システム。Player からのメッセージを各 Panel に配信します。

### **MessagePipelineProvider**

**実際の使用例**:

- MessagePipelineProvider: `packages/suite-base/src/components/MessagePipeline/index.tsx` (73行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/index.tsx (Provider実装)
export function MessagePipelineProvider(props: MessagePipelineProviderProps): JSX.Element {
  const { children } = props;
  const store = useStore();

  // Context値の生成
  const context = useMemo(() => createMessagePipelineContext(store), [store]);

  useEffect(() => {
    // Player の設定
    if (props.player) {
      store.getState().actions.setPlayer(props.player);
    }
  }, [props.player, store]);

  return (
    <ContextInternal.Provider value={context}>
      {children}
    </ContextInternal.Provider>
  );
}
```

### **MessagePipeline ストア**

**実際の使用例**:

- MessagePipelineStore: `packages/suite-base/src/components/MessagePipeline/store.ts` (1行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/store.ts (ストア実装)
interface MessagePipelineInternalState {
  subscriptions: Map<string, SubscribePayload[]>;
  messagesBySubscriberId: Map<string, MessageEvent[]>;
  lastMessageEventByTopic: Map<string, MessageEvent>;
  playerState?: PlayerState;
  actions: {
    setPlayer: (player: Player) => void;
    updateSubscriptions: (subscriberId: string, subscriptions: SubscribePayload[]) => void;
    updatePlayerState: (playerState: PlayerState) => void;
  };
}

export const useStore = create<MessagePipelineInternalState>((set, get) => ({
  subscriptions: new Map(),
  messagesBySubscriberId: new Map(),
  lastMessageEventByTopic: new Map(),

  actions: {
    setPlayer: (player: Player) => {
      const state = get();
      // Player リスナーの設定
      player.setListener(async (playerState) => {
        state.actions.updatePlayerState(playerState);
      });
    },

    updateSubscriptions: (subscriberId: string, subscriptions: SubscribePayload[]) => {
      set((state) => {
        const newSubscriptions = new Map(state.subscriptions);
        newSubscriptions.set(subscriberId, subscriptions);

        // 統合された購読設定をPlayerに送信
        const mergedSubscriptions = mergeSubscriptions(newSubscriptions);
        get().playerState?.setSubscriptions(mergedSubscriptions);

        return { subscriptions: newSubscriptions };
      });
    },
  },
}));
```

### **useMessagePipeline Hook**

**実際の使用例**:

- useMessagePipeline: `packages/suite-base/src/components/MessagePipeline/index.tsx` (1行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/index.tsx (Hook実装)
export function useMessagePipeline<T>(
  selector: (messagePipeline: MessagePipelineContext) => T,
): T {
  const context = useContext(ContextInternal);
  if (!context) {
    throw new Error("useMessagePipeline must be used within a MessagePipelineProvider");
  }
  return selector(context);
}

// 使用例
function MyPanel() {
  const { playerState, messages } = useMessagePipeline(
    useCallback((ctx) => ({
      playerState: ctx.playerState,
      messages: ctx.messageEventsBySubscriberId.get("myPanel") ?? [],
    }), [])
  );

  return <div>{/* Panel content */}</div>;
}
```

## 🎮 Player システム

データソースを抽象化し、統一的なインターフェースを提供するシステム。

### **Player インターフェース**

**実際の使用例**:

- Player型定義: `packages/suite-base/src/players/types.ts` (1行目〜)

```typescript
// packages/suite-base/src/players/types.ts (Player型定義)
export interface Player {
  playerId: string;

  // 状態変更を監視するリスナー
  setListener(listener: (playerState: PlayerState) => Promise<void>): void;

  // 購読設定の更新
  setSubscriptions(subscriptions: SubscribePayload[]): void;

  // 再生制御
  startPlayback?(): void;
  pausePlayback?(): void;
  seekPlayback?(time: Time): void;
  setPlaybackSpeed?(speed: number): void;

  // リソース解放
  close(): void;
}

export interface PlayerState {
  presence: PlayerPresence;
  playerId: string;
  progress: Progress;
  capabilities: (string | typeof CAPABILITIES)[];
  profile?: string;
  urlState?: UrlState;

  // データ
  activeData?: {
    messages: MessageEvent[];
    totalBytesReceived: number;
    messageOrder: TimestampMethod;
    startTime: Time;
    endTime: Time;
    currentTime: Time;
    isPlaying: boolean;
    speed: number;
    lastSeekTime?: number;
    topics: Topic[];
    topicStats: Map<string, TopicStats>;
    datatypes: Map<string, MessageSchema>;
    publishedTopics?: Map<string, Set<string>>;
    subscribedTopics?: Map<string, Set<string>>;
    services?: Map<string, Service>;
    parameters?: Map<string, Parameter>;
  };
}
```

### **具体的な Player 実装**

#### **ROS1 Player**

**実際の使用例**:

- ROS1Player: `packages/suite-base/src/players/Ros1Player.ts` (61行目〜)

```typescript
// packages/suite-base/src/players/Ros1Player.ts (ROS1Player実装)
export default class Ros1Player implements Player {
  #url: string;
  #rosNode?: RosNode;
  #listener?: (playerState: PlayerState) => Promise<void>;
  #providerDatatypes: RosDatatypes = new Map();
  #parsedMessages: MessageEvent[] = [];

  constructor(url: string) {
    this.#url = url;
  }

  public setListener(listener: (playerState: PlayerState) => Promise<void>): void {
    this.#listener = listener;
  }

  public setSubscriptions(subscriptions: SubscribePayload[]): void {
    if (!this.#rosNode) return;

    // 購読設定の更新
    for (const subscription of subscriptions) {
      this.#rosNode.subscribe({
        topic: subscription.topic,
        datatype: subscription.schemaName,
        callback: (message, connectionHeader) => {
          this.#handleMessage(subscription.topic, message, connectionHeader);
        },
      });
    }
  }

  #handleMessage = (topic: string, message: unknown, connectionHeader: unknown): void => {
    const messageEvent: MessageEvent = {
      topic,
      receiveTime: this.#getCurrentTime(),
      message,
      sizeInBytes: estimateMessageSize(message),
      schemaName: connectionHeader?.type ?? "unknown",
    };

    this.#parsedMessages.push(messageEvent);
    this.#emitState();
  };

  #emitState = async (): Promise<void> => {
    if (!this.#listener) return;

    const playerState: PlayerState = {
      presence: PlayerPresence.PRESENT,
      playerId: this.playerId,
      progress: {},
      capabilities: [PlayerCapabilities.setSpeed],
      activeData: {
        messages: this.#parsedMessages,
        totalBytesReceived: 0,
        messageOrder: "receiveTime",
        startTime: { sec: 0, nsec: 0 },
        endTime: { sec: 0, nsec: 0 },
        currentTime: this.#getCurrentTime(),
        isPlaying: true,
        speed: 1.0,
        topics: Array.from(this.#providerDatatypes.keys()).map((name) => ({
          name,
          schemaName: this.#providerDatatypes.get(name)!,
        })),
        topicStats: new Map(),
        datatypes: this.#providerDatatypes,
      },
    };

    await this.#listener(playerState);
  };
}
```

#### **MCAP Player**

**実際の使用例**:

- MCAPPlayer: `packages/suite-base/src/players/McapPlayer.ts` (実装確認)

```typescript
// packages/suite-base/src/players/McapPlayer.ts (MCAP Player実装例)
export default class McapPlayer implements Player {
  #mcapFile: File;
  #reader?: McapReader;
  #listener?: (playerState: PlayerState) => Promise<void>;

  constructor(file: File) {
    this.#mcapFile = file;
  }

  public async initialize(): Promise<void> {
    const buffer = await this.#mcapFile.arrayBuffer();
    this.#reader = new McapReader({ buffer });

    // ファイル情報の読み取り
    const info = await this.#reader.readInfo();
    this.#startTime = info.startTime;
    this.#endTime = info.endTime;

    // スキーマとチャンネルの読み取り
    for (const channel of info.channels) {
      const schema = info.schemas.get(channel.schemaId);
      if (schema) {
        this.#channels.set(channel.id, { channel, schema });
      }
    }
  }

  public setSubscriptions(subscriptions: SubscribePayload[]): void {
    this.#subscriptions = subscriptions;
    this.#updatePlayback();
  }

  #updatePlayback = async (): Promise<void> => {
    if (!this.#reader) return;

    const messages: MessageEvent[] = [];

    // 購読対象のチャンネルIDを収集
    const channelIds = new Set<number>();
    for (const subscription of this.#subscriptions) {
      for (const [channelId, { channel }] of this.#channels) {
        if (channel.topic === subscription.topic) {
          channelIds.add(channelId);
        }
      }
    }

    // メッセージの読み取り
    for (const message of this.#reader.readMessages({ channelIds })) {
      const channelInfo = this.#channels.get(message.channelId);
      if (!channelInfo) continue;

      const deserializedMessage = this.#deserializeMessage(message.data, channelInfo.schema);

      messages.push({
        topic: channelInfo.channel.topic,
        receiveTime: message.logTime,
        message: deserializedMessage,
        sizeInBytes: message.data.byteLength,
        schemaName: channelInfo.schema.name,
      });
    }

    await this.#emitState(messages);
  };
}
```

## 🎨 Panel システム

データを可視化するコンポーネントシステム。

### **Panel HOC**

**実際の使用例**:

- Panel HOC: `packages/suite-base/src/components/Panel.tsx` (1行目〜)

```typescript
// packages/suite-base/src/components/Panel.tsx (Panel HOC)
export function Panel<Config>(
  Component: React.ComponentType<PanelProps<Config>>,
): React.ComponentType<PanelProps<Config>> {
  function PanelComponent(props: PanelProps<Config>) {
    const { config, saveConfig } = props;

    // エラーバウンダリー
    const [error, setError] = useState<Error | undefined>();

    // パフォーマンス監視
    const renderCount = useRef(0);
    useEffect(() => {
      renderCount.current++;
      console.log(`Panel render count: ${renderCount.current}`);
    });

    if (error) {
      return (
        <div className="panel-error">
          <h3>Panel Error</h3>
          <p>{error.message}</p>
          <button onClick={() => setError(undefined)}>Retry</button>
        </div>
      );
    }

    return (
      <ErrorBoundary onError={setError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }

  PanelComponent.displayName = `Panel(${Component.displayName ?? Component.name})`;
  return PanelComponent;
}
```

### **Panel 実装例**

#### **3D Panel**

**実際の使用例**:

- 3D Panel: `packages/suite-base/src/panels/ThreeDeeRender/index.tsx` (1行目〜)

```typescript
// packages/suite-base/src/panels/ThreeDeeRender/index.tsx (3D Panel実装)
function ThreeDeeRender(props: Props): JSX.Element {
  const { config, saveConfig } = props;

  // メッセージ購読
  const topics = useMemo(() => {
    return config.topics?.map((topic) => ({ topic: topic.name })) ?? [];
  }, [config.topics]);

  const messages = useMessagesByTopic({ topics });

  // 3D レンダリング
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ThreeDeeRenderer>();

  useEffect(() => {
    if (!canvasRef.current) return;

    // レンダラーの初期化
    rendererRef.current = new ThreeDeeRenderer(canvasRef.current);

    return () => {
      rendererRef.current?.dispose();
    };
  }, []);

  // メッセージ処理
  useEffect(() => {
    if (!rendererRef.current) return;

    for (const message of messages) {
      rendererRef.current.addMessage(message);
    }

    rendererRef.current.render();
  }, [messages]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      <ThreeDeeControls config={config} saveConfig={saveConfig} />
    </div>
  );
}

export default Panel(
  Object.assign(ThreeDeeRender, {
    panelType: "3D",
    defaultConfig: {
      followTf: undefined,
      scene: {},
      transforms: {},
      topics: {},
      layers: {},
      cameraState: {},
      imageMode: {},
    },
    supportsStrictMode: false,
  }),
);
```

#### **Plot Panel**

**実際の使用例**:

- Plot Panel: `packages/suite-base/src/panels/Plot/index.tsx` (1行目〜)

```typescript
// packages/suite-base/src/panels/Plot/index.tsx (Plot Panel実装)
function Plot(props: Props): JSX.Element {
  const { config, saveConfig } = props;

  // データ取得
  const { paths } = config;
  const messagesByPath = useMessagesByPath(paths);

  // プロット用データの変換
  const plotData = useMemo(() => {
    const datasets: PlotDataset[] = [];

    for (const [path, messages] of Object.entries(messagesByPath)) {
      const values: PlotValue[] = [];

      for (const message of messages) {
        const value = extractValueFromMessage(message, path);
        if (value != null) {
          values.push({
            x: toMilliseconds(message.receiveTime),
            y: value,
          });
        }
      }

      datasets.push({
        label: path,
        data: values,
        borderColor: getPathColor(path),
        backgroundColor: getPathColor(path, 0.1),
      });
    }

    return datasets;
  }, [messagesByPath]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <PlotChart data={plotData} />
      <PlotControls config={config} saveConfig={saveConfig} />
    </div>
  );
}

export default Panel(
  Object.assign(Plot, {
    panelType: "Plot",
    defaultConfig: {
      paths: [],
      xAxisVal: "timestamp",
      yAxisVal: "value",
      showLegend: true,
    },
  }),
);
```

## 🚀 次のステップ

主要コンポーネントを理解したら、次の章に進んでください：

**[データフローの仕組み](./05_data_flow.md)** - データの流れの詳細な理解

---

**💡 学習のポイント**

- **コンポーネントの役割**: 各コンポーネントがどのような責務を持つかを理解
- **データの流れ**: コンポーネント間でデータがどのように流れるかを追跡
- **実際のコードで確認**: 上記の参考ファイルを開いて、実装の詳細を確認
- **段階的な理解**: 複雑なコンポーネントは小さな部分から理解を始める
