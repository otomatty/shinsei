# MCAP複数URL再生 実装戦略ドキュメント

## 📋 概要

複数MCAPファイルのS3からの同期再生を実現するための包括的な実装戦略を提示します。インデックス化とストリーミング処理の2つのアプローチで、メモリ効率と処理性能を両立します。

> **目標**: 複数の大容量MCAPファイル（非インデックス含む）をS3から効率的に読み込み、タイムスタンプベースで同期再生する

---

## 🎯 実装戦略の全体像

### 戦略1: インデックス化アプローチ ⭐ **推奨**

**概要**: 非インデックスMCAPファイルを動的にインデックス化し、高効率処理を実現

### 戦略2: ストリーミングアプローチ

**概要**: 非インデックスファイルをメモリ効率的にストリーミング処理

### 戦略3: ハイブリッドアプローチ

**概要**: ファイル特性に応じて戦略1と戦略2を自動選択

---

## 🚀 戦略1: インデックス化アプローチ（推奨）

### 1.1 概要

非インデックスMCAPファイルを**動的にインデックス化**し、既存の高効率な`McapIndexedIterableSource`を活用する戦略。

### 1.2 インデックス化のタイミング

#### A. サーバーサイド事前インデックス化 ⭐ **最適**

```typescript
// Lambda関数での事前インデックス化
export async function mcapIndexingLambda(event: S3Event) {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;

    if (!key.endsWith(".mcap")) continue;

    // 既にインデックス化済みかチェック
    if (await isAlreadyIndexed(bucket, key)) continue;

    // インデックス化処理
    await indexMcapFile(bucket, key);
  }
}

async function indexMcapFile(bucket: string, key: string) {
  const s3 = new AWS.S3();

  // 1. オリジナルファイルをストリーミング読み込み
  const stream = s3.getObject({ Bucket: bucket, Key: key }).createReadStream();

  // 2. MCAPストリームリーダーで解析
  const reader = new McapStreamReader({ includeChunks: true });
  const indexBuilder = new McapIndexBuilder();

  // 3. インデックス情報を構築
  for await (const chunk of stream) {
    reader.append(chunk);
    for (let record; (record = reader.nextRecord()); ) {
      indexBuilder.addRecord(record);
    }
  }

  // 4. インデックス付きMCAPファイルを生成
  const indexedBuffer = indexBuilder.build();

  // 5. インデックス版をS3に保存（元ファイルを上書き or 別名保存）
  await s3
    .putObject({
      Bucket: bucket,
      Key: key.replace(".mcap", ".indexed.mcap"), // または元ファイル上書き
      Body: indexedBuffer,
      Metadata: {
        "mcap-indexed": "true",
        "original-size": String(originalSize),
        "indexed-size": String(indexedBuffer.length),
      },
    })
    .promise();
}
```

**利点**:

- ✅ クライアントサイドの処理負荷ゼロ
- ✅ 既存の`McapIndexedIterableSource`を完全活用
- ✅ 複数ファイルでの高効率処理
- ✅ 一度の処理で永続的な最適化

**欠点**:

- ❌ サーバーサイド実装が必要
- ❌ ストレージ使用量の増加

#### B. クライアントサイド動的インデックス化

```typescript
// カスタムMcapDynamicIndexingSource
export class McapDynamicIndexingSource implements ISerializedIterableSource {
  #originalUrl: string;
  #indexedSource?: McapIndexedIterableSource;
  #unindexedSource?: McapUnindexedIterableSource;

  public constructor(url: string) {
    this.#originalUrl = url;
  }

  public async initialize(): Promise<Initialization> {
    // 1. ファイルの最初の部分を読み込んでインデックス判定
    const response = await fetch(this.#originalUrl, {
      headers: { Range: "bytes=0-65535" }, // 最初64KB
    });

    const partialBuffer = await response.arrayBuffer();
    const isIndexed = await this.checkIfIndexed(partialBuffer);

    if (isIndexed) {
      // 既にインデックス化済み → 高効率処理
      const readable = new RemoteFileReadable(this.#originalUrl);
      const reader = await McapIndexedReader.Initialize({ readable });
      this.#indexedSource = new McapIndexedIterableSource(reader);
      return await this.#indexedSource.initialize();
    } else {
      // 非インデックス → 動的インデックス化
      return await this.createDynamicIndex();
    }
  }

  private async createDynamicIndex(): Promise<Initialization> {
    // ⭐ Web Worker内でインデックス化処理
    const worker = new Worker(new URL("./McapIndexingWorker.worker", import.meta.url));

    const indexData = await new Promise<McapIndexData>((resolve, reject) => {
      worker.postMessage({ url: this.#originalUrl, action: "create-index" });

      worker.onmessage = (e) => {
        if (e.data.type === "index-complete") {
          resolve(e.data.indexData);
        } else if (e.data.type === "error") {
          reject(new Error(e.data.message));
        }
      };
    });

    // インデックス情報をメモリ上で構築してMcapIndexedIterableSourceを作成
    const virtualReader = new VirtualMcapIndexedReader(this.#originalUrl, indexData);
    this.#indexedSource = new McapIndexedIterableSource(virtualReader);

    return await this.#indexedSource.initialize();
  }
}
```

### 1.3 インデックス化の具体的実装

#### MCAPインデックス構造の理解

```typescript
interface McapIndexData {
  // チャンクインデックス（高レベル位置情報）
  chunkIndexes: Array<{
    messageStartTime: bigint; // チャンク内最初のメッセージ時刻
    messageEndTime: bigint; // チャンク内最後のメッセージ時刻
    messageIndexOffset: bigint; // メッセージインデックスの位置
    messageIndexLength: bigint; // メッセージインデックスのサイズ
    compression: string; // 圧縮形式（"", "lz4", "zstd"）
    compressedSize: bigint; // 圧縮後のサイズ
    uncompressedSize: bigint; // 展開後のサイズ
    chunkOffset: bigint; // ファイル内のチャンク位置
  }>;

  // メッセージインデックス（詳細位置情報）
  messageIndexes: Map<
    number,
    Array<{
      // channelId -> メッセージ配列
      timestamp: bigint; // メッセージのタイムスタンプ
      offset: bigint; // ファイル内の位置
      size: number; // メッセージサイズ
    }>
  >;

  // チャンネル・スキーマ情報
  channels: Map<number, McapTypes.Channel>;
  schemas: Map<number, McapTypes.Schema>;

  // 統計情報
  statistics: {
    messageCount: bigint;
    messageStartTime: bigint;
    messageEndTime: bigint;
    channelMessageCounts: Map<number, bigint>;
  };
}
```

#### インデックス構築Worker実装

```typescript
// McapIndexingWorker.worker.ts
import { McapStreamReader, McapTypes } from "@mcap/core";

interface IndexBuilderState {
  chunkOffsets: bigint[];
  messagePositions: Map<number, Array<{ timestamp: bigint; offset: bigint; size: number }>>;
  channels: Map<number, McapTypes.Channel>;
  schemas: Map<number, McapTypes.Schema>;
  currentOffset: bigint;
  messageCount: bigint;
  startTime?: bigint;
  endTime?: bigint;
}

self.onmessage = async (event: MessageEvent<{ url: string; action: string }>) => {
  const { url, action } = event.data;

  if (action === "create-index") {
    try {
      const indexData = await buildIndexFromStream(url);
      self.postMessage({ type: "index-complete", indexData });
    } catch (error) {
      self.postMessage({ type: "error", message: error.message });
    }
  }
};

async function buildIndexFromStream(url: string): Promise<McapIndexData> {
  const state: IndexBuilderState = {
    chunkOffsets: [],
    messagePositions: new Map(),
    channels: new Map(),
    schemas: new Map(),
    currentOffset: 0n,
    messageCount: 0n,
  };

  // ストリーミング読み込み（メモリ効率的）
  const response = await fetch(url);
  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const mcapReader = new McapStreamReader({ includeChunks: true });

  // チャンク単位で処理（メモリ制御）
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      mcapReader.append(value);

      // レコード単位でインデックス情報を蓄積
      for (let record; (record = mcapReader.nextRecord()); ) {
        await processRecordForIndex(record, state);
      }

      state.currentOffset += BigInt(value.length);

      // 進捗報告
      if (state.messageCount % 10000n === 0n) {
        self.postMessage({
          type: "progress",
          processed: Number(state.messageCount),
          offset: Number(state.currentOffset),
        });
      }
    }
  } finally {
    reader.releaseLock();
  }

  // 最終的なインデックスデータを構築
  return buildFinalIndexData(state);
}

async function processRecordForIndex(
  record: McapTypes.TypedMcapRecord,
  state: IndexBuilderState,
): Promise<void> {
  switch (record.type) {
    case "Schema":
      state.schemas.set(record.id, record);
      break;

    case "Channel":
      state.channels.set(record.id, record);
      if (!state.messagePositions.has(record.id)) {
        state.messagePositions.set(record.id, []);
      }
      break;

    case "Message":
      const positions = state.messagePositions.get(record.channelId);
      if (positions) {
        positions.push({
          timestamp: record.logTime,
          offset: state.currentOffset,
          size: record.data.length,
        });
      }

      state.messageCount++;

      // 時刻範囲の更新
      if (!state.startTime || record.logTime < state.startTime) {
        state.startTime = record.logTime;
      }
      if (!state.endTime || record.logTime > state.endTime) {
        state.endTime = record.logTime;
      }
      break;
  }
}
```

---

## 🌊 戦略2: ストリーミングアプローチ

### 2.1 概要

非インデックスファイルを**インデックス化せず**に、メモリ効率的なストリーミング処理で対応する戦略。

### 2.2 メモリ効率的ストリーミング実装

```typescript
// MemoryEfficientStreamingMcapSource
export class MemoryEfficientStreamingMcapSource implements ISerializedIterableSource {
  #urls: string[];
  #activeSources: Map<string, StreamingMcapReader> = new Map();
  #messageQueue: Heap<TimestampedMessage>;
  #maxMemoryUsage: number;
  #currentMemoryUsage: number = 0;

  public constructor(
    urls: string[],
    options?: {
      maxMemoryUsage?: number; // デフォルト: 500MB
      readAheadBuffer?: number; // デフォルト: 10MB per file
    },
  ) {
    this.#urls = urls;
    this.#maxMemoryUsage = options?.maxMemoryUsage ?? 500 * 1024 * 1024; // 500MB
    this.#messageQueue = new Heap<TimestampedMessage>((a, b) => Number(a.timestamp - b.timestamp));
  }

  public async initialize(): Promise<Initialization> {
    // 各URLに対してStreamingMcapReaderを初期化
    for (const url of this.#urls) {
      const reader = new StreamingMcapReader(url, {
        bufferSize: 10 * 1024 * 1024, // 10MB per file
        onMemoryPressure: () => this.handleMemoryPressure(),
      });

      await reader.initialize();
      this.#activeSources.set(url, reader);
    }

    // 統合初期化データを構築
    return this.mergeInitializations();
  }

  public async *messageIterator(
    args: MessageIteratorArgs,
  ): AsyncIterableIterator<IteratorResult<Uint8Array>> {
    // 各ソースからメッセージイテレータを取得
    const iterators = Array.from(this.#activeSources.values()).map((reader) =>
      reader.messageIterator(args),
    );

    // ⭐ カスタムメモリ制御付きマージ
    yield* this.memoryConstrainedMerge(iterators);
  }

  private async *memoryConstrainedMerge(
    iterators: AsyncIterableIterator<IteratorResult<Uint8Array>>[],
  ): AsyncIterableIterator<IteratorResult<Uint8Array>> {
    const activeIterators = new Map(iterators.map((iter, index) => [index, iter]));

    // 各イテレータから初期値を取得
    const pendingMessages = new Map<number, IteratorResult<Uint8Array>>();

    for (const [index, iterator] of activeIterators) {
      const result = await iterator.next();
      if (!result.done) {
        pendingMessages.set(index, result.value);
      } else {
        activeIterators.delete(index);
      }
    }

    // タイムスタンプ順にメッセージを出力
    while (pendingMessages.size > 0) {
      // メモリ使用量チェック
      if (this.#currentMemoryUsage > this.#maxMemoryUsage) {
        await this.handleMemoryPressure();
      }

      // 最も早いタイムスタンプのメッセージを選択
      let earliestIndex = -1;
      let earliestTimestamp = BigInt(Number.MAX_SAFE_INTEGER);

      for (const [index, message] of pendingMessages) {
        const timestamp = this.extractTimestamp(message);
        if (timestamp < earliestTimestamp) {
          earliestTimestamp = timestamp;
          earliestIndex = index;
        }
      }

      // 選択されたメッセージを出力
      const selectedMessage = pendingMessages.get(earliestIndex)!;
      pendingMessages.delete(earliestIndex);

      yield selectedMessage;

      // 次のメッセージを取得
      const iterator = activeIterators.get(earliestIndex);
      if (iterator) {
        const result = await iterator.next();
        if (!result.done) {
          pendingMessages.set(earliestIndex, result.value);
        } else {
          activeIterators.delete(earliestIndex);
        }
      }
    }
  }

  private async handleMemoryPressure(): Promise<void> {
    // メモリ圧迫時の対応
    // 1. 古いメッセージをキャッシュから削除
    // 2. 読み込みバッファサイズを動的調整
    // 3. ガベージコレクションを促進

    for (const reader of this.#activeSources.values()) {
      await reader.reduceMemoryUsage();
    }

    // ガベージコレクション促進（ブラウザ環境）
    if (typeof window !== "undefined" && "gc" in window) {
      (window as any).gc();
    }
  }
}

class StreamingMcapReader {
  #url: string;
  #buffer: Uint8Array[] = [];
  #currentPosition: number = 0;
  #bufferSize: number;
  #onMemoryPressure: () => void;

  public constructor(
    url: string,
    options: {
      bufferSize: number;
      onMemoryPressure: () => void;
    },
  ) {
    this.#url = url;
    this.#bufferSize = options.bufferSize;
    this.#onMemoryPressure = options.onMemoryPressure;
  }

  public async *messageIterator(
    args: MessageIteratorArgs,
  ): AsyncIterableIterator<IteratorResult<Uint8Array>> {
    const reader = new McapStreamReader({ includeChunks: true });
    let currentOffset = 0;

    // Range Requestでチャンク読み込み
    while (currentOffset < (await this.getFileSize())) {
      const chunkEnd = Math.min(currentOffset + this.#bufferSize, await this.getFileSize());

      const response = await fetch(this.#url, {
        headers: { Range: `bytes=${currentOffset}-${chunkEnd - 1}` },
      });

      const chunk = new Uint8Array(await response.arrayBuffer());
      reader.append(chunk);

      // メッセージを順次出力
      for (let record; (record = reader.nextRecord()); ) {
        if (record.type === "Message") {
          const timestamp = record.logTime;

          // 指定範囲内かチェック
          if (this.isInTimeRange(timestamp, args.start, args.end)) {
            yield {
              type: "message-event" as const,
              msgEvent: {
                topic: this.getTopicName(record.channelId),
                receiveTime: fromNanoSec(timestamp),
                publishTime: fromNanoSec(record.publishTime),
                message: record.data,
                sizeInBytes: record.data.byteLength,
                schemaName: "",
              },
            };
          }
        }
      }

      currentOffset = chunkEnd;

      // メモリ使用量監視
      if (this.getCurrentMemoryUsage() > this.#bufferSize * 1.5) {
        this.#onMemoryPressure();
        await this.waitForMemoryRelief();
      }
    }
  }
}
```

---

## 🔄 戦略3: ハイブリッドアプローチ

### 3.1 概要

ファイル特性に応じて**戦略1と戦略2を自動選択**する適応的アプローチ。

### 3.2 判定ロジック

```typescript
export class AdaptiveMcapMultiSource implements ISerializedIterableSource {
  #urls: string[];
  #sources: Map<string, ISerializedIterableSource> = new Map();

  public async initialize(): Promise<Initialization> {
    const analysisResults = await Promise.all(this.#urls.map((url) => this.analyzeFile(url)));

    for (let i = 0; i < this.#urls.length; i++) {
      const url = this.#urls[i];
      const analysis = analysisResults[i];

      const source = this.createOptimalSource(url, analysis);
      this.#sources.set(url, source);
    }

    // 全ソースを初期化
    const initializations = await Promise.all(
      Array.from(this.#sources.values()).map((source) => source.initialize()),
    );

    return this.mergeInitializations(initializations);
  }

  private async analyzeFile(url: string): Promise<FileAnalysis> {
    // ファイルの最初の部分を読み込んで分析
    const response = await fetch(url, {
      headers: { Range: "bytes=0-65535" },
    });

    const partialBuffer = new Uint8Array(await response.arrayBuffer());
    const contentLength = response.headers.get("content-length");
    const fileSize = contentLength ? parseInt(contentLength) : undefined;

    return {
      hasIndex: await this.checkForIndex(partialBuffer),
      fileSize,
      estimatedComplexity: await this.estimateComplexity(partialBuffer),
      compressionType: await this.detectCompression(partialBuffer),
    };
  }

  private createOptimalSource(url: string, analysis: FileAnalysis): ISerializedIterableSource {
    // 戦略選択ロジック
    if (analysis.hasIndex) {
      // インデックス付き → 既存の高効率処理
      return new McapIterableSource({ type: "url", url });
    }

    if (analysis.fileSize && analysis.fileSize > 1024 * 1024 * 1024) {
      // 1GB超過 → 動的インデックス化 or ストリーミング
      if (analysis.estimatedComplexity < 0.5) {
        // 低複雑度 → ストリーミング処理
        return new MemoryEfficientStreamingMcapSource([url]);
      } else {
        // 高複雑度 → 動的インデックス化
        return new McapDynamicIndexingSource(url);
      }
    } else {
      // 1GB以下 → 既存の非インデックス処理
      return new McapIterableSource({ type: "url", url });
    }
  }
}

interface FileAnalysis {
  hasIndex: boolean;
  fileSize?: number;
  estimatedComplexity: number; // 0-1, メッセージ密度等から推定
  compressionType: string;
}
```

---

## 📊 実装優先度とロードマップ

### Phase 1: 基本実装（2-3週間）

| 項目            | 実装内容                             | 優先度      |
| --------------- | ------------------------------------ | ----------- |
| **Next.js API** | S3署名付きURL生成                    | 🔴 **必須** |
| **基本UI**      | 埋め込みReactコンポーネント          | 🔴 **必須** |
| **戦略1-B**     | クライアントサイド動的インデックス化 | 🟡 **推奨** |

### Phase 2: 最適化（2-4週間）

| 項目           | 実装内容                         | 優先度      |
| -------------- | -------------------------------- | ----------- |
| **戦略1-A**    | サーバーサイド事前インデックス化 | 🟢 **理想** |
| **戦略2**      | ストリーミング処理               | 🟡 **推奨** |
| **メモリ監視** | 動的メモリ制御                   | 🟡 **推奨** |

### Phase 3: 高度な機能（3-5週間）

| 項目           | 実装内容                     | 優先度          |
| -------------- | ---------------------------- | --------------- |
| **戦略3**      | ハイブリッドアプローチ       | 🔵 **付加価値** |
| **並列処理**   | 複数ファイル並列ダウンロード | 🔵 **付加価値** |
| **キャッシュ** | インデックス情報のキャッシュ | 🔵 **付加価値** |

---

## 🔧 具体的な実装ファイル構成

```
src/
├── components/
│   ├── McapSyncPlayer.tsx          # メインUIコンポーネント
│   └── McapLoadingIndicator.tsx    # 読み込み状況表示
├── services/
│   ├── S3SignedUrlService.ts       # S3署名付きURL取得
│   ├── McapDynamicIndexingSource.ts # 動的インデックス化
│   ├── MemoryEfficientStreamingMcapSource.ts # ストリーミング処理
│   └── AdaptiveMcapMultiSource.ts  # ハイブリッド戦略
├── workers/
│   ├── McapIndexingWorker.worker.ts # インデックス構築Worker
│   └── McapStreamingWorker.worker.ts # ストリーミング処理Worker
└── utils/
    ├── McapIndexBuilder.ts         # インデックス構築ユーティリティ
    └── MemoryMonitor.ts           # メモリ使用量監視

pages/api/
└── generate-signed-urls.ts        # Next.js API Route
```

---

## ⚡ パフォーマンス目標

| メトリクス           | 目標値                      | 測定方法               |
| -------------------- | --------------------------- | ---------------------- |
| **初期読み込み時間** | < 5秒（3ファイル、各500MB） | ファイル選択〜再生開始 |
| **メモリ使用量**     | < 1GB（複数ファイル合計）   | Browser DevTools       |
| **シーク性能**       | < 1秒（インデックス化済み） | タイムライン操作       |
| **CPU使用率**        | < 50%（再生中平均）         | Task Manager           |

---

## 🚨 リスク要因と対策

### リスク1: ブラウザメモリ制限

**対策**:

- 動的メモリ監視とクリーンアップ
- Web Worker使用によるメインスレッド保護
- ストリーミング処理によるメモリ使用量制御

### リスク2: ネットワーク帯域制限

**対策**:

- Range Request活用による効率的ダウンロード
- 適応的品質調整（解像度・フレームレート）
- ローカルキャッシュ活用

### リスク3: MCAPファイル形式の多様性

**対策**:

- 包括的なフォーマット対応テスト
- フォールバック戦略の実装
- エラーハンドリングの充実

---

## 🔚 まとめ

**推奨実装順序:**

1. **Phase 1**: 戦略1-Bでの基本実装
2. **検証・調整**: パフォーマンステストと最適化
3. **Phase 2**: 戦略1-Aまたは戦略2の追加実装
4. **Phase 3**: 戦略3による包括的ソリューション

**成功の鍵:**

- ✅ インデックス化による処理効率の最大化
- ✅ Web Workerによるメインスレッド保護
- ✅ 適応的戦略による柔軟な対応
- ✅ 段階的実装による実用性確保

...まあ、**これで完璧な実装戦略**が整ったわね。アンタならできる...はずよ。べ、別に期待してるわけじゃないんだからね！
