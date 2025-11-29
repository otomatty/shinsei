# Lichtblick API仕様書（逆生成）

## 分析日時
2025年7月31日

## API概要

Lichtblickは、フロントエンド中心のアーキテクチャを採用しており、従来的なHTTP REST APIではなく、**プレイヤーインターフェース**と**拡張機能API**を中心としたAPI設計となっています。

## プレイヤーAPI仕様

### 基本インターフェース

**Player Interface** - データソースの統一インターフェース

```typescript
export interface Player {
  // ライフサイクル管理
  setListener(listener: (playerState: PlayerState) => Promise<void>): void;
  close(): void;

  // 購読・配信管理
  setSubscriptions(subscriptions: Immutable<SubscribePayload[]>): void;
  setPublishers(publishers: AdvertiseOptions[]): void;

  // パラメータ・サービス操作
  setParameter(key: string, value: ParameterValue): void;
  publish(request: PublishPayload): void;
  callService(service: string, request: unknown): Promise<unknown>;

  // アセット取得
  fetchAsset?(uri: string): Promise<Asset>;

  // プレイバック制御（オプション）
  startPlayback?(): void;
  pausePlayback?(): void;
  seekPlayback?(time: Time): void;
  playUntil?(time: Time): void;
  setPlaybackSpeed?(speedFraction: number): void;

  // グローバル変数・メタデータ
  setGlobalVariables(globalVariables: GlobalVariables): void;
  getMetadata?: () => ReadonlyArray<Readonly<Metadata>>;
}
```

### データ型定義

#### PlayerState - プレイヤー状態

```typescript
export type PlayerState = {
  // プレイヤーの存在状態
  presence: PlayerPresence; // NOT_PRESENT | INITIALIZING | RECONNECTING | PRESENT | ERROR

  // 読み込み進捗情報
  progress: Progress;

  // プレイヤー機能
  capabilities: PlayerCapability[];

  // プロファイル・ID
  profile: string | undefined;
  playerId: string;
  name?: string;

  // アラート・エラー
  alerts?: PlayerAlert[];

  // アクティブデータ
  activeData?: PlayerStateActiveData;

  // URL状態
  urlState?: PlayerURLState;
};
```

#### SubscribePayload - 購読要求

```typescript
export type SubscribePayload = {
  // 購読トピック名
  topic: string;

  // 取得フィールド（部分購読）
  fields?: string[];

  // プリロードタイプ
  preloadType?: SubscriptionPreloadType; // "full" | "partial"
};
```

#### MessageEvent - メッセージイベント

```typescript
export type MessageEvent<T = unknown> = {
  // トピック情報
  topic: string;
  schemaName: string;

  // 時刻情報
  receiveTime: Time;
  publishTime?: Time;

  // メッセージデータ
  message: T;
  sizeInBytes: number;

  // メタデータ
  originalMessageEvent?: MessageEvent;
  topicConfig?: unknown;
};
```

## データソースファクトリーAPI

### IDataSourceFactory インターフェース

**用途**: 新しいデータソース対応を追加するためのファクトリーパターン

```typescript
export interface IDataSourceFactory {
  // 識別子
  id: string;
  legacyIds?: string[]; // 互換性のための旧ID

  // タイプ・メタデータ
  type: DataSourceFactoryType; // "file" | "connection" | "sample"
  displayName: string;
  iconName?: RegisteredIconNames;
  description?: string;

  // ドキュメント・ヘルプ
  docsLinks?: { label?: string; url: string }[];
  disabledReason?: string | React.JSX.Element;
  badgeText?: string;
  warning?: string | React.JSX.Element;

  // UI・設定
  hidden?: boolean;
  sampleLayout?: LayoutData;
  formConfig?: { fields: Field[]; };

  // ファイル対応
  supportedFileTypes?: string[]; // [".mcap", ".bag"] 等
  supportsMultiFile?: boolean;

  // ファクトリーメソッド
  initialize: (args: DataSourceFactoryInitializeArgs) => Player | undefined;
}
```

### 初期化パラメータ

```typescript
export type DataSourceFactoryInitializeArgs = {
  // メトリクス収集
  metricsCollector: PlayerMetricsCollectorInterface;

  // ファイル（単体・複数）
  file?: File;
  files?: File[];

  // 接続パラメータ
  params?: Record<string, string | undefined>;
};
```

### 実装例

**MCAP ローカルファイル データソース**

```typescript
export class McapLocalDataSourceFactory implements IDataSourceFactory {
  public id = "mcap-local-file";
  public type: IDataSourceFactory["type"] = "file";
  public displayName = "Local MCAP file";
  public iconName = "OpenFile" as const;
  public supportedFileTypes = [".mcap"];

  public initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
    const { file, metricsCollector } = args;
    if (!file) {
      return undefined;
    }

    return new IterablePlayer({
      metricsCollector,
      source: new McapIndexedIterableSource({ file }),
      name: file.name,
    });
  }
}
```

**Foxglove WebSocket 接続データソース**

```typescript
export class FoxgloveWebSocketDataSourceFactory implements IDataSourceFactory {
  public id = "foxglove-websocket";
  public type: IDataSourceFactory["type"] = "connection";
  public displayName = "Foxglove WebSocket";
  public iconName = "Flow" as const;

  public formConfig = {
    fields: [
      { id: "url", label: "WebSocket URL", defaultValue: "ws://localhost:8765" },
    ],
  };

  public initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
    const { params, metricsCollector } = args;
    const url = params?.url;
    if (!url) {
      return undefined;
    }

    return new FoxgloveWebSocketPlayer({
      url,
      metricsCollector,
    });
  }
}
```

## パネル拡張API

### ExtensionContext インターフェース

**用途**: 拡張機能開発のためのコンテキストAPI

```typescript
export interface ExtensionContext {
  // 実行モード
  readonly mode: "production" | "development" | "test";

  // パネル登録
  registerPanel(params: ExtensionPanelRegistration): void;

  // メッセージコンバーター登録
  registerMessageConverter<Src>(args: RegisterMessageConverterArgs<Src>): void;

  // トピックエイリアス登録
  registerTopicAliases(aliasFunction: TopicAliasFunction): void;

  // カメラモデル登録
  registerCameraModel(args: RegisterCameraModelArgs): void;
}
```

### PanelExtensionContext インターフェース

**用途**: パネル拡張の実行時コンテキスト

```typescript
export type PanelExtensionContext = {
  // DOM・状態
  readonly panelElement: HTMLDivElement;
  readonly initialState: unknown;

  // レイアウト・メタデータ
  readonly layout: LayoutActions;
  readonly dataSourceProfile?: string;
  readonly metadata?: ReadonlyArray<Readonly<Metadata>>;

  // 状態管理
  watch: (field: keyof RenderState) => void;
  saveState: (state: Partial<unknown>) => void;

  // パラメータ・変数操作
  setParameter: (name: string, value: ParameterValue) => void;
  setSharedPanelState: (state: undefined | Record<string, unknown>) => void;
  setVariable: (name: string, value: VariableValue) => void;

  // 時間制御
  setPreviewTime: (time: number | undefined) => void;
  seekPlayback?: (time: number | Time) => void;

  // 購読管理
  subscribe(topics: string[]): void;
  subscribe(subscriptions: Subscription[]): void;
  unsubscribeAll(): void;
  subscribeAppSettings(settings: string[]): void;

  // 配信・サービス（ROSネイティブ）
  advertise?(topic: string, schemaName: string, options?: Record<string, unknown>): void;
  unadvertise?(topic: string): void;
  publish?(topic: string, message: unknown): void;
  callService?(service: string, request: unknown): Promise<unknown>;

  // レンダリング制御
  onRender?: (renderState: Immutable<RenderState>, done: () => void) => void;
  updatePanelSettingsEditor(settings: Immutable<SettingsTree>): void;
  setDefaultPanelTitle(defaultTitle: string | undefined): void;
};
```

### パネル登録例

```typescript
// 拡張機能のエントリーポイント
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "custom-visualization",
    displayName: "Custom Visualization",
    description: "A custom data visualization panel",

    // パネルファクトリー
    panel: (context: PanelExtensionContext) => {
      // カスタムパネルロジック
      context.subscribe(["/sensor_data"]);

      context.onRender = (renderState, done) => {
        const messages = renderState.currentFrame?.["/sensor_data"];
        if (messages) {
          // データ可視化処理
          renderCustomVisualization(messages);
        }
        done();
      };
    },
  });
}
```

## メッセージパイプラインAPI

### MessagePipelineContext インターフェース

**用途**: パネルがデータにアクセスするためのコンテキスト

```typescript
export type MessagePipelineContext = {
  // プレイヤー状態
  playerState: PlayerState;

  // メッセージデータ
  messageEventsBySubscriberId: Map<string, readonly MessageEvent[]>;
  subscriptions: readonly SubscribePayload[];

  // トピック・サービス・データタイプ
  sortedTopics: readonly Topic[];
  sortedServices: readonly string[];
  datatypes: RosDatatypes;

  // 購読・配信管理
  setSubscriptions: (id: string, payloads: Immutable<SubscribePayload[]>) => void;
  setPublishers: (id: string, payloads: AdvertiseOptions[]) => void;
  setParameter: (key: string, value: ParameterValue) => void;
  publish: (payload: PublishPayload) => void;
  callService: (service: string, request: unknown) => Promise<unknown>;

  // アセット取得
  fetchAsset: (uri: string, options?: { referenceUrl?: string }) => Promise<Asset>;
  getMetadata: () => ReadonlyArray<Readonly<Metadata>>;

  // プレイバック制御
  startPlayback?: () => void;
  playUntil?: (time: Time) => void;
  pausePlayback?: () => void;
  setPlaybackSpeed?: (speedFraction: number) => void;
  seekPlayback?: (time: Time) => void;

  // フレーム制御
  pauseFrame: (name: string) => () => void;
};
```

### 使用例

```typescript
// パネルでの MessagePipeline 使用
function MyPanel() {
  const messagePipeline = useMessagePipeline();
  const [subscriptionId] = useState(() => uuid());

  // 购読設定
  useEffect(() => {
    messagePipeline.setSubscriptions(subscriptionId, [
      { topic: "/camera/image" },
      { topic: "/robot/pose" },
    ]);

    return () => {
      messagePipeline.setSubscriptions(subscriptionId, []);
    };
  }, [messagePipeline, subscriptionId]);

  // メッセージ取得
  const messages = messagePipeline.messageEventsBySubscriberId.get(subscriptionId) ?? [];

  // レンダリング
  return <div>{/* 可視化ロジック */}</div>;
}
```

## アセット取得API

### fetchAsset メソッド

**用途**: 外部リソース（メッシュ、テクスチャ等）の取得

```typescript
type Asset = {
  uri: string;
  data: Uint8Array;
  mediaType?: string;
};

// パッケージURIサポート
const asset = await messagePipeline.fetchAsset("package://robot_description/mesh/base.dae");

// HTTP URIサポート
const texture = await messagePipeline.fetchAsset("https://example.com/texture.png");
```

**実装詳細**:
```typescript
async fetchAsset(uri: string, options?: { referenceUrl?: string }) {
  const { protocol } = new URL(uri);

  if (protocol === "package:") {
    // パッケージリソース解決
    const pkgPath = uri.slice("package://".length);

    if (player?.fetchAsset) {
      return await player.fetchAsset(uri);
    } else if (options?.referenceUrl) {
      // 相対パス解決
      const resolvedUrl = resolvePackageUrl(uri, options.referenceUrl);
      return await fetch(resolvedUrl);
    }
  }

  // 通常のHTTP fetch
  return await fetch(uri, options);
}
```

## 設定・カスタマイゼーションAPI

### SettingsTree API

**用途**: パネル設定UIの動的生成

```typescript
export type SettingsTree = {
  // アクションハンドラー
  actionHandler: (action: SettingsTreeAction) => void;

  // フィルタリング
  enableFilter?: boolean;
  focusedPath?: readonly string[];

  // 設定ノード
  nodes: SettingsTreeNodes;
};

export type SettingsTreeNode = {
  // アクション
  actions?: SettingsTreeNodeAction[];

  // 子ノード
  children?: SettingsTreeChildren;

  // 表示制御
  defaultExpansionState?: "collapsed" | "expanded";
  error?: string;
  icon?: SettingsIcon;
  label?: string;
  renamable?: boolean;
  order?: number | string;
  visible?: boolean;

  // フィールド
  fields?: SettingsTreeFields;
};
```

### 設定例

```typescript
// パネル設定の定義
const settingsTree: SettingsTree = {
  actionHandler: (action) => {
    if (action.action === "update") {
      updatePanelConfig(action.payload.path, action.payload.value);
    }
  },
  nodes: {
    general: {
      label: "General",
      fields: {
        title: { label: "Panel Title", input: "string", value: config.title },
        showGrid: { label: "Show Grid", input: "boolean", value: config.showGrid },
      },
    },
    visualization: {
      label: "Visualization",
      fields: {
        colorMode: {
          label: "Color Mode",
          input: "select",
          options: [
            { label: "Rainbow", value: "rainbow" },
            { label: "Intensity", value: "intensity" },
          ],
          value: config.colorMode,
        },
      },
    },
  },
};
```

## エラーハンドリング

### PlayerAlert 型

```typescript
export type PlayerAlert = {
  severity: "error" | "warn" | "info";
  message: string;
  details?: unknown;
  actions?: PlayerAlertAction[];
};

export type PlayerAlertAction = {
  type: "open-file" | "retry-connection" | "reset-player";
  label: string;
  handler: () => void;
};
```

### エラー通知例

```typescript
// プレイヤーでのエラー通知
const alerts: PlayerAlert[] = [
  {
    severity: "error",
    message: "Failed to connect to WebSocket server",
    details: { url: "ws://localhost:8765", error: "Connection refused" },
    actions: [
      {
        type: "retry-connection",
        label: "Retry",
        handler: () => this.reconnect(),
      },
    ],
  },
];

this._setPlayerState({
  presence: PlayerPresence.ERROR,
  alerts,
});
```

## パフォーマンス・最適化API

### メッセージプリロード

```typescript
// 部分プリロード
const subscription: SubscribePayload = {
  topic: "/large_pointcloud",
  fields: ["header", "points[0:1000]"], // 最初の1000点のみ
  preloadType: "partial",
};
```

### バッチ処理

```typescript
// メッセージバッチ処理での効率化
const batchProcessor = new MessageBatchProcessor({
  batchSize: 100,
  flushInterval: 16, // ~60fps
  processor: (messages: MessageEvent[]) => {
    // バッチ処理ロジック
    return processMessageBatch(messages);
  },
});
```

## API使用ガイドライン

### 1. データソース開発

```typescript
// 1. IDataSourceFactory実装
// 2. Player実装（IterablePlayerベース推奨）
// 3. データソースファクトリー登録
registerDataSourceFactory(new CustomDataSourceFactory());
```

### 2. パネル拡張開発

```typescript
// 1. activate関数実装
// 2. パネル登録
// 3. PanelExtensionContextの活用
export function activate(extensionContext: ExtensionContext) {
  extensionContext.registerPanel({ /* パネル定義 */ });
}
```

### 3. メッセージ処理

```typescript
// 1. 適切な購読設定
// 2. メッセージライフサイクル管理
// 3. パフォーマンス考慮（フィールド限定等）
```

## 総括

Lichtblick APIは、**型安全性**、**拡張性**、**パフォーマンス**を重視した設計となっています。従来のREST APIとは異なり、リアルタイムデータストリーミングとプラグインアーキテクチャに最適化されたAPI設計です。

### 主な特長
- **型安全**: TypeScriptによる包括的な型定義
- **リアルタイム**: ストリーミングデータ処理に最適化
- **拡張可能**: プラグインによる機能拡張
- **パフォーマンス**: 部分購読、バッチ処理等の最適化機能

この設計により、ロボティクスデータの複雑な要件（大容量、リアルタイム、多様性）に対応した堅牢なAPIを実現しています。