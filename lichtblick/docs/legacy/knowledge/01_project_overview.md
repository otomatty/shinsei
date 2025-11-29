# 1. プロジェクト概要

## 🎯 Lichtblickとは

**Lichtblick** は BMW AG が開発するロボティクス可視化・診断ツールです。元々は Foxglove Studio というオープンソースプロジェクトのフォークとして開始されました。

### 📋 基本情報

- **開発元**: BMW AG
- **ライセンス**: MPL-2.0 (Mozilla Public License 2.0)
- **目的**: ロボットデータの可視化と診断
- **対象**: ROSベースのロボティクスシステム

### 🤔 よくある質問 - プロジェクトの基本

<details>
<summary><strong>Q: ロボットデータとは何ですか？</strong></summary>

**A: ロボットが動作中に生成する様々なデータのことです。**

具体的には以下のようなデータが含まれます：

- **センサーデータ**: 温度、湿度、距離、加速度などの数値データ
- **位置・姿勢データ**: ロボットの3D空間での位置と向き
- **画像データ**: カメラから取得した映像
- **点群データ**: LiDAR（レーザー測距）で取得した3D点の集合
- **状態データ**: ロボットの動作状態（停止、移動、充電中など）

**実際の例**:

```typescript
// 温度センサーデータの例
{
  topic: "/sensors/temperature",
  message: {
    temperature: 25.4,
    humidity: 60.2,
    timestamp: "2024-01-01T10:00:00Z"
  }
}

// 位置データの例
{
  topic: "/robot/pose",
  message: {
    position: { x: 1.2, y: 2.3, z: 0.0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 }
  }
}
```

**参考ファイル**: `packages/suite-base/src/panels/` 内の各パネルで実際の使用例を確認できます。

</details>

<details>
<summary><strong>Q: ROSとは何ですか？</strong></summary>

**A: Robot Operating System の略で、ロボット開発用のフレームワークです。**

ROSは実際のOSではなく、ロボット開発を効率化するためのツール群です：

- **メッセージ通信**: ロボットの各部品間でデータをやり取り
- **ノード**: 独立した処理単位（センサー読み込み、制御など）
- **トピック**: データの配信チャンネル（例: `/camera/image`）
- **分散処理**: 複数のコンピューターでロボットシステムを構築

**Web開発との比較**:

- **ROS**: ロボット開発 = **React**: Web開発
- **トピック**: データ配信 = **API**: データ取得
- **ノード**: 処理単位 = **コンポーネント**: UI部品

**実際の使用例**:

```typescript
// packages/suite-base/src/players/Ros1Player.ts
export default class Ros1Player implements Player {
  #rosNode?: RosNode; // ROS ノードのインスタンス
  #providerDatatypes: RosDatatypes = new Map(); // ROS データ型
}
```

**参考ファイル**: `packages/suite-base/src/players/Ros1Player.ts` で詳細な実装を確認できます。

</details>

<details>
<summary><strong>Q: ROS1とROS2の違いは何ですか？</strong></summary>

**A: 通信方式とアーキテクチャが大きく異なります。**

| 項目                 | ROS1                 | ROS2                            |
| -------------------- | -------------------- | ------------------------------- |
| **通信方式**         | XML-RPC + TCP/UDP    | DDS (Data Distribution Service) |
| **リアルタイム性**   | 限定的               | 高リアルタイム対応              |
| **セキュリティ**     | 基本的なセキュリティ | 暗号化・認証対応                |
| **プラットフォーム** | 主にLinux            | Windows、macOS、Linux           |
| **言語サポート**     | C++、Python中心      | C++、Python、JavaScript等       |

**なぜ2つのバージョンがあるの？**

- **ROS1**: 2007年から開発、研究用途中心
- **ROS2**: 2017年から開発、商用・産業用途対応

**Lichtblickでの対応状況**:

```typescript
// ROS1対応
packages / suite - base / src / players / Ros1Player.ts;
packages / suite - base / src / dataSources / Ros1SocketDataSourceFactory.ts;

// ROS2対応
packages / suite - base / src / players / Ros2Player.ts(実装中);
```

**参考ファイル**: `packages/suite-base/src/players/` ディレクトリで両方の実装を確認できます。

</details>

<details>
<summary><strong>Q: MCAPとは何ですか？</strong></summary>

**A: Message Capture and Processing の略で、新しいロボットデータファイル形式です。**

**従来の問題点**:

- **ROS bag**: 古い形式、大容量データで性能低下
- **検索が遅い**: データを探すのに時間がかかる
- **圧縮未対応**: ファイルサイズが大きい

**MCAPの利点**:

- **高速**: インデックス機能で素早い検索
- **大容量対応**: 数GB〜数TBのデータも高速処理
- **圧縮対応**: ファイルサイズを大幅削減
- **自己記述**: スキーマ情報をファイル内に保存

**ファイル形式の比較**:

```
従来のROS bag:
[Header][Messages][Messages][Messages]... (順次アクセス)

MCAP:
[Header][Schema][Index][Compressed Data Chunks] (ランダムアクセス)
```

**実際の使用例**:

```typescript
// packages/mcap-support/src/index.ts
export function parseChannel(channel: McapChannel): ParsedChannel {
  // MCAPチャンネルの解析処理
}
```

**参考ファイル**: `packages/mcap-support/src/` ディレクトリで詳細な実装を確認できます。

</details>

<details>
<summary><strong>Q: Foxglove Studioとの関係は？</strong></summary>

**A: Lichtblickは、Foxglove Studioをベースに BMW が開発したプロジェクトです。**

**歴史と関係**:

- **Foxglove Studio**: 2021年に開発開始されたオープンソースプロジェクト
- **Lichtblick**: 2023年に BMW が Foxglove Studio をフォークして開発開始
- **目的**: BMW 独自の要件に合わせたカスタマイズ

**主な違い**:

- **ブランディング**: BMW 独自のデザインとロゴ
- **機能拡張**: BMW 特有の機能追加
- **サポート**: BMW による商用サポート

**コードベースの関係**:

- 基本的なアーキテクチャは Foxglove Studio と同じ
- `@foxglove` パッケージを一部利用
- BMW 独自の `@lichtblick` パッケージを追加

**参考ファイル**: `lichtblick-foxglove-packages-documentation.md` で詳細な関係を確認できます。

</details>

### 🏗️ 主な特徴

#### **マルチプラットフォーム対応**

- **デスクトップアプリ**: Electron を使用した Windows、macOS、Linux 対応
- **Webアプリ**: ブラウザで動作する版も提供

**参考ファイル**:

- デスクトップ版: `packages/suite-desktop/src/main/index.ts` (17行目〜)
- Web版: `packages/suite-web/src/index.tsx` (15行目〜)

#### **多様なデータ形式対応**

- **MCAP ファイル**: 新しいロボットデータ形式
- **ROS bag ファイル**: 従来のROSデータ形式
- **ライブデータ**: リアルタイムでのロボットデータ

> 📖 **詳細解説**: データ形式の詳細については **[データ形式解説](./08_data_formats_mcap_ros.md)** を参照してください

**参考ファイル**:

- MCAP対応: `packages/mcap-support/src/index.ts` (1行目〜)
- ROS bag対応: `packages/suite-base/src/players/RosbagPlayer.ts` (82行目〜)

#### **リアルタイム可視化**

- **3D可視化**: ロボット、センサーデータ、地図の3D表示
- **時系列グラフ**: センサーデータの時系列可視化
- **画像表示**: カメラ映像の表示
- **データテーブル**: 構造化データの表示

### 🤔 よくある質問 - 可視化機能

<details>
<summary><strong>Q: 3D可視化って具体的にどんなものですか？</strong></summary>

**A: ロボットやセンサーデータを3次元空間で表示する機能です。**

**表示できるもの**:

- **ロボット本体**: 3Dモデルでロボットの形状と位置を表示
- **センサーデータ**:
  - 点群（LiDAR）: 3D空間の点の集合
  - カメラ画像: 3D空間に配置した画像
  - レーザースキャン: 2D/3D レーザー測距結果
- **地図**: 占有グリッドマップ（どこに障害物があるか）
- **軌跡**: ロボットの移動経路

**Web開発との比較**:

- **2D表示**: 通常のWebサイト（HTML/CSS）
- **3D表示**: WebGL（Three.js）を使用したゲームや3Dアプリ

**実際の使用例**:

```typescript
// packages/suite-base/src/panels/ThreeDeeRender/index.tsx
// 3D空間でロボットの位置を表示
function updateRobotPosition(pose: RobotPose) {
  robotMesh.position.set(pose.x, pose.y, pose.z);
  robotMesh.quaternion.set(pose.qx, pose.qy, pose.qz, pose.qw);
}
```

**参考ファイル**: `packages/suite-base/src/panels/ThreeDeeRender/` ディレクトリで詳細な実装を確認できます。

</details>

<details>
<summary><strong>Q: 時系列データって何ですか？</strong></summary>

**A: 時間の経過とともに変化するデータのことです。**

**身近な例**:

- **株価**: 時間とともに変化する価格
- **天気**: 時間とともに変化する温度・湿度
- **心拍数**: 時間とともに変化する心拍数

**ロボットの時系列データ例**:

```typescript
// 温度センサーの時系列データ
[
  { time: "10:00:00", temperature: 25.1 },
  { time: "10:00:01", temperature: 25.2 },
  { time: "10:00:02", temperature: 25.0 },
  { time: "10:00:03", temperature: 24.9 },
][
  // ロボット位置の時系列データ
  ({ time: "10:00:00", x: 1.0, y: 2.0 },
  { time: "10:00:01", x: 1.1, y: 2.1 },
  { time: "10:00:02", x: 1.2, y: 2.2 })
];
```

**時系列グラフの表示**:

- **X軸**: 時間
- **Y軸**: センサーの値
- **線グラフ**: 時間変化を視覚的に表示

**参考ファイル**: `packages/suite-base/src/panels/Plot/index.tsx` で時系列グラフの実装を確認できます。

</details>

<details>
<summary><strong>Q: Topicって何ですか？</strong></summary>

**A: ROSにおけるデータの配信チャンネルです。**

**分かりやすい例**:

- **YouTube**: 様々なチャンネル（料理、ゲーム、音楽など）
- **ROS Topic**: 様々なデータチャンネル（カメラ、センサー、位置など）

**Topic の命名規則**:

```
/[ロボット名]/[センサー種類]/[データ種類]

例:
/robot1/camera/image_raw    - ロボット1のカメラ生画像
/robot1/lidar/scan          - ロボット1のLiDARスキャン
/robot1/sensors/temperature - ロボット1の温度センサー
```

**実際の使用例**:

```typescript
// packages/suite-base/src/players/RosbridgePlayer.ts
public setSubscriptions(subscriptions: SubscribePayload[]): void {
  // 利用可能なトピックをフィルタリング
  const topicNames = subscriptions
    .map(({ topic }) => topic)
    .filter((topicName) => availableTopicsByTopicName[topicName]);
}
```

**Web開発との比較**:

- **ROS Topic**: データ配信チャンネル
- **API エンドポイント**: データ取得URL
- **WebSocket**: リアルタイム通信

**参考ファイル**: `packages/suite-base/src/components/MessagePipeline/subscriptions.ts` で詳細な実装を確認できます。

</details>

**参考ファイル**:

- 3D可視化: `packages/suite-base/src/panels/ThreeDeeRender/index.tsx` (1行目〜)
- 時系列グラフ: `packages/suite-base/src/panels/Plot/index.tsx` (1行目〜)

## 🛠️ 技術スタック

### **フロントエンド**

- **React**: UIライブラリ
- **TypeScript**: 型安全な開発
- **Material-UI**: UIコンポーネント
- **Three.js**: 3D可視化

### 🤔 よくある質問 - 技術スタック

<details>
<summary><strong>Q: Playerって何ですか？</strong></summary>

**A: データソースを統一的に扱うためのインターフェースです。**

**役割**:

- **データ読み込み**: ファイルやネットワークからデータを取得
- **再生制御**: データの再生、一時停止、シーク
- **データ変換**: 様々な形式のデータを統一形式に変換

**Player の種類**:

```typescript
// 各データソース用のPlayer
Ros1Player; // ROS1ライブ接続
RosbridgePlayer; // ROSブリッジ接続
McapPlayer; // MCAPファイル
RosbagPlayer; // ROS bagファイル
```

**音楽プレイヤーとの比較**:

- **音楽プレイヤー**: MP3、WAV、FLACなど様々な形式を再生
- **Lichtblick Player**: MCAP、ROS bag、ライブデータなど様々な形式を処理

**実際の使用例**:

```typescript
// packages/suite-base/src/players/Ros1Player.ts
export default class Ros1Player implements Player {
  #rosNode?: RosNode; // ROS ノードのインスタンス

  public setSubscriptions(subscriptions: SubscribePayload[]): void {
    // データの購読設定
  }

  public seekPlayback(time: Time): void {
    // 特定時刻へのシーク
  }
}
```

**参考ファイル**: `packages/suite-base/src/players/types.ts` で Player インターフェースを確認できます。

</details>

<details>
<summary><strong>Q: MessagePipelineって何ですか？</strong></summary>

**A: データの流れを管理する中央管制システムです。**

**役割**:

- **データ配信**: Player から Panel へデータを配信
- **購読管理**: どのパネルがどのデータを必要とするか管理
- **状態管理**: 再生状態、時刻、データの利用可能性を管理

**工場の生産ラインとの比較**:

- **原材料**: ロボットデータ（Player）
- **生産ライン**: MessagePipeline
- **製品**: 可視化されたデータ（Panel）

**データフロー**:

```
Player → MessagePipeline → Panel
  ↓           ↓              ↓
データ読込  → 配信・管理  → 可視化
```

**実際の使用例**:

```typescript
// packages/suite-base/src/components/MessagePipeline/index.tsx
export function MessagePipeline({ children }: Props): JSX.Element {
  // データの購読と配信を管理
  const subscriptions = useSubscriptions();
  const playerState = usePlayerState();

  return (
    <MessagePipelineContext.Provider value={contextValue}>
      {children}
    </MessagePipelineContext.Provider>
  );
}
```

**参考ファイル**: `packages/suite-base/src/components/MessagePipeline/types.ts` で詳細な型定義を確認できます。

</details>

<details>
<summary><strong>Q: Panelって何ですか？</strong></summary>

**A: データを可視化するためのUIコンポーネントです。**

**Panel の種類**:

- **3D Panel**: 3D空間でロボットやセンサーデータを表示
- **Plot Panel**: 時系列データをグラフで表示
- **Image Panel**: カメラ映像を表示
- **Table Panel**: データをテーブル形式で表示

**Webアプリのコンポーネントとの比較**:

- **React Component**: 汎用的なUIパーツ
- **Lichtblick Panel**: ロボットデータ専用の可視化コンポーネント

**Panel の構成**:

```typescript
function MyPanel(props: PanelProps<MyConfig>): JSX.Element {
  const { config, saveConfig } = props;

  // データの購読
  const messages = useMessagesByTopic({
    topics: [{ topic: config.topic }]
  });

  // 描画処理
  return (
    <div>
      {/* データの可視化 */}
    </div>
  );
}

// Panelとして登録
export default Panel(
  Object.assign(MyPanel, {
    panelType: "MyPanel",
    defaultConfig: { topic: "/sensor/data" }
  })
);
```

**参考ファイル**: `packages/suite-base/src/panels/` ディレクトリで様々なPanel実装を確認できます。

</details>

**参考ファイル**:

- React設定: `packages/suite-base/src/components/App.tsx` (1行目〜)
- TypeScript設定: `tsconfig.json` (1行目〜)

### **ビルドシステム**

- **Webpack**: バンドラー
- **Babel**: JavaScript変換
- **ESLint**: コード品質チェック
- **Jest**: テストフレームワーク

**参考ファイル**:

- Webpack設定: `webpack.config.js` (1行目〜)
- Babel設定: `babel.config.json` (1行目〜)

### **データ処理**

- **MessagePipeline**: データフローの中核
- **Player**: データソースの抽象化
- **Panel**: 可視化コンポーネント

**参考ファイル**:

- MessagePipeline: `packages/suite-base/src/components/MessagePipeline/index.tsx` (1行目〜)
- Player基底クラス: `packages/suite-base/src/players/types.ts` (1行目〜)

## 📁 プロジェクト構成

### **モノレポ構成**

```
lichtblick/
├── packages/
│   ├── suite-base/        # 中核機能
│   ├── suite-desktop/     # デスクトップ版
│   ├── suite-web/         # Web版
│   ├── mcap-support/      # MCAPファイル対応
│   └── den/               # 共通ユーティリティ
├── desktop/               # デスクトップアプリ設定
├── web/                   # Webアプリ設定
└── e2e/                   # E2Eテスト
```

### **主要パッケージ**

#### **suite-base**

中核機能を提供するメインパッケージ

**主要ディレクトリ**:

- `src/components/` - UIコンポーネント
- `src/panels/` - 可視化パネル
- `src/players/` - データソースハンドラー
- `src/hooks/` - カスタムReact Hook
- `src/providers/` - Contextプロバイダー

**参考ファイル**:

- メインエントリー: `packages/suite-base/src/index.ts` (1行目〜)
- アプリケーション: `packages/suite-base/src/components/App.tsx` (1行目〜)

#### **suite-desktop**

デスクトップアプリケーション固有の機能

**参考ファイル**:

- メインプロセス: `packages/suite-desktop/src/main/index.ts` (1行目〜)
- レンダラープロセス: `packages/suite-desktop/src/renderer/index.tsx` (1行目〜)

#### **suite-web**

Webアプリケーション固有の機能

**参考ファイル**:

- エントリーポイント: `packages/suite-web/src/index.tsx` (1行目〜)
- サービスワーカー: `packages/suite-web/src/services/` (1行目〜)

## 🔄 アプリケーションの起動フロー

### **デスクトップ版**

1. **メインプロセス起動**: `packages/suite-desktop/src/main/index.ts` (17行目〜)
2. **レンダラープロセス起動**: `packages/suite-desktop/src/renderer/index.tsx` (15行目〜)
3. **App コンポーネント初期化**: `packages/suite-base/src/components/App.tsx` (1行目〜)

### **Web版**

1. **エントリーポイント実行**: `packages/suite-web/src/index.tsx` (15行目〜)
2. **SharedRoot 初期化**: `packages/suite-web/src/SharedRoot.tsx` (1行目〜)
3. **StudioApp コンポーネント起動**: `packages/suite-base/src/components/StudioApp.tsx` (1行目〜)

## 🎯 開発の特徴

### **モジュラー設計**

- **パッケージ分離**: 機能ごとに独立したパッケージ
- **疎結合**: 依存関係の最小化
- **再利用性**: 共通機能の効率的な活用

### **型安全性**

- **TypeScript**: 全てのコードでTypeScriptを使用
- **厳密な型定義**: 実行時エラーの防止
- **インターフェース設計**: 明確な契約の定義

**参考ファイル**:

- 型定義: `packages/suite-base/src/types/` (ディレクトリ全体)
- Player型定義: `packages/suite-base/src/players/types.ts` (1行目〜)

### **パフォーマンス重視**

- **メモ化**: 不要な再計算の防止
- **仮想化**: 大量データの効率的な表示
- **Worker**: 重い処理のオフロード

**参考ファイル**:

- メモ化例: `packages/suite-base/src/components/MessagePipeline/subscriptions.ts` (70行目〜)
- Worker例: `packages/den/src/worker/ComlinkWrap.ts` (1行目〜)

## 🚀 次のステップ

この概要を理解したら、次は以下の章に進んでください：

1. **[基本的な専門用語](./02_basic_terminology.md)** - プロジェクトで使用される専門用語の詳細
2. **[データ形式解説](./08_data_formats_mcap_ros.md)** - MCAP・ROSデータ形式の詳細解説
3. **[アーキテクチャの基本概念](./03_architecture_concepts.md)** - 設計パターンの理解

---

**💡 学習のポイント**

- **実際のコードを確認**: 上記で紹介したファイルを実際に開いて確認してください
- **段階的な理解**: 一度に全て理解しようとせず、必要に応じて戻って復習
- **実践的な応用**: 概念を理解したら、実際のコードで確認してみてください
- **質問を活用**: 分からない用語があれば、上記のFAQを参考にしてください
