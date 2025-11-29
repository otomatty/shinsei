# 独自複数MCAP再生機能 - 調査方針・計画書

## 🎯 調査目的

**主目的**: 独自実装された複数MCAP再生機能の詳細を把握し、LichtBlick標準機能との比較分析を行う
**最終目標**: 上司への質問前に技術的背景を理解し、具体的で建設的な議論を可能にする

## 📋 調査対象・範囲

### **Phase 1: 実装箇所の特定**

- [ ] 複数MCAP処理に関連するコードの特定
- [ ] 独自実装と標準実装の境界線の把握
- [ ] 実装規模と複雑性の評価

### **Phase 2: 機能・性能分析**

- [ ] 機能仕様の詳細調査
- [ ] パフォーマンス特性の分析
- [ ] UI/UX の特徴調査

### **Phase 3: 技術的差分分析**

- [ ] LichtBlick標準機能との比較
- [ ] 独自実装の技術的優位性・課題の特定
- [ ] 移行可能性の評価

## 🔍 調査手順・方法論

### **Step 1: コードベース調査**

#### 1.1 関連ファイルの特定

```bash
# 複数MCAPに関連するファイルを検索
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l -i "multiple.*mcap\|multi.*mcap"
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l -i "複数.*mcap\|マルチ.*mcap"

# ファイル選択・読み込み関連の検索
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l -i "file.*select\|mcap.*load"

# データソース関連の検索
find . -name "*DataSource*" -o -name "*Player*" | grep -v node_modules
```

#### 1.2 Git履歴からの独自実装特定

```bash
# 独自実装のコミット履歴を調査
git log --oneline --grep="mcap" -i --since="2024-01-01"
git log --oneline --grep="複数\|マルチ\|multiple" -i --since="2024-01-01"

# LichtBlick標準実装以外のコミットを特定
git log --oneline --author="社内開発者名" --grep="mcap" -i
```

#### 1.3 依存関係の調査

```bash
# package.json での独自依存関係
grep -r "mcap\|multi.*file" package.json yarn.lock

# インポート関係の調査
find . -name "*.ts" -o -name "*.tsx" | xargs grep -n "import.*mcap\|from.*mcap"
```

### **Step 2: 機能仕様調査**

#### 2.1 UI/UX の調査

**調査項目**:

- [ ] ファイル選択インターフェース
- [ ] 複数ファイル表示方法
- [ ] 再生制御の仕様
- [ ] エラーハンドリングの方法

**調査方法**:

```bash
# UI関連ファイルの検索
find . -path "*/components/*" -name "*.tsx" | xargs grep -l -i "mcap\|file.*select"
find . -path "*/screens/*" -name "*.tsx" | xargs grep -l -i "mcap\|file"

# スタイリング関連
find . -name "*.css" -o -name "*.scss" -o -name "*.styled.ts" | xargs grep -l -i "mcap\|file"
```

#### 2.2 データ処理ロジックの調査

**調査項目**:

- [ ] MCAPファイル読み込み方式
- [ ] データ統合・マージアルゴリズム
- [ ] メモリ管理戦略
- [ ] エラー処理・例外ハンドリング

**調査方法**:

```bash
# データ処理関連クラス・関数の検索
find . -name "*.ts" | xargs grep -n -A 5 -B 5 "class.*[Mm]cap\|function.*[Mm]cap"
find . -name "*.ts" | xargs grep -n -A 5 -B 5 "merge.*mcap\|combine.*mcap"
```

### **Step 3: パフォーマンス・技術分析**

#### 3.1 パフォーマンス特性

**調査項目**:

- [ ] ファイルサイズ制限
- [ ] メモリ使用量
- [ ] 処理速度・レスポンス
- [ ] 同時読み込み可能ファイル数

**調査方法**:

```typescript
// パフォーマンス関連のコード検索
// メモリ管理、バッファリング、ストリーミング処理の調査
```

#### 3.2 技術スタックの調査

**調査項目**:

- [ ] 使用ライブラリ・フレームワーク
- [ ] Worker/Threading の使用
- [ ] ストリーミング処理の有無
- [ ] キャッシュ戦略

### **Step 4: LichtBlick標準機能との比較**

#### 4.1 機能差分マッピング

**比較項目**:

- [ ] 対応ファイル形式
- [ ] UI/UXの違い
- [ ] パフォーマンス特性
- [ ] 拡張性・カスタマイズ性
- [ ] エラーハンドリング
- [ ] 国際化対応

#### 4.2 技術的アーキテクチャ比較

**比較項目**:

- [ ] データフロー設計
- [ ] 状態管理方式
- [ ] 非同期処理方式
- [ ] テスト戦略

## 📊 調査結果の整理方法

### **調査レポート構成**

```
1. 実装概要
   - 実装規模（ファイル数、行数）
   - 主要コンポーネント
   - 技術スタック

2. 機能仕様
   - サポート機能一覧
   - UI/UX特徴
   - パフォーマンス特性

3. 技術的特徴
   - アーキテクチャ設計
   - 独自実装の技術的工夫
   - 課題・制限事項

4. 標準機能との比較
   - 機能差分表
   - 技術的優位性
   - 移行の課題・リスク

5. 推奨事項
   - 継続開発 vs 移行の判断材料
   - 今後の発展方向性
```

## 🛠️ 調査ツール・コマンド集

### **ファイル検索・コード分析**

```bash
# 1. 複数MCAP関連ファイルの特定
find . -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs grep -l -i "multi.*mcap"

# 2. 独自実装クラス・関数の検索
find . -type f -name "*.ts" | xargs grep -n "class.*Multi.*Source\|class.*Multi.*Player"

# 3. 設定ファイルの調査
find . -name "*.json" -o -name "*.config.*" | xargs grep -l "mcap"

# 4. テストファイルの調査
find . -path "*/test/*" -o -path "*/__tests__/*" -o -name "*.test.*" | xargs grep -l "mcap"
```

### **Git履歴分析**

```bash
# 1. 独自実装コミットの特定
git log --oneline --all --grep="mcap" --since="2024-01-01"

# 2. 特定ファイルの変更履歴
git log --oneline --follow -- "path/to/mcap/related/file.ts"

# 3. 差分の詳細確認
git show <commit-hash> --stat
git show <commit-hash> --name-only
```

### **依存関係・パッケージ分析**

```bash
# 1. MCAP関連パッケージの確認
npm list | grep mcap
yarn list | grep mcap

# 2. 独自パッケージの特定
grep -r "\"name\":" package.json | grep -v node_modules
```

## ⏰ 調査スケジュール（推奨）

| フェーズ     | 期間  | 成果物                       |
| ------------ | ----- | ---------------------------- |
| **Phase 1**  | 1-2日 | 実装箇所マップ、ファイル一覧 |
| **Phase 2**  | 2-3日 | 機能仕様書、UI/UX分析        |
| **Phase 3**  | 2-3日 | 技術分析書、比較表           |
| **総合分析** | 1日   | 調査レポート、質問リスト     |

## 🎯 調査成功の指標

### **達成すべき理解レベル**

- [ ] 独自実装の全体像を把握できている
- [ ] LichtBlick標準機能との具体的差分を説明できる
- [ ] 独自実装の技術的優位性・課題を特定できている
- [ ] 移行可能性とコスト・リスクを評価できている
- [ ] 上司への質問で建設的な議論ができる材料が揃っている

## 📚 参考資料

- [LichtBlick複数MCAP機能実装詳細](./multi-mcap-playback-implementation.md)
- [LichtBlick複数MCAP機能履歴](./multi-mcap-feature-history.md)
- [上司確認用質問ドキュメント](./multi-mcap-implementation-inquiry.md)

---

**作成日**: 2025年1月
**目的**: 独自実装の体系的調査
**対象**: 技術調査担当者
**更新予定**: 調査進捗に応じて随時更新
