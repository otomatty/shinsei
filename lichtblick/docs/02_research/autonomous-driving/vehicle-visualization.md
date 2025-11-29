# Lichtblickプロジェクトで自動運転車を3D表示する方法

## 概要

Lichtblickは、ロボティクス用の統合可視化・診断ツールで、Three.jsベースの強力な3D可視化機能を提供します。このドキュメントでは、現在のプロジェクトで自動運転車を表示する方法について詳しく説明します。

## プロジェクトの技術スタック

### 基本構成
- **フロントエンド**: Next.js 15 + TypeScript + React
- **3D可視化**: Three.js
- **スタイリング**: Tailwind CSS + shadcn/ui
- **状態管理**: Jotai
- **パッケージマネージャー**: Yarn (現在)、Bunも対応予定

### アーキテクチャ
- **Monorepo構造**: packages/ディレクトリ内に複数のパッケージ
- **主要パッケージ**: `packages/suite-base/` (メインロジック)
- **3Dレンダリング**: `packages/suite-base/src/panels/ThreeDeeRender/`

## 3D可視化の実装方法

### 1. 基本的な3D要素の表示

Lichtblickでは、以下の3D要素を表示できます：

#### プリミティブ形状
- **Cubes** (立方体)
- **Spheres** (球)
- **Cylinders** (円柱)
- **Arrows** (矢印)
- **Lines** (線)
- **Triangles** (三角形)
- **Texts** (テキスト)

#### 複合データ
- **PointClouds** (点群データ)
- **Meshes** (メッシュモデル)
- **Images** (画像オーバーレイ)
- **LaserScans** (レーザースキャン)
- **OccupancyGrids** (占有グリッド)

### 2. 自動運転車の表示方法

#### 方法1: URDFモデルの使用

**URDFとは**：
- Unified Robot Description Format
- XMLベースのロボットモデル記述言語
- 物理構造、運動学、慣性特性、外観、衝突判定を定義

**実装例**：
```typescript
// packages/suite-base/src/panels/ThreeDeeRender/renderables/Urdfs.ts
// URDFファイルを読み込み、3Dモデルとして表示
```

**必要なファイル**：
- `robot.urdf` - ロボットの構造定義
- `meshes/` - 3Dメッシュファイル（STL, DAE, OBJ等）
- `materials/` - テクスチャファイル

#### 方法2: SceneEntityとModelPrimitiveの使用

**SceneEntityとは**：
- 3Dシーン内のエンティティを表す
- 複数のプリミティブを組み合わせて複雑な形状を作成可能

**実装例**：
```typescript
// packages/suite-base/src/panels/ThreeDeeRender/renderables/SceneEntities.ts
// SceneEntityを使って車両モデルを構築
```

**ModelPrimitiveの使用**：
```typescript
// packages/suite-base/src/panels/ThreeDeeRender/renderables/primitives/RenderableModels.ts
// 3Dモデルファイル（GLTF, OBJ等）を直接読み込み
```

### 3. 具体的な実装手順

#### ステップ1: 3Dモデルの準備

1. **車両の3Dモデルを用意**
   - 形式: URDF + STL/DAE、または単体の3Dモデル（GLB/GLTF推奨）
   - 配置: `packages/suite-base/src/assets/` または外部URL

2. **座標系の設定**
   - ROSの座標系に従う（X前方、Y左、Z上）
   - スケールの調整（メートル単位）

#### ステップ2: ThreeDeeRenderパネルの拡張

1. **新しいレンダラブルクラスの作成**
```typescript
// packages/suite-base/src/panels/ThreeDeeRender/renderables/AutonomousVehicle.ts
export class AutonomousVehicle extends Renderable {
  // 車両の3Dモデルを管理
  // 位置、回転、スケールを制御
  // センサーデータとの連携
}
```

2. **設定パネルの追加**
```typescript
// 車両の表示/非表示
// 色の変更
// 透明度の調整
// センサーデータの表示設定
```

#### ステップ3: データソースとの連携

1. **車両状態の取得**
```typescript
// 位置: geometry_msgs/PoseStamped
// 速度: geometry_msgs/TwistStamped
// 座標変換: tf2_msgs/TFMessage
```

2. **センサーデータの統合**
```typescript
// LiDAR: sensor_msgs/PointCloud2
// カメラ: sensor_msgs/Image
// IMU: sensor_msgs/Imu
// GPS: sensor_msgs/NavSatFix
```

### 4. 実際の使用例

#### Foxgloveの自動運転車可視化事例

**nuScenesデータセットの可視化**：
- 6台のカメラ画像
- LiDAR点群データ
- レーダーデータ
- GPS軌跡
- 3D境界ボックス
- 意味論的地図

**実装されている機能**：
- リアルタイム3D可視化
- 複数センサーの同期表示
- 軌跡の表示
- 障害物検知結果の表示
- 地図データの統合

## 推奨される実装アプローチ

### 1. 段階的な実装

**Phase 1: 基本的な車両表示**
- 単純な3D形状（立方体の組み合わせ）で車両を表現
- 位置・回転の制御
- 基本的な設定パネル

**Phase 2: 詳細なモデル**
- 実際の車両3Dモデルの読み込み
- URDF対応
- テクスチャ・マテリアルの適用

**Phase 3: センサー統合**
- LiDAR点群の表示
- カメラ画像のオーバーレイ
- センサーフュージョン結果の表示

### 2. 開発のベストプラクティス

**パフォーマンス最適化**：
- LOD（Level of Detail）の実装
- 不要な描画の削減
- Three.jsのインスタンス化の活用

**拡張性の確保**：
- 設定の永続化
- 複数車両の対応
- カスタムシェーダーの対応

**ユーザビリティ**：
- 直感的な操作
- 設定の簡単な変更
- リアルタイム更新

## 参考リソース

### 関連ファイル
- `packages/suite-base/src/panels/ThreeDeeRender/ThreeDeeRender.tsx` - メインコンポーネント
- `packages/suite-base/src/panels/ThreeDeeRender/renderables/Urdfs.ts` - URDFサポート
- `packages/suite-base/src/panels/ThreeDeeRender/renderables/primitives/RenderableModels.ts` - 3Dモデル表示
- `packages/suite-base/src/panels/ThreeDeeRender/SceneExtensionConfig.ts` - 拡張設定

### 外部リソース
- [Foxglove Examples](https://foxglove.dev/examples) - 実際の自動運転車データの可視化例
- [nuScenes Dataset](https://www.nuscenes.org/) - 自動運転車のデータセット
- [Three.js Documentation](https://threejs.org/docs/) - 3Dレンダリングライブラリ

### 学習リソース
- [URDF Tutorial](http://wiki.ros.org/urdf/Tutorials) - URDFの基本
- [ROS Coordinate Frames](http://wiki.ros.org/tf2) - 座標系の理解
- [Foxglove Blog](https://foxglove.dev/blog) - 実装事例

## 結論

Lichtblickプロジェクトは、自動運転車の3D可視化に必要な全ての基盤を提供しています。Three.jsベースの強力な3Dエンジン、豊富なプリミティブ、URDFサポート、そしてリアルタイムデータ処理機能により、高度な自動運転車の可視化が可能です。

段階的なアプローチで実装を進めることで、効率的かつ確実に自動運転車の3D表示機能を構築できます。
