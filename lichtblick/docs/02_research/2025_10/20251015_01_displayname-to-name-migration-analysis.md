# displayName → name 移行戦略の調査結果（修正版）

## 調査概要

- **調査日**: 2025年10月15日（修正: 同日）
- **目的**: OSSベースの`ExtensionInfo`型定義を維持しつつ、独自実装のマーケットプレイス型定義のみを修正する方法を調査
- **背景**: ベースとなっているOSSでは`displayName`を使用しており、根本的な型定義は変更せず、カスタム実装のみを修正したい

## 重要な訂正

**初回調査時の誤り**:

- types/Extensions.tsに`displayName`が存在しないと報告しましたが、これは誤りでした
- 実際には、以前のコミット（c254058ba）では**`displayName`フィールドが存在していました**
- 現在の状態では`displayName`が削除されているようですが、これは過去の修正によるものです

## 調査結果

### 1. 元々の型定義構造（OSS由来）

#### 過去のExtensionInfo型定義（コミット c254058ba時点）

**ファイル**: `packages/suite-base/src/types/Extensions.ts`

```typescript
export type ExtensionInfo = {
  id: string;
  description: string;
  displayName: string; // ← 元々存在していた
  homepage: string;
  tags: string[];
  thumbnail?: string;
  license: string;
  name: string;
  namespace?: Namespace;
  publisher: string;
  qualifiedName: string;
  version: string;
  readme?: string;
  changelog?: string;
  // ...
};
```

#### 現在のExtensionInfo型定義（現在のHEAD）

**ファイル**: `packages/suite-base/src/types/Extensions.ts`

```typescript
export type ExtensionInfo = {
  id: string;
  description: string;
  // displayName: string;  // ← 削除されている
  homepage: string;
  tags: string[];
  thumbnail?: string;
  license: string;
  name: string; // ← 「表示名としても使用」とコメントされている
  namespace?: Namespace;
  publisher: string;
  qualifiedName: string;
  version: string;
  readme?: string;
  changelog?: string;
  externalId?: string;
  marketplaceId?: string;
  availableVersions?: string[];
};
```

**重要な発見**:

- OSSベースの`ExtensionInfo`型には**元々`displayName`フィールドが存在していた**
- 何らかの理由で`displayName`が削除され、`name`のみになっている
- しかし、多くのコードで**まだ`displayName`が使用されている**ため、型定義との不整合が発生している

#### 独自実装の型定義（修正可能）

**ファイル**: `packages/suite-base/src/context/ExtensionMarketplaceContext.ts`

```typescript
export type ExtensionMarketplaceDetail = ExtensionInfo & {
  sha256sum?: string;
  foxe?: string;
  time?: Record<string, string>;
};
```

**ファイル**: `packages/suite-base/src/components/ExtensionsMarketplaceSettings/SoraExtensionTypes.ts`

```typescript
export type ExtensionVersionDetail = ExtensionMarketplaceDetail & {
  baseId: string;
  versions: {
    [version: string]: {
      version: string;
      publishedDate: string;
      downloadUrl: string;
      sha256sum?: string;
      changelog?: string;
      isLatest: boolean;
      installed?: boolean;
    };
  };
};
```

### 2. displayName の実際の使用箇所

#### Desktop拡張機能ローダー（displayNameを使用）

**ファイル**: `packages/suite-desktop/src/renderer/services/DesktopExtensionLoader.ts`

```typescript
public async getExtensions(): Promise<ExtensionInfo[]> {
  const extensionList = (await this.#bridge?.getExtensions()) ?? [];

  const extensions = extensionList.map((extension: DesktopExtension): ExtensionInfo => {
    const pkgInfo = extension.packageJson as ExtensionInfo;
    const namespace = pkgInfo.namespace ?? "local";
    return {
      ...pkgInfo,
      id: extension.id,
      name: pkgInfo.displayName,  // ← displayNameをnameにマッピング
      namespace,
      qualifiedName: pkgInfo.displayName,  // ← 後方互換性のため
      readme: extension.readme,
      changelog: extension.changelog,
    };
  });

  return extensions;
}
```

**問題点**:

- Desktop版の拡張機能は`package.json`から`displayName`を読み取ろうとしている
- しかし現在の`ExtensionInfo`型定義には`displayName`フィールドが存在しない
- 型アサーション`as ExtensionInfo`により型チェックが回避されている

#### テストコードでの使用

**ファイル**: `packages/suite-base/src/testing/builders/ExtensionBuilder.ts`

```typescript
public static extensionInfo(props: Partial<ExtensionInfo> = {}): ExtensionInfo {
  return defaults<ExtensionInfo>(props, {
    description: BasicBuilder.string(),
    displayName: BasicBuilder.string(),  // ← 型定義に存在しないフィールド
    // ... 他のフィールド
  });
}
```

**ファイル**: `packages/suite-base/src/services/extension/utils/qualifiedName.test.ts`

```typescript
it("When generating qualified name for local extension, Then should return displayName", () => {
  const extensionInfo = ExtensionBuilder.extensionInfo();
  const namespace: Namespace = "local";
  const publisher = BasicBuilder.string();

  const result = qualifiedName(namespace, publisher, extensionInfo);

  expect(result).toBe(extensionInfo.displayName); // ← displayNameを期待
});
```

**問題点**:

- テストコードが`displayName`フィールドの存在を期待している
- しかし現在の型定義には存在しないため、型の不整合が発生している
- テストビルダーで`displayName`を生成しているため、実行時は動作している可能性がある

### 3. 問題の特定と切り分け

#### 型定義と実装の不整合

現在の状況:

- **型定義**: `ExtensionInfo`に`displayName`フィールドが存在しない
- **実装**: 多くのコードが`displayName`を使用している
- **結果**: 型チェックが回避され、潜在的なバグの温床となっている

#### OSS由来の型定義の扱い

**重要な判断基準**:

1. **OSS由来の型定義を変更すべきか？**

   - 元々`displayName`が存在していたのであれば、OSS標準として復元すべき
   - ただし、OSS本家が`displayName`を削除したのであれば、それに従うべき

2. **独自実装との切り分け**
   - `ExtensionInfo`型はOSS由来であり、本家との整合性を保つべき
   - カスタム実装のマーケットプレイス型（`ExtensionMarketplaceDetail`等）は独自に拡張可能

#### 修正が必要な箇所

1. **型定義の復元（OSS標準に従う場合）**

   - `packages/suite-base/src/types/Extensions.ts`
   - `displayName`フィールドを復元

2. **テストビルダー**

   - `packages/suite-base/src/testing/builders/ExtensionBuilder.ts`
   - 既に`displayName`を生成しているため、型定義が復元されれば問題なし

3. **qualifiedName関数**

   - `packages/suite-base/src/services/extension/utils/qualifiedName.ts`
   - `local`名前空間の場合、`displayName`を返すように修正（現在は`name`を返している）

4. **テストケース**
   - `packages/suite-base/src/services/extension/utils/qualifiedName.test.ts`
   - 既に`displayName`を期待しているため、型定義が復元されれば問題なし

#### 修正不要な箇所

1. **DesktopExtensionLoader**

   - `packages/suite-desktop/src/renderer/services/DesktopExtensionLoader.ts`
   - `displayName` → `name`のマッピングは維持
   - package.json互換性のため必要

2. **マーケットプレイス関連型**

   - `ExtensionMarketplaceDetail`、`ExtensionVersionDetail`
   - `ExtensionInfo`を継承しているため、`displayName`が自動的に含まれる

3. **API関連**
   - `packages/suite-base/src/api/extensions/`配下
   - 型定義に従うため、修正不要

### 4. displayName vs name の役割分担

#### 元々の設計（推測）

```
ExtensionInfo {
  name: string;         // 拡張機能の識別名（例: "data-visualizer"）
  displayName: string;  // UIに表示する名前（例: "データビジュアライザー"）
}
```

**使い分けの意図**:

- `name`: プログラム内部で使用する一意の識別子、URLやファイル名に使用
- `displayName`: ユーザーに表示する親しみやすい名前、多言語化可能

#### 現在の設計（displayName削除後）

```
ExtensionInfo {
  name: string;  // 識別名と表示名を兼ねる
}
```

**問題点**:

- 多くのコードが`displayName`の存在を前提としている
- 型定義と実装の不整合が発生している
- `local`名前空間のqualifiedNameが`displayName`を返すことを期待している

## 推奨される修正方針

### 判断基準

**選択肢A: displayNameを復元する（推奨）**

メリット:

- 既存のコードとの整合性が取れる
- テストコードが期待する動作になる
- `name`と`displayName`の役割分担が明確

デメリット:

- OSS本家が`displayName`を削除した場合、本家との差異が生じる

**選択肢B: displayNameを完全に削除する**

メリット:

- OSS本家が`displayName`を削除した場合、本家に準拠できる
- 型定義がシンプルになる

デメリット:

- 多くのコードを修正する必要がある
- テストコードの期待値を変更する必要がある
- `name`と`displayName`の区別がなくなる

### 推奨: 選択肢A（displayNameの復元）

理由:

1. 既存コードの大半が`displayName`を使用している
2. テストコードも`displayName`を期待している
3. `DesktopExtensionLoader`が`displayName`を`name`にマッピングしている
4. `qualifiedName`のテストが`displayName`を期待している

### Phase 1: ExtensionInfo型定義の修正

**対象ファイル**: `packages/suite-base/src/types/Extensions.ts`

```typescript
export type ExtensionInfo = {
  id: string;
  description: string;
  displayName: string; // ← 復元
  homepage: string;
  tags: string[];
  thumbnail?: string;
  license: string;
  name: string;
  namespace?: Namespace;
  publisher: string;
  qualifiedName: string;
  version: string;
  readme?: string;
  changelog?: string;
  externalId?: string;
  marketplaceId?: string;
  availableVersions?: string[];
};
```

### Phase 2: qualifiedName関数の修正

**対象ファイル**: `packages/suite-base/src/services/extension/utils/qualifiedName.ts`

```typescript
// 修正前
export default function qualifiedName(
  namespace: Namespace,
  publisher: string,
  info: ExtensionInfo,
): string {
  switch (namespace) {
    case "local":
      return info.name; // ← nameを返している
    case "org":
      return [namespace, publisher, info.name].join(":");
    default:
      return info.name;
  }
}

// 修正後
export default function qualifiedName(
  namespace: Namespace,
  publisher: string,
  info: ExtensionInfo,
): string {
  switch (namespace) {
    case "local":
      return info.displayName; // ← displayNameを返す（テストの期待値に合わせる）
    case "org":
      return [namespace, publisher, info.name].join(":");
    default:
      return info.name;
  }
}
```

### Phase 3: テストビルダーの確認

**対象ファイル**: `packages/suite-base/src/testing/builders/ExtensionBuilder.ts`

```typescript
// 現在のコード（修正不要）
public static extensionInfo(props: Partial<ExtensionInfo> = {}): ExtensionInfo {
  return defaults<ExtensionInfo>(props, {
    description: BasicBuilder.string(),
    displayName: BasicBuilder.string(),  // ← 既に存在しているので修正不要
    // ...
  });
}

// 修正後
public static extensionInfo(props: Partial<ExtensionInfo> = {}): ExtensionInfo {
  return defaults<ExtensionInfo>(props, {
    description: BasicBuilder.string(),
    name: BasicBuilder.string(),  // ← nameのみ使用
    // ...
  });
}
```

### Phase 2: 影響範囲の確認

修正後、以下のテストが正常に動作することを確認:

- `ExtensionBuilder.test.ts`（存在する場合）
- `DesktopExtensionLoader.test.ts`
- Extension関連の全テスト

### Phase 3: ドキュメント更新

型定義にコメントを追加して明確化:

```typescript
/**
 * 拡張機能のメタデータ
 *
 * @remarks
 * - `name`: 拡張機能の名前（表示名としても使用される）
 * - Desktop版では package.json の displayName を name にマッピング
 * - マーケットプレイスAPIでは name を直接使用
 */
export type ExtensionInfo = {
  // ...
  name: string; // Display name for the extension
  // ...
};
```

### Phase 4: 影響範囲の確認

修正後、以下のテストが正常に動作することを確認:

- `qualifiedName.test.ts` - `displayName`を期待するテストが通るようになる
- `DesktopExtensionLoader.test.ts` - 型定義との整合性が取れる
- Extension関連の全テスト

### Phase 5: ドキュメント更新

型定義にコメントを追加して明確化:

```typescript
/**
 * 拡張機能のメタデータ
 *
 * @remarks
 * - `name`: 拡張機能の識別名（プログラム内部で使用）
 * - `displayName`: 拡張機能の表示名（UIで表示される名前）
 * - Desktop版では package.json の displayName をそのまま使用
 * - local名前空間のqualifiedNameはdisplayNameを使用
 */
export type ExtensionInfo = {
  // ...
  name: string; // Unique identifier for the extension
  displayName: string; // User-friendly display name
  // ...
};
```

## 結論

### 現状の問題の整理

**型定義と実装の不整合**:

- **型定義**: `ExtensionInfo`に`displayName`が存在しない（過去に削除された）
- **実装**: 多くのコードが`displayName`を使用している
- **結果**: 型チェックが回避され、潜在的なバグリスクがある

### 推奨される対応方針

**選択肢A: displayNameを復元する（推奨）**

メリット:

- 既存コードの大半が`displayName`の存在を前提としている
- テストコードが`displayName`を期待している
- 型定義と実装の整合性が取れる
- `name`（識別名）と`displayName`（表示名）の役割分担が明確

デメリット:

- OSS本家が意図的に`displayName`を削除した場合、本家との差異が生じる

修正箇所:

1. `ExtensionInfo`型定義に`displayName`を追加
2. `qualifiedName`関数で`local`名前空間の場合は`displayName`を返す
3. テストビルダーは既に`displayName`を生成しているので修正不要

**選択肢B: displayNameを完全に削除する**

メリット:

- OSS本家が`displayName`を削除した場合、本家に準拠できる
- 型定義がシンプルになる

デメリット:

- 多くのコードを修正する必要がある
- テストコードの期待値を変更する必要がある
- `name`と`displayName`の区別がなくなる

修正箇所:

1. `DesktopExtensionLoader`で`displayName`を`name`にマッピングする処理を修正
2. テストビルダーから`displayName`を削除
3. `qualifiedName.test.ts`の期待値を`name`に変更
4. その他、`displayName`を使用している全てのコード

### 切り替えポイントの明確化

#### OSS由来の型定義

`ExtensionInfo`型定義（`packages/suite-base/src/types/Extensions.ts`）

- **現状**: `displayName`が削除されている
- **判断基準**: OSS本家に`displayName`が存在するか確認が必要
- **選択肢A**: 復元する（既存コードとの整合性を優先）
- **選択肢B**: 削除を維持する（OSS本家に準拠）

#### 独自実装のマーケットプレイス型

`ExtensionMarketplaceDetail`、`ExtensionVersionDetail`

- **現状**: `ExtensionInfo`を継承している
- **対応**: `ExtensionInfo`の決定に自動的に従う
- **追加作業**: 不要（継承により自動的に同じフィールドを持つ）

#### 互換性レイヤー

`DesktopExtensionLoader`

- **現状**: `displayName`を`name`にマッピングしている
- **選択肢A**: そのまま維持（型定義に`displayName`が復元されるため整合性が取れる）
- **選択肢B**: マッピング処理を修正（`displayName`が存在しない前提に変更）

### 最終的な推奨

**推奨: 選択肢A（displayNameの復元）**

理由:

1. 既存コードとの整合性を優先
2. 修正箇所が少なく、リスクが低い
3. `name`と`displayName`の役割分担が明確で、設計として合理的
4. テストコードが既に`displayName`を期待している

### 修正の優先度と手順

**選択肢A（displayName復元）の場合**:

1. **High**: `ExtensionInfo`型定義に`displayName`を追加
2. **High**: `qualifiedName`関数の修正（`local`名前空間で`displayName`を返す）
3. **Medium**: ドキュメント・コメントの追加
4. **Low**: テストの実行と確認

**選択肢B（displayName削除）の場合**:

1. **High**: `DesktopExtensionLoader`の修正
2. **High**: `ExtensionBuilder`の修正
3. **High**: `qualifiedName.test.ts`の修正
4. **Medium**: その他の`displayName`使用箇所の全体調査と修正
5. **High**: 全テストの実行と確認

## 質問への回答

### 「根本的な型定義の部分は修正せずに独自実装しているマーケットプレイスの型定義部分だけを修正することは可能か？」

**回答: 部分的に可能ですが、根本的な問題解決にはなりません**

理由:

1. **独自実装の型は既にOSS型を継承している**: `ExtensionMarketplaceDetail = ExtensionInfo & { ... }`という形で継承しているため、`ExtensionInfo`の変更が自動的に反映される
2. **問題は型定義と実装の不整合**: 多くのコードが`displayName`の存在を前提としているのに、型定義には存在しない
3. **マーケットプレイス型だけの修正では解決しない**: 根本的な`ExtensionInfo`型の問題を解決する必要がある

### どこから切り替えれば良いか？

**切り替えポイント**:

1. **型定義レベル** (`ExtensionInfo`)

   - OSS由来の基本型
   - ここを修正するか、現状維持するかを決定

2. **継承レベル** (`ExtensionMarketplaceDetail`)

   - 基本型を継承
   - 基本型の決定に自動的に従う
   - 独自の拡張フィールドのみを追加

3. **実装レベル** (各種コード)
   - 型定義に従って実装
   - 型定義が正しければ、型チェックが機能する

**結論**: 独自実装だけを修正しても問題は解決せず、OSS由来の`ExtensionInfo`型定義を適切に修正する必要があります。

## 関連ドキュメント

- OSS型定義: `packages/suite-base/src/types/Extensions.ts`
- マーケットプレイス型: `packages/suite-base/src/context/ExtensionMarketplaceContext.ts`
- Desktop拡張ローダー: `packages/suite-desktop/src/renderer/services/DesktopExtensionLoader.ts`
- テストビルダー: `packages/suite-base/src/testing/builders/ExtensionBuilder.ts`
- qualifiedName関数: `packages/suite-base/src/services/extension/utils/qualifiedName.ts`

## 次のステップ

1. OSS本家の`ExtensionInfo`型定義を確認（`displayName`の有無）
2. 選択肢A or Bを決定
3. 該当箇所の修正を実施
4. 全テストの実行と確認
5. TypeScriptコンパイルエラーの確認
6. ドキュメントの更新
