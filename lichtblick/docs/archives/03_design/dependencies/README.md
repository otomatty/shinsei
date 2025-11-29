# コンポーネント・ロジック依存関係ドキュメント

**対象:** 開発者・AI
**最終更新:** 2025-10-22

---

## 概要

このドキュメントは、プロジェクト内のコンポーネント・ロジック・サービス間の依存関係と繋がりを可視化・ドキュメント化するための体系的なアプローチを提供します。

---

## 1. コンポーネント依存関係図の種類

### 1.1 コンポーネントツリー図

```
フォルダ構造で親子関係を表現

src/components/
├── Layout/
│   ├── Header/
│   │   ├── Logo.tsx
│   │   ├── Navigation.tsx
│   │   │   ├── NavItem.tsx
│   │   │   └── Dropdown.tsx
│   │   └── UserMenu.tsx
│   ├── Sidebar/
│   │   └── SidebarItem.tsx
│   └── Footer.tsx
├── Form/
│   ├── Form.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   └── Button.tsx
└── DataDisplay/
    ├── Table.tsx
    ├── TableRow.tsx
    └── TableCell.tsx
```

**用途**: ファイル構造を理解したい時

---

### 1.2 依存関係グラフ（テキスト）

```
PageContainer
    ├── (uses) HeaderComponent
    │   ├── (uses) Logo
    │   ├── (uses) Navigation
    │   │   ├── (uses) NavItem
    │   │   └── (uses) DropdownMenu
    │   └── (uses) UserMenu
    │       └── (calls API) getUserProfile()
    │
    ├── (uses) MainContent
    │   ├── (uses) Table
    │   │   └── (uses) TableRow
    │   │       └── (uses) TableCell
    │   └── (calls API) fetchTableData()
    │
    └── (uses) SidebarComponent
        ├── (uses) SidebarItem
        └── (uses) Filter
            └── (calls API) getFilterOptions()
```

**用途**: 実装中に参照する、直感的に依存関係を把握

---

### 1.3 データフロー図

```
[User Input]
    ↓
[Input Component]
    ↓ validates
[Validation Logic]
    ↓ if valid
[API Call]
    ↓ fetches
[Backend Service]
    ↓ returns
[Response Handler]
    ↓ transforms
[State Management]
    ↓ updates
[Display Component]
    ↓
[UI Rendered]
```

**用途**: ユーザー操作からレンダリングまでのフロー理解

---

### 1.4 依存関係マトリックス

```markdown
| Component A | → Button | → API | → State | 説明                                            |
| ----------- | -------- | ----- | ------- | ----------------------------------------------- |
| Form        | ✓        | ✓     | ✓       | Form 内で Button を使用、API 呼び出し、状態管理 |
| Modal       | ✓        | ✗     | ✓       | Modal 内で Button を使用、状態管理のみ          |
| Header      | ✓        | ✓     | ✗       | Header 内で Button を使用、API 呼び出しあり     |
| Footer      | ✗        | ✗     | ✗       | 独立したコンポーネント                          |
```

**用途**: 複数コンポーネント間の複雑な依存関係を一覧化

---

## 2. 各コンポーネント・ロジックに記載する「参照情報」

### 2.1 .spec.md に追加する「依存関係セクション」

```markdown
# Button.spec.md

## 5. 依存関係 (Dependencies)

### 使用元コンポーネント

このコンポーネントを使用している箇所：

- `src/components/Form/Form.tsx` - フォーム送信ボタン
- `src/components/Modal/Modal.tsx` - モーダル確認ボタン
- `src/components/Header/Header.tsx` - メニュー操作ボタン

**参照**:

- docs/04_implementation/plans/form-component/
- docs/04_implementation/plans/modal-component/

### 依存しているモジュール

このコンポーネントが依存しているもの：

- `src/utils/validation/validateButton.ts` - props 検証
- `src/utils/styling/buttonStyles.ts` - スタイル定義
- `src/hooks/useButtonState.ts` - ボタン状態管理

### 外部依存関係

- React 18+
- Tailwind CSS
- @testing-library/react (テスト用)

### 相互依存コンポーネント

同じカテゴリで互いに参照するコンポーネント：

- `Input.tsx` - Form 内で Button と共に使用
- `Select.tsx` - Form 内で Button と共に使用

---
```

---

## 3. 推奨ファイル構成

```
docs/03_design/dependencies/
├── README.md                           # このファイル
├── component-dependency-graph.md       # 全コンポーネント依存関係
├── service-dependency-graph.md         # サービス・ロジック依存関係
├── data-flow-diagram.md                # データフロー全体図
└── modules/
    ├── ui-components/
    │   ├── Button-dependencies.md
    │   ├── Form-dependencies.md
    │   └── Modal-dependencies.md
    ├── services/
    │   ├── ApiClient-dependencies.md
    │   └── AuthService-dependencies.md
    └── utils/
        ├── validation-dependencies.md
        └── formatting-dependencies.md
```

---

## 4. 依存関係グラフのテキスト表現

### パターン 1: 単純な依存ツリー

```
Button (基本コンポーネント)
├── uses: buttonStyles.css
├── uses: validateProps()
└── emits: onClick event
    consumed by: Form, Modal, Header
```

### パターン 2: 複雑な依存関係

```
Form (複合コンポーネント)
├── uses: Input (複数)
├── uses: Select (複数)
├── uses: Button
├── uses: useForm() Hook
│   └── uses: validationRules
├── calls: API
│   └── submitData()
├── manages: form state
└── is used by:
    ├── UserRegistration Page
    ├── UserProfile Page
    └── EditModal
```

### パターン 3: データフロー

```
User Input
  ↓ (Component receives)
Input Component
  ↓ (calls)
Validation Logic
  ↓ (if valid)
State Management
  ↓ (triggers)
API Client
  ↓ (sends request)
Backend API
  ↓ (returns)
Response Handler
  ↓ (transforms data)
State Update
  ↓ (triggers re-render)
Display Component
```

---

## 5. 各ファイルで記載する依存情報

### 形式 1: タビュラー（表形式）

```markdown
| 観点             | 対象                 | 説明                                 |
| ---------------- | -------------------- | ------------------------------------ |
| **使用元**       | Header, Form, Modal  | このコンポーネントを使用している箇所 |
| **依存先**       | Button Styles, Utils | このコンポーネントが依存しているもの |
| **データフロー** | Props → State → UI   | データの流れ                         |
| **イベント**     | onClick, onChange    | 発火するイベント                     |
| **相互依存**     | Input, Select        | 同じ親で使用されるコンポーネント     |
```

### 形式 2: グラフ風（矢印）

```markdown
## Button 依存関係

使用者（Consumer）:
```

Form
│
├─ Button (for submit)
│
Modal
│
├─ Button (for confirm)
│
Header
│
└─ Button (for menu toggle)

```

依存先（Dependencies）:
```

Button
│
├─ buttonStyles.css
├─ validateProps() [from utils]
└─ React 18+

```

```

---

## 6. 新規コンポーネント作成チェック

### ステップ 1: 仕様書作成時

```markdown
# {Component}.spec.md 内に以下を追加

## 5. 依存関係 (Dependencies)

### 直接的な依存（このコンポーネントが必要とするもの）

- [ ] 親コンポーネント名
- [ ] 使用している子コンポーネント
- [ ] 呼び出しているロジック/ユーティリティ
- [ ] 外部ライブラリ

### 間接的な依存（親経由で影響を受けるもの）

- [ ] グローバル状態
- [ ] ContextAPI
- [ ] カスタム Hook

### このコンポーネントを使用しているもの（逆参照）

- [ ] 親コンポーネント
- [ ] 兄弟コンポーネント
- [ ] ページレベルコンポーネント
```

### ステップ 2: 依存関係ドキュメント更新

```markdown
# docs/03_design/dependencies/component-dependency-graph.md に追加

## [{ComponentName} 追加日: YYYY-MM-DD]

**ファイルパス:** `src/components/{path}/{ComponentName}.tsx`

**依存構造:**
```

{ComponentName}
├── uses: {Child1}
├── uses: {Child2}
│ └── uses: {Child2-1}
├── uses: Hook [{Hook1}]
└── called by: {Parent}

```

**影響範囲:** {number} components / {number} files
```

### ステップ 3: 検証

```markdown
- [ ] 循環依存がないか確認
- [ ] 依存の深さが適切か（3階層程度が目安）
- [ ] 不必要な依存がないか
- [ ] 関連ドキュメントに記載されているか
```

---

## 7. 依存関係の可視化ツール

### オプション 1: テキスト形式（推奨・すぐに始められる）

利点:

- ✅ 追加ツール不要
- ✅ Git で管理可能
- ✅ コードレビューしやすい
- ✅ 実装者が手動で更新（最新性が確保）

### オプション 2: Mermaid ダイアグラム

```markdown
\`\`\`mermaid
graph TD
A["App"]
A --> B["Layout"]
A --> C["Pages"]
B --> B1["Header"]
B1 --> B1_1["Button"]
B1 --> B1_2["Logo"]
\`\`\`
```

利点:

- ✅ ビジュアルが分かりやすい
- ✅ Markdown に埋め込める
- ✅ GitHub で自動レンダリング

デメリット:

- ❌ 手動更新が手間
- ❌ 複雑になると見づらい

### オプション 3: GraphQL Voyager（高度）

利点:

- ✅ インタラクティブ
- ✅ 自動更新可能

デメリット:

- ❌ セットアップ複雑
- ❌ 継続的なメンテナンス必要

**推奨**: 最初はテキスト形式で、複雑性が増したら Mermaid を検討

---

## 8. 定期チェック

### 月次（毎月末）

```bash
# 循環依存の検出
npm run lint:dependencies

# 未使用コンポーネント
npm run lint:unused

# バンドルサイズ確認
npm run analyze:bundle
```

### レビュー時

PR レビューで以下を確認:

- [ ] 新規コンポーネントの依存関係は明確か
- [ ] 循環依存が導入されていないか
- [ ] 依存ドキュメントが更新されているか
- [ ] 影響範囲が適切に理解されているか

---

## 🔗 関連ドキュメント

- [`.spec.md` テンプレート](../../rules/spec-template.md)
- [アーキテクチャ設計](./lichtblick-architecture.md)
- [データフロー](./lichtblick-dataflow.md)
- [AI ドキュメント駆動開発ガイド](../../rules/ai-documentation.md)

---

**最終更新:** 2025-10-22
**作成者:** AI (Grok Code Fast 1)
