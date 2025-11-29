# パフォーマンス最適化ガイド

このガイドは、lichtblickのロボティクス可視化ツールにおけるパフォーマンス最適化について説明します。**新しいチームメンバーに向けて、技術用語の詳細な説明と実際のコード例を含めています。**

## 📋 目次

1. [よくあるパフォーマンス問題](#よくあるパフォーマンス問題)
2. [技術用語の説明](#技術用語の説明)
3. [最適化戦略](#最適化戦略)
4. [実装例](#実装例)
5. [パフォーマンス測定](#パフォーマンス測定)
6. [最適化チェックリスト](#最適化チェックリスト)

---

## よくあるパフォーマンス問題

### 🎯 **3Dレンダリングの重い処理**

**問題**: 大量のポイントクラウドデータ（数百万点）の描画でフレームレートが低下
**影響**: 可視化がカクつき、リアルタイム性が失われる

### 🎯 **ROSメッセージ処理の遅延**

**問題**: 大量のROSメッセージの連続処理でメモリ使用量が増加
**影響**: アプリケーションの応答性が低下し、メモリリークが発生

### 🎯 **トピック一覧の表示遅延**

**問題**: 数千のトピックを含むリストの表示が重い
**影響**: UIが固まり、ユーザー体験が悪化

---

## 技術用語の説明

### 🔵 **ROS（Robot Operating System）関連**

**ROSメッセージ**: ロボット間で送信されるデータパケット

- 例：センサーデータ、制御コマンド、位置情報など
- 構造化されたデータ形式（位置、速度、画像など）

**ROSトピック**: メッセージが発行される「チャンネル」

- 例：`/odom`（オドメトリ），`/camera/image`（カメラ画像），`/cmd_vel`（速度コマンド）
- 複数のノードが同じトピックを購読可能

**ROSスキーマ**: メッセージの型定義

- 例：`geometry_msgs/PoseStamped`（位置情報），`sensor_msgs/PointCloud2`（点群データ）
- メッセージの構造とフィールド名を定義

### 🔵 **3Dレンダリング関連**

**ポイントクラウド**: 3D空間の点群データ

- 例：LiDARセンサーからの距離測定点（通常数十万〜数百万点）
- 各点は位置（x,y,z）と色情報を持つ

**ジオメトリ**: 3Dオブジェクトの形状データ

- 例：メッシュ、線、点群など
- THREE.jsでレンダリングされる基本単位

**マテリアル**: 3Dオブジェクトの表面特性

- 例：色、透明度、シェーダー設定
- レンダリング時の見た目を決定

**メッシュ**: 頂点と面で構成される3Dモデル

- 例：ロボットの外観、建物の3Dモデル
- 複雑な形状を表現するためのポリゴン集合

**キャンバス**: 3D描画が行われるHTML要素

- WebGLコンテキストでGPUレンダリングを実行
- フレームレートとパフォーマンスに直結

### 🔵 **パフォーマンス関連**

**仮想化**: 大量データの効率的な表示手法

- 例：10,000個のトピックのうち、画面に見える50個のみを描画
- メモリ使用量とレンダリング時間を大幅削減

**ブロックローディング**: データを小さなブロックに分割して読み込む手法

- 例：1GBのログファイルを100MBずつのブロックに分割
- メモリ効率とシーク性能の向上

**キャッシュ**: 頻繁にアクセスされるデータの一時保存

- 例：デシリアライズ済みのROSメッセージ
- 計算コストの削減とレスポンス向上

---

## 最適化戦略

### 🚀 **1. 3Dレンダリング最適化**

#### **ポイントクラウドの最適化**

- **問題**: 数百万点の描画による重い処理
- **解決策**:
  - 点の間引き（LOD: Level of Detail）
  - 視錐体カリング（画面外の点を除外）
  - 距離ベースの点サイズ調整

#### **ジオメトリの最適化**

- **問題**: 複雑なメッシュによる描画負荷
- **解決策**:
  - 動的ジオメトリバッファの使用
  - 不要なジオメトリの解放
  - BufferGeometryの効率的な更新

#### **マテリアルの最適化**

- **問題**: 多数のマテリアルによるドローコール増加
- **解決策**:
  - マテリアルの共有
  - シェーダーの最適化
  - 透明度の適切な管理

### 🚀 **2. ROSメッセージ処理最適化**

#### **デシリアライゼーションの最適化**

- **問題**: 大量メッセージの変換処理
- **解決策**:
  - メッセージサイズの事前推定
  - デシリアライゼーション結果のキャッシュ
  - 並列処理の活用

#### **メモリ使用量の最適化**

- **問題**: メッセージ蓄積によるメモリリーク
- **解決策**:
  - 定期的なメモリ解放
  - メッセージプールの使用
  - 参照カウントの管理

### 🚀 **3. UI表示最適化**

#### **仮想化リストの使用**

- **問題**: 大量のトピック表示による重い処理
- **解決策**:
  - react-windowによる仮想化
  - 可変行高の効率的な管理
  - スクロール性能の向上

#### **検索機能の最適化**

- **問題**: リアルタイム検索による重い処理
- **解決策**:
  - デバウンス処理（50ms）
  - FZFによる高速ファジー検索
  - 結果のメモ化

---

## 実装例

### 🔧 **例1: ポイントクラウドのメモリ最適化**

**Before（悪い例）**:

```typescript
// 毎回新しいバッファを作成
function updatePointCloud(points: Float32Array) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  // メモリリークの原因
}
```

**After（良い例）**:

```typescript
// 既存のバッファを再利用
function updatePointCloud(points: Float32Array) {
  const positionAttribute = this.geometry.attributes.position;
  if (positionAttribute.count < points.length / 3) {
    // 必要な時のみリサイズ
    this.geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  } else {
    // 既存バッファを更新
    positionAttribute.array.set(points);
    positionAttribute.needsUpdate = true;
  }
}
```

### 🔧 **例2: ROSメッセージサイズ推定の最適化**

**実際のコード** (`packages/suite-base/src/players/IterablePlayer/rosdb3/RosDb3IterableSource.ts`):

```typescript
// メッセージサイズをキャッシュして計算コストを削減
let msgSizeEstimate = this.#messageSizeEstimateByTopic[msg.topic.name];
if (msgSizeEstimate == undefined) {
  msgSizeEstimate = estimateObjectSize(msg.value);
  this.#messageSizeEstimateByTopic[msg.topic.name] = msgSizeEstimate;
}
```

**処理内容**:

1. **トピック名でサイズ推定をキャッシュ**
2. **初回計算時のみ`estimateObjectSize`を実行**
3. **同じトピックの後続メッセージではキャッシュを使用**

### 🔧 **例3: 仮想化リストの最適化**

**実際のコード** (`packages/suite-base/src/components/TopicList/TopicList.tsx`):

```typescript
// 可変行高の仮想化リスト
<VariableSizeList
  itemCount={treeItems.length}
  itemSize={(index) => (treeItems[index]?.type === "topic" ? 50 : 28)}
  overscanCount={10}  // 画面外の描画数を制限
>
  {renderRow}
</VariableSizeList>
```

**最適化のポイント**:

1. **トピック行: 50px，メッセージパス行: 28px**
2. **overscanCount=10で画面外の描画を制限**
3. **メモ化による不要な再描画防止**

### 🔧 **例4: ブロックローディングシステム**

**実際のコード** (`packages/suite-base/src/players/IterablePlayer/IterablePlayer.ts`):

```typescript
// 1GB制限のキャッシュシステム
const DEFAULT_CACHE_SIZE_BYTES = 1.0e9;

// ブロックサイズが制限を超えた場合の処理
if (block.size >= this.#maxBlockSizeBytes) {
  readHead = add(block.end, { sec: 0, nsec: 1 });
  block = undefined; // 新しいブロックを作成
}
```

**処理内容**:

1. **1GBのメモリ制限でキャッシュ管理**
2. **ブロックサイズ超過時の自動分割**
3. **最終アクセス時刻によるLRU削除**

### 🔧 **例5: 3D描画パフォーマンス最適化**

**実際のコード** (`packages/suite-base/src/panels/ThreeDeeRender/renderables/PointClouds.ts`):

```typescript
// ポイントクラウドの効率的な更新
#updatePointCloudBuffers(
  pointCloud: PointCloud,
  pointCount: number,
  positionAttribute: THREE.BufferAttribute,
  colorAttribute: THREE.BufferAttribute,
): void {
  // 位置属性の更新
  for (let i = 0; i < pointCount; i++) {
    const pointOffset = i * pointStep;
    const x = xReader(view, pointOffset);
    const y = yReader(view, pointOffset);
    const z = zReader(view, pointOffset);
    positionAttribute.setXYZ(i, x, y, z);
  }

  // 色属性の更新
  for (let i = 0; i < pointCount; i++) {
    const pointOffset = i * pointStep;
    const colorValue = packedColorReader(view, pointOffset);
    colorConverter(tempColor, colorValue);
    colorAttribute.setXYZW(i, tempColor.r, tempColor.g, tempColor.b, tempColor.a);
  }

  // 更新フラグの設定
  positionAttribute.needsUpdate = true;
  colorAttribute.needsUpdate = true;
}
```

**最適化のポイント**:

1. **BufferAttributeの直接更新**
2. **一時オブジェクトの再利用**
3. **必要な時のみの更新フラグ設定**

### 🔧 **例6: トピック統計の効率的な更新**

**実際のコード** (`packages/suite-base/src/components/DirectTopicStatsUpdater.tsx`):

```typescript
// 6秒間隔での統計更新
<DirectTopicStatsUpdater interval={6} />

// MutationObserverによる効率的な更新
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement && node.querySelector("[data-topic]")) {
        updateStats();
        return;
      }
    }
  }
});
```

**最適化のポイント**:

1. **6秒間隔での定期更新**
2. **MutationObserverによる変更検知**
3. **無限ループの回避**

---

## パフォーマンス測定

### 📊 **3Dレンダリングメトリクス**

**重要な指標**:

- **フレームレート**: 30-60 FPS を維持
- **ドローコール数**: 可能な限り少なく
- **三角形数**: 画面解像度に応じて調整
- **テクスチャメモリ**: GPUメモリ使用量の監視

**測定方法**:

```typescript
// フレームレート測定
const stats = new Stats();
stats.showPanel(0); // FPS
document.body.appendChild(stats.dom);

// 描画情報の取得
const info = renderer.info;
console.log(`Draw calls: ${info.render.calls}`);
console.log(`Triangles: ${info.render.triangles}`);
console.log(`Textures: ${info.memory.textures}`);
console.log(`Geometries: ${info.memory.geometries}`);
```

### 📊 **メモリ使用量の監視**

**JSヒープメモリ**:

```typescript
// メモリ使用量の取得
const memInfo = (performance as any).memory;
console.log(`Used: ${memInfo.usedJSHeapSize / 1024 / 1024} MB`);
console.log(`Total: ${memInfo.totalJSHeapSize / 1024 / 1024} MB`);
console.log(`Limit: ${memInfo.jsHeapSizeLimit / 1024 / 1024} MB`);
```

**メモリリークの検出**:

```typescript
// 定期的なメモリ監視
setInterval(() => {
  const memInfo = (performance as any).memory;
  const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
  if (usedMB > 500) {
    // 500MB以上で警告
    console.warn(`High memory usage: ${usedMB}MB`);
  }
}, 10000);
```

### 📊 **ROSメッセージ処理の測定**

**メッセージ処理速度**:

```typescript
// メッセージ処理時間の測定
const startTime = performance.now();
const deserializedMessage = messageReader.readMessage(bytes);
const endTime = performance.now();
console.log(`Deserialization time: ${endTime - startTime}ms`);
```

**メッセージサイズ分析**:

```typescript
// メッセージサイズの分析
const sizeStats = new Map<string, { count: number; totalSize: number }>();
// ...メッセージ処理時に統計を更新
sizeStats.set(topic, {
  count: stats.count + 1,
  totalSize: stats.totalSize + sizeInBytes,
});
```

---

## 最適化チェックリスト

### ✅ **3Dレンダリング**

- [ ] ポイントクラウドの点数制限（100万点以下）
- [ ] 距離ベースのLOD（Level of Detail）
- [ ] 視錐体カリング（frustum culling）
- [ ] マテリアルの共有
- [ ] ジオメトリの適切な解放
- [ ] BufferGeometryの効率的な更新
- [ ] シェーダーの最適化
- [ ] 透明度の適切な管理

### ✅ **ROSメッセージ処理**

- [ ] メッセージサイズの事前推定
- [ ] デシリアライゼーション結果のキャッシュ
- [ ] メモリプールの使用
- [ ] 定期的なメモリ解放
- [ ] 並列処理の活用
- [ ] バッファサイズの最適化

### ✅ **UI表示**

- [ ] 大量データの仮想化
- [ ] デバウンス処理（50ms）
- [ ] 検索結果のメモ化
- [ ] 不要な再描画の防止
- [ ] スクロール性能の最適化
- [ ] 遅延読み込み（lazy loading）

### ✅ **メモリ管理**

- [ ] 1GBキャッシュ制限の遵守
- [ ] LRU（Least Recently Used）アルゴリズム
- [ ] 定期的なガベージコレクション
- [ ] 循環参照の回避
- [ ] イベントリスナーの適切な解除
- [ ] タイマーの適切なクリア

### ✅ **パフォーマンス監視**

- [ ] フレームレート監視（30-60 FPS）
- [ ] メモリ使用量監視（500MB以下）
- [ ] ドローコール数監視
- [ ] メッセージ処理時間監視
- [ ] ネットワーク帯域使用量監視
- [ ] CPU使用率監視

---

## 🎯 **まとめ**

lichtblickのパフォーマンス最適化は、**リアルタイム性**と**大量データ処理**の両立が鍵です。

**重要なポイント**:

1. **3Dレンダリング**: ポイントクラウドと3D描画の最適化
2. **ROSメッセージ**: 効率的な処理とメモリ管理
3. **UI表示**: 仮想化による大量データの高速表示
4. **メモリ管理**: 1GBキャッシュ制限とLRU戦略
5. **監視**: 継続的なパフォーマンス測定

これらの最適化により、**数百万点のポイントクラウド**と**数千のROSトピック**を含む複雑なロボティクスデータを、リアルタイムで滑らかに可視化できます。

---

_📝 新しいチームメンバーの皆さん、質問がありましたらお気軽にお聞きください。一緒に高性能なロボティクス可視化ツールを作りましょう！_
