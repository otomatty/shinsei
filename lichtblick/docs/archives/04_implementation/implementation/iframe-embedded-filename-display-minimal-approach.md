# iframe埋め込み時のファイル名表示機能 - 最小変更アプローチ

## 🎯 目的

**既存コードへの変更を最小限に抑える**ことを最優先に、iframe埋め込み時にファイル名のみを表示する機能を実装します。

---

## 📊 変更量の比較

### 従来のアプローチ（アプローチ3）

- **新規ファイル**: 4個（約410行）
- **修正ファイル**: 1個（2行）
- **テストファイル**: 2個（約230行）

### 最小変更アプローチ（推奨）

- **新規ファイル**: 1個（約30行）
- **修正ファイル**: 1個（3行）
- **テストファイル**: 1個（約60行）

**削減率: 約85%の削減** ✨

---

## 🔧 実装方法

### ファイル構成

```
packages/suite-base/src/util/
└── displayNameForUrl.ts  ← 新規作成（1ファイルのみ）
    └── displayNameForUrl.test.ts  ← テスト

packages/suite-base/src/dataSources/
└── RemoteDataSourceFactory.tsx  ← 修正（3行のみ）
```

---

## 💻 実装内容

### 1. 新規ファイル: displayNameForUrl.ts

**場所**: `packages/suite-base/src/util/displayNameForUrl.ts`

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import path from "path";

/**
 * URLからAppBar表示用の名前を生成
 *
 * iframe内で実行されている場合はファイル名のみを返し、
 * 通常のブラウザ実行時はURL全体を返します。
 *
 * @param url - リモートファイルのURL
 * @returns 表示用の名前
 */
export function getDisplayNameForUrl(url: string): string {
  // iframe検出: window.self !== window.top
  // クロスオリジンの場合、window.topアクセスで例外が発生するのでtry-catch
  let isEmbedded = false;
  try {
    isEmbedded = window.self !== window.top;
  } catch {
    isEmbedded = true; // クロスオリジンiframe = 埋め込み
  }

  // 通常実行時はURL全体を返す
  if (!isEmbedded) {
    return url;
  }

  // iframe内ではファイル名のみを返す
  try {
    const urlObject = new URL(url);
    const filename = path.basename(urlObject.pathname);
    return filename || url; // ファイル名が取得できない場合はURL
  } catch {
    return url; // パース失敗時はURL
  }
}

/**
 * 複数URLからカンマ区切りの表示名を生成
 *
 * @param urls - URL配列
 * @returns カンマ区切りの表示名
 */
export function getDisplayNamesForUrls(urls: string[]): string {
  return urls.map(getDisplayNameForUrl).join(", ");
}
```

**行数: 約50行（コメント含む）**

---

### 2. テストファイル: displayNameForUrl.test.ts

**場所**: `packages/suite-base/src/util/displayNameForUrl.test.ts`

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { getDisplayNameForUrl, getDisplayNamesForUrls } from "./displayNameForUrl";

describe("displayNameForUrl", () => {
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe("getDisplayNameForUrl", () => {
    it("通常のウィンドウではURL全体を返す", () => {
      Object.defineProperty(global.window, "self", { value: global.window, configurable: true });
      Object.defineProperty(global.window, "top", { value: global.window, configurable: true });

      const url = "https://example.com/data/file.mcap";
      expect(getDisplayNameForUrl(url)).toBe(url);
    });

    it("iframe内ではファイル名のみを返す", () => {
      Object.defineProperty(global.window, "self", { value: global.window, configurable: true });
      Object.defineProperty(global.window, "top", { value: {}, configurable: true });

      const url = "https://example.com/data/file.mcap";
      expect(getDisplayNameForUrl(url)).toBe("file.mcap");
    });

    it("クエリパラメータ付きURLからファイル名を抽出", () => {
      Object.defineProperty(global.window, "self", { value: global.window, configurable: true });
      Object.defineProperty(global.window, "top", { value: {}, configurable: true });

      const url = "https://example.com/data/file.mcap?token=abc";
      expect(getDisplayNameForUrl(url)).toBe("file.mcap");
    });
  });

  describe("getDisplayNamesForUrls", () => {
    it("複数URLをカンマ区切りで返す", () => {
      Object.defineProperty(global.window, "self", { value: global.window, configurable: true });
      Object.defineProperty(global.window, "top", { value: {}, configurable: true });

      const urls = ["https://example.com/file1.mcap", "https://example.com/file2.mcap"];
      expect(getDisplayNamesForUrls(urls)).toBe("file1.mcap, file2.mcap");
    });
  });
});
```

**行数: 約60行**

---

### 3. 修正ファイル: RemoteDataSourceFactory.tsx

**場所**: `packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx`

**修正箇所**: 3行のみ

```typescript
// ファイル冒頭のimport文に1行追加
import { getDisplayNamesForUrls } from "@lichtblick/suite-base/util/displayNameForUrl";

// ... 既存コード（変更なし） ...

class RemoteDataSourceFactory implements IDataSourceFactory {
  // ... 既存コード（変更なし） ...

  public initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
    if (args.params?.url == undefined) {
      return;
    }
    const urls = args.params.url.split(",");

    let nextExtension: string | undefined = undefined;
    let extension = "";

    urls.forEach((url) => {
      extension = path.extname(new URL(url).pathname);
      nextExtension = checkExtensionMatch(extension, nextExtension);
    });

    const initWorker = initWorkers[extension]!;

    const source = new WorkerSerializedIterableSource({ initWorker, initArgs: { urls } });

    return new IterablePlayer({
      source,
      name: getDisplayNamesForUrls(urls), // ← この1行を変更（元: urls.join()）
      metricsCollector: args.metricsCollector,
      urlParams: { urls },
      sourceId: this.id,
      readAheadDuration: { sec: 10, nsec: 0 },
    });
  }

  // ... 残りのコード（変更なし） ...
}
```

**変更行数: 3行**

- import文追加: 1行
- `name:`プロパティ変更: 1行
- （空行調整など含めても3行程度）

---

## 🎯 実装の特徴

### ✅ メリット

1. **シンプル**: 1つのファイルに全機能を集約
2. **最小変更**: 既存コードの修正は3行のみ
3. **依存なし**: 他の新規モジュールに依存しない
4. **テスト可能**: 独立してテスト可能
5. **保守性**: 変更箇所が少なく追跡しやすい

### ⚠️ トレードオフ

1. **関数の責任**: iframe検出と表示名生成が1ファイルに混在
2. **再利用性**: iframe検出機能の単独再利用は困難

---

## 📊 データフロー

```
[ユーザーがURLでアクセス]
    ?ds=remote-file&ds.url=https://example.com/data/file.mcap
              ↓
[RemoteDataSourceFactory.initialize()]
    ├─ const urls = args.params.url.split(",")
    │
    └─ getDisplayNamesForUrls(urls)  ← 新規関数呼び出し
        ↓
    [displayNameForUrl.ts]
        ├─ window.self !== window.top ? (iframe検出)
        │   ├─ true  → path.basename(url) = "file.mcap"
        │   └─ false → url全体
        └─ return 表示名
              ↓
[IterablePlayer({ name: "file.mcap" })]
              ↓
[AppBar > DataSource で表示]
```

---

## 🚀 実装手順

### Step 1: ユーティリティファイル作成

```bash
# ファイル作成
touch packages/suite-base/src/util/displayNameForUrl.ts
touch packages/suite-base/src/util/displayNameForUrl.test.ts
```

上記のコードをコピー&ペースト

### Step 2: RemoteDataSourceFactory修正

1. import文を追加
2. `name: urls.join()` → `name: getDisplayNamesForUrls(urls)` に変更

### Step 3: テスト実行

```bash
# ユニットテスト
yarn test displayNameForUrl.test.ts

# 既存テストが壊れていないか確認
yarn test RemoteDataSourceFactory
```

### Step 4: 動作確認

```bash
# 開発サーバー起動
yarn web:serve

# 通���ブラウザでアクセス
http://localhost:8080/?ds=remote-file&ds.url=https://example.com/data/sample.mcap
# → "https://example.com/data/sample.mcap" が表示されること

# iframe埋め込みで確認
# test.html を作成してiframeでアクセス
# → "sample.mcap" が表示されること
```

---

## 📝 コミット例

```bash
# 1つのコミットで完結
git add packages/suite-base/src/util/displayNameForUrl.ts
git add packages/suite-base/src/util/displayNameForUrl.test.ts
git add packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx
git commit -m "feat: Display filename only in iframe embedded mode

- Add displayNameForUrl utility for iframe detection
- Show filename instead of full URL when embedded in iframe
- Minimal changes to existing code (3 lines modified)

Closes #XXX"
```

---

## 🔍 コードレビューポイント

### チェックリスト

- [ ] `displayNameForUrl.ts`の実装は正しいか
- [ ] iframe検出ロジックは適切か
- [ ] エラーハンドリングは十分か
- [ ] テストカバレッジは十分か
- [ ] `RemoteDataSourceFactory`の変更は最小限か
- [ ] 既存の機能を壊していないか
- [ ] 通常ブラウザとiframe両方で動作確認済みか

---

## 🐛 トラブルシューティング

### 問題: iframe内でもURL全体が表示される

**原因**: `window.self !== window.top`が正しく動作していない

**デバッグ方法**:

```typescript
// displayNameForUrl.ts内に一時的に追加
console.log("window.self:", window.self);
console.log("window.top:", window.top);
console.log("isEmbedded:", window.self !== window.top);
```

**解決策**:

- 同一オリジンiframeの場合、この判定は正常に動作
- クロスオリジンの場合、`window.top`アクセスで例外が発生し、catchブロックでtrueを返す

---

### 問題: テストが失敗する

**原因**: JSDOMでのwindowオブジェクトのモック不備

**解決策**:

```typescript
// テストファイルの先頭に追加
/**
 * @jest-environment jsdom
 */
```

---

### 問題: ファイル名が正しく抽出されない

**原因**: URLのパスにファイル名が含まれていない

**確認方法**:

```typescript
const url = "問題のURL";
console.log(new URL(url).pathname); // パスを確認
console.log(path.basename(new URL(url).pathname)); // ファイル名を確認
```

---

## 📈 将来の拡張

この最小実装をベースに、必要に応じて拡張可能：

### オプション1: URLパラメータでの制御

```typescript
// ?ds.displayMode=filename を追加
export function getDisplayNameForUrl(url: string, forceMode?: "filename" | "url"): string {
  if (forceMode === "url") return url;
  if (forceMode === "filename") {
    // ファイル名を強制的に抽出
  }
  // 既存のiframe検出ロジック
}
```

### オプション2: iframe検出を独立した関数に分離

必要になったら分離：

```typescript
// isEmbedded.ts として分離
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
```

### オプション3: 設定UIでの切り替え

Settings画面で表示モードを選択可能に：

- Always show full URL
- Show filename in embedded mode (default)
- Always show filename

---

## ✅ まとめ

### 変更内容

| 項目           | 詳細          |
| -------------- | ------------- |
| 新規ファイル   | 1個（約50行） |
| テストファイル | 1個（約60行） |
| 修正ファイル   | 1個（3行）    |
| 総変更量       | **約113行**   |

### 実装時間の目安

- ファイル作成: 10分
- テスト作成: 15分
- 動作確認: 10分
- **合計: 約35分**

### コードレビュー負荷

- 新規コード: 50行のみレビュー
- 修正コード: 3行のみレビュー
- **レビュー時間: 約10分**

---

## 🎯 推奨理由

この最小変更アプローチを推奨する理由：

1. **シンプル**: 1ファイルで完結、理解しやすい
2. **低リスク**: 既存コードへの影響が最小限
3. **メンテナンス容易**: 変更箇所が少なく追跡しやすい
4. **レビュー容易**: 短時間でレビュー可能
5. **デバッグ容易**: 問題発生時の切り分けが簡単

---

**作成日**: 2025年10月6日
**バージョン**: 1.0.0
**推奨度**: ⭐⭐⭐⭐⭐
