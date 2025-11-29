# 2. 基本的な専門用語

## 🤖 ロボティクス関連用語

### **ROS (Robot Operating System)**

ロボット開発のためのフレームワーク。Lichtblickでは ROS のメッセージ形式に対応しています。

**実際の使用例**:

- ROS1プレイヤー: `packages/suite-base/src/players/Ros1Player.ts` (61行目〜)
- ROSデータ処理: `packages/suite-base/src/players/RosbridgePlayer.ts` (82行目〜)

```typescript
// packages/suite-base/src/players/Ros1Player.ts (61行目〜)
export default class Ros1Player implements Player {
  #rosNode?: RosNode; // ROS ノードのインスタンス
  #providerDatatypes: RosDatatypes = new Map(); // ROS データ型
}
```

### **MCAP (Message Capture and Processing)**

ロボットデータの記録・再生のためのファイル形式。従来の ROS bag ファイルの後継です。

**実際の使用例**:

- MCAP対応: `packages/mcap-support/src/index.ts` (1行目〜)
- MCAPプレイヤー: `packages/suite-base/src/players/McapPlayer.ts` (確認コード内)

```typescript
// packages/mcap-support/src/parseChannel.ts (実際の使用例)
export function parseChannel(channel: McapChannel): ParsedChannel {
  // MCAPチャンネルの解析処理
}
```

### **Topic (トピック)**

ROS におけるデータの配信チャンネル。命名規則: `/robot_name/sensor_type/data_type`

**実際の使用例**:

- トピック処理: `packages/suite-base/src/players/RosbridgePlayer.ts` (440行目〜)
- トピック購読: `packages/suite-base/src/components/MessagePipeline/subscriptions.ts` (1行目〜)

```typescript
// packages/suite-base/src/players/RosbridgePlayer.ts (440行目〜)
public setSubscriptions(subscriptions: SubscribePayload[]): void {
  // 利用可能なトピックをフィルタリング
  const topicNames = subscriptions
    .map(({ topic }) => topic)
    .filter((topicName) => availableTopicsByTopicName[topicName]);
}
```

**実例**:

- `/camera/image` - カメラ画像
- `/robot/position` - ロボット位置
- `/lidar/scan` - LiDAR スキャンデータ

### **Message (メッセージ)**

Topic を通じて配信されるデータ。ヘッダー + データ部分の構造を持ちます。

**実際の使用例**:

- メッセージ処理: `packages/suite-base/src/players/Ros1Player.ts` (430行目〜)
- メッセージ変換: `packages/suite-base/src/components/PanelExtensionAdapter/messageProcessing.ts` (129行目〜)

```typescript
// packages/suite-base/src/players/Ros1Player.ts (430行目〜)
#handleMessage = (
  topic: string,
  message: unknown,
  sizeInBytes: number,
  schemaName: string,
  external: boolean,
): void => {
  const msg: MessageEvent = {
    topic,
    receiveTime: this.#getCurrentTime(),
    message,
    sizeInBytes,
    schemaName,
  };
  this.#parsedMessages.push(msg);
};
```

### 🤔 よくある質問 - ロボティクス関連用語

<details>
<summary><strong>Q: ROSは実際のオペレーティングシステムですか？</strong></summary>

**A: いいえ、ROSは実際のOSではありません。ロボット開発のためのフレームワークです。**

**名前の由来と混乱の原因**:

- **名前**: Robot Operating System（ロボットオペレーティングシステム）
- **実体**: ロボット開発用のソフトウェアフレームワーク
- **動作環境**: Linux、Windows、macOS上で動作

**実際の役割**:

- **プロセス間通信**: ロボットの各部品間でデータをやり取り
- **パッケージ管理**: ロボット機能をモジュール化
- **開発ツール**: 可視化、デバッグツールの提供

**Web開発との比較**:

- **ROS**: ロボット開発のフレームワーク ≒ **React**: Web開発のフレームワーク
- **どちらも**: 開発を効率化するツール群

**参考ファイル**: `packages/suite-base/src/players/Ros1Player.ts` でROS1の実装を確認できます。

</details>

<details>
<summary><strong>Q: MCAPとROS bagの違いは何ですか？</strong></summary>

**A: MCAPはROS bagの後継で、パフォーマンスと機能が大幅に向上しています。**

**ROS bagの問題点**:

- **順次アクセス**: データを最初から順番に読む必要がある
- **圧縮未対応**: ファイルサイズが大きくなりがち
- **メタデータ不足**: データ構造の情報が少ない

**MCAPの改善点**:

- **ランダムアクセス**: 必要な部分だけ高速に読み込める
- **圧縮対応**: ファイルサイズを大幅削減
- **豊富なメタデータ**: スキーマ情報を内包

**ファイル形式の比較**:

```
ROS bag (古い形式):
[Header][Message1][Message2][Message3]... (順次読み込み)

MCAP (新しい形式):
[Header][Schema][Index][Compressed Chunks] (高速検索)
```

**実際の使用例**:

```typescript
// ROS bag
packages / suite - base / src / players / RosbagPlayer.ts;

// MCAP
packages / mcap - support / src / parseChannel.ts;
```

**参考ファイル**: `packages/mcap-support/src/` で詳細な実装を確認できます。

</details>

<details>
<summary><strong>Q: TopicとWeb APIエンドポイントの違いは何ですか？</strong></summary>

**A: Topicは継続的なデータ配信、APIエンドポイントは一回限りのデータ取得です。**

**Web APIエンドポイントの特徴**:

- **リクエスト-レスポンス**: 必要な時にデータを取得
- **HTTP**: 標準的なWebプロトコル
- **同期的**: リクエストに対してレスポンスを返す

**ROSトピックの特徴**:

- **パブリッシュ-サブスクライブ**: 継続的なデータ配信
- **非同期**: データが生成されるとリアルタイムで配信
- **多対多**: 複数の送信者と受信者

**実際の比較**:

```typescript
// Web API (REST)
const response = await fetch("/api/sensor-data");
const data = await response.json(); // 一回限り

// ROS Topic (継続的)
const subscription = useMessagesByTopic({
  topics: [{ topic: "/sensors/temperature" }],
}); // 継続的に新しいデータを受信
```

**使い分け**:

- **Web API**: 静的データ、設定情報
- **ROS Topic**: センサーデータ、リアルタイム情報

**参考ファイル**: `packages/suite-base/src/components/MessagePipeline/subscriptions.ts` で詳細な実装を確認できます。

</details>

<details>
<summary><strong>Q: ROSメッセージとHTTPメッセージの違いは何ですか？</strong></summary>

**A: ROSメッセージは構造化されたデータ、HTTPメッセージは通信プロトコルです。**

**HTTPメッセージの特徴**:

- **プロトコル**: Web通信の標準形式
- **ヘッダー**: メタデータ（Content-Type、Authorization等）
- **ボディ**: 実際のデータ（JSON、HTML等）

**ROSメッセージの特徴**:

- **データ構造**: 型定義されたデータ形式
- **スキーマ**: データの構造を定義
- **バイナリ**: 効率的なデータ表現

**実際の比較**:

```typescript
// HTTPメッセージ
{
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
  body: '{"temperature": 25.4}'
}

// ROSメッセージ
{
  topic: '/sensors/temperature',
  schemaName: 'sensor_msgs/Temperature',
  message: {
    temperature: 25.4,
    variance: 0.1,
    header: {
      stamp: { sec: 1234567, nanosec: 890000 },
      frame_id: 'base_link'
    }
  }
}
```

**主な違い**:

- **HTTP**: 通信手段
- **ROS**: データ表現

**参考ファイル**: `packages/suite-base/src/players/Ros1Player.ts` でメッセージ処理を確認できます。

</details>

## 💻 Web開発関連用語

### **TypeScript**

JavaScript に型システムを追加したプログラミング言語。コンパイル時エラー検出とIDE サポート向上が特徴です。

**実際の使用例**:

- 型定義: `packages/suite-base/src/types/` (ディレクトリ全体)
- Player型定義: `packages/suite-base/src/players/types.ts` (1行目〜)

```typescript
// packages/suite-base/src/players/types.ts (型定義例)
export interface Player {
  playerId: string;
  setListener(listener: (playerState: PlayerState) => Promise<void>): void;
  setSubscriptions(subscriptions: SubscribePayload[]): void;
  close(): void;
}
```

### **React**

UI を構築するための JavaScript ライブラリ。宣言的UI、コンポーネント指向、仮想DOMが特徴です。

**実際の使用例**:

- メインアプリ: `packages/suite-base/src/components/App.tsx` (1行目〜)
- Hook使用例: `packages/suite-base/src/hooks/useMessagesByTopic.ts` (1行目〜)

```typescript
// packages/suite-base/src/components/App.tsx (React使用例)
export function App(props: AppProps): JSX.Element {
  const [extensionLoaders] = useState(() => props.extensionLoaders);

  return (
    <AppConfigurationContext.Provider value={props.appConfiguration}>
      <StudioApp />
    </AppConfigurationContext.Provider>
  );
}
```

### **Hook**

React の関数コンポーネントで state や副作用を扱うための仕組み。

**実際の使用例**:

- MessagePipeline Hook: `packages/suite-base/src/components/MessagePipeline/index.tsx` (1行目〜)
- カスタムHook: `packages/suite-base/src/hooks/useMessagesByTopic.ts` (1行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/index.tsx (Hook使用例)
export function useMessagePipeline<T>(selector: (messagePipeline: MessagePipelineContext) => T): T {
  const context = useContext(ContextInternal);
  if (!context) {
    throw new Error("useMessagePipeline must be used within a MessagePipelineProvider");
  }
  return selector(context);
}
```

### **Context**

React でグローバルな状態やサービスを提供するメカニズム。

**実際の使用例**:

- アプリ設定Context: `packages/suite-base/src/context/AppConfigurationContext.ts` (1行目〜)
- レイアウトContext: `packages/suite-base/src/context/LayoutContext.ts` (1行目〜)

```typescript
// packages/suite-base/src/context/AppConfigurationContext.ts (Context使用例)
export const AppConfigurationContext = createContext<AppConfiguration | undefined>(undefined);

export function useAppConfigurationValue(): AppConfiguration {
  const value = useContext(AppConfigurationContext);
  if (!value) {
    throw new Error("useAppConfigurationValue must be used within AppConfigurationContext");
  }
  return value;
}
```

### **Provider**

React Context の値を提供するコンポーネント。

**実際の使用例**:

- MessagePipelineProvider: `packages/suite-base/src/components/MessagePipeline/index.tsx` (73行目〜)
- PlayerManager: `packages/suite-base/src/components/PlayerManager.tsx` (119行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/index.tsx (Provider使用例)
export function MessagePipelineProvider(props: MessagePipelineProviderProps): JSX.Element {
  const store = useStore();
  const context = useMemo(() => createMessagePipelineContext(store), [store]);

  return (
    <ContextInternal.Provider value={context}>
      {props.children}
    </ContextInternal.Provider>
  );
}
```

### 🤔 よくある質問 - Web開発関連用語

<details>
<summary><strong>Q: なぜJavaScriptではなくTypeScriptを使用しているのですか？</strong></summary>

**A: 型安全性により、実行時エラーを防ぎ、大規模開発を効率化するためです。**

**JavaScriptの問題点**:

- **実行時エラー**: 型の不整合は実行時まで発見できない
- **IDE支援不足**: 自動補完や型チェックが限定的
- **リファクタリング困難**: 型情報がないため変更の影響範囲が不明

**TypeScriptの利点**:

- **コンパイル時エラー検出**: 実行前に型エラーを発見
- **優れたIDE支援**: 自動補完、型チェック、リファクタリング支援
- **コードの自己文書化**: 型定義がドキュメントの役割

**実際の例**:

```typescript
// JavaScript (型エラーが実行時まで分からない)
function processMessage(message) {
  return message.data.temperature; // message.dataが存在しない可能性
}

// TypeScript (コンパイル時にエラー検出)
interface Message {
  topic: string;
  data: {
    temperature: number;
  };
}

function processMessage(message: Message): number {
  return message.data.temperature; // 型安全性が保証される
}
```

**大規模プロジェクトでの効果**:

- **Lichtblick**: 数万行のコードで型安全性を維持
- **チーム開発**: 型定義により開発者間の認識統一

**参考ファイル**: `packages/suite-base/src/types/` で型定義を確認できます。

</details>

<details>
<summary><strong>Q: React Hookとクラスコンポーネントの違いは何ですか？</strong></summary>

**A: Hookは関数コンポーネントで状態管理や副作用を扱うための新しい仕組みです。**

**クラスコンポーネントの特徴**:

- **ES6クラス**: class構文を使用
- **ライフサイクルメソッド**: componentDidMount、componentDidUpdate等
- **this**: インスタンス変数による状態管理

**React Hookの特徴**:

- **関数コンポーネント**: 関数として定義
- **Hook**: useState、useEffect等の関数
- **シンプルな構文**: thisが不要

**実際の比較**:

```typescript
// クラスコンポーネント (古い方式)
class MessageDisplay extends React.Component {
  constructor(props) {
    super(props);
    this.state = { messages: [] };
  }

  componentDidMount() {
    this.subscribe();
  }

  render() {
    return <div>{this.state.messages.length}</div>;
  }
}

// Hook (新しい方式)
function MessageDisplay() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    subscribe();
  }, []);

  return <div>{messages.length}</div>;
}
```

**Lichtblickでの使用**:

- **全てHook**: クラスコンポーネントは使用していない
- **カスタムHook**: 共通ロジックの再利用

**参考ファイル**: `packages/suite-base/src/hooks/` でカスタムHookを確認できます。

</details>

<details>
<summary><strong>Q: ContextとReduxの違いは何ですか？</strong></summary>

**A: ContextはReact標準の状態共有、ReduxはサードパーティのPredictable State Containerです。**

**React Contextの特徴**:

- **React標準**: 追加ライブラリ不要
- **階層的**: コンポーネントツリーで状態を共有
- **シンプル**: 軽量で直感的

**Reduxの特徴**:

- **サードパーティ**: 別途ライブラリ導入が必要
- **グローバルストア**: アプリ全体で単一のストア
- **予測可能**: 厳密な更新ルール

**実際の比較**:

```typescript
// React Context
const MessageContext = createContext();

function MessageProvider({ children }) {
  const [messages, setMessages] = useState([]);
  return (
    <MessageContext.Provider value={{ messages, setMessages }}>
      {children}
    </MessageContext.Provider>
  );
}

// Redux (参考例)
const store = createStore(messageReducer);
store.dispatch({ type: 'ADD_MESSAGE', payload: newMessage });
```

**Lichtblickでの選択**:

- **主にContext**: 軽量で十分な機能
- **Zustand**: 一部でRedux likeな状態管理を使用

**使い分け**:

- **Context**: 階層的な状態共有
- **Redux**: 複雑な状態管理が必要な場合

**参考ファイル**: `packages/suite-base/src/context/` でContext実装を確認できます。

</details>

<details>
<summary><strong>Q: Providerって何を「提供」しているのですか？</strong></summary>

**A: React Contextの値を子コンポーネントに提供する仕組みです。**

**Provider の役割**:

- **値の提供**: Context の値を子コンポーネントに供給
- **スコープ管理**: どの範囲でContextが有効かを制御
- **再レンダリング制御**: 値の変更時に適切なコンポーネントを更新

**身近な例での理解**:

- **電力会社**: 電力を各家庭に供給
- **Provider**: データやサービスを各コンポーネントに供給

**実際の使用例**:

```typescript
// 設定情報を提供するProvider
function AppConfigProvider({ children }) {
  const config = {
    apiUrl: process.env.REACT_APP_API_URL,
    theme: 'dark',
    language: 'ja'
  };

  return (
    <AppConfigContext.Provider value={config}>
      {children} {/* 子コンポーネント全てがconfigにアクセス可能 */}
    </AppConfigContext.Provider>
  );
}

// 子コンポーネントでの使用
function MyComponent() {
  const config = useContext(AppConfigContext); // Providerから値を取得
  return <div>API URL: {config.apiUrl}</div>;
}
```

**Lichtblickでの具体例**:

- **MessagePipelineProvider**: メッセージ配信システムを提供
- **AppConfigurationProvider**: アプリケーション設定を提供

**階層構造**:

```
App
├── AppConfigProvider (設定を提供)
│   ├── MessagePipelineProvider (メッセージシステムを提供)
│   │   ├── Panel A (両方の値にアクセス可能)
│   │   └── Panel B (両方の値にアクセス可能)
```

**参考ファイル**: `packages/suite-base/src/components/MessagePipeline/index.tsx` で実装を確認できます。

</details>

## 🏗️ アーキテクチャ用語

### **Player**

データソースからデータを読み取り、再生制御を担当するコンポーネント。

**実際の使用例**:

- ROS1プレイヤー: `packages/suite-base/src/players/Ros1Player.ts` (61行目〜)
- MCAPプレイヤー: `packages/suite-base/src/players/McapPlayer.ts` (確認コード内)
- Velodyneプレイヤー: `packages/suite-base/src/players/VelodynePlayer.ts` (80行目〜)

```typescript
// packages/suite-base/src/players/Ros1Player.ts (61行目〜)
export default class Ros1Player implements Player {
  #url: string; // rosmaster URL
  #rosNode?: RosNode; // ROS ノード
  #closed: boolean = false; // 終了状態

  public setSubscriptions(subscriptions: SubscribePayload[]): void {
    // 購読設定
  }
}
```

### **MessagePipeline**

Player からのメッセージを各 Panel に配信するシステム。

**実際の使用例**:

- メインファイル: `packages/suite-base/src/components/MessagePipeline/index.tsx` (1行目〜)
- ストア管理: `packages/suite-base/src/components/MessagePipeline/store.ts` (1行目〜)
- 購読管理: `packages/suite-base/src/components/MessagePipeline/subscriptions.ts` (1行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/store.ts (683行目〜)
function updatePlayerStateAction(
  prevState: MessagePipelineInternalState,
  action: UpdatePlayerStateAction,
): MessagePipelineInternalState {
  const messages = action.playerState.activeData?.messages;
  const messagesBySubscriberId = new Map<string, MessageEvent[]>();

  // 購読者別にメッセージを配信
  for (const message of messages ?? []) {
    const subscriberIds = subscriberIdsByTopic.get(message.topic);
    for (const subscriberId of subscriberIds ?? []) {
      let subscriberMessages = messagesBySubscriberId.get(subscriberId);
      if (!subscriberMessages) {
        subscriberMessages = [];
        messagesBySubscriberId.set(subscriberId, subscriberMessages);
      }
      subscriberMessages.push(message);
    }
  }
}
```

### **Panel**

データを可視化するコンポーネント。

**実際の使用例**:

- 3D表示Panel: `packages/suite-base/src/panels/ThreeDeeRender/index.tsx` (1行目〜)
- Plot Panel: `packages/suite-base/src/panels/Plot/index.tsx` (1行目〜)
- 画像Panel: `packages/suite-base/src/panels/Image/index.tsx` (1行目〜)

```typescript
// packages/suite-base/src/panels/ThreeDeeRender/index.tsx (Panel使用例)
function ThreeDeeRender(props: Props): JSX.Element {
  const { config, saveConfig } = props;

  // メッセージ購読
  const topics = useMemo(() => {
    return config.topics?.map((topic) => ({ topic: topic.name })) ?? [];
  }, [config.topics]);

  const messages = useMessagesByTopic({ topics });

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {/* 3D可視化コンテンツ */}
    </div>
  );
}
```

### **Subscription (購読)**

Panel が特定の Topic のメッセージを受信するための設定。

**実際の使用例**:

- 購読管理: `packages/suite-base/src/components/MessagePipeline/subscriptions.ts` (70行目〜)
- Hook使用例: `packages/suite-base/src/hooks/useMessagesByTopic.ts` (1行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/subscriptions.ts (購読統合例)
export function mergeSubscriptions(
  subscriptionsBySubscriberId: Map<string, SubscribePayload[]>,
): SubscribePayload[] {
  const mergedSubscriptions = new Map<string, SubscribePayload>();

  for (const subscriptions of subscriptionsBySubscriberId.values()) {
    for (const subscription of subscriptions) {
      const key = `${subscription.topic}:${subscription.preload}`;
      mergedSubscriptions.set(key, subscription);
    }
  }

  return Array.from(mergedSubscriptions.values());
}
```

### 🤔 よくある質問 - アーキテクチャ用語

<details>
<summary><strong>Q: Playerって音楽プレイヤーと何が違うのですか？</strong></summary>

**A: Playerは様々なデータソースを統一的に扱うためのインターフェースです。**

**音楽プレイヤーとの類似点**:

- **様々な形式対応**: MP3、WAV、FLAC → MCAP、ROS bag、ライブデータ
- **再生制御**: 再生、停止、シーク機能
- **統一インターフェース**: 形式に関わらず同じ操作

**ロボットデータでの特徴**:

- **リアルタイム処理**: ライブデータのストリーミング
- **時間軸制御**: 特定の時刻へのジャンプ
- **多チャンネル**: 複数のセンサーデータを同時処理

**実際の比較**:

```typescript
// 音楽プレイヤー (概念的な例)
interface MusicPlayer {
  play(): void;
  pause(): void;
  seek(time: number): void;
  getCurrentTime(): number;
}

// Lichtblick Player
interface Player {
  setSubscriptions(subscriptions: SubscribePayload[]): void;
  seekPlayback(time: Time): void;
  setPlaybackSpeed(speed: number): void;
  close(): void;
}
```

**Player の種類**:

- **McapPlayer**: MCAPファイルを再生
- **Ros1Player**: ROS1ライブ接続
- **RosbagPlayer**: ROS bagファイルを再生
- **VelodynePlayer**: Velodyne LiDARデータを処理

**参考ファイル**: `packages/suite-base/src/players/types.ts` でPlayer インターフェースを確認できます。

</details>

<details>
<summary><strong>Q: MessagePipelineって具体的にどんなデータフローですか？</strong></summary>

**A: データの生産者（Player）から消費者（Panel）への配信システムです。**

**工場の生産ラインに例えると**:

- **原材料**: ロボットデータ（Player）
- **生産ライン**: MessagePipeline（加工・配送）
- **製品**: 可視化されたデータ（Panel）
- **注文**: Subscription（どのデータが必要か）

**実際のデータフロー**:

```
1. Player → データ読み込み
   ↓
2. MessagePipeline → 購読管理・配信
   ↓
3. Panel → データ可視化
```

**具体的な処理**:

```typescript
// 1. Panel がデータを要求
const subscription = useMessagesByTopic({
  topics: [{ topic: "/camera/image" }],
});

// 2. MessagePipeline が購読を管理
const subscriptions = mergeSubscriptions(subscriberMap);

// 3. Player がデータを提供
player.setSubscriptions(subscriptions);

// 4. MessagePipeline が配信
const messagesBySubscriberId = distributeMessages(messages);
```

**パフォーマンス最適化**:

- **購読統合**: 同じTopicの重複購読を統合
- **メモリ管理**: 不要なメッセージの自動削除
- **バッチ処理**: 複数メッセージの効率的な処理

**Web開発との比較**:

- **Redux**: 状態管理とアクション配信
- **MessagePipeline**: データ配信とメッセージ管理

**参考ファイル**: `packages/suite-base/src/components/MessagePipeline/store.ts` で詳細な実装を確認できます。

</details>

<details>
<summary><strong>Q: Panelって通常のReactコンポーネントとどう違いますか？</strong></summary>

**A: Panelはロボットデータ専用の可視化コンポーネントです。**

**通常のReactコンポーネントとの違い**:

| 項目         | 通常のコンポーネント | Panel                |
| ------------ | -------------------- | -------------------- |
| **用途**     | 汎用UI部品           | ロボットデータ可視化 |
| **データ源** | props、state         | MessagePipeline      |
| **設定**     | props                | 専用設定UI           |
| **登録**     | 単純なimport         | Panelとして登録      |

**実際の比較**:

```typescript
// 通常のReactコンポーネント
function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
}

// Panel
function TemperaturePanel(props: PanelProps<TemperatureConfig>) {
  const { config, saveConfig } = props;

  // MessagePipelineからデータを取得
  const messages = useMessagesByTopic({
    topics: [{ topic: config.topic }]
  });

  // 設定変更
  const onTopicChange = (topic: string) => {
    saveConfig({ ...config, topic });
  };

  return (
    <div>
      <TopicSelector value={config.topic} onChange={onTopicChange} />
      <TemperatureChart data={messages} />
    </div>
  );
}

// Panelとして登録
export default Panel(
  Object.assign(TemperaturePanel, {
    panelType: "Temperature",
    defaultConfig: { topic: "/sensors/temperature" }
  })
);
```

**Panel の特徴**:

- **専用Hook**: useMessagesByTopic等のロボットデータ用Hook
- **設定管理**: saveConfigによる設定の永続化
- **レイアウト統合**: Lichtblickのレイアウトシステムと統合

**Panel の種類**:

- **3D**: 3次元可視化
- **Plot**: 時系列グラフ
- **Image**: 画像表示
- **Table**: データテーブル

**参考ファイル**: `packages/suite-base/src/panels/` で様々なPanel実装を確認できます。

</details>

<details>
<summary><strong>Q: SubscriptionってRxJSのObservableとどう違いますか？</strong></summary>

**A: SubscriptionはROSの購読設定、ObservableはRxJSのデータストリームです。**

**RxJS Observableの特徴**:

- **データストリーム**: 時間的に変化するデータ
- **オペレーター**: map、filter、merge等の変換機能
- **購読**: subscribe()でデータを受信

**Lichtblick Subscriptionの特徴**:

- **設定情報**: どのTopicのデータが必要かを表現
- **宣言的**: 必要なデータを宣言するだけ
- **最適化**: MessagePipelineが効率的に配信

**実際の比較**:

```typescript
// RxJS Observable
const temperature$ = new Observable((subscriber) => {
  // データ配信ロジック
  subscriber.next(25.4);
});

temperature$.subscribe((value) => {
  console.log(value); // 25.4
});

// Lichtblick Subscription
const subscription: SubscribePayload = {
  topic: "/sensors/temperature",
  preload: false,
};

const messages = useMessagesByTopic({
  topics: [subscription],
}); // MessagePipelineが自動的に配信
```

**データフローの違い**:

```
RxJS:
Observable → subscribe → データ受信

Lichtblick:
Subscription → MessagePipeline → useMessagesByTopic → データ受信
```

**利点の比較**:

- **RxJS**: 柔軟なデータ変換
- **Lichtblick**: ROSデータに最適化、自動購読統合

**使い分け**:

- **RxJS**: 汎用的なデータストリーム処理
- **Lichtblick Subscription**: ROSメッセージの効率的な配信

**参考ファイル**: `packages/suite-base/src/components/MessagePipeline/subscriptions.ts` で詳細な実装を確認できます。

</details>

## 📡 データ処理用語

### **MessageEvent**

メッセージとその関連情報（タイムスタンプ、トピック名など）を含む構造。

**実際の使用例**:

- メッセージ処理: `packages/suite-base/src/players/FoxgloveWebSocketPlayer/index.ts` (495行目〜)
- Hook使用例: `packages/suite-base/src/hooks/useMessagesByTopic.ts` (1行目〜)

```typescript
// packages/suite-base/src/players/FoxgloveWebSocketPlayer/index.ts (495行目〜)
this.#parsedMessages.push({
  topic,
  receiveTime: this.#getCurrentTime(),
  message: deserializedMessage,
  sizeInBytes: Math.max(data.byteLength, msgSizeEstimate),
  schemaName: chanInfo.channel.schemaName,
});
```

### **SubscribePayload**

購読設定を表すデータ構造。

**実際の使用例**:

- 型定義: `packages/suite-base/src/players/types.ts` (1行目〜)
- Hook使用例: `packages/suite-base/src/hooks/useMessagesByTopic.ts` (1行目〜)

```typescript
// packages/suite-base/src/players/types.ts (購読設定の型定義)
export interface SubscribePayload {
  topic: string;
  preload?: boolean;
  fields?: Set<string>;
}
```

### **MessagePath**

メッセージ内の特定のデータフィールドを指定するパス記法。

**実際の使用例**:

- パス解析: `packages/message-path/src/parseMessagePath.ts` (1行目〜)
- Hook使用例: `packages/suite-base/src/components/MessagePathSyntax/useMessagesByPath.ts` (26行目〜)

```typescript
// packages/suite-base/src/components/MessagePathSyntax/useMessagesByPath.ts (26行目〜)
export function useMessagesByPath(
  paths: readonly string[],
  historySize: number = Infinity,
): Record<string, MessageDataItem[]> {
  // パスに基づいてメッセージをフィルタリング
  const topics: SubscribePayload[] = useMemo(() => {
    const topicSet = new Set<string>();
    for (const path of paths) {
      const payload = subscribePayloadFromMessagePath(path, "partial");
      if (payload) {
        topicSet.add(payload.topic);
      }
    }
    return Array.from(topicSet).map((topic) => ({ topic }));
  }, [paths]);
}
```

### 🤔 よくある質問 - データ処理用語

<details>
<summary><strong>Q: MessageEventってDOMイベントとどう違いますか？</strong></summary>

**A: MessageEventはROSメッセージとメタデータを含む構造で、DOMイベントとは全く異なります。**

**DOMイベントの特徴**:

- **ユーザー操作**: クリック、キーボード入力等
- **同期的**: イベント発生時に即座に処理
- **DOM要素**: HTML要素に紐づく

**Lichtblick MessageEventの特徴**:

- **ロボットデータ**: センサーデータ、位置情報等
- **非同期**: 連続的にストリーミング
- **時系列**: タイムスタンプ付きデータ

**実際の比較**:

```typescript
// DOMイベント
button.addEventListener("click", (event: MouseEvent) => {
  console.log("クリック位置:", event.clientX, event.clientY);
});

// Lichtblick MessageEvent
const messageEvent: MessageEvent = {
  topic: "/sensors/temperature",
  receiveTime: { sec: 1234567890, nanosec: 123456789 },
  message: {
    temperature: 25.4,
    header: {
      stamp: { sec: 1234567890, nanosec: 123456789 },
      frame_id: "sensor_frame",
    },
  },
  sizeInBytes: 128,
  schemaName: "sensor_msgs/Temperature",
};
```

**データ構造の違い**:

- **DOMイベント**: イベント種別 + 発生場所
- **MessageEvent**: メッセージ + 時刻 + メタデータ

**処理方法の違い**:

- **DOMイベント**: イベントハンドラー
- **MessageEvent**: MessagePipeline + Hook

**参考ファイル**: `packages/suite-base/src/players/types.ts` でMessageEventの型定義を確認できます。

</details>

<details>
<summary><strong>Q: SubscribePayloadってREST APIとどう違いますか？</strong></summary>

**A: SubscribePayloadは継続的なデータ購読設定、REST APIは一回限りのデータ取得です。**

**REST APIの特徴**:

- **リクエスト-レスポンス**: HTTPリクエストで都度データ取得
- **同期的**: リクエスト送信後にレスポンス待機
- **状態なし**: 各リクエストは独立

**SubscribePayloadの特徴**:

- **購読設定**: 一度設定すると継続的にデータ受信
- **非同期**: データが生成されると自動的に配信
- **状態管理**: 購読状態を保持

**実際の比較**:

```typescript
// REST API
const fetchTemperature = async () => {
  const response = await fetch("/api/temperature");
  const data = await response.json();
  return data.temperature; // 一回限り
};

// SubscribePayload
const subscription: SubscribePayload = {
  topic: "/sensors/temperature",
  preload: false,
  fields: new Set(["temperature", "humidity"]),
};

const messages = useMessagesByTopic({
  topics: [subscription],
}); // 継続的にデータ受信
```

**データフローの違い**:

```
REST API:
クライアント → HTTPリクエスト → サーバー → レスポンス → クライアント

SubscribePayload:
Panel → Subscription → MessagePipeline → Player → 継続的配信
```

**使い分け**:

- **REST API**: 設定データ、一回限りの情報
- **SubscribePayload**: リアルタイムデータ、継続的な監視

**参考ファイル**: `packages/suite-base/src/players/types.ts` で詳細な型定義を確認できます。

</details>

<details>
<summary><strong>Q: MessagePathってJSONパスとどう違いますか？</strong></summary>

**A: MessagePathはROSメッセージ専用のパス記法で、JSONパスより高機能です。**

**JSONパスの特徴**:

- **JSON専用**: JSON形式のデータを対象
- **シンプル**: 基本的なパス記法
- **静的**: 固定的なデータ構造

**MessagePathの特徴**:

- **ROSメッセージ専用**: 型情報を考慮したパス記法
- **高機能**: 配列フィルタリング、条件指定等
- **動的**: 時系列データやバリエーション対応

**実際の比較**:

```typescript
// JSONパス
const jsonPath = "$.sensors.temperature";
const jsonData = { sensors: { temperature: 25.4 } };

// MessagePath
const messagePath = "/sensors/temperature.data.temperature";
const messageData = {
  topic: "/sensors/temperature",
  message: {
    data: {
      temperature: 25.4,
      variance: 0.1,
    },
    header: {
      stamp: { sec: 1234567890, nanosec: 123456789 },
    },
  },
};
```

**高機能な例**:

```typescript
// 配列フィルタリング
"/robot/joints[0].position"; // 最初の関節位置
"/robot/joints[:].position"; // 全関節位置
"/robot/joints[name=='shoulder']"; // 特定の関節

// 条件指定
"/sensors/temperature{temperature>20}"; // 温度が20度以上
"/robot/status{status=='active'}"; // アクティブ状態のみ
```

**型安全性**:

- **JSONパス**: 型情報なし
- **MessagePath**: ROSメッセージ型を考慮

**Lichtblickでの活用**:

- **Plot Panel**: 時系列データの特定フィールド抽出
- **Table Panel**: 構造化データの表示
- **3D Panel**: 位置・姿勢データの参照

**参考ファイル**: `packages/message-path/src/parseMessagePath.ts` で詳細な実装を確認できます。

</details>

## 🚀 次のステップ

基本的な専門用語を理解したら、次の章に進んでください：

**[アーキテクチャの基本概念](./03_architecture_concepts.md)** - 設計パターンの詳細な理解

---

**💡 学習のポイント**

- **実際のコードで確認**: 上記の参考ファイルを開いて、実際の使用例を確認してください
- **関連性の理解**: 用語同士の関係性を意識して学習してください
- **段階的な学習**: 一度に全て覚えようとせず、必要に応じて参照してください
