# Lichtblick マーケットプレイス ドキュメント目次

> **最終更新**: 2025年10月7日
> **ステータス**: データ構造統一完了（keywords→tags、thumbnail追加）

## 📖 目次について

このドキュメント群は、Lichtblickマーケットプレイス機能の設計・開発・実装に関する包括的な資料です。各ドキュメントは以下のカテゴリに分類されています。

### 📄 共通化・最適化

| ドキュメント                                                                                         | 概要                                                                                                              | 作成日        |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------- |
| [marketplace-search-unification-log.md](./implementation/marketplace-search-unification-log.md)      | 検索機能共通化実装。Extension/Layout両マーケットプレイスの検索ロジックを`useMarketplaceSearch`フックに統一        | 2025年10月1日 |
| [v1.20.0-api-integration-log.md](./implementation/v1.20.0-api-integration-log.md) ✨                 | **v1.20.0 API統合実装**。Layout APIアーキテクチャをマーケットプレイスに適用。HttpService、型定義、APIクラスの実装 | 2025年10月3日 |
| [layout-structure-simplification-log.md](./implementation/layout-structure-simplification-log.md) ✨ | **レイアウト構造簡素化**。バージョン管理、README、CHANGELOGを削除し、シンプルな構造に最適化                       | 2025年10月3日 |

### 📄 データ構造ガイド（開発者向け）✨ NEW

| ドキュメント                                                                | 概要                                                                                                     | 作成日        |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------- |
| [data-structure-guide.md](./data-structure-guide.md) ✨                     | **データ構造完全ガイド**。Extensions/Layoutsの詳細スキーマ、API実装、型定義の包括的なドキュメント        | 2025年10月7日 |
| [data-structure-quick-reference.md](./data-structure-quick-reference.md) ✨ | **データ構造クイックリファレンス**。フィールド一覧、テンプレート、チェックリストなど開発時の素早い参照用 | 2025年10月7日 |
| [data-structure-changelog.md](./data-structure-changelog.md) ✨             | **データ構造変更履歴**。keywords→tags統一、thumbnail追加などの変更履歴と移行ガイド                       | 2025年10月7日 |

---

## 📂 ディレクトリ構造

```
docs/marketplace/
├── INDEX.md                              # このファイル（目次）
├── MARKETPLACE_FEATURES.md               # 機能概要ドキュメント（最新仕様）
├── INCONSISTENCIES_RESOLUTION.md         # 不整合対応方針書
├── IMPLEMENTATION_ACTION_PLAN.md         # 実装アクションプラン（正式リリース計画）
├── layout-api-impact-analysis.md         # Layout API v1.20.0 影響分析レポート ✨NEW
├── architecture/                         # アーキテクチャ・設計書
├── implementation/                       # 実装ログ（フェーズ別）
├── planning/                             # 計画書・提案書
└── guides/                               # 要件定義・ガイド
```

---

## 📊 プロジェクト概要・計画

マーケットプレイス機能全体の仕様、実装計画、対応方針に関する主要ドキュメント

### 📄 主要ドキュメント

| ドキュメント                                                                        | 概要                                                                                                         | 更新日        |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------- |
| [MARKETPLACE_FEATURES.md](./MARKETPLACE_FEATURES.md)                                | マーケットプレイス機能の包括的な仕様書。Phase 1-8の実装内容と正式リリース計画を詳細に記載                    | 2025年9月30日 |
| [IMPLEMENTATION_ACTION_PLAN.md](./IMPLEMENTATION_ACTION_PLAN.md)                    | 正式リリースに向けた10週間の実装アクションプラン。5フェーズの詳細スケジュールと工数見積                      | 2025年9月30日 |
| [INCONSISTENCIES_RESOLUTION.md](./INCONSISTENCIES_RESOLUTION.md)                    | 仕様不整合7項目の対応方針書。各課題の解決選択肢と採用方針を記載                                              | 2025年9月30日 |
| [SEARCH_FUNCTIONALITY_SPECIFICATION.md](./SEARCH_FUNCTIONALITY_SPECIFICATION.md) ✨ | **検索機能共通化仕様書**。Extension/Layout両マーケットプレイスの検索ロジックを統一する完全な設計・実装ガイド | 2025年10月1日 |
| [layout-api-impact-analysis.md](./layout-api-impact-analysis.md) ✨                 | **Layout API v1.20.0 影響分析**。マーケットプレイス機能との互換性、差分、推奨対応を包括的に分析              | 2025年10月2日 |

### 🎯 このカテゴリを参照すべき場面

- マーケットプレイス機能の全体像を把握したい
- 実装済み機能と今後の計画を確認したい
- 仕様の不整合や対応方針を理解したい
- 正式リリースまでのロードマップを確認したい
- **v1.20.0のLayout API変更によるマーケットプレイス機能への影響を確認したい** ✨NEW

---

## 🏗️ Architecture（アーキテクチャ・設計書）

システムの全体設計、データ構造、コンポーネント構成に関するドキュメント

### 📄 主要ドキュメント

| ドキュメント                                                                        | 概要                                                                                                                 | 作成日        |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------- |
| [MARKETPLACE_ARCHITECTURE.md](./architecture/MARKETPLACE_ARCHITECTURE.md)           | マーケットプレイス機能の包括的なアーキテクチャ設計書。ディレクトリ構造、コンポーネント構成、データフローを詳細に記載 | 2025年9月     |
| [IMPLEMENTATION_DETAILS.md](./architecture/IMPLEMENTATION_DETAILS.md)               | 各コンポーネントの技術仕様、Props定義、主要機能の実装詳細                                                            | 2025年9月     |
| [hybrid-version-data-structure.md](./architecture/hybrid-version-data-structure.md) | 単一バージョン（既存）と複数バージョン（新規）の共存仕様。データ構造の統一方法を定義                                 | 2025年9月29日 |

### 🎯 このカテゴリを参照すべき場面

- システム全体の構造を理解したい
- 新機能追加時の影響範囲を調査したい
- コンポーネント間の依存関係を確認したい
- データモデルの設計を理解したい

---

## 🔧 Implementation（実装ログ）

各フェーズでの実装作業の詳細な記録。実装の経緯、技術的な選択、問題解決の過程を記載

### 📄 初期実装（Phase 1-3）

| ドキュメント                                                    | 概要                                                                                                                      | 作成日        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------- |
| [implementation-log.md](./implementation/implementation-log.md) | マーケットプレイス分離実装（Phase 1-3）。統合マーケットプレイスから独立したExtension/Layoutマーケットプレイスへの分離作業 | 2025年9月28日 |

### 📄 機能拡張（Phase 4-8）

| ドキュメント                                                                                          | 概要                                                                                        | 作成日        |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------- |
| [unified-phase4-tag-filtering-log.md](./implementation/unified-phase4-tag-filtering-log.md)           | Phase 4: タグフィルタリング機能の実装。カードへのタグ表示、クリック機能、タグ統計表示       | 2025年9月28日 |
| [unified-phase5-tab-navigation-log.md](./implementation/unified-phase5-tab-navigation-log.md)         | Phase 5: タブナビゲーション機能の実装。「Available」「Installed」タブの追加、統計情報の統合 | 2025年9月28日 |
| [unified-phase6-search-enhancement-log.md](./implementation/unified-phase6-search-enhancement-log.md) | Phase 6: 検索機能強化。オートコンプリート、高度な検索オプション、フィルタリング・ソート機能 | 2025年9月28日 |
| [phase7-implementation-log.md](./implementation/phase7-implementation-log.md)                         | Phase 7: CRUD操作の実装。ExtensionCatalogを使用した実際のインストール/アンインストール機能  | 2025年9月     |
| [phase8-readme-changelog-fix-log.md](./implementation/phase8-readme-changelog-fix-log.md)             | Phase 8: README/CHANGELOG表示機能の修正。詳細ページでのドキュメント表示問題の解決           | 2025年9月28日 |

### 📄 バージョン管理関連

| ドキュメント                                                                                                | 概要                                                                            | 作成日        |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------- |
| [hybrid-extension-loader-integration-log.md](./implementation/hybrid-extension-loader-integration-log.md)   | ハイブリッド拡張機能ローダー統合。レガシー/マルチバージョン対応のデータ構造統一 | 2025年9月29日 |
| [version-normalization-implementation-log.md](./implementation/version-normalization-implementation-log.md) | バージョン正規化実装。`1.0.0`と`v1.0.0`の重複問題の解決                         | 2025年9月28日 |
| [versioned-extension-ids.md](./implementation/versioned-extension-ids.md)                                   | バージョン付き拡張機能ID実装。`publisher.name@version`形式への移行              | 2025年9月29日 |

### 📄 共通化・最適化

| ドキュメント                                                                                    | 概要                                                                                                              | 作成日        |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------- |
| [marketplace-search-unification-log.md](./implementation/marketplace-search-unification-log.md) | 検索機能共通化実装。Extension/Layout両マーケットプレイスの検索ロジックを`useMarketplaceSearch`フックに統一        | 2025年10月1日 |
| [v1.20.0-api-integration-log.md](./implementation/v1.20.0-api-integration-log.md) ✨            | **v1.20.0 API統合実装**。Layout APIアーキテクチャをマーケットプレイスに適用。HttpService、型定義、APIクラスの実装 | 2025年10月3日 |

### 📄 リファクタリング

| ドキュメント                                                                                      | 概要                                                                                 | 作成日        |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------- |
| [extensions-settings-refactoring-log.md](./implementation/extensions-settings-refactoring-log.md) | ExtensionSettings リファクタリング。独自マーケットプレイス実装とupstream互換性の両立 | 2025年9月29日 |

### 📄 詳細仕様書（今後の実装用）

| ドキュメント                                                                                                  | 概要                                                                                           | 実装予定 | 作成日        |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- | ------------- |
| [development-server-specification.md](./implementation/development-server-specification.md)                   | 🔴 ローカル開発サーバー構築仕様。マルチバージョン対応`extensions.json`の構造とサーバー実装手順 | Phase 1  | 2025年9月30日 |
| [extension-id-auto-migration-specification.md](./implementation/extension-id-auto-migration-specification.md) | 🔴 拡張機能ID自動変換仕様。`publisher.name@version`形式への自動マイグレーション機能            | Phase 3  | 2025年9月30日 |

### 🎯 このカテゴリを参照すべき場面

- 特定の機能がどのように実装されたか知りたい
- 過去の実装で発生した問題と解決策を確認したい
- 実装の歴史的経緯を理解したい
- 類似の機能を追加する際の参考にしたい

---

## 📋 Planning（計画書・提案書）

今後の実装予定、改善提案、移行計画などの戦略的ドキュメント

> **注**: 正式リリースに向けた最新の実装計画は [IMPLEMENTATION_ACTION_PLAN.md](./IMPLEMENTATION_ACTION_PLAN.md) を参照してください。

### 📄 バージョン管理計画

| ドキュメント                                                                                                        | 概要                                                                                    | 状態              | 作成日        |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------- | ------------- |
| [version-ui-plan.md](./planning/version-ui-plan.md)                                                                 | 複数バージョン対応マーケットプレイスUI実装計画書。アコーディオン形式のバージョン表示    | Phase 2で実装予定 | 2025年9月     |
| [extension-version-migration-implementation-plan.md](./planning/extension-version-migration-implementation-plan.md) | 拡張機能バージョン付きID移行計画（プランA）。`publisher.name@version`形式への段階的移行 | Phase 3で実装予定 | 2025年9月     |
| [phase8-version-tab-implementation-plan.md](./planning/phase8-version-tab-implementation-plan.md)                   | Phase 8: VERSIONタブ追加機能実装計画。複数バージョン同時インストール対応                | Phase 4で実装予定 | 2025年9月29日 |

### 📄 改善提案

| ドキュメント                                                                          | 概要                                                                           | 状態 | 作成日        |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---- | ------------- |
| [future-implementation-roadmap.md](./planning/future-implementation-roadmap.md)       | 統一マーケットプレイス今後の改善ロードマップ。Phase 6以降の実装計画            | 参考 | 2025年9月28日 |
| [unified-storage-cleanup-proposal.md](./planning/unified-storage-cleanup-proposal.md) | 統一マーケットプレイス関連ファイル削除提案。未使用ファイルのクリーンアップ計画 | 提案 | 2025年9月29日 |

### 📄 詳細仕様書（今後の実装用）

| ドキュメント                                                                    | 概要                                                                                | 実装予定 | 作成日        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------- | ------------- |
| [marketplace-api-specification.md](./planning/marketplace-api-specification.md) | 🟡 マーケットプレイスAPI仕様。次々回リリース用のRESTful API設計とインフラ構成の検討 | 次々回   | 2025年9月30日 |
| [infrastructure-comparison.md](./planning/infrastructure-comparison.md)         | 🔴 インフラ構成比較資料。AWS上での最適な構成選定（S3+CloudFront vs EC2等）          | Phase 1  | 2025年9月30日 |

### ~~📄 作成予定のドキュメント~~

~~以下のドキュメントは作成完了しました（上記セクションに移動）~~:

1. ✅ **`development-server-specification.md`** - `implementation/詳細仕様書` に配置済み
2. ✅ **`extension-id-auto-migration-specification.md`** - `implementation/詳細仕様書` に配置済み
3. ✅ **`marketplace-api-specification.md`** - `planning/詳細仕様書` に配置済み

### 🎯 このカテゴリを参照すべき場面

- 今後の開発予定を確認したい
- 新機能の実装方針を決定したい
- システムの改善提案を検討したい
- 技術的負債の解消計画を立てたい

---

## 📚 Guides（要件定義・ガイド）

機能要件、仕様書、開発ガイドラインなどの参照資料

### 📄 要件・仕様書

| ドキュメント                                                    | 概要                                                                                             | 作成日    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------- |
| [extension-requirements.md](./guides/extension-requirements.md) | 拡張機能マーケットプレイス要件・設計書。機能要件、セキュリティ要件、システム設計の詳細           | 2025年9月 |
| [layout-documentation.md](./guides/layout-documentation.md)     | レイアウトマーケットプレイス機能実装ドキュメント。アーキテクチャ、コンポーネント詳細、実装ガイド | 2025年9月 |

### 🎯 このカテゴリを参照すべき場面

- 機能の要件や仕様を確認したい
- 新しいメンバーへのオンボーディング資料として
- セキュリティ要件を確認したい
- システムの制約事項を理解したい

---

## 🗺️ 開発の歴史と現状

### Phase 1-3: 基本実装と分離

1. **統合マーケットプレイスの開発**

   - Extension・Layoutを統合したマーケットプレイス

2. **個別マーケットプレイスへの分離**
   - Extension・Layout独立したマーケットプレイス
   - 共通UIコンポーネントの設計・実装

### Phase 4-6: UI/UX改善

3. **タグフィルタリング** (Phase 4)

   - タグ表示・クリック機能
   - タグ統計とフィルタリング

4. **タブナビゲーション** (Phase 5)

   - Available/Installedタブ
   - 統計情報の統合

5. **検索機能強化** (Phase 6)
   - オートコンプリート
   - 高度な検索オプション

### Phase 7-8: 機能完成

6. **CRUD操作実装** (Phase 7)

   - 実際のインストール/アンインストール機能

7. **詳細ページ改善** (Phase 8)
   - README/CHANGELOG表示修正

### 現在の状態（2025年9月30日）

- ✅ **完了**: Phase 1-8の基本機能
- � **計画確定**: 正式リリースに向けた10週間の実装計画
- 🎯 **目標**: 2025年12月9日 正式リリース
- �🚧 **次フェーズ**: Phase 1（開発環境整備、マルチバージョン基盤）

### 正式リリースに向けたロードマップ

詳細は [IMPLEMENTATION_ACTION_PLAN.md](./IMPLEMENTATION_ACTION_PLAN.md) を参照

| フェーズ | 期間     | 主要機能                           | 状態      |
| -------- | -------- | ---------------------------------- | --------- |
| Phase 1  | Week 1-2 | 開発環境整備、マルチバージョン基盤 | � 計画中  |
| Phase 2  | Week 3-4 | マルチバージョン対応完全移行       | 📋 計画中 |
| Phase 3  | Week 5-6 | バージョン付きID自動変換機能       | 📋 計画中 |
| Phase 4  | Week 7-9 | VERSIONタブ、LayoutDetails実装     | 📋 計画中 |
| Phase 5  | Week 10  | 統合テスト、リリース準備           | 📋 計画中 |

---

## 🎯 主要機能一覧

### ✅ 実装済み（Phase 1-8完了）

- 独立したExtension/Layoutマーケットプレイス
- サムネイル表示機能
- 詳細画面（README/CHANGELOG表示）
- タグフィルタリング
- タブナビゲーション（Available/Installed）
- 高度な検索機能（オートコンプリート、フィルタリング、ソート）
- **✨ 検索機能の共通化（`useMarketplaceSearch`フック）** - 2025年10月1日完了
- **✨ v1.20.0 API統合（HttpService、型定義、APIクラス）** - 2025年10月3日完了
- インストール・アンインストール（CRUD操作）
- バージョン表示とバージョン正規化
- ハイブリッドデータ構造対応（レガシー/マルチバージョン両対応）

### � 正式リリースで追加予定（Phase 1-5）

#### Phase 1-2: 基盤整備（Week 1-4）

- ローカル開発サーバー構築
- マルチバージョン対応完全移行（レガシー形式廃止）
- README解析による自動サムネイル取得
- ExtensionSettings統一（カスタム実装に一本化）
- マーケットプレイスAPI仕様策定（次々回リリース用）

#### Phase 3: ID変換機能（Week 5-6）

- バージョン付きID形式（`publisher.name@version`）への移行
- 既存データの自動変換機能
- 安全なマイグレーション機能

#### Phase 4: 詳細機能実装（Week 7-9）

- VERSIONタブ機能
- ExtensionDetails完成版
- LayoutDetails実装

#### Phase 5: 品質保証（Week 10）

- 統合テスト
- パフォーマンステスト
- ドキュメント最終更新

### 🔮 将来的な拡張（次々回リリース以降）

- マーケットプレイスAPI実装
- 依存関係管理
- 自動更新機能
- 評価・レビューシステム

---

## 🔍 ドキュメントの使い方

### ケース別ガイド

#### 1. 新しいメンバーのオンボーディング

**推奨読む順序:**

1. `MARKETPLACE_FEATURES.md` - 機能全体像と最新仕様の理解
2. `IMPLEMENTATION_ACTION_PLAN.md` - 正式リリース計画の把握
3. `guides/extension-requirements.md` - 要件理解
4. `architecture/MARKETPLACE_ARCHITECTURE.md` - システム全体像
5. `implementation/implementation-log.md` - 開発経緯

#### 2. 特定機能の実装を理解したい

**手順:**

1. `MARKETPLACE_FEATURES.md` で該当機能の仕様を確認
2. `INDEX.md`（このファイル）で該当フェーズを特定
3. 対応する`implementation/`配下のログを参照
4. 必要に応じて`architecture/`で技術仕様を確認

#### 3. 新機能の追加を検討

**手順:**

1. `IMPLEMENTATION_ACTION_PLAN.md` で正式リリース計画を確認
2. `MARKETPLACE_FEATURES.md` で現在の機能仕様を理解
3. `architecture/IMPLEMENTATION_DETAILS.md` で技術仕様を理解
4. 類似機能の実装ログを参考に設計

#### 4. バグ修正や問題調査

**手順:**

1. `MARKETPLACE_FEATURES.md` で該当機能の仕様を確認
2. 関連する`implementation/`配下のログで過去の問題を確認
3. `architecture/`で設計意図を理解
4. 必要に応じて`guides/`で要件を再確認

#### 5. 仕様の不整合や対応方針を確認

**手順:**

1. `INCONSISTENCIES_RESOLUTION.md` で不整合項目と解決選択肢を確認
2. `IMPLEMENTATION_ACTION_PLAN.md` で採用した方針を確認
3. 該当する実装ログで詳細を確認

---

## 📝 ドキュメント管理ガイドライン

### 新しいドキュメントの追加

1. **適切なディレクトリに配置**

   - プロジェクト概要・計画 → ルート（`docs/marketplace/`）
   - アーキテクチャ設計 → `architecture/`
   - 実装記録 → `implementation/`
   - 計画・提案 → `planning/`
   - 要件・ガイド → `guides/`

2. **このINDEX.mdを更新**

   - 該当カテゴリにドキュメントを追加
   - 概要と作成日を記載
   - 必要に応じて状態を記載

3. **ファイル命名規則**
   - 大文字で始まるドキュメント: プロジェクト全体に関わる主要ドキュメント（例: `MARKETPLACE_FEATURES.md`）
   - 小文字とハイフン: 詳細ドキュメント（例: `phase9-feature-name-log.md`）
   - 内容が分かる明確な名前を使用

### ドキュメントの更新

- 大きな変更がある場合は、INDEX.mdの「最終更新日」も更新
- 古くなった情報は削除または`planning/`の提案書として保持
- 実装完了したら計画書のステータスを「完了」に更新
- 主要ドキュメント（MARKETPLACE_FEATURES.md等）は常に最新状態を保つ

---

## 🔗 関連リソース

### 内部ドキュメント

- [../technical/common-components-documentation.md](../technical/common-components-documentation.md) - 共通コンポーネント仕様
- [../development/extension-distribution-requirements.md](../development/extension-distribution-requirements.md) - 拡張機能配布要件
- [../releases/](../releases/) - バージョン更新レポート

### 外部リソース

- Lichtblick公式ドキュメント
- React/TypeScript 公式ドキュメント
- Material-UI ドキュメント

---

## 📞 サポート

ドキュメントに関する質問や改善提案がある場合は、プロジェクトの開発チームにお問い合わせください。

---

**Document Version**: 1.0.0
**Last Updated**: 2025年9月30日
**Maintained by**: Lichtblick Development Team
