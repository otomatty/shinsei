# 技術仕様・実装ガイド

このディレクトリには、Lichtblickの技術的な仕様、実装ガイド、ライブラリドキュメントが含まれています。

## 📋 ディレクトリ構造

### 📦 [packages/](./packages/) - パッケージ関連

- **[foxglove-packages-documentation.md](./packages/foxglove-packages-documentation.md)** - Foxgloveパッケージの詳細仕様

### 📊 [mcap/](./mcap/) - MCAP関連技術

- **[indexing-extension-analysis.md](./mcap/indexing-extension-analysis.md)** - MCAPインデックス拡張機能分析
- **[indexed-vs-unindexed-analysis.md](./mcap/indexed-vs-unindexed-analysis.md)** - インデックス化vs非インデックス化の比較分析
- **[multi-url-implementation-strategy.md](./mcap/multi-url-implementation-strategy.md)** - マルチURL実装戦略

## 📋 個別ファイル

### コンポーネント・ライブラリ

- **[common-components-documentation.md](./common-components-documentation.md)** - 共通コンポーネント仕様
- **[library-documentation.md](./library-documentation.md)** - ライブラリ全般のドキュメント
- **[jsdoc-progress.md](./jsdoc-progress.md)** - JSDoc追加進捗状況

### Web関連

- **[web-files-documentation.md](./web-files-documentation.md)** - Web版ファイル構成・仕様
- **[web-worker-implementation-guide.md](./web-worker-implementation-guide.md)** - Web Worker実装ガイド

## 🎯 対象読者

### 開発者向け

- **新規開発者**: [common-components-documentation.md](./common-components-documentation.md) から開始
- **フロントエンド開発者**: Web関連ドキュメントを参照
- **データ処理開発者**: [mcap/](./mcap/) ディレクトリを重点的に確認

### アーキテクト向け

- システム設計時の技術選択の参考資料として活用
- パフォーマンス最適化の検討材料として参照

## 📚 技術スタック

### フロントエンド

- **React + TypeScript**: メインフレームワーク
- **MUI**: UIコンポーネントライブラリ
- **Web Workers**: バックグラウンド処理

### データ処理

- **MCAP**: メインデータフォーマット
- **インデックス化**: パフォーマンス最適化
- **マルチソース対応**: 複数データソースの統合

### 共通ライブラリ

- **Foxgloveパッケージ**: データ可視化・処理
- **共通コンポーネント**: UI統一・再利用性

## 🔄 更新フロー

1. **新技術導入時**: 該当技術のドキュメントを作成・更新
2. **パフォーマンス改善時**: 分析結果と実装方法を記録
3. **ライブラリ更新時**: 変更点と影響範囲を文書化
4. **アーキテクチャ変更時**: 関連するすべてのドキュメントを見直し

## 📖 学習パス

### 基礎理解

1. [common-components-documentation.md](./common-components-documentation.md) - UI基盤理解
2. [web-files-documentation.md](./web-files-documentation.md) - プロジェクト構造理解

### 専門分野

3. [mcap/](./mcap/) - データ処理関連（データエンジニア向け）
4. [web-worker-implementation-guide.md](./web-worker-implementation-guide.md) - パフォーマンス最適化

### 高度な実装

5. [packages/foxglove-packages-documentation.md](./packages/foxglove-packages-documentation.md) - 拡張機能開発
