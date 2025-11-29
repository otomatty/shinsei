# プロジェクト構造とアーキテクチャ基礎知識 🏗️

## 📋 概要

このドキュメントでは、プロジェクトの構造設計、ファイル命名規則、コンポーネントの配置戦略について、なぜその方法を採用しているのかを説明します。

## 📁 ファイル・ディレクトリ命名規則

### 1. なぜ命名規則が重要なのか？

```typescript
// ❌ 命名規則がない場合の問題
components/
├── userprofile.tsx        // 小文字
├── User_Profile.tsx       // スネークケース
├── UserProfile.tsx        // パスカルケース
├── userProfile.tsx        // キャメルケース
└── User-Profile.tsx       // ケバブケース
```

**問題点**

1. **認知負荷**: どの命名規則を使うか毎回迷う
2. **チーム連携**: メンバーによってファイル名が異なる
3. **検索困難**: 規則性がないため目的のファイルを見つけにくい
4. **大文字小文字問題**: OSによって同じファイル名が異なる扱いになる

### 2. 採用している命名規則

```typescript
// ✅ 統一された命名規則
src/
├── components/
│   ├── UserProfile.tsx           # コンポーネント（パスカルケース）
│   ├── UserProfile.test.tsx      # テストファイル
│   ├── UserProfile.stories.tsx   # Storybookファイル
│   └── UserProfile.style.ts      # スタイルファイル
├── hooks/
│   ├── useUserData.ts           # フック（キャメルケース + use接頭辞）
│   └── useUserData.test.ts      # フックテスト
├── utils/
│   ├── formatDate.ts            # ユーティリティ（キャメルケース）
│   └── formatDate.test.ts       # ユーティリティテスト
└── types/
    └── user.ts                  # 型定義（キャメルケース）
```

**なぜこの命名規則なのか？**

#### コンポーネント: パスカルケース（UserProfile.tsx）

```typescript
// ✅ パスカルケース
import { UserProfile } from "./UserProfile";

// React コンポーネント名とファイル名が一致
function UserProfile() {
  return <div>User Profile</div>;
}
```

**理由**

1. **React慣例**: Reactコンポーネント名はパスカルケースが標準
2. **一貫性**: ファイル名とコンポーネント名が一致
3. **可読性**: 単語の境界が明確

#### フック: use接頭辞 + キャメルケース（useUserData.ts）

```typescript
// ✅ use接頭辞
function useUserData(userId: string) {
  // フックの実装
}

// ファイル名: useUserData.ts
```

**理由**

1. **React慣例**: フックは必ずuse接頭辞が必要
2. **識別性**: ファイル名を見ただけでフックと分かる
3. **ツール連携**: ESLintのreact-hooks/rules-of-hooksが適切に機能

#### ユーティリティ: キャメルケース（formatDate.ts）

```typescript
// ✅ キャメルケース
export function formatDate(date: Date): string {
  // 実装
}

// ファイル名: formatDate.ts
```

**理由**

1. **JavaScript慣例**: 関数名はキャメルケースが標準
2. **一貫性**: ファイル名と関数名が一致
3. **可読性**: 小文字開始で謙虚な印象

### 3. テストファイルの命名

```typescript
// ✅ テストファイル命名規則
UserProfile.tsx
UserProfile.test.tsx        # 単体テスト
UserProfile.stories.tsx     # Storybook

formatDate.ts
formatDate.test.ts          # 単体テスト

useUserData.ts
useUserData.test.ts         # フックテスト
```

**なぜこの規則なのか？**

1. **関連性**: テスト対象ファイルとの関連が明確
2. **並列配置**: エディタでファイルが隣り合って表示される
3. **自動検出**: Jest設定で`*.test.ts`パターンで自動検出

## 🏗️ コンポーネントの配置戦略

### 1. 単一ファイル vs ディレクトリ構成

```typescript
// ✅ 単一ファイル構成（シンプルなコンポーネント）
components/
├── Button.tsx
├── Button.test.tsx
├── Input.tsx
├── Input.test.tsx
└── Icon.tsx

// ✅ ディレクトリ構成（複雑なコンポーネント）
components/
├── UserProfile/
│   ├── index.tsx              # メインコンポーネント
│   ├── UserProfile.test.tsx   # テスト
│   ├── UserProfile.stories.tsx # Storybook
│   ├── types.ts               # 型定義
│   ├── hooks.ts               # 専用フック
│   └── utils.ts               # 専用ユーティリティ
└── Dashboard/
    ├── index.tsx
    ├── components/            # 子コンポーネント
    │   ├── MetricCard.tsx
    │   └── ChartWidget.tsx
    └── types.ts
```

**どちらを選ぶか？**

#### 単一ファイル構成を選ぶべき場合

```typescript
// ✅ シンプルなコンポーネント
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

function Button({ children, onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

export { Button };
```

**条件**

1. **50行以下**: コンポーネントが小さい
2. **専用ファイル不要**: 専用の型定義やフックが不要
3. **再利用性高**: 他のコンポーネントから頻繁に使用される

#### ディレクトリ構成を選ぶべき場合

```typescript
// ✅ 複雑なコンポーネント
// UserProfile/index.tsx
import { UserProfileHeader } from "./components/UserProfileHeader";
import { UserProfileContent } from "./components/UserProfileContent";
import { useUserProfileData } from "./hooks";
import type { UserProfileProps } from "./types";

function UserProfile({ userId }: UserProfileProps) {
  const { user, loading, error } = useUserProfileData(userId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <UserProfileHeader user={user} />
      <UserProfileContent user={user} />
    </div>
  );
}

export { UserProfile };
```

**条件**

1. **100行以上**: コンポーネントが大きい
2. **専用ファイル必要**: 専用の型定義、フック、ユーティリティが必要
3. **子コンポーネント**: 複数の子コンポーネントを持つ
4. **業務ドメイン**: 特定の業務ドメインに特化

### 2. index.tsx の使用方法

```typescript
// ✅ index.tsx の適切な使用
// components/UserProfile/index.tsx
export { UserProfile } from "./UserProfile";
export type { UserProfileProps } from "./types";

// 使用側
import { UserProfile } from "@/components/UserProfile";
```

**なぜ index.tsx を使うのか？**

1. **インポート簡略化**: ディレクトリ名だけでインポート可能
2. **公開API明確化**: どの要素が外部に公開されているか明確
3. **リファクタリング容易**: 内部構造変更時の影響範囲を限定

## 📦 インポート規約

### 1. インポート順序

```typescript
// ✅ 推奨インポート順序
// 1. Node.js 標準ライブラリ
import { readFile } from "fs/promises";
import { join } from "path";

// 2. 外部ライブラリ
import React, { useState, useEffect } from "react";
import { Button, TextField } from "@mui/material";
import { format } from "date-fns";

// 3. 内部ライブラリ（@lichtblick）
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks";
import { Panel } from "@lichtblick/suite-base/components/Panel";

// 4. 相対インポート
import { UserProfileHeader } from "./components/UserProfileHeader";
import { useUserProfileData } from "./hooks";
import type { UserProfileProps } from "./types";
```

**なぜこの順序なのか？**

1. **依存関係階層**: 外部依存から内部依存へ
2. **変更頻度**: 変更頻度が低いものから高いものへ
3. **可読性**: 関連するインポートがグループ化される
4. **自動整理**: ESLintの設定と一致

### 2. 絶対パス vs 相対パス

```typescript
// ✅ 絶対パス（@lichtblick/suite-base からの参照）
import { Panel } from "@lichtblick/suite-base/components/Panel";
import { useAppConfiguration } from "@lichtblick/suite-base/hooks";

// ✅ 相対パス（同一ディレクトリ内）
import { UserProfileHeader } from "./components/UserProfileHeader";
import { helper } from "./utils/helper";

// ❌ 長い相対パス（避ける）
import { Panel } from "../../../components/Panel";
import { useAppConfiguration } from "../../../../hooks/useAppConfiguration";
```

**なぜ絶対パスを優先するのか？**

#### 絶対パスの利点

1. **可読性**: ファイルの場所が明確
2. **保守性**: ファイル移動時の影響が少ない
3. **一貫性**: どこから参照しても同じインポート文
4. **IDE支援**: 自動補完やジャンプ機能が正確

#### 相対パスを使う場合

```typescript
// ✅ 同一ディレクトリ内の場合のみ
components/UserProfile/
├── index.tsx
├── UserProfileHeader.tsx
└── utils.ts

// index.tsx
import { UserProfileHeader } from "./UserProfileHeader";  // OK
import { helper } from "./utils";                         // OK
```

**条件**

1. **同一ディレクトリ**: 同じディレクトリ内のファイル
2. **密結合**: 強く関連するファイル同士
3. **移動一体**: 一緒に移動する可能性が高い

## 🔗 依存関係管理

### 1. 内部ライブラリの使用理由

```typescript
// ✅ 内部ライブラリの使用
import { race } from "@lichtblick/den/async";
import { formatByteSize } from "@lichtblick/den/format";

// ❌ 標準ライブラリの直接使用（一部制限）
const result = await Promise.race([promise1, promise2]); // ESLintエラー
```

**なぜ内部ライブラリを使うのか？**

#### @lichtblick/den/async の race

```typescript
// ❌ Promise.race の問題
const result = await Promise.race([fetchUserData(), fetchUserPreferences()]);
// どちらが完了したかわからない
// エラーハンドリングが困難
// 型推論が不正確

// ✅ @lichtblick/den/async の race
import { race } from "@lichtblick/den/async";

const result = await race([fetchUserData(), fetchUserPreferences()]);
// 完了した Promise と結果を明確に識別
// 統一されたエラーハンドリング
// 正確な型推論
```

**理由**

1. **型安全性**: より良い型推論
2. **エラーハンドリング**: 統一されたエラー処理
3. **デバッグ容易性**: どの Promise が完了したかを明確に識別
4. **保守性**: プロジェクト全体で統一されたAPI

### 2. 外部ライブラリの選択基準

```typescript
// ✅ 承認済みライブラリの使用
import { format } from "date-fns"; // 日付処理
import { debounce } from "lodash-es"; // ユーティリティ
import { Button } from "@mui/material"; // UI コンポーネント

// ❌ 未承認ライブラリの使用
import moment from "moment"; // 廃止予定
import _ from "lodash"; // 重い（lodash-es を使用）
```

**選択基準**

1. **アクティブメンテナンス**: 定期的な更新がある
2. **型定義**: TypeScript サポートが充実
3. **パフォーマンス**: バンドルサイズが適切
4. **セキュリティ**: 脆弱性報告に迅速対応
5. **チーム合意**: チーム内での合意形成

## 📚 実践的な例

### 大規模コンポーネントの構成例

```typescript
// ✅ 大規模コンポーネントの理想的な構成
src/components/Dashboard/
├── index.tsx                    # 公開API
├── Dashboard.tsx                # メインコンポーネント
├── Dashboard.test.tsx           # テスト
├── Dashboard.stories.tsx        # Storybook
├── types.ts                     # 型定義
├── hooks/                       # 専用フック
│   ├── useDashboardData.ts
│   └── useDashboardData.test.ts
├── components/                  # 子コンポーネント
│   ├── MetricCard/
│   │   ├── index.tsx
│   │   ├── MetricCard.tsx
│   │   └── MetricCard.test.tsx
│   └── ChartWidget/
│       ├── index.tsx
│       ├── ChartWidget.tsx
│       └── ChartWidget.test.tsx
└── utils/                       # 専用ユーティリティ
    ├── calculateMetrics.ts
    └── calculateMetrics.test.ts
```

**この構成の利点**

1. **関心の分離**: 機能ごとにファイルが分離
2. **テスト容易性**: 各レイヤーを個別にテスト可能
3. **再利用性**: 子コンポーネントを他で再利用可能
4. **保守性**: 変更の影響範囲を限定

## 🎯 まとめ

### 設計原則

1. **一貫性**: チーム全体で統一されたルール
2. **可読性**: 意図が明確に伝わる構造
3. **保守性**: 変更や拡張が容易
4. **テスト容易性**: 適切なテストが書ける構造

### 実践チェックリスト

- [ ] ファイル名が命名規則に従っている
- [ ] インポート順序が正しい
- [ ] 絶対パス・相対パスを適切に使い分けている
- [ ] コンポーネントサイズに応じた配置戦略を選択している
- [ ] 内部ライブラリを適切に使用している
- [ ] テストファイルが適切に配置されている

これらの原則に従うことで、新しいチームメンバーでも迷わずに開発を進められる、保守性の高いプロジェクト構造を維持できます。
