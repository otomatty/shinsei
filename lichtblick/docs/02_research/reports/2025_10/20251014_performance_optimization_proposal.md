# Lichtblick埋め込み再生 パフォーマンス最適化提案

**作成日**: 2025年10月14日
**対象**: 複数MCAPファイルのiframe埋め込み再生の高速化

---

## 📊 実装優先度マトリックス

| 施策                            | 実装コスト | 効果 | 優先度  | 実装期間 |
| ------------------------------- | ---------- | ---- | ------- | -------- |
| Phase 1a: readAheadDuration拡大 | 低         | 中   | 🔴 最高 | 5分      |
| Phase 1b: キャッシュサイズ拡大  | 低         | 中   | 🔴 最高 | 5分      |
| Phase 1c: プリフェッチ追加      | 低         | 中   | 🟡 高   | 1-2時間  |
| Phase 2: MCAPインデックス化     | 中         | 大   | 🟡 高   | 1-2週間  |
| Phase 3: パフォーマンス計測     | 低         | -    | 🟢 中   | 2-3日    |
| Phase 4: 専用プロキシサーバー   | 高         | 大   | ⚪ 低   | 1-3ヶ月  |

---

## 🚀 Phase 1a: readAheadDuration拡大（即時実装）

### 目的

- ネットワークリクエスト頻度を削減
- バッファ不足による再生停止を防止

### 実装内容

**ファイル**: `packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx`

**変更箇所**: 113行目

**変更前**:

```typescript
return new IterablePlayer({
  source,
  name: urls.join(),
  metricsCollector: args.metricsCollector,
  urlParams: { urls },
  sourceId: this.id,
  readAheadDuration: { sec: 10, nsec: 0 }, // ← 現在10秒
});
```

**変更後**:

```typescript
return new IterablePlayer({
  source,
  name: urls.join(),
  metricsCollector: args.metricsCollector,
  urlParams: { urls },
  sourceId: this.id,
  readAheadDuration: { sec: 30, nsec: 0 }, // ✅ 30秒に変更
});
```

### 期待される効果

- ネットワークリクエスト頻度: **30-40%削減**
- バッファ枯渇: **50%削減**
- CPU使用率: **5-10%削減**（リクエスト処理の削減）

### テスト方法

```typescript
// 開発者ツールのNetworkタブで確認
// Before: 10秒ごとにリクエスト
// After: 30秒ごとにリクエスト
```

---

## 🚀 Phase 1b: キャッシュサイズ拡大（即時実装）

### 目的

- メモリキャッシュのヒット率向上
- 既読データの再リクエスト削減

### 実装内容

**ファイル**: `packages/suite-base/src/players/IterablePlayer/Mcap/RemoteFileReadable.ts`

**変更箇所**: 15-18行目

**変更前**:

```typescript
public constructor(url: string) {
  const fileReader = new BrowserHttpReader(url);
  this.#remoteReader = new CachedFilelike({
    fileReader,
    cacheSizeInBytes: 1024 * 1024 * 500, // ← 現在500MiB
  });
}
```

**変更後**:

```typescript
public constructor(url: string) {
  const fileReader = new BrowserHttpReader(url);
  this.#remoteReader = new CachedFilelike({
    fileReader,
    cacheSizeInBytes: 1024 * 1024 * 1000, // ✅ 1GiBに変更
  });
}
```

### メモリ使用量の考慮

**現状**:

- 500MiB × 複数ファイル = 潜在的に大きなメモリ使用

**変更後**:

- 1GiB × 複数ファイル = さらに大きなメモリ使用

**推奨**: 環境変数で制御可能にする

```typescript
const DEFAULT_CACHE_SIZE = 1024 * 1024 * 1000; // 1GiB
const MAX_CACHE_SIZE = 1024 * 1024 * 2000; // 2GiB

public constructor(url: string) {
  const fileReader = new BrowserHttpReader(url);

  // 環境変数から設定を取得（フォールバック: デフォルト値）
  const cacheSize = parseInt(
    process.env.MCAP_CACHE_SIZE_MB ?? String(DEFAULT_CACHE_SIZE / 1024 / 1024)
  ) * 1024 * 1024;

  this.#remoteReader = new CachedFilelike({
    fileReader,
    cacheSizeInBytes: Math.min(cacheSize, MAX_CACHE_SIZE),
  });
}
```

### 期待される効果

- キャッシュヒット率: **20-30%向上**
- ネットワークリクエスト: **15-25%削減**
- 再生のスムーズさ: **大幅改善**

---

## 🚀 Phase 1c: 複数URLのプリフェッチ（1-2時間）

### 目的

- 複数ファイル再生開始時の遅延削減
- DNSルックアップとTCP接続の事前確立

### 実装内容

**ファイル**: `packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx`

**新規メソッド追加**:

```typescript
class RemoteDataSourceFactory implements IDataSourceFactory {
  // ... 既存コード ...

  /**
   * 複数URLのプリフェッチ
   * DNSルックアップとTCP接続を事前に確立
   */
  private async prefetchUrls(urls: string[]): Promise<void> {
    const prefetchPromises = urls.map(async (url) => {
      try {
        // HEADリクエストで接続確立のみ実行
        const response = await fetch(url, {
          method: "HEAD",
          cache: "no-store", // キャッシュを使用しない
        });

        if (!response.ok) {
          console.warn(`Prefetch failed for ${url}: ${response.status}`);
        }
      } catch (error) {
        console.warn(`Prefetch error for ${url}:`, error);
        // エラーは無視（フェイルセーフ）
      }
    });

    // 並列実行（最大同時接続数を考慮）
    const BATCH_SIZE = 6; // HTTP/1.1の推奨最大同時接続数
    for (let i = 0; i < prefetchPromises.length; i += BATCH_SIZE) {
      const batch = prefetchPromises.slice(i, i + BATCH_SIZE);
      await Promise.all(batch);
    }
  }

  public async initialize(args: DataSourceFactoryInitializeArgs): Promise<Player | undefined> {
    if (args.params?.url == undefined) {
      return;
    }
    const urls = args.params.url.split(",");

    // ✅ プリフェッチを実行
    await this.prefetchUrls(urls);

    let nextExtension: string | undefined = undefined;
    let extension = "";

    urls.forEach((url) => {
      extension = path.extname(new URL(url).pathname);
      nextExtension = checkExtensionMatch(extension, nextExtension);
    });

    const initWorker = initWorkers[extension]!;
    const source = new WorkerSerializedIterableSource({ initWorker, initArgs: { urls } });

    return new IterablePlayer({
      source,
      name: urls.join(),
      metricsCollector: args.metricsCollector,
      urlParams: { urls },
      sourceId: this.id,
      readAheadDuration: { sec: 30, nsec: 0 },
    });
  }
}
```

### 期待される効果

- 初回接続遅延: **50-70%削減**（DNSルックアップ + TCP handshake）
- 複数ファイル再生開始時間: **200-500ms短縮**

### テスト方法

```typescript
// 開発者ツールのNetworkタブで確認
// Before: 最初のRange Requestで接続確立（200-500ms）
// After: HEADリクエストで接続確立済み（10-50ms）
```

---

## 🏗️ Phase 2: MCAPインデックス化（1-2週間）

### アーキテクチャ概要

```
MCAPファイルアップロード
    ↓
S3 ObjectCreated イベント
    ↓
Lambda関数（MCAPインデックス生成）
    ↓ 解析
MCAPインデックス(.mcap.index.json)をS3に保存
    ↓
Lichtblick起動時
    ↓ インデックスファイルをチェック
インデックスが存在 → 効率的な読み込み
インデックスが存在しない → 通常の読み込み（フォールバック）
```

### 実装ステップ

#### Step 1: Lambda関数の作成

**ファイル**: `lambda/mcap-indexer/index.ts`

```typescript
import { S3Event, S3EventRecord } from "aws-lambda";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { McapIndexedReader } from "@mcap/core";
import { Readable } from "stream";

const s3Client = new S3Client({});

interface McapIndex {
  version: string;
  fileSize: number;
  messageCount: number;
  chunkCount: number;
  startTime: number;
  endTime: number;
  chunkIndexes: Array<{
    messageIndexOffset: number;
    messageIndexLength: number;
    messageStartTime: number;
    messageEndTime: number;
    chunkOffset: number;
    chunkLength: number;
    messageCount: number;
    compression: string;
  }>;
  schemas: Array<{
    id: number;
    name: string;
    encoding: string;
  }>;
  channels: Array<{
    id: number;
    topic: string;
    messageEncoding: string;
    schemaId: number;
  }>;
  statistics?: {
    messageCount: number;
    schemaCount: number;
    channelCount: number;
    attachmentCount: number;
    metadataCount: number;
    chunkCount: number;
  };
}

export const handler = async (event: S3Event): Promise<void> => {
  console.log("Received S3 event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    await processRecord(record);
  }
};

async function processRecord(record: S3EventRecord): Promise<void> {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

  // .mcapファイルのみ処理
  if (!key.endsWith(".mcap")) {
    console.log(`Skipping non-MCAP file: ${key}`);
    return;
  }

  // インデックスファイルが既に存在する場合はスキップ
  const indexKey = `${key}.index.json`;
  try {
    await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: indexKey }));
    console.log(`Index already exists for ${key}, skipping`);
    return;
  } catch (error) {
    // インデックスが存在しない場合は生成
  }

  console.log(`Processing MCAP file: ${key}`);

  try {
    // MCAPファイルをダウンロード
    const getObjectResponse = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );

    if (!getObjectResponse.Body) {
      throw new Error("Empty response body");
    }

    // NodeJS ReadableStreamをStreamに変換
    const stream = getObjectResponse.Body as Readable;

    // MCAPファイルを解析してインデックス生成
    const buffer = await streamToBuffer(stream);
    const reader = await McapIndexedReader.Initialize({
      readable: {
        size: async () => BigInt(buffer.length),
        read: async (offset: bigint, size: bigint) => {
          const start = Number(offset);
          const end = start + Number(size);
          return buffer.slice(start, end);
        },
      },
    });

    // インデックス情報を抽出
    const index: McapIndex = {
      version: "1.0",
      fileSize: Number(reader.size),
      messageCount: reader.statistics?.messageCount ?? 0,
      chunkCount: reader.statistics?.chunkCount ?? 0,
      startTime: Number(reader.statistics?.messageStartTime ?? 0),
      endTime: Number(reader.statistics?.messageEndTime ?? 0),
      chunkIndexes: Array.from(reader.chunkIndexes).map((chunk) => ({
        messageIndexOffset: Number(chunk.messageIndexOffset),
        messageIndexLength: Number(chunk.messageIndexLength),
        messageStartTime: Number(chunk.messageStartTime),
        messageEndTime: Number(chunk.messageEndTime),
        chunkOffset: Number(chunk.chunkOffset),
        chunkLength: Number(chunk.chunkLength),
        messageCount: Number(chunk.messageIndexRecords.length),
        compression: chunk.compression,
      })),
      schemas: Array.from(reader.schemas.values()).map((schema) => ({
        id: schema.id,
        name: schema.name,
        encoding: schema.encoding,
      })),
      channels: Array.from(reader.channels.values()).map((channel) => ({
        id: channel.id,
        topic: channel.topic,
        messageEncoding: channel.messageEncoding,
        schemaId: channel.schemaId,
      })),
      statistics: reader.statistics
        ? {
            messageCount: reader.statistics.messageCount,
            schemaCount: reader.statistics.schemaCount,
            channelCount: reader.statistics.channelCount,
            attachmentCount: reader.statistics.attachmentCount,
            metadataCount: reader.statistics.metadataCount,
            chunkCount: reader.statistics.chunkCount,
          }
        : undefined,
    };

    // インデックスをS3に保存
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: indexKey,
        Body: JSON.stringify(index, null, 2),
        ContentType: "application/json",
        Metadata: {
          "original-mcap-key": key,
          "generated-at": new Date().toISOString(),
        },
      }),
    );

    console.log(`Successfully created index: ${indexKey}`);
    console.log(`Index summary:`, {
      fileSize: index.fileSize,
      messageCount: index.messageCount,
      chunkCount: index.chunkCount,
      startTime: new Date(index.startTime / 1e6).toISOString(),
      endTime: new Date(index.endTime / 1e6).toISOString(),
    });
  } catch (error) {
    console.error(`Error processing ${key}:`, error);
    throw error; // Lambda関数をリトライさせる
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
```

**package.json**:

```json
{
  "name": "mcap-indexer",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@aws-sdk/client-s3": "^3.400.0",
    "@mcap/core": "^1.0.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.119",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

#### Step 2: Lambda関数のデプロイ

**Serverless Framework使用の場合**:

```yaml
# serverless.yml
service: mcap-indexer

provider:
  name: aws
  runtime: nodejs20.x
  region: ap-northeast-1
  memorySize: 2048
  timeout: 300
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:PutObject
          Resource:
            - arn:aws:s3:::your-mcap-bucket/*

functions:
  indexer:
    handler: index.handler
    events:
      - s3:
          bucket: your-mcap-bucket
          event: s3:ObjectCreated:*
          rules:
            - suffix: .mcap
          existing: true

package:
  exclude:
    - node_modules/**
    - .git/**
```

**デプロイコマンド**:

```bash
cd lambda/mcap-indexer
npm install
npx serverless deploy --stage production
```

#### Step 3: Lichtblick側の実装

**ファイル**: `packages/suite-base/src/players/IterablePlayer/Mcap/RemoteFileReadable.ts`

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import BrowserHttpReader from "@umi/suite-base/util/BrowserHttpReader";
import CachedFilelike from "@umi/suite-base/util/CachedFilelike";

interface McapIndex {
  version: string;
  fileSize: number;
  messageCount: number;
  chunkCount: number;
  startTime: number;
  endTime: number;
  chunkIndexes: Array<{
    messageIndexOffset: number;
    messageIndexLength: number;
    messageStartTime: number;
    messageEndTime: number;
    chunkOffset: number;
    chunkLength: number;
    messageCount: number;
    compression: string;
  }>;
  schemas: Array<{
    id: number;
    name: string;
    encoding: string;
  }>;
  channels: Array<{
    id: number;
    topic: string;
    messageEncoding: string;
    schemaId: number;
  }>;
  statistics?: {
    messageCount: number;
    schemaCount: number;
    channelCount: number;
    attachmentCount: number;
    metadataCount: number;
    chunkCount: number;
  };
}

export class RemoteFileReadable {
  #url: string;
  #remoteReader: CachedFilelike;
  #index?: McapIndex;

  public constructor(url: string) {
    this.#url = url;
    const fileReader = new BrowserHttpReader(url);

    const cacheSize = parseInt(process.env.MCAP_CACHE_SIZE_MB ?? "1000") * 1024 * 1024;

    this.#remoteReader = new CachedFilelike({
      fileReader,
      cacheSizeInBytes: cacheSize,
    });
  }

  public async open(): Promise<void> {
    // インデックスファイルの読み込みを試行
    const indexLoaded = await this.#tryLoadIndex();

    if (indexLoaded) {
      console.log(`Using index for ${this.#url}`, {
        fileSize: this.#index?.fileSize,
        messageCount: this.#index?.messageCount,
        chunkCount: this.#index?.chunkCount,
      });

      // インデックスを使用した最適化された読み込み
      await this.#openWithIndex();
    } else {
      console.log(`No index found for ${this.#url}, using normal mode`);
      // 通常の読み込み
      await this.#remoteReader.open();
    }
  }

  /**
   * インデックスファイルの読み込みを試行
   */
  async #tryLoadIndex(): Promise<boolean> {
    try {
      const indexUrl = `${this.#url}.index.json`;
      const response = await fetch(indexUrl, {
        method: "GET",
        cache: "force-cache", // インデックスはキャッシュ可能
      });

      if (!response.ok) {
        return false;
      }

      this.#index = await response.json();
      return true;
    } catch (error) {
      console.debug(`Failed to load index for ${this.#url}:`, error);
      return false;
    }
  }

  /**
   * インデックスを使用した最適化された読み込み
   */
  async #openWithIndex(): Promise<void> {
    if (!this.#index) {
      throw new Error("Index not available");
    }

    // 通常の open() を呼び出してファイルサイズ等を取得
    await this.#remoteReader.open();

    // 最初の数チャンクをプリフェッチ
    const PREFETCH_CHUNK_COUNT = 5;
    const chunksToFetch = this.#index.chunkIndexes.slice(0, PREFETCH_CHUNK_COUNT);

    console.log(`Prefetching ${chunksToFetch.length} chunks...`);

    // 並列プリフェッチ（最大3同時）
    const PARALLEL_FETCH = 3;
    for (let i = 0; i < chunksToFetch.length; i += PARALLEL_FETCH) {
      const batch = chunksToFetch.slice(i, i + PARALLEL_FETCH);
      await Promise.all(
        batch.map(async (chunk) => {
          try {
            await this.#remoteReader.read(chunk.chunkOffset, chunk.chunkLength);
          } catch (error) {
            console.warn(`Failed to prefetch chunk at offset ${chunk.chunkOffset}:`, error);
          }
        }),
      );
    }

    console.log("Prefetch completed");
  }

  public async size(): Promise<bigint> {
    // インデックスがある場合はそこからファイルサイズを取得
    if (this.#index) {
      return BigInt(this.#index.fileSize);
    }
    return BigInt(this.#remoteReader.size());
  }

  public async read(offset: bigint, size: bigint): Promise<Uint8Array> {
    if (offset + size > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Read too large: offset ${offset}, size ${size}`);
    }
    return await this.#remoteReader.read(Number(offset), Number(size));
  }

  /**
   * インデックス情報を取得（デバッグ用）
   */
  public getIndex(): McapIndex | undefined {
    return this.#index;
  }
}
```

### 期待される効果

- 初回読み込み速度: **3-5倍高速化**
- ランダムアクセス: **5-10倍高速化**
- ネットワーク帯域使用量: **40-60%削減**
- シーク操作: **ほぼ瞬時**

---

## 📊 Phase 3: パフォーマンス計測の実装（2-3日）

### 目的

- 各最適化の効果を定量的に測定
- ボトルネックの特定
- A/Bテストの基盤構築

### 実装内容

**ファイル**: `packages/suite-base/src/players/IterablePlayer/PerformanceMetrics.ts`

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

export interface PerformanceMetrics {
  // ネットワーク関連
  totalNetworkRequests: number;
  totalBytesDownloaded: number;
  averageRequestDuration: number;
  cacheHitRate: number;

  // Worker関連
  workerProcessingTime: number;
  messageParsingTime: number;

  // レンダリング関連
  averageFrameTime: number;
  droppedFrames: number;
}

export class PerformanceTracker {
  #startTime: number = Date.now();
  #metrics: Partial<PerformanceMetrics> = {};
  #networkRequests: Array<{ duration: number; bytes: number }> = [];

  public recordNetworkRequest(duration: number, bytes: number): void {
    this.#networkRequests.push({ duration, bytes });
  }

  public getMetrics(): PerformanceMetrics {
    const totalRequests = this.#networkRequests.length;
    const totalBytes = this.#networkRequests.reduce((sum, req) => sum + req.bytes, 0);
    const avgDuration =
      totalRequests > 0
        ? this.#networkRequests.reduce((sum, req) => sum + req.duration, 0) / totalRequests
        : 0;

    return {
      totalNetworkRequests: totalRequests,
      totalBytesDownloaded: totalBytes,
      averageRequestDuration: avgDuration,
      cacheHitRate: this.#metrics.cacheHitRate ?? 0,
      workerProcessingTime: this.#metrics.workerProcessingTime ?? 0,
      messageParsingTime: this.#metrics.messageParsingTime ?? 0,
      averageFrameTime: this.#metrics.averageFrameTime ?? 0,
      droppedFrames: this.#metrics.droppedFrames ?? 0,
    };
  }

  public logMetrics(): void {
    const metrics = this.getMetrics();
    const elapsed = (Date.now() - this.#startTime) / 1000;

    console.log("=== Performance Metrics ===");
    console.log(`Elapsed time: ${elapsed.toFixed(2)}s`);
    console.log(`Network requests: ${metrics.totalNetworkRequests}`);
    console.log(`Total downloaded: ${(metrics.totalBytesDownloaded / 1024 / 1024).toFixed(2)} MiB`);
    console.log(`Avg request duration: ${metrics.averageRequestDuration.toFixed(2)}ms`);
    console.log(`Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(
      `Download speed: ${(metrics.totalBytesDownloaded / 1024 / 1024 / elapsed).toFixed(2)} MiB/s`,
    );
  }
}
```

**CachedFilelike.tsへの統合**:

```typescript
import { PerformanceTracker } from "./PerformanceMetrics";

export default class CachedFilelike implements Filelike {
  #performanceTracker?: PerformanceTracker;

  public constructor(options: {
    fileReader: FileReader;
    cacheSizeInBytes?: number;
    log?: ILogger;
    keepReconnectingCallback?: (reconnecting: boolean) => void;
    performanceTracker?: PerformanceTracker; // ✅ 追加
  }) {
    this.#fileReader = options.fileReader;
    this.#cacheSizeInBytes = options.cacheSizeInBytes ?? Infinity;
    this.#log = options.log ?? { ...defaultLog };
    this.#keepReconnectingCallback = options.keepReconnectingCallback;
    this.#performanceTracker = options.performanceTracker; // ✅ 追加
    this.#virtualBuffer = new VirtualLRUBuffer(this.#cacheSizeInBytes, CACHE_BLOCK_SIZE);
  }

  #setConnection(range: Range): void {
    // ... 既存コード ...

    const startTime = Date.now();
    let bytesRead = 0;

    stream.on("data", (chunk: Uint8Array) => {
      // ... 既存コード ...

      bytesRead += chunk.byteLength;

      // ✅ パフォーマンス計測
      if (this.#performanceTracker) {
        const duration = Date.now() - startTime;
        this.#performanceTracker.recordNetworkRequest(duration, bytesRead);
      }
    });
  }
}
```

### 使用例

```typescript
// RemoteFileReadable.ts
const performanceTracker = new PerformanceTracker();

this.#remoteReader = new CachedFilelike({
  fileReader,
  cacheSizeInBytes: 1024 * 1024 * 1000,
  performanceTracker, // ✅ トラッカーを渡す
});

// 再生終了時またはデバッグ時
performanceTracker.logMetrics();
```

---

## 🎯 実装ロードマップ

### 週次計画

#### Week 1

- [ ] Day 1: Phase 1a & 1b実装 + テスト
- [ ] Day 2: Phase 1c実装 + テスト
- [ ] Day 3-5: Phase 2 Lambda関数開発

#### Week 2

- [ ] Day 1-2: Phase 2 Lambda関数デプロイ + テスト
- [ ] Day 3-4: Phase 2 Lichtblick側実装
- [ ] Day 5: 統合テスト

#### Week 3

- [ ] Day 1-2: Phase 3 パフォーマンス計測実装
- [ ] Day 3-5: 本番環境での検証とチューニング

---

## 📈 成功指標

### 定量的指標

| 指標                     | 現状               | 目標         | 測定方法           |
| ------------------------ | ------------------ | ------------ | ------------------ |
| 初回読み込み時間         | 5-10秒             | 1-2秒        | performance.now()  |
| 再生スムーズさ           | 頻繁にバッファ不足 | ほぼ停止なし | dropped frames     |
| ネットワークリクエスト数 | 100-200回/分       | 20-40回/分   | Network tab        |
| メモリ使用量             | 500-800MB          | 1-1.5GB      | performance.memory |

### 定性的指標

- [ ] ユーザーが「遅い」と感じない
- [ ] 複数ファイル切り替えがスムーズ
- [ ] シーク操作が即座に反応

---

## 🔧 トラブルシューティング

### Phase 1実装後も遅い場合

**チェックリスト**:

1. ネットワーク速度の確認（開発者ツール）
2. S3のCORS設定の確認
3. 署名付きURLの有効期限の確認
4. ブラウザのメモリ使用量の確認

### Lambda関数がタイムアウトする場合

**対処法**:

- タイムアウト時間を延長（300秒 → 900秒）
- メモリサイズを増加（2048MB → 3008MB）
- ファイルサイズに応じた分割処理

### インデックスファイルが生成されない場合

**デバッグ方法**:

```bash
# CloudWatch Logsで確認
aws logs tail /aws/lambda/mcap-indexer --follow

# 手動実行でテスト
aws lambda invoke \
  --function-name mcap-indexer \
  --payload file://test-event.json \
  output.json
```

---

## 📚 参考資料

- MCAP仕様: https://mcap.dev/specification/
- AWS Lambda Best Practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- HTTP/2 Performance: https://developers.google.com/web/fundamentals/performance/http2
