# Lichtblick プロジェクト専門用語解説ガイド

**対象読者**: ジュニアエンジニア（実務経験1-3年程度）

このガイドは、Lichtblickプロジェクトの専門用語や概念を体系的に学習できるように構成されています。各章は独立して読むことができますが、順序良く読み進めることを推奨します。

## 📚 学習ガイド

### 📖 章構成

1. **[プロジェクト概要](./01_project_overview.md)**

   - Lichtblickとは何か
   - 主な機能と特徴
   - 技術スタックの概要

2. **[基本的な専門用語](./02_basic_terminology.md)**

   - ロボティクス関連用語
   - Web開発関連用語
   - 実際のプロジェクトファイルでの使用例

3. **[アーキテクチャの基本概念](./03_architecture_concepts.md)**

   - プロバイダーパターン
   - HOC（Higher-Order Component）
   - 依存性注入

4. **[主要コンポーネント](./04_main_components.md)**

   - App.tsx vs StudioApp.tsx
   - MessagePipeline
   - Panel System

5. **[データフローの仕組み](./05_data_flow.md)**

   - データソースの読み込み
   - Player による再生制御
   - MessagePipeline による配信
   - Panel での可視化

6. **[開発時のポイント](./06_development_tips.md)**

   - コンポーネント開発のベストプラクティス
   - パフォーマンス最適化
   - デバッグのコツ

7. **[実践的な開発例](./07_practical_examples.md)**

   - 温度センサーPanel の実装
   - 3D ロボット可視化Panel の実装
   - データ統計Panel の実装
   - Panel 登録の方法

8. **[データ形式解説](./08_data_formats_mcap_ros.md)**
   - MCAP・ROSデータ形式の詳細解説
   - ファイル構造、読み込み処理、スキーマ処理
   - 実際の実装例とパフォーマンス最適化

### 🎯 推奨学習順序

#### **初心者（Lichtblick初学者）**

1. **プロジェクト概要** → 全体像を把握
2. **基本的な専門用語** → 用語の理解
3. **データ形式解説** → MCAP・ROSデータ形式の理解
4. **アーキテクチャの基本概念** → 設計思想の理解
5. **主要コンポーネント** → 実装の理解
6. **データフローの仕組み** → データの流れの理解
7. **開発時のポイント** → 実践的な開発技術
8. **実践的な開発例** → 実際の実装

#### **中級者（React経験者）**

1. **プロジェクト概要** → 概要確認
2. **主要コンポーネント** → 実装の理解
3. **データフローの仕組み** → データの流れの理解
4. **データ形式解説** → MCAP・ROSデータ形式の理解
5. **開発時のポイント** → 最適化技術
6. **実践的な開発例** → 実装練習
7. **アーキテクチャの基本概念** → 設計の深い理解
8. **基本的な専門用語** → 参考資料として活用

#### **上級者（アーキテクチャ学習者）**

1. **アーキテクチャの基本概念** → 設計思想の理解
2. **データフローの仕組み** → データの流れの理解
3. **データ形式解説** → MCAP・ROSデータ形式の深い理解
4. **開発時のポイント** → 最適化技術
5. **実践的な開発例** → 実装のベストプラクティス
6. **プロジェクト概要** → 全体確認
7. **基本的な専門用語** → 参考資料として活用
8. **主要コンポーネント** → 実装確認

### 📋 各章の特徴

#### **1. プロジェクト概要**

- **学習時間**: 約30分
- **内容**: Lichtblickの基本情報、技術スタック、プロジェクト構成
- **実用性**: プロジェクト全体の理解に必要

#### **2. 基本的な専門用語**

- **学習時間**: 約45分
- **内容**: ROS、MCAP、Message、Topic、Panel等の用語解説
- **実用性**: 開発時の用語理解に必要

#### **3. アーキテクチャの基本概念**

- **学習時間**: 約60分
- **内容**: Provider Pattern、HOC、Context、依存性注入
- **実用性**: 設計思想の理解に重要

#### **4. 主要コンポーネント**

- **学習時間**: 約75分
- **内容**: App.tsx、MessagePipeline、Player、Panel System
- **実用性**: 実装理解に必須

#### **5. データフローの仕組み**

- **学習時間**: 約90分
- **内容**: データソース読み込み、Player制御、メッセージ配信
- **実用性**: 開発時の重要な理解

#### **6. 開発時のポイント**

- **学習時間**: 約120分
- **内容**: パフォーマンス最適化、エラーハンドリング、デバッグ
- **実用性**: 実際の開発に直結

#### **7. 実践的な開発例**

- **学習時間**: 約180分
- **内容**: 3つの実装例とPanel登録方法
- **実用性**: 実際のコーディングに直結

#### **8. データ形式解説**

- **学習時間**: 約60分〜90分
- **内容**: MCAP・ROSデータ形式の詳細解説、ファイル構造、読み込み処理
- **実用性**: データ処理の理解に必須

### 💻 実際のコードファイル参照

このガイドでは、以下のような形式で実際のプロジェクトファイルを参照しています：

```
**実際の使用例**:
- ファイル名: `packages/suite-base/src/components/App.tsx` (1行目〜)
- 関連ファイル: `packages/suite-base/src/context/AppConfigurationContext.ts` (25行目〜)
```

### 📂 参考ファイル一覧

#### **メインコンポーネント**

- `packages/suite-base/src/App.tsx`
- `packages/suite-base/src/components/StudioApp.tsx`
- `packages/suite-base/src/components/MessagePipeline/index.tsx`
- `packages/suite-base/src/components/Panel.tsx`

#### **Player システム**

- `packages/suite-base/src/players/types.ts`
- `packages/suite-base/src/players/Ros1Player.ts`
- `packages/suite-base/src/players/McapPlayer.ts`
- `packages/suite-base/src/players/RosbagPlayer.ts`

#### **Hook とユーティリティ**

- `packages/suite-base/src/hooks/useMessagesByTopic.ts`
- `packages/suite-base/src/components/MessagePipeline/store.ts`
- `packages/suite-base/src/components/MessagePipeline/subscriptions.ts`

#### **Panel 実装例**

- `packages/suite-base/src/panels/Plot/index.tsx`
- `packages/suite-base/src/panels/ThreeDeeRender/index.tsx`
- `packages/suite-base/src/panels/Image/index.tsx`

### 🚀 学習後の次のステップ

1. **実際の実装**: ガイドの例を参考に、独自のPanelを作成
2. **コードリーディング**: 既存のPanelコードを読んで理解を深める
3. **実験とテスト**: 小さな機能から実装して動作確認
4. **コミュニティ参加**: 疑問点はコミュニティで解決

### 🎓 学習完了の目安

#### **基本レベル**

- [ ] 専門用語の理解
- [ ] プロジェクト構成の理解
- [ ] 基本的なコンポーネントの理解

#### **中級レベル**

- [ ] データフローの理解
- [ ] Panel作成の基本
- [ ] Hook の活用

#### **上級レベル**

- [ ] パフォーマンス最適化の実装
- [ ] 複雑なPanel の作成
- [ ] アーキテクチャの深い理解

---

**🎉 学習を始めましょう！**

まずは **[プロジェクト概要](./01_project_overview.md)** から始めて、順序立てて学習を進めてください。

各章には実際のコードファイルの参照が含まれているので、ドキュメントを読みながら実際のコードも確認することをお勧めします。

**💡 効果的な学習のコツ**

- **実際のコードを見る**: ドキュメントだけでなく、参照されているファイルを開いて確認
- **小さく始める**: 複雑な機能より、シンプルな実装から始める
- **実験する**: 学んだ概念を小さなコードで試してみる
- **質問する**: わからないことは遠慮なく質問する

頑張ってください！
