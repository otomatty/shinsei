# IterablePlayer 分割実装ガイド

## 概要

この文書では、`IterablePlayer.ts` をより保守しやすい複数のファイルに分割したリファクタリング実装について説明します。

## ファイル構成

### 1. 新しいファイル構造

```
packages/suite-base/src/players/IterablePlayer/
├── IterablePlayer.ts                    # オリジナル (既存)
├── IterablePlayerRefactored.ts          # リファクタリング版メインクラス
├── IterablePlayerTypes.ts               # 型定義とインターフェース
├── IterablePlayerStateMachine.ts        # 状態管理ロジック
├── IterablePlayerPlaybackController.ts  # 再生制御ロジック
├── IterablePlayerMessageHandler.ts      # メッセージ処理ロジック
└── IterablePlayerStateMachine.test.ts   # ユニットテスト例
```

### 2. 責務分離

| クラス                             | 責務                                     |
| ---------------------------------- | ---------------------------------------- |
| `IterablePlayerRefactored`         | 全体統合、Playerインターフェース実装     |
| `IterablePlayerStateMachine`       | 状態遷移とライフサイクル管理             |
| `IterablePlayerPlaybackController` | 再生制御（再生・一時停止・シーク・速度） |
| `IterablePlayerMessageHandler`     | メッセージ読み込みとバッファリング       |
| `IterablePlayerTypes`              | 共通型定義と定数                         |

## 主要な改善点

### 1. 状態管理の明確化

- 状態遷移ロジックが `IterablePlayerStateMachine` に集約
- 有効な状態遷移の明示的な定義
- イベントベースの状態変更通知

### 2. 再生制御の独立性

- 再生・一時停止・シーク・速度制御が分離
- タイミング計算ロジックの整理
- プレイバック状態の一元管理

### 3. メッセージ処理の最適化

- ティック処理とバックフィル処理の分離
- バッファリング状態の適切な管理
- パフォーマンス指標の取得機能

### 4. テスタビリティの向上

- 各コンポーネントの独立テストが可能
- モック化しやすいインターフェース設計
- 内部状態の観測可能性

## 使用例

### 基本的な使用方法

```typescript
import { IterablePlayerRefactored } from "./IterablePlayerRefactored";

// プレイヤー作成（オリジナルと同じインターフェース）
const player = new IterablePlayerRefactored({
  source: myDataSource,
  sourceId: "unique-source-id",
  enablePreload: true,
});

// 既存コードと同じ使用方法
player.setListener(async (state) => {
  // UI更新処理
});

player.setSubscriptions([{ topic: "/camera", preloadType: "full" }]);

player.startPlayback();
```

### コンポーネント別のテスト

```typescript
// 状態マシンの単体テスト
const stateMachine = new IterablePlayerStateMachine(mockState);
stateMachine.registerStateHandler("idle", mockHandler);
stateMachine.setState("idle");

// 再生制御の単体テスト
const controller = new IterablePlayerPlaybackController(mockState);
controller.setPlaybackSpeed(2.0);
expect(controller.getPlaybackInfo().speed).toBe(2.0);

// メッセージハンドラーの単体テスト
const handler = new IterablePlayerMessageHandler(mockState, mockSource);
await handler.readInitialMessages();
```

## 移行戦略

### 段階1: 並行開発

1. 既存の `IterablePlayer.ts` は維持
2. 新しい分割実装を並行して開発
3. 両方のバージョンでテストを実行

### 段階2: 段階的置き換え

1. 新機能は分割実装で実装
2. バグ修正時に分割実装への移行を検討
3. パフォーマンステストで動作を検証

### 段階3: 完全移行

1. すべてのテストが新実装でパス
2. パフォーマンス指標が同等以上
3. 既存実装を非推奨化し、最終的に削除

## パフォーマンス考慮事項

### 1. メモリ使用量

- 分割によるオーバーヘッドは最小限
- 各コンポーネントは必要最小限の状態のみ保持
- イベントリスナーの適切な管理

### 2. 実行速度

- 状態遷移のオーバーヘッドは無視できるレベル
- メッセージ処理のホットパスは最適化維持
- デバウンス処理は既存と同等

### 3. 拡張性

- 新しい状態の追加が容易
- 再生機能の拡張が明確
- メッセージ処理アルゴリズムの改善が独立

## トラブルシューティング

### よくある問題

#### 1. 状態遷移エラー

```typescript
// 無効な状態遷移を検出
if (!stateMachine.isValidTransition(currentState, newState)) {
  console.error(`Invalid transition: ${currentState} → ${newState}`);
}
```

#### 2. メッセージ配信の遅延

```typescript
// メッセージハンドラーの統計情報を確認
const stats = messageHandler.getMessageStats();
console.log(`Message count: ${stats.messageCount}, Buffering: ${stats.hasLastStamp}`);
```

#### 3. 再生制御の問題

```typescript
// 再生状態の詳細情報を取得
const info = playbackController.getPlaybackInfo();
console.log(
  `Playing: ${info.isPlaying}, Speed: ${info.speed}, Seeking: ${playbackController.isSeeking()}`,
);
```

### デバッグ支援

#### イベントログ

```typescript
// 状態変更を監視
stateMachine.on("stateChange", (event) => {
  console.log(`State: ${event.from} → ${event.to} at ${event.timestamp}`);
});

// 再生イベントを監視
playbackController.on("playbackEvent", (event) => {
  console.log(`Playback: ${event.type} at ${event.timestamp}`);
});
```

#### パフォーマンス測定

```typescript
// メッセージティックの性能測定
messageHandler.on("messageTick", (event) => {
  console.log(`Tick duration: ${event.tickDuration}ms, Buffering: ${event.bufferingTime}ms`);
});
```

## 今後の拡張

### 計画中の機能

1. **アダプティブ品質制御**: ネットワーク状況に応じた動的品質調整
2. **プリロード戦略の改善**: 使用パターンに基づく賢いプリロード
3. **メトリクス収集強化**: より詳細なパフォーマンス指標
4. **プラグイン機能**: カスタム処理の挿入ポイント

### 拡張ポイント

- `StateHandler` インターフェースによるカスタム状態
- `MessageHandler` の継承による特殊処理
- イベントリスナーによる拡張機能の実装

## まとめ

この分割実装により、IterablePlayerはより保守しやすく、拡張しやすく、テストしやすいアーキテクチャになりました。既存の機能は完全に維持しながら、将来の機能追加や最適化が容易になっています。

移行は段階的に行い、十分なテストとパフォーマンス検証を経て安全に実施してください。
