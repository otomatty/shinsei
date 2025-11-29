# 20251024_01 URDF Preset Extension 実装要件定義書作成

## 実施した作業

- [x] Extension を使った3Dパネル拡張方法の調査
- [x] MessageConverter を活用したアプローチの検討
- [x] UI変更なしでの実装方法の確認
- [x] 実装要件定義書の作成
- [x] 詳細実装計画書の作成

## 作成ファイル

### 要件定義書

- **ファイル**: `docs/01_issues/open/2025_10/20251024_01_urdf-preset-extension.md`
- **内容**:
  - 機能要件・非機能要件の定義
  - 受け入れ基準の明確化
  - リスク・制約事項の整理
  - 実装スケジュールの策定

### 実装計画書

- **ファイル**: `docs/03_plans/urdf-preset-extension/20251024_01_implementation-plan.md`
- **内容**:
  - 技術アーキテクチャ設計
  - コンポーネント詳細設計
  - Phase別の実装手順
  - テスト計画・デプロイメント計画

## 技術的な発見

### MessageConverter の活用可能性

✅ **UI変更なしでの実装が可能**

- Extension の `registerMessageConverter()` を使用
- カスタムスキーマから `std_msgs/String` への変換
- 3Dパネルは既存の `/robot_description` として受信

### アーキテクチャ設計

```
[データソース] → [カスタムメッセージ] → [MessageConverter] → [URDF] → [3Dパネル]
```

### 主要コンポーネント

1. **UrdfPresetConverter**: MessageConverter実装
2. **ModelManager**: 固定URDFモデル管理
3. **ErrorHandler**: エラー処理・フォールバック
4. **Cache**: パフォーマンス最適化

## 実装方針の決定

### 選択したアプローチ

**MessageConverter Extension** による実装

### 理由

1. **UI変更不要**: 3Dパネルの既存UIをそのまま利用
2. **透明性**: 3Dパネルは通常のURDFメッセージとして処理
3. **拡張性**: 将来的な機能追加が容易
4. **保守性**: Extension として独立した管理

### 技術仕様

- **入力**: `custom_robot/RobotConfig` メッセージ
- **出力**: `std_msgs/String` (URDF)
- **固定モデル**: 3種類 + フォールバック
- **キャッシュ**: パフォーマンス最適化

## 次のステップ

### Phase 1: プロジェクト初期化 (10/25-10/27)

- [ ] Extension プロジェクト作成
- [ ] 基本的なディレクトリ構造構築
- [ ] 開発環境セットアップ

### Phase 2: Core実装 (10/28-11/03)

- [ ] MessageConverter 基本実装
- [ ] 固定URDFモデル定義
- [ ] 基本的な変換ロジック

### Phase 3: 拡張機能 (11/04-11/10)

- [ ] エラーハンドリング実装
- [ ] キャッシュ機能実装
- [ ] ログ機能実装

### Phase 4: テスト・文書化 (11/11-11/17)

- [ ] 単体テスト作成
- [ ] 統合テスト実施
- [ ] ドキュメント整備

## 注意事項・制約

### 技術的制約

- MessageConverter は同期処理のみ
- ブラウザ環境でのファイルアクセス制限
- Extension API のバージョン依存性

### 運用上の注意

- 外部URLへの依存性（ネットワークエラー対策必要）
- 大容量URDFファイルによるメモリ使用量
- キャッシュ管理（メモリリーク防止）

## 技術詳細メモ

### MessageConverter の仕組み

```typescript
extensionContext.registerMessageConverter({
  fromSchemaName: "custom_robot/RobotConfig",
  toSchemaName: "std_msgs/String",
  converter: (msg: RobotConfig): UrdfMessage => {
    return { data: getPresetUrdf(msg.modelType) };
  },
});
```

### 3Dパネル側の処理

- `/robot_description` トピックとして受信
- 既存の URDF レンダリング機能をそのまま使用
- UI変更は一切不要

### データフロー

1. データソース → `/robot_config` トピック（カスタムメッセージ）
2. Extension → MessageConverter で変換
3. 3Dパネル → `/robot_description` として受信・レンダリング

## 学び・気づき

### Extension の柔軟性

- MessageConverter により既存機能を拡張可能
- UI変更なしでの機能追加が実現可能
- 既存コードベースへの影響を最小化

### 設計原則

- **透明性**: 既存機能への影響を避ける
- **拡張性**: 将来的な機能追加を考慮
- **保守性**: Extension として独立した管理

### パフォーマンス考慮事項

- URDFファイルのキャッシュ化が重要
- ネットワーク取得の非同期処理が課題
- メモリ使用量の最適化が必要

## 関連ドキュメント

- **調査ログ**: docs/05_logs/2025_10/20251024/01_3d-panel-extension-investigation.md
- **Extension API**: https://docs.lichtblick.org/extensions/
- **MessageConverter**: https://docs.lichtblick.org/extensions/message-converters

---

**作業日**: 2025-10-24
**所要時間**: 約3時間
**次回予定**: Phase 1 実装開始
