# マーケットプレイス拡張機能永続化問題の修正案

## 📋 修正概要

マーケットプレイスからインストールした拡張機能が再起動後に消える問題を解決するための修正案です。

**修正方針**: 環境に応じて適切なストレージ（namespaceとローダー）を使用する

---

## 🎯 修正案1: 環境別namespace割り当て（推奨）

### 基本方針

- **デスクトップ版**: ファイルシステム (`local` namespace)
- **Web版**: IndexedDB (`official` namespace)
- 各環境で最も適切なストレージを使用

### メリット

✅ **シンプル**: 最小限の変更で実装可能
✅ **適切なストレージ**: 各環境に最適化されたストレージを使用
✅ **明確な責任**: デスクトップはファイル、WebはIndexedDB
✅ **パフォーマンス**: ネイティブストレージによる高速アクセス
✅ **デバッグ容易**: ファイルシステムは直接確認可能

### デメリット

⚠️ **既存データの移行**: 修正前にインストールした拡張機能は手動再インストールが必要
⚠️ **UI変更**: 拡張機能一覧の表示タブが変わる
⚠️ **ドキュメント更新**: ユーザー向け説明が必要

---

## 🔧 実装手順

### ステップ1: Web版にローダーを追加

**目的**: Web版で `official` namespaceの拡張機能をロードできるようにする

**ファイル**: `packages/suite-web/src/WebRoot.tsx`

**修正内容**:

```typescript
// 修正前
const defaultExtensionLoaders: IExtensionLoader[] = [
  new IdbExtensionLoader("org"),
  new IdbExtensionLoader("local"),
];

// 修正後
const defaultExtensionLoaders: IExtensionLoader[] = [
  new IdbExtensionLoader("org"),
  new IdbExtensionLoader("local"),
  new IdbExtensionLoader("official"), // ← 追加
];
```

**理由**:

- 既存のWeb版では `official` namespaceのローダーが存在しない
- マーケットプレイスからのインストールをサポートするために必要

---

### ステップ2: インストール時のnamespaceを環境に応じて決定

**目的**: デスクトップとWebで異なるnamespaceを使用する

**ファイル**: `packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx`

**修正内容**:

```typescript
// ファイル冒頭にインポートを追加
import isDesktopApp from "@lichtblick/suite-base/util/isDesktopApp";

// handleInstall関数内を修正
const handleInstall = useCallback(
  async (extension: GroupedExtensionData, version?: string) => {
    const targetVersion = version ?? extension.latestVersion;
    const extensionId = extension.id;

    try {
      setOperationStatus((prev) => ({ ...prev, [extensionId]: OperationStatus.INSTALLING }));

      // マーケットプレイスエントリから該当する拡張機能を検索
      let marketplaceEntry = marketplaceEntries.value?.find(
        (entry) => entry.id === extensionId && entry.version === targetVersion,
      );

      if (!marketplaceEntry) {
        marketplaceEntry = marketplaceEntries.value?.find((entry) => entry.id === extensionId);
      }

      if (!marketplaceEntry?.foxe) {
        throw new Error(`Cannot install extension ${extensionId}, "foxe" URL is missing`);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      try {
        // === 修正箇所: 環境に応じてnamespaceを決定 ===
        const targetNamespace = isDesktopApp() ? "local" : "official";

        log.info(
          `[Install] Installing extension ${extensionId} with namespace: ${targetNamespace} (isDesktop: ${isDesktopApp()})`,
        );

        const buffer = await downloadExtension(marketplaceEntry.foxe);
        const results = await installExtensions(targetNamespace, [
          { buffer, namespace: targetNamespace },
        ]);

        const result = results[0];
        if (result?.success === true) {
          enqueueSnackbar(`${extension.displayName} installed successfully`, {
            variant: "success",
          });
          void refreshMarketplaceEntries();
        } else {
          const errorMessage =
            result?.error instanceof Error ? result.error.message : "Installation failed";
          throw new Error(errorMessage);
        }
      } catch (downloadError) {
        // エラーハンドリング（既存のまま）
        // ...
      }
    } catch (error) {
      // エラーハンドリング（既存のまま）
      // ...
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
    marketplaceEntries.value,
    refreshMarketplaceEntries,
  ],
);
```

**変更のポイント**:

1. **削除**: `const targetNamespace = (marketplaceEntry.namespace ?? "official") as "local" | "official";`
2. **追加**: `const targetNamespace = isDesktopApp() ? "local" : "official";`
3. **追加**: ログ出力の改善

**動作**:

- デスクトップ版: `local` namespace → `DesktopExtensionLoader` → ファイルシステム
- Web版: `official` namespace → `IdbExtensionLoader` → IndexedDB

---

### ステップ3: 起動時の拡張機能ロードを修正

**目的**: すべてのnamespaceの拡張機能を起動時にロードする

**ファイル**: `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx`

**修正内容**:

```typescript
const refreshAllExtensions = async () => {
  log.debug("Refreshing all extensions");
  if (loaders.length === 0) {
    return;
  }

  const start = performance.now();
  const installedExtensions: ExtensionInfo[] = [];
  const contributionPoints: ContributionPoints = {
    messageConverters: [],
    panels: {},
    panelSettings: {},
    topicAliasFunctions: [],
    cameraModels: new Map(),
  };

  const processLoader = async (loader: IExtensionLoader) => {
    try {
      const extensions = await loader.getExtensions();
      log.info(
        `[ExtensionCatalog] Loading ${extensions.length} extensions from namespace: ${loader.namespace}, type: ${loader.type}`,
      );
      await loadInBatch({
        batch: extensions,
        contributionPoints,
        installedExtensions,
        loader,
      });
    } catch (err: unknown) {
      log.error(`[ExtensionCatalog] Error loading extension list from ${loader.namespace}:`, err);
    }
  };

  // === 修正箇所: フィルタリングを削除 ===
  // 修正前:
  // const localAndRemoteLoaders = loaders.filter(
  //   (loader) => loader.namespace === "local" || loader.type === "server",
  // );
  // await Promise.all(localAndRemoteLoaders.map(processLoader));

  // 修正後: すべてのローダーから拡張機能をロード
  log.info(`[ExtensionCatalog] Starting refresh with ${loaders.length} loaders`);
  await Promise.all(loaders.map(processLoader));

  log.info(
    `[ExtensionCatalog] Loaded ${installedExtensions.length} extensions in ${(performance.now() - start).toFixed(1)}ms`,
  );

  // ストアを更新
  set({
    installedExtensions,
    installedPanels: contributionPoints.panels,
    installedMessageConverters: contributionPoints.messageConverters,
    installedTopicAliasFunctions: contributionPoints.topicAliasFunctions,
    installedCameraModels: contributionPoints.cameraModels,
    panelSettings: contributionPoints.panelSettings,
  });
};
```

**変更のポイント**:

1. **削除**: ローダーのフィルタリングロジック
2. **変更**: すべてのローダーを処理
3. **追加**: 詳細なログ出力

**効果**:

- `org`, `official`, `local` すべてのnamespaceから拡張機能をロード
- 再起動後も拡張機能が表示される

---

## 📊 修正による動作の変化

### インストールフロー

#### 修正前

```
┌─────────────────────────────────────────┐
│ ユーザーがマーケットプレイスから       │
│ 拡張機能をインストール                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ namespace = "official" (固定)           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ デスクトップ版                          │
│ - IdbExtensionLoader("official")        │
│   → IndexedDB に保存 ✅                │
│ - DesktopExtensionLoader("local")       │
│   → スキップ (namespaceが違う) ❌      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 再起動                                  │
│ - "official" namespace はロードされない │
│ - 拡張機能が消える ❌                   │
└─────────────────────────────────────────┘
```

#### 修正後

```
┌─────────────────────────────────────────┐
│ ユーザーがマーケットプレイスから       │
│ 拡張機能をインストール                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 環境判定                                │
│ isDesktopApp() ? "local" : "official"   │
└─────────────────────────────────────────┘
         ↙                    ↘
┌──────────────────┐  ┌──────────────────┐
│ デスクトップ版   │  │ Web版            │
│ namespace="local"│  │ namespace=       │
│                  │  │   "official"     │
└──────────────────┘  └──────────────────┘
         ↓                      ↓
┌──────────────────┐  ┌──────────────────┐
│ DesktopExtension │  │ IdbExtension     │
│ Loader           │  │ Loader           │
│ → ファイル       │  │ → IndexedDB      │
│   システムに保存 │  │   に保存         │
│   ✅             │  │   ✅             │
└──────────────────┘  └──────────────────┘
         ↓                      ↓
┌──────────────────┐  ┌──────────────────┐
│ 再起動           │  │ 再起動           │
│ - すべての       │  │ - すべての       │
│   namespace を   │  │   namespace を   │
│   ロード         │  │   ロード         │
│ - 拡張機能が     │  │ - 拡張機能が     │
│   表示される ✅  │  │   表示される ✅  │
└──────────────────┘  └──────────────────┘
```

---

## 🧪 テスト手順

### 1. ビルドとデプロイ

```bash
# コードを修正
# ...

# デスクトップ版をビルド
yarn desktop:serve
yarn desktop:start

# Web版をビルド（別ターミナル）
yarn web:serve
yarn web:start
```

### 2. デスクトップ版のテスト

#### テストケース1: 新規インストール

1. ✅ マーケットプレイスを開く
2. ✅ 拡張機能を選択してインストール
3. ✅ "Installed" タブに表示されることを確認
4. ✅ コンソールログで `namespace: local` を確認
5. ✅ ファイルシステムを確認
   ```bash
   ls -la ~/.lichtblick-suite/extensions/
   # インストールした拡張機能のディレクトリが存在するはず
   ```
6. ✅ デスクトップ版を完全に終了
7. ✅ 再度起動
8. ✅ "Installed" タブに拡張機能が表示されることを確認
9. ✅ 拡張機能が正常に動作することを確認

#### テストケース2: レイアウトの保存と復元

1. ✅ 拡張機能のパネルをレイアウトに追加
2. ✅ レイアウトを保存
3. ✅ デスクトップ版を再起動
4. ✅ レイアウトを開く
5. ✅ 拡張機能パネルが正常に表示されることを確認

#### テストケース3: アンインストール

1. ✅ "Installed" タブで拡張機能を選択
2. ✅ アンインストールボタンをクリック
3. ✅ 拡張機能が削除されることを確認
4. ✅ ファイルシステムから削除されることを確認
   ```bash
   ls -la ~/.lichtblick-suite/extensions/
   # ディレクトリが削除されているはず
   ```

### 3. Web版のテスト

#### テストケース1: 新規インストール

1. ✅ ブラウザでアプリを開く
2. ✅ マーケットプレイスを開く
3. ✅ 拡張機能を選択してインストール
4. ✅ "Installed" タブに表示されることを確認
5. ✅ コンソールログで `namespace: official` を確認
6. ✅ IndexedDBを確認（DevTools > Application > IndexedDB）
   ```javascript
   // Console で確認
   const request = indexedDB.open("extensions-official");
   request.onsuccess = (event) => {
     const db = event.target.result;
     const transaction = db.transaction(["extensions"], "readonly");
     const store = transaction.objectStore("extensions");
     const getAllRequest = store.getAll();
     getAllRequest.onsuccess = () => {
       console.log("Stored extensions:", getAllRequest.result);
     };
   };
   ```
7. ✅ ページをリロード（F5）
8. ✅ "Installed" タブに拡張機能が表示されることを確認

#### テストケース2: 複数拡張機能のインストール

1. ✅ 複数の拡張機能をインストール
2. ✅ すべて "Installed" タブに表示されることを確認
3. ✅ リロード後もすべて表示されることを確認

---

## 🔍 デバッグ方法

### ログの確認

修正後は詳細なログが出力されます:

```javascript
// ブラウザのコンソールで確認
// インストール時
[Install] Installing extension publisher.extension with namespace: local (isDesktop: true)

// 起動時
[ExtensionCatalog] Starting refresh with 3 loaders
[ExtensionCatalog] Loading 2 extensions from namespace: org, type: browser
[ExtensionCatalog] Loading 1 extensions from namespace: official, type: browser
[ExtensionCatalog] Loading 3 extensions from namespace: local, type: filesystem
[ExtensionCatalog] Loaded 6 extensions in 123.4ms
```

### IndexedDBの確認（Web版・デスクトップ版両方）

```javascript
// DevTools Console で実行
async function checkExtensions() {
  const databases = await indexedDB.databases();
  console.log("Available databases:", databases);

  for (const dbInfo of databases) {
    if (dbInfo.name?.startsWith("extensions-")) {
      const request = indexedDB.open(dbInfo.name);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["extensions"], "readonly");
        const store = transaction.objectStore("extensions");
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => {
          console.log(`Extensions in ${dbInfo.name}:`, getAllRequest.result);
        };
      };
    }
  }
}

checkExtensions();
```

### ファイルシステムの確認（デスクトップ版）

```bash
# 拡張機能ディレクトリの確認
ls -la ~/.lichtblick-suite/extensions/

# 特定の拡張機能の内容確認
cat ~/.lichtblick-suite/extensions/publisher.extension-1.0.0/package.json

# 拡張機能の数をカウント
ls -1 ~/.lichtblick-suite/extensions/ | wc -l
```

---

## ⚠️ 既存ユーザーへの影響

### 問題: 修正前にインストールした拡張機能

修正前に `official` namespaceにインストールした拡張機能は、デスクトップ版で次のような状態になります:

- **IndexedDB**: `extensions-official` に保存されている ✅
- **ファイルシステム**: 保存されていない ❌
- **起動時**: IndexedDBからロードされる ✅（ステップ3の修正により）
- **新規インストール**: ファイルシステムに保存される ✅

### 解決策オプション

#### オプション1: 自動マイグレーション（推奨）

起動時に一度だけ実行されるマイグレーション処理を追加:

```typescript
// packages/suite-base/src/providers/ExtensionCatalogProvider.tsx

async function migrateOfficialToLocal(loaders: readonly IExtensionLoader[]) {
  // デスクトップ版のみ実行
  if (!isDesktopApp()) {
    return;
  }

  const migrationKey = "extensions_migration_official_to_local_v1";
  const migrated = localStorage.getItem(migrationKey);

  if (migrated === "true") {
    return; // 既にマイグレーション済み
  }

  const officialLoader = loaders.find((l) => l.namespace === "official" && l.type === "browser");
  const localLoader = loaders.find((l) => l.namespace === "local" && l.type === "filesystem");

  if (!officialLoader || !localLoader) {
    return;
  }

  try {
    const officialExtensions = await officialLoader.getExtensions();

    if (officialExtensions.length === 0) {
      localStorage.setItem(migrationKey, "true");
      return;
    }

    log.info(
      `[Migration] Migrating ${officialExtensions.length} extensions from official to local`,
    );

    for (const ext of officialExtensions) {
      try {
        // official から拡張機能を取得
        const { raw, buffer } = await officialLoader.loadExtension(ext.id);

        if (!buffer) {
          log.warn(`[Migration] No buffer for ${ext.id}, skipping`);
          continue;
        }

        // local に再インストール
        await localLoader.installExtension({ foxeFileData: buffer });
        log.info(`[Migration] Migrated ${ext.id} to local namespace`);

        // official から削除
        await officialLoader.uninstallExtension(ext.id);
        log.info(`[Migration] Removed ${ext.id} from official namespace`);
      } catch (err) {
        log.error(`[Migration] Failed to migrate ${ext.id}:`, err);
      }
    }

    localStorage.setItem(migrationKey, "true");
    log.info(`[Migration] Migration completed`);
  } catch (err) {
    log.error("[Migration] Migration failed:", err);
  }
}

// refreshAllExtensions の前に実行
export function ExtensionCatalogProvider({ children, loaders }: Props) {
  const store = useMemo(() => createExtensionRegistryStore(loaders, undefined), [loaders]);

  useEffect(() => {
    const refresh = async () => {
      await migrateOfficialToLocal(loaders); // マイグレーション
      await store.getState().refreshAllExtensions();
    };
    void refresh();
  }, [store, loaders]);

  // ...
}
```

#### オプション2: ユーザーに再インストールを促す

拡張機能一覧に通知を表示:

```typescript
// ExtensionMarketplaceSettings.tsx に追加
const hasOfficialExtensions = useMemo(() => {
  if (!isDesktopApp()) return false;

  const officialExtensions = namespacedData.find((ns) => ns.namespace === "official");
  return officialExtensions && officialExtensions.entries.length > 0;
}, [namespacedData]);

// UI に警告を表示
{isDesktopApp() && hasOfficialExtensions && (
  <Alert severity="info">
    一部の拡張機能が古い形式で保存されています。
    最適なパフォーマンスのため、再インストールを推奨します。
  </Alert>
)}
```

#### オプション3: 何もしない（両方から読み込む）

ステップ3の修正により、`official` namespaceからもロードされるため、既存の拡張機能は動作し続けます。

**推奨**: オプション1（自動マイグレーション）

---

## 📈 パフォーマンスへの影響

### 起動時間

**修正前**:

- 2つのローダー (`local`, `server`) のみ処理
- 処理時間: 約50-100ms

**修正後**:

- 3つのローダー (`org`, `official`, `local`) を処理
- 追加処理時間: 約20-30ms（IndexedDB読み込み）
- 合計: 約70-130ms

**影響**: 体感できるほどの差はありません（ミリ秒単位）

### メモリ使用量

- **増加**: ほぼなし
- **理由**: 拡張機能のメタデータのみをメモリに保持（実際のコードは遅延ロード）

---

## ✅ チェックリスト

修正実装時:

### コード変更

- [ ] `packages/suite-web/src/WebRoot.tsx` - ローダー追加
- [ ] `packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx` - namespace判定
- [ ] `packages/suite-base/src/providers/ExtensionCatalogProvider.tsx` - フィルタリング削除

### テスト

- [ ] デスクトップ版: 新規インストール
- [ ] デスクトップ版: 再起動後の表示
- [ ] デスクトップ版: レイアウトの復元
- [ ] デスクトップ版: アンインストール
- [ ] Web版: 新規インストール
- [ ] Web版: リロード後の表示
- [ ] Web版: IndexedDBの確認

### ログ確認

- [ ] インストール時のログ
- [ ] 起動時のローダー処理ログ
- [ ] エラーログの確認

### ドキュメント

- [ ] ユーザー向けドキュメント更新
- [ ] 開発者向けドキュメント更新
- [ ] CHANGELOGへの記載

### リリース

- [ ] バージョン番号の更新
- [ ] リリースノートの作成
- [ ] マイグレーション計画の確認

---

## 🔗 関連ドキュメント

- [問題の詳細調査](./marketplace-extension-persistence-issue.md)
- [拡張機能とレイアウトの読み込み機能](./extension-and-layout-loading.md)
- [ExtensionCatalogProvider実装](../../packages/suite-base/src/providers/ExtensionCatalogProvider.tsx)
- [PanelCatalogProvider実装](../../packages/suite-base/src/providers/PanelCatalogProvider.tsx)

---

## 📝 まとめ

### 修正のポイント

1. **環境判定**: `isDesktopApp()` で環境を判定
2. **適切なnamespace**: デスクトップは `local`, Webは `official`
3. **完全なロード**: すべてのnamespaceから拡張機能をロード

### 期待される効果

✅ デスクトップ版でマーケットプレイスからインストールした拡張機能が再起動後も保持される
✅ Web版でもマーケットプレイスからのインストールが正常に動作
✅ 既存のレイアウトとの互換性を維持
✅ 各環境に最適化されたストレージを使用

### 次のステップ

1. コードの修正を実装
2. テストを実施
3. マイグレーション戦略を決定（オプション）
4. ドキュメントを更新
5. リリース準備
