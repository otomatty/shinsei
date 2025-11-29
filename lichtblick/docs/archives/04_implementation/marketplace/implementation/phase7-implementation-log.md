# Lichtblick マーケットプレイス Phase7 実装ログ

## 概要

Phase7 - CRUD操作の実装が完了しました。MarketplaceCardのモックインストール/アンインストール機能を、ExtensionCatalogを使用した実際の機能に置き換えました。

---

## 実装内容

### 1. CRUD操作ハンドラーの実装

#### 新規追加されたImports

```typescript
import { useSnackbar } from "notistack";
import { useMountedState } from "react-use";
import { useExtensionCatalog } from "@lichtblick/suite-base/context/ExtensionCatalogContext";
```

#### 操作状態管理

```typescript
// 操作状態の列挙型
enum OperationStatus {
  IDLE = "idle",
  INSTALLING = "installing",
  UNINSTALLING = "uninstalling",
}

// 拡張機能IDごとの操作状態管理
const [operationStatus, setOperationStatus] = useState<Record<string, OperationStatus>>({});
```

#### ExtensionCatalogフックの統合

```typescript
// ExtensionCatalogのhooks
const downloadExtension = useExtensionCatalog((state) => state.downloadExtension);
const installExtensions = useExtensionCatalog((state) => state.installExtensions);
const uninstallExtension = useExtensionCatalog((state) => state.uninstallExtension);
const isExtensionInstalled = useExtensionCatalog((state) => state.isExtensionInstalled);

// その他のhooks
const { enqueueSnackbar } = useSnackbar();
const isMounted = useMountedState();
```

### 2. インストール機能の実装

#### handleInstall関数

```typescript
const handleInstall = useCallback(
  async (extension: GroupedExtensionData, version?: string) => {
    const targetVersion = version ?? extension.latestVersion;
    const extensionId = extension.id;

    try {
      setOperationStatus((prev) => ({ ...prev, [extensionId]: OperationStatus.INSTALLING }));

      // マーケットプレイスから該当する拡張機能を検索
      const marketplaceEntry = groupedMarketplaceData
        .flatMap((namespace) => namespace.entries)
        .find((entry) => entry.id === extensionId && entry.version === targetVersion);

      if (!marketplaceEntry?.foxe) {
        throw new Error(`Cannot install extension ${extensionId}, "foxe" URL is missing`);
      }

      // UX - 操作が速すぎる場合のボタンのちらつきを避ける
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 拡張機能をダウンロードしてインストール
      const data = await downloadExtension(marketplaceEntry.foxe);
      const results = await installExtensions("local", [data]);

      const result = results[0];
      if (result?.success === true) {
        enqueueSnackbar(`${extension.displayName} installed successfully`, {
          variant: "success",
        });
        // 必要に応じてマーケットプレイスデータを更新
        void refreshMarketplaceEntries();
      } else {
        const errorMessage =
          result?.error instanceof Error ? result.error.message : "Installation failed";
        throw new Error(errorMessage);
      }
    } catch (error) {
      const err = error as Error;
      enqueueSnackbar(`Failed to install extension ${extensionId}. ${err.message}`, {
        variant: "error",
      });
    } finally {
      if (isMounted()) {
        setOperationStatus((prev) => ({ ...prev, [extensionId]: OperationStatus.IDLE }));
      }
    }
  },
  [
    downloadExtension,
    installExtensions,
    enqueueSnackbar,
    isMounted,
    groupedMarketplaceData,
    refreshMarketplaceEntries,
  ],
);
```

**主な機能:**

- マーケットプレイスデータから対象拡張機能の検索
- foxe URLの存在確認
- ExtensionCatalogを使用したダウンロード+インストール
- 成功/失敗の適切なユーザー通知
- UXを考慮したローディング時間調整
- コンポーネントマウント状態の確認

### 3. アンインストール機能の実装

#### handleUninstall関数

```typescript
const handleUninstall = useCallback(
  async (extension: GroupedExtensionData, _version?: string) => {
    const extensionId = extension.id;
    const namespace = extension.namespace ?? "local";

    // orgの名前空間の拡張機能はアンインストール不可
    if (namespace === "org") {
      enqueueSnackbar(`Cannot uninstall system extension ${extension.displayName}`, {
        variant: "warning",
      });
      return;
    }

    try {
      setOperationStatus((prev) => ({ ...prev, [extensionId]: OperationStatus.UNINSTALLING }));

      // UX - 操作が速すぎる場合のボタンのちらつきを避ける
      await new Promise((resolve) => setTimeout(resolve, 200));

      await uninstallExtension(namespace as "local", extensionId);
      enqueueSnackbar(`${extension.displayName} uninstalled successfully`, {
        variant: "success",
      });

      // 必要に応じてマーケットプレイスデータを更新
      void refreshMarketplaceEntries();
    } catch (error) {
      const err = error as Error;
      enqueueSnackbar(`Failed to uninstall extension ${extensionId}. ${err.message}`, {
        variant: "error",
      });
    } finally {
      if (isMounted()) {
        setOperationStatus((prev) => ({ ...prev, [extensionId]: OperationStatus.IDLE }));
      }
    }
  },
  [uninstallExtension, enqueueSnackbar, isMounted, refreshMarketplaceEntries],
);
```

**主な機能:**

- システム拡張機能（org名前空間）のアンインストール防止
- ExtensionCatalogを使用したアンインストール
- 成功/失敗の適切なユーザー通知
- UXを考慮したローディング時間調整
- コンポーネントマウント状態の確認

### 4. リアルタイム状態管理の強化

#### インストール状態の動的確認

```typescript
// インストール済み拡張機能データ
const installedData: ExtensionData[] = namespacedData.flatMap((namespace) =>
  namespace.entries.map((ext) => ({
    // ...
    installed: isExtensionInstalled(ext.id), // リアルタイムでインストール状態を確認
    // ...
  })),
);

// マーケットプレイス拡張機能データ
const marketplaceExtensions: ExtensionData[] = groupedMarketplaceData.flatMap((namespace) =>
  namespace.entries.map((ext) => ({
    // ...
    installed: isExtensionInstalled(ext.id), // リアルタイムでインストール状態を確認
    // ...
  })),
);
```

#### グループレベルのインストール状態管理

```typescript
// グループ全体のインストール状態を更新（任意のバージョンがインストールされていればtrue）
if (ext.installed || isExtensionInstalled(ext.id)) {
  group.installed = true;
}
```

### 5. MarketplaceCardの統合

#### 以前のモック実装

```typescript
onInstall={(version?: string) => {
  // バージョン指定インストール処理（今後実装予定）
  const targetVersion = version ?? extension.latestVersion;
  void targetVersion;
}}
onUninstall={(version?: string) => {
  // バージョン指定アンインストール処理（今後実装予定）
  const targetVersion = version ?? extension.latestVersion;
  void targetVersion;
}}
```

#### 新しい実装

```typescript
loading={(operationStatus[extension.id] ?? OperationStatus.IDLE) !== OperationStatus.IDLE}
onInstall={(version?: string) => {
  void handleInstall(extension, version);
}}
onUninstall={(version?: string) => {
  void handleUninstall(extension, version);
}}
```

---

## 技術的改善点

### 1. 型安全性の向上

#### エラーハンドリングの改善

- InstallExtensionsResultの型安全な処理
- Error インスタンスの適切な型チェック
- nullable な値の明示的な処理

#### 依存関係の管理

- useMemoフックの依存関係配列にisExtensionInstalledを追加
- リアルタイム状態更新の適切な依存関係管理

### 2. UX/UIの改善

#### ローディング状態の表示

- 拡張機能IDごとの個別ローディング状態管理
- MarketplaceCardでのローディング表示統合

#### ユーザー通知の強化

- 成功/失敗/警告の適切な分類
- わかりやすいエラーメッセージ
- システム拡張機能の安全性警告

#### レスポンシブなUX

- 高速操作でのボタンちらつき防止
- 200msの最小ローディング時間設定
- コンポーネントアンマウント時の状態クリーンアップ

### 3. セキュリティとエラー対応

#### 入力検証

- foxe URLの存在確認
- 名前空間の適切な検証（org vs local）
- MarketplaceEntryの存在確認

#### エラー処理の階층化

- ネットワークエラーの処理
- インストール/アンインストール失敗の処理
- システムレベルの制約による拒否の処理

---

## 動作確認項目

### ✅ インストール機能

- [x] 利用可能な拡張機能のインストール
- [x] foxe URLが不正な場合のエラー処理
- [x] インストール中のローディング表示
- [x] インストール成功時の通知
- [x] インストール失敗時のエラー通知
- [x] インストール後の状態更新

### ✅ アンインストール機能

- [x] インストール済み拡張機能のアンインストール
- [x] システム拡張機能（org）のアンインストール防止
- [x] アンインストール中のローディング表示
- [x] アンインストール成功時の通知
- [x] アンインストール失敗時のエラー通知
- [x] アンインストール後の状態更新

### ✅ UI/UX

- [x] ローディング状態の適切な表示
- [x] ボタンのちらつき防止
- [x] エラーメッセージの明確性
- [x] リアルタイム状態更新

---

## ファイル変更サマリー

### 修正されたファイル

- `packages/suite-base/src/components/ExtensionsSettings/index.tsx`

### 追加された機能

1. **CRUD操作の実装**

   - 実際のインストール/アンインストール機能
   - ExtensionCatalogとの統合

2. **状態管理の強化**

   - 操作状態の追跡
   - リアルタイム状態更新
   - 型安全な状態管理

3. **エラーハンドリング**

   - 包括的なエラー処理
   - ユーザーフレンドリーな通知
   - セキュリティ制約の実装

4. **UX改善**
   - ローディング状態の表示
   - スムーズなアニメーション
   - レスポンシブな操作

---

## 次のステップへの準備

Phase7の実装により、Lichtblickマーケットプレイスは完全に機能するCRUD操作を持つようになりました。これにより以下の展開が可能になります：

### 🚀 Phase8候補: 追加機能の実装

- 拡張機能の有効/無効切り替え
- バージョン指定インストール
- 拡張機能の依存関係管理
- キャッシュとオフライン対応

### 🔧 Phase9候補: パフォーマンス最適化

- 大量拡張機能のページネーション
- 検索インデックスの改善
- 遅延ローディングの実装
- バックグラウンド更新

### 📊 Phase10候補: 分析と監視

- 使用統計の収集
- エラー監視の実装
- パフォーマンス計測
- ユーザー行動分析

Phase7により、マーケットプレイスの核となるCRUD機能が完全に動作し、実用的なExtension管理システムが構築されました。

---

**実装完了日**: `date`
**実装者**: GitHub Copilot
**レビュー状態**: Phase7実装完了
**次回作業**: Phase8以降の検討または他の優先度の高い機能開発
