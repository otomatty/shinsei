# Lichtblick 自動運転拡張機能 実装計画書

## 1. プロジェクト概要

### 目的

Lichtblickプラットフォーム上で動作する自動運転関連の拡張機能デモを開発し、実際の自動運転システムで使用可能な可視化ツールを提供する。

### 対象ユーザー

- 自動運転システム開発者
- テストエンジニア
- システムインテグレーター

### 成果物

1. 車両状態モニター拡張機能
2. 信号機認識パネル拡張機能
3. 障害物検知ビジュアライザー拡張機能

## 2. 技術スタック

### フレームワーク・ライブラリ

- **Lichtblick Suite SDK**: `@lichtblick/suite`
- **React**: 18.x (UI構築)
- **TypeScript**: 5.x (型安全性)
- **D3.js**: データビジュアライゼーション
- **Three.js**: 3D表示（障害物検知用）

### 開発ツール

- **create-lichtblick-extension**: プロジェクト生成
- **Webpack**: バンドル
- **ESLint/Prettier**: コード品質管理

## 3. 実装詳細設計

### 3.1 車両状態モニター (Vehicle Status Monitor)

#### 機能要件

- リアルタイム速度表示（アナログ/デジタル）
- エンジン回転数（RPM）ゲージ
- バッテリー残量インジケーター
- ギア状態表示
- ウィンカー/ハザード状態
- 警告灯表示

#### データ構造

```typescript
interface VehicleStatus {
  speed: number; // km/h
  rpm: number; // 回転数
  battery: number; // 0-100%
  gear: "P" | "R" | "N" | "D" | "S";
  turnSignal: "left" | "right" | "hazard" | "off";
  warnings: {
    engine: boolean;
    battery: boolean;
    temperature: boolean;
  };
  timestamp: number;
}
```

#### 購読トピック

- `/vehicle/status` - 統合車両状態
- `/vehicle/speed` - 速度情報
- `/vehicle/battery` - バッテリー状態
- `/vehicle/warnings` - 警告情報

#### UI設計

- ダークテーマベースの計器パネルデザイン
- SVGベースのゲージコンポーネント
- レスポンシブレイアウト

### 3.2 信号機認識パネル (Traffic Light Recognition Panel)

#### 機能要件

- 現在の信号状態表示（赤/黄/青/矢印）
- 認識信頼度メーター
- 信号までの距離表示
- 残り時間カウントダウン（利用可能な場合）
- 複数信号の同時表示
- 認識履歴

#### データ構造

```typescript
interface TrafficLight {
  id: string;
  state: "red" | "yellow" | "green" | "arrow_left" | "arrow_right" | "arrow_straight";
  confidence: number; // 0-1
  distance: number; // meters
  timeRemaining?: number; // seconds
  position: {
    x: number;
    y: number;
    z: number;
  };
  timestamp: number;
}

interface TrafficLightArray {
  lights: TrafficLight[];
  cameraId: string;
}
```

#### 購読トピック

- `/perception/traffic_lights` - 信号機認識結果
- `/perception/traffic_light_state` - 信号状態
- `/localization/distance_to_traffic_light` - 距離情報

#### UI設計

- 信号機のグラフィカル表現
- 信頼度バー表示
- 距離インジケーター
- タイムライン表示

### 3.3 障害物検知ビジュアライザー (Obstacle Detection Visualizer)

#### 機能要件

- 2D俯瞰図での障害物表示
- 3Dポイントクラウド表示（オプション）
- 障害物タイプ別の色分け
- 相対速度ベクトル表示
- 危険度に基づく警告
- トラッキングID表示

#### データ構造

```typescript
interface Obstacle {
  id: string;
  type: "car" | "pedestrian" | "bicycle" | "truck" | "unknown";
  position: {
    x: number;
    y: number;
    z: number;
  };
  velocity: {
    x: number;
    y: number;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  confidence: number;
  ttc?: number; // Time to collision
  timestamp: number;
}

interface ObstacleArray {
  obstacles: Obstacle[];
  sensorType: "lidar" | "radar" | "camera" | "fusion";
}
```

#### 購読トピック

- `/perception/obstacles` - 統合障害物情報
- `/lidar/detected_objects` - LiDAR検出結果
- `/radar/tracks` - レーダートラッキング
- `/perception/fusion_objects` - センサーフュージョン結果

#### UI設計

- Canvas/SVGベースの2D描画
- 車両中心の相対座標系
- ズーム/パン機能
- レンジ調整（10m, 30m, 50m, 100m）

## 4. 共通コンポーネント

### 4.1 設定管理

```typescript
interface CommonConfig {
  updateRate: number; // Hz
  theme: "dark" | "light" | "auto";
  units: "metric" | "imperial";
}
```

### 4.2 エラーハンドリング

- メッセージ欠落時の表示
- 無効なデータの処理
- 接続エラーの通知

### 4.3 パフォーマンス最適化

- React.memoによる再レンダリング制御
- requestAnimationFrameの使用
- データのダウンサンプリング

## 5. 実装スケジュール

### Week 1: 基盤構築

- Day 1-2: プロジェクトセットアップ、開発環境構築
- Day 3-4: 共通コンポーネント開発
- Day 5: 基本的なパネル登録とテスト

### Week 2: 車両状態モニター

- Day 1-2: UIコンポーネント実装
- Day 3-4: データ購読とリアルタイム更新
- Day 5: テストとデバッグ

### Week 3: 信号機認識パネル

- Day 1-2: UI設計と実装
- Day 3-4: データ処理ロジック
- Day 5: 統合テスト

### Week 4: 障害物検知ビジュアライザー

- Day 1-3: 2D描画エンジン実装
- Day 4-5: データ統合とテスト

### Week 5: 統合とリリース

- Day 1-2: 全体統合テスト
- Day 3-4: ドキュメント作成
- Day 5: パッケージングとリリース

## 6. テスト計画

### 6.1 単体テスト

- コンポーネントレベルのテスト
- データ変換ロジックのテスト
- エラーハンドリングのテスト

### 6.2 統合テスト

- Lichtblick環境での動作確認
- 複数パネルの同時動作
- パフォーマンステスト

### 6.3 モックデータ

- 各トピックのサンプルデータ生成
- エッジケースのシミュレーション
- ストレステスト用データ

## 7. デモシナリオ

### シナリオ1: 市街地走行

- 信号機の認識と状態変化
- 歩行者・自転車の検出
- 低速での車両制御

### シナリオ2: 高速道路走行

- 高速での車両追従
- 車線変更時の障害物検知
- 長距離走行でのバッテリー監視

### シナリオ3: 駐車場シナリオ

- 低速での精密な障害物検知
- ギア切り替えの監視
- 360度の障害物認識

## 8. 拡張可能性

### 将来の機能追加

- 車線検出表示
- 経路計画の可視化
- V2X通信状態
- 地図データ統合
- 予測軌道表示

### API設計

- プラグイン可能なデータソース
- カスタマイズ可能なUI要素
- 外部システムとの連携

## 9. リスクと対策

### 技術的リスク

- **リアルタイムパフォーマンス**: Web Workerの活用
- **大量データ処理**: データのフィルタリングとサンプリング
- **ブラウザ互換性**: ポリフィルの使用

### 運用リスク

- **データフォーマットの変更**: アダプターパターンの採用
- **Lichtblick APIの変更**: バージョン管理と互換性チェック

## 10. 成功指標

- 60FPSでの安定動作
- 100ms以下のレイテンシー
- メモリ使用量500MB以下
- 95%以上のメッセージ処理成功率

---

**作成日**: 2025年1月19日
**バージョン**: 1.0
**作成者**: Lichtblick Extension Development Team
