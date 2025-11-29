# iframe埋め込み時のファイル名表示機能 - 修正版（iframe判定分離）

## 🎯 目的

**既存コードへの変更を最小限に抑える**ことを最優先に、iframe埋め込み時にファイル名のみを表示する機能を実装します。

iframe判定機能は**独立したファイル**として分離し、再利用可能な設計とします。

---

## 📊 変更量

### 修正版の構成

- **新規ファイル**: 2個（約80行）
- **修正ファイル**: 1個（3行）
- **テストファイル**: 2個（約100行）

### 内訳

| ファイル                      | 行数    | 役割               |
| ----------------------------- | ------- | ------------------ |
| `isEmbedded.ts`               | 約30行  | iframe検出（独立） |
| `displayNameForUrl.ts`        | 約50行  | 表示名生成         |
| `isEmbedded.test.ts`          | 約40行  | iframe検出テスト   |
| `displayNameForUrl.test.ts`   | 約60行  | 表示名生成テスト   |
| `RemoteDataSourceFactory.tsx` | 3行変更 | 使用側の修正       |

**総変更量: 約183行**（完全分離型の410行より約55%削減）

---

## 🔧 実装方法

### ファイル構成

```
packages/suite-base/src/util/
├── isEmbedded.ts              ← 新規（iframe判定専用）
├── isEmbedded.test.ts         ← テスト
├── displayNameForUrl.ts       ← 新規（表示名生成）
└── displayNameForUrl.test.ts  ← テスト

packages/suite-base/src/dataSources/
└── RemoteDataSourceFactory.tsx  ← 修正（3行）
```

---

## 💻 実装内容

### 1. iframe検出ファイル（独立モジュール）

**場所**: `packages/suite-base/src/util/isEmbedded.ts`

````typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * iframe埋め込み検出ユーティリティ
 *
 * Lichtblickがiframe内で実行されているかどうかを検出します。
 * この情報は、埋め込みコンテキストに応じたUI表示の最適化に使用されます。
 *
 * @example
 * ```typescript
 * import { isEmbedded } from "@lichtblick/suite-base/util/isEmbedded";
 *
 * if (isEmbedded()) {
 *   console.log("Running inside an iframe");
 * }
 * ```
 */

/**
 * Lichtblickがiframe内で実行されているかを判定
 *
 * ブラウザの`window.self`と`window.top`を比較して、
 * iframe内で実行されているかを検出します。
 *
 * @returns {boolean} iframe内で実行されている場合はtrue
 *
 * @example
 * ```typescript
 * // 通常のブラウザウィンドウで実行
 * isEmbedded(); // false
 *
 * // iframe内で実行
 * isEmbedded(); // true
 * ```
 */
export function isEmbedded(): boolean {
  try {
    // window.selfとwindow.topが異なる場合、iframe内で実行されている
    return window.self !== window.top;
  } catch {
    // クロスオリジン制限により例外が発生した場合もiframe内と判定
    // （親フレームへのアクセスが制限されている = iframe内）
    return true;
  }
}
````

**行数: 約30行（コメント含む）**

---

### 2. 表示名生成ファイル（iframe判定を利用）

**場所**: `packages/suite-base/src/util/displayNameForUrl.ts`

````typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import path from "path";

import { isEmbedded } from "./isEmbedded";

/**
 * URLからAppBar表示用の名前を生成
 *
 * iframe内で実行されている場合はファイル名のみを返し、
 * 通常のブラウザ実行時はURL全体を返します。
 *
 * @param url - リモートファイルのURL
 * @returns 表示用の名前
 *
 * @example
 * ```typescript
 * // 通常のブラウザで実行
 * getDisplayNameForUrl("https://example.com/data/file.mcap");
 * // => "https://example.com/data/file.mcap"
 *
 * // iframe内で実行
 * getDisplayNameForUrl("https://example.com/data/file.mcap");
 * // => "file.mcap"
 * ```
 */
export function getDisplayNameForUrl(url: string): string {
  // 通常実行時はURL全体を返す
  if (!isEmbedded()) {
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
 *
 * @example
 * ```typescript
 * const urls = [
 *   "https://example.com/file1.mcap",
 *   "https://example.com/file2.mcap"
 * ];
 *
 * // iframe内で実行
 * getDisplayNamesForUrls(urls);
 * // => "file1.mcap, file2.mcap"
 * ```
 */
export function getDisplayNamesForUrls(urls: string[]): string {
  return urls.map(getDisplayNameForUrl).join(", ");
}
````

**行数: 約50行（コメント含む）**

---

### 3. iframe検出テスト

**場所**: `packages/suite-base/src/util/isEmbedded.test.ts`

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { isEmbedded } from "./isEmbedded";

describe("isEmbedded", () => {
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it("通常のウィンドウで実行時はfalseを返す", () => {
    Object.defineProperty(global.window, "self", {
      value: global.window,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global.window, "top", {
      value: global.window,
      writable: true,
      configurable: true,
    });

    expect(isEmbedded()).toBe(false);
  });

  it("iframe内で実行時はtrueを返す", () => {
    const mockTopWindow = {} as Window;
    Object.defineProperty(global.window, "self", {
      value: global.window,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global.window, "top", {
      value: mockTopWindow,
      writable: true,
      configurable: true,
    });

    expect(isEmbedded()).toBe(true);
  });

  it("クロスオリジンiframeでSecurityErrorが発生した場合はtrueを返す", () => {
    Object.defineProperty(global.window, "top", {
      get() {
        throw new Error("SecurityError: Blocked a frame with origin");
      },
      configurable: true,
    });

    expect(isEmbedded()).toBe(true);
  });
});
```

**行数: 約40行**

---

### 4. 表示名生成テスト

**場所**: `packages/suite-base/src/util/displayNameForUrl.test.ts`

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { getDisplayNameForUrl, getDisplayNamesForUrls } from "./displayNameForUrl";
import * as isEmbeddedModule from "./isEmbedded";

// isEmbedded関数をモック
jest.mock("./isEmbedded");

describe("displayNameForUrl", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getDisplayNameForUrl", () => {
    describe("iframe埋め込み時", () => {
      beforeEach(() => {
        jest.spyOn(isEmbeddedModule, "isEmbedded").mockReturnValue(true);
      });

      it("MCAPファイルのURLからファイル名を抽出", () => {
        const url = "https://example.com/data/recording.mcap";
        expect(getDisplayNameForUrl(url)).toBe("recording.mcap");
      });

      it("クエリパラメータを含むURLからファイル名を抽出", () => {
        const url = "https://example.com/data/file.mcap?token=abc123";
        expect(getDisplayNameForUrl(url)).toBe("file.mcap");
      });

      it("ファイル名がない場合はURL全体を返す", () => {
        const url = "https://example.com/data/";
        expect(getDisplayNameForUrl(url)).toBe(url);
      });
    });

    describe("通常のウィンドウ実行時", () => {
      beforeEach(() => {
        jest.spyOn(isEmbeddedModule, "isEmbedded").mockReturnValue(false);
      });

      it("URL全体を返す", () => {
        const url = "https://example.com/data/recording.mcap";
        expect(getDisplayNameForUrl(url)).toBe(url);
      });
    });
  });

  describe("getDisplayNamesForUrls", () => {
    beforeEach(() => {
      jest.spyOn(isEmbeddedModule, "isEmbedded").mockReturnValue(true);
    });

    it("複数URLからファイル名をカンマ区切りで抽出", () => {
      const urls = ["https://example.com/data/file1.mcap", "https://example.com/data/file2.mcap"];
      expect(getDisplayNamesForUrls(urls)).toBe("file1.mcap, file2.mcap");
    });
  });
});
```

**行数: 約60行**

---

### 5. RemoteDataSourceFactory修正

**場所**: `packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx`

**修正箇所**: 3行

```typescript
// ファイル冒頭のimport文に1行追加（8行目付近）
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
      name: getDisplayNamesForUrls(urls), // ← 113行目: この1行を変更
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
- 空行調整: 1行（オプション）
- `name:`プロパティ変更: 1行

---

## 📊 データフロー

```
[ユーザーがURLでアクセス]
    ?ds=remote-file&ds.url=https://example.com/data/file.mcap
              ↓
[RemoteDataSourceFactory.initialize()]
    ├─ const urls = args.params.url.split(",")
    │
    └─ getDisplayNamesForUrls(urls)
        ↓
    [displayNameForUrl.ts]
        ├─ isEmbedded() ← 別ファイルから取得
        │   ├─ true  → path.basename(url)
        │   └─ false → url全体
        └─ return 表示名
              ↓
[IterablePlayer({ name: "file.mcap" or URL })]
              ↓
[AppBar > DataSource で表示]
```

---

## 🎯 実装の特徴

### ✅ メリット

1. **モジュール分離**: iframe検出機能が独立して再利用可能
2. **最小変更**: 既存コードの修正は3行のみ
3. **テスト容易**: 各モジュールを独立してテスト可能
4. **保守性**: 責任範囲が明確
5. **拡張性**: 将来的な機能追加が容易

### 📦 モジュール設計

```
isEmbedded.ts
  ↓ (依存)
displayNameForUrl.ts
  ↓ (依存)
RemoteDataSourceFactory.tsx
```

- **isEmbedded**: 他のコンポーネントでも再利用可能
- **displayNameForUrl**: iframe判定に依存するが、表示名生成に特化
- **RemoteDataSourceFactory**: 表示名生成機能のみを使用

---

## 🚀 実装手順

### Step 1: iframe検出ファイル作成

```bash
# ファイル作成
touch packages/suite-base/src/util/isEmbedded.ts
touch packages/suite-base/src/util/isEmbedded.test.ts
```

上記の`isEmbedded.ts`と`isEmbedded.test.ts`をコピー&ペースト

### Step 2: 表示名生成ファイル作成

```bash
# ファイル作成
touch packages/suite-base/src/util/displayNameForUrl.ts
touch packages/suite-base/src/util/displayNameForUrl.test.ts
```

上記の`displayNameForUrl.ts`と`displayNameForUrl.test.ts`をコピー&ペースト

### Step 3: RemoteDataSourceFactory修正

1. import文を追加
2. `name: urls.join()` → `name: getDisplayNamesForUrls(urls)` に変更

### Step 4: テスト実行

```bash
# 個別テスト
yarn test isEmbedded.test.ts
yarn test displayNameForUrl.test.ts

# 既存テストが壊れていないか確認
yarn test RemoteDataSourceFactory

# 全テスト実行
yarn test
```

### Step 5: 動作確認

```bash
# 開発サーバー起動
yarn web:serve

# 通常ブラウザでアクセス
http://localhost:8080/?ds=remote-file&ds.url=https://example.com/data/sample.mcap
# → URL全体が表示されること

# iframe埋め込みで確認（test.htmlを作成）
# → "sample.mcap" が表示されること
```

---

## 📝 コミット例

```bash
# コミット1: iframe検出機能
git add packages/suite-base/src/util/isEmbedded.ts
git add packages/suite-base/src/util/isEmbedded.test.ts
git commit -m "feat: Add iframe detection utility

- Add isEmbedded() function to detect iframe context
- Support cross-origin iframe detection
- Add comprehensive unit tests"

# コミット2: 表示名生成機能
git add packages/suite-base/src/util/displayNameForUrl.ts
git add packages/suite-base/src/util/displayNameForUrl.test.ts
git commit -m "feat: Add display name utility for URLs

- Show filename only in iframe embedded mode
- Show full URL in normal browser mode
- Support multiple URLs with comma separation"

# コミット3: RemoteDataSourceFactory適用
git add packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx
git commit -m "feat: Use display name utility in RemoteDataSourceFactory

- Apply getDisplayNamesForUrls() for player name
- Improve UX when embedded in iframe
- Minimal changes to existing code (3 lines)"
```

または1つのコミットにまとめる:

```bash
git add packages/suite-base/src/util/isEmbedded.ts
git add packages/suite-base/src/util/isEmbedded.test.ts
git add packages/suite-base/src/util/displayNameForUrl.ts
git add packages/suite-base/src/util/displayNameForUrl.test.ts
git add packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx
git commit -m "feat: Display filename only in iframe embedded mode

- Add iframe detection utility (isEmbedded)
- Add display name utility (displayNameForUrl)
- Apply to RemoteDataSourceFactory
- Minimal changes to existing code (3 lines modified)

Closes #XXX"
```

---

## 🔍 既存ファイルとの関連性

### 影響を受けるファイル（修正不要）

1. **DataSource.tsx**: `playerState.name`を表示するだけ
2. **TextMiddleTruncate.tsx**: テキストを省略表示するだけ
3. **IterablePlayer**: `name`を受け取るだけ
4. **MessagePipeline**: プレイヤー名を状態管理するだけ

### 参考実装

- **isDesktopApp.ts**: プラットフォーム検出の参考

---

## 🐛 トラブルシューティング

### 問題: iframe内でもURL全体が表示される

**デバッグ方法**:

```typescript
// isEmbedded.ts に一時的に追加
console.log("window.self:", window.self);
console.log("window.top:", window.top);
console.log("isEmbedded result:", window.self !== window.top);
```

### 問題: モジュールのimportエラー

**原因**: パスが正しくない

**確認**:

```typescript
// displayNameForUrl.ts
import { isEmbedded } from "./isEmbedded"; // 同じディレクトリ内

// RemoteDataSourceFactory.tsx
import { getDisplayNamesForUrls } from "@lichtblick/suite-base/util/displayNameForUrl";
```

### 問題: テストでモックが効かない

**解決策**:

```typescript
// displayNameForUrl.test.ts
jest.mock("./isEmbedded"); // モック宣言が必要

beforeEach(() => {
  jest.spyOn(isEmbeddedModule, "isEmbedded").mockReturnValue(true);
});
```

---

## 📈 今後の拡張可能性

### isEmbedded関数の他での利用例

```typescript
// 例1: UI表示の切り替え
import { isEmbedded } from "@lichtblick/suite-base/util/isEmbedded";

export function AppBar() {
  const shouldShowFullMenu = !isEmbedded();
  // ...
}

// 例2: 設定の初期値変更
export function getDefaultSettings() {
  return {
    showAdvancedOptions: !isEmbedded(),
  };
}

// 例3: 他のデータソースでも使用
class LocalFileDataSourceFactory {
  public initialize() {
    const displayName = isEmbedded() ? getFilenameOnly(file.name) : file.path;
    // ...
  }
}
```

---

## ✅ まとめ

### 実装サマリー

| 項目               | 詳細           |
| ------------------ | -------------- |
| **新規ファイル**   | 2個（約80行）  |
| **テストファイル** | 2個（約100行） |
| **修正ファイル**   | 1個（3行）     |
| **総変更量**       | 約183行        |
| **実装時間**       | 約1時間        |
| **レビュー時間**   | 約20分         |

### 設計の特徴

1. ✅ **iframe検出が独立**: 他のコンポーネントでも再利用可能
2. ✅ **最小変更**: 既存コードへの影響は最小限
3. ✅ **テスト容易**: 各モジュールを独立してテスト可能
4. ✅ **保守性**: 責任範囲が明確で理解しやすい
5. ✅ **拡張性**: 将来的な機能追加が容易

### 前バージョンとの比較

| アプローチ                         | ファイル数 | 総行数 | 実装時間 |
| ---------------------------------- | ---------- | ------ | -------- |
| **完全統合型**（前バージョン）     | 1個        | 50行   | 35分     |
| **iframe判定分離**（本バージョン） | 2個        | 80行   | 1時間    |
| **完全分離型**（標準）             | 4個        | 410行  | 2時間    |

**本バージョンの位置づけ**: 再利用性と実装効率のバランスが取れた**推奨実装** ⭐⭐⭐⭐⭐

---

**作成日**: 2025年10月6日
**バージョン**: 2.0.0（iframe判定分離版）
**推奨度**: ⭐⭐⭐⭐⭐
