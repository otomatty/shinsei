# Lichtblick埋め込み 選択肢と推奨事項 - クイックサマリー

**日付**: 2025年10月14日
**ステータス**: 調査完了・実装提案済み

---

## 🎯 質問と回答

### Q: Next.jsアプリへの埋め込みにどのような選択肢がありますか?

**A: 5つの主要な選択肢があります:**

1. ✅ **iframe + URL方式の最適化**（推奨）

   - 既存実装を活用
   - パラメータ調整で即座に改善可能
   - 実装コスト: 最小

2. ⚠️ **postMessage APIによる直接通信**

   - 大きなファイルには不適
   - 実装コスト: 大

3. 🔄 **Service Workerプロキシキャッシュ**

   - 複雑だが効果的
   - 実装コスト: 中

4. 🏗️ **専用プロキシサーバー**

   - 最も高性能だがコスト高
   - 実装コスト: 大

5. ⭐ **MCAPインデックス化**（推奨）
   - 最も効果的な最適化
   - 実装コスト: 中

---

### Q: なぜ複数ファイル再生が遅いのですか?

**A: 主な原因は3つです:**

1. **HTTP Range Requestの累積遅延**

   - 各ファイルに独立したHTTP接続
   - 10ファイル × 200ms = 2秒の遅延

2. **小さな先読みバッファ**

   - 現在: 10秒（readAheadDuration）
   - バッファ不足で頻繁にネットワークリクエスト

3. **キャッシュサイズ不足**
   - 現在: 500MiB
   - 複数ファイルでは不十分

---

## 🚀 推奨する実装プラン

### Phase 1: 即時対応（今日〜明日）

```typescript
// ✅ readAheadDuration: 10秒 → 30秒
readAheadDuration: { sec: 30, nsec: 0 }

// ✅ キャッシュサイズ: 500MiB → 1GiB
cacheSizeInBytes: 1024 * 1024 * 1000
```

**期待効果**: 1.5-2倍の速度改善

---

### Phase 2: 短期対応（1-2週間）

**MCAPインデックス化の実装**

```
MCAPアップロード → Lambda関数 → インデックス生成 → S3保存
                                              ↓
Lichtblick起動 → インデックスチェック → 高速読み込み
```

**期待効果**: 追加で2-3倍の速度改善

---

## 📊 総合的な改善予測

| フェーズ | 実装時間    | 速度改善  | コスト            |
| -------- | ----------- | --------- | ----------------- |
| Phase 1  | 10分        | 1.5-2倍   | 無料              |
| Phase 2  | 1-2週間     | 追加2-3倍 | Lambda: $10-30/月 |
| **合計** | **1-2週間** | **3-5倍** | **$10-30/月**     |

---

## 🎬 次のアクション

### 今すぐできること（5分）

1. **readAheadDurationの変更**

   ```bash
   # ファイル: packages/suite-base/src/dataSources/RemoteDataSourceFactory.tsx
   # 行: 113
   readAheadDuration: { sec: 30, nsec: 0 }, // 10 → 30
   ```

2. **キャッシュサイズの変更**

   ```bash
   # ファイル: packages/suite-base/src/players/IterablePlayer/Mcap/RemoteFileReadable.ts
   # 行: 17
   cacheSizeInBytes: 1024 * 1024 * 1000, // 500 → 1000
   ```

3. **テスト**
   ```bash
   yarn web:serve
   # 複数MCAPファイルで再生速度を確認
   ```

---

### 1-2週間後に実装すること

1. **Lambda関数の作成**

   - MCAPインデックス生成
   - S3イベント通知の設定

2. **Lichtblick側の対応**
   - インデックスファイル読み込み
   - チャンクのプリフェッチ

---

## 📄 詳細ドキュメント

- **調査レポート**: `docs/reports/2025_10/20251014_lichtblick_embedding_options_investigation.md`
- **実装提案**: `docs/reports/2025_10/20251014_performance_optimization_proposal.md`
- **既存ドキュメント**: `docs/development/lichtblick-embedding-requirements.md`

---

## 🤝 サポートが必要な場合

ご不明な点がございましたら、以下をお知らせください:

1. 現在のネットワーク環境（帯域、レイテンシー）
2. 典型的なMCAPファイルのサイズ
3. 同時再生するファイル数
4. AWSのインフラ構成

これらの情報を元に、さらに詳細な最適化提案が可能です。
