# VERSIONタブ機能 実装ドキュメント一覧

**作成日**: 2025年10月1日
**目的**: VERSIONタブ機能の実装に関する全ドキュメントの索引

---

## 📚 ドキュメント構成

### 1. 現在の仕様まとめ

**ファイル**: `version-tab-current-specification.md`

**内容**:

- 現在のマーケットプレイス機能の詳細な仕様
- データ構造の完全な定義
- 複数バージョン管理の仕様
- 詳細画面の構造
- インストール状態管理
- VERSIONタブで実装すべき要件

**用途**:

- 現状把握の基礎資料
- 実装前の仕様確認
- データ構造のリファレンス

---

### 2. 実装計画書 v2.0

**ファイル**: `version-tab-implementation-plan-v2.md`

**内容**:

- 複数バージョン専用実装の方針
- 必須・推奨機能の完全な定義
- データ構造設計（MultiVersion専用）
- 詳細なUI設計
- コンポーネント設計
- データフロー
- 4日間の実装タスク
- テストシナリオ

**用途**:

- 実装の具体的なガイド
- タスク管理
- 進捗確認

**主な特徴**:

- ✅ 必須機能: バージョン一覧、インストール状態、個別操作
- ⭕ 推奨機能: ファイルサイズ、安定性、互換性、非推奨マーク
- ❌ オプション機能: 実装しない（有効化/無効化など）

---

### 3. Legacy関連コード削除計画書

**ファイル**: `legacy-code-removal-plan.md`

**内容**:

- 削除対象ファイルの特定
- 削除理由と影響範囲
- MultiVersionDataLoaderの作成計画
- 段階的な削除手順
- テスト項目
- リスク軽減策

**用途**:

- Legacy関連コードの削除作業
- 影響範囲の把握
- 安全な移行の実施

**削除対象**:

- ❌ `HybridExtensionLoader.ts`
- ❌ `extensionDataConverter.ts`
- ⚠️ `HybridExtension.ts`（Legacy型のみ削除）

**保持対象**:

- ✅ レイアウトマイグレーション関連（`migrateLegacyToNew*`）
- ✅ プレイヤー選択の互換性コード

---

## 🎯 実装の全体像

### フェーズ1: 準備（完了）

- ✅ 現在の仕様をまとめる
- ✅ 実装計画を作成する
- ✅ Legacy関連の削除計画を立てる

### フェーズ2: Legacy削除とデータローダー（3-4日）

1. **型定義の整理**

   - Legacy型の削除
   - MultiVersion専用型の定義

2. **MultiVersionDataLoader の作成**

   - シンプルで高速なローダー
   - Legacy対応を削除

3. **HybridExtensionLoader の削除**
   - 影響範囲の修正
   - ExtensionMarketplaceProviderの更新

### フェーズ3: VERSIONタブ実装（4日）

1. **Day 1: コンポーネント基盤**

   - VersionTab メインコンポーネント
   - VersionListItem コンポーネント
   - VersionBadge コンポーネント
   - スタイル定義

2. **Day 2: 機能実装**

   - バージョン一覧表示
   - インストール/アンインストール
   - ファイルサイズ・安定性表示
   - 互換性チェック

3. **Day 3: 詳細画面統合**

   - ExtensionDetail へのタブ追加
   - LayoutDetail へのタブ追加
   - データフロー実装

4. **Day 4: テストと調整**
   - 動作確認
   - UI調整
   - ドキュメント更新

---

## 📋 実装チェックリスト

### 必須機能 ✅

- [ ] バージョン一覧表示（新しい順にソート）
- [ ] 最新バージョンの"Latest"バッジ表示
- [ ] インストール済みの"Installed"バッジ表示
- [ ] 公開日時の表示
- [ ] バージョンごとの個別Installボタン
- [ ] バージョンごとの個別Uninstallボタン
- [ ] インストール中のローディング表示
- [ ] エラーハンドリング

### 推奨機能 ⭕

- [ ] ファイルサイズ表示（人間が読みやすい形式）
- [ ] 安定性レベル表示（stable/beta/alpha/experimental）
- [ ] 互換性情報表示（minLichtblickVersion）
- [ ] 互換性がない場合の警告
- [ ] 非推奨バージョンの"Deprecated"バッジ
- [ ] 非推奨の警告メッセージ

### Legacy削除 🗑️

- [ ] HybridExtensionLoader.ts 削除
- [ ] extensionDataConverter.ts 削除
- [ ] Legacy型定義の削除
- [ ] MultiVersionDataLoader 作成
- [ ] ExtensionMarketplaceProvider 更新

---

## 🔗 関連ドキュメント

### プロジェクトドキュメント

- `docs/marketplace/planning/phase8-version-tab-implementation-plan.md` - 当初の計画
- `docs/marketplace/implementation/marketplace-detail-implementation.md` - 詳細画面実装レポート
- `docs/marketplace/INCONSISTENCIES_RESOLUTION.md` - 仕様不整合解決方針

### 既存実装の参考

- `packages/suite-base/src/components/shared/MarketplaceUI/VersionAccordion.tsx`
- `packages/suite-base/src/components/shared/MarketplaceUI/ActionButtons.tsx`
- `packages/suite-base/src/components/shared/MarketplaceUI/MarketplaceDetailBase.tsx`

---

## 📊 進捗管理

### 現在のステータス

| フェーズ                   | ステータス | 完了日     |
| -------------------------- | ---------- | ---------- |
| フェーズ1: 準備            | ✅ 完了    | 2025-10-01 |
| フェーズ2: Legacy削除      | 🔄 準備中  | -          |
| フェーズ3: VERSIONタブ実装 | ⏳ 未着手  | -          |

### 次のアクション

1. **型定義の整理**

   - `HybridExtension.ts`の確認
   - Legacy型の特定と削除

2. **MultiVersionDataLoader の作成**

   - 基本設計の確認
   - 実装開始

3. **影響範囲の調査**
   - HybridExtensionLoader使用箇所の特定
   - 修正が必要なファイルのリストアップ

---

## 💡 実装のポイント

### データ構造

- **MultiVersion専用**: Legacy形式は完全に削除
- **シンプルな型**: 複雑な変換処理を削除
- **明確な命名**: `MultiVersionExtensionData`, `VersionDetail`など

### UIデザイン

- **視認性重視**: バッジで状態を明確に表示
- **操作性**: 各バージョンに個別のアクションボタン
- **情報密度**: 必要な情報を適切に配置

### パフォーマンス

- **データ取得**: 必要なときだけAPIを呼ぶ
- **レンダリング**: useMemoで不要な再計算を防ぐ
- **キャッシング**: 必要に応じて実装

### エラーハンドリング

- **ユーザーフレンドリー**: わかりやすいエラーメッセージ
- **リトライ**: 一時的なネットワークエラーに対応
- **ログ**: デバッグのための詳細ログ

---

## 🧪 テスト戦略

### 単体テスト

- コンポーネントの個別動作確認
- ユーティリティ関数のテスト
- データ変換のテスト

### 統合テスト

- データフロー全体のテスト
- API連携のテスト
- 状態管理のテスト

### E2Eテスト

- ユーザーシナリオベースのテスト
- 複数バージョンのインストール
- エラーケースの確認

---

## 📝 ドキュメント更新計画

### 実装中

- 各タスク完了時に実装ログを更新
- 問題が発生したら記録
- 設計変更があれば文書化

### 実装後

- 完了レポートの作成
- README の更新
- API仕様書の更新（必要に応じて）

---

**作成者**: GitHub Copilot
**最終更新**: 2025-10-01
