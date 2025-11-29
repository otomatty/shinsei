# iframe埋め込み時のファイル名表示機能 実装ドキュメント

## 📋 概要

iframe内でLichtblickが埋め込まれている場合、リモートファイルのURL全体ではなくファイル名のみをAppBarに表示する機能を実装します。

### 目的

- ユーザビリティの向上：長いURLではなく、わかりやすいファイル名を表示
- プライバシー保護：URLに含まれる可能性のある機密情報を非表示
- UI/UX改善：AppBarの表示領域を効率的に使用

### 実装アプローチ

**アプローチ3: 専用のユーティリティ関数を作成**（推奨）

- 再利用可能なユーティリティ関数として実装
- テストしやすい設計
- 将来的な拡張が容易

---

## 🏗️ アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────┐
│ 親ウィンドウ（データ管理アプリ）                          │
│  └─ iframe                                              │
│      └─ Lichtblick App                                  │
│          ├─ AppBar                                      │
│          │   └─ DataSource                              │
│          │       └─ TextMiddleTruncate                  │
│          │           └─ 表示名（ファイル名 or URL）      │
│          └─ MessagePipeline                             │
│              └─ Player (IterablePlayer)                 │
│                  └─ name: 表示名                        │
└─────────────────────────────────────────────────────────┘

【データフロー】
1. RemoteDataSourceFactory.initialize()
   ↓ URLからファイル名を抽出
2. getDisplayNameForUrls(urls)
   ↓ iframe検出 & 表示名決定
3. IterablePlayer({ name: displayName })
   ↓ プレイヤー名として設定
4. MessagePipeline (playerState.name)
   ↓ 状態管理
5. DataSource コンポーネント
   ↓ 表示名を取得
6. TextMiddleTruncate
   └─ AppBarに表示
```

---

## 📁 実装ファイル一覧

### 新規作成ファイル

| ファイルパス                                              | 役割                             |
| --------------------------------------------------------- | -------------------------------- |
| `packages/suite-base/src/util/isEmbedded.ts`              | iframe埋め込み検出ユーティリティ |
| `packages/suite-base/src/util/getDisplayName.ts`          | 表示名生成ユーティリティ         |
| `packages/suite-base/src/util/isEmbedded.test.ts`         | iframe検出ロジックのテスト       |
| `packages/suite-base/src/util/getDisplayName.test.ts`     | 表示名生成ロジックのテスト       |
| `docs/implementation/iframe-embedded-filename-display.md` | 本ドキュメント                   |

### 修正対象ファイル

| ファイルパス                                                      | 修正内容                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| `packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx` | `getDisplayNameForUrls`を使用してプレイヤー名を設定    |
| `packages/suite-base/src/index.ts`                                | 新規ユーティリティ関数のエクスポート追加（オプション） |

### 関連する既存ファイル

| ファイルパス                                                | 関連性                             |
| ----------------------------------------------------------- | ---------------------------------- |
| `packages/suite-base/src/components/AppBar/DataSource.tsx`  | プレイヤー名を表示（修正不要）     |
| `packages/suite-base/src/components/TextMiddleTruncate.tsx` | テキスト省略表示（修正不要）       |
| `packages/suite-base/src/players/IterablePlayer/index.ts`   | プレイヤー名を受け取る（修正不要） |
| `packages/suite-base/src/util/isDesktopApp.ts`              | プラットフォーム検出の参考実装     |

---

## 🔧 詳細実装仕様

### 1. iframe埋め込み検出ユーティリティ

**ファイル: `packages/suite-base/src/util/isEmbedded.ts`**

````typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * iframe埋め込み検出ユーティリティ
 *
 * Lichtblickがiframe内で実行されているかどうかを検出します。
 * この情報は、埋め込みコンテキストに応じたUI表示の最適化に使用されます。
 *
 * @module isEmbedded
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
 * セキュリティ考慮事項:
 * - クロスオリジンのiframeでは`window.top`へのアクセスが
 *   SecurityErrorを発生させる場合があります
 * - この場合、catch句でtrueを返すことでiframe埋め込みと判定します
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
 *
 * // クロスオリジンiframe内で実行（SecurityError発生）
 * isEmbedded(); // true
 * ```
 */
export function isEmbedded(): boolean {
  try {
    // window.selfとwindow.topが異なる場合、iframe内で実行されている
    return window.self !== window.top;
  } catch (error) {
    // クロスオリジン制限により例外が発生した場合もiframe内と判定
    // （親フレームへのアクセスが制限されている = iframe内）
    return true;
  }
}

/**
 * デバッグ用: 埋め込み情報の詳細を取得
 *
 * 開発時のトラブルシューティングに使用します。
 * 本番環境では使用を避けてください。
 *
 * @returns {object} 埋め込み状態の詳細情報
 * @internal
 */
export function getEmbeddedInfo(): {
  isEmbedded: boolean;
  hasSameOrigin: boolean;
  ancestorOrigins?: string[];
} {
  const embedded = isEmbedded();
  let hasSameOrigin = false;
  let ancestorOrigins: string[] = [];

  try {
    // 同一オリジンの場合のみアクセス可能
    if (window.top?.location.origin) {
      hasSameOrigin = window.location.origin === window.top.location.origin;
    }
  } catch {
    // クロスオリジンの場合は何もしない
  }

  try {
    // 利用可能な場合、祖先フレームのオリジン情報を取得
    if (window.location.ancestorOrigins) {
      ancestorOrigins = Array.from(window.location.ancestorOrigins);
    }
  } catch {
    // 取得できない場合は空配列
  }

  return {
    isEmbedded: embedded,
    hasSameOrigin,
    ancestorOrigins,
  };
}
````

---

### 2. 表示名生成ユーティリティ

**ファイル: `packages/suite-base/src/util/getDisplayName.ts`**

````typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import path from "path";

import { isEmbedded } from "./isEmbedded";

/**
 * リモートファイル表示名生成ユーティリティ
 *
 * リモートファイルのURLから適切な表示名を生成します。
 * iframe埋め込み時はファイル名のみを、通常時はURL全体を表示します。
 *
 * @module getDisplayName
 *
 * @example
 * ```typescript
 * import { getDisplayNameForUrl, getDisplayNameForUrls } from "@lichtblick/suite-base/util/getDisplayName";
 *
 * // 単一URL
 * const name = getDisplayNameForUrl("https://example.com/data/file.mcap");
 * // iframe内: "file.mcap"
 * // 通常時: "https://example.com/data/file.mcap"
 *
 * // 複数URL
 * const names = getDisplayNameForUrls([
 *   "https://example.com/data/file1.mcap",
 *   "https://example.com/data/file2.mcap"
 * ]);
 * // iframe内: "file1.mcap, file2.mcap"
 * // 通常時: "https://example.com/data/file1.mcap, https://example.com/data/file2.mcap"
 * ```
 */

/**
 * 単一URLから表示名を生成
 *
 * iframe埋め込みコンテキストに応じて、適切な表示名を返します。
 *
 * 表示ロジック:
 * - iframe内: ファイル名のみ（例: "sample.mcap"）
 * - 通常時: URL全体（例: "https://example.com/data/sample.mcap"）
 *
 * エラーハンドリング:
 * - 不正なURLの場合は元の文字列をそのまま返します
 * - ファイル名が空の場合はURL全体を返します
 *
 * @param {string} url - リモートファイルのURL
 * @returns {string} 表示用の名前
 *
 * @example
 * ```typescript
 * // iframe内での実行
 * getDisplayNameForUrl("https://example.com/data/recording.mcap");
 * // => "recording.mcap"
 *
 * // 通常のウィンドウでの実行
 * getDisplayNameForUrl("https://example.com/data/recording.mcap");
 * // => "https://example.com/data/recording.mcap"
 *
 * // クエリパラメータを含むURL
 * getDisplayNameForUrl("https://example.com/data/file.mcap?token=abc123");
 * // iframe内 => "file.mcap"
 * // 通常時 => "https://example.com/data/file.mcap?token=abc123"
 * ```
 */
export function getDisplayNameForUrl(url: string): string {
  // iframe埋め込みでない場合はURL全体を返す
  if (!isEmbedded()) {
    return url;
  }

  try {
    // URLオブジェクトを作成してパスを解析
    const urlObject = new URL(url);
    const filename = path.basename(urlObject.pathname);

    // ファイル名が空でない場合はファイル名を返す
    if (filename && filename !== "") {
      return filename;
    }

    // ファイル名が取得できない場合はURL全体を返す
    return url;
  } catch (error) {
    // URLのパースに失敗した場合は元の文字列を返す
    console.warn(`Failed to parse URL for display name: ${url}`, error);
    return url;
  }
}

/**
 * 複数URLから表示名を生成
 *
 * 複数のURLを受け取り、カンマ区切りの表示名を生成します。
 * 各URLは`getDisplayNameForUrl`で個別に処理されます。
 *
 * @param {string[]} urls - リモートファイルのURL配列
 * @returns {string} カンマ区切りの表示名
 *
 * @example
 * ```typescript
 * const urls = [
 *   "https://example.com/data/file1.mcap",
 *   "https://example.com/data/file2.mcap",
 *   "https://example.com/data/file3.mcap"
 * ];
 *
 * // iframe内での実行
 * getDisplayNameForUrls(urls);
 * // => "file1.mcap, file2.mcap, file3.mcap"
 *
 * // 通常のウィンドウでの実行
 * getDisplayNameForUrls(urls);
 * // => "https://example.com/data/file1.mcap, https://example.com/data/file2.mcap, https://example.com/data/file3.mcap"
 * ```
 */
export function getDisplayNameForUrls(urls: string[]): string {
  return urls.map(getDisplayNameForUrl).join(", ");
}

/**
 * URLからファイル名を強制的に抽出
 *
 * iframe埋め込みの判定に関係なく、常にファイル名を抽出します。
 * テストやデバッグ用途に使用できます。
 *
 * @param {string} url - リモートファイルのURL
 * @returns {string} ファイル名（取得できない場合はURL全体）
 *
 * @example
 * ```typescript
 * extractFilename("https://example.com/data/recording.mcap");
 * // => "recording.mcap"
 *
 * extractFilename("https://example.com/path/");
 * // => "https://example.com/path/" (ファイル名が取得できない)
 * ```
 */
export function extractFilename(url: string): string {
  try {
    const urlObject = new URL(url);
    const filename = path.basename(urlObject.pathname);
    return filename && filename !== "" ? filename : url;
  } catch {
    return url;
  }
}
````

---

### 3. RemoteDataSourceFactoryの修正

**ファイル: `packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx`**

**修正箇所:** `initialize`メソッド内のプレイヤー名設定

**変更前:**

```typescript
return new IterablePlayer({
  source,
  name: urls.join(), // URL全体を結合
  metricsCollector: args.metricsCollector,
  urlParams: { urls },
  sourceId: this.id,
  readAheadDuration: { sec: 10, nsec: 0 },
});
```

**変更後:**

```typescript
import { getDisplayNameForUrls } from "@lichtblick/suite-base/util/getDisplayName";

// ... (クラス内のinitializeメソッド)

return new IterablePlayer({
  source,
  name: getDisplayNameForUrls(urls), // ← 修正: ユーティリティ関数を使用
  metricsCollector: args.metricsCollector,
  urlParams: { urls },
  sourceId: this.id,
  readAheadDuration: { sec: 10, nsec: 0 },
});
```

**完全な修正コード:**

```typescript
// 既存のimport文の後に追加
import { getDisplayNameForUrls } from "@lichtblick/suite-base/util/getDisplayName";

// ... (既存のコード)

class RemoteDataSourceFactory implements IDataSourceFactory {
  // ... (既存のプロパティとメソッド)

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
      name: getDisplayNameForUrls(urls), // ← 変更: iframe検出対応の表示名
      metricsCollector: args.metricsCollector,
      urlParams: { urls },
      sourceId: this.id,
      readAheadDuration: { sec: 10, nsec: 0 },
    });
  }

  // ... (残りの既存コード)
}
```

---

## 🧪 テスト実装

### 1. iframe検出テスト

**ファイル: `packages/suite-base/src/util/isEmbedded.test.ts`**

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { isEmbedded, getEmbeddedInfo } from "./isEmbedded";

describe("isEmbedded", () => {
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it("通常のウィンドウで実行時はfalseを返す", () => {
    // window.self === window.top の場合
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
    // window.self !== window.top の場合
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
    // window.topへのアクセスでSecurityErrorを発生させる
    Object.defineProperty(global.window, "top", {
      get() {
        throw new Error("SecurityError: Blocked a frame with origin");
      },
      configurable: true,
    });

    expect(isEmbedded()).toBe(true);
  });
});

describe("getEmbeddedInfo", () => {
  it("埋め込み情報オブジェクトを返す", () => {
    const info = getEmbeddedInfo();

    expect(info).toHaveProperty("isEmbedded");
    expect(info).toHaveProperty("hasSameOrigin");
    expect(info).toHaveProperty("ancestorOrigins");
    expect(typeof info.isEmbedded).toBe("boolean");
    expect(typeof info.hasSameOrigin).toBe("boolean");
    expect(Array.isArray(info.ancestorOrigins)).toBe(true);
  });
});
```

---

### 2. 表示名生成テスト

**ファイル: `packages/suite-base/src/util/getDisplayName.test.ts`**

```typescript
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { getDisplayNameForUrl, getDisplayNameForUrls, extractFilename } from "./getDisplayName";
import * as isEmbeddedModule from "./isEmbedded";

// isEmbedded関数をモック
jest.mock("./isEmbedded");

describe("getDisplayNameForUrl", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("iframe埋め込み時", () => {
    beforeEach(() => {
      jest.spyOn(isEmbeddedModule, "isEmbedded").mockReturnValue(true);
    });

    it("MCAPファイルのURLからファイル名を抽出", () => {
      const url = "https://example.com/data/recording.mcap";
      expect(getDisplayNameForUrl(url)).toBe("recording.mcap");
    });

    it("BAGファイルのURLからファイル名を抽出", () => {
      const url = "https://example.com/data/sample.bag";
      expect(getDisplayNameForUrl(url)).toBe("sample.bag");
    });

    it("クエリパラメータを含むURLからファイル名を抽出", () => {
      const url = "https://example.com/data/file.mcap?token=abc123&expires=2024";
      expect(getDisplayNameForUrl(url)).toBe("file.mcap");
    });

    it("パスの深い階層のURLからファイル名を抽出", () => {
      const url = "https://example.com/project/dataset/2024/01/recording.mcap";
      expect(getDisplayNameForUrl(url)).toBe("recording.mcap");
    });

    it("日本語ファイル名を含むURL", () => {
      const url = "https://example.com/data/%E8%A8%98%E9%8C%B2.mcap"; // 記録.mcap
      expect(getDisplayNameForUrl(url)).toBe("記録.mcap");
    });

    it("特殊文字を含むファイル名", () => {
      const url = "https://example.com/data/file-name_2024(1).mcap";
      expect(getDisplayNameForUrl(url)).toBe("file-name_2024(1).mcap");
    });

    it("ファイル名がない場合はURL全体を返す", () => {
      const url = "https://example.com/data/";
      expect(getDisplayNameForUrl(url)).toBe(url);
    });

    it("不正なURLの場合は元の文字列を返す", () => {
      const invalidUrl = "not-a-valid-url";
      expect(getDisplayNameForUrl(invalidUrl)).toBe(invalidUrl);
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

    it("クエリパラメータを含むURL全体を返す", () => {
      const url = "https://example.com/data/file.mcap?token=abc123";
      expect(getDisplayNameForUrl(url)).toBe(url);
    });
  });
});

describe("getDisplayNameForUrls", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("iframe埋め込み時", () => {
    beforeEach(() => {
      jest.spyOn(isEmbeddedModule, "isEmbedded").mockReturnValue(true);
    });

    it("複数URLからファイル名をカンマ区切りで抽出", () => {
      const urls = [
        "https://example.com/data/file1.mcap",
        "https://example.com/data/file2.mcap",
        "https://example.com/data/file3.mcap",
      ];
      expect(getDisplayNameForUrls(urls)).toBe("file1.mcap, file2.mcap, file3.mcap");
    });

    it("単一URLの場合", () => {
      const urls = ["https://example.com/data/recording.mcap"];
      expect(getDisplayNameForUrls(urls)).toBe("recording.mcap");
    });

    it("空配列の場合は空文字列を返す", () => {
      expect(getDisplayNameForUrls([])).toBe("");
    });
  });

  describe("通常のウィンドウ実行時", () => {
    beforeEach(() => {
      jest.spyOn(isEmbeddedModule, "isEmbedded").mockReturnValue(false);
    });

    it("複数URLをカンマ区切りで返す", () => {
      const urls = ["https://example.com/data/file1.mcap", "https://example.com/data/file2.mcap"];
      const expected = "https://example.com/data/file1.mcap, https://example.com/data/file2.mcap";
      expect(getDisplayNameForUrls(urls)).toBe(expected);
    });
  });
});

describe("extractFilename", () => {
  it("iframe判定に関係なくファイル名を抽出", () => {
    const url = "https://example.com/data/recording.mcap";
    expect(extractFilename(url)).toBe("recording.mcap");
  });

  it("ファイル名がない場合はURL全体を返す", () => {
    const url = "https://example.com/data/";
    expect(extractFilename(url)).toBe(url);
  });

  it("不正なURLの場合は元の文字列を返す", () => {
    const invalidUrl = "not-a-valid-url";
    expect(extractFilename(invalidUrl)).toBe(invalidUrl);
  });
});
```

---

## 📊 データフロー詳細

### 1. 初期化フロー

```
ユーザーアクション
  │
  ├─ データソース選択ダイアログ
  │   └─ RemoteDataSourceFactory.initialize()
  │
  └─ URL直接アクセス
      └─ ds=remote-file&ds.url=https://...
          │
          ├─ URL解析
          ├─ isEmbedded() チェック
          ├─ getDisplayNameForUrls() 実行
          │   ├─ iframe内 → ファイル名抽出
          │   └─ 通常時 → URL全体
          │
          └─ IterablePlayer生成
              └─ name: 表示名
```

### 2. 表示フロー

```
IterablePlayer
  │ name: "recording.mcap" (or URL)
  ├─ PlayerState更新
  │   └─ MessagePipeline
  │
  └─ AppBar
      └─ DataSource コンポーネント
          ├─ useMessagePipeline(selectPlayerName)
          │   └─ playerName = "recording.mcap"
          │
          └─ TextMiddleTruncate
              ├─ text={playerName}
              └─ 中央省略で表示
                  └─ AppBar中央に表示
```

---

## 🔍 既存ファイルとの関連性

### 影響を受けるファイル

#### 1. **DataSource.tsx** (修正不要)

- **場所**: `packages/suite-base/src/components/AppBar/DataSource.tsx`
- **役割**: プレイヤー名をAppBarに表示
- **関連性**: `playerState.name`を取得して表示するだけなので修正不要
- **影響**: プレイヤー名が変わることで表示内容が変わる

#### 2. **TextMiddleTruncate.tsx** (修正不要)

- **場所**: `packages/suite-base/src/components/TextMiddleTruncate.tsx`
- **役割**: 長いテキストを中央省略で表示
- **関連性**: 受け取ったテキストを省略表示するだけなので修正不要
- **影響**: ファイル名の方が短いため、省略される頻度が減る

#### 3. **IterablePlayer/index.ts** (修正不要)

- **場所**: `packages/suite-base/src/players/IterablePlayer/index.ts`
- **役割**: ファイル再生プレイヤーの実装
- **関連性**: コンストラクタで`name`を受け取るだけなので修正不要
- **影響**: 受け取った表示名をそのまま使用

#### 4. **MessagePipeline** (修正不要)

- **場所**: `packages/suite-base/src/components/MessagePipeline`
- **役割**: プレイヤーの状態管理
- **関連性**: プレイヤー名を状態として管理するだけなので修正不要
- **影響**: 新しいプレイヤー名を状態として保持

### 参考にすべきファイル

#### 1. **isDesktopApp.ts**

- **場所**: `packages/suite-base/src/util/isDesktopApp.ts`
- **参考ポイント**: プラットフォーム検出の実装パターン
- **類似性**: ランタイム環境の検出ロジック

---

## 🎯 実装手順

### Phase 1: ユーティリティ関数の実装

1. ✅ `isEmbedded.ts` 作成
2. ✅ `getDisplayName.ts` 作成
3. ✅ `isEmbedded.test.ts` 作成
4. ✅ `getDisplayName.test.ts` 作成
5. ✅ テスト実行・検証

### Phase 2: RemoteDataSourceFactoryの修正

1. ✅ import文追加
2. ✅ `initialize`メソッドの`name`プロパティ修正
3. ✅ 既存の機能が壊れていないことを確認

### Phase 3: 動作確認

1. ✅ 通常のブラウザで動作確認
   - URL全体が表示されることを確認
2. ✅ iframe埋め込みで動作確認
   - ファイル名のみが表示されることを確認
3. ✅ 複数ファイルでの動作確認
4. ✅ エッジケースのテスト
   - 不正なURL
   - ファイル名がないURL
   - 特殊文字を含むURL

### Phase 4: ドキュメント更新

1. ✅ 本ドキュメントの作成
2. ✅ README更新（必要に応じて）
3. ✅ CHANGELOG更新

---

## 🧪 テスト実行方法

```bash
# 全テスト実行
yarn test

# 特定のテストファイルのみ実行
yarn test src/util/isEmbedded.test.ts
yarn test src/util/getDisplayName.test.ts

# ウォッチモードでテスト
yarn test --watch src/util/

# カバレッジレポート生成
yarn test --coverage src/util/
```

---

## 🔧 動作確認方法

### 1. 通常のブラウザでの確認

```bash
# 開発サーバー起動
yarn web:serve

# ブラウザで以下のURLにアクセス
http://localhost:8080/?ds=remote-file&ds.url=https://example.com/data/sample.mcap
```

**期待結果**: AppBarに `https://example.com/data/sample.mcap` が表示される

### 2. iframe埋め込みでの確認

テスト用HTMLファイルを作成:

```html
<!doctype html>
<html>
  <head>
    <title>Lichtblick Embed Test</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
      }
      iframe {
        width: 100%;
        height: 800px;
        border: 1px solid #ccc;
      }
    </style>
  </head>
  <body>
    <h1>Lichtblick 埋め込みテスト</h1>
    <iframe
      id="lichtblick"
      src="http://localhost:8080/?ds=remote-file&ds.url=https://example.com/data/sample.mcap"
    ></iframe>
  </body>
</html>
```

ローカルサーバーで起動:

```bash
# Pythonの場合
python3 -m http.server 3000

# Node.jsの場合
npx http-server -p 3000
```

ブラウザで `http://localhost:3000/test.html` にアクセス

**期待結果**: AppBarに `sample.mcap` のみが表示される

---

## 🐛 トラブルシューティング

### 問題1: iframe検出が正しく動作しない

**症状**: iframe内でもURL全体が表示される

**原因**:

- `window.top`へのアクセス権限の問題
- 同一オリジンのiframeの場合

**解決策**:

```typescript
// デバッグ情報を確認
import { getEmbeddedInfo } from "./util/isEmbedded";
console.log(getEmbeddedInfo());
```

### 問題2: ファイル名が正しく抽出されない

**症状**: ファイル名の代わりにURL全体が表示される

**原因**:

- URLのパスにファイル名が含まれていない
- URL形式が想定外

**解決策**:

```typescript
// extractFilename関数で直接テスト
import { extractFilename } from "./util/getDisplayName";
console.log(extractFilename("問題のURL"));
```

### 問題3: テストが失敗する

**症状**: Jestテストでwindow関連のエラーが発生

**原因**: JSDOMの制限

**解決策**:

```typescript
// テストファイルの設定を確認
/**
 * @jest-environment jsdom
 */
```

---

## 📝 コミットメッセージ例

```bash
git add packages/suite-base/src/util/isEmbedded.ts
git add packages/suite-base/src/util/getDisplayName.ts
git add packages/suite-base/src/util/isEmbedded.test.ts
git add packages/suite-base/src/util/getDisplayName.test.ts
git commit -m "feat: Add iframe embedded detection utilities"

git add packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx
git commit -m "feat: Display filename only in iframe embedded context

- Use getDisplayNameForUrls() to show filename instead of full URL
- Improve UX when Lichtblick is embedded in other applications
- Maintain backward compatibility for standalone browser usage"

git add docs/implementation/iframe-embedded-filename-display.md
git commit -m "docs: Add implementation guide for iframe filename display"
```

---

## 🚀 今後の拡張可能性

### 1. URLパラメータでの明示的制御

```typescript
// ds.displayMode パラメータの追加
?ds=remote-file&ds.url=...&ds.displayMode=filename
```

### 2. カスタム表示名の指定

```typescript
// ds.displayName パラメータの追加
?ds=remote-file&ds.url=...&ds.displayName=My%20Recording
```

### 3. 表示モードの設定UI

Settings > Visualization > Data Source Display Mode

- [ ] Always show full URL
- [x] Show filename in embedded mode (default)
- [ ] Always show filename

### 4. 他のデータソースへの適用

- LocalFileDataSourceFactory
- Ros1SocketDataSourceFactory
- Ros2SocketDataSourceFactory

---

## ✅ チェックリスト

実装完了前に以下を確認:

- [ ] `isEmbedded.ts` ファイル作成
- [ ] `getDisplayName.ts` ファイル作成
- [ ] `isEmbedded.test.ts` ファイル作成
- [ ] `getDisplayName.test.ts` ファイル作成
- [ ] `RemoteDataSourceFactory.tsx` 修正
- [ ] 全テストがパス
- [ ] 通常ブラウザでの動作確認
- [ ] iframe埋め込みでの動作確認
- [ ] エッジケースのテスト
- [ ] コードレビュー完了
- [ ] ドキュメント作成
- [ ] CHANGELOG更新

---

## 📚 参考資料

- [MDN: Window.self](https://developer.mozilla.org/en-US/docs/Web/API/Window/self)
- [MDN: Window.top](https://developer.mozilla.org/en-US/docs/Web/API/Window/top)
- [MDN: Location.ancestorOrigins](https://developer.mozilla.org/en-US/docs/Web/API/Location/ancestorOrigins)
- [Node.js path.basename()](https://nodejs.org/api/path.html#pathbasenamepath-suffix)
- [URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL)

---

## 📞 サポート

質問や問題が発生した場合:

1. このドキュメントのトラブルシューティングセクションを確認
2. 既存のIssueを検索
3. 新しいIssueを作成（テンプレートに従って記入）

---

**作成日**: 2025年10月6日
**バージョン**: 1.0.0
**作成者**: Lichtblick Development Team
