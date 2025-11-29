# 複数MCAPファイル再生機能 - 実装履歴ドキュメント

## 概要

このドキュメントは、LichtBlickの複数MCAPファイル同時再生機能がいつ、どのように実装されたかの詳細な履歴を記録しています。

## 🎯 実装バージョンサマリー

| 項目                   | 詳細                                                            |
| ---------------------- | --------------------------------------------------------------- |
| **初回実装バージョン** | `v1.10.0`                                                       |
| **実装日**             | 2025年2月28日 11:26:07 UTC                                      |
| **Pull Request**       | [#372](https://github.com/lichtblick-suite/lichtblick/pull/372) |
| **コミットハッシュ**   | `ff0838ec981f8da091964af5c50d28137ac9398d`                      |
| **機能名**             | "Story/load multiple mcaps r1"                                  |

## 📅 詳細な実装履歴

### v1.10.0 (2025年2月28日) - 初回実装

#### Pull Request #372: "Story/load multiple mcaps r1"

- **作成者**: Luiz Bezerra (luiz.bezerra@ctw.bmwgroup.com)
- **マージ日**: 2025年2月28日 11:26:07 UTC
- **実装規模**: 59ファイル変更、1,946行追加、134行削除

#### 主な実装内容

##### 新規作成された核心ファイル

1. **`MultiIterableSource.ts`** - 複数MCAPファイル統合の核心クラス
2. **`mergeAsyncIterators.ts`** - 時系列メッセージマージアルゴリズム
3. **`mergeInitialization.ts`** - メタデータ統合ユーティリティ
4. **`mergeMultipleFileName.ts`** - ファイル名統合ユーティリティ
5. **`validateInitialization.ts`** - 初期化データ検証

##### UI関連の変更

- ファイル選択ダイアログでの複数ファイル選択サポート
- "Open local file" → "Open local file(s)" への表記変更
- 複数ファイル名の表示対応（カンマ区切り）

##### データソース拡張

- `McapLocalDataSourceFactory` での `supportsMultiFile = true` 設定
- Worker での複数ファイル処理対応

#### サブタスク構成

PR #372は以下のサブタスクから構成されていました：

- [x] #360 @luluiz
- [x] #363 @aneuwald-ctw / @luluiz
- [x] #365 @ctw-joao-luis
- [x] #373 @luluiz

#### 協力者

- **Luiz Bezerra** (メイン実装者)
- **Alexandre Neuwald CTW**
- **ctw-joao-luis**

### v1.11.0以降 - 継続的改善

#### Pull Request #387: "Support reading multiple files from URL instead of a single file"

- **コミット**: `f2e09d551`
- **内容**: URL経由での複数ファイル読み込みサポート追加

#### Pull Request #443: "Remove check of overlap mcaps"

- **コミット**: `e509eebb1`
- **内容**: MCAPオーバーラップチェックの削除

## 🔍 実装発見の調査手順

### 1. Git履歴による主要ファイル追跡

```bash
# MultiIterableSourceファイルの作成・変更履歴
git log --oneline --follow packages/suite-base/src/players/IterablePlayer/shared/MultiIterableSource.ts

# 出力例:
# 105dd84fd Buffer messages as UInt8Array (#586)
# a04a2aa80 Updating @lichtblick/eslint version and applying the updated header rule (#511)
# ff0838ec9 Story/load multiple mcaps r1 (#372)  ← 最初の実装
```

### 2. 機能関連コミットの検索

```bash
# 複数MCAP関連のコミットメッセージ検索
git log --oneline --grep="multi.*mcap" -i
git log --oneline --grep="multiple.*mcap" -i

# 発見されたコミット:
# f2e09d551 Support reading multiple files from URL instead of a single file (#387)
# ff0838ec9 Story/load multiple mcaps r1 (#372)
# d93ba6478 Fix multi-topic playback for unindexed local mcap files (#5787)
```

### 3. バージョンタグとの関連確認

```bash
# 特定コミットを含む最初のバージョンタグ
git describe --contains ff0838ec9
# 出力: v1.10.0~11

# このコミットを含むすべてのバージョン
git tag --contains ff0838ec9
# 出力: v1.10.0, v1.11.0, v1.12.0, v1.13.0, v1.14.0, v1.15.0, v1.16.0, v1.17.0, v1.18.0, v1.19.0
```

### 4. Pull Request詳細情報の取得

```bash
# コミットの詳細統計情報
git show --stat ff0838ec9

# PR情報の取得
curl -s "https://api.github.com/repos/lichtblick-suite/lichtblick/pulls/372"
```

## 📊 実装の技術的影響

### アーキテクチャの変更

1. **新しい抽象化レイヤー**: `MultiIterableSource`クラスの導入
2. **時系列マージアルゴリズム**: ヒープソートベースの効率的なマージ
3. **メタデータ統合**: トピック、データタイプ、統計情報の統合
4. **UI拡張**: 複数ファイル選択とハンドリング

### パフォーマンス考慮事項

- Web Worker での非同期処理
- メモリ効率的なストリーミング処理
- 時系列順序の保証

### 互換性

- 既存の単一MCAPファイル機能との完全な後方互換性
- 段階的な機能拡張（URL対応など）

## 🚀 実装後の機能拡張履歴

### v1.11.0以降の改善

- URL経由での複数ファイル読み込み (#387)
- MCAPオーバーラップチェックの最適化 (#443)
- デスクトップアプリでのドラッグ&ドロップ対応

### 現在サポートされている機能

1. **ローカル複数MCAPファイル**: 完全サポート
2. **リモート複数MCAPファイル**: URL経由でサポート
3. **時系列統合**: 自動的な時刻順ソート
4. **メタデータ統合**: トピック・データタイプの統合
5. **UI統合**: シームレスなファイル名表示

## 🔮 今後の発展予定

GitHubのdiscussion #280で言及されている将来の機能：

- WebSocket経由のリアルタイムストリーミングとの組み合わせ
- 時刻制御コマンドの外部ソフトウェアへの送信
- 他のファイル形式（.bag、.foxeなど）での複数ファイル対応

## 📚 参考リンク

- [GitHub Discussion #280](https://github.com/lichtblick-suite/lichtblick/discussions/280) - 機能要求の議論
- [Pull Request #372](https://github.com/lichtblick-suite/lichtblick/pull/372) - 初回実装
- [Pull Request #387](https://github.com/lichtblick-suite/lichtblick/pull/387) - URL対応
- [実装詳細ドキュメント](./multi-mcap-playback-implementation.md) - 技術的実装の詳細

## 📝 調査手法のベストプラクティス

この調査で効果的だった手法を今後の参考として記録：

### 1. 核心ファイルからの逆引き

```bash
git log --oneline --follow <重要なファイルパス>
```

最も確実な方法。実装の核心となるファイルの作成履歴を追跡。

### 2. 機能キーワードでの検索

```bash
git log --grep="<機能名>" -i
```

コミットメッセージから関連する実装を発見。

### 3. バージョンタグとの突合

```bash
git describe --contains <commit>
git tag --contains <commit>
```

実装がいつリリースされたかを正確に特定。

### 4. Pull Request情報の活用

GitHub APIまたはGit showコマンドでPRの詳細情報を取得し、実装の背景と規模を把握。

## ⚠️ 注意事項

- この情報は2025年時点での調査結果です
- 将来のバージョンでさらなる機能拡張が予定されています
- 実装の詳細は対応する技術ドキュメントを参照してください

---

**最終更新**: 2025年1月
**調査者**: AI Assistant
**検証方法**: Git履歴分析、Pull Request調査、コードベース解析
