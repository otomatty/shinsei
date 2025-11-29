# Tailwind CSS 動作確認ガイド

**✅ 実装完了**: Tailwind CSSは正常に動作しています。

詳細な実装手順については、[docs/TAILWIND_IMPLEMENTATION.md](./docs/TAILWIND_IMPLEMENTATION.md)を参照してください。

## セットアップ手順

### 1. Tailwind CSSのインストール

プロジェクトルートで以下のコマンドを実行してください：

```bash
# bunを使用する場合（推奨）
bun install

# または npmを使用する場合
npm install
```

### 2. 開発サーバーの起動

```bash
# Trunkを使用して開発サーバーを起動
trunk serve

# または package.jsonのスクリプトを使用
bun run dev
# または
npm run dev
```

### 3. 動作確認

ブラウザで `http://localhost:1420` を開くと、以下のTailwind CSSの機能が確認できます：

- ✅ **カスタムカラーパレット**: `primary-500`, `success-500`, `warning-500` など
- ✅ **ダークモード対応**: `bg-background-default`, `text-text-primary` など
- ✅ **レスポンシブデザイン**: `md:grid-cols-3` などのブレークポイント
- ✅ **ユーティリティクラス**: `flex`, `grid`, `rounded-lg`, `shadow-lg` など
- ✅ **ホバーエフェクト**: `hover:bg-primary-600`, `hover:scale-110` など
- ✅ **フォーカススタイル**: `focus:ring-2`, `focus:ring-primary-500` など

## 確認ポイント

1. **カードコンポーネント**: 画面下部に3つのカラフルなカードが表示される
2. **フォームスタイル**: 入力フィールドとボタンがTailwindスタイルで表示される
3. **グラデーション背景**: 画面全体にグラデーション背景が適用される
4. **レスポンシブ**: ウィンドウサイズを変更すると、カードのレイアウトが変わる

## トラブルシューティング

### Tailwind CSSのスタイルが適用されない場合

1. **PostCSS設定の確認**
   - `postcss.config.js` が存在することを確認
   - Trunkが自動的にPostCSSを処理します

2. **Tailwind CSSのインストール確認**
   ```bash
   bun list | grep tailwindcss
   # または
   npm list tailwindcss
   ```

3. **ビルドのクリーンアップ**
   ```bash
   rm -rf dist
   trunk serve
   ```

4. **ブラウザのキャッシュクリア**
   - 開発者ツールを開いてハードリロード（Cmd+Shift+R / Ctrl+Shift+R）

## 次のステップ

Tailwind CSSが正常に動作することを確認したら、以下のステップに進めます：

1. コンポーネントライブラリの実装（`src/components/`）
2. テーマシステムの実装
3. MUIコンポーネントの段階的な再実装

詳細は `docs/TAILWIND_SETUP.md` を参照してください。

