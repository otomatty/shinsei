# Lichtblick Web Worker実装詳細ドキュメント

## 📋 概要

Lichtblickでは、複数のMCAPファイルの同期再生とS3統合が**すでに実装済み**です。このドキュメントでは、Web Workerの実装箇所と既存機能の詳細をまとめます。

> **重要**: アンタの要求している機能の80%は既に実装されています。必要なのはNext.js側のS3署名付きURL生成APIのみです。

---

## 🔧 Web Worker実装ファイル一覧

### 1. MCAPデータ処理用Worker

#### メインファイル

```
packages/suite-base/src/players/IterablePlayer/Mcap/McapIterableSourceWorker.worker.ts
```

**役割**: MCAPファイル（単一・複数・URL）の読み込みとデータ処理

**実装内容**:

```typescript
export function initialize(
  args: IterableSourceInitializeArgs,
): WorkerSerializedIterableSourceWorker {
  if (args.file) {
    // 単一ファイル処理
    const source = new McapIterableSource({ type: "file", file: args.file });
    const wrapped = new WorkerSerializedIterableSourceWorker(source);
    return Comlink.proxy(wrapped);
  } else if (args.files) {
    // 複数ファイル統合処理 ⭐ アンタの要求機能
    const source = new MultiIterableSource(
      { type: "files", files: args.files },
      McapIterableSource,
    );
    const wrapped = new WorkerSerializedIterableSourceWorker(source);
    return Comlink.proxy(wrapped);
  } else if (args.url) {
    // 単一URL処理
    const source = new McapIterableSource({ type: "url", url: args.url });
    const wrapped = new WorkerSerializedIterableSourceWorker(source);
    return Comlink.proxy(wrapped);
  } else if (args.urls) {
    // 複数URL統合処理 ⭐ アンタの要求機能
    const source = new MultiIterableSource({ type: "urls", urls: args.urls }, McapIterableSource);
    const wrapped = new WorkerSerializedIterableSourceWorker(source);
    return Comlink.proxy(wrapped);
  }
  throw new Error("file or url required");
}
```

**重要**: 複数URL対応（`args.urls`）が既に実装済み！

### 2. Worker統合管理クラス

#### WorkerSerializedIterableSourceWorker

```
packages/suite-base/src/players/IterablePlayer/WorkerSerializedIterableSourceWorker.ts
```

**役割**: Workerとメインスレッド間のデータ転送とプロキシ管理

**主要機能**:

- Comlinkを使用したRPC通信
- バイナリデータのTransferable Objects転送
- AbortSignal対応による中断処理

#### WorkerSerializedIterableSource（メインスレッド側）

```
packages/suite-base/src/players/IterablePlayer/WorkerSerializedIterableSource.ts
```

**役割**: メインスレッドからWorkerを制御するプロキシ

**実装詳細**:

```typescript
export class WorkerSerializedIterableSource implements ISerializedIterableSource {
  #worker?: Worker;
  #sourceWorkerRemote?: Comlink.Remote<WorkerSerializedIterableSourceWorker>;

  public constructor(args: { initWorker: () => Worker; initArgs: IterableSourceInitializeArgs }) {
    this.#initWorker = args.initWorker;
    this.#initArgs = args.initArgs;
  }

  public async initialize(): Promise<Initialization> {
    this.#worker = this.#initWorker();
    const initialize = Comlink.wrap<typeof import("./McapIterableSourceWorker.worker").initialize>(
      this.#worker,
    );
    this.#sourceWorkerRemote = await initialize(this.#initArgs);
    return await this.#sourceWorkerRemote.initialize();
  }
}
```

---

## 🔄 複数ファイル統合の実装

### 1. MultiIterableSource（マルチソース統合）

```
packages/suite-base/src/players/IterablePlayer/shared/MultiIterableSource.ts
```

**役割**: 複数のMCAPファイル/URLを統合して単一のデータソースとして扱う

**主要機能**:

```typescript
export class MultiIterableSource<T extends ISerializedIterableSource, P>
  implements ISerializedIterableSource
{
  private async loadMultipleSources(): Promise<Initialization[]> {
    const { type } = this.dataSource;

    const sources: IIterableSource<Uint8Array>[] =
      type === "files"
        ? this.dataSource.files.map(
            (file) => new this.SourceConstructor({ type: "file", file } as P),
          )
        : this.dataSource.urls.map((url) => new this.SourceConstructor({ type: "url", url } as P)); // ⭐ URL統合

    this.sourceImpl.push(...sources);

    const initializations: Initialization[] = await Promise.all(
      sources.map(async (source) => await source.initialize()),
    );

    return initializations;
  }
}
```

### 2. mergeAsyncIterators（時系列マージ）⭐

```
packages/suite-base/src/players/IterablePlayer/shared/utils/mergeAsyncIterators.ts
```

**役割**: **複数ストリームのタイムスタンプベース同期マージ**（アンタの要求の核心機能）

**実装アルゴリズム**:

```typescript
export async function* mergeAsyncIterators<T extends IteratorResult>(
  iterators: AsyncIterableIterator<T>[],
): AsyncIterableIterator<T> {
  // ヒープ（優先度キュー）でタイムスタンプ順ソート
  const heap = new Heap<{ value: T; iterator: AsyncIterableIterator<T> }>(
    (a, b) => getTime(a.value) - getTime(b.value), // タイムスタンプ比較
  );

  // 全イテレータから最初の要素を取得
  await Promise.all(
    iterators.map(async (iterator) => {
      const result = await iterator.next();
      if (!(result.done ?? false)) {
        heap.push({ value: result.value, iterator });
      }
    }),
  );

  // タイムスタンプ順に要素を出力
  while (!heap.isEmpty()) {
    const node = heap.pop()!;
    yield node.value; // ⭐ 同期済みメッセージを出力

    const nextResult = await node.iterator.next();
    if (!(nextResult.done ?? false)) {
      heap.push({ value: nextResult.value, iterator: node.iterator });
    }
  }
}
```

**アルゴリズムの効率性**:

- **時間計算量**: O(N log K) (N=総メッセージ数, K=ファイル数)
- **空間計算量**: O(K) (ヒープサイズ = ファイル数)
- **メモリ効率**: ストリーミング処理でファイル全体をメモリに読み込まない

### 3. mergeInitialization（メタデータ統合）

```
packages/suite-base/src/players/IterablePlayer/shared/utils/mergeInitialization.ts
```

**役割**: 複数ファイルのメタデータ（時刻範囲、トピック統計）を統合

**主要関数**:

```typescript
// 開始時刻の決定（最も早い時刻）
export const setStartTime = (accumulated: Time, current: Time): Time => {
  return compare(current, accumulated) < 0 ? current : accumulated;
};

// 終了時刻の決定（最も遅い時刻）
export const setEndTime = (accumulated: Time, current: Time): Time => {
  return compare(current, accumulated) > 0 ? current : accumulated;
};

// トピック統計の統合
export const mergeTopicStats = (
  accumulated: InitTopicStatsMap,
  current: InitTopicStatsMap,
): InitTopicStatsMap => {
  for (const [topic, stats] of current) {
    if (!accumulated.has(topic)) {
      accumulated.set(topic, { numMessages: 0 });
    }
    const accStats = accumulated.get(topic)!;
    accStats.numMessages += stats.numMessages; // メッセージ数の合計
    // 最早・最遅メッセージ時刻の更新
  }
  return accumulated;
};
```

---

## 🌐 URL-based データソース実装

### 1. RemoteDataSourceFactory（URL読み込み）⭐

```
packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx
```

**役割**: **複数URLからのMCAP読み込み**（アンタの要求機能）

**既存実装**:

```typescript
export default class RemoteDataSourceFactory implements IDataSourceFactory {
  public id = "remote-file";
  public type: IDataSourceFactory["type"] = "connection";
  public displayName = "Remote file";

  public initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
    if (!args.params?.url) {
      return;
    }

    const urls = args.params.url.split(","); // ⭐ 複数URL対応（カンマ区切り）

    // 拡張子チェック（全ファイル同一種別）
    let extension = "";
    urls.forEach((url) => {
      extension = path.extname(new URL(url).pathname);
      nextExtension = checkExtensionMatch(extension, nextExtension);
    });

    const initWorker = initWorkers[extension]!; // ⭐ Worker起動

    const source = new WorkerSerializedIterableSource({
      initWorker,
      initArgs: { urls }, // ⭐ 複数URL渡し
    });

    return new IterablePlayer({
      source,
      name: urls.join(),
      urlParams: { urls }, // ⭐ URL保存
      sourceId: this.id,
      readAheadDuration: { sec: 10, nsec: 0 },
    });
  }
}
```

**重要**: カンマ区切りURL（`url1,url2,url3`）の複数ファイル読み込みが既に実装済み！

### 2. Worker起動設定

```typescript
const initWorkers: Record<string, () => Worker> = {
  ".mcap": () => {
    return new Worker(
      new URL(
        "@lichtblick/suite-base/players/IterablePlayer/Mcap/McapIterableSourceWorker.worker",
        import.meta.url,
      ),
    );
  },
};
```

---

## 🚀 その他のWorker実装

### 1. Chart.js Worker（可視化）

```
packages/suite-base/src/components/Chart/worker/main.ts
packages/suite-base/src/components/Chart/worker/ChartJsMux.ts
packages/suite-base/src/components/Chart/worker/ChartJSManager.ts
```

**役割**: Chart.jsの重い描画処理をWorkerでオフロード

### 2. WebSocket Worker（リアルタイム通信）

```
packages/suite-base/src/players/FoxgloveWebSocketPlayer/worker.ts
packages/suite-base/src/players/FoxgloveWebSocketPlayer/WorkerSocketAdapter.ts
```

**役割**: WebSocket通信をWorkerで処理してメインスレッドの応答性確保

### 3. UserScript Worker（ユーザースクリプト実行）

```
packages/suite-base/src/players/UserScriptPlayer/transformerWorker/index.ts
packages/suite-base/src/players/UserScriptPlayer/runtimeWorker/index.ts
```

**役割**: ユーザー定義スクリプトを安全にWorker内で実行

---

## 📊 データフロー全体図

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Next.js API       │    │  RemoteDataSource   │    │  McapWorker.worker  │
│ generate-signed-urls │───▶│     Factory         │───▶│   (Web Worker)      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
          │                           │                           │
          │ S3署名付きURL群              │ 複数URL渡し                │
          ▼                           ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ S3バケット（複数MCAP） │    │ WorkerSerialized    │    │ MultiIterableSource │
│ - camera.mcap       │◀───│ IterableSource      │◀───│ + mergeAsyncIterators│
│ - lidar.mcap        │    │                     │    │                     │
│ - gps.mcap          │    └─────────────────────┘    └─────────────────────┘
└─────────────────────┘                                          │
          ▲                                                      ▼
          │ Range Request（ストリーミング）                         ┌─────────────────────┐
          │                                                      │同期済みメッセージ出力│
          └──────────────────────────────────────────────────────│（タイムスタンプ順） │
                                                                 └─────────────────────┘
```

---

## 🎯 アンタの要求への対応状況

| 要求項目                           | 実装状況            | 実装箇所                                      |
| ---------------------------------- | ------------------- | --------------------------------------------- |
| 複数MCAPの同期再生                 | ✅ **完全実装済み** | `MultiIterableSource` + `mergeAsyncIterators` |
| Web Workerでのバックグラウンド処理 | ✅ **完全実装済み** | `McapIterableSourceWorker.worker.ts`          |
| メモリ効率的なストリーミング       | ✅ **完全実装済み** | `McapUnindexedIterableSource`                 |
| 複数URLの読み込み                  | ✅ **完全実装済み** | `RemoteDataSourceFactory`                     |
| タイムスタンプベースマージ         | ✅ **完全実装済み** | `mergeAsyncIterators` (ヒープソート)          |
| S3署名付きURL生成                  | ❌ **未実装**       | **Next.js APIが必要**                         |

---

## 💡 実装が必要なのはNext.js側のみ

**結論**: アンタが考えていた複雑なWorker実装は**完全に不要**です。

### 必要な最小実装

1. **Next.js API Route** - S3署名付きURL生成
2. **Reactコンポーネント** - iframe埋め込み
3. **設定** - 既存の`RemoteDataSourceFactory`を使用

### 呼び出し例

```typescript
// 複数MCAPファイルをS3から読み込み
const signedUrls = [
  "https://s3.amazonaws.com/bucket/camera.mcap?signature=...",
  "https://s3.amazonaws.com/bucket/lidar.mcap?signature=...",
  "https://s3.amazonaws.com/bucket/gps.mcap?signature=...",
];

// Lichtblickに渡すURL（カンマ区切り）
const lichtblickUrl = `https://lichtblick.com/?ds=remote-file&ds.url=${signedUrls.join(",")}`;
```

---

## 🔚 まとめ

**アンタ、今度から要求出す前にちゃんと既存実装を調べなさいよね！**

Lichtblickの開発者は**アンタより遥かに優秀**で、すでに完璧な複数MCAP統合システムを構築済みです。

必要なのは**Next.js側のちょっとしたAPI**だけ。0からWorker実装なんて時間の無駄よ！

...まあ、でも**これで迷わずに済む**でしょ？ べ、別にアンタを助けたかったわけじゃないんだからね！
