# UnifiedStreamingSource 実装ガイド

## 低スペックPC対応・インフラコストゼロのストリーミング再生実装

**対象読者**: 開発者
**実装期間**: 1-2週間
**難易度**: 中級

---

## 🎯 実装の全体像

```
Week 1: 基礎実装
├─ Day 1-2: コア機能実装
│   ├─ MinHeap実装
│   ├─ UnifiedStreamingSource骨格
│   └─ 基本的なチャンク読み込み
├─ Day 3-4: MCAPパース統合
│   ├─ @mcap/core統合
│   ├─ メッセージ抽出
│   └─ スキーマ情報処理
└─ Day 5-7: 統合・テスト
    ├─ RemoteDataSourceFactory改修
    ├─ 単体テスト
    └─ 統合テスト

Week 2: 最適化・本番投入
├─ Day 8-10: パフォーマンス最適化
├─ Day 11-12: エラーハンドリング強化
└─ Day 13-14: 本番環境テスト
```

---

## 📅 Day 1-2: コア機能実装

### ステップ1: ファイル作成

```bash
# プロジェクトルートで実行
cd packages/suite-base/src/players/IterablePlayer

# 新しいファイルを作成
touch UnifiedStreamingSource.ts
touch UnifiedStreamingSource.test.ts
```

### ステップ2: MinHeap実装

**ファイル**: `packages/suite-base/src/util/MinHeap.ts`

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * 最小ヒープ実装
 * タイムスタンプ順でメッセージをソートするために使用
 *
 * 計算量:
 * - push(): O(log n)
 * - pop(): O(log n)
 * - peek(): O(1)
 */
export class MinHeap<T> {
  #items: T[] = [];
  #comparator: (a: T, b: T) => number;

  /**
   * @param comparator 比較関数。a < b なら負の数を返す
   */
  constructor(comparator: (a: T, b: T) => number) {
    this.#comparator = comparator;
  }

  /**
   * 要素を追加
   */
  public push(item: T): void {
    this.#items.push(item);
    this.#bubbleUp(this.#items.length - 1);
  }

  /**
   * 最小要素を取り出して削除
   */
  public pop(): T | undefined {
    if (this.#items.length === 0) {
      return undefined;
    }

    if (this.#items.length === 1) {
      return this.#items.pop();
    }

    const top = this.#items[0];
    this.#items[0] = this.#items.pop()!;
    this.#bubbleDown(0);
    return top;
  }

  /**
   * 最小要素を取得（削除しない）
   */
  public peek(): T | undefined {
    return this.#items[0];
  }

  /**
   * ヒープのサイズ
   */
  public size(): number {
    return this.#items.length;
  }

  /**
   * ヒープが空か判定
   */
  public isEmpty(): boolean {
    return this.#items.length === 0;
  }

  /**
   * 要素を上方向に移動（挿入時）
   */
  #bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);

      if (this.#comparator(this.#items[index]!, this.#items[parentIndex]!) >= 0) {
        break;
      }

      // 親と交換
      [this.#items[index], this.#items[parentIndex]] = [
        this.#items[parentIndex]!,
        this.#items[index]!,
      ];

      index = parentIndex;
    }
  }

  /**
   * 要素を下方向に移動（削除時）
   */
  #bubbleDown(index: number): void {
    const length = this.#items.length;

    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      // 左の子と比較
      if (
        leftChild < length &&
        this.#comparator(this.#items[leftChild]!, this.#items[smallest]!) < 0
      ) {
        smallest = leftChild;
      }

      // 右の子と比較
      if (
        rightChild < length &&
        this.#comparator(this.#items[rightChild]!, this.#items[smallest]!) < 0
      ) {
        smallest = rightChild;
      }

      // 移動不要なら終了
      if (smallest === index) {
        break;
      }

      // 子と交換
      [this.#items[index], this.#items[smallest]] = [this.#items[smallest]!, this.#items[index]!];

      index = smallest;
    }
  }
}
```

**テスト**: `packages/suite-base/src/util/MinHeap.test.ts`

```typescript
import { MinHeap } from "./MinHeap";

describe("MinHeap", () => {
  it("should maintain min-heap property", () => {
    const heap = new MinHeap<number>((a, b) => a - b);

    heap.push(5);
    heap.push(3);
    heap.push(7);
    heap.push(1);
    heap.push(9);

    expect(heap.pop()).toBe(1);
    expect(heap.pop()).toBe(3);
    expect(heap.pop()).toBe(5);
    expect(heap.pop()).toBe(7);
    expect(heap.pop()).toBe(9);
  });

  it("should handle duplicate values", () => {
    const heap = new MinHeap<number>((a, b) => a - b);

    heap.push(5);
    heap.push(5);
    heap.push(3);
    heap.push(3);

    expect(heap.pop()).toBe(3);
    expect(heap.pop()).toBe(3);
    expect(heap.pop()).toBe(5);
    expect(heap.pop()).toBe(5);
  });

  it("should work with custom comparator", () => {
    interface Item {
      priority: number;
      value: string;
    }

    const heap = new MinHeap<Item>((a, b) => a.priority - b.priority);

    heap.push({ priority: 5, value: "five" });
    heap.push({ priority: 3, value: "three" });
    heap.push({ priority: 7, value: "seven" });

    expect(heap.pop()?.value).toBe("three");
    expect(heap.pop()?.value).toBe("five");
    expect(heap.pop()?.value).toBe("seven");
  });

  it("should return undefined when popping from empty heap", () => {
    const heap = new MinHeap<number>((a, b) => a - b);
    expect(heap.pop()).toBeUndefined();
  });
});
```

**実行**:

```bash
yarn test MinHeap.test.ts
```

### ステップ3: UnifiedStreamingSource骨格実装

**ファイル**: `packages/suite-base/src/players/IterablePlayer/UnifiedStreamingSource.ts`

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Immutable, Time, MessageEvent } from "@umi/suite";
import { compare } from "@umi/rostime";
import BrowserHttpReader from "@umi/suite-base/util/BrowserHttpReader";
import { MinHeap } from "@umi/suite-base/util/MinHeap";

import {
  ISerializedIterableSource,
  Initialization,
  MessageIteratorArgs,
  IteratorResult,
  GetBackfillMessagesArgs,
} from "./IIterableSource";

/**
 * タイムスタンプ付きメッセージ
 */
interface TimestampedMessage {
  url: string;
  topic: string;
  timestamp: Time;
  data: Uint8Array;
  schemaName: string;
}

/**
 * URL情報
 */
interface UrlInfo {
  url: string;
  reader: BrowserHttpReader;
  currentOffset: number;
  fileSize: number;
  isComplete: boolean;
}

/**
 * UnifiedStreamingSource - 複数URLを統合ストリーミング再生
 */
export class UnifiedStreamingSource implements ISerializedIterableSource {
  readonly sourceType = "serialized";

  #urls: string[];
  #urlInfos: Map<string, UrlInfo> = new Map();
  #chunkSize: number;
  #maxMemory: number;
  #currentMemory: number = 0;

  // メッセージキュー（タイムスタンプ順）
  #messageQueue: MinHeap<TimestampedMessage>;

  public constructor(args: { urls: string[]; chunkSize?: number; maxMemory?: number }) {
    this.#urls = args.urls;
    this.#chunkSize = args.chunkSize ?? 1024 * 1024; // デフォルト: 1MB
    this.#maxMemory = args.maxMemory ?? 100 * 1024 * 1024; // デフォルト: 100MB

    // ヒープの初期化（タイムスタンプで比較）
    this.#messageQueue = new MinHeap<TimestampedMessage>((a, b) =>
      compare(a.timestamp, b.timestamp),
    );

    console.log(`UnifiedStreamingSource initialized:`, {
      urlCount: this.#urls.length,
      chunkSize: this.#chunkSize,
      maxMemory: this.#maxMemory,
    });
  }

  public async initialize(): Promise<Initialization> {
    console.log("Initializing UnifiedStreamingSource...");

    // 各URLのReaderを作成し、ファイルサイズを取得
    const initPromises = this.#urls.map(async (url) => {
      const reader = new BrowserHttpReader(url);
      const info = await reader.open();

      this.#urlInfos.set(url, {
        url,
        reader,
        currentOffset: 0,
        fileSize: info.size,
        isComplete: false,
      });

      console.log(`URL initialized: ${url} (${info.size} bytes)`);
    });

    await Promise.all(initPromises);

    // TODO: 最初のファイルからスキーマ情報を読み取る
    // 現時点ではプレースホルダー
    return {
      start: { sec: 0, nsec: 0 },
      end: { sec: 0, nsec: 0 },
      topics: [],
      topicStats: new Map(),
      problems: [],
      publishersByTopic: new Map(),
      profile: undefined,
      datatypes: new Map(),
    };
  }

  public async *messageIterator(
    args: MessageIteratorArgs,
  ): AsyncIterableIterator<Readonly<IteratorResult<Uint8Array>>> {
    console.log("Starting message iteration...");

    // 初期チャンクをプリフェッチ
    await this.#prefetchInitialChunks();

    let messageCount = 0;

    while (this.#hasMessages() || this.#hasMoreData()) {
      // メモリ圧迫チェック
      if (this.#currentMemory > this.#maxMemory) {
        console.warn(`Memory pressure detected: ${this.#currentMemory} / ${this.#maxMemory}`);
        await this.#evictOldestMessages();
      }

      // 次のメッセージを取得
      const message = this.#messageQueue.pop();

      if (!message) {
        // キューが空 → 追加データを読み込み
        const fetched = await this.#fetchNextChunks();
        if (!fetched) {
          // これ以上データがない
          break;
        }
        continue;
      }

      // トピックフィルタリング
      if (args.topics.size > 0 && !args.topics.has(message.topic)) {
        continue;
      }

      messageCount++;

      // メッセージを出力
      yield {
        type: "message-event",
        msgEvent: {
          topic: message.topic,
          receiveTime: message.timestamp,
          message: message.data,
          sizeInBytes: message.data.byteLength,
          schemaName: message.schemaName,
        },
      };

      // メモリ使用量を更新
      this.#currentMemory -= message.data.byteLength;
    }

    console.log(`Message iteration completed. Total messages: ${messageCount}`);
  }

  /**
   * 初期チャンクのプリフェッチ
   */
  async #prefetchInitialChunks(): Promise<void> {
    console.log("Prefetching initial chunks...");

    const promises = this.#urls.map((url) => this.#fetchChunkFromUrl(url));
    await Promise.all(promises);

    console.log(`Initial chunks loaded. Queue size: ${this.#messageQueue.size()}`);
  }

  /**
   * 特定URLから次のチャンクを読み込み
   */
  async #fetchChunkFromUrl(url: string): Promise<boolean> {
    const urlInfo = this.#urlInfos.get(url);
    if (!urlInfo || urlInfo.isComplete) {
      return false;
    }

    try {
      // Range Requestで次のチャンクを読み込み
      const endOffset = Math.min(urlInfo.currentOffset + this.#chunkSize, urlInfo.fileSize);

      console.log(`Fetching chunk from ${url}: bytes ${urlInfo.currentOffset}-${endOffset}`);

      // TODO: 実際のHTTPリクエスト実装
      // const data = await urlInfo.reader.fetch(urlInfo.currentOffset, this.#chunkSize);

      // TODO: チャンクをパースしてメッセージに変換
      // const messages = await this.#parseChunk(url, data);

      // 現時点では仮実装
      const messages: TimestampedMessage[] = [];

      // メッセージをキューに追加
      for (const message of messages) {
        this.#messageQueue.push(message);
        this.#currentMemory += message.data.byteLength;
      }

      // オフセットを更新
      urlInfo.currentOffset = endOffset;

      // ファイルの最後に到達したか確認
      if (urlInfo.currentOffset >= urlInfo.fileSize) {
        urlInfo.isComplete = true;
        console.log(`Completed reading: ${url}`);
      }

      return true;
    } catch (error) {
      console.error(`Failed to fetch chunk from ${url}:`, error);
      return false;
    }
  }

  /**
   * 次のチャンクをフェッチ
   */
  async #fetchNextChunks(): Promise<boolean> {
    // 未完了のURLを取得
    const incompleteUrls = Array.from(this.#urlInfos.values()).filter((info) => !info.isComplete);

    if (incompleteUrls.length === 0) {
      return false;
    }

    // 最大3つのURLから並列フェッチ
    const urlsToFetch = incompleteUrls.slice(0, 3);
    const promises = urlsToFetch.map((info) => this.#fetchChunkFromUrl(info.url));
    const results = await Promise.all(promises);

    return results.some((result) => result);
  }

  /**
   * 古いメッセージを削除してメモリを解放
   */
  async #evictOldestMessages(): Promise<void> {
    const targetMemory = this.#maxMemory * 0.8; // 80%まで削減
    let evictedCount = 0;

    while (this.#currentMemory > targetMemory && !this.#messageQueue.isEmpty()) {
      const message = this.#messageQueue.pop();
      if (message) {
        this.#currentMemory -= message.data.byteLength;
        evictedCount++;
      }
    }

    console.log(`Evicted ${evictedCount} messages. Current memory: ${this.#currentMemory}`);
  }

  /**
   * キューにメッセージがあるか確認
   */
  #hasMessages(): boolean {
    return !this.#messageQueue.isEmpty();
  }

  /**
   * まだ読み込むデータがあるか確認
   */
  #hasMoreData(): boolean {
    return Array.from(this.#urlInfos.values()).some((info) => !info.isComplete);
  }

  public async getBackfillMessages(
    args: GetBackfillMessagesArgs,
  ): Promise<MessageEvent<Uint8Array>[]> {
    // TODO: バックフィル実装
    console.warn("getBackfillMessages not yet implemented");
    return [];
  }
}
```

**テスト**: 基本的な動作確認

```typescript
// UnifiedStreamingSource.test.ts
import { UnifiedStreamingSource } from "./UnifiedStreamingSource";

describe("UnifiedStreamingSource", () => {
  it("should initialize with multiple URLs", async () => {
    const source = new UnifiedStreamingSource({
      urls: ["https://example.com/file1.mcap", "https://example.com/file2.mcap"],
      chunkSize: 1024 * 1024,
      maxMemory: 100 * 1024 * 1024,
    });

    // 初期化テスト（実際のHTTPリクエストはモック化）
    expect(source).toBeDefined();
  });

  // 追加のテストは実装が進むにつれて追加
});
```

---

## 📅 Day 3-4: MCAPパース統合

### ステップ4: @mcap/coreの統合

**依存関係の追加**:

```json
// packages/suite-base/package.json
{
  "dependencies": {
    "@mcap/core": "^1.0.0"
    // ... 既存の依存関係
  }
}
```

```bash
yarn install
```

### ステップ5: MCAPチャンクパース実装

**UnifiedStreamingSource.tsに追加**:

```typescript
import { McapStreamReader } from "@mcap/core";
import type { TypedMcapRecord } from "@mcap/core";

export class UnifiedStreamingSource implements ISerializedIterableSource {
  // ... 既存コード ...

  /**
   * MCAPチャンクをパースしてメッセージに変換
   */
  async #parseChunk(url: string, data: Uint8Array): Promise<TimestampedMessage[]> {
    const messages: TimestampedMessage[] = [];
    const reader = new McapStreamReader({ includeChunks: true });

    reader.append(data);

    for (let record; (record = reader.nextRecord()); ) {
      if (record.type === "Message") {
        messages.push({
          url,
          topic: record.channelId.toString(), // TODO: チャンネルIDからトピック名を取得
          timestamp: this.#nsToTime(record.logTime),
          data: record.data,
          schemaName: "", // TODO: スキーマ名を取得
        });
      }
    }

    return messages;
  }

  /**
   * ナノ秒をTimeに変換
   */
  #nsToTime(ns: bigint): Time {
    const sec = Number(ns / BigInt(1_000_000_000));
    const nsec = Number(ns % BigInt(1_000_000_000));
    return { sec, nsec };
  }
}
```

### ステップ6: スキーマ・チャンネル情報の管理

```typescript
export class UnifiedStreamingSource implements ISerializedIterableSource {
  // ... 既存コード ...

  // スキーマとチャンネルの情報を保持
  #schemas: Map<number, { id: number; name: string; encoding: string }> = new Map();
  #channels: Map<number, { id: number; topic: string; schemaId: number }> = new Map();

  /**
   * MCAPヘッダー情報の処理
   */
  async #processHeader(url: string, data: Uint8Array): Promise<void> {
    const reader = new McapStreamReader({ includeChunks: false });
    reader.append(data);

    for (let record; (record = reader.nextRecord()); ) {
      if (record.type === "Schema") {
        this.#schemas.set(record.id, {
          id: record.id,
          name: record.name,
          encoding: record.encoding,
        });
      } else if (record.type === "Channel") {
        this.#channels.set(record.id, {
          id: record.id,
          topic: record.topic,
          schemaId: record.schemaId,
        });
      }
    }
  }

  /**
   * チャンネルIDからトピック名を取得
   */
  #getTopicName(channelId: number): string {
    return this.#channels.get(channelId)?.topic ?? `unknown_${channelId}`;
  }

  /**
   * チャンネルIDからスキーマ名を取得
   */
  #getSchemaName(channelId: number): string {
    const channel = this.#channels.get(channelId);
    if (!channel) return "";

    const schema = this.#schemas.get(channel.schemaId);
    return schema?.name ?? "";
  }

  /**
   * 改良されたパース処理
   */
  async #parseChunk(url: string, data: Uint8Array): Promise<TimestampedMessage[]> {
    const messages: TimestampedMessage[] = [];
    const reader = new McapStreamReader({ includeChunks: true });

    reader.append(data);

    for (let record; (record = reader.nextRecord()); ) {
      // スキーマとチャンネル情報を更新
      if (record.type === "Schema") {
        this.#schemas.set(record.id, {
          id: record.id,
          name: record.name,
          encoding: record.encoding,
        });
        continue;
      }

      if (record.type === "Channel") {
        this.#channels.set(record.id, {
          id: record.id,
          topic: record.topic,
          schemaId: record.schemaId,
        });
        continue;
      }

      // メッセージを処理
      if (record.type === "Message") {
        messages.push({
          url,
          topic: this.#getTopicName(record.channelId),
          timestamp: this.#nsToTime(record.logTime),
          data: record.data,
          schemaName: this.#getSchemaName(record.channelId),
        });
      }
    }

    return messages;
  }
}
```

---

## 📅 Day 5-7: 統合・テスト

### ステップ7: RemoteDataSourceFactoryの改修

**ファイル**: `packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx`

```typescript
import { UnifiedStreamingSource } from "@umi/suite-base/players/IterablePlayer/UnifiedStreamingSource";

class RemoteDataSourceFactory implements IDataSourceFactory {
  // ... 既存コード ...

  public initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
    if (args.params?.url == undefined) {
      return;
    }
    const urls = args.params.url.split(",");

    // 拡張子チェック
    let extension = "";
    urls.forEach((url) => {
      extension = path.extname(new URL(url).pathname);
      checkExtensionMatch(extension);
    });

    // 複数URLの場合は統合ストリーミングソースを使用
    if (urls.length > 1) {
      console.log(
        `[RemoteDataSourceFactory] Using UnifiedStreamingSource for ${urls.length} files`,
      );

      const source = new UnifiedStreamingSource({
        urls,
        chunkSize: 1024 * 1024, // 1MB
        maxMemory: 100 * 1024 * 1024, // 100MB
      });

      return new IterablePlayer({
        source,
        name: `${urls.length} remote files`,
        metricsCollector: args.metricsCollector,
        urlParams: { urls },
        sourceId: this.id,
      });
    }

    // 単一URLの場合は既存の実装
    // ... 既存コード ...
  }
}
```

### ステップ8: 動作確認

**テスト用URL**:

```
http://localhost:8080/?ds=remote-file&ds.url=https://example.com/file1.mcap,https://example.com/file2.mcap
```

**確認項目**:

1. ✅ Lichtblickが起動する
2. ✅ コンソールに "Using UnifiedStreamingSource" が表示される
3. ✅ メモリ使用量が100MB以下に収まる
4. ✅ メッセージが正しく表示される

---

## 🐛 トラブルシューティング

### 問題1: "MinHeap is not a constructor"

**原因**: エクスポート設定が間違っている

**解決策**:

```typescript
// MinHeap.ts
export class MinHeap<T> {
  // ← 必ず export を付ける
  // ...
}
```

### 問題2: メモリ使用量が想定より多い

**原因**: メッセージがキューから削除されていない

**デバッグ**:

```typescript
// UnifiedStreamingSource.ts
console.log(`Queue size: ${this.#messageQueue.size()}, Memory: ${this.#currentMemory}`);
```

**解決策**: `#evictOldestMessages()` が正しく呼ばれているか確認

### 問題3: メッセージが表示されない

**原因**: チャンクのパースが失敗している

**デバッグ**:

```typescript
async #parseChunk(url: string, data: Uint8Array): Promise<TimestampedMessage[]> {
  console.log(`Parsing chunk from ${url}, size: ${data.byteLength}`);
  const messages: TimestampedMessage[] = [];

  try {
    // パース処理
  } catch (error) {
    console.error(`Parse error for ${url}:`, error);
  }

  console.log(`Parsed ${messages.length} messages`);
  return messages;
}
```

---

## ✅ チェックリスト

### Day 1-2完了時

- [ ] MinHeap実装完了
- [ ] MinHeapのテストが通る
- [ ] UnifiedStreamingSource骨格実装完了
- [ ] 基本的な初期化が動作する

### Day 3-4完了時

- [ ] @mcap/coreの統合完了
- [ ] チャンクパース処理が動作する
- [ ] スキーマ・チャンネル情報が取得できる

### Day 5-7完了時

- [ ] RemoteDataSourceFactory改修完了
- [ ] 2つのMCAPファイルで再生成功
- [ ] メモリ使用量が100MB以下
- [ ] コンソールにエラーが表示されない

---

## 📊 パフォーマンス計測

### メモリ使用量の計測

```typescript
// UnifiedStreamingSource.ts
public getMemoryUsage(): { current: number; max: number; percent: number } {
  return {
    current: this.#currentMemory,
    max: this.#maxMemory,
    percent: (this.#currentMemory / this.#maxMemory) * 100,
  };
}

// 定期的にログ出力
setInterval(() => {
  const usage = source.getMemoryUsage();
  console.log(`Memory: ${usage.current} / ${usage.max} (${usage.percent.toFixed(1)}%)`);
}, 5000); // 5秒ごと
```

### ネットワーク使用量の計測

```typescript
#fetchedBytes: number = 0;

async #fetchChunkFromUrl(url: string): Promise<boolean> {
  // ... 既存コード ...

  this.#fetchedBytes += data.byteLength;
  console.log(`Total fetched: ${(this.#fetchedBytes / 1024 / 1024).toFixed(2)} MB`);

  // ... 既存コード ...
}
```

---

## 🚀 次のステップ

実装が完了したら:

1. **パフォーマンステスト**

   - 10ファイル同時再生
   - メモリ使用量の監視
   - CPU使用率の確認

2. **エッジケーステスト**

   - 非常に大きなファイル（10GB+）
   - ネットワーク切断時の動作
   - メモリ不足時の動作

3. **本番環境デプロイ**
   - ステージング環境でテスト
   - ユーザーフィードバック収集
   - 段階的なロールアウト

---

## 📚 参考資料

- [MCAP仕様](https://mcap.dev/)
- [MinHeap実装の詳細](https://en.wikipedia.org/wiki/Binary_heap)
- [HTTP Range Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests)
- [既存のBufferedIterableSource実装](../BufferedIterableSource.ts)
