# iframe埋め込み時のファイル名表示機能 - クイックリファレンス

## 🎯 概要

iframe内でLichtblickが実行される場合、リモートファイルのURL全体ではなく、ファイル名のみをAppBarに表示する機能です。

---

## 📊 実装フロー図

```
┌─────────────────────────────────────────────────────────────┐
│                    実装フロー                                 │
└─────────────────────────────────────────────────────────────┘

1. ユーティリティ関数の作成
   ├─ isEmbedded.ts          (iframe検出)
   ├─ getDisplayName.ts      (表示名生成)
   ├─ isEmbedded.test.ts     (テスト)
   └─ getDisplayName.test.ts (テスト)

2. RemoteDataSourceFactory修正
   └─ getDisplayNameForUrls()を使用

3. テスト & 確認
   ├─ ユニットテスト実行
   ├─ 通常ブラウザで確認
   └─ iframe埋め込みで確認
```

---

## 🔧 修正対象ファイル

### 新規作成 (4ファイル)

```
packages/suite-base/src/util/
├── isEmbedded.ts           ← iframe検出ロジック
├── getDisplayName.ts       ← 表示名生成ロジック
├── isEmbedded.test.ts      ← テスト
└── getDisplayName.test.ts  ← テスト
```

### 修正 (1ファイル)

```
packages/suite-base/src/dataSources/
└── RemoteDataSourceFactory.tsx  ← initialize()メソッドを修正
```

---

## 💻 コア実装

### 1. iframe検出

```typescript
// isEmbedded.ts
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // クロスオリジンの場合
  }
}
```

### 2. 表示名生成

```typescript
// getDisplayName.ts
export function getDisplayNameForUrl(url: string): string {
  if (!isEmbedded()) {
    return url; // 通常時: URL全体
  }

  try {
    const filename = path.basename(new URL(url).pathname);
    return filename || url;
  } catch {
    return url; // iframe内: ファイル名のみ
  }
}

export function getDisplayNameForUrls(urls: string[]): string {
  return urls.map(getDisplayNameForUrl).join(", ");
}
```

### 3. RemoteDataSourceFactory修正

```typescript
// RemoteDataSourceFactory.tsx
import { getDisplayNameForUrls } from "@lichtblick/suite-base/util/getDisplayName";

public initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
  // ... 既存のコード ...

  return new IterablePlayer({
    source,
    name: getDisplayNameForUrls(urls), // ← ここを変更
    metricsCollector: args.metricsCollector,
    urlParams: { urls },
    sourceId: this.id,
    readAheadDuration: { sec: 10, nsec: 0 },
  });
}
```

---

## 📊 データフロー

```
┌──────────────────────────────────────────────────────────────┐
│                      データフロー                             │
└──────────────────────────────────────────────────────────────┘

[ユーザーがURLでアクセス]
    ?ds=remote-file&ds.url=https://example.com/data/file.mcap
              ↓
[RemoteDataSourceFactory.initialize()]
    ├─ URLs分割: ["https://example.com/data/file.mcap"]
    ├─ isEmbedded() チェック
    │   ├─ iframe内 → true
    │   └─ 通常時 → false
    ├─ getDisplayNameForUrls(urls)
    │   ├─ iframe内 → "file.mcap"
    │   └─ 通常時 → "https://example.com/data/file.mcap"
    └─ IterablePlayer生成
              ↓
[MessagePipeline - playerState.name]
    └─ 状態として保持
              ↓
[AppBar > DataSource コンポーネント]
    ├─ useMessagePipeline(selectPlayerName)
    └─ playerName取得
              ↓
[TextMiddleTruncate]
    └─ 中央省略で表示
              ↓
[AppBar中央に表示]
    ├─ iframe内: "file.mcap"
    └─ 通常時: "https://example.com/data/file.mcap"
```

---

## 🧪 テストコマンド

```bash
# ユニットテスト実行
yarn test src/util/isEmbedded.test.ts
yarn test src/util/getDisplayName.test.ts

# ウォッチモード
yarn test --watch src/util/

# カバレッジ
yarn test --coverage src/util/
```

---

## ✅ 動作確認

### 通常ブラウザ

```bash
yarn web:serve
# http://localhost:8080/?ds=remote-file&ds.url=https://example.com/data/sample.mcap
# 期待結果: "https://example.com/data/sample.mcap" が表示
```

### iframe埋め込み

```html
<!-- test.html -->
<iframe
  src="http://localhost:8080/?ds=remote-file&ds.url=https://example.com/data/sample.mcap"
></iframe>
<!-- 期待結果: "sample.mcap" が表示 -->
```

---

## 📝 コミット例

```bash
# ユーティリティ追加
git add packages/suite-base/src/util/isEmbedded.ts
git add packages/suite-base/src/util/getDisplayName.ts
git add packages/suite-base/src/util/*.test.ts
git commit -m "feat: Add iframe embedded detection utilities"

# RemoteDataSourceFactory修正
git add packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx
git commit -m "feat: Display filename only in iframe embedded context"

# ドキュメント追加
git add docs/implementation/iframe-embedded-filename-display.md
git commit -m "docs: Add implementation guide for iframe filename display"
```

---

## 🐛 トラブルシューティング

| 問題                      | 原因                                 | 解決策                          |
| ------------------------- | ------------------------------------ | ------------------------------- |
| iframe内でもURL全体が表示 | `isEmbedded()`が正しく動作していない | `getEmbeddedInfo()`で確認       |
| ファイル名が抽出されない  | URLにファイル名が含まれていない      | `extractFilename()`で直接テスト |
| テストが失敗              | JSDOMの制限                          | `@jest-environment jsdom`を追加 |

---

## 🔗 関連ドキュメント

- **詳細実装**: [iframe-embedded-filename-display.md](./iframe-embedded-filename-display.md)
- **実装一覧**: [implementation/README.md](./README.md)
- **開発ガイド**: [../development/](../development/)

---

## 📌 チェックリスト

実装前:

- [ ] 既存コードの確認
- [ ] 設計レビュー

実装中:

- [ ] ユーティリティ関数作成
- [ ] テスト作成
- [ ] RemoteDataSourceFactory修正
- [ ] ユニットテスト実行

実装後:

- [ ] 通常ブラウザで動作確認
- [ ] iframe埋め込みで動作確認
- [ ] エッジケーステスト
- [ ] コードレビュー
- [ ] ドキュメント作成

---

**作成日**: 2025年10月6日
**最終更新**: 2025年10月6日
**バージョン**: 1.0.0
