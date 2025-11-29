# SORA: Foxglove Bridge互換性修正 クイックスタート

**所要時間**: 約30分
**対象**: 今すぐ問題を解決したい開発者

---

## 🚀 最速の修正手順

### 前提条件

```bash
cd /Users/sugaiakimasa/apps/lichtblick
```

---

## ステップ1: パッチ作成 (5分)

```bash
# 1. パッケージを編集可能にする
pnpm patch @foxglove/ws-protocol

# 👉 出力されたパスをコピー（例: /tmp/xxxxx）
```

---

## ステップ2: プロトコル検証の修正 (10分)

```bash
# 2. パッチディレクトリに移動
cd /tmp/xxxxx  # 👈 実際のパスに置き換え

# 3. FoxgloveClient.ts を編集
code src/FoxgloveClient.ts
```

**編集箇所を探す**: `this.#ws.onopen = (_event) => {`

**変更前**:

```typescript
if (this.#ws.protocol !== FoxgloveClient.SUPPORTED_SUBPROTOCOL) {
  throw new Error(...);
}
```

**変更後**:

```typescript
const acceptedProtocols = [
  FoxgloveClient.SUPPORTED_SUBPROTOCOL,
  "foxglove.sdk.v1",
];

if (!acceptedProtocols.includes(this.#ws.protocol)) {
  throw new Error(...);
}
```

保存して閉じる。

---

## ステップ3: WebSocket接続の修正 (5分)

```bash
# 4. プロジェクトルートに戻る
cd /Users/sugaiakimasa/apps/lichtblick

# 5. FoxgloveWebSocketPlayer を編集
code packages/suite-base/src/players/FoxgloveWebSocketPlayer/index.ts
```

**編集箇所を探す**: 約179行目 `this.#client = new FoxgloveClient({`

**変更前**:

```typescript
this.#client = new FoxgloveClient({
  ws:
    typeof Worker !== "undefined"
      ? new WorkerSocketAdapter(this.#url, [FoxgloveClient.SUPPORTED_SUBPROTOCOL])
      : new WebSocket(this.#url, [FoxgloveClient.SUPPORTED_SUBPROTOCOL]),
});
```

**変更後**:

```typescript
const SUPPORTED_PROTOCOLS = [FoxgloveClient.SUPPORTED_SUBPROTOCOL, "foxglove.sdk.v1"];

this.#client = new FoxgloveClient({
  ws:
    typeof Worker !== "undefined"
      ? new WorkerSocketAdapter(this.#url, SUPPORTED_PROTOCOLS)
      : new WebSocket(this.#url, SUPPORTED_PROTOCOLS),
});
```

保存して閉じる。

---

## ステップ4: パッチ生成とビルド (10分)

```bash
# 6. パッチをコミット
pnpm patch-commit /tmp/xxxxx  # 👈 ステップ1のパスを使用

# 7. 依存関係を再インストール
pnpm install

# 8. ビルド
pnpm run build:packages
pnpm run web:build:dev

# または Desktop版
# pnpm run desktop:build:dev
```

---

## ステップ5: テスト (5分)

```bash
# 9. ROS環境でbridgeを起動
ros2 launch foxglove_bridge foxglove_bridge_launch.xml port:=8765

# 10. 別ターミナルでSORAを起動
pnpm run web:serve

# 11. ブラウザで接続テスト
# http://localhost:8080 → Foxglove WebSocket → ws://localhost:8765
```

---

## ✅ 成功の確認

- [ ] エラーメッセージが出ない
- [ ] 接続ステータスが "Connected"
- [ ] トピックリストが表示される

---

## 🎯 コミット

```bash
git add packages/suite-base/src/players/FoxgloveWebSocketPlayer/index.ts
git add patches/@foxglove__ws-protocol@0.7.2.patch
git add package.json

git commit -m "fix: Add support for foxglove.sdk.v1 protocol

Resolves compatibility with foxglove_bridge v3.2.0+"
```

---

## ❌ 問題が発生した場合

### パッチ適用エラー

```bash
rm -rf node_modules
pnpm install
```

### 接続できない

1. ROS側のログを確認: `Protocol: foxglove.sdk.v1` が表示されているか
2. ブラウザの開発者ツールでWebSocketエラーを確認
3. パッチが正しく適用されているか確認:
   ```bash
   cat patches/@foxglove__ws-protocol@0.7.2.patch
   ```

---

## 📚 詳細ガイド

より詳しい説明が必要な場合:

- [完全な実装ガイド](./implementation-guide-sora.md)
- [戦略ドキュメント](./sora-fork-strategy.md)
- [調査レポート](../../issue-750-investigation.md)

---

**作成日**: 2025年11月6日
**想定時間**: 30分
**難易度**: ⭐⭐ (中級)
