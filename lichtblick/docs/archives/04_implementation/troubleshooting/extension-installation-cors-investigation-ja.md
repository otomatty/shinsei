# 拡張機能インストール CORS エラー調査レポート

## 現在のステータス

**日付**: 2025年9月28日
**問題**: 拡張機能のインストールがCORSポリシーエラーとHTTP 302リダイレクトで失敗する

## エラー詳細

### 主要エラー

```
Access to fetch at 'https://github.com/Daniel-Alp/foxglove-vex-2d-panel/releases/download/v1.0.0/danielalp.foxglove-vex-2d-panel-1.0.0.foxe' from origin 'http://localhost:8080' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### 副次的エラー

```
GET https://github.com/Daniel-Alp/foxglove-vex-2d-panel/releases/download/v1.0.0/danielalp.foxglove-vex-2d-panel-1.0.0.foxe net::ERR_FAILED 302 (Found)
```

## 現在の実装状況分析

### 1. エラー検出とハンドリング

**場所**: `packages/suite-base/src/components/ExtensionsSettings/index.tsx` (398-428行)

**現在の実装**:

- `includes("CORS")` または `includes("Access-Control-Allow-Origin")` でのCORSエラー検出
- `includes("302")` または `includes("Found")` での302リダイレクトエラー検出
- `includes("Failed to fetch")` でのネットワークエラー検出
- プラットフォーム固有のユーザーガイダンス（デスクトップ版 vs Web版）

**ステータス**: ✅ 実装済みだが根本的な問題を防げていない

### 2. データソース調査

**以前の修正試行**: `groupedMarketplaceData` から `marketplaceEntries.value` への変更
**結果**: ❌ 同じCORSエラーが継続発生
**結論**: データソースの変更では根本原因が解決されなかった

### 3. プラットフォーム検出

**実装**: `isDesktopApp()` ユーティリティの使用
**목적**: Web版とデスクトップ版ユーザーへの異なるエラーメッセージ提供
**ステータス**: ✅ 正常動作中

## 根本原因分析

### 主要問題：デスクトップ版とWeb版のアーキテクチャ差異

**デスクトップアプリ** (`packages/suite-desktop/src/preload/ExtensionHandler.ts`):

- Electronメインプロセス経由での拡張機能ダウンロード
- CORS制限なし（Node.js環境）
- インストール用の直接ファイルシステムアクセス
- ブラウザセキュリティ制限のないネイティブ`fetch`使用

**Webアプリ** (`packages/suite-base/src/providers/ExtensionCatalogProvider.tsx` 96-99行):

```typescript
const downloadExtension = async (url: string) => {
  const res = await fetch(url); // ❌ ブラウザによりCORSブロック
  return new Uint8Array(await res.arrayBuffer());
};
```

### GitHub ReleasesのCORSポリシー

1. **GitHubの動作**: GitHub releaseアセットにはCORSヘッダーが含まれない
2. **ブラウザ制限**: モダンブラウザは適切なヘッダーなしでクロスオリジンリクエストをブロック
3. **302リダイレクト**: GitHubがダウンロードURLをリダイレクトし、追加のCORS問題を引き起こす可能性

### アーキテクチャ上の問題

1. **直接ブラウザFetch**: WebブラウザがGitHub releasesから直接取得を試行
2. **プロキシなし**: CORSを処理する中間サーバーなし
3. **クライアントサイドダウンロード**: ブラウザコンテキストでの拡張機能ダウンロード

## 失敗した解決策の検証

### ❌ 解決策1: データソース変更

- **内容**: `groupedMarketplaceData` から `marketplaceEntries.value` への変更
- **期待**: 不足しているfoxe URLの修正
- **結果**: エラー継続
- **失敗理由**: データソースが問題ではなく、CORSポリシーが根本的問題

### ❌ 解決策2: エラーメッセージ強化

- **内容**: プラットフォーム固有のエラーハンドリングとユーザーガイダンス追加
- **期待**: エラー時のUX改善
- **結果**: エラーメッセージは改善されたがインストールは依然失敗
- **失敗理由**: 根本的なCORS問題を解決していない

## 残調査領域

### 1. 拡張機能カタログアーキテクチャ調査 ✅ 完了

**優先度**: 高
**完了したアクション**:

- ✅ `ExtensionCatalogProvider` 実装の調査
- ✅ 直接fetchを使用する `downloadExtension` 実装の発見
- ✅ デスクトップアプリ vs Webアプリの拡張機能ダウンロード差異の確認
- ✅ ExtensionHandlerによるデスクトップ拡張機能処理の検証

**主要発見事項**:

- **Web版**: `ExtensionCatalogProvider.tsx` 96-99行でシンプルな `fetch(url)` を使用
- **デスクトップ版**: Electronメインプロセス経由での拡張機能ダウンロード（CORS制限なし）
- **根本原因**: GitHub releasesへの直接ブラウザfetchがCORSポリシーによりブロック

### 2. プロキシサーバー調査 🚧 今後対応予定

**優先度**: 高
**対応予定のアクション**:

- [ ] Lichtblickバックエンドで拡張機能プロキシエンドポイントの提供を検討
- [ ] CORS処理用のWebサーバー設定の調査
- [ ] コードベース内の既存プロキシ実装の検索

**調査対象ファイル**:

- Webサーバー設定ファイル
- バックエンドAPIエンドポイント
- プロキシミドルウェア実装

## 推奨解決策

### 解決策A: 一貫したデスクトップアプリ推奨（即時対応） ⭐ **推奨**

**アプローチ**: `ExtensionsSettings/index.tsx` を `ExtensionDetails.tsx` の動作に合わせる
**実装**: ダウンロード試行前にデスクトップアプリチェックを追加
**メリット**:

- コンポーネント間の一貫したUX
- 素早い実装（5分）
- 既存の動作するソリューションを活用
- コードベース内の既存パターンと合致

**デメリット**: Web機能の制限
**コード変更**:

```typescript
const handleInstall = useCallback(async (extension: GroupedExtensionData, version?: string) => {
  if (!isDesktopApp()) {
    enqueueSnackbar("マーケットプレイス拡張機能を使用するにはデスクトップアプリをダウンロードしてください。", {
      variant: "error",
    });
    return;
  }
  // ... 既存のインストールロジック
}, [...]);
```

### 解決策B: バックエンドプロキシ実装（中期対応） 🚧 **今後対応予定**

**アプローチ**: 拡張機能ダウンロードをプロキシするサーバーサイドエンドポイントの作成
**メリット**: CORSを完全に解決、Web機能を維持
**デメリット**: バックエンド変更、サーバーリソース、開発時間が必要
**実装計画**: 専用のプロキシサーバーを構築してGitHub releasesからの拡張機能ダウンロードを仲介

### 解決策C: Service Workerプロキシ（上級者向け）

**アプローチ**: Service Workerを使用してリクエストをインターセプトしプロキシ
**メリット**: クライアントサイドソリューション、バックエンド変更不要
**デメリット**: 複雑な実装、ブラウザ互換性問題

### 解決策D: GitHub API統合（調査対象）

**アプローチ**: GitHub APIを使用して適切なヘッダー付きダウンロードURLを取得
**メリット**: 公式API、潜在的なCORSサポート向上
**デメリット**: APIレート制限、認証要件、依然としてCORS問題の可能性

## 次のステップ優先度

1. **即時対応**（5分 - 推奨）:

   - [x] ExtensionCatalogContext実装の調査
   - [x] デスクトップアプリ拡張機能ダウンロードメカニズムの確認
   - [x] コンポーネント間の不整合動作の特定
   - [ ] **修正**: `ExtensionsSettings/index.tsx` handleInstall関数にデスクトップアプリチェックを追加

2. **短期対応**（今週 - Web機能が必要な場合）:

   - [x] バックエンドプロキシ実装の実現可能性調査
   - [ ] 既存Lichtblickバックエンドエンドポイントの調査
   - [ ] GitHub API代替アプローチのテスト

3. **中期対応**（次スプリント - 高度なソリューションが必要な場合）:
   - [ ] Service Worker実装の調査
   - [ ] プラットフォーム間での包括的テスト
   - [ ] 代替拡張機能配布方法

## テスト環境詳細

### テスト環境

- **プラットフォーム**: Webブラウザ (localhost:8080)
- **拡張機能**: Daniel-Alp/foxglove-vex-2d-panel v1.0.0
- **URL**: `https://github.com/Daniel-Alp/foxglove-vex-2d-panel/releases/download/v1.0.0/danielalp.foxglove-vex-2d-panel-1.0.0.foxe`

### 現在の動作

1. ユーザーが拡張機能の「インストール」をクリック
2. `handleInstall` 関数が実行
3. `downloadExtension(marketplaceEntry.foxe)` が呼び出し
4. ブラウザがGitHubへの直接fetchを試行
5. CORSポリシーがリクエストをブロック
6. 302リダイレクトエラーが同時発生

### 期待される動作

1. 拡張機能が正常にダウンロードされる
2. CORSエラーなしでインストールが完了する
3. ユーザーに成功通知が表示される

## 結論

このCORSエラーは、WebブラウザがCORSヘッダーが不足しているGitHub releaseアセットを直接取得できないという根本的なアーキテクチャ問題です。調査により以下が判明しました：

### 主要発見事項

1. **アーキテクチャ差異**: デスクトップアプリはElectronメインプロセス使用（CORS制限なし）、WebアプリはブラウザfetchUse用（CORSブロック）
2. **実装の不整合**: `ExtensionDetails.tsx` はWebダウンロードをブロック、`ExtensionsSettings/index.tsx` は試行
3. **シンプルな修正が可能**: 両コンポーネントを拡張機能用デスクトップアプリ推奨に統一

### 根本原因

```typescript
// packages/suite-base/src/providers/ExtensionCatalogProvider.tsx (96-99行)
const downloadExtension = async (url: string) => {
  const res = await fetch(url); // ❌ ブラウザセキュリティによりCORSブロック
  return new Uint8Array(await res.arrayBuffer());
};
```

### 推奨される即時対応

一貫したユーザー体験のため、`ExtensionDetails.tsx` に既に存在するデスクトップアプリチェックと同じものを `ExtensionsSettings/index.tsx` に実装する。

### 長期的検討事項

Webベースの拡張機能インストールが要件である場合、セキュリティを維持しながらCORS制限を処理するためのバックエンドプロキシサービスが最も堅牢なソリューションとなります。**今後、専用のプロキシサーバーを構築してこの問題に対応する予定です。**
