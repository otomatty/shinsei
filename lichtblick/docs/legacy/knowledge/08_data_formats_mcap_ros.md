# 8. データ形式の解説 - MCAP と ROS

## 📋 概要

このドキュメントでは、Lichtblick で扱う主要なデータ形式である **MCAP** と **ROS** について、初心者でも理解できるよう詳細に解説します。

**学習時間**: 60分〜90分
**対象レベル**: 初級者〜中級者
**前提知識**: 基本的なファイル形式の理解

## 🤖 ROS (Robot Operating System) とは

### **ROS の基本概念**

ROS は「Robot Operating System」の略で、ロボット開発のための**分散システムフレームワーク**です。

**実際の使用例**:

- ROS1 プレイヤー: `packages/suite-base/src/players/Ros1Player.ts` (61行目〜)
- ROS ブリッジ: `packages/suite-base/src/players/RosbridgePlayer.ts` (82行目〜)

```typescript
// packages/suite-base/src/players/Ros1Player.ts (61行目〜)
export default class Ros1Player implements Player {
  #url: string; // ROSmaster URL
  #hostname?: string; // ROS_HOSTNAME
  #rosNode?: RosNode; // ROS ノードのインスタンス
  #providerDatatypes: RosDatatypes = new Map(); // ROS データ型定義
  #parsedMessages: MessageEvent[] = []; // 解析済みメッセージ

  constructor(url: string) {
    this.#url = url;
  }

  public setSubscriptions(subscriptions: SubscribePayload[]): void {
    if (!this.#rosNode) return;

    // ROS トピックへの購読設定
    for (const subscription of subscriptions) {
      this.#rosNode.subscribe({
        topic: subscription.topic,
        datatype: subscription.schemaName,
        callback: (message, connectionHeader) => {
          this.#handleMessage(subscription.topic, message, connectionHeader);
        },
      });
    }
  }
}
```

### **ROS メッセージシステム**

ROS では、データは「**メッセージ**」という単位で送受信されます。

**実際の使用例**:

- メッセージ処理: `packages/suite-base/src/players/Ros1Player.ts` (430行目〜)

```typescript
// packages/suite-base/src/players/Ros1Player.ts (430行目〜)
#handleMessage = (
  topic: string,
  message: unknown,
  sizeInBytes: number,
  schemaName: string,
  external: boolean,
): void => {
  const receiveTime = this.#getCurrentTime();

  // ROS メッセージを統一形式に変換
  const msg: MessageEvent = {
    topic, // トピック名 (例: "/robot/pose")
    receiveTime, // 受信時刻
    message, // メッセージデータ
    sizeInBytes, // データサイズ
    schemaName, // スキーマ名 (例: "geometry_msgs/PoseStamped")
  };

  this.#parsedMessages.push(msg);
  this.#handleInternalMessage(msg);

  // トピック統計の更新
  let stats = this.#providerTopicsStats.get(topic);
  if (this.#rosNode?.subscriptions.has(topic) === true) {
    if (!stats) {
      stats = { numMessages: 0 };
      this.#providerTopicsStats.set(topic, stats);
    }
    stats.numMessages++;
    stats.firstMessageTime ??= receiveTime;
    stats.lastMessageTime = receiveTime;
  }

  this.#emitState();
};
```

### **ROS トピック**

トピックは ROS におけるデータの**配信チャンネル**です。

**命名規則**:

```
/[namespace]/[node_name]/[data_type]
```

**実際の例**:

- `/robot/pose` - ロボットの位置情報
- `/camera/image_raw` - カメラの生画像
- `/lidar/scan` - LiDAR スキャンデータ
- `/cmd_vel` - 速度コマンド

**実際の使用例**:

- トピック処理: `packages/suite-base/src/players/RosbridgePlayer.ts` (440行目〜)

```typescript
// packages/suite-base/src/players/RosbridgePlayer.ts (440行目〜)
public setSubscriptions(subscriptions: SubscribePayload[]): void {
  this.#requestedSubscriptions = subscriptions;

  if (!this.#rosClient || this.#closed) {
    return;
  }

  // 利用可能なトピックをフィルタリング
  const availableTopicsByTopicName = _.keyBy(this.#providerTopics ?? [], ({ name }) => name);
  const topicNames = subscriptions
    .map(({ topic }) => topic)
    .filter((topicName) => availableTopicsByTopicName[topicName]);

  // 新しいトピックを購読
  for (const topicName of topicNames) {
    if (this.#topicSubscriptions.has(topicName)) {
      continue;
    }

    const topic = new roslib.Topic({
      ros: this.#rosClient,
      name: topicName,
      compression: "cbor-raw",
    });

    const availTopic = availableTopicsByTopicName[topicName];
    if (!availTopic) {
      continue;
    }

    const { schemaName } = availTopic;
    const messageReader = this.#messageReadersByDatatype[schemaName];
    if (!messageReader) {
      continue;
    }

    topic.subscribe((message) => {
      try {
        const buffer = (message as { bytes: ArrayBuffer }).bytes;
        const bytes = new Uint8Array(buffer);
        const innerMessage = messageReader.readMessage(bytes);

        const receiveTime = this.#getCurrentTime();
        const msg: MessageEvent = {
          topic: topicName,
          receiveTime,
          message: innerMessage,
          schemaName,
          sizeInBytes: bytes.byteLength,
        };

        this.#parsedMessages.push(msg);
      } catch (error) {
        // エラーハンドリング
      }

      this.#emitState();
    });

    this.#topicSubscriptions.set(topicName, topic);
  }
}
```

### **ROS データ型（スキーマ）**

ROS メッセージには厳密な型定義があります。

**代表的なデータ型**:

```typescript
// geometry_msgs/PoseStamped の例
interface PoseStamped {
  header: {
    seq: number;
    stamp: Time;
    frame_id: string;
  };
  pose: {
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; z: number; w: number };
  };
}

// sensor_msgs/PointCloud2 の例
interface PointCloud2 {
  header: Header;
  height: number;
  width: number;
  fields: PointField[];
  is_bigendian: boolean;
  point_step: number;
  row_step: number;
  data: Uint8Array;
}
```

**実際の使用例**:

- 点群データ処理: `packages/suite-base/src/players/UserScriptPlayer/transformerWorker/typescript/userUtils/pointClouds.ts` (33行目〜)

```typescript
// packages/suite-base/src/players/UserScriptPlayer/transformerWorker/typescript/userUtils/pointClouds.ts (33行目〜)
export const readPoints = (message: sensor_msgs__PointCloud2): Array<Field[]> => {
  const { fields, height, point_step, row_step, width, data } = message;
  const readers = getFieldOffsetsAndReaders(fields);

  const points: Array<Field[]> = [];
  for (let i = 0; i < height; i++) {
    const dataOffset = i * row_step;
    for (let j = 0; j < width; j++) {
      const row: Field[] = [];
      const dataStart = j * point_step + dataOffset;
      for (const reader of readers) {
        const value = reader.reader.read(data, dataStart);
        row.push(value);
      }
      points.push(row);
    }
  }
  return points;
};
```

## 📁 MCAP (Message Capture and Processing) とは

### **MCAP の基本概念**

MCAP は、ロボットデータの**記録・再生**のための新しいファイル形式です。従来の ROS bag ファイルの後継として開発されました。

**主な特徴**:

- **高性能**: インデックス機能により高速な検索が可能
- **大容量対応**: 数 GB〜数 TB のデータに対応
- **圧縮対応**: LZ4、ZSTD 等の圧縮アルゴリズムをサポート
- **自己記述的**: スキーマ情報をファイル内に保存

**実際の使用例**:

- MCAP ファイル読み込み: `packages/suite-desktop/src/quicklook/getMcapInfo.ts` (1行目〜)

```typescript
// packages/suite-desktop/src/quicklook/getMcapInfo.ts (1行目〜)
export async function getMcapInfo(file: Blob): Promise<FileInfo> {
  // MCAP ファイルの妥当性チェック
  const isValidMcap = hasMcapPrefix(
    new DataView(await file.slice(0, McapConstants.MCAP_MAGIC.length).arrayBuffer()),
  );

  if (!isValidMcap) {
    throw new Error("Not a valid MCAP file");
  }

  const decompressHandlers = await loadDecompressHandlers();

  // インデックス付きファイルの読み込みを試行
  try {
    return await getIndexedMcapInfo(file, decompressHandlers);
  } catch (error) {
    log.info("Failed to read MCAP file as indexed:", error);
  }

  // ストリーミング読み込みにフォールバック
  return {
    fileType: "MCAP v0, unindexed",
    loadMoreInfo: async (reportProgress) =>
      await getStreamedMcapInfo(
        file,
        new McapStreamReader({ includeChunks: true, decompressHandlers, validateCrcs: true }),
        processMcapRecord,
        "MCAP v0, unindexed",
        reportProgress,
      ),
  };
}
```

### **MCAP ファイル構造**

MCAP ファイルは以下の構造を持ちます：

```
[Header]
[Schema Records]
[Channel Records]
[Data Chunk]
  [Message Records]
[Data Chunk]
  [Message Records]
...
[Statistics]
[Footer]
```

**実際の使用例**:

- MCAP レコード処理: `packages/suite-desktop/src/quicklook/getStreamedMcapInfo.ts` (24行目〜)

```typescript
// packages/suite-desktop/src/quicklook/getStreamedMcapInfo.ts (24行目〜)
export function processMcapRecord(info: McapInfo, record: McapTypes.TypedMcapRecord): void {
  switch (record.type) {
    case "Chunk":
      // チャンクの処理
      info.numChunks++;
      info.compressionTypes.add(record.compression);
      return;

    case "Attachment":
      // 添付ファイルの処理
      info.numAttachments++;
      break;

    case "Schema":
      // スキーマ情報の処理
      info.schemaNamesById.set(record.id, record.name);
      break;

    case "Channel": {
      // チャンネル情報の処理
      info.topicNamesByChannelId.set(record.id, record.topic);
      const chanInfo = info.topicInfosByTopic.get(record.topic);
      const schemaName = info.schemaNamesById.get(record.schemaId);

      if (chanInfo != undefined) {
        if (schemaName != undefined && chanInfo.schemaName !== schemaName) {
          chanInfo.schemaName = "(multiple)";
        }
        if (!chanInfo.connectionIds.has(record.id)) {
          chanInfo.connectionIds.add(record.id);
          chanInfo.numConnections++;
        }
      } else {
        info.topicInfosByTopic.set(record.topic, {
          topic: record.topic,
          schemaName: schemaName ?? "(unknown)",
          numMessages: 0n,
          numConnections: 1,
          connectionIds: new Set([record.id]),
        });
      }
      return;
    }

    case "Message": {
      // メッセージデータの処理
      const topic = info.topicNamesByChannelId.get(record.channelId);
      if (topic != undefined) {
        const topicInfo = info.topicInfosByTopic.get(topic);
        if (topicInfo != undefined) {
          topicInfo.numMessages = (topicInfo.numMessages ?? 0n) + 1n;
        }
      }
      info.totalMessages++;

      // 時間範囲の更新
      const timestamp = fromNanoSec(record.logTime);
      if (!info.startTime || isLessThan(timestamp, info.startTime)) {
        info.startTime = timestamp;
      }
      if (!info.endTime || isGreaterThan(timestamp, info.endTime)) {
        info.endTime = timestamp;
      }
      return;
    }

    case "AttachmentIndex":
    case "Statistics":
    case "Unknown":
    case "Header":
    case "Footer":
    case "MessageIndex":
      // その他のレコードタイプの処理
      break;
  }
}
```

### **MCAP データの読み込み**

MCAP ファイルの読み込みには、インデックス付きとストリーミングの2つの方法があります。

**実際の使用例**:

- インデックス付き読み込み: `packages/suite-base/src/players/IterablePlayer/Mcap/McapIndexedIterableSource.ts` (150行目〜)

```typescript
// packages/suite-base/src/players/IterablePlayer/Mcap/McapIndexedIterableSource.ts (150行目〜)
public async *messageIterator(
  args: MessageIteratorArgs,
): AsyncIterableIterator<Readonly<IteratorResult>> {
  const topics = args.topics;
  const start = args.start ?? this.#start;
  const end = args.end ?? this.#end;

  if (topics.size === 0 || !start || !end) {
    return;
  }

  const topicNames = Array.from(topics.keys());

  // インデックスを使用した高速な読み込み
  for await (const message of this.#reader.readMessages({
    startTime: toNanoSec(start),
    endTime: toNanoSec(end),
    topics: topicNames,
    validateCrcs: false,
  })) {
    const channelInfo = this.#channelInfoById.get(message.channelId);
    if (!channelInfo) {
      yield {
        type: "alert",
        connectionId: message.channelId,
        alert: {
          message: `Received message on channel ${message.channelId} without prior channel info`,
          severity: "error",
        },
      };
      continue;
    }

    try {
      // メッセージのデシリアライズ
      const msg = channelInfo.parsedChannel.deserialize(message.data) as Record<string, unknown>;
      const spec = topicsWithSubscriptionHash.get(channelInfo.channel.topic);
      const payload = spec?.fields != undefined ? pickFields(msg, spec.fields) : msg;

      const estimatedMemorySize = this.#estimateMessageSize(
        spec?.subscriptionHash ?? channelInfo.channel.topic,
        payload,
      );

      const sizeInBytes = spec?.fields == undefined
        ? Math.max(message.data.byteLength, estimatedMemorySize)
        : estimatedMemorySize;

      yield {
        type: "message-event",
        msgEvent: {
          topic: channelInfo.channel.topic,
          receiveTime: fromNanoSec(message.logTime),
          publishTime: fromNanoSec(message.publishTime),
          message: payload,
          sizeInBytes,
          schemaName: channelInfo.schemaName ?? "",
        },
      };
    } catch (error) {
      yield {
        type: "alert",
        connectionId: message.channelId,
        alert: {
          message: `Error decoding message on ${channelInfo.channel.topic}`,
          error,
          severity: "error",
        },
      };
    }
  }
}
```

**実際の使用例**:

- ストリーミング読み込み: `packages/suite-base/src/players/IterablePlayer/Mcap/McapUnindexedIterableSource.ts` (152行目〜)

```typescript
// packages/suite-base/src/players/IterablePlayer/Mcap/McapUnindexedIterableSource.ts (152行目〜)
case "Message": {
  const channelId = record.channelId;
  const channelInfo = channelInfoById.get(channelId);
  const messages = messagesByChannel.get(channelId);

  if (!channelInfo || !messages) {
    if (channelIdsWithErrors.has(channelId)) {
      break; // エラーは既に報告済み
    }
    throw new Error(`message for channel ${channelId} with no prior channel info`);
  }

  ++messageCount;
  const receiveTime = fromNanoSec(record.logTime);

  // 時間範囲の更新
  if (!startTime || isLessThan(receiveTime, startTime)) {
    startTime = receiveTime;
  }
  if (!endTime || isGreaterThan(receiveTime, endTime)) {
    endTime = receiveTime;
  }

  // メッセージのデシリアライズ
  const deserializedMessage = channelInfo.parsedChannel.deserialize(record.data);
  const estimatedMemorySize = estimateMessageSize(
    channelInfo.channel.topic,
    deserializedMessage,
  );

  messages.push({
    topic: channelInfo.channel.topic,
    receiveTime,
    publishTime: fromNanoSec(record.publishTime),
    message: deserializedMessage,
    sizeInBytes: Math.max(record.data.byteLength, estimatedMemorySize),
    schemaName: channelInfo.schemaName ?? "",
  });
  break;
}
```

### **MCAP の圧縮と最適化**

MCAP は様々な圧縮形式をサポートしています。

**実際の使用例**:

- 圧縮ハンドラー: `packages/mcap-support/src/index.ts` (loadDecompressHandlers 関数)

```typescript
// 圧縮ハンドラーの読み込み
const decompressHandlers = await loadDecompressHandlers();

// 圧縮タイプの確認
info.compressionTypes.add(record.compression);

// 利用可能な圧縮形式
// - "lz4" - 高速圧縮
// - "zstd" - 高圧縮率
// - "none" - 圧縮なし
```

## 🔄 データ変換とスキーマ処理

### **チャンネル解析**

MCAP のチャンネル情報から ROS メッセージを解析します。

**実際の使用例**:

- チャンネル解析: `packages/mcap-support/src/parseChannel.ts` (87行目〜)

```typescript
// packages/mcap-support/src/parseChannel.ts (87行目〜)
export function parseChannel(
  channel: Channel,
  options?: { allowEmptySchema: boolean },
): ParsedChannel {
  if (channel.messageEncoding === "cdr") {
    if (
      channel.schema?.encoding !== "ros2msg" &&
      channel.schema?.encoding !== "ros2idl" &&
      channel.schema?.encoding !== "omgidl"
    ) {
      throw new Error(
        `Message encoding ${channel.messageEncoding} with ${
          channel.schema == undefined
            ? "no encoding"
            : `schema encoding '${channel.schema.encoding}'`
        } is not supported (expected "ros2msg" or "ros2idl")`,
      );
    }

    const schema = new TextDecoder().decode(channel.schema.data);

    if (channel.schema.encoding === "omgidl") {
      const parsedDefinitions = parseIDL(schema);
      const reader = new OmgidlMessageReader(channel.schema.name, parsedDefinitions);
      const datatypes = parseIDLDefinitionsToDatatypes(parsedDefinitions);
      return {
        datatypes,
        deserialize: (data) => reader.readMessage(data),
      };
    } else {
      const isIdl = channel.schema.encoding === "ros2idl";
      const parsedDefinitions = isIdl
        ? parseRos2idl(schema)
        : parseMessageDefinition(schema, { ros2: true });

      const reader = new ROS2MessageReader(parsedDefinitions);

      return {
        datatypes: parsedDefinitionsToDatatypes(parsedDefinitions, channel.schema.name),
        deserialize: (data) => reader.readMessage(data),
      };
    }
  }

  throw new Error(`Unsupported encoding ${channel.messageEncoding}`);
}
```

### **Flatbuffer スキーマ処理**

一部のデータは Flatbuffer 形式で保存されます。

**実際の使用例**:

- Flatbuffer 解析: `packages/mcap-support/src/parseFlatbufferSchema.ts` (154行目〜)

```typescript
// packages/mcap-support/src/parseFlatbufferSchema.ts (154行目〜)
export function parseFlatbufferSchema(
  schemaName: string,
  schemaArray: Uint8Array,
): {
  datatypes: MessageDefinitionMap;
  deserialize: (buffer: ArrayBufferView) => unknown;
} {
  const datatypes: MessageDefinitionMap = new Map();
  const schemaBuffer = new ByteBuffer(schemaArray);
  const rawSchema = Schema.getRootAsSchema(schemaBuffer);
  const schema = rawSchema.unpack();

  let typeIndex = -1;
  for (let schemaIndex = 0; schemaIndex < schema.objects.length; ++schemaIndex) {
    const object = schema.objects[schemaIndex];
    if (object?.name === schemaName) {
      typeIndex = schemaIndex;
    }

    let fields: MessageDefinitionField[] = [];
    if (object?.fields == undefined) {
      continue;
    }

    for (const field of object.fields) {
      fields = fields.concat(typeForField(schema, field));
    }

    datatypes.set(flatbufferString(object.name), { definitions: fields });
  }

  // デシリアライザーの作成
  const parser = new Parser(rawSchema);
  const toObject = parser.toObjectLambda(typeIndex, /*readDefaults=*/ true);

  const deserialize = (buffer: ArrayBufferView) => {
    const byteBuffer = new ByteBuffer(
      new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    );
    const table = new Table(
      byteBuffer,
      typeIndex,
      byteBuffer.readInt32(byteBuffer.position()) + byteBuffer.position(),
      false,
    );
    return toObject(table);
  };

  return { datatypes, deserialize };
}
```

## 🎯 パフォーマンス最適化

### **メッセージ処理の最適化**

大量のメッセージを効率的に処理するための技術。

**実際の使用例**:

- メッセージ変換: `packages/suite-base/src/components/PanelExtensionAdapter/messageProcessing.ts` (129行目〜)

```typescript
// packages/suite-base/src/components/PanelExtensionAdapter/messageProcessing.ts (129行目〜)
export function convertMessage(
  messageEvent: Immutable<MessageEvent>,
  converters: Immutable<TopicSchemaConverterMap>,
  convertedMessages: MessageEvent[],
): void {
  const key = converterKey(messageEvent.topic, messageEvent.schemaName);
  const matchedConverters = converters.get(key);

  for (const converter of matchedConverters ?? []) {
    const convertedMessage = converter.converter(messageEvent.message, messageEvent);

    // コンバーターが undefined または null を返す場合、メッセージをスキップ
    if (convertedMessage == undefined) {
      continue;
    }

    convertedMessages.push({
      topic: messageEvent.topic,
      schemaName: converter.toSchemaName,
      receiveTime: messageEvent.receiveTime,
      message: convertedMessage,
      originalMessageEvent: messageEvent,
      sizeInBytes: messageEvent.sizeInBytes,
      topicConfig: messageEvent.topicConfig,
    });
  }
}
```

### **点群データの最適化**

点群データのような大容量データの効率的な処理。

**実際の使用例**:

- 点群処理: `packages/suite-base/src/panels/ThreeDeeRender/renderables/pointClouds/fieldReaders.ts` (94行目〜)

```typescript
// packages/suite-base/src/panels/ThreeDeeRender/renderables/pointClouds/fieldReaders.ts (94行目〜)
export function getReader(
  field: PackedElementField | PointField,
  stride: number,
  normalize = false,
  forceType?: PointFieldType | NumericType,
): FieldReader | undefined {
  if (!isSupportedField(field)) {
    return undefined;
  }

  const numericType = (field as Partial<PackedElementField>).type;
  if (numericType == undefined) {
    const type = forceType ?? (field as PointField).datatype;
    switch (type) {
      case PointFieldType.INT8:
        return field.offset + 1 <= stride ? int8Reader(field.offset, normalize) : undefined;
      case PointFieldType.UINT8:
        return field.offset + 1 <= stride ? uint8Reader(field.offset, normalize) : undefined;
      case PointFieldType.INT16:
        return field.offset + 2 <= stride ? int16Reader(field.offset, normalize) : undefined;
      case PointFieldType.UINT16:
        return field.offset + 2 <= stride ? uint16Reader(field.offset, normalize) : undefined;
      case PointFieldType.INT32:
        return field.offset + 4 <= stride ? int32Reader(field.offset, normalize) : undefined;
      case PointFieldType.UINT32:
        return field.offset + 4 <= stride ? uint32Reader(field.offset, normalize) : undefined;
      case PointFieldType.FLOAT32:
        return field.offset + 4 <= stride ? float32Reader(field.offset) : undefined;
      case PointFieldType.FLOAT64:
        return field.offset + 8 <= stride ? float64Reader(field.offset) : undefined;
      default:
        return undefined;
    }
  }

  // その他のタイプの処理...
}
```

## 🔧 実装例

### **簡単な MCAP ファイル読み込み**

```typescript
// MCAP ファイルの基本的な読み込み例
class SimpleMcapReader {
  private file: File;
  private reader?: McapIndexedReader;

  constructor(file: File) {
    this.file = file;
  }

  public async initialize(): Promise<void> {
    const decompressHandlers = await loadDecompressHandlers();
    const readable = new BlobReadable(this.file);

    this.reader = await McapIndexedReader.Initialize({
      readable,
      decompressHandlers,
    });
  }

  public async getTopics(): Promise<string[]> {
    if (!this.reader) {
      throw new Error("Reader not initialized");
    }

    const topics: string[] = [];
    for (const channel of this.reader.channelsById.values()) {
      topics.push(channel.topic);
    }

    return topics;
  }

  public async readMessages(topic: string): Promise<MessageEvent[]> {
    if (!this.reader) {
      throw new Error("Reader not initialized");
    }

    const messages: MessageEvent[] = [];

    for await (const message of this.reader.readMessages({
      topics: [topic],
      validateCrcs: false,
    })) {
      const channelInfo = this.reader.channelsById.get(message.channelId);
      if (!channelInfo) continue;

      const schema = this.reader.schemasById.get(channelInfo.schemaId);
      const parsedChannel = parseChannel({
        messageEncoding: channelInfo.messageEncoding,
        schema,
      });

      const deserializedMessage = parsedChannel.deserialize(message.data);

      messages.push({
        topic: channelInfo.topic,
        receiveTime: fromNanoSec(message.logTime),
        publishTime: fromNanoSec(message.publishTime),
        message: deserializedMessage,
        sizeInBytes: message.data.byteLength,
        schemaName: schema?.name ?? "",
      });
    }

    return messages;
  }
}
```

### **ROS メッセージの処理**

```typescript
// ROS メッセージの基本的な処理例
class RosMessageProcessor {
  private subscriptions = new Map<string, (message: MessageEvent) => void>();
  private rosNode?: RosNode;

  public async connect(url: string): Promise<void> {
    this.rosNode = new RosNode({ url });
    await this.rosNode.connect();
  }

  public subscribe(topic: string, callback: (message: MessageEvent) => void): void {
    if (!this.rosNode) {
      throw new Error("ROS node not connected");
    }

    this.subscriptions.set(topic, callback);

    this.rosNode.subscribe({
      topic,
      callback: (message, connectionHeader) => {
        const messageEvent: MessageEvent = {
          topic,
          receiveTime: this.getCurrentTime(),
          message,
          sizeInBytes: this.estimateMessageSize(message),
          schemaName: connectionHeader.type,
        };

        callback(messageEvent);
      },
    });
  }

  public publish(topic: string, message: unknown, datatype: string): void {
    if (!this.rosNode) {
      throw new Error("ROS node not connected");
    }

    this.rosNode.publish({
      topic,
      message,
      datatype,
    });
  }

  private getCurrentTime(): Time {
    const now = Date.now();
    return {
      sec: Math.floor(now / 1000),
      nsec: (now % 1000) * 1000000,
    };
  }

  private estimateMessageSize(message: unknown): number {
    return JSON.stringify(message).length;
  }
}
```

## 📚 よくある質問

### **Q1: MCAP と ROS bag の違いは何ですか？**

**A1**:

- **MCAP**: 新しい形式、高性能、大容量対応、圧縮サポート
- **ROS bag**: 従来の形式、シンプル、互換性重視

### **Q2: どの形式を選べばいいですか？**

**A2**:

- **新規プロジェクト**: MCAP を推奨
- **既存システム**: ROS bag も継続サポート
- **大容量データ**: MCAP が圧倒的に有利

### **Q3: エラーが発生した場合の対処法は？**

**A3**:

1. ファイル形式の確認
2. スキーマの妥当性チェック
3. 圧縮設定の確認
4. メモリ使用量の監視

## 🎯 まとめ

このドキュメントでは、MCAP と ROS のデータ形式について詳しく解説しました。

**重要なポイント**:

- **ROS**: 分散システムフレームワーク、メッセージ/トピック/スキーマ
- **MCAP**: 高性能なファイル形式、インデックス/圧縮/自己記述
- **実装**: 実際のコード例を参考に理解を深める

これらの知識を基に、Lichtblick プロジェクトでのデータ処理を効率的に進めることができます。

**次のステップ**: 実際にファイルを読み込んで、データ処理を試してみましょう！
