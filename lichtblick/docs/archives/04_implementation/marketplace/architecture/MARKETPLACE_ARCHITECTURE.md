# Lichtblick マーケットプレイス機能アーキテクチャ

## 概要

このドキュメントでは、Lichtblickに実装されたマーケットプレイス機能の包括的なアーキテクチャとディレクトリ構造について説明します。本機能は、エクステンションとレイアウトの両方に対応した統一されたマーケットプレイスシステムを提供します。

## ディレクトリ構造

### Phase 1: 共通UIコンポーネント (`packages/suite-base/src/components/shared/MarketplaceUI/`)

共通のマーケットプレイスUIコンポーネントとユーティリティが格納されています。

```
packages/suite-base/src/components/shared/MarketplaceUI/
├── components/
│   ├── ActionButtons.tsx           # インストール・詳細表示ボタン
│   ├── MarketplaceCard.tsx         # 統一カードレイアウト
│   ├── MarketplaceGrid.tsx         # レスポンシブグリッド
│   ├── MarketplaceHeader.tsx       # 検索・フィルタヘッダー
│   └── VersionAccordion.tsx        # バージョン管理アコーディオン
├── types/
│   └── index.ts                    # 共通型定義
└── utils/
    ├── tagUtils.ts                 # タグ関連ユーティリティ
    └── versionUtils.ts             # バージョン管理ユーティリティ
```

#### 主要コンポーネント詳細

- **MarketplaceCard**: エクステンション・レイアウト用の統一カードUI
- **MarketplaceGrid**: レスポンシブなグリッドレイアウト管理
- **MarketplaceHeader**: 検索・フィルタリング・ソート機能
- **ActionButtons**: インストール・アンインストール・詳細表示
- **VersionAccordion**: 複数バージョンの折りたたみ表示

### Phase 2: レイアウト管理機能

レイアウトマーケットプレイス機能の実装ファイル群です。

```
packages/suite-base/src/
├── context/
│   ├── LayoutCatalogContext.ts         # レイアウトカタログ状態管理
│   └── LayoutMarketplaceContext.ts     # レイアウトマーケットプレイス状態管理
├── providers/
│   ├── LayoutCatalogProvider.tsx       # カタログプロバイダー
│   └── LayoutMarketplaceProvider.tsx   # マーケットプレイスプロバイダー
├── components/
│   ├── LayoutDetails.tsx               # レイアウト詳細コンポーネント
│   └── LayoutMarketplaceSettings.tsx   # レイアウト設定画面
└── services/
    └── ILayoutManager.ts               # レイアウト管理インターフェース拡張
```

#### 機能詳細

- **LayoutCatalogContext**: レイアウトの取得・検索・更新機能
- **LayoutMarketplaceContext**: インストール・削除・状態管理
- **LayoutDetails**: レイアウトの詳細情報とバージョン管理
- **LayoutMarketplaceSettings**: 共通UIを活用した設定画面

### Phase 3: エクステンション管理機能

エクステンションマーケットプレイス機能の強化実装です。

```
packages/suite-base/src/
├── components/
│   ├── ExtensionsSettings/
│   │   ├── ExtensionMarketplaceSettings.tsx  # エクステンション設定画面
│   │   ├── index.tsx                         # メイン設定コンポーネント（強化）
│   │   └── types.ts                          # 設定関連型定義
│   └── ExtensionDetails.tsx                  # エクステンション詳細
├── context/
│   └── ExtensionCatalogContext.ts            # エクステンションカタログ状態管理
├── services/
│   ├── extensions/
│   │   ├── ExtensionAdapter.ts               # エクステンションアダプター
│   │   ├── IdMigrationHandler.ts             # ID移行ハンドラー
│   │   ├── VersionManager.ts                 # バージョン管理
│   │   ├── index.ts                          # エクスポート
│   │   └── types.ts                          # サービス型定義
│   ├── IdbExtensionLoader.ts                 # IndexedDBローダー強化
│   └── DesktopExtensionLoader.ts             # デスクトップローダー強化
├── types/
│   └── HybridExtension.ts                    # ハイブリッドエクステンション型
└── util/marketplace/
    ├── extensionIdHelpers.ts                 # ID管理ヘルパー
    └── migrationUtils.ts                     # マイグレーションユーティリティ
```

#### 機能詳細

- **ExtensionMarketplaceSettings**: 共通UIを使用したエクステンション管理
- **HybridExtension**: エクステンションとレイアウトの統合型定義
- **ExtensionAdapter**: 異なる形式のエクステンションの統一インターフェース
- **VersionManager**: セマンティックバージョニング対応

### Phase 4: 統合と国際化

既存システムとの統合と多言語対応の実装です。

```
packages/suite-base/src/
├── components/
│   ├── AppBar/
│   │   └── SettingsMenu.tsx                  # メニュー統合
│   └── AppSettingsDialog/
│       ├── AppSettingsDialog.tsx             # 設定ダイアログ統合
│       └── types.ts                          # 設定型定義拡張
├── i18n/
│   ├── en/
│   │   ├── appBar.ts                         # 英語リソース
│   │   └── appSettings.ts                    # 英語設定リソース
│   └── ja/
│       ├── appBar.ts                         # 日本語リソース
│       └── appSettings.ts                    # 日本語設定リソース
└── util/marketplace/
    ├── HybridExtensionLoader.ts              # 統合ローダー
    └── extensionDataConverter.ts             # データ変換ユーティリティ
```

#### 機能詳細

- **AppSettingsDialog**: マーケットプレイス設定タブの統合
- **i18n**: 英語・日本語の完全対応
- **HybridExtensionLoader**: エクステンション・レイアウト統合ロード機能
- **extensionDataConverter**: レガシー形式との互換性

## アーキテクチャ設計原則

### 1. 共通コンポーネント設計

- **再利用性**: エクステンションとレイアウトで共通のUIコンポーネント
- **一貫性**: 統一されたデザインシステムとユーザーエクスペリエンス
- **拡張性**: 将来的な機能追加に対応できる柔軟な設計

### 2. コンテキスト駆動アーキテクチャ

- **分離**: レイアウトとエクステンションで独立したコンテキスト
- **状態管理**: Reactコンテキストによる効率的な状態管理
- **型安全性**: TypeScriptによる厳密な型定義

### 3. サービス層設計

- **抽象化**: インターフェースによる実装の抽象化
- **モジュール性**: 機能ごとに分離された独立モジュール
- **互換性**: 既存システムとの後方互換性

### 4. 国際化対応

- **多言語**: 英語・日本語の完全対応
- **拡張性**: 追加言語への容易な対応
- **一元管理**: i18nリソースの統一管理

## 技術スタック

- **フロントエンド**: React, TypeScript
- **状態管理**: React Context API
- **UI**: Material-UI/MUI
- **国際化**: i18next
- **バージョン管理**: セマンティックバージョニング
- **データストレージ**: IndexedDB

## 導入された主要機能

### ✅ 統一UI/UX

- 共通のマーケットプレイスコンポーネント
- レスポンシブデザイン
- 一貫したデザイン言語

### ✅ 包括的検索・フィルタリング

- タグベースフィルタリング
- 高度な検索オプション
- ソート機能

### ✅ バージョン管理

- 複数バージョン対応
- セマンティックバージョニング
- バージョン比較・選択

### ✅ インストール管理

- ワンクリックインストール
- 依存関係管理
- インストール状態追跡

### ✅ 国際化

- 多言語サポート
- ローカライゼーション
- 文化適応

## 今後の拡張可能性

1. **追加言語対応**: 中国語、韓国語など
2. **レビューシステム**: ユーザーレビューと評価
3. **自動更新**: エクステンション・レイアウトの自動更新
4. **依存関係管理**: より高度な依存関係解決
5. **オフライン対応**: オフライン時のキャッシュ機能

## まとめ

このマーケットプレイス機能は、Lichtblickエコシステムの拡張性と使いやすさを大幅に向上させる包括的なソリューションです。モジュラー設計により保守性と拡張性を確保し、統一されたUI/UXによってユーザーエクスペリエンスを向上させています。

---

**更新日**: 2025年9月30日
**バージョン**: 1.0.0
**ブランチ**: feature/marketplace-ui-components
