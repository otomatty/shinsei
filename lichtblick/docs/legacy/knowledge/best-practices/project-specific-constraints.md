# プロジェクト固有の制約と代替手法 🚫

## 📋 概要

このドキュメントでは、当プロジェクトで採用している特定の制約と、その理由、そして推奨される代替手法について詳しく説明します。

## 🔄 Promise.race の制限と代替手法

### 1. なぜ Promise.race が禁止されているのか？

```typescript
// ❌ Promise.race の問題点
async function fetchUserData(userId: string) {
  try {
    const result = await Promise.race([
      fetch(`/api/users/${userId}`),
      fetch(`/api/users/${userId}/cache`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
    ]);

    return result;
  } catch (error) {
    // どの Promise がエラーになったのかわからない
    console.error("Failed to fetch user data:", error);
    throw error;
  }
}
```

**Promise.race の問題点**

1. **結果の識別困難**: どの Promise が完了したかわからない
2. **エラーハンドリング複雑**: どの Promise がエラーになったか特定できない
3. **型推論の問題**: 戻り値の型が不正確になりやすい
4. **デバッグ困難**: 競合状態のデバッグが困難
5. **リソースリーク**: 完了しなかった Promise が継続実行される可能性

### 2. @lichtblick/den/async の race 使用

```typescript
// ✅ @lichtblick/den/async の race
import { race } from "@lichtblick/den/async";

async function fetchUserData(userId: string) {
  try {
    const result = await race([
      {
        name: "primary",
        promise: fetch(`/api/users/${userId}`),
      },
      {
        name: "cache",
        promise: fetch(`/api/users/${userId}/cache`),
      },
      {
        name: "timeout",
        promise: new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
      },
    ]);

    // 完了した Promise を明確に識別
    console.log(`Data fetched from: ${result.winner}`);
    return result.value;
  } catch (error) {
    // エラーになった Promise を特定可能
    console.error(`Failed to fetch from ${error.source}:`, error);
    throw error;
  }
}
```

**@lichtblick/den/async の race の利点**

1. **明確な識別**: どの Promise が完了したかを明確に識別
2. **型安全性**: 戻り値の型が正確
3. **エラートレーサビリティ**: エラーの発生源を特定可能
4. **デバッグ支援**: 競合状態の分析が容易
5. **統一API**: プロジェクト全体で一貫したAPI

### 3. race の実践的な使用例

```typescript
// ✅ タイムアウト付きAPI呼び出し
import { race } from "@lichtblick/den/async";

async function fetchWithTimeout<T>(url: string, timeoutMs: number = 10000): Promise<T> {
  const result = await race([
    {
      name: "fetch",
      promise: fetch(url).then((response) => response.json()),
    },
    {
      name: "timeout",
      promise: new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), timeoutMs),
      ),
    },
  ]);

  if (result.winner === "timeout") {
    throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
  }

  return result.value;
}

// ✅ 複数データソースからの取得
async function fetchUserFromMultipleSources(userId: string) {
  const result = await race([
    {
      name: "database",
      promise: fetchUserFromDatabase(userId),
    },
    {
      name: "cache",
      promise: fetchUserFromCache(userId),
    },
    {
      name: "api",
      promise: fetchUserFromAPI(userId),
    },
  ]);

  // データソースに応じた処理
  switch (result.winner) {
    case "cache":
      console.log("Served from cache (fastest)");
      break;
    case "database":
      console.log("Served from database");
      break;
    case "api":
      console.log("Served from external API");
      break;
  }

  return result.value;
}
```

## ⚛️ ReactNull の使用理由

### 1. なぜ React では null を使うのか？

```typescript
// ✅ React refs での null 使用
import { ReactNull } from "@lichtblick/suite-base/types";

function MyComponent() {
  const divRef = useRef<HTMLDivElement | ReactNull>(ReactNull);
  const buttonRef = useRef<HTMLButtonElement | ReactNull>(ReactNull);

  useEffect(() => {
    if (divRef.current) {
      // DOM操作
      divRef.current.focus();
    }
  }, []);

  return (
    <div ref={divRef}>
      <button ref={buttonRef}>Click me</button>
    </div>
  );
}
```

**React で null を使う理由**

1. **React API 設計**: React の ref API は初期値として null を期待
2. **DOM要素の性質**: マウント前の DOM 要素は存在しない（null）
3. **公式ドキュメント**: React の公式ドキュメントでも null を推奨
4. **型互換性**: React.RefObject<T> 型との互換性

### 2. 通常は undefined を使う理由

```typescript
// ✅ 通常の型定義では undefined
interface User {
  id: string;
  name: string;
  email?: string; // undefined または string
}

function getUser(id: string): User | undefined {
  // ユーザーが見つからない場合は undefined を返す
  const user = users.find((u) => u.id === id);
  return user; // undefined または User
}

// ✅ 使用時の安全な処理
const user = getUser("123");
if (user !== undefined) {
  console.log(user.name);
}

// ✅ Optional chaining
console.log(user?.name);
console.log(user?.email?.toLowerCase());
```

**undefined を優先する理由**

1. **JavaScript の自然な動作**: 初期化されていない変数は undefined
2. **Optional chaining**: `?.` 演算子が undefined を前提に設計
3. **一貫性**: JavaScript エンジンの動作と一致
4. **パフォーマンス**: undefined の方が僅かに高速

## 🎨 禁止されるスタイリング方法

### 1. sx プロパティの問題点

```typescript
// ❌ sx プロパティの問題
import { Box, Paper } from "@mui/material";

function BadStylingExample() {
  return (
    <div>
      {/* 毎回新しいスタイルオブジェクトが生成される */}
      <Box
        sx={{
          padding: 2,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': {
            backgroundColor: 'primary.dark',
          },
        }}
      >
        Content 1
      </Box>

      {/* 同じスタイルでも再利用できない */}
      <Paper
        sx={{
          padding: 2,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': {
            backgroundColor: 'primary.dark',
          },
        }}
      >
        Content 2
      </Paper>
    </div>
  );
}
```

**sx プロパティの問題点**

1. **パフォーマンス**: 毎回新しいスタイルオブジェクトが生成される
2. **再利用性**: 同じスタイルを他のコンポーネントで再利用困難
3. **保守性**: スタイルの変更が複数箇所に散らばる
4. **型安全性**: スタイルの型チェックが不完全
5. **バンドルサイズ**: 実行時にスタイル生成するためオーバーヘッド

### 2. 推奨される tss-react/mui の使用

```typescript
// ✅ tss-react/mui を使用
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles()((theme) => ({
  container: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  },
}));

function GoodStylingExample() {
  const { classes } = useStyles();

  return (
    <div>
      {/* スタイルが再利用される */}
      <div className={classes.container}>
        Content 1
      </div>
      <div className={classes.container}>
        Content 2
      </div>
    </div>
  );
}
```

**tss-react/mui の利点**

1. **パフォーマンス**: スタイルが一度だけ生成され、再利用される
2. **型安全性**: TypeScript による完全な型チェック
3. **保守性**: スタイルが一箇所に集約される
4. **再利用性**: 他のコンポーネントでスタイルを共有可能
5. **開発者体験**: 優れた IntelliSense とエラー検出

### 3. その他の禁止されるスタイリング方法

```typescript
// ❌ @emotion/styled
import styled from "@emotion/styled";

const StyledDiv = styled.div`
  padding: 16px;
  background-color: blue;
`;

// ❌ @mui/material の styled
import { styled } from "@mui/material/styles";

const StyledComponent = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
}));

// ❌ Box コンポーネント
import { Box } from "@mui/material";

function BadExample() {
  return <Box p={2}>Content</Box>;
}
```

**これらが禁止される理由**

1. **一貫性の欠如**: 複数のスタイリング方法が混在
2. **学習コスト**: チームメンバーが複数の方法を覚える必要
3. **保守困難**: スタイルの場所が散らばる
4. **パフォーマンス**: 最適化されていない

## 📝 コンソール出力の制限

### 1. 禁止されるコンソール出力

```typescript
// ❌ 禁止されるコンソール出力
function badLogging() {
  console.log("ユーザーデータ:", userData); // 禁止
  console.info("処理が完了しました"); // 禁止

  // 本番環境でも出力され続ける
  // デバッグ情報が残る
  // パフォーマンスに影響
}
```

**なぜ console.log が禁止されているのか？**

1. **本番環境汚染**: 本番環境でもコンソールに出力される
2. **セキュリティリスク**: 機密情報が漏洩する可能性
3. **パフォーマンス**: 大量のログがパフォーマンスに影響
4. **メンテナンス性**: デバッグコードが残り続ける
5. **プロフェッショナリズム**: 開発者向けログがエンドユーザーに見える

### 2. 許可されるコンソール出力

```typescript
// ✅ 許可されるコンソール出力
function goodLogging() {
  // 警告（ユーザーが知るべき問題）
  console.warn("API のレスポンスが遅延しています");

  // エラー（エラー追跡に必要）
  console.error("データの保存に失敗しました:", error);

  // デバッグ（開発時のみ有効）
  console.debug("内部状態:", debugInfo);

  // アサーション（条件チェック）
  console.assert(user.id, "ユーザーIDが必要です");
}
```

**許可される理由**

1. **console.warn**: ユーザーに警告すべき状況
2. **console.error**: エラートラッキングに必要
3. **console.debug**: 開発時のみ有効（本番では無効化可能）
4. **console.assert**: 条件チェックとデバッグ支援

### 3. 適切なログ管理

```typescript
// ✅ 適切なログ管理の実装
import { logger } from "@lichtblick/suite-base/logger";

function properLogging() {
  // 開発時のみ有効なログ
  if (process.env.NODE_ENV === "development") {
    logger.debug("開発者向け情報:", debugData);
  }

  // 本番でも必要なエラーログ
  try {
    riskyOperation();
  } catch (error) {
    logger.error("処理中にエラーが発生:", error);
    // エラートラッキングサービスにも送信
    errorTracker.captureException(error);
  }

  // ユーザーに知らせるべき警告
  if (isDeprecatedFeature) {
    logger.warn("この機能は非推奨です。新しい機能をご利用ください。");
  }
}
```

## 📝 TODO/FIXME コメントの禁止

### 1. なぜ TODO コメントが問題なのか？

```typescript
// ❌ 問題のある TODO コメント
function processUserData(userData: UserData) {
  // TODO: バリデーション処理を追加
  // TODO: エラーハンドリングを改善
  // FIXME: この部分にバグがある
  // HACK: 暫定的な対応

  return processData(userData);
}
```

**TODO コメントの問題点**

1. **曖昧性**: 何をすべきかが具体的でない
2. **責任の不明確**: 誰が対応すべきかわからない
3. **優先度不明**: いつまでに対応すべきかわからない
4. **追跡困難**: TODO が蓄積し、管理できなくなる
5. **品質低下**: 未完成コードが残り続ける

### 2. 推奨される代替手法

```typescript
// ✅ GitHub Issue への言及
function processUserData(userData: UserData) {
  // See: https://github.com/lichtblick-suite/lichtblick/issues/123
  // バリデーション機能の実装方針が決定次第、対応予定
  // 担当: @username, 期限: 2024-02-15

  // See: https://github.com/lichtblick-suite/lichtblick/issues/124
  // エラーハンドリングの改善案についてチームで議論中

  return processData(userData);
}

// ✅ 明確な実装方針
function calculateMetrics(data: MetricData[]) {
  // 現在の実装は基本的な計算のみ対応
  // 高度な統計処理については Issue #125 で検討中
  // https://github.com/lichtblick-suite/lichtblick/issues/125

  return data.reduce((sum, item) => sum + item.value, 0);
}
```

**推奨される代替手法**

1. **GitHub Issue 作成**: 具体的なタスクとして管理
2. **責任者明確化**: 担当者と期限を明記
3. **議論の場**: Issue でチーム議論を実施
4. **進捗追跡**: Project board で進捗管理
5. **優先度設定**: ラベルで優先度を設定

### 3. Issue 管理のベストプラクティス

```typescript
// ✅ 適切な Issue 管理の例

// コメント例
function complexCalculation(input: ComplexInput) {
  // アルゴリズム最適化について検討中
  // Issue: https://github.com/lichtblick-suite/lichtblick/issues/456
  //
  // 現在の実装：O(n²) の時間複雑度
  // 提案された改善：O(n log n) のアルゴリズム
  //
  // 検討事項：
  // - メモリ使用量とのトレードオフ
  // - 小さなデータセットでの性能
  // - 実装の複雑さ

  return currentImplementation(input);
}
```

**Issue 作成時の項目**

1. **タイトル**: 簡潔で具体的な説明
2. **説明**: 現状の問題と期待される結果
3. **担当者**: 責任者の明確化
4. **ラベル**: 種類（bug/feature/enhancement）と優先度
5. **マイルストーン**: 対応予定時期
6. **関連Issue**: 関連する他のIssueへのリンク

## 🎯 まとめ

### プロジェクト固有制約の理由

1. **品質向上**: 一貫した高品質なコードベース
2. **保守性**: 長期的な保守性とスケーラビリティ
3. **チーム協調**: チーム全体での統一された開発体験
4. **パフォーマンス**: 最適化されたパフォーマンス
5. **セキュリティ**: セキュリティリスクの最小化

### 実践チェックリスト

- [ ] Promise.race の代わりに @lichtblick/den/async の race を使用
- [ ] React refs には ReactNull を使用
- [ ] sx プロパティではなく tss-react/mui を使用
- [ ] console.log/info の代わりに適切なログレベルを使用
- [ ] TODO コメントの代わりに GitHub Issue を作成
- [ ] 制約の理由を理解して適切な代替手法を選択

これらの制約は、一見面倒に思えるかもしれませんが、長期的なプロジェクトの成功と品質向上のために重要な要素です。
