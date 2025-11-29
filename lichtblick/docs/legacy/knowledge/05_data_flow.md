# 5. データフローの仕組み

## 🔄 データフローの全体像

Lichtblick のデータフローは以下のような流れで動作します：

```
データソース → Player → MessagePipeline → Panel
    ↓           ↓         ↓               ↓
  MCAP/ROS    統一化    購読管理・配信    可視化
```

## 📂 データソースの読み込み

### **データソース選択**

**実際の使用例**:

- データソース処理: `packages/suite-base/src/dataSources/` (ディレクトリ全体)
- データソース型定義: `packages/suite-base/src/dataSources/types.ts` (1行目〜)

```typescript
// packages/suite-base/src/dataSources/types.ts (データソース型定義)
export interface DataSource {
  id: string;
  type: "file" | "connection" | "sample";
  uri: string;

  // データソース固有の設定
  params?: Record<string, unknown>;

  // 初期化処理
  initialize(): Promise<Player>;

  // リソース解放
  close(): void;
}

export interface FileDataSource extends DataSource {
  type: "file";
  file: File;
  fileType: "mcap" | "bag" | "json";
}

export interface ConnectionDataSource extends DataSource {
  type: "connection";
  url: string;
  protocol: "ros1" | "rosbridge" | "foxglove-websocket";
}
```

### **ファイル読み込み処理**

**実際の使用例**:

- ファイル処理: `packages/suite-base/src/dataSources/FileDataSource.ts` (1行目〜)

```typescript
// packages/suite-base/src/dataSources/FileDataSource.ts (ファイル読み込み例)
export class FileDataSource implements DataSource {
  #file: File;
  #fileType: string;

  constructor(file: File) {
    this.#file = file;
    this.#fileType = this.#detectFileType(file);
  }

  public async initialize(): Promise<Player> {
    switch (this.#fileType) {
      case "mcap":
        return new McapPlayer(this.#file);
      case "bag":
        return new RosbagPlayer(this.#file);
      case "json":
        return new JsonPlayer(this.#file);
      default:
        throw new Error(`Unsupported file type: ${this.#fileType}`);
    }
  }

  #detectFileType(file: File): string {
    const extension = file.name.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "mcap":
        return "mcap";
      case "bag":
        return "bag";
      case "json":
        return "json";
      default:
        throw new Error(`Unknown file extension: ${extension}`);
    }
  }
}
```

## 🎮 Player による再生制御

### **Player の初期化**

**実際の使用例**:

- Player管理: `packages/suite-base/src/components/PlayerManager.tsx` (119行目〜)

```typescript
// packages/suite-base/src/components/PlayerManager.tsx (Player初期化)
export function PlayerManager({ children }: PlayerManagerProps): JSX.Element {
  const [currentPlayer, setCurrentPlayer] = useState<Player | undefined>();
  const [playerState, setPlayerState] = useState<PlayerState | undefined>();

  // Player の設定
  const selectDataSource = useCallback(async (dataSource: DataSource) => {
    // 既存 Player の終了
    if (currentPlayer) {
      currentPlayer.close();
    }

    try {
      // 新しい Player の初期化
      const player = await dataSource.initialize();

      // 状態リスナーの設定
      player.setListener(async (state) => {
        setPlayerState(state);
      });

      setCurrentPlayer(player);

      // 初期状態の取得
      player.start?.();

    } catch (error) {
      console.error("Player initialization failed:", error);
      setCurrentPlayer(undefined);
    }
  }, [currentPlayer]);

  // Player の終了処理
  useEffect(() => {
    return () => {
      if (currentPlayer) {
        currentPlayer.close();
      }
    };
  }, [currentPlayer]);

  return (
    <PlayerContext.Provider value={{
      player: currentPlayer,
      playerState,
      selectDataSource,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}
```

### **MCAP Player の実装例**

**実際の使用例**:

- MCAP Player: `packages/suite-base/src/players/McapPlayer.ts` (実装確認)

```typescript
// packages/suite-base/src/players/McapPlayer.ts (MCAP Player実装)
export default class McapPlayer implements Player {
  #mcapFile: File;
  #reader?: McapReader;
  #listener?: (playerState: PlayerState) => Promise<void>;
  #subscriptions: SubscribePayload[] = [];
  #isPlaying = false;
  #currentTime: Time = { sec: 0, nsec: 0 };
  #startTime: Time = { sec: 0, nsec: 0 };
  #endTime: Time = { sec: 0, nsec: 0 };
  #speed = 1.0;

  constructor(file: File) {
    this.#mcapFile = file;
  }

  public async initialize(): Promise<void> {
    // MCAPファイルの読み取り
    const buffer = await this.#mcapFile.arrayBuffer();
    this.#reader = new McapReader({ buffer });

    // ファイル情報の読み取り
    const info = await this.#reader.readInfo();
    this.#startTime = info.startTime;
    this.#endTime = info.endTime;
    this.#currentTime = this.#startTime;

    // 初期状態の送信
    await this.#emitState();
  }

  public setSubscriptions(subscriptions: SubscribePayload[]): void {
    this.#subscriptions = subscriptions;
    if (this.#isPlaying) {
      this.#updatePlayback();
    }
  }

  public startPlayback(): void {
    this.#isPlaying = true;
    this.#updatePlayback();
  }

  public pausePlayback(): void {
    this.#isPlaying = false;
  }

  public seekPlayback(time: Time): void {
    this.#currentTime = time;
    this.#updatePlayback();
  }

  public setPlaybackSpeed(speed: number): void {
    this.#speed = speed;
  }

  #updatePlayback = async (): Promise<void> => {
    if (!this.#reader || !this.#isPlaying) return;

    const messages: MessageEvent[] = [];

    // 購読対象のチャンネルを取得
    const subscribedChannels = this.#getSubscribedChannels();

    // 現在時刻からのメッセージを読み取り
    for (const message of this.#reader.readMessages({
      startTime: this.#currentTime,
      endTime: this.#endTime,
      channelIds: subscribedChannels,
    })) {
      const messageEvent = this.#createMessageEvent(message);
      messages.push(messageEvent);

      // 時刻の更新
      this.#currentTime = message.logTime;
    }

    await this.#emitState(messages);
  };

  #emitState = async (messages: MessageEvent[] = []): Promise<void> => {
    if (!this.#listener) return;

    const playerState: PlayerState = {
      presence: PlayerPresence.PRESENT,
      playerId: this.playerId,
      progress: {
        fullyLoadedFractionRanges: [{ start: 0, end: 1 }],
        messageCache: {
          blocks: [],
          startTime: this.#startTime,
        },
      },
      capabilities: [
        PlayerCapabilities.setSpeed,
        PlayerCapabilities.playbackControl,
        PlayerCapabilities.seek,
      ],
      activeData: {
        messages,
        totalBytesReceived: this.#mcapFile.size,
        messageOrder: "receiveTime",
        startTime: this.#startTime,
        endTime: this.#endTime,
        currentTime: this.#currentTime,
        isPlaying: this.#isPlaying,
        speed: this.#speed,
        topics: this.#getTopics(),
        topicStats: this.#getTopicStats(),
        datatypes: this.#getDatatypes(),
      },
    };

    await this.#listener(playerState);
  };
}
```

## 🔄 MessagePipeline による配信

### **購読管理**

**実際の使用例**:

- 購読管理: `packages/suite-base/src/components/MessagePipeline/subscriptions.ts` (1行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/subscriptions.ts (購読管理)
export function mergeSubscriptions(
  subscriptionsBySubscriberId: Map<string, SubscribePayload[]>,
): SubscribePayload[] {
  const mergedSubscriptions = new Map<string, SubscribePayload>();

  // 購読者ごとの購読設定を統合
  for (const [subscriberId, subscriptions] of subscriptionsBySubscriberId) {
    for (const subscription of subscriptions) {
      const key = `${subscription.topic}:${subscription.preload ?? false}`;
      const existing = mergedSubscriptions.get(key);

      if (!existing) {
        mergedSubscriptions.set(key, subscription);
      } else {
        // フィールドの統合
        const mergedFields = new Set([...(existing.fields ?? []), ...(subscription.fields ?? [])]);

        mergedSubscriptions.set(key, {
          ...existing,
          fields: mergedFields.size > 0 ? mergedFields : undefined,
        });
      }
    }
  }

  return Array.from(mergedSubscriptions.values());
}
```

### **メッセージ配信**

**実際の使用例**:

- メッセージストア: `packages/suite-base/src/components/MessagePipeline/store.ts` (683行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/store.ts (メッセージ配信)
function updatePlayerStateAction(
  prevState: MessagePipelineInternalState,
  action: UpdatePlayerStateAction,
): MessagePipelineInternalState {
  const { playerState } = action;
  const messages = playerState.activeData?.messages ?? [];

  // 購読者IDをトピック名でマッピング
  const subscriberIdsByTopic = new Map<string, Set<string>>();

  for (const [subscriberId, subscriptions] of prevState.subscriptions) {
    for (const subscription of subscriptions) {
      let subscriberIds = subscriberIdsByTopic.get(subscription.topic);
      if (!subscriberIds) {
        subscriberIds = new Set();
        subscriberIdsByTopic.set(subscription.topic, subscriberIds);
      }
      subscriberIds.add(subscriberId);
    }
  }

  // 購読者別にメッセージを配信
  const messagesBySubscriberId = new Map<string, MessageEvent[]>();

  for (const message of messages) {
    const subscriberIds = subscriberIdsByTopic.get(message.topic);
    if (!subscriberIds) continue;

    for (const subscriberId of subscriberIds) {
      let subscriberMessages = messagesBySubscriberId.get(subscriberId);
      if (!subscriberMessages) {
        subscriberMessages = [];
        messagesBySubscriberId.set(subscriberId, subscriberMessages);
      }

      // フィールドフィルタリング
      const subscription = prevState.subscriptions
        .get(subscriberId)
        ?.find((sub) => sub.topic === message.topic);

      if (subscription?.fields) {
        const filteredMessage = {
          ...message,
          message: filterMessageByFields(message.message, subscription.fields),
        };
        subscriberMessages.push(filteredMessage);
      } else {
        subscriberMessages.push(message);
      }
    }
  }

  // 最新メッセージの更新
  const lastMessageEventByTopic = new Map<string, MessageEvent>();
  for (const message of messages) {
    lastMessageEventByTopic.set(message.topic, message);
  }

  return {
    ...prevState,
    playerState,
    messagesBySubscriberId,
    lastMessageEventByTopic,
  };
}
```

## 🎨 Panel での可視化

### **useMessagesByTopic Hook**

**実際の使用例**:

- Hook実装: `packages/suite-base/src/hooks/useMessagesByTopic.ts` (1行目〜)

```typescript
// packages/suite-base/src/hooks/useMessagesByTopic.ts (メッセージ購読Hook)
export function useMessagesByTopic({
  topics,
  historySize = 1,
  preload = false,
}: {
  topics: readonly SubscribePayload[];
  historySize?: number;
  preload?: boolean;
}): MessageEvent[] {
  const subscriberId = useUniqueId();

  // 購読設定の更新
  const subscriptions = useMemo(() => {
    return topics.map((topic) => ({
      ...topic,
      preload,
    }));
  }, [topics, preload]);

  // MessagePipeline への購読登録
  const { subscribe, unsubscribe } = useMessagePipeline(
    useCallback(
      (ctx) => ({
        subscribe: ctx.subscribe,
        unsubscribe: ctx.unsubscribe,
      }),
      [],
    ),
  );

  useEffect(() => {
    subscribe(subscriberId, subscriptions);

    return () => {
      unsubscribe(subscriberId);
    };
  }, [subscribe, unsubscribe, subscriberId, subscriptions]);

  // メッセージの取得
  const messages = useMessagePipeline(
    useCallback(
      (ctx) => {
        const allMessages = ctx.messagesBySubscriberId.get(subscriberId) ?? [];

        // 履歴サイズでフィルタリング
        if (historySize === Infinity) {
          return allMessages;
        }

        return allMessages.slice(-historySize);
      },
      [subscriberId, historySize],
    ),
  );

  return messages;
}
```

### **Panel での実際の使用例**

**実際の使用例**:

- 3D Panel: `packages/suite-base/src/panels/ThreeDeeRender/index.tsx` (1行目〜)

```typescript
// packages/suite-base/src/panels/ThreeDeeRender/index.tsx (Panel実装)
function ThreeDeeRender(props: Props): JSX.Element {
  const { config, saveConfig } = props;

  // 購読するトピックの設定
  const topics = useMemo(() => {
    return config.topics?.map((topic) => ({
      topic: topic.name,
      preload: topic.preload ?? false,
    })) ?? [];
  }, [config.topics]);

  // メッセージの購読
  const messages = useMessagesByTopic({
    topics,
    historySize: 100, // 最大100個のメッセージを保持
  });

  // 3D レンダラーの初期化
  const rendererRef = useRef<ThreeDeeRenderer>();

  useEffect(() => {
    // レンダラーの初期化
    rendererRef.current = new ThreeDeeRenderer(canvasRef.current);

    return () => {
      rendererRef.current?.dispose();
    };
  }, []);

  // メッセージの処理
  useEffect(() => {
    if (!rendererRef.current) return;

    // メッセージをレンダラーに送信
    for (const message of messages) {
      switch (message.topic) {
        case "/robot/position":
          rendererRef.current.updateRobotPosition(message.message);
          break;
        case "/camera/image":
          rendererRef.current.updateCameraImage(message.message);
          break;
        case "/lidar/scan":
          rendererRef.current.updateLidarScan(message.message);
          break;
      }
    }

    // 再レンダリング
    rendererRef.current.render();
  }, [messages]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
```

## 🔧 データ変換と処理

### **メッセージ変換**

**実際の使用例**:

- メッセージ変換: `packages/suite-base/src/components/PanelExtensionAdapter/messageProcessing.ts` (129行目〜)

```typescript
// packages/suite-base/src/components/PanelExtensionAdapter/messageProcessing.ts (メッセージ変換)
export function transformMessage(
  message: MessageEvent,
  transforms: MessageTransform[],
): MessageEvent {
  let transformedMessage = message;

  for (const transform of transforms) {
    switch (transform.type) {
      case "filter":
        transformedMessage = {
          ...transformedMessage,
          message: filterMessageByFields(transformedMessage.message, transform.fields),
        };
        break;

      case "map":
        transformedMessage = {
          ...transformedMessage,
          message: mapMessageFields(transformedMessage.message, transform.mapping),
        };
        break;

      case "aggregate":
        transformedMessage = aggregateMessages([transformedMessage], transform.config);
        break;
    }
  }

  return transformedMessage;
}

function filterMessageByFields(message: unknown, fields: Set<string>): unknown {
  if (typeof message !== "object" || message == null) {
    return message;
  }

  const filtered: Record<string, unknown> = {};

  for (const field of fields) {
    if (field in message) {
      filtered[field] = (message as Record<string, unknown>)[field];
    }
  }

  return filtered;
}
```

## 🚀 次のステップ

データフローの仕組みを理解したら、次の章に進んでください：

**[開発時のポイント](./06_development_tips.md)** - 実際の開発時の注意点とベストプラクティス

---

**💡 学習のポイント**

- **データの流れを追跡**: 実際のコードでデータがどのように流れているかを確認
- **非同期処理の理解**: Promise や async/await の使い方を理解
- **パフォーマンスの考慮**: 大量データの効率的な処理方法を学習
- **実際のデバッグ**: コンソールログやブレークポイントでデータフローを確認
