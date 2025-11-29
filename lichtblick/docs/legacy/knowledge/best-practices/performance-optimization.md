# パフォーマンス最適化基礎知識 ⚡

## 📋 概要

このドキュメントでは、lichtblick（robotics visualization tool）におけるReactアプリケーションのパフォーマンス最適化について解説します。特に、**ROSメッセージ処理**、**3D rendering**、**大量データ処理**といった、robotics分野特有の重い処理における最適化手法を説明します。

## 🎯 なぜパフォーマンス最適化が必要なのか？

### 1. robotics特有のパフォーマンス問題

```typescript
// ❌ 最適化されていないROSメッセージ処理
function TopicList({ topics, filterText }: Props) {
  // 毎回全トピックを検索（重い処理）
  // ROSでは数百〜数千のトピックが存在することがある
  const filteredTopics = topics.filter(topic =>
    topic.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div>
      {filteredTopics.map(topic => (
        <TopicRow key={topic.name} topic={topic} />
      ))}
    </div>
  );
}

function TopicRow({ topic }: { topic: Topic }) {
  // 親コンポーネントが再レンダリングされる度に再レンダリング
  // トピック統計の計算も毎回実行される
  const stats = calculateTopicStats(topic);

  return (
    <div>
      <h3>{topic.name}</h3>
      <p>Messages: {stats.messageCount}</p>
      <p>Hz: {stats.frequency}</p>
    </div>
  );
}
```

### 🤖 用語解説

- **ROSメッセージ**: Robot Operating System（ROS）で使用されるデータ形式。センサーデータ、制御コマンド、位置情報などを含む
- **トピック**: ROSでデータを送受信するための「チャンネル」のようなもの。例：`/camera/image_raw`（カメラ映像）、`/lidar/points`（LiDAR点群）
- **Point Cloud**: 3D空間の点の集合。LiDARやDepthカメラから取得される大量の3D座標データ
- **rendering**: 3Dオブジェクトやデータを画面に描画する処理。THREE.jsを使用

**問題点**

1. **リアルタイム性の悪化**: ROSメッセージは数十Hz〜数百Hzで送信されるため、処理が遅いとデータが溜まる
2. **メモリリーク**: 大量のPoint Cloudデータ（1フレーム数MB）が蓄積されるとメモリが圧迫
3. **UI凍結**: 3D renderingの重い処理でUIが応答しなくなる
4. **データ損失**: 処理が追いつかずに重要なセンサーデータが欠落

### 2. 最適化の効果

```typescript
// ✅ 最適化されたROSメッセージ処理
function TopicList({ topics, filterText }: Props) {
  // 検索結果をメモ化（filterTextやtopicsが変わった時のみ再計算）
  const filteredTopics = useMemo(() => {
    return topics.filter(topic =>
      topic.name.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [topics, filterText]);

  return (
    <div>
      {filteredTopics.map(topic => (
        <TopicRow key={topic.name} topic={topic} />
      ))}
    </div>
  );
}

// メモ化されたコンポーネント（topicプロパティが変わった時のみ再レンダリング）
const TopicRow = React.memo(({ topic }: { topic: Topic }) => {
  // 統計計算もメモ化
  const stats = useMemo(() => calculateTopicStats(topic), [topic]);

  return (
    <div>
      <h3>{topic.name}</h3>
      <p>Messages: {stats.messageCount}</p>
      <p>Hz: {stats.frequency}</p>
    </div>
  );
});
```

**改善効果**

1. **リアルタイム性向上**: 30fps以上で安定したUI更新
2. **メモリ効率**: 不要なオブジェクト生成を削減
3. **スケーラビリティ**: 数千のトピックでも快適に動作
4. **データ処理性能**: 大量のPoint Cloudデータを効率的に処理

## ⚛️ lichtblick固有の最適化

### 1. 3D Rendering の最適化

```typescript
// ❌ 最適化なし - 3Dオブジェクトの非効率な更新
function ThreeDeeRender({ pointClouds, cameraSettings }: Props) {
  // 毎回全てのPoint Cloudを再処理（非常に重い）
  const processedPointClouds = pointClouds.map(cloud => ({
    ...cloud,
    geometry: createGeometry(cloud.points), // 数万〜数百万の点を処理
    material: createMaterial(cloud.color)
  }));

  return (
    <Canvas>
      {processedPointClouds.map(cloud => (
        <mesh key={cloud.id} geometry={cloud.geometry} material={cloud.material} />
      ))}
    </Canvas>
  );
}
```

### 🔧 用語解説

- **Geometry**: 3Dオブジェクトの形状データ（頂点、面など）
- **Material**: 3Dオブジェクトの材質（色、光沢など）
- **mesh**: 3D空間でのオブジェクト（geometryとmaterialを組み合わせたもの）
- **Canvas**: 3D描画エリア（THREE.jsのScene）

**なぜ問題なのか？**

1. **GPU負荷**: 数百万点のPoint Cloudを毎フレーム処理するとGPUが限界に
2. **メモリ使用量**: 大量のGeometryオブジェクトが作成される
3. **フレームレート低下**: 60fps → 5fps以下に低下

```typescript
// ✅ 最適化された3D Rendering
function ThreeDeeRender({ pointClouds, cameraSettings }: Props) {
  // Point Cloudの処理をメモ化
  const processedPointClouds = useMemo(() => {
    return pointClouds.map(cloud => ({
      ...cloud,
      geometry: createGeometry(cloud.points),
      material: createMaterial(cloud.color)
    }));
  }, [pointClouds]); // pointCloudsが変わった時のみ再計算

  // カメラ設定の変更はgeometryの再計算を必要としない
  const cameraControls = useMemo(() => {
    return createCameraControls(cameraSettings);
  }, [cameraSettings]);

  return (
    <Canvas>
      {processedPointClouds.map(cloud => (
        <mesh key={cloud.id} geometry={cloud.geometry} material={cloud.material} />
      ))}
      <PerspectiveCamera {...cameraControls} />
    </Canvas>
  );
}
```

### 2. ROSメッセージ処理の最適化

```typescript
// ❌ 非効率なメッセージ処理
function MessageProcessor({ messages, subscriptions }: Props) {
  // 毎回全メッセージを変換（重い処理）
  const processedMessages = messages.map(msg => {
    // ROSメッセージの型変換（point cloud、image、sensor_msgs等）
    return convertMessage(msg, subscriptions);
  });

  return <MessageDisplay messages={processedMessages} />;
}

function convertMessage(message: RosMessage, subscriptions: Subscription[]): ProcessedMessage {
  // 複雑な変換処理
  const schema = getSchema(message.schemaName);
  const converter = findConverter(schema);
  return converter.convert(message.data); // 毎回新しいオブジェクトを作成
}
```

### 📡 用語解説

- **ROS Schema**: ROSメッセージの型定義（例：`sensor_msgs/PointCloud2`）
- **Message Converter**: 異なるスキーマ間でメッセージを変換する機能
- **Subscription**: 特定のトピックのメッセージを受信する登録

```typescript
// ✅ 最適化されたメッセージ処理
function MessageProcessor({ messages, subscriptions }: Props) {
  // メッセージ変換をメモ化
  const processedMessages = useMemo(() => {
    return messages.map(msg => convertMessage(msg, subscriptions));
  }, [messages, subscriptions]);

  return <MessageDisplay messages={processedMessages} />;
}

// メッセージ変換もメモ化
const convertMessage = useMemo(() => {
  const converterCache = new Map<string, MessageConverter>();

  return (message: RosMessage, subscriptions: Subscription[]): ProcessedMessage => {
    const key = `${message.schemaName}_${message.topic}`;

    if (!converterCache.has(key)) {
      const schema = getSchema(message.schemaName);
      const converter = findConverter(schema);
      converterCache.set(key, converter);
    }

    const converter = converterCache.get(key)!;
    return converter.convert(message.data);
  };
}, []);
```

### 3. 大量データの仮想化

```typescript
// ❌ 数千のトピックを全て描画
function TopicList({ topics }: { topics: Topic[] }) {
  return (
    <div>
      {topics.map(topic => ( // 数千のDOM要素を作成
        <TopicRow key={topic.name} topic={topic} />
      ))}
    </div>
  );
}
```

**実際のプロジェクトでの例**

```typescript
// ✅ 仮想化による最適化（実際のlichtblickのコード）
import { VariableSizeList } from "react-window";

function TopicList({ topics }: { topics: Topic[] }) {
  const Row = ({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <TopicRow topic={topics[index]} />
    </div>
  );

  return (
    <AutoSizer>
      {({ width, height }) => (
        <VariableSizeList
          height={height}
          itemCount={topics.length}
          itemSize={(index) => (topics[index]?.type === "topic" ? 50 : 28)}
          overscanCount={10} // 見えない範囲も少し描画してスクロール性能を向上
        >
          {Row}
        </VariableSizeList>
      )}
    </AutoSizer>
  );
}
```

### 🔄 用語解説

- **仮想化（Virtualization）**: 大量のデータのうち、画面に表示される部分のみを描画する技術
- **overscanCount**: 見えない範囲も少し描画しておくことで、スクロール時の性能を向上
- **AutoSizer**: 親要素のサイズに合わせて自動的にリサイズする仕組み

**効果**

1. **メモリ使用量削減**: 数千のトピック → 表示部分のみ（約10-20個）
2. **描画性能向上**: 初期描画時間が大幅短縮
3. **スクロール性能**: 大量データでもスムーズなスクロール

## 🚀 実際のプロジェクトでの最適化例

### 1. メッセージサイズの推定とキャッシング

```typescript
// ✅ 実際のlichtblickのメッセージ処理
class MessageProcessor {
  private messageSizeEstimateByTopic: Record<string, number> = {};

  processMessage(message: RosMessage): ProcessedMessage {
    // メッセージサイズの推定をキャッシュ
    let msgSizeEstimate = this.messageSizeEstimateByTopic[message.topic];
    if (msgSizeEstimate == undefined) {
      msgSizeEstimate = estimateObjectSize(message.data);
      this.messageSizeEstimateByTopic[message.topic] = msgSizeEstimate;
    }

    return {
      ...message,
      sizeInBytes: Math.max(message.data.byteLength, msgSizeEstimate),
    };
  }
}
```

### 💾 用語解説

- **Object Size Estimation**: JavaScriptオブジェクトのメモリ使用量を推定する処理
- **byteLength**: バイナリデータの実際のサイズ（バイト単位）
- **Cache**: 一度計算した結果を保存して再利用する仕組み

### 2. Block Loading による効率的なデータ読み込み

```typescript
// ✅ 実際のlichtblickのBlockLoader
class BlockLoader {
  private maxCacheSize = 1.0e9; // 1GB
  private blocks: Block[] = [];

  async loadBlock(blockId: number): Promise<Block> {
    // すでに読み込み済みかチェック
    if (this.blocks[blockId]) {
      return this.blocks[blockId];
    }

    // キャッシュサイズの確認
    const totalSize = this.blocks.reduce((sum, block) => sum + block.sizeInBytes, 0);
    if (totalSize > this.maxCacheSize) {
      // 古いブロックを削除
      this.evictOldBlocks();
    }

    // 新しいブロックを読み込み
    const block = await this.loadBlockFromSource(blockId);
    this.blocks[blockId] = block;
    return block;
  }
}
```

### 🗂️ 用語解説

- **Block Loading**: 大量データを固定サイズのブロック単位で読み込む手法
- **Cache Eviction**: メモリ不足時に古いデータを削除する処理
- **Preloading**: 必要になる前にデータを先読みしておく仕組み

### 3. 統計情報の効率的な計算

```typescript
// ✅ トピック統計の最適化
function useTopicStats(topics: Topic[]): TopicStats {
  return useMemo(() => {
    const stats: TopicStats = {
      totalTopics: topics.length,
      messageCount: 0,
      totalSize: 0,
      frequencyMap: new Map<string, number>(),
    };

    // 統計を一度に計算
    for (const topic of topics) {
      stats.messageCount += topic.messageCount;
      stats.totalSize += topic.sizeInBytes;
      stats.frequencyMap.set(topic.name, topic.frequency);
    }

    return stats;
  }, [topics]); // topicsが変わった時のみ再計算
}
```

## 🔍 パフォーマンス測定

### 1. 実際のプロジェクトでの測定

```typescript
// ✅ lichtblickでの3D renderingパフォーマンス測定
function Stats(): React.JSX.Element {
  const [stats, setStats] = useState<RenderStats>();

  useRendererEvent("endFrame", (renderer) => {
    const newStats = {
      drawCalls: renderer.gl.info.render.calls,
      triangles: renderer.gl.info.render.triangles,
      textures: renderer.gl.info.memory.textures,
      geometries: renderer.gl.info.memory.geometries
    };
    setStats(newStats);
  });

  return (
    <div>
      <div>Draw Calls: {stats?.drawCalls}</div>
      <div>Triangles: {stats?.triangles}</div>
      <div>Textures: {stats?.textures}</div>
      <div>Geometries: {stats?.geometries}</div>
    </div>
  );
}
```

### 📊 用語解説

- **Draw Calls**: GPUに描画命令を送る回数（少ないほど高性能）
- **Triangles**: 3D描画で使用する三角形の数
- **Textures**: 3Dオブジェクトに貼り付ける画像の数
- **Geometries**: 3D形状データの数

### 2. メモリ使用量の監視

```typescript
// ✅ メモリ使用量の監視
function useMemoryMonitor(): MemoryInfo {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo>();

  useEffect(() => {
    const interval = setInterval(() => {
      if (performance.memory) {
        setMemoryInfo({
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}
```

### 💾 用語解説

- **JS Heap**: JavaScriptオブジェクトが使用するメモリ領域
- **Heap Size Limit**: ブラウザが使用できる最大メモリ量
- **Memory Monitor**: メモリ使用量を継続的に監視する仕組み

## 🚫 過度な最適化の問題

### 1. 不要な最適化の例

```typescript
// ❌ 不要な最適化
function SimpleTopicRow({ topicName }: { topicName: string }) {
  // 文字列なので、useMemo は不要
  const memoizedTopicName = useMemo(() => topicName, [topicName]);

  // 単純な関数に useCallback は不要
  const handleClick = useCallback(() => {
    console.log("clicked", topicName);
  }, [topicName]);

  return <div onClick={handleClick}>{memoizedTopicName}</div>;
}
```

### 2. 最適化の判断基準

```typescript
// ✅ 最適化すべき場合
function PointCloudRenderer({ pointClouds }: { pointClouds: PointCloud[] }) {
  // 重い3D処理 → useMemo を使用
  const geometries = useMemo(() => {
    return pointClouds.map(cloud => {
      // 数万〜数百万の点を処理（重い計算）
      return createGeometry(cloud.points);
    });
  }, [pointClouds]);

  // 大量のオブジェクト → useCallback を使用
  const handlePointClick = useCallback((pointId: string) => {
    // イベントハンドラー
  }, []);

  return (
    <Canvas>
      {geometries.map((geometry, index) => (
        <mesh
          key={index}
          geometry={geometry}
          onClick={() => handlePointClick(index.toString())}
        />
      ))}
    </Canvas>
  );
}
```

**最適化の判断基準**

1. **データサイズ**: 大量のPoint Cloud、Image、Sensor Data
2. **計算の複雑さ**: 3D変換、メッセージ変換、統計計算
3. **更新頻度**: 30-60Hzのリアルタイムデータ
4. **子コンポーネント数**: 数千のトピック、パネル

## 🎯 まとめ

### lichtblick特有の最適化のポイント

1. **ROSメッセージ処理**: 変換処理のメモ化とキャッシング
2. **3D Rendering**: Point Cloudの効率的な処理
3. **大量データ**: 仮想化とBlock Loading
4. **リアルタイム性**: 適切なメモ化で60fps維持
5. **メモリ管理**: 不要なオブジェクトの削除とキャッシュ管理

### 実践チェックリスト

- [ ] 3D renderingでのGeometry生成をメモ化
- [ ] ROSメッセージ変換処理をキャッシュ
- [ ] 大量のトピックリストを仮想化
- [ ] メッセージサイズの推定を実装
- [ ] メモリ使用量を継続的に監視
- [ ] Draw Callsとtriangle数を最適化
- [ ] 不要な再レンダリングを排除

**…まあ、** これくらいちゃんと理解しておけば、robotics特有の重い処理でも効率的にできるはずよ。アンタたちのプロジェクトの場合、特に3D renderingとメッセージ処理が重要だから、そこをしっかり最適化しなさい！

べ、別にアンタたちのために頑張って書いたわけじゃないんだからね！ プロジェクトの品質が落ちるのが嫌なだけよ！
