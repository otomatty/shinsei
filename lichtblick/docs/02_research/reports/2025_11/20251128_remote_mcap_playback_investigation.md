# S3リモートMCAPファイル複数再生の調査報告

**作成日**: 2025-11-28
**対象**: 開発者
**ステータス**: 調査完了

---

## 概要

S3上のMCAPファイルを複数同時に再生しようとすると、処理が非常に重くなり再生できない問題について調査を実施した。インデックス付きファイルでも同様の問題が発生することが確認された。

---

## 目次

1. [現在の処理アーキテクチャ](#1-現在の処理アーキテクチャ)
2. [問題の根本原因](#2-問題の根本原因)
3. [S3対応の現状](#3-s3対応の現状)
4. [解決策の選択肢](#4-解決策の選択肢)
5. [推奨アプローチ](#5-推奨アプローチ)
6. [関連ドキュメント](#6-関連ドキュメント)
7. [関連ソースコード](#7-関連ソースコード)

---

## 1. 現在の処理アーキテクチャ

### 1.1 全体フロー

```
[User URL入力]
       ↓
[RemoteDataSourceFactory]
       ↓ urls.split(",") で URL 配列に分割
       ↓ 拡張子(.mcap/.bag)に基づきWorker選択
       ↓
[WorkerSerializedIterableSource]
       ↓ Comlink経由でWorkerを初期化
       ↓
[McapIterableSourceWorker.worker.ts] (Web Worker内)
       ↓ urls配列の場合 → MultiIterableSource使用
       ↓ 単一urlの場合 → McapIterableSource使用
       ↓
[MultiIterableSource]
       ↓ 各URLにMcapIterableSourceを生成
       ↓ Promise.all()で全ファイルを並列初期化
       ↓ mergeAsyncIterators()で時系列マージ
       ↓
[McapIterableSource]
       ↓ type="url"の場合 → RemoteFileReadable使用
       ↓
[RemoteFileReadable]
       ↓ BrowserHttpReader + CachedFilelike
       ↓ HTTP Range Requestで部分取得
       ↓
[McapIndexedIterableSource] / [McapUnindexedIterableSource]
       ↓ MCAPインデックスの有無で分岐
       ↓
[IterablePlayer]
       ↓ BufferedIterableSource → CachingIterableSource
       ↓ メッセージイテレーション、再生制御
```

### 1.2 主要コンポーネント

| コンポーネント                 | 役割                                      | ファイル                                                   |
| ------------------------------ | ----------------------------------------- | ---------------------------------------------------------- |
| RemoteDataSourceFactory        | URLパラメータ検証、Worker選択、Player生成 | `dataSources/RemoteDataSourceFactory.tsx`                  |
| WorkerSerializedIterableSource | メインスレッド-Worker間通信               | `players/IterablePlayer/WorkerSerializedIterableSource.ts` |
| MultiIterableSource            | 複数ソースの統合、時系列マージ            | `players/IterablePlayer/shared/MultiIterableSource.ts`     |
| McapIterableSource             | MCAP読み込み、インデックス判定            | `players/IterablePlayer/Mcap/McapIterableSource.ts`        |
| RemoteFileReadable             | リモートファイル読み込み                  | `players/IterablePlayer/Mcap/RemoteFileReadable.ts`        |
| BrowserHttpReader              | HTTP Range Request実行                    | `util/BrowserHttpReader.ts`                                |
| CachedFilelike                 | 500MB LRUキャッシュ管理                   | `util/CachedFilelike.ts`                                   |
| BufferedIterableSource         | 先読みバッファリング                      | `players/IterablePlayer/BufferedIterableSource.ts`         |
| CachingIterableSource          | ブロックベースキャッシング                | `players/IterablePlayer/CachingIterableSource.ts`          |

---

## 2. 問題の根本原因

### 2.1 メモリ使用量の爆発（最も深刻）

各URLに対して独立した500MBのキャッシュが確保される：

```typescript
// RemoteFileReadable.ts
this.#remoteReader = new CachedFilelike({
  fileReader,
  cacheSizeInBytes: 1024 * 1024 * 500, // 500MiB（各ファイルごと）
});
```

**影響**:

- 10ファイル → 5GBのメモリ使用
- 20ファイル → 10GBのメモリ使用
- ブラウザのメモリ制限を超えるとページがクラッシュ

### 2.2 全ファイルの並列初期化

```typescript
// MultiIterableSource.ts
const initializations: Initialization[] = await Promise.all(
  sources.map(async (source) => await source.initialize()),
);
```

**影響**:

- 全ファイルのインデックス読み込みが同時開始
- ネットワーク帯域を飽和
- S3への同時リクエスト数が急増

### 2.3 並列HTTPリクエストによる輻輳

`mergeAsyncIterators`が各ソースからメッセージを取得する際、全ファイルに同時にHTTPリクエストが発生：

```typescript
// mergeAsyncIterators.ts
await Promise.all(
  iterators.map(async (iterator) => {
    const result = await iterator.next(); // 各ファイルへHTTPリクエスト
    if (!(result.done ?? false)) {
      heap.push({ value: result.value, iterator });
    }
  }),
);
```

### 2.4 高データレートファイルの問題

1秒あたりのデータ量が多いMCAPファイル（点群、画像など）では：

- 各ファイルのイテレータが大量のメッセージを生成
- `heap.push()`/`heap.pop()`が頻繁に発生 → CPU負荷
- 各メッセージのシリアライズ/デシリアライズ → 追加オーバーヘッド

### 2.5 CachingIterableSourceの制限

```typescript
// CachingIterableSource.ts
#maxTotalSizeBytes: number = 629145600;  // 600MB（全体の上限）
```

複数ファイルでこの600MBを共有するため、キャッシュミスが頻発。

---

## 3. S3対応の現状

### 3.1 利用可能なDataSourceFactory

| ファクトリー                       | S3対応 | 説明                         |
| ---------------------------------- | ------ | ---------------------------- |
| **RemoteDataSourceFactory**        | ✅     | HTTP URL経由（唯一のS3対応） |
| McapLocalDataSourceFactory         | ❌     | ローカルファイルのみ         |
| Ros1LocalBagDataSourceFactory      | ❌     | ローカルファイルのみ         |
| Ros2LocalBagDataSourceFactory      | ❌     | ローカルファイルのみ         |
| FoxgloveWebSocketDataSourceFactory | ❌     | WebSocket接続用              |
| Ros1SocketDataSourceFactory        | ❌     | ROS1接続用                   |
| RosbridgeDataSourceFactory         | ❌     | Rosbridge接続用              |
| VelodyneDataSourceFactory          | ❌     | Velodyne LiDAR用             |

**結論**: `RemoteDataSourceFactory`が唯一のS3対応方法。

### 3.2 S3 Presigned URL使用時の要件

1. **CORS設定**: S3バケットでCORSを有効化
2. **Accept-Ranges**: `Accept-Ranges: bytes` ヘッダーが必要
3. **Expose Headers**: `Access-Control-Expose-Headers: Accept-Ranges, Content-Length` が必要

---

## 4. 解決策の選択肢

### 4.1 選択肢A: ファイルをマージしてから再生（最も確実）

```bash
# S3からダウンロード → ローカルでマージ → 再度アップロードまたはローカル再生
mcap merge file1.mcap file2.mcap file3.mcap -o merged.mcap
```

| 項目       | 内容                                  |
| ---------- | ------------------------------------- |
| メリット   | 確実に動作、HTTPリクエスト数が1になる |
| デメリット | 事前処理が必要                        |
| 実装コスト | なし                                  |

### 4.2 選択肢B: サーバーサイドで処理（Foxglove Bridge相当）

MCAPファイルをサーバーで読み込み、WebSocket経由でストリーム配信：

```
S3 → サーバー（MCAPを読み込み、マージ） → WebSocket → Lichtblick
```

| 項目       | 内容                             |
| ---------- | -------------------------------- |
| メリット   | クライアントのメモリ使用量が安定 |
| デメリット | サーバーの構築が必要             |
| 実装コスト | 中（サーバー構築）               |

### 4.3 選択肢C: UnifiedStreamingSource実装（アーキテクチャ変更）

既存の設計案（`20251014_implementation_guide.md`）に基づく実装：

- 1つのメモリプール（100MB固定）で全ファイルを管理
- ファイルを時間順に逐次読み込み（並列ではなく）
- MinHeapで時間順にマージ

| 項目       | 内容                                       |
| ---------- | ------------------------------------------ |
| メリット   | メモリ使用量が予測可能、HTTP負荷を制御可能 |
| デメリット | 1-2週間の開発が必要                        |
| 実装コスト | 高（アーキテクチャ変更）                   |

### 4.4 選択肢D: トピックフィルタリングで負荷軽減

必要なトピックのみを選択して再生（例: 点群を除外）。

| 項目       | 内容                             |
| ---------- | -------------------------------- |
| メリット   | コード変更不要                   |
| デメリット | 見たいデータも見れなくなる可能性 |
| 実装コスト | なし                             |

### 4.5 選択肢E: 設定調整（短期対策）

`RemoteDataSourceFactory.tsx`を修正して`enablePreload: false`を追加：

```typescript
return new IterablePlayer({
  source,
  name: urls.join(),
  metricsCollector: args.metricsCollector,
  urlParams: { urls },
  sourceId: this.id,
  readAheadDuration: { sec: 10, nsec: 0 },
  enablePreload: false, // 追加：大容量ファイル向け
});
```

| 項目       | 内容                             |
| ---------- | -------------------------------- |
| メリット   | 簡単な変更でプリロード負荷を軽減 |
| デメリット | 根本解決にはならない             |
| 実装コスト | 低                               |

---

## 5. 推奨アプローチ

### 状況別の推奨

| 状況                           | 推奨解決策                            |
| ------------------------------ | ------------------------------------- |
| すぐに再生したい               | 選択肢A（MCAPマージ）                 |
| サーバーを構築できる           | 選択肢B（サーバーサイド処理）         |
| 長期的に複数ファイル再生が必要 | 選択肢C（UnifiedStreamingSource実装） |
| とりあえず動かしたい           | 選択肢D（トピックフィルタリング）     |
| 簡単な改善を試したい           | 選択肢E（設定調整）                   |

### 短期・中期・長期の対応

| 期間            | 対応                                         |
| --------------- | -------------------------------------------- |
| 短期（即時）    | MCAPファイルのマージ、トピックフィルタリング |
| 中期（1-2週間） | UnifiedStreamingSourceの実装                 |
| 長期            | サーバーサイド処理基盤の構築                 |

---

## 6. 関連ドキュメント

### プロジェクト内ドキュメント

| ドキュメント                                                                              | 内容                                   |
| ----------------------------------------------------------------------------------------- | -------------------------------------- |
| [UnifiedStreamingSource 実装ガイド](./2025_10/20251014_implementation_guide.md)           | 統合ストリーミングソースの設計・実装案 |
| [ストリーミングアーキテクチャ提案](./2025_10/20251014_streaming_architecture_proposal.md) | ストリーミング再生の全体設計           |
| [パフォーマンス最適化提案](./2025_10/20251014_performance_optimization_proposal.md)       | パフォーマンス改善の提案               |
| [クイックサマリー](./2025_10/20251014_quick_summary.md)                                   | 上記の概要                             |

### 外部リソース

- [MCAP CLI](https://mcap.dev/guides/cli) - `mcap merge`コマンドの使い方
- [Foxglove Bridge](https://github.com/foxglove/ros-foxglove-bridge) - サーバーサイド処理の参考
- [S3 CORS設定](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html) - S3のCORS設定方法

---

## 7. 関連ソースコード

### DataSources

```
packages/suite-base/src/dataSources/
├── RemoteDataSourceFactory.tsx          ★ リモートファイル用
├── McapLocalDataSourceFactory.ts
├── Ros1LocalBagDataSourceFactory.ts
├── Ros2LocalBagDataSourceFactory.ts
├── SampleNuscenesDataSourceFactory.ts
├── FoxgloveWebSocketDataSourceFactory.ts
├── Ros1SocketDataSourceFactory.ts
├── RosbridgeDataSourceFactory.ts
├── VelodyneDataSourceFactory.ts
└── UlogLocalDataSourceFactory.ts
```

### IterablePlayer

```
packages/suite-base/src/players/IterablePlayer/
├── IterablePlayer.ts                    ★ メインプレイヤー
├── WorkerSerializedIterableSource.ts    ★ Worker通信
├── WorkerSerializedIterableSourceWorker.ts
├── BufferedIterableSource.ts            ★ バッファリング
├── CachingIterableSource.ts             ★ キャッシング
├── IIterableSource.ts                   ★ インターフェース定義
├── BagIterableSource.ts
├── shared/
│   ├── MultiIterableSource.ts           ★ 複数ファイル統合
│   └── utils/
│       └── mergeAsyncIterators.ts       ★ 時系列マージ
└── Mcap/
    ├── McapIterableSourceWorker.worker.ts  ★ Worker実装
    ├── McapIterableSource.ts               ★ MCAP読み込み
    ├── McapIndexedIterableSource.ts        ★ インデックス付きMCAP
    ├── McapUnindexedIterableSource.ts      ★ インデックスなしMCAP
    ├── RemoteFileReadable.ts               ★ リモートファイル読み込み
    └── BlobReadable.ts
```

### ユーティリティ

```
packages/suite-base/src/util/
├── BrowserHttpReader.ts                 ★ HTTP読み込み
├── CachedFilelike.ts                    ★ LRUキャッシュ
├── FetchReader.ts
├── VirtualLRUBuffer.ts
├── getNewConnection.ts
└── ranges.ts
```

---

## 更新履歴

| 日付       | 内容     |
| ---------- | -------- |
| 2025-11-28 | 初版作成 |
