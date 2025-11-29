# Issue #750 根本的解決策の分析と提案

**作成日**: 2025年11月5日
**対象Issue**: [#750 - Incompatible with new foxglove-sdk for the foxglove bridge](https://github.com/lichtblick-suite/lichtblick/issues/750)
**ステータス**: 提案・検討中
**優先度**: High

---

## 目次

1. [問題の概要](#問題の概要)
2. [根本原因の分析](#根本原因の分析)
3. [解決策の比較](#解決策の比較)
4. [推奨アプローチ](#推奨アプローチ)
5. [実装計画](#実装計画)
6. [リスク評価](#リスク評価)
7. [意思決定基準](#意思決定基準)

---

## 問題の概要

### 現象

Lichtblick v1.19.0+ が foxglove_bridge v3.2.0 以降のバージョンと互換性がなく、WebSocket接続が確立できない。

```
エラーメッセージ:
Check that the WebSocket server at ws://localhost:8765 is reachable
and supports protocol version foxglove.websocket.v1.
```

### 影響範囲

- **影響を受けるユーザー**: foxglove_bridge v3.2.0+ を使用するROSユーザー
- **影響時期**: 2025年9月22日（v3.2.0リリース）以降
- **ROSディストリビューション**: Humble, Jazzy, Kilted, Rolling

### 関連Issue

- [lichtblick#750](https://github.com/lichtblick-suite/lichtblick/issues/750) - メインIssue
- [lichtblick#604](https://github.com/lichtblick-suite/lichtblick/issues/604) - 関連する過去の議論
- [lichtblick#547](https://github.com/lichtblick-suite/lichtblick/discussions/547) - コミュニティディスカッション

---

## 根本原因の分析

### 1. プロトコルバージョンの不一致

#### Lichtblick側の実装

```typescript
// packages/suite-base/src/players/FoxgloveWebSocketPlayer/index.ts (line 177-182)
this.#client = new FoxgloveClient({
  ws:
    typeof Worker !== "undefined"
      ? new WorkerSocketAdapter(this.#url, [FoxgloveClient.SUPPORTED_SUBPROTOCOL])
      : new WebSocket(this.#url, [FoxgloveClient.SUPPORTED_SUBPROTOCOL]),
});

// FoxgloveClient.SUPPORTED_SUBPROTOCOL = "foxglove.websocket.v1"
```

**使用パッケージ**:

```json
{
  "@foxglove/ws-protocol": "0.7.2"
}
```

#### foxglove_bridge v3.2.0+ の変更

**v3.2.0 Changelog**:

```
## 3.2.0 (2025-09-22)
• Rewrite of foxglove_bridge to use the Foxglove SDK (various)
```

**新しいプロトコル**:

- プロトコル名: `foxglove.sdk.v1`
- 実装: Foxglove SDK（C++, Python, Rust）
- リポジトリ: https://github.com/foxglove/foxglove-sdk

**参照**: [foxglove-sdk WebSocket handshake implementation](https://github.com/foxglove/foxglove-sdk/blob/main/rust/foxglove/src/websocket/handshake.rs#L6)

### 2. プロトコル検証ロジックの厳格さ

#### @foxglove/ws-protocol の実装

```typescript
// node_modules/@foxglove/ws-protocol/src/FoxgloveClient.ts
this.#ws.onopen = (_event) => {
  if (this.#ws.protocol !== FoxgloveClient.SUPPORTED_SUBPROTOCOL) {
    throw new Error(
      `Expected subprotocol ${FoxgloveClient.SUPPORTED_SUBPROTOCOL}, got '${this.#ws.protocol}'`,
    );
  }
  this.#emitter.emit("open");
};
```

**問題点**:

- 厳密な等価比較（`!==`）を使用
- `foxglove.websocket.v1` のみを受け入れ
- `foxglove.sdk.v1` は拒否される

### 3. プロトコル互換性マトリックス

| Lichtblick           | foxglove_bridge | プロトコル (Lichtblick)                 | プロトコル (bridge)   | 互換性 |
| -------------------- | --------------- | --------------------------------------- | --------------------- | ------ |
| v1.19.0 (未パッチ)   | < v3.2.0        | foxglove.websocket.v1                   | foxglove.websocket.v1 | ✅     |
| v1.19.0 (未パッチ)   | >= v3.2.0       | foxglove.websocket.v1                   | foxglove.sdk.v1       | ❌     |
| v1.19.0 (パッチ適用) | >= v3.2.0       | foxglove.websocket.v1 + foxglove.sdk.v1 | foxglove.sdk.v1       | ✅     |
| Flora (PR#97)        | >= v3.2.0       | foxglove.websocket.v1 + foxglove.sdk.v1 | foxglove.sdk.v1       | ✅     |

---

## 解決策の比較

### 全体像

```
┌─────────────────────────────────────────────────────────────────┐
│ 短期的解決 ←→ 長期的解決                                         │
├─────────────────────────────────────────────────────────────────┤
│ 案3: パッチ管理 → 案2: フォーク → 案1: 独自実装                  │
│ (2-3日)          (1-2週間)       (2-3週間)                      │
│ 低コスト         中コスト        高コスト                        │
│ 低自律性         中自律性        高自律性                        │
└─────────────────────────────────────────────────────────────────┘
```

### 案1: 独自WebSocketプロトコル実装 `@lichtblick/ws-protocol`

#### 概要

Lichtblick独自のWebSocketプロトコル実装を作成し、`@foxglove/ws-protocol`への依存を完全に排除。

#### アーキテクチャ

```
packages/
  └── lichtblick-ws-protocol/
      ├── src/
      │   ├── client/
      │   │   ├── LichtblickClient.ts         # メインクライアント
      │   │   ├── ProtocolHandler.ts          # プロトコルバージョン管理
      │   │   └── MessageParser.ts            # メッセージパース
      │   ├── types/
      │   │   ├── messages.ts                 # メッセージ型定義
      │   │   └── protocols.ts                # プロトコル定義
      │   ├── utils/
      │   │   ├── serialization.ts
      │   │   └── validation.ts
      │   └── index.ts
      ├── package.json
      ├── tsconfig.json
      └── README.md
```

#### 核心実装コンセプト

```typescript
// packages/lichtblick-ws-protocol/src/client/LichtblickClient.ts

export class LichtblickClient {
  // 複数プロトコルのサポート
  static SUPPORTED_SUBPROTOCOLS = ["foxglove.websocket.v1", "foxglove.sdk.v1"];

  private negotiatedProtocol: string | null = null;
  private protocolHandler: ProtocolHandler;

  constructor({ ws }: { ws: IWebSocket }) {
    this.#ws = ws;
    this.#initialize();
  }

  #initialize() {
    this.#ws.onopen = (event) => {
      this.negotiatedProtocol = this.#ws.protocol;

      // 柔軟なプロトコル検証
      if (!LichtblickClient.SUPPORTED_SUBPROTOCOLS.includes(this.negotiatedProtocol)) {
        throw new Error(
          `Unsupported protocol: ${this.negotiatedProtocol}. ` +
            `Supported: ${LichtblickClient.SUPPORTED_SUBPROTOCOLS.join(", ")}`,
        );
      }

      // プロトコルに応じたハンドラーの選択
      this.protocolHandler = this.createProtocolHandler(this.negotiatedProtocol);
      this.#emitter.emit("open");
    };
  }

  private createProtocolHandler(protocol: string): ProtocolHandler {
    switch (protocol) {
      case "foxglove.websocket.v1":
        return new FoxgloveWebSocketV1Handler();
      case "foxglove.sdk.v1":
        return new FoxgloveSdkV1Handler();
      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}
```

#### メリット

| 項目                    | 説明                           |
| ----------------------- | ------------------------------ |
| ✅ **完全な自律性**     | Foxgloveの変更に影響されない   |
| ✅ **カスタマイズ性**   | Lichtblick独自の機能追加が容易 |
| ✅ **最適化の余地**     | 専用の最適化実装が可能         |
| ✅ **技術的負債の削減** | 外部依存を減らせる             |
| ✅ **Issue #604の方針** | チームが言及した長期戦略に合致 |

#### デメリット

| 項目                    | 説明                         |
| ----------------------- | ---------------------------- |
| ❌ **実装コスト**       | 2-3週間の開発期間            |
| ❌ **テストコスト**     | 包括的なテストスイートが必要 |
| ❌ **メンテナンス負荷** | 継続的なバグ修正・機能追加   |
| ❌ **セキュリティ対応** | 脆弱性対応を独自に実施       |
| ❌ **ドキュメント作成** | 使用方法のドキュメント化     |

#### 実装フェーズ

```
Phase 1: 基盤構築 (3-5日)
  ├─ Day 1-2: パッケージ構造作成
  │   ├─ package.json, tsconfig.json 設定
  │   ├─ 基本型定義 (types/)
  │   └─ インターフェース定義
  └─ Day 3-5: プロトコルハンドラー基盤
      ├─ IWebSocket インターフェース
      ├─ ProtocolHandler 抽象クラス
      └─ メッセージ型定義

Phase 2: クライアント実装 (5-7日)
  ├─ Day 1-3: LichtblickClient 実装
  │   ├─ 接続管理
  │   ├─ イベントエミッター
  │   └─ ライフサイクル管理
  ├─ Day 4-5: メッセージパース実装
  │   ├─ JSON メッセージパーサー
  │   ├─ バイナリメッセージパーサー
  │   └─ エラーハンドリング
  └─ Day 6-7: プロトコルハンドラー実装
      ├─ FoxgloveWebSocketV1Handler
      └─ FoxgloveSdkV1Handler

Phase 3: 統合とテスト (3-5日)
  ├─ Day 1-2: FoxgloveWebSocketPlayer 統合
  │   ├─ import 文の置き換え
  │   ├─ API の互換性確保
  │   └─ 動作確認
  ├─ Day 3-4: テスト実装
  │   ├─ 単体テスト (Jest)
  │   ├─ 統合テスト
  │   └─ E2Eテスト (Playwright)
  └─ Day 5: バグ修正・調整

Phase 4: ドキュメントとリリース (2日)
  ├─ Day 1: ドキュメント作成
  │   ├─ README.md
  │   ├─ API ドキュメント
  │   └─ 移行ガイド
  └─ Day 2: リリース準備
      ├─ CHANGELOG.md
      ├─ バージョンタグ
      └─ NPM公開（内部パッケージの場合）
```

#### コスト見積もり

- **初期開発**: 12-17営業日（約2.5-3.5週間）
- **初期投資**: 約120-170時間
- **月次メンテナンス**: 4-8時間
- **年間コスト**: 約50-100時間

---

### 案2: `@foxglove/ws-protocol` のフォーク + メンテナンス

#### 概要

`@foxglove/ws-protocol`をフォークして`@lichtblick/foxglove-ws-protocol`として管理し、必要な変更を加えつつ上流の更新を定期的にマージ。

#### 実装アプローチ

```bash
# 1. リポジトリのフォーク
git clone https://github.com/foxglove/ws-protocol.git lichtblick-foxglove-ws-protocol
cd lichtblick-foxglove-ws-protocol

# 2. リモートの設定
git remote rename origin upstream
git remote add origin https://github.com/lichtblick-suite/foxglove-ws-protocol.git

# 3. ブランチ戦略
git checkout -b lichtblick-main
git push -u origin lichtblick-main
```

#### 変更内容

```typescript
// typescript/ws-protocol/src/FoxgloveClient.ts

export default class FoxgloveClient {
  // Lichtblick: 複数プロトコルをサポート
  static SUPPORTED_SUBPROTOCOL = "foxglove.websocket.v1";
  static SUPPORTED_SUBPROTOCOLS = ["foxglove.websocket.v1", "foxglove.sdk.v1"];

  #reconnect() {
    this.#ws.binaryType = "arraybuffer";
    this.#ws.onerror = (event: { error?: Error }) => {
      this.#emitter.emit("error", event.error ?? new Error("WebSocket error"));
    };

    this.#ws.onopen = (_event) => {
      // Lichtblick: プロトコルチェックを緩和
      const supportedProtocols = [FoxgloveClient.SUPPORTED_SUBPROTOCOL, "foxglove.sdk.v1"];

      if (!supportedProtocols.includes(this.#ws.protocol)) {
        throw new Error(
          `Expected subprotocol ${supportedProtocols.join(" or ")}, got '${this.#ws.protocol}'`,
        );
      }

      this.#emitter.emit("open");
    };

    // ... rest of the code unchanged ...
  }
}
```

#### メンテナンスフロー

```bash
# 定期的な上流の変更取り込み（月1回推奨）
git fetch upstream
git checkout lichtblick-main
git merge upstream/main

# コンフリクトがある場合
# 1. コンフリクト解決
# 2. テスト実行
npm test

# 3. ビルド確認
npm run build

# 4. プッシュ
git push origin lichtblick-main

# 5. NPM公開（必要に応じて）
npm version patch
npm publish --access public
```

#### メリット

| 項目                  | 説明                                     |
| --------------------- | ---------------------------------------- |
| ✅ **既存実装の活用** | テスト済みのコードベースを利用           |
| ✅ **段階的な拡張**   | 必要な変更だけを追加                     |
| ✅ **上流のメリット** | バグ修正・セキュリティパッチを取り込める |
| ✅ **実装コスト削減** | ゼロから作るより早い                     |
| ✅ **型定義の継承**   | TypeScript型定義をそのまま利用           |

#### デメリット

| 項目                    | 説明                                     |
| ----------------------- | ---------------------------------------- |
| ⚠️ **マージの手間**     | 上流の大きな変更時にコンフリクト         |
| ⚠️ **テストの維持**     | 上流のテストとLichtblick独自のテスト両方 |
| ⚠️ **公開の管理**       | NPMへの公開とバージョン管理              |
| ⚠️ **ブランチ管理**     | lichtblick-mainと上流mainの管理          |
| ⚠️ **ドキュメント同期** | 上流のドキュメントとLichtblick版の差異   |

#### 実装フェーズ

```
Phase 1: フォーク準備 (1-2日)
  ├─ リポジトリのフォーク
  ├─ ブランチ戦略の決定
  ├─ CI/CDパイプラインの設定
  └─ NPM公開設定

Phase 2: 変更実装 (2-3日)
  ├─ FoxgloveClient.ts の修正
  ├─ テストの追加・修正
  ├─ ドキュメントの更新
  └─ CHANGELOG.md の作成

Phase 3: 統合 (2-3日)
  ├─ Lichtblickプロジェクトでの依存関係変更
  ├─ package.json の更新
  ├─ 動作確認
  └─ E2Eテスト

Phase 4: 公開とドキュメント (1日)
  ├─ NPM公開
  ├─ README.md 作成
  └─ 移行ガイド作成
```

#### コスト見積もり

- **初期開発**: 7-10営業日（約1.5-2週間）
- **初期投資**: 約60-80時間
- **月次メンテナンス**: 2-4時間（上流の変更確認・マージ）
- **年間コスト**: 約30-50時間

---

### 案3: パッチファイル管理（pnpm patch）⭐️ 短期的推奨

#### 概要

現在のプロジェクトで使用している`pnpm`のパッチ機能を利用し、`@foxglove/ws-protocol`に必要最小限の変更を加える。

#### 既存のパッチ管理状況

プロジェクトは既に7つのパッケージにパッチを適用中：

```
patches/
├── app-builder-lib.patch
├── protobufjs.patch
├── react-dnd.patch
├── react-json-tree.patch
├── react-use.patch
├── three.patch
└── zstd-codec.patch
```

この実績から、パッチ管理のノウハウが既に存在。

#### 実装手順

##### ステップ1: パッケージの編集可能化

```bash
# @foxglove/ws-protocol を編集可能にする
pnpm patch @foxglove/ws-protocol

# 出力例:
# You can now edit the following folder: /tmp/pnpm-patch-xyz/@foxglove/ws-protocol
# To commit your changes, run: pnpm patch-commit <path>
```

##### ステップ2: FoxgloveClient.ts の編集

```typescript
// /tmp/pnpm-patch-xyz/@foxglove/ws-protocol/src/FoxgloveClient.ts

export default class FoxgloveClient {
  static SUPPORTED_SUBPROTOCOL = "foxglove.websocket.v1";

  // Lichtblick: Add support for foxglove.sdk.v1 protocol
  // Issue: https://github.com/lichtblick-suite/lichtblick/issues/750
  static SUPPORTED_SUBPROTOCOLS = ["foxglove.websocket.v1", "foxglove.sdk.v1"];

  #reconnect() {
    this.#ws.binaryType = "arraybuffer";
    this.#ws.onerror = (event: { error?: Error }) => {
      this.#emitter.emit("error", event.error ?? new Error("WebSocket error"));
    };

    this.#ws.onopen = (_event) => {
      // Lichtblick: Support both foxglove.websocket.v1 and foxglove.sdk.v1
      // This allows compatibility with foxglove_bridge v3.2.0+ (Foxglove SDK)
      const supportedProtocols = [FoxgloveClient.SUPPORTED_SUBPROTOCOL, "foxglove.sdk.v1"];

      if (!supportedProtocols.includes(this.#ws.protocol)) {
        throw new Error(
          `Expected subprotocol ${supportedProtocols.join(" or ")}, got '${this.#ws.protocol}'`,
        );
      }

      this.#emitter.emit("open");
    };

    // ... rest of code unchanged ...
  }
}
```

##### ステップ3: パッチの生成

```bash
# パッチファイルを生成
pnpm patch-commit /tmp/pnpm-patch-xyz/@foxglove/ws-protocol

# 自動的に以下が実行される:
# 1. patches/@foxglove__ws-protocol@0.7.2.patch が作成
# 2. package.json の pnpm.patchedDependencies に追加
```

##### ステップ4: WebSocket接続部分の修正

```typescript
// packages/suite-base/src/players/FoxgloveWebSocketPlayer/index.ts

/**
 * DEPENDENCY MAP:
 *
 * External Dependencies (patched):
 *   ├─ @foxglove/ws-protocol@0.7.2 (PATCHED)
 *   │   └─ Patch: patches/@foxglove__ws-protocol@0.7.2.patch
 *   │   └─ Reason: Support foxglove.sdk.v1 protocol for compatibility
 *   │              with foxglove_bridge v3.2.0+
 *   │   └─ Issue: https://github.com/lichtblick-suite/lichtblick/issues/750
 *
 * Note: This file depends on a patched version of @foxglove/ws-protocol.
 * If upgrading the package, ensure the patch is still compatible.
 */

#open = (): void => {
  if (this.#closed) {
    return;
  }
  if (this.#client != undefined) {
    throw new Error(`Attempted to open a second Foxglove WebSocket connection`);
  }
  log.info(`Opening connection to ${this.#url}`);

  this.#connectionAttemptTimeout = setTimeout(() => {
    this.#client?.close();
  }, 10000);

  // Support both foxglove.websocket.v1 and foxglove.sdk.v1 protocols
  // See: patches/@foxglove__ws-protocol@0.7.2.patch
  const supportedProtocols = [FoxgloveClient.SUPPORTED_SUBPROTOCOL, "foxglove.sdk.v1"];

  this.#client = new FoxgloveClient({
    ws:
      typeof Worker !== "undefined"
        ? new WorkerSocketAdapter(this.#url, supportedProtocols)
        : new WebSocket(this.#url, supportedProtocols),
  });

  // ... rest of code ...
};
```

##### ステップ5: パッチファイルの例

```diff
# patches/@foxglove__ws-protocol@0.7.2.patch

diff --git a/src/FoxgloveClient.ts b/src/FoxgloveClient.ts
index abc123..def456 100644
--- a/src/FoxgloveClient.ts
+++ b/src/FoxgloveClient.ts
@@ -60,6 +60,12 @@ const textEncoder = new TextEncoder();
  */
 export default class FoxgloveClient {
   static SUPPORTED_SUBPROTOCOL = "foxglove.websocket.v1";
+
+  // Lichtblick: Add support for foxglove.sdk.v1 protocol
+  // Issue: https://github.com/lichtblick-suite/lichtblick/issues/750
+  static SUPPORTED_SUBPROTOCOLS = [
+    "foxglove.websocket.v1",
+    "foxglove.sdk.v1"
+  ];

   #emitter = new EventEmitter<EventTypes>();
   #ws: IWebSocket;
@@ -85,8 +91,14 @@ export default class FoxgloveClient {
       this.#emitter.emit("error", event.error ?? new Error("WebSocket error"));
     };
     this.#ws.onopen = (_event) => {
-      if (this.#ws.protocol !== FoxgloveClient.SUPPORTED_SUBPROTOCOL) {
+      // Lichtblick: Support both foxglove.websocket.v1 and foxglove.sdk.v1
+      const supportedProtocols = [
+        FoxgloveClient.SUPPORTED_SUBPROTOCOL,
+        "foxglove.sdk.v1"
+      ];
+
+      if (!supportedProtocols.includes(this.#ws.protocol)) {
         throw new Error(
-          `Expected subprotocol ${FoxgloveClient.SUPPORTED_SUBPROTOCOL}, got '${this.#ws.protocol}'`,
+          `Expected subprotocol ${supportedProtocols.join(" or ")}, got '${this.#ws.protocol}'`,
         );
       }
       this.#emitter.emit("open");
```

#### メリット

| 項目                    | 説明                                      |
| ----------------------- | ----------------------------------------- |
| ✅ **最小限の変更**     | 必要な部分だけをパッチ                    |
| ✅ **既存フローに統合** | プロジェクトは既に7つのパッチを管理       |
| ✅ **実装コスト最小**   | 2-3日で実装完了                           |
| ✅ **リスク最小**       | 既存コードへの影響が最小限                |
| ✅ **自動再適用**       | `pnpm update`時に自動でパッチ再適用       |
| ✅ **レビュー容易**     | パッチファイルがGit管理されるため差分明確 |
| ✅ **検証済み**         | Floraプロジェクト（PR#97）で実証済み      |

#### デメリット

| 項目                    | 説明                                                  |
| ----------------------- | ----------------------------------------------------- |
| ⚠️ **パッチの脆弱性**   | 上流の大幅変更でパッチが適用不可になる可能性          |
| ⚠️ **型定義の問題**     | IDEが元の型定義を参照（パッチ後の変更が反映されない） |
| ⚠️ **デバッグ困難**     | パッチ適用後のコードをデバッグする際に混乱            |
| ⚠️ **ドキュメント不足** | パッチの意図が読み取りにくい                          |

#### パッチ管理のベストプラクティス

```markdown
# patches/README.md

## @foxglove/ws-protocol パッチ

### 目的

foxglove_bridge v3.2.0+ (Foxglove SDK) との互換性確保

### 変更内容

1. `foxglove.sdk.v1` プロトコルのサポート追加
2. プロトコル検証ロジックの緩和

### 影響範囲

- FoxgloveClient.ts のプロトコルチェック部分のみ
- その他の機能には影響なし

### テスト

- foxglove_bridge v3.1.x: ✅ 互換性維持
- foxglove_bridge v3.2.0+: ✅ 互換性確保

### 関連Issue

- https://github.com/lichtblick-suite/lichtblick/issues/750

### 更新履歴

- 2025-11-05: 初版作成
```

#### 実装フェーズ

```
Phase 1: パッチ作成 (1日)
  ├─ パッケージの編集可能化
  ├─ FoxgloveClient.ts の修正
  ├─ パッチの生成
  └─ Git コミット

Phase 2: 統合 (1日)
  ├─ FoxgloveWebSocketPlayer の修正
  ├─ DEPENDENCY MAP コメントの追加
  └─ 動作確認

Phase 3: テスト (0.5-1日)
  ├─ 単体テスト実行
  ├─ E2Eテスト実行
  ├─ foxglove_bridge v3.1.x での動作確認
  └─ foxglove_bridge v3.2.0+ での動作確認

Phase 4: ドキュメント (0.5日)
  ├─ patches/README.md 更新
  ├─ docs/issue-750-investigation.md 更新
  └─ CHANGELOG.md 更新
```

#### コスト見積もり

- **初期開発**: 2-3営業日
- **初期投資**: 約16-24時間
- **月次メンテナンス**: 低（パッケージ更新時のみ、約1-2時間）
- **年間コスト**: 約10-20時間

---

## 推奨アプローチ

### 段階的実装戦略

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: 即時対応（案3 - パッチ管理）                        │
│ 期間: 2-3日                                                  │
│ ├─ パッチ作成と適用                                         │
│ ├─ WebSocket接続部分の修正                                  │
│ ├─ テスト実施                                               │
│ └─ リリース                                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: 評価期間（3-6ヶ月）                                │
│ ├─ パッチの安定性を監視                                     │
│ ├─ @foxglove/ws-protocol のアップデート頻度確認             │
│ ├─ パッチの破損回数を記録                                   │
│ └─ コミュニティからのフィードバック収集                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: 戦略的判断                                          │
│                                                              │
│ IF パッチが安定 AND アップデート頻度が低い:                  │
│   → 案3を継続                                               │
│                                                              │
│ ELSE IF パッチが時々破損 OR アップデート頻度が中程度:        │
│   → 案2（フォーク）へ移行                                   │
│                                                              │
│ ELSE IF パッチが頻繁に破損 OR 大幅な機能拡張が必要:          │
│   → 案1（独自実装）へ移行                                   │
└─────────────────────────────────────────────────────────────┘
```

### 意思決定フローチャート

```
開始
  ↓
[即時対応が必要か?]
  ├─ YES → [案3: パッチ管理を実装]
  │           ↓
  │         [3-6ヶ月運用]
  │           ↓
  │         [パッチの安定性は?]
  │           ├─ 安定 → [案3を継続]
  │           ├─ 時々破損 → [案2: フォークを検討]
  │           └─ 頻繁に破損 → [案1: 独自実装を検討]
  │
  └─ NO → [リソースに余裕がある?]
            ├─ YES → [案1: 独自実装を実装]
            ├─ SOME → [案2: フォークを実装]
            └─ NO → [案3: パッチ管理を実装]
```

---

## 実装計画

### 案3（パッチ管理）の詳細実装計画

#### Week 1: 実装とテスト

##### Day 1: パッチ作成

```
AM:
  ├─ pnpm patch @foxglove/ws-protocol 実行
  ├─ FoxgloveClient.ts の編集
  └─ パッチの生成とコミット

PM:
  ├─ FoxgloveWebSocketPlayer の修正
  ├─ DEPENDENCY MAP コメント追加
  └─ ローカル動作確認
```

##### Day 2: 統合テスト

```
AM:
  ├─ 単体テスト実行・修正
  ├─ E2Eテスト実行・修正
  └─ ビルド確認

PM:
  ├─ foxglove_bridge v3.1.x での動作確認
  ├─ foxglove_bridge v3.2.0+ での動作確認
  └─ 異常系のテスト
```

##### Day 3: ドキュメントとリリース

```
AM:
  ├─ patches/README.md 作成
  ├─ docs/issue-750-investigation.md 更新
  ├─ docs/03_plans/foxglove-websocket-compatibility/ 更新
  └─ CHANGELOG.md 更新

PM:
  ├─ PR作成
  ├─ レビュー対応
  └─ マージ・リリース
```

### チェックリスト

#### パッチ作成時

- [ ] `pnpm patch @foxglove/ws-protocol` 実行
- [ ] FoxgloveClient.ts の `#reconnect()` メソッドを編集
- [ ] プロトコルチェックロジックの変更
- [ ] コメントの追加（理由、Issue番号）
- [ ] `pnpm patch-commit` でパッチ生成
- [ ] patches/@foxglove__ws-protocol@0.7.2.patch の確認

#### WebSocket接続部分の修正時

- [ ] FoxgloveWebSocketPlayer/index.ts の `#open()` メソッドを編集
- [ ] 複数プロトコルをサポートする配列を定義
- [ ] WebSocket/WorkerSocketAdapter の初期化に配列を渡す
- [ ] DEPENDENCY MAP コメントを追加
- [ ] パッチファイルへの参照を追加

#### テスト時

- [ ] 単体テスト（Jest）が全てパス
- [ ] E2Eテスト（Playwright）が全てパス
- [ ] foxglove_bridge v3.1.x での接続成功
- [ ] foxglove_bridge v3.2.0+ での接続成功
- [ ] エラーメッセージの確認
- [ ] ログメッセージの確認

#### ドキュメント作成時

- [ ] patches/README.md にパッチの説明追加
- [ ] docs/issue-750-investigation.md の更新
- [ ] docs/03_plans/ にこのドキュメントを配置
- [ ] CHANGELOG.md に変更内容を記載
- [ ] コミットメッセージは Conventional Commits 形式

#### リリース前

- [ ] PR作成とレビュー依頼
- [ ] CI/CDパイプラインの成功確認
- [ ] コードレビューの対応
- [ ] Issue #750 へのリンク確認
- [ ] マージ後の動作確認

---

## リスク評価

### 案3（パッチ管理）のリスク分析

#### 高リスク

| リスク                                 | 発生確率 | 影響度 | 対策                                       |
| -------------------------------------- | -------- | ------ | ------------------------------------------ |
| @foxglove/ws-protocol の大幅な書き換え | 中       | 高     | 定期的なバージョン確認、パッチの再作成準備 |
| パッチの自動適用失敗                   | 低       | 高     | CI/CDでパッチ適用の検証                    |

#### 中リスク

| リスク                           | 発生確率 | 影響度 | 対策                             |
| -------------------------------- | -------- | ------ | -------------------------------- |
| 新しいプロトコルバージョンの追加 | 中       | 中     | 柔軟なプロトコルチェックロジック |
| パフォーマンスへの影響           | 低       | 中     | ベンチマークテストの実施         |
| 型定義の不一致                   | 中       | 中     | TypeScript strict mode での検証  |

#### 低リスク

| リスク             | 発生確率 | 影響度 | 対策                            |
| ------------------ | -------- | ------ | ------------------------------- |
| ドキュメントの不足 | 中       | 低     | 包括的なドキュメント作成        |
| コミュニティの混乱 | 低       | 低     | Issue での説明、README での明記 |

### リスク低減戦略

1. **定期的な監視**

   - @foxglove/ws-protocol の更新を月次でチェック
   - CHANGELOG を確認し、破壊的変更の有無を確認

2. **自動テスト**

   - CI/CDパイプラインでパッチ適用の検証
   - foxglove_bridge v3.1.x と v3.2.0+ の両方でテスト

3. **フォールバックプラン**

   - パッチが破損した場合、案2（フォーク）への移行準備
   - 案1（独自実装）の設計書を予め作成

4. **コミュニケーション**
   - Issue #750 での進捗共有
   - コミュニティへの情報提供

---

## 意思決定基準

### パッチ管理（案3）を継続する条件

✅ 以下の条件を全て満たす場合、案3を継続：

1. パッチの適用成功率が95%以上
2. @foxglove/ws-protocol のメジャーバージョンアップが年1回以下
3. パッチの再作成が年2回以下
4. コミュニティからのクレームがない
5. パフォーマンスへの影響が5%未満

### フォーク（案2）への移行条件

⚠️ 以下のいずれかに該当する場合、案2へ移行：

1. パッチが半年間で3回以上破損
2. @foxglove/ws-protocol のメジャーバージョンアップが年2回以上
3. Lichtblick独自の機能追加が必要になった
4. パッチの複雑度が増し、管理が困難になった
5. 上流のバグ修正を即座に取り込む必要が出た

### 独自実装（案1）への移行条件

❌ 以下のいずれかに該当する場合、案1へ移行：

1. フォークのメンテナンスコストが月8時間を超えた
2. 上流との互換性維持が困難になった
3. Lichtblick独自のプロトコル拡張が大規模に必要になった
4. @foxglove/ws-protocol が廃止またはアーキテクチャが大幅変更された
5. チームリソースに余裕があり、長期的な投資が可能になった

---

## 関連ドキュメント

### Issues

- [lichtblick#750](https://github.com/lichtblick-suite/lichtblick/issues/750) - メインIssue
- [lichtblick#604](https://github.com/lichtblick-suite/lichtblick/issues/604) - 過去の議論

### Discussions

- [lichtblick#547](https://github.com/lichtblick-suite/lichtblick/discussions/547) - コミュニティディスカッション

### 参考実装

- [Flora PR#97](https://github.com/flora-suite/flora/pull/97/files) - Floraの実装例

### 技術リソース

- [@foxglove/ws-protocol GitHub](https://github.com/foxglove/ws-protocol)
- [Foxglove SDK GitHub](https://github.com/foxglove/foxglove-sdk)
- [Foxglove WebSocket Protocol Spec](https://github.com/foxglove/ws-protocol/blob/main/docs/spec.md)

### 内部ドキュメント

- `docs/issue-750-investigation.md` - 詳細な調査レポート
- `docs/03_plans/foxglove-websocket-compatibility/` - 実装計画ディレクトリ
- `patches/README.md` - パッチ管理ガイド（作成予定）

---

## 付録

### A. プロトコル仕様の比較

#### foxglove.websocket.v1

```
サブプロトコル: foxglove.websocket.v1
実装: @foxglove/ws-protocol
リポジトリ: https://github.com/foxglove/ws-protocol
言語: TypeScript, Python, C++
ステータス: メンテナンス中（新機能追加は少ない）
```

#### foxglove.sdk.v1

```
サブプロトコル: foxglove.sdk.v1
実装: Foxglove SDK
リポジトリ: https://github.com/foxglove/foxglove-sdk
言語: C++, Python, Rust
ステータス: アクティブ開発中
```

### B. Flora実装の分析

Flora（Foxgloveの別フォーク）は既に foxglove.sdk.v1 対応を完了。

**変更内容**:

- WebSocket接続時に複数プロトコルを指定
- プロトコルチェックの緩和

**参照**: [Flora PR#97](https://github.com/flora-suite/flora/pull/97/files)

**検証結果**: ✅ 成功

### C. コマンドリファレンス

#### パッチ管理

```bash
# パッケージを編集可能にする
pnpm patch <package-name>

# パッチを生成
pnpm patch-commit <temp-directory>

# パッチを削除
rm patches/<package-name>@<version>.patch
# package.json の pnpm.patchedDependencies からも削除

# パッチの再適用
pnpm install
```

#### テスト

```bash
# 単体テスト
npm run test

# E2Eテスト（Web）
npm run test:e2e:web

# E2Eテスト（Desktop）
npm run test:e2e:desktop

# カバレッジ
npm run test:coverage
```

#### ビルド

```bash
# 開発ビルド（Web）
npm run web:build:dev

# 本番ビルド（Web）
npm run web:build:prod

# 開発ビルド（Desktop）
npm run desktop:build:dev

# 本番ビルド（Desktop）
npm run desktop:build:prod
```

---

**最終更新**: 2025年11月5日
**次回レビュー**: 2025年11月中旬（実装後）
**担当**: Lichtblick開発チーム
