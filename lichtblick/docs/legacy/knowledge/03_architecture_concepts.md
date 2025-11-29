# 3. アーキテクチャの基本概念

## 🏗️ プロバイダーパターン (Provider Pattern)

React でグローバルな状態やサービスを提供するデザインパターン。Props のバケツリレーを避け、コンポーネント間の疎結合を実現します。

### **基本的な仕組み**

**実際の使用例**:

- アプリ設定Provider: `packages/suite-base/src/context/AppConfigurationContext.ts` (1行目〜)
- PlayerManager: `packages/suite-base/src/components/PlayerManager.tsx` (119行目〜)

```typescript
// packages/suite-base/src/context/AppConfigurationContext.ts (Context定義)
export const AppConfigurationContext = createContext<AppConfiguration | undefined>(undefined);

export function useAppConfigurationValue(): AppConfiguration {
  const value = useContext(AppConfigurationContext);
  if (!value) {
    throw new Error("useAppConfigurationValue must be used within AppConfigurationContext");
  }
  return value;
}
```

### **Lichtblick での Provider 階層**

**実際の階層構造**:

- App.tsx: `packages/suite-base/src/components/App.tsx` (1行目〜)
- MultiProvider: `packages/suite-base/src/components/MultiProvider.tsx` (1行目〜)

```typescript
// packages/suite-base/src/components/App.tsx (Provider階層の例)
export function App(props: AppProps): JSX.Element {
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

### **Provider の実装パターン**

**実際の使用例**:

- MessagePipelineProvider: `packages/suite-base/src/components/MessagePipeline/index.tsx` (73行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/index.tsx (Provider実装例)
export function MessagePipelineProvider(props: MessagePipelineProviderProps): JSX.Element {
  const store = useStore();
  const context = useMemo(() => createMessagePipelineContext(store), [store]);

  useEffect(() => {
    // Player設定の初期化
    if (props.player) {
      store.getState().actions.setPlayer(props.player);
    }
  }, [props.player, store]);

  return (
    <ContextInternal.Provider value={context}>
      {props.children}
    </ContextInternal.Provider>
  );
}
```

### **🤔 FAQ: プロバイダーパターンでよくある質問**

**Q1: なぜこんなに多くのProviderが必要なの？普通のpropsじゃダメなの？**

A: Props バケツリレーを避けるため。例えば、テーマ設定を最上位から深いコンポーネントまで渡すとき：

```typescript
// 😵 Props バケツリレー（悪い例）
<App theme={theme}>
  <Header theme={theme}>
    <Navigation theme={theme}>
      <Button theme={theme}>クリック</Button>
    </Navigation>
  </Header>
</App>

// 😊 Provider パターン（良い例）
<ThemeProvider value={theme}>
  <App>
    <Header>
      <Navigation>
        <Button>クリック</Button> {/* useTheme() でテーマ取得 */}
      </Navigation>
    </Header>
  </App>
</ThemeProvider>
```

**Q2: Provider の階層が深すぎて理解できない...**

A: 階層には順序と依存関係があります：

```typescript
// 依存関係の例
<AppConfigurationContext.Provider>     // 1. 基本設定
  <AppParametersProvider>               // 2. URLパラメータ（設定に依存）
    <ColorSchemeThemeProvider>          // 3. テーマ（設定に依存）
      <ErrorBoundary>                   // 4. エラーハンドリング
        <MultiProvider>                 // 5. 複数のProvider（全てに依存）
          <StudioApp />                 // 6. 実際のアプリ
        </MultiProvider>
      </ErrorBoundary>
    </ColorSchemeThemeProvider>
  </AppParametersProvider>
</AppConfigurationContext.Provider>
```

**Q3: `useContext` の使い方がわからない**

A: Context を使うには、Provider内で useContext を呼び出すだけ：

```typescript
// 1. Context作成
const MyContext = createContext<string | undefined>(undefined);

// 2. Provider でラップ
<MyContext.Provider value="Hello">
  <MyComponent />
</MyContext.Provider>

// 3. コンポーネントで使用
function MyComponent() {
  const value = useContext(MyContext); // "Hello" が取得される
  return <div>{value}</div>;
}
```

**Q4: Provider の value が変わると何が起こるの？**

A: Provider の value が変わると、それを使用している全てのコンポーネントが再レンダリングされます：

```typescript
// 注意：毎回新しいオブジェクトを作るとパフォーマンスが悪い
<MyContext.Provider value={{ name: "test" }}>  // 😵 毎回新しいオブジェクト

// 解決策：useMemo を使う
const value = useMemo(() => ({ name: "test" }), []);
<MyContext.Provider value={value}>  // 😊 必要な時だけ新しいオブジェクト
```

## 🎭 HOC (Higher-Order Component)

コンポーネントを受け取って、新しいコンポーネントを返す関数。共通機能を複数のコンポーネントに追加する際に使用します。

### **基本的な HOC パターン**

**実際の使用例**:

- Panel HOC: `packages/suite-base/src/components/Panel.tsx` (1行目〜)

```typescript
// packages/suite-base/src/components/Panel.tsx (HOC実装例)
export function Panel<Config>(
  Component: React.ComponentType<PanelProps<Config>>,
): React.ComponentType<PanelProps<Config>> {
  function PanelComponent(props: PanelProps<Config>) {
    // Panel共通の処理
    const { config, saveConfig } = props;

    // エラーハンドリング
    const [error, setError] = useState<Error | undefined>();

    if (error) {
      return <ErrorDisplay error={error} onRetry={() => setError(undefined)} />;
    }

    return <Component {...props} />;
  }

  PanelComponent.displayName = `Panel(${Component.displayName ?? Component.name})`;
  return PanelComponent;
}
```

### **Lichtblick での HOC 活用例**

**実際の使用例**:

- 3D Panel: `packages/suite-base/src/panels/ThreeDeeRender/index.tsx` (最終行)

```typescript
// packages/suite-base/src/panels/ThreeDeeRender/index.tsx (HOC適用例)
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

### **🤔 FAQ: HOC（Higher-Order Component）でよくある質問**

**Q1: HOC って何？普通のコンポーネントとの違いは？**

A: HOC は「コンポーネントを受け取って、新しいコンポーネントを返す関数」です：

```typescript
// 😊 普通のコンポーネント
function MyButton() {
  return <button>クリック</button>;
}

// 😊 HOC（コンポーネント→コンポーネント）
function withLoading(Component) {
  return function LoadingComponent(props) {
    if (props.loading) {
      return <div>読み込み中...</div>;
    }
    return <Component {...props} />;
  };
}

// 使用例
const ButtonWithLoading = withLoading(MyButton);
```

**Q2: なぜHOCが必要なの？**

A: 複数のコンポーネントに共通機能を追加するため：

```typescript
// 😵 同じコードを複数のコンポーネントに書く（悪い例）
function PanelA() {
  const [error, setError] = useState();
  if (error) return <ErrorDisplay error={error} />;
  return <div>Panel A</div>;
}

function PanelB() {
  const [error, setError] = useState();
  if (error) return <ErrorDisplay error={error} />;
  return <div>Panel B</div>;
}

// 😊 HOC で共通化（良い例）
function withErrorHandling(Component) {
  return function ErrorHandlingComponent(props) {
    const [error, setError] = useState();
    if (error) return <ErrorDisplay error={error} />;
    return <Component {...props} />;
  };
}

const PanelA = withErrorHandling(() => <div>Panel A</div>);
const PanelB = withErrorHandling(() => <div>Panel B</div>);
```

**Q3: `Panel(ThreeDeeRender)` って何をやってるの？**

A: `ThreeDeeRender` コンポーネントに Panel の共通機能を追加しています：

```typescript
// 元のコンポーネント
function ThreeDeeRender(props) {
  return <div>3D描画</div>;
}

// HOC適用後（実際には Panel HOC が以下の機能を追加）
function EnhancedThreeDeeRender(props) {
  // ✅ エラーハンドリング
  // ✅ 設定の保存・読み込み
  // ✅ パネルの共通スタイル
  // ✅ パフォーマンス最適化
  return <ThreeDeeRender {...props} />;
}
```

**Q4: HOC の型定義が難しい...**

A: TypeScript の HOC は段階的に理解しましょう：

```typescript
// 1. 基本的なHOC（型なし）
function withLoading(Component) {
  return function(props) {
    if (props.loading) return <div>Loading...</div>;
    return <Component {...props} />;
  };
}

// 2. 型付きHOC
function withLoading<P>(Component: React.ComponentType<P>) {
  return function(props: P & { loading?: boolean }) {
    if (props.loading) return <div>Loading...</div>;
    return <Component {...props} />;
  };
}

// 3. より複雑な型（Panel HOC のような）
function Panel<Config>(
  Component: React.ComponentType<PanelProps<Config>>
): React.ComponentType<PanelProps<Config>> {
  // 実装...
}
```

## 💉 依存性注入 (Dependency Injection)

コンポーネントが必要とする依存性を外部から注入する仕組み。テストしやすく、疎結合な設計を実現します。

### **Context を使った依存性注入**

**実際の使用例**:

- ExtensionCatalogProvider: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx` (1行目〜)

```typescript
// packages/suite-base/src/providers/ExtensionCatalogProvider.tsx (依存性注入例)
export function ExtensionCatalogProvider(props: ExtensionCatalogProviderProps): JSX.Element {
  const { children, loaders } = props;

  // 依存性の解決
  const catalog = useMemo(() => {
    return new ExtensionCatalog(loaders);
  }, [loaders]);

  return (
    <ExtensionCatalogContext.Provider value={catalog}>
      {children}
    </ExtensionCatalogContext.Provider>
  );
}

// 使用側
export function useExtensionCatalog(): ExtensionCatalog {
  const catalog = useContext(ExtensionCatalogContext);
  if (!catalog) {
    throw new Error("useExtensionCatalog must be used within ExtensionCatalogProvider");
  }
  return catalog;
}
```

### **Player の依存性注入**

**実際の使用例**:

- PlayerManager: `packages/suite-base/src/components/PlayerManager.tsx` (119行目〜)

```typescript
// packages/suite-base/src/components/PlayerManager.tsx (Player依存性注入例)
export function PlayerManager(props: PlayerManagerProps): JSX.Element {
  const { children, playerSources } = props;

  // Playerの生成と注入
  const createPlayer = useCallback(async (source: DataSource) => {
    const player = await source.initialize();
    return player;
  }, []);

  const value = useMemo(() => ({
    selectSource: async (sourceId: string, params: unknown) => {
      const source = playerSources.find(s => s.id === sourceId);
      if (!source) {
        throw new Error(`Unknown source: ${sourceId}`);
      }
      const player = await createPlayer(source);
      setCurrentPlayer(player);
    },
  }), [playerSources, createPlayer]);

  return (
    <PlayerSelectionContext.Provider value={value}>
      {children}
    </PlayerSelectionContext.Provider>
  );
}
```

### **🤔 FAQ: 依存性注入でよくある質問**

**Q1: 依存性注入って何？なぜ必要なの？**

A: 「必要なものを外から渡してもらう」仕組みです。テストや変更に強くなります：

```typescript
// 😵 依存性注入なし（悪い例）
function MyComponent() {
  const api = new ApiClient("https://api.example.com");  // 直接作成
  const data = api.getData();  // テストが困難
  return <div>{data}</div>;
}

// 😊 依存性注入あり（良い例）
function MyComponent({ apiClient }) {  // 外から渡してもらう
  const data = apiClient.getData();  // テストしやすい
  return <div>{data}</div>;
}

// 使用例
<MyComponent apiClient={new ApiClient("https://api.example.com")} />
// テスト時
<MyComponent apiClient={new MockApiClient()} />
```

**Q2: Context を使った依存性注入の流れがわからない**

A: 3ステップで理解しましょう：

```typescript
// 1. Provider で依存性を提供
<ExtensionCatalogProvider loaders={extensionLoaders}>
  <App />
</ExtensionCatalogProvider>

// 2. Provider 内で依存性を解決
function ExtensionCatalogProvider({ loaders, children }) {
  const catalog = useMemo(() => new ExtensionCatalog(loaders), [loaders]);
  return (
    <ExtensionCatalogContext.Provider value={catalog}>
      {children}
    </ExtensionCatalogContext.Provider>
  );
}

// 3. コンポーネントで使用
function MyComponent() {
  const catalog = useExtensionCatalog();  // 依存性を取得
  return <div>{catalog.getExtensions().length}</div>;
}
```

**Q3: `useMemo` や `useCallback` がよく出てくるけど、なぜ必要？**

A: 不要な再レンダリングを防ぐためです：

```typescript
// 😵 毎回新しいオブジェクトを作る（悪い例）
function MyProvider({ children }) {
  const value = { data: "test" };  // 毎回新しいオブジェクト
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
}

// 😊 必要な時だけ新しいオブジェクトを作る（良い例）
function MyProvider({ children }) {
  const value = useMemo(() => ({ data: "test" }), []);  // 初回のみ
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
}
```

## 🔄 状態管理パターン

### **Zustand を使った状態管理**

**実際の使用例**:

- MessagePipelineStore: `packages/suite-base/src/components/MessagePipeline/store.ts` (1行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/store.ts (Zustand使用例)
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
      // Player設定の更新
      player.setListener(async (playerState) => {
        state.actions.updatePlayerState(playerState);
      });
    },

    updateSubscriptions: (subscriberId: string, subscriptions: SubscribePayload[]) => {
      set((state) => ({
        subscriptions: new Map(state.subscriptions.set(subscriberId, subscriptions)),
      }));
    },

    updatePlayerState: (playerState: PlayerState) => {
      set((state) => updatePlayerStateAction(state, { playerState }));
    },
  },
}));
```

### **Context + Reducer パターン**

**実際の使用例**:

- LayoutManager: `packages/suite-base/src/providers/LayoutManagerProvider.tsx` (1行目〜)

```typescript
// packages/suite-base/src/providers/LayoutManagerProvider.tsx (Reducer使用例)
interface LayoutState {
  selectedLayout?: Layout;
  layouts: Layout[];
  loading: boolean;
}

type LayoutAction =
  | { type: "LOAD_LAYOUTS"; layouts: Layout[] }
  | { type: "SELECT_LAYOUT"; layout: Layout }
  | { type: "UPDATE_LAYOUT"; layout: Layout };

function layoutReducer(state: LayoutState, action: LayoutAction): LayoutState {
  switch (action.type) {
    case "LOAD_LAYOUTS":
      return { ...state, layouts: action.layouts, loading: false };
    case "SELECT_LAYOUT":
      return { ...state, selectedLayout: action.layout };
    case "UPDATE_LAYOUT":
      return {
        ...state,
        layouts: state.layouts.map((layout) =>
          layout.id === action.layout.id ? action.layout : layout,
        ),
      };
    default:
      return state;
  }
}
```

### **🤔 FAQ: 状態管理でよくある質問**

**Q1: Zustand って何？Redux や Context との違いは？**

A: Zustand は軽量な状態管理ライブラリです：

```typescript
// Redux（複雑）
const store = createStore(reducer);
const mapStateToProps = (state) => ({ count: state.count });
const mapDispatchToProps = { increment };
connect(mapStateToProps, mapDispatchToProps)(Component);

// Context（中程度）
const CountContext = createContext();
const useCount = () => useContext(CountContext);

// Zustand（シンプル）
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

**Q2: `create` の引数の `set` と `get` って何？**

A: 状態の更新と取得のための関数です：

```typescript
const useStore = create((set, get) => ({
  count: 0,

  // set: 状態を更新する
  increment: () => set((state) => ({ count: state.count + 1 })),

  // get: 現在の状態を取得する
  double: () => {
    const currentCount = get().count; // 現在の値を取得
    set({ count: currentCount * 2 }); // 倍にして更新
  },
}));
```

**Q3: なぜ actions を分けるの？**

A: 状態の更新ロジックを整理するためです：

```typescript
// 😵 直接更新（悪い例）
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));

// 😊 actions でまとめる（良い例）
const useStore = create((set) => ({
  count: 0,
  actions: {
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
    reset: () => set({ count: 0 }),
  },
}));
```

**Q4: Context + Reducer パターンって何？**

A: 複雑な状態変更をReducerで管理するパターンです：

```typescript
// 1. 状態の型定義
interface State {
  count: number;
  loading: boolean;
}

// 2. アクションの型定義
type Action =
  | { type: "INCREMENT" }
  | { type: "DECREMENT" }
  | { type: "SET_LOADING"; loading: boolean };

// 3. Reducer（状態更新ロジック）
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INCREMENT":
      return { ...state, count: state.count + 1 };
    case "DECREMENT":
      return { ...state, count: state.count - 1 };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

// 4. Context + Reducer の使用
function MyProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { count: 0, loading: false });
  return (
    <MyContext.Provider value={{ state, dispatch }}>
      {children}
    </MyContext.Provider>
  );
}
```

## 🎨 コンポーネント設計パターン

### **Compound Component パターン**

**実際の使用例**:

- Workspace: `packages/suite-base/src/components/Workspace.tsx` (1行目〜)

```typescript
// packages/suite-base/src/components/Workspace.tsx (Compound Component例)
export function Workspace(): JSX.Element {
  return (
    <div className="workspace">
      <Workspace.Header />
      <Workspace.Body>
        <Workspace.Sidebar />
        <Workspace.Content />
      </Workspace.Body>
      <Workspace.Footer />
    </div>
  );
}

// 子コンポーネントの定義
Workspace.Header = function WorkspaceHeader() {
  return <AppBar />;
};

Workspace.Body = function WorkspaceBody({ children }: { children: React.ReactNode }) {
  return <div className="workspace-body">{children}</div>;
};

Workspace.Sidebar = function WorkspaceSidebar() {
  return <SidebarWrapper />;
};

Workspace.Content = function WorkspaceContent() {
  return <PanelLayout />;
};

Workspace.Footer = function WorkspaceFooter() {
  return <PlaybackControls />;
};
```

### **Render Props パターン**

**実際の使用例**:

- MessagePipeline Hook: `packages/suite-base/src/components/MessagePipeline/index.tsx` (1行目〜)

```typescript
// packages/suite-base/src/components/MessagePipeline/index.tsx (Render Props的なHook)
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

### **🤔 FAQ: コンポーネント設計パターンでよくある質問**

**Q1: Compound Component って何？普通のコンポーネントとの違いは？**

A: 親コンポーネントと子コンポーネントが密接に連携するパターンです：

```typescript
// 😵 普通のコンポーネント（柔軟性が低い）
function Card({ title, content, footer }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>{content}</p>
      <div>{footer}</div>
    </div>
  );
}

// 😊 Compound Component（柔軟性が高い）
function Card({ children }) {
  return <div className="card">{children}</div>;
}

Card.Header = ({ children }) => <h2>{children}</h2>;
Card.Body = ({ children }) => <p>{children}</p>;
Card.Footer = ({ children }) => <div>{children}</div>;

// 使用例
<Card>
  <Card.Header>タイトル</Card.Header>
  <Card.Body>内容</Card.Body>
  <Card.Footer>フッター</Card.Footer>
</Card>
```

**Q2: `Workspace.Header` みたいな書き方はどうやってるの？**

A: オブジェクトのプロパティにコンポーネントを追加しています：

```typescript
// 1. 基本コンポーネント
function Workspace() {
  return <div>Workspace</div>;
}

// 2. 子コンポーネントを追加
Workspace.Header = function WorkspaceHeader() {
  return <header>Header</header>;
};

Workspace.Body = function WorkspaceBody() {
  return <main>Body</main>;
};

// 3. 実際に使用
<Workspace>
  <Workspace.Header />
  <Workspace.Body />
</Workspace>
```

**Q3: Render Props って何？**

A: 関数を props として渡すパターンです：

```typescript
// 😊 Render Props の例
function DataLoader({ render }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData().then(setData).finally(() => setLoading(false));
  }, []);

  return render({ data, loading });  // 関数を呼び出す
}

// 使用例
<DataLoader
  render={({ data, loading }) => (
    loading ? <div>Loading...</div> : <div>{data}</div>
  )}
/>
```

**Q4: Hook版のRender Propsって何？**

A: Custom Hook を使って Render Props の機能を実現するパターンです：

```typescript
// 😊 Custom Hook（Hook版Render Props）
function useMessagePipeline(selector) {
  const context = useContext(MessagePipelineContext);
  return selector(context);  // selector関数を呼び出す
}

// 使用例（必要なデータだけ選択）
function MyPanel() {
  const playerState = useMessagePipeline(ctx => ctx.playerState);
  const messages = useMessagePipeline(ctx => ctx.messages);

  return <div>{/* Panel content */}</div>;
}
```

## 🧩 モジュラーアーキテクチャ

### **パッケージ分離**

**実際の構造**:

- suite-base: 中核機能
- suite-desktop: デスクトップ固有機能
- suite-web: Web固有機能
- mcap-support: MCAP処理専用

**実際の使用例**:

- 共通型定義: `packages/suite-base/src/types/` (ディレクトリ全体)
- デスクトップ固有: `packages/suite-desktop/src/main/` (ディレクトリ全体)

### **機能別モジュール**

**実際の使用例**:

- Player模块: `packages/suite-base/src/players/` (ディレクトリ全体)
- Panel模块: `packages/suite-base/src/panels/` (ディレクトリ全体)
- Hook模块: `packages/suite-base/src/hooks/` (ディレクトリ全体)

```typescript
// packages/suite-base/src/players/index.ts (モジュール構成例)
export { default as Ros1Player } from "./Ros1Player";
export { default as RosbridgePlayer } from "./RosbridgePlayer";
export { default as McapPlayer } from "./McapPlayer";
export { default as VelodynePlayer } from "./VelodynePlayer";
export type { Player, PlayerState } from "./types";
```

### **🤔 FAQ: モジュラーアーキテクチャでよくある質問**

**Q1: なぜこんなにパッケージが分かれてるの？**

A: 責任の分離と再利用性のためです：

```
packages/
  suite-base/      # 中核機能（どこでも使える）
  suite-desktop/   # デスクトップ固有（Electron等）
  suite-web/       # Web固有（ブラウザ API 等）
  mcap-support/    # MCAP処理専用（独立性）
  den/             # 汎用ユーティリティ
```

**Q2: どのパッケージに何を書けばいいの？**

A: 依存関係を意識して配置しましょう：

```typescript
// ✅ suite-base（中核機能）
export interface Player {
  play(): void;
  pause(): void;
}

// ✅ suite-desktop（デスクトップ固有）
export class ElectronPlayer implements Player {
  // Electron固有の実装
}

// ✅ suite-web（Web固有）
export class WebPlayer implements Player {
  // Web固有の実装
}

// ❌ 悪い例（suite-base に Electron固有コード）
export class Player {
  // これはNG：suite-base に Electron コードは書かない
  private electronAPI = require("electron");
}
```

**Q3: `index.ts` ファイルの役割って何？**

A: モジュールの公開インターフェースを定義します：

```typescript
// packages/suite-base/src/players/index.ts
export { default as Ros1Player } from "./Ros1Player";
export { default as RosbridgePlayer } from "./RosbridgePlayer";
export type { Player, PlayerState } from "./types";

// 使用側
import { Ros1Player, Player } from "packages/suite-base/src/players";
// 個別ファイルを直接importしない：
// import Ros1Player from "packages/suite-base/src/players/Ros1Player";
```

**Q4: パッケージ間の依存関係はどうなってるの？**

A: 依存関係の方向を意識しましょう：

```
依存関係の流れ：
suite-desktop → suite-base ← suite-web
                     ↑
                mcap-support
                     ↑
                    den
```

```typescript
// ✅ 良い例（上位→下位）
// suite-desktop から suite-base を使用
import { Player } from "packages/suite-base";

// ❌ 悪い例（下位→上位）
// suite-base から suite-desktop を使用（循環依存）
import { ElectronAPI } from "packages/suite-desktop";
```

## 🚀 次のステップ

アーキテクチャの基本概念を理解したら、次の章に進んでください：

**[主要コンポーネント](./04_main_components.md)** - 具体的なコンポーネントの詳細

---

**💡 学習のポイント**

- **設計パターンの理解**: なぜそのパターンが使われているかを考える
- **実際のコードで確認**: 上記の参考ファイルを開いて、パターンの実装を確認
- **段階的な理解**: 複雑なパターンは小さな部分から理解を始める
- **実践的な応用**: 学んだパターンを自分のコードで試してみる
