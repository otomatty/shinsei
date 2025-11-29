# Lichtblick Documentation

このディレクトリには、Lichtblickプロジェクトのドキュメントが、ソフトウェア開発ライフサイクル（SDLC）に沿って整理されています。

**最終更新日**: 2025年10月22日

---

## 📂 ディレクトリ構造

ドキュメントは開発プロセスの各段階に応じて整理されています：

```
docs/
├── README.md                # ドキュメント全体の説明とナビゲーション
├── 00_prompts/              # Prompt（AI・開発者への指示書）
├── 01_issues/               # Issue（問題・要件管理）
│   ├── open/                # 未解決の問題
│   ├── in-progress/         # 対応中の問題
│   └── resolved/            # 解決済みの問題
├── 02_research/             # Research（技術調査・リサーチ）
│   └── YYYY_MM/             # 月別整理
├── 03_plans/                # Plan（実装計画）
│   └── {機能名}/             # 機能別ディレクトリ
├── 04_tests/                # Test（テストケース・仕様書）
│   └── {機能名}/             # 機能別ディレクトリ
├── 05_logs/                 # Log（作業ログ）
│   └── YYYY_MM/YYYYMMDD/    # 月別・日別整理
├── rules/                   # 開発規則・ガイドライン
│   ├── README.md            # ルール一覧
│   ├── ai-documentation.md  # AI ドキュメント駆動開発
│   ├── code-quality-standards.md # コード品質基準
│   ├── language-rules.md    # 言語規則
│   ├── naming-conventions.md # 命名規則
│   ├── spec-template.md     # .spec.md テンプレート
│   └── dependency-mapping.md # 依存関係追跡
└── templates/               # 全ドキュメントのテンプレート集
    ├── README.md            # テンプレート使用ガイド
    ├── prompt-template.md   # Promptテンプレート
    ├── issue-template.md    # Issueテンプレート
    ├── research-template.md # Researchテンプレート
    ├── plan-template.md     # Planテンプレート
    ├── spec-template.md     # Specテンプレート
    └── log-template.md      # Logテンプレート
```

---

## 📋 各ディレクトリの説明

### 00_prompts/ - Prompt（指示書）

**用途**: AI・開発者への明確な指示、コンテキスト提供
**内容**: プロジェクトコンテキスト、実装タスクの詳細、遵守すべきルール

参照: [`docs/rules/ai-documentation.md`](./rules/ai-documentation.md)

---

### 01_issues/ - Issue（問題・要件）

実装開始前、問題発見時に記録する問題・要件定義。

**用途**: 機能要件の定義、問題の報告、改善提案
**構成**:

- `open/` - 未解決の問題
- `in-progress/` - 対応中の問題
- `resolved/` - 解決済みの問題

**命名規則**: `YYYY_MM/YYYYMMDD_{番号}_{問題要約}.md`
**テンプレート**: [`templates/issue-template.md`](./templates/issue-template.md)

---

### 02_research/ - Research（技術調査・リサーチ）

技術選定、ベストプラクティス確認時の調査レポート。

**用途**: 技術調査、競合調査、ベンチマーク結果の記録
**構成**: 月別ディレクトリ（YYYY*MM）に整理
**命名規則**: `YYYY_MM/YYYYMMDD*{番号}\_{調査内容}.md`**テンプレート**:`templates/research-template.md`

参照: [`docs/rules/ai-documentation.md`](./rules/ai-documentation.md)

---

### 03_plans/ - Plan（実装計画）

実装の詳細な計画と段階的なステップを定義。

**用途**: 実装手順の計画、タスクの分解、進捗管理
**構成**: 機能名別のディレクトリ
**命名規則**:

- ディレクトリ: `{機能名}/`
- ファイル: `YYYYMMDD_{番号}_{説明}.md`

**テンプレート**: `templates/plan-template.md`

**主要な実装計画**:

- [`foxglove-websocket-compatibility/`](./03_plans/foxglove-websocket-compatibility/) - Foxglove Bridge v3.2.0+ との互換性対応
  - SORA（Lichtblickフォーク）としての対応戦略
  - 段階的アプローチ（パッチ→上流貢献→独自実装）
  - 詳細な実装ガイドとクイックスタート

参照: [`docs/rules/ai-documentation.md`](./rules/ai-documentation.md)

---

### 04_tests/ - Test（テストケース）

テスト駆動開発のためのテストケース定義。

**用途**: テスト計画、テストケース仕様定義
**構成**: 機能別ディレクトリ
**参照**: `src/{path}/{FileName}.spec.md` も合わせて参照

参照: [`docs/rules/spec-template.md`](./rules/spec-template.md)

---

### 05_logs/ - Log（作業ログ）

日々の作業内容を記録するログ。

**用途**: 進捗管理、学び・気づきの記録、作業履歴の追跡
**構成**: 月別（YYYY_MM）→ 日別（YYYYMMDD）に階層化
**命名規則**:

- 1日1作業: `YYYY_MM/YYYYMMDD_{説明}.md`
- 1日複数作業: `YYYY_MM/YYYYMMDD/{番号}_{説明}.md`

**テンプレート**: `templates/worklog-template.md`

参照: [`docs/rules/ai-documentation.md`](./rules/ai-documentation.md)

### rules/ - 開発規則・ガイドライン

プロジェクト全体で遵守すべき開発規則とガイドライン。

**主要ドキュメント**:

- `ai-documentation.md` - AI ドキュメント駆動開発ガイド
- `language-rules.md` - コメント・ドキュメントの言語規則
- `naming-conventions.md` - ファイル・変数・関数の命名規則
- `code-quality-standards.md` - コード品質基準
- `spec-template.md` - .spec.md 仕様書テンプレート
- `dependency-mapping.md` - 依存関係追跡ガイド

参照: [`docs/rules/README.md`](./rules/README.md)

---

### templates/ - テンプレート

各種ドキュメント作成用のテンプレート集。すべてのドキュメントテンプレートはこのディレクトリに集約されています。

**テンプレート一覧**:

- `prompt-template.md` - Prompt（AI指示書）テンプレート
- `issue-template.md` - Issue（問題・要件）テンプレート
- `research-template.md` - Research（技術調査）テンプレート
- `plan-template.md` - Plan（実装計画）テンプレート
- `spec-template.md` - Spec（仕様書）テンプレート
- `log-template.md` - Log（作業ログ）テンプレート

参照: [`docs/templates/README.md`](./templates/README.md)

## 📝 ドキュメント作成のルール

### 基本原則

1. **日本語で記述**: ドキュメントは日本語（コードのコメントは英語）
2. **テンプレートを使用**: 該当するテンプレートがあれば使用
3. **命名規則を守る**: 日付形式と番号を適切に使用
4. **関連ドキュメントにリンク**: 他のドキュメントとの関連を明示
5. **最終更新日を記載**: 情報の鮮度を明確に

### ファイル命名規則

- **日付を含む場合**: `YYYYMMDD_{番号}_{説明}.md`
- **機能名のみ**: `機能名-タイプ.md`
- **日本語ファイル名は避ける**: 検索性・互換性のため

### 必ず含めるべき項目

1. **概要**: ドキュメントの目的
2. **背景**: なぜこのドキュメントが必要か
3. **本文**: 詳細な内容
4. **関連ドキュメント**: 他のドキュメントへのリンク
5. **作成日と最終更新日**: 情報の鮮度

---
