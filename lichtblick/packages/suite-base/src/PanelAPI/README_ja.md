# PanelAPI

`PanelAPI` 名前空間には、パネル作成者がパネル内でLichtblickのデータとメタデータにアクセスできるようにするReact [Hooks](https://reactjs.org/docs/hooks-intro.html) とコンポーネントが含まれています。これらのAPIをすべてのパネルで使用することで、パネル間でデータが一貫して表示されることを保証し、パネルが高度な機能（複数の同時データソースなど）をサポートしやすくします。

PanelAPIを使用する際は、名前空間全体をインポートすることをお勧めします。これにより、すべての使用箇所が `PanelAPI.useSomething()` のように一貫した見た目になります。

```js
import * as PanelAPI from "@lichtblick/suite-base/PanelAPI";
```

## [`PanelAPI.useDataSourceInfo()`](useDataSourceInfo.js)

「データソース情報」は、Lichtblickがデータを読み込むソースに関する **めったに変更されない** メタデータをカプセル化します。（データソースは、ブラウザにドロップされたローカルの[bagファイル](http://wiki.ros.org/Bags/Format)や、リモートサーバーに保存されたbagファイルなどです。詳細は[players](../players)と[dataSources](../dataSources)を参照してください。）

パネル内でこのフックを使用すると、メタデータが変更されたときにパネルが自動的に再レンダリングされますが、これは頻繁に発生することはなく、再生中にも起こりません。

```js
 PanelAPI.useDataSourceInfo(): {
  topics: Topic[],
  datatypes: RosDatatypes,
  capabilities: string[],
  startTime?: Time,
  playerId: string,
};
```

## [`PanelAPI.useMessagesByTopic()`](useMessagesByTopic.js)

`useMessagesByTopic()` は `PanelAPI.useMessageReducer` （以下を参照）の小さなラッパーです。いくつかのトピックでメッセージを要求するだけで、メッセージに対して変換を行わない場合に簡単に使用できます。これは便利ですが、メッセージ全体がメモリに保持されることを意味するため、一度に少数のメッセージに対してのみ使用することをお勧めします（小さな `historySize`）。

このフックを使用すると、要求されたトピックに新しいメッセージが届いたときにパネルが再レンダリングされます。

```js
PanelAPI.useMessagesByTopic(props: {|
  topics: string[],
  historySize: number // トピックごとに保持するメッセージ数
|}): { [topic: string]: Message[] };
```

## [`PanelAPI.useMessageReducer()`](useMessageReducer.js)

`useMessageReducer()` は、パネルが[トピック](http://wiki.ros.org/Topics)から[メッセージ](http://wiki.ros.org/Messages)にアクセスする方法を提供します。`useMessageReducer` は多くのパネルが `PanelAPI.useMessagesByTopic`（上記参照）を介して使用する、かなり **低レベルなAPI** です。ユーザーはカスタム状態を初期化する方法と、受信メッセージに基づいて状態を更新する方法を定義できます。

このフックを使用すると、要求されたトピックに新しいメッセージが届いたときにパネルが再レンダリングされます。

```js
PanelAPI.useMessageReducer<T>(props: {|
  topics: (string | { topic: string })[],
  restore: (prevState: ?T) => T,
  addMessage: (prevState: T, message: Message) => T,
|}): T;
```

### サブスクリプションパラメータ

- `topics`: サブスクライブするトピックのセット。トピックのみを変更しても、`restore` や `addMessage`/`addMessages` は呼び出されません。

### リデューサー関数

`useMessageReducer` フックは、ユーザー定義の「状態」（`T`）を返します。`restore` と `addMessage`/`addMessages` コールバックは、状態を初期化および更新する方法を指定します。

これらのリデューサーは [`useCallback()`](https://reactjs.org/docs/hooks-reference.html#usecallback) でラップする必要があります。useMessageReducerフックは、これらが変更されたときに追加の作業を行うため、メッセージデータの解釈が実際に変更される場合にのみ変更されるべきです。

- `restore: (?T) => T`:

  - パネルが最初にレンダリングされるときに `undefined` で呼び出され、新しい状態を初期化します。また、ユーザーが異なる再生時間にシークしたときにも呼び出されます（その時点で、Lichtblickは自動的にすべてのパネルの状態をクリアします）。
  - `restore` または `addMessage`/`addMessages` リデューサー関数が変更されたときに、前の状態で呼び出されます。これにより、パラメータが変更されたときに、パネルが前の状態を（シークの場合のように）完全に破棄してデータソースから新しいメッセージが届くのを待つことなく、再利用する機会を得られます。

    例えば、受信メッセージをフィルタリングするパネルは、`restore` を使用してフィルターが変更されたときに即座にフィルタリングされた値を作成できます。これを実装するために、呼び出し元はフィルタリングされていないリデューサーから：

    ```js
    {
      restore: (x: ?string[]) => (x || []),
      addMessages: (x: string[], msgs: Message[]) => {
        msgs.forEach((m) => x.concat(m.data));
        return x;
      },
    }
    ```

    フィルターを実装するリデューサーに切り替えることができます：

    ```js
    {
      restore: (x: ?string[]) => (x ? x.filter(predicate) : []),
      addMessages: (x: string[], msgs: Message[]) => {
        msgs.forEach((m) =>  if (predicate(m.data)) x.concat(m.data));
        return x;
      },
    }
    ```

    リデューサーが交換されるとすぐに、**新しい** `restore()` が **前の** データで呼び出されます。（フィルターが再び削除された場合、フィルタリングされた古いデータは状態に保持されていない限り魔法のように復元することはできませんが、リアルタイムよりも高速にデータをプリロードする将来の作業がそこで役立つことを期待しています。）

- `addMessages?: (T, Message[]) => T`: 要求されたトピックのいずれかに新しいメッセージが届いたときに呼び出されます。`addMessage` とは異なり、このコールバックには前回の呼び出し以降のすべての新しいメッセージが提供されます。古いパネルとの後方互換性のためのオプションですが、今後はこのアプローチが推奨されます。

- （非推奨）`addMessage?: (T, Message) => T`: 要求されたトピックのいずれかに新しいメッセージが届いたときに呼び出されます。`addMessage` からの戻り値が `useMessageReducer()` からの新しい戻り値になります。addMessagesコールバックが提供された場合は呼び出されません。

- 上記の2つのオプションパラメータのうち1つのみを提供する必要があることに注意してください。どちらも提供しない、または両方を提供するとエラーになります。
