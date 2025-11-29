# Lichtblick Suite Architecture Guide

## 概要

このドキュメントでは、Lichtblick Suite の主要なアーキテクチャコンポーネントと、プラットフォーム間での使い分けについて説明します。

## 主要コンポーネント

### App.tsx - 独立型アプリケーションコンポーネント

**役割**: 完全に独立したアプリケーションとして動作する自己完結型コンポーネント

**特徴**:

- 外部からプロパティ経由で全ての設定を受け取る
- 自身でProvider階層を構築・管理
- テーマ、エラーハンドリング、グローバルCSSを内部で制御
- 厳密な型安全性とプロパティ制御

**プロパティ**:

```typescript
export type AppProps = CustomWindowControlsProps & {
  appConfiguration: IAppConfiguration;
  appParameters: AppParametersInput;
  dataSources: IDataSourceFactory[];
  deepLinks: string[];
  extensionLoaders: readonly ExtensionLoader[];
  layoutLoaders: readonly LayoutLoader[];
  nativeAppMenu?: INativeAppMenu;
  nativeWindow?: INativeWindow;
  enableLaunchPreferenceScreen?: boolean;
  enableGlobalCss?: boolean;
  appBarLeftInset?: number;
  extraProviders?: React.JSX.Element[];
  onAppBarDoubleClick?: () => void;
};
```

**Provider階層**:

```
App
├── AppConfigurationContext.Provider
├── AppParametersProvider
├── ColorSchemeThemeProvider
├── CssBaseline
├── ErrorBoundary
└── MultiProvider
    ├── StudioToastProvider
    ├── StudioLogsSettingsProvider
    ├── LayoutStorageContext.Provider
    ├── LayoutManagerProvider
    ├── UserProfileLocalStorageProvider
    ├── CurrentLayoutProvider
    ├── AlertsContextProvider
    ├── TimelineInteractionStateProvider
    ├── UserScriptStateProvider
    ├── ExtensionMarketplaceProvider
    ├── ExtensionCatalogProvider
    ├── PlayerManager
    └── EventsProvider
```

### StudioApp.tsx - 共有コンテキスト型アプリケーションコンポーネント

**役割**: `SharedRootContext` から設定を受け取って動作する軽量なアプリケーションコンポーネント

**特徴**:

- `useSharedRootContext()` フックで設定を取得
- SharedRootで既に管理されている設定を利用
- より柔軟な設定管理と動的な変更に対応
- コンテキスト共有による拡張性

**設定の取得**:

```typescript
export function StudioApp(): React.JSX.Element {
  const {
    dataSources,
    extensionLoaders,
    nativeAppMenu,
    nativeWindow,
    deepLinks,
    enableLaunchPreferenceScreen,
    extraProviders,
    appBarLeftInset,
    customWindowControlProps,
    onAppBarDoubleClick,
    AppBarComponent,
  } = useSharedRootContext();
  // ...
}
```

### SharedRoot.tsx - 共有コンテキストプロバイダー

**役割**: 複数のアプリケーション間で設定を共有するためのルートコンポーネント

**特徴**:

- テーマとグローバルCSSの管理
- エラーハンドリングの統一
- SharedRootContextによる設定の提供
- 子コンポーネントへの柔軟な設定配布

## プラットフォーム別使用パターン

### Desktop版（suite-desktop）

**使用コンポーネント**: `App.tsx`

**アーキテクチャ**:

```
Root (Electron)
└── App
    ├── 全Provider階層
    └── Workspace
```

**実装例**:

```typescript
// packages/suite-desktop/src/renderer/Root.tsx
import { App } from "@lichtblick/suite-base";

export default function Root(props: RootProps): React.JSX.Element {
  return (
    <App
      appParameters={appParameters}
      dataSources={dataSources}
      appConfiguration={appConfiguration}
      extensionLoaders={extensionLoaders}
      layoutLoaders={layoutLoaders}
      nativeAppMenu={nativeAppMenu}
      nativeWindow={nativeWindow}
      enableGlobalCss
      // ... その他のプロパティ
    />
  );
}
```

**選択理由**:

- Electronの厳密な制御が必要
- ネイティブウィンドウ操作の直接的な管理
- 起動時に全設定が確定している
- パフォーマンスと安定性を重視

### Web版（suite-web）

**使用コンポーネント**: `SharedRoot` + `StudioApp`

**アーキテクチャ**:

```
WebRoot
└── SharedRoot
    ├── 基本Provider階層
    └── StudioApp
        ├── 追加Provider階層
        └── Workspace
```

**実装例**:

```typescript
// packages/suite-web/src/index.tsx
const { StudioApp } = await import("@lichtblick/suite-base");

// packages/suite-web/src/WebRoot.tsx
export function WebRoot(props): React.JSX.Element {
  return (
    <SharedRoot
      enableLaunchPreferenceScreen
      deepLinks={[window.location.href]}
      dataSources={dataSources}
      appConfiguration={appConfiguration}
      extensionLoaders={extensionLoaders}
      enableGlobalCss
      extraProviders={props.extraProviders}
      AppBarComponent={props.AppBarComponent}
    >
      <StudioApp />
    </SharedRoot>
  );
}
```

**選択理由**:

- ブラウザ環境の制約に対応
- URLパラメータやLocalStorageからの動的設定読み込み
- 柔軟な設定管理と拡張性
- 必要な機能の動的ロード

## 使い分けガイドライン

### App.tsx を使用すべき場合

- **完全に独立したアプリケーション**を構築する場合
- **外部から全ての設定を制御**したい場合
- **Electronなどのネイティブ環境**で動作する場合
- **パフォーマンスと安定性**を最優先する場合
- **厳密な型安全性**が必要な場合

### SharedRoot + StudioApp を使用すべき場合

- **複数のアプリケーションで設定を共有**したい場合
- **ブラウザ環境**で動作する場合
- **動的な設定変更**に対応したい場合
- **より柔軟な拡張性**が必要な場合
- **段階的な機能ロード**を行いたい場合

## データフロー

### App.tsx のデータフロー

```
外部設定 → App(props) → Provider階層 → Workspace
```

### StudioApp.tsx のデータフロー

```
外部設定 → SharedRoot → SharedRootContext → StudioApp(useContext) → Provider階層 → Workspace
```

## 共通の最終コンポーネント

両方のパターンとも、最終的には `Workspace` コンポーネントに到達し、同じUIとロジックを提供します。違いは設定の管理方法とProvider階層の構築方法のみです。

## 注意事項

1. **混在は避ける**: 一つのアプリケーション内でAppとStudioAppを混在させない
2. **Context依存**: StudioAppはSharedRootContextに依存するため、単体では動作しない
3. **プロパティ制御**: Appは全てのプロパティが必須または明示的にオプション
4. **パフォーマンス**: Appの方が起動時のオーバーヘッドが少ない
5. **拡張性**: SharedRoot + StudioAppの方が後からの機能追加に柔軟

---

このアーキテクチャにより、プラットフォーム固有の要件に応じた最適な実装を選択できます。
