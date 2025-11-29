# Issue #750 根本的解決策の比較

## 概要

このドキュメントでは、foxglove_bridge v3.2.0以降との互換性問題に対する3つの根本的な解決策を比較します。

## 解決策の比較表

| 項目                   | 案1: 独自実装 | 案2: フォーク      | 案3: パッチ管理      |
| ---------------------- | ------------- | ------------------ | -------------------- |
| **実装コスト**         | 高 (2-3週間)  | 中 (1-2週間)       | 低 (2-3日)           |
| **メンテナンスコスト** | 高 (継続的)   | 中 (定期的)        | 低 (必要時のみ)      |
| **自律性**             | 完全          | 高                 | 低                   |
| **上流との同期**       | 不要          | 手動マージ         | 自動（パッチ再適用） |
| **将来の拡張性**       | 最高          | 高                 | 限定的               |
| **リスク**             | 実装バグ      | マージコンフリクト | パッチの破損         |
| **技術的負債**         | 低            | 中                 | 中                   |

## 案1: 独自WebSocketプロトコル実装 `@lichtblick/ws-protocol`

### アーキテクチャ

```
packages/
  ├── lichtblick-ws-protocol/
  │   ├── src/
  │   │   ├── client/
  │   │   │   ├── LichtblickClient.ts         # メインクライアント実装
  │   │   │   ├── ProtocolHandler.ts          # プロトコルバージョン管理
  │   │   │   └── MessageParser.ts            # メッセージパース処理
  │   │   ├── types/
  │   │   │   ├── messages.ts                 # メッセージ型定義
  │   │   │   └── protocols.ts                # プロトコル定義
  │   │   ├── utils/
  │   │   │   ├── serialization.ts
  │   │   │   └── validation.ts
  │   │   └── index.ts
  │   ├── package.json
  │   └── tsconfig.json
```

### 実装の核心部分

```typescript
// packages/lichtblick-ws-protocol/src/client/LichtblickClient.ts

export class LichtblickClient {
  static SUPPORTED_SUBPROTOCOLS = ["foxglove.websocket.v1", "foxglove.sdk.v1"];

  private negotiatedProtocol: string | null = null;

  constructor({ ws }: { ws: IWebSocket }) {
    this.#ws = ws;
    this.#initialize();
  }

  #initialize() {
    this.#ws.onopen = (event) => {
      // サーバーが選択したプロトコルを取得
      this.negotiatedProtocol = this.#ws.protocol;

      // プロトコルバージョンの検証（柔軟に）
      if (!LichtblickClient.SUPPORTED_SUBPROTOCOLS.includes(this.negotiatedProtocol)) {
        throw new Error(
          `Unsupported protocol: ${this.negotiatedProtocol}. ` +
            `Supported: ${LichtblickClient.SUPPORTED_SUBPROTOCOLS.join(", ")}`,
        );
      }

      this.#emitter.emit("open");
    };
  }
}
```

### メリット詳細

1. **完全な自律性**: Foxgloveの変更に影響されない
2. **最適化の余地**: Lichtblick専用の最適化が可能
3. **プロトコル拡張**: 独自機能の追加が容易
4. **Issue #604の方針に合致**: チームが言及していた長期戦略

### 実装ステップ

1. **Phase 1: パッケージ構造の作成** (2-3日)

   - `packages/lichtblick-ws-protocol/` 作成
   - 基本的な型定義とインターフェース

2. **Phase 2: クライアント実装** (5-7日)

   - `LichtblickClient` の実装
   - メッセージパーサー実装
   - プロトコルハンドラー実装

3. **Phase 3: 統合とテスト** (3-5日)

   - `FoxgloveWebSocketPlayer`の移行
   - 単体テスト・統合テスト
   - E2Eテスト

4. **Phase 4: ドキュメント作成** (2日)
   - API ドキュメント
   - 移行ガイド

### コスト見積もり

- **開発時間**: 12-17営業日
- **初期投資**: 高
- **ランニングコスト**: 中（バグ修正、機能追加）

---

## 案2: `@foxglove/ws-protocol`のフォーク

### 実装アプローチ

```bash
# 1. フォーク作成
git clone https://github.com/foxglove/ws-protocol.git lichtblick-foxglove-ws-protocol
cd lichtblick-foxglove-ws-protocol

# 2. リモートの設定
git remote rename origin upstream
git remote add origin https://github.com/lichtblick-suite/foxglove-ws-protocol.git

# 3. ブランチ戦略
git checkout -b lichtblick-main  # メインブランチ
```

### 変更内容

```typescript
// typescript/ws-protocol/src/FoxgloveClient.ts

export default class FoxgloveClient {
  // 複数プロトコルをサポート
  static SUPPORTED_SUBPROTOCOLS = ["foxglove.websocket.v1", "foxglove.sdk.v1"];

  #reconnect() {
    // ... existing code ...

    this.#ws.onopen = (_event) => {
      // プロトコルチェックを緩和
      const supportedProtocols = [FoxgloveClient.SUPPORTED_SUBPROTOCOL, "foxglove.sdk.v1"];

      if (!supportedProtocols.includes(this.#ws.protocol)) {
        throw new Error(
          `Expected one of ${supportedProtocols.join(", ")}, got '${this.#ws.protocol}'`,
        );
      }

      this.#emitter.emit("open");
    };

    // ... rest of the code ...
  }
}
```

### メンテナンスフロー

```bash
# 上流の変更を定期的に取り込む
git fetch upstream
git checkout lichtblick-main
git merge upstream/main

# コンフリクトがあれば解決
# npm test で動作確認
# npm publish で公開
```

### メリット詳細

1. **既存コードの活用**: テスト済みの実装を利用
2. **段階的な拡張**: 必要な変更だけを追加
3. **上流のメリット**: バグ修正やセキュリティパッチを取り込める

### デメリット詳細

1. **マージの手間**: 上流の大きな変更時にコンフリクト
2. **テストの維持**: 上流のテストとLichtblick独自のテスト
3. **公開の管理**: NPMへの公開とバージョン管理

### コスト見積もり

- **初期開発**: 7-10営業日
- **月次メンテナンス**: 2-4時間（上流の変更確認・マージ）

---

## 案3: パッチファイル管理（pnpm patch）⭐️推奨

### 実装手順

#### ステップ1: パッチの作成

```bash
# 1. パッケージを編集可能にする
pnpm patch @foxglove/ws-protocol

# 出力例:
# You can now edit the following folder: /tmp/pnpm-patch-xyz/@foxglove/ws-protocol
```

#### ステップ2: ファイルの編集

```typescript
// /tmp/pnpm-patch-xyz/@foxglove/ws-protocol/src/FoxgloveClient.ts

export default class FoxgloveClient {
  static SUPPORTED_SUBPROTOCOL = "foxglove.websocket.v1";

  // Lichtblick: Add support for foxglove.sdk.v1 protocol
  static SUPPORTED_SUBPROTOCOLS = ["foxglove.websocket.v1", "foxglove.sdk.v1"];

  #reconnect() {
    this.#ws.binaryType = "arraybuffer";
    this.#ws.onerror = (event: { error?: Error }) => {
      this.#emitter.emit("error", event.error ?? new Error("WebSocket error"));
    };

    this.#ws.onopen = (_event) => {
      // Lichtblick: Support both foxglove.websocket.v1 and foxglove.sdk.v1
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

#### ステップ3: パッチの生成

```bash
# パッチファイルを生成
pnpm patch-commit /tmp/pnpm-patch-xyz/@foxglove/ws-protocol

# 自動的に以下が実行される:
# 1. patches/@foxglove__ws-protocol@0.7.2.patch が作成
# 2. package.json の pnpmfile.cjs セクションに追加
```

#### ステップ4: WebSocket接続部分の修正

```typescript
// packages/suite-base/src/players/FoxgloveWebSocketPlayer/index.ts

#open = (): void => {
  // ... existing code ...

  // Support both protocols by specifying them in connection
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

### パッチファイルの例

```diff
# patches/@foxglove__ws-protocol@0.7.2.patch

diff --git a/src/FoxgloveClient.ts b/src/FoxgloveClient.ts
index abc123..def456 100644
--- a/src/FoxgloveClient.ts
+++ b/src/FoxgloveClient.ts
@@ -85,8 +85,12 @@ export default class FoxgloveClient {
     this.#ws.onerror = (event: { error?: Error }) => {
       this.#emitter.emit("error", event.error ?? new Error("WebSocket error"));
     };
     this.#ws.onopen = (_event) => {
-      if (this.#ws.protocol !== FoxgloveClient.SUPPORTED_SUBPROTOCOL) {
+      // Lichtblick: Support both foxglove.websocket.v1 and foxglove.sdk.v1
+      const supportedProtocols = [
+        FoxgloveClient.SUPPORTED_SUBPROTOCOL,
+        "foxglove.sdk.v1"
+      ];
+      if (!supportedProtocols.includes(this.#ws.protocol)) {
         throw new Error(
-          `Expected subprotocol ${FoxgloveClient.SUPPORTED_SUBPROTOCOL}, got '${this.#ws.protocol}'`,
+          `Expected subprotocol ${supportedProtocols.join(" or ")}, got '${this.#ws.protocol}'`,
         );
       }
```

### メリット詳細

1. **最小限の変更**: 必要な部分だけパッチ
2. **既存フローに統合**: プロジェクトは既に7つのパッチを管理中
3. **アップグレード対応**: `pnpm update`時に自動再適用
4. **レビュー容易**: パッチファイルがGit管理されるため差分が明確

### デメリット詳細

1. **パッチの脆弱性**: 上流の大幅な変更でパッチが適用できなくなる可能性
2. **型定義の問題**: IDEが元の型定義を参照（パッチ後の変更が反映されない）
3. **デバッグ困難**: パッチ適用後のコードをデバッグする際に混乱

### パッチ管理のベストプラクティス

```typescript
// packages/suite-base/src/players/FoxgloveWebSocketPlayer/index.ts
// ファイル先頭にパッチの説明を追加

/**
 * DEPENDENCY MAP:
 *
 * External Dependencies (patched):
 *   ├─ @foxglove/ws-protocol@0.7.2 (PATCHED)
 *   │   └─ Patch: patches/@foxglove__ws-protocol@0.7.2.patch
 *   │   └─ Reason: Support foxglove.sdk.v1 protocol for compatibility with
 *   │              foxglove_bridge v3.2.0+
 *   │   └─ Issue: https://github.com/lichtblick-suite/lichtblick/issues/750
 *
 * Note: This file depends on a patched version of @foxglove/ws-protocol.
 * If upgrading the package, ensure the patch is still compatible.
 */
```

### コスト見積もり

- **初期実装**: 2-3営業日
- **メンテナンス**: 低（パッケージ更新時のみ）
- **リスク**: 中（上流の大幅変更時）

---

## 推奨案の選択基準

### 短期的に推奨: **案3（パッチ管理）**

以下の理由から、まず案3で対応することを推奨します：

1. ✅ **即効性**: 2-3日で実装完了
2. ✅ **既存フローに統合**: プロジェクトは既にパッチ管理を使用
3. ✅ **リスク最小**: 既存コードへの影響が最小限
4. ✅ **検証可能**: Floraプロジェクトで実証済み

### 中長期的に推奨: **案1（独自実装）**

以下の条件が揃ったら案1への移行を検討：

1. ⚠️ パッチが複数回破損した経験
2. ⚠️ Foxgloveとの機能差が拡大
3. ⚠️ チームリソースに余裕がある
4. ⚠️ Issue #604で言及された`@lichtblick/ws-protocol`計画の再開

---

## 実装の優先順位

### Phase 1: 即時対応（案3）

```
Week 1-2: パッチ作成と適用
  ├─ Day 1: パッチファイル作成
  ├─ Day 2: WebSocket接続部分の修正
  ├─ Day 3: テスト実施
  └─ Day 4-5: ドキュメント更新、リリース
```

### Phase 2: 評価期間（3-6ヶ月）

```
- パッチの安定性を監視
- @foxglove/ws-protocol のアップデート頻度を確認
- コミュニティからのフィードバック収集
```

### Phase 3: 戦略的判断

```
IF パッチが安定:
  → 案3を継続
ELSE IF パッチが頻繁に破損:
  → 案2（フォーク）または案1（独自実装）へ移行
```

---

## 関連ドキュメント

- Issue: [lichtblick#750](https://github.com/lichtblick-suite/lichtblick/issues/750)
- Issue: [lichtblick#604](https://github.com/lichtblick-suite/lichtblick/issues/604)
- 調査レポート: `docs/issue-750-investigation.md`
- Flora実装: [flora#97](https://github.com/flora-suite/flora/pull/97/files)

---

**作成日**: 2025年11月5日
**作成者**: GitHub Copilot
**ステータス**: 提案中
