# URDF Preset Extension 実装要件

**作成日**: 2025-10-24
**重要度**: Medium
**ステータス**: Open
**担当者**: TBD

---

## 概要

LichtblickのExtension機能を活用し、MessageConverterを使用して3DパネルのUIを変更することなく、固定URDFモデルを自動的に提供する機能を実装する。

## 背景

現在の3DパネルでURDFモデルを表示するには、ユーザーが手動でCustomLayersにURDFを追加し、SourceにURLを設定する必要がある。この作業を自動化し、事前定義された固定モデルから簡単に選択できるようにしたい。

## 要件

### 機能要件

#### FR-001: Extension による MessageConverter 実装

- **要件**: カスタムメッセージスキーマからstd_msgs/Stringへの変換機能
- **詳細**:
  - 入力スキーマ: `custom_robot/RobotConfig`
  - 出力スキーマ: `std_msgs/String` (URDFデータ)
  - 複数の固定URDFモデルから選択可能

#### FR-002: 固定URDFモデル管理

- **要件**: 事前定義された複数のロボットモデルをサポート
- **詳細**:
  - Robot Model A: `package://robots/model_a.urdf`
  - Robot Model B: `https://example.com/models/model_b.urdf`
  - Robot Model C: `package://robots/model_c.urdf`
  - 将来的な拡張性を考慮した設計

#### FR-003: 動的モデル選択

- **要件**: メッセージ内容に基づく動的なモデル切り替え
- **詳細**:
  - modelType フィールドによるモデル指定
  - framePrefix の動的設定サポート
  - 無効な設定時のフォールバック処理

#### FR-004: 透明性の確保

- **要件**: 3Dパネル側での変更が不要
- **詳細**:
  - 既存の `/robot_description` トピックと互換性維持
  - std_msgs/String として処理される
  - 既存機能への影響なし

### 非機能要件

#### NFR-001: パフォーマンス

- **要件**: メッセージ変換の低遅延処理
- **詳細**:
  - 変換処理時間 < 10ms
  - URDFデータのキャッシュ機能
  - メモリ使用量の最適化

#### NFR-002: 信頼性

- **要件**: エラー処理とフォールバック機能
- **詳細**:
  - ネットワークエラー時の適切な処理
  - 無効なメッセージ形式への対応
  - ログ出力による問題追跡

#### NFR-003: 保守性

- **要件**: 拡張しやすい設計
- **詳細**:
  - 新しいモデルの追加が容易
  - 設定の外部化
  - 明確なコードドキュメント

## 技術仕様

### メッセージスキーマ定義

```typescript
// 入力メッセージ型
type RobotConfig = {
  modelType: "robot_a" | "robot_b" | "robot_c";
  framePrefix?: string;
  usePresetModel?: boolean;
};

// 出力メッセージ型
type UrdfMessage = {
  data: string; // URDF XML content
};
```

### Extension API 仕様

```typescript
// MessageConverter登録
extensionContext.registerMessageConverter({
  fromSchemaName: "custom_robot/RobotConfig",
  toSchemaName: "std_msgs/String",
  converter: (msg: RobotConfig): UrdfMessage => {
    return { data: getPresetUrdf(msg.modelType) };
  },
});
```

### 固定モデル定義

| Model ID | URL                                       | 説明                   |
| -------- | ----------------------------------------- | ---------------------- |
| robot_a  | `package://robots/model_a.urdf`           | 生産用ロボットモデル   |
| robot_b  | `https://example.com/models/model_b.urdf` | 開発用ロボットモデル   |
| robot_c  | `package://robots/model_c.urdf`           | テスト用ロボットモデル |

## 実装計画

### Phase 1: 基本実装 (2025-10-24 - 2025-10-31)

- [ ] Extension プロジェクト作成
- [ ] MessageConverter 基本実装
- [ ] 固定URDFモデル定義
- [ ] 基本的な変換ロジック実装

### Phase 2: エラーハンドリング (2025-11-01 - 2025-11-07)

- [ ] ネットワークエラー処理
- [ ] 無効なメッセージへの対応
- [ ] ログ機能実装
- [ ] フォールバック機能

### Phase 3: 最適化・テスト (2025-11-08 - 2025-11-14)

- [ ] パフォーマンス最適化
- [ ] キャッシュ機能実装
- [ ] 単体テスト作成
- [ ] 統合テスト実施

### Phase 4: ドキュメント・リリース (2025-11-15 - 2025-11-21)

- [ ] 使用方法ドキュメント作成
- [ ] API リファレンス作成
- [ ] Extension パッケージング
- [ ] リリース準備

## 受け入れ基準

### AC-001: 基本機能

- [ ] カスタムメッセージから URDF への変換が正常に動作する
- [ ] 3つの固定モデルが選択可能
- [ ] 3Dパネルで正常にレンダリングされる

### AC-002: エラーハンドリング

- [ ] 無効なmodelTypeの場合、適切なエラーメッセージが表示される
- [ ] ネットワークエラー時にフォールバック処理が動作する
- [ ] ログに十分な情報が記録される

### AC-003: パフォーマンス

- [ ] メッセージ変換が10ms以内に完了する
- [ ] 同一モデルの連続変換時にキャッシュが効く
- [ ] メモリリークが発生しない

### AC-004: 互換性

- [ ] 既存の `/robot_description` トピック機能が正常に動作する
- [ ] 他のパネルに影響を与えない
- [ ] Extension を無効化した際に既存機能が復旧する

## リスク・制約事項

### リスク

1. **ネットワーク依存**: 外部URLのURDFが取得できない場合

   - **対策**: ローカルキャッシュとフォールバックモデル

2. **大容量データ**: 大きなURDFファイルによるメモリ不足

   - **対策**: ストリーミング処理とメモリ制限

3. **互換性問題**: Extension API の変更による影響
   - **対策**: API バージョンチェックと段階的移行

### 制約事項

1. **非同期処理制限**: MessageConverter は同期処理のみ
2. **セキュリティ制約**: 外部URLアクセスの制限
3. **ブラウザ制限**: ファイルシステムアクセス不可

## 関連ドキュメント

- [Extension開発ガイド](../../../02_research/2025_10/20251024_01_extension-architecture.md)
- [3Dパネル実装調査](../../../05_logs/2025_10/20251024/01_3d-panel-investigation.md)
- [MessageConverter API仕様](https://docs.lichtblick.org/extensions/message-converters)

---

**最終更新**: 2025-10-24
**レビュー者**: TBD
