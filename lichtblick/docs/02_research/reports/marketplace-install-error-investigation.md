# マーケットプレイス拡張機能インストールエラー調査

## 発生日時

2025年10月9日

## エラー内容

```
Failed to install extension Daniel Alp.danielalp.foxglove-vex-2d-panel v[object Object].
Cannot install extension Daniel Alp.danielalp.foxglove-vex-2d-panel v[object Object], "foxe" URL is missing
```

## 問題分析

### 1. エラーの意味

- `v[object Object]` という表示から、`version` パラメータとして文字列ではなくオブジェクトが渡されている
- エラーメッセージのテンプレートリテラル内で `targetVersion` が `[object Object]` と表示されている
- "foxe" URL is missing というエラーも同時に発生している

### 2. エラー発生箇所

`/Users/sugaiakimasa/apps/lichtblick/packages/suite-base/src/components/ExtensionsSettings/ExtensionMarketplaceSettings.tsx:394`

```tsx
if (!marketplaceEntry?.foxe) {
  throw new Error(`Cannot install extension ${baseId} v${targetVersion}, "foxe" URL is missing`);
}
```

### 3. コードフロー分析

#### a. handleInstall 関数の呼び出し

```tsx
onInstall={(version?: string) => {
  void handleInstall(extension, version);
}}
```

#### b. handleInstall 関数内

```tsx
const handleInstall = useCallback(
  async (extension: GroupedExtensionData, version?: string) => {
    const targetVersion = version ?? extension.latestVersion;
    const baseId = extension.baseId;
    const versionedId = toV2Id(baseId, targetVersion);

    // marketplaceEntry の検索
    let marketplaceEntry = marketplaceEntries.value?.find((entry) => {
      const entryBaseId = generateBaseId(entry.id, entry.publisher);
      return entryBaseId === baseId && entry.version === targetVersion;
    });
```

### 4. 考えられる原因

#### 原因1: MarketplaceCard から渡される version パラメータの型

- `MarketplaceCard` の `onInstall` prop: `onInstall?: (version?: string) => void`
- `VersionAccordion` の実装:
  ```tsx
  onInstall={() => {
    onInstall(version.version);
  }}
  ```
  これは正しく文字列を渡している

#### 原因2: extension.latestVersion の値

`targetVersion = version ?? extension.latestVersion` で、`version` が `undefined` の場合、`extension.latestVersion` が使用される。

`GroupedExtensionData` の定義:

```tsx
interface GroupedExtensionData {
  latestVersion: string;
  versions: VersionInfo[];
  // ...
}
```

#### 原因3: VersionInfo オブジェクトが extension.latestVersion に格納されている可能性

groupedExtensions の生成ロジックを確認:

```tsx
groups.forEach((group) => {
  const normalizedVersions = group.versions.map((v) => normalizeVersion(v.version));
  const latestNormalizedVersion = getLatestVersion(normalizedVersions);
  // ...

  // Check if it's the latest version
  if (normalizedVersion === currentLatestNormalized || ...) {
    group.latestVersion = ext.version; // ここで文字列を設定している
  }
});
```

### 5. 推測される問題箇所

`ExtensionMarketplaceSettings.tsx` の groupedExtensions 生成ロジック内で、どこかで `latestVersion` に `VersionInfo` オブジェクトが代入されている可能性がある。

特に、以下の箇所が疑わしい:

1. 初期値の設定時
2. バージョン比較時
3. バージョンソート後の更新時

### 6. デバッグ方法

以下を確認すべき:

1. `extension.latestVersion` の実際の型と値
2. `groupedExtensions` 内の各 extension の `latestVersion` フィールド
3. console.log で `targetVersion` の型を確認

### 7. 一時的な対応

`handleInstall` 関数の冒頭で型チェックと変換を追加:

```tsx
const handleInstall = useCallback(
  async (extension: GroupedExtensionData, version?: string) => {
    // バージョンの正規化
    let targetVersion = version ?? extension.latestVersion;

    // オブジェクトが渡された場合の対応
    if (typeof targetVersion !== 'string') {
      console.error('Invalid version format:', targetVersion);
      targetVersion = (targetVersion as any)?.version ?? 'unknown';
    }
    // ...
```

### 8. 根本的な修正

`groupedExtensions` の生成ロジックで、`latestVersion` に常に文字列が設定されることを保証する。

## 実施した修正

### 1. handleInstall 関数の型チェック追加

`ExtensionMarketplaceSettings.tsx` の `handleInstall` 関数に以下を追加:

- `version` パラメータの型検証
- `extension.latestVersion` の型検証
- 詳細なデバッグログ
- オブジェクトが渡された場合の `String()` 変換

### 2. groupedExtensions の型安全性向上

- 初期化時の `ext.version` の型検証と `String()` 変換
- バージョン更新時の `ext.version` の型検証と `String()` 変換
- エラーログの追加

### 3. marketplaceEntry 検索の改善

- 検索失敗時のログ追加
- 利用可能なエントリの一覧をログ出力
- `foxe` フィールド欠落時の詳細ログ

## デバッグログからの発見 (2025-10-09)

### ログ分析結果

```
[handleInstall] Marketplace entry not found - baseId: Daniel Alp.danielalp.foxglove-vex-2d-panel, version: [object Object]
[handleInstall] Available entries: ['danielalp.foxglove-vex-2d-panel@undefined', ...]
```

### 判明した問題

1. **すべてのエントリのバージョンが `undefined`** - データ変換の欠如
2. **`version` パラメータが `[object Object]`** - オブジェクトが文字列として扱われている
3. **マーケットプレイスエントリの検索失敗** - バージョンマッチングができない

## 根本原因の特定

### サーバーデータ構造とフロントエンドの期待の不一致

**サーバー側のJSON構造:**

```json
{
  "id": "danielalp.foxglove-vex-2d-panel",
  "versions": {
    "1.0.0": {
      "version": "1.0.0",
      "foxe": "https://..."
    }
  }
}
```

**フロントエンドの期待:**

```typescript
[
  {
    id: "danielalp.foxglove-vex-2d-panel",
    version: "1.0.0",
    foxe: "https://...",
  },
];
```

### 問題の連鎖

1. `ExtensionMarketplaceProvider.getAvailableExtensions()` がネストされたデータをそのまま返す
2. `version` フィールドが存在しないため `undefined` になる
3. `foxe` フィールドも `versions` 内にあるため取得できない
4. 検索とインストールが失敗する

## 最終的な修正

### ExtensionMarketplaceProvider.tsx の改修

`getAvailableExtensions` 関数でデータフラット化を実装:

1. **ネストされた `versions` オブジェクトを展開**
2. **各バージョンごとに個別のエントリを作成**
3. **`version`、`foxe`、`sha256sum` などのフィールドを正しく抽出**
4. **フラットな配列として返す**

### 実装詳細

```typescript
// 各拡張機能の versions オブジェクトをループ
for (const ext of rawExtensions) {
  for (const [versionKey, versionData] of Object.entries(ext.versions)) {
    flattenedExtensions.push({
      id: ext.id,
      version: versionData.version, // ← 正しく設定
      foxe: versionData.foxe, // ← 正しく設定
      // ... その他のフィールド
    });
  }
}
```

## 期待される結果

- マーケットプレイスエントリのバージョンが正しく表示される
- `foxe` URLが正しく取得できる
- 拡張機能のインストールが成功する

## 第2の問題発見 (2025-10-09 続き)

### デバッグログからの新たな発見

```javascript
version: SyntheticBaseEvent;
versionConstructor: "SyntheticBaseEvent";
latestVersion: "1.0.0";
latestVersionType: "string";
```

### 真の根本原因

**React の `SyntheticBaseEvent` (クリックイベント) が version パラメータとして渡されていた!**

データフラット化は成功していたが、イベントハンドラの実装に問題があった。

### 問題箇所

`MarketplaceCard.tsx` の ActionButtons への prop の渡し方:

**問題のあるコード:**

```tsx
<ActionButtons
  onInstall={onInstall} // ← イベントハンドラがそのまま渡される
  onUninstall={onUninstall}
/>
```

`ActionButtons` 内部で:

```tsx
<Button onClick={onInstall} /> // ← onClick が onInstall(event) を呼ぶ
```

結果として `handleInstall(extension, event)` が呼ばれ、`version` パラメータに `SyntheticBaseEvent` が渡される。

### 最終修正

**修正後:**

```tsx
<ActionButtons
  onInstall={
    onInstall
      ? () => {
          onInstall();
        }
      : undefined
  }
  onUninstall={
    onUninstall
      ? () => {
          onUninstall();
        }
      : undefined
  }
/>
```

これにより:

- イベントオブジェクトが渡されない
- 引数なしで `onInstall()` が呼ばれる
- `version` は `undefined` となり、`extension.latestVersion` ("1.0.0") が正しく使用される

## 完了した修正

1. ✅ データフラット化 - `ExtensionMarketplaceProvider.tsx`

   - ネストされた `versions` オブジェクトを展開
   - 各バージョンを個別のエントリとして返す

2. ✅ イベントハンドラの修正 - `MarketplaceCard.tsx`
   - `onInstall` と `onUninstall` をラップして引数なしで呼ぶ
   - イベントオブジェクトが version パラメータに渡されないようにする

## 期待される動作

- メインの Install ボタン → `version` = undefined → `latestVersion` ("1.0.0") を使用
- バージョンアコーディオンの Install ボタン → `version` = "1.0.0" などの文字列を明示的に渡す
- 正しい `foxe` URL が取得され、インストール成功

---

## 🎉 解決完了 (2025-10-09)

### 動作確認

拡張機能のインストールが正常に動作することを確認しました。

### クリーンアップ作業

デバッグ用のログコードを削除:

- ✅ `ExtensionMarketplaceSettings.tsx` - handleInstall のデバッグログ削除
- ✅ `ExtensionMarketplaceSettings.tsx` - groupedExtensions の型チェックログ削除
- ✅ `ExtensionMarketplaceProvider.tsx` - フェッチログ削除
- ✅ 未使用の import (`log`) 削除

### 最終的なコード変更サマリー

1. **ExtensionMarketplaceProvider.tsx**

   - ネストされた `versions` オブジェクトをフラット化
   - 各バージョンを個別のエントリとして返すロジックを追加

2. **MarketplaceCard.tsx**

   - メインの `ActionButtons` への `onInstall`/`onUninstall` をラップ
   - イベントオブジェクトが渡されないように修正

3. **ExtensionMarketplaceSettings.tsx**
   - 不要なデバッグコードと型チェックを削除
   - シンプルで読みやすいコードに整理

### 学んだこと

- **データ構造の一致**: サーバーとクライアント間でデータ構造を一致させることの重要性
- **イベントハンドラの伝播**: React イベントハンドラを prop として渡す際の注意点
- **段階的デバッグ**: デバッグログを活用した問題の特定と解決プロセスの有効性
