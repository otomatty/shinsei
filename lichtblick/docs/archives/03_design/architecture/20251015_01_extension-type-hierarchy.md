# Extension型定義の階層構造と境界

## 作成日

2025年10月15日

## 概要

このドキュメントは、拡張機能（Extension）の型定義における階層構造と、OSS標準と独自実装の境界を明確化します。

## 背景

- OSSベースの`ExtensionInfo`型定義を維持しつつ、独自実装のマーケットプレイス機能を追加する必要がある
- 型定義の境界が不明確だと、OSS本家との同期時に問題が発生する可能性がある
- `displayName`フィールドの復元作業を通じて、型定義の境界を明確にする必要性が認識された

## 型定義の階層構造

### レベル1: ExtensionInfo（OSS基本型）

**ファイル**: `packages/suite-base/src/types/Extensions.ts`

**役割**: OSS由来の基本型定義

**重要な原則**:

- OSS本家との互換性を維持する必要がある
- この型の変更はOSS標準に従う
- カスタマイズは継承型で実施

**主要フィールド**:

```typescript
export type ExtensionInfo = {
  id: string; // 一意識別子
  name: string; // 識別名（内部使用）
  displayName: string; // 表示名（UI表示用）
  description: string; // 説明
  version: string; // バージョン
  publisher: string; // 発行者
  qualifiedName: string; // 完全修飾名
  namespace?: Namespace; // 名前空間
  homepage: string; // ホームページURL
  tags: string[]; // タグ
  thumbnail?: string; // サムネイル
  license: string; // ライセンス
  readme?: string; // README
  changelog?: string; // 変更履歴
  // 以下は独自拡張の可能性あり（要確認）
  externalId?: string;
  marketplaceId?: string;
  availableVersions?: string[];
};
```

**name vs displayName**:

- `name`: プログラム内部で使用する識別名（URL、ファイル名に使用）
- `displayName`: ユーザーに表示する親しみやすい名前（多言語化可能）

**使用場所による違い**:

- Desktop版: `package.json`の`displayName`をそのまま使用
- Marketplace: APIから取得した`name`/`displayName`を使用
- local名前空間: `qualifiedName`として`displayName`を使用

### レベル2: ExtensionMarketplaceDetail（マーケットプレイス拡張型）

**ファイル**: `packages/suite-base/src/context/ExtensionMarketplaceContext.ts`

**役割**: マーケットプレイス機能のための独自拡張

**境界の明確化**: ここがOSS標準とカスタム実装の境界

**拡張フィールド**:

```typescript
export type ExtensionMarketplaceDetail = ExtensionInfo & {
  sha256sum?: string; // ファイル整合性検証用ハッシュ
  foxe?: string; // 拡張機能パッケージのURL
  time?: Record<string, string>; // バージョンごとのタイムスタンプ
};
```

**独自フィールドの用途**:

- `sha256sum`: ダウンロードしたファイルの改ざん検証
- `foxe`: 拡張機能パッケージ（.foxeファイル）のダウンロードURL
- `time`: バージョンごとの公開日時情報

### レベル3: ExtensionVersionDetail（バージョン管理拡張型）

**ファイル**: `packages/suite-base/src/components/ExtensionsMarketplaceSettings/SoraExtensionTypes.ts`

**役割**: バージョン管理機能のためのさらなる独自拡張

**拡張フィールド**:

```typescript
export type ExtensionVersionDetail = ExtensionMarketplaceDetail & {
  baseId: string; // 同一拡張機能のグループID
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

**独自フィールドの用途**:

- `baseId`: バージョンが異なる同一拡張機能をグループ化するためのID
- `versions`: 各バージョンの詳細情報（複数バージョン管理）

## 型定義の境界ルール

### OSS標準型（ExtensionInfo）の修正

**修正可能な場合**:

- OSS本家で同様の変更が行われている
- OSS本家との互換性が維持される
- 既存のOSSコードとの整合性がある

**修正不可な場合**:

- OSS本家に存在しないフィールドを追加する
- OSS本家と異なる意味でフィールドを使用する
- 独自要件のためだけの変更

### カスタム実装型の修正

**ExtensionMarketplaceDetail / ExtensionVersionDetail**:

- 独自要件に応じて自由に拡張可能
- OSS基本型を継承しているため、基本型の変更は自動的に反映される
- 追加フィールドはカスタム実装のみで使用

## 実装上の注意点

### DesktopExtensionLoaderの互換性レイヤー

**ファイル**: `packages/suite-desktop/src/renderer/services/DesktopExtensionLoader.ts`

Desktop版では`package.json`から拡張機能情報を読み込むため、互換性レイヤーが必要です。

```typescript
// package.json の displayName を ExtensionInfo.name にマッピング
const extensions = extensionList.map((extension: DesktopExtension): ExtensionInfo => {
  const pkgInfo = extension.packageJson as ExtensionInfo;
  return {
    ...pkgInfo,
    id: extension.id,
    name: pkgInfo.displayName, // package.json互換性のため
    qualifiedName: pkgInfo.displayName,
    // ...
  };
});
```

**重要**: この互換性レイヤーにより、`package.json`の`displayName`が`ExtensionInfo.name`にマッピングされます。

### qualifiedName関数の名前空間別処理

**ファイル**: `packages/suite-base/src/services/extension/utils/qualifiedName.ts`

名前空間によって異なるフィールドを使用します。

```typescript
export default function qualifiedName(
  namespace: Namespace,
  publisher: string,
  info: ExtensionInfo,
): string {
  switch (namespace) {
    case "local":
      return info.displayName; // local名前空間ではdisplayNameを使用
    case "org":
      return [namespace, publisher, info.name].join(":");
    default:
      return info.name;
  }
}
```

**設計意図**: local名前空間（Desktop版）では、ユーザーフレンドリーな`displayName`を表示します。

## 型階層の図解

```
┌─────────────────────────────────────────────────┐
│ ExtensionInfo (OSS基本型)                       │
│ - OSS標準フィールド                             │
│ - name, displayName, version, etc.              │
│                                                 │
│ ※ OSS本家との互換性を維持                      │
└─────────────────────────────────────────────────┘
                    ↓ 継承
┌─────────────────────────────────────────────────┐
│ ExtensionMarketplaceDetail                      │
│ - マーケットプレイス独自フィールド              │
│ - sha256sum, foxe, time                         │
│                                                 │
│ ※ カスタム実装の境界                           │
└─────────────────────────────────────────────────┘
                    ↓ 継承
┌─────────────────────────────────────────────────┐
│ ExtensionVersionDetail                          │
│ - バージョン管理独自フィールド                  │
│ - baseId, versions                              │
│                                                 │
│ ※ さらなるカスタム拡張                         │
└─────────────────────────────────────────────────┘
```

## 今後の保守方針

### OSS本家の更新確認

1. **定期的な確認**: OSS本家で`ExtensionInfo`型に変更がないか定期的に確認
2. **同期**: 本家で変更があった場合、互換性を保ちつつ同期
3. **テスト**: 変更後は必ず型チェックと関連テストを実行

### カスタム実装の拡張

1. **継承の原則**: OSS基本型は直接変更せず、継承型で拡張
2. **境界の維持**: `ExtensionMarketplaceDetail`以降をカスタム実装として明確に区別
3. **ドキュメント**: 独自フィールドの用途と理由を明確にドキュメント化

### displayNameの取り扱い

1. **復元の経緯**: 元々OSS標準に存在したフィールド
2. **削除された理由**: 要調査（OSS本家のコミット履歴を確認）
3. **維持の方針**: 多くのコードが依存しているため、当面は維持
4. **将来の対応**: OSS本家の動向を見て、必要に応じて再評価

## 関連ドキュメント

- [displayName → name 移行戦略の調査結果](../../07_research/2025_10/20251015_01_displayname-to-name-migration-analysis.md)
- OSS型定義: `packages/suite-base/src/types/Extensions.ts`
- マーケットプレイス型: `packages/suite-base/src/context/ExtensionMarketplaceContext.ts`
- バージョン管理型: `packages/suite-base/src/components/ExtensionsMarketplaceSettings/SoraExtensionTypes.ts`

## まとめ

型定義の境界は以下のように明確化されました:

1. **ExtensionInfo**: OSS標準型（本家との互換性を維持）
2. **ExtensionMarketplaceDetail**: カスタム実装の境界（マーケットプレイス機能）
3. **ExtensionVersionDetail**: さらなるカスタム拡張（バージョン管理機能）

この階層構造により、OSS本家の更新に柔軟に対応しつつ、独自機能を安全に追加できます。
