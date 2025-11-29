# パネル拡張性ガイド - できることとできないこと

このドキュメントでは、Lichtblick拡張機能システムにおけるパネルの拡張可能性について、技術的制限と推奨されるアプローチを詳しく説明します。

## 📖 目次

- [概要](#概要)
- [既存パネルについて](#既存パネルについて)
- [拡張の可能性](#拡張の可能性)
- [できないこと](#できないこと)
- [推奨アプローチ](#推奨アプローチ)
- [実装パターン](#実装パターン)
- [制限の理由](#制限の理由)

## 🎯 概要

### パネル拡張の現実

Lichtblickの拡張機能システムは、**新しいパネルの追加は可能**ですが、**既存パネルの直接変更は不可能**です。この設計は、セキュリティ、安定性、保守性を重視したものです。

### 基本原則

```
✅ 新規パネル作成      → 無制限に可能
❌ 既存パネル変更      → 技術的に不可能
✅ 間接的機能拡張      → MessageConverter等で実現
✅ 既存パネル代替      → Enhanced版として作成
```

## 🏗️ 既存パネルについて

### ビルトインパネル一覧

Lichtblickには以下のビルトインパネルが含まれています：

| パネル名     | 型名          | 主な機能       | 拡張可能性      |
| ------------ | ------------- | -------------- | --------------- |
| 3D           | `3D`          | 3D可視化       | ❌ 直接変更不可 |
| Plot         | `Plot`        | データプロット | ❌ 直接変更不可 |
| Image        | `Image`       | 画像表示       | ❌ 直接変更不可 |
| Map          | `map`         | 地図表示       | ❌ 直接変更不可 |
| Table        | `Table`       | データテーブル | ❌ 直接変更不可 |
| Log          | `Log`         | ログ表示       | ❌ 直接変更不可 |
| Raw Messages | `RawMessages` | メッセージ表示 | ❌ 直接変更不可 |

### パネルの内部構造

```typescript
// 既存パネルの基本構造（変更不可）
export default Panel(
  Object.assign(PlotComponent, {
    panelType: "Plot",
    defaultConfig: DEFAULT_PLOT_CONFIG,
  }),
);
```

この構造は拡張機能からアクセス・変更できません。

## ✅ 拡張の可能性

### 1. 新規パネル作成

**完全に自由**: 任意の機能を持つ新しいパネルを作成可能

```typescript
// ✅ 新しいパネルは自由に作成可能
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "My Custom Panel",
    initPanel: initMyCustomPanel,
  });
}
```

### 2. MessageConverterによる間接拡張

**既存パネル機能拡張**: データ変換を通じて既存パネルに新機能を追加

```typescript
// ✅ MessageConverterで既存パネルを間接的に拡張
extensionContext.registerMessageConverter({
  fromSchemaName: "custom_msgs/EnhancedData",
  toSchemaName: "sensor_msgs/PointCloud2", // 3Dパネル用
  converter: enhanceDataForPanel,
});
```

### 3. パネル設定の活用

**設定拡張**: パネルの動作をカスタマイズ

```typescript
// ✅ 高度な設定を持つカスタムパネル
function initConfigurablePanel(context: PanelExtensionContext): () => void {
  context.onRender = (renderState, done) => {
    const config = renderState.config;
    // 設定に基づく高度な機能実装
    done();
  };
}
```

### 4. 既存パネル風の代替実装

**完全代替**: 既存パネルと同等以上の機能を持つ新パネル

```typescript
// ✅ "Enhanced Plot Panel" として既存機能+αを実装
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Enhanced Plot Panel", // 新しい名前
    initPanel: initEnhancedPlotPanel,
  });
}
```

## ❌ できないこと

### 1. 既存パネルの直接変更

```typescript
// ❌ 既存パネルのコードを変更することは不可能
// packages/suite-base/src/panels/Plot/Plot.tsx を変更
// ↓ 拡張機能からはアクセス不可

// ❌ 既存パネルの動作を上書き
extensionContext.overridePanel("Plot", myCustomPlot); // そもそもAPIが存在しない
```

**技術的理由**:

- 拡張機能はサンドボックス環境で実行
- ビルトインパネルのコードは保護されている
- セキュリティ制約により直接アクセス不可

### 2. 既存パネル名の重複使用

```typescript
// ❌ 既存パネル名と同じ名前は使用不可
extensionContext.registerPanel({
  name: "Plot", // 既存の"Plot"と重複 → エラー
  initPanel: myPlotPanel,
});

// ❌ 既存の型名も使用不可
// panelType: "Plot" → 重複エラー
```

**エラー例**:

```
Error: Panel with name "Plot" already exists
```

### 3. 既存パネルのUIの一部変更

```typescript
// ❌ 既存パネルのUIに要素を追加
const plotPanel = document.querySelector('[data-panel-type="Plot"]');
plotPanel.appendChild(myCustomButton); // アクセス権限なし

// ❌ 既存パネルのイベントハンドリング変更
// 既存パネルのイベントを横取りすることは不可能
```

### 4. 既存パネルの設定スキーマ変更

```typescript
// ❌ 既存パネルに新しい設定項目を追加
// Plot パネルの設定に独自項目を追加することは不可能

// ❌ 既存設定の動作変更
// 既存の設定項目の動作を変更することも不可能
```

### 5. グローバルな動作変更

```typescript
// ❌ 全パネル共通の動作変更
// レイアウトシステムの変更
// パネルツールバーの変更
// パネル選択UIの変更
```

## 🌟 推奨アプローチ

### 1. Enhanced/Plus/Pro パターン

既存パネルの機能を拡張した新パネルとして実装：

```typescript
// ✅ 推奨: Enhanced版として実装
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Plot Enhanced",     // 明確に区別
    initPanel: initEnhancedPlot,
  });
}

function initEnhancedPlot(context: PanelExtensionContext): () => void {
  const EnhancedPlotPanel = () => {
    return (
      <div>
        {/* 既存Plot機能の再実装 */}
        <StandardPlotComponent />

        {/* 🆕 追加機能 */}
        <AdvancedAnalytics />
        <DataExportTools />
        <CustomFilters />
      </div>
    );
  };

  const root = createRoot(context.panelElement);
  root.render(<EnhancedPlotPanel />);
  return () => root.unmount();
}
```

### 2. MessageConverter連携パターン

既存パネルの機能を間接的に拡張：

```typescript
// ✅ MessageConverterで既存パネルを活用
export function activate(extensionContext: ExtensionContext): void {
  // 1. データ変換器を登録
  extensionContext.registerMessageConverter({
    fromSchemaName: "custom_analytics/PlotData",
    toSchemaName: "geometry_msgs/Point", // 既存Plotパネル用
    converter: enhancePlotData,
  });

  // 2. 設定パネルを追加
  extensionContext.registerPanel({
    name: "Plot Configuration Panel",
    initPanel: initPlotConfig,
  });
}

async function enhancePlotData(input: any): Promise<any> {
  // カスタムデータを既存Plotパネルが理解できる形式に変換
  return {
    x: input.enhanced_x_data,
    y: performAdvancedAnalysis(input.raw_data),
    z: 0,
  };
}
```

### 3. コンポーネント再利用パターン

既存パネルの機能を参考に、独自実装：

```typescript
// ✅ 既存パネルを参考にした独自実装
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Advanced 3D Viewer",
    initPanel: initAdvanced3D,
  });
}

function initAdvanced3D(context: PanelExtensionContext): () => void {
  const Advanced3DPanel = () => {
    // 基本的な3D表示機能（再実装）
    const [scene, setScene] = useState<THREE.Scene>();
    const [camera, setCamera] = useState<THREE.Camera>();

    // 🆕 追加機能
    const [vrMode, setVrMode] = useState(false);
    const [aiAssist, setAiAssist] = useState(false);
    const [customShaders, setCustomShaders] = useState<string[]>([]);

    return (
      <div style={{ height: "100%" }}>
        {/* カスタムツールバー */}
        <CustomToolbar
          onVRToggle={setVrMode}
          onAIToggle={setAiAssist}
        />

        {/* 3D表示領域 */}
        <ThreeJSCanvas
          scene={scene}
          camera={camera}
          vrEnabled={vrMode}
          aiAssistEnabled={aiAssist}
        />

        {/* 追加UI */}
        <ShaderEditor
          shaders={customShaders}
          onChange={setCustomShaders}
        />
      </div>
    );
  };

  const root = createRoot(context.panelElement);
  root.render(<Advanced3DPanel />);
  return () => root.unmount();
}
```

### 4. 設定移行支援パターン

既存パネルの設定を新パネルに移行：

```typescript
// ✅ 既存パネル設定の移行支援
function initEnhancedPanel(context: PanelExtensionContext): () => void {
  const [config, setConfig] = useState(() => {
    // 既存パネル設定の検出・移行
    const existingConfig = detectExistingPanelConfig();
    return migrateToEnhancedConfig(existingConfig);
  });

  return () => {
    // クリーンアップ
  };
}

function detectExistingPanelConfig(): any {
  // ローカルストレージや現在のレイアウトから
  // 既存パネルの設定を検出
  try {
    const layoutData = localStorage.getItem("lichtblick.layout");
    if (layoutData) {
      const layout = JSON.parse(layoutData);
      return extractPanelConfigs(layout, "Plot");
    }
  } catch (error) {
    console.warn("Could not detect existing panel config:", error);
  }
  return null;
}

function migrateToEnhancedConfig(existingConfig: any): any {
  if (!existingConfig) {
    return getDefaultEnhancedConfig();
  }

  // 既存設定をEnhanced版設定に変換
  return {
    ...existingConfig,
    // 🆕 追加設定項目
    advancedMode: false,
    customAnalytics: true,
    exportFormat: "csv",
  };
}
```

## 🔒 制限の理由

### 1. セキュリティ

**サンドボックス化**：

- 拡張機能は隔離された環境で実行
- ホストアプリケーションへの不正アクセスを防止
- 悪意のあるコードからの保護

```typescript
// 拡張機能の実行環境
// ┌─────────────────────────────┐
// │ Sandboxed Extension         │
// │ ├─ Limited API Access       │
// │ ├─ No Direct DOM Access     │
// │ └─ Controlled Resources     │
// └─────────────────────────────┘
```

### 2. 安定性

**アプリケーション保護**：

- コアシステムの変更による不具合防止
- 拡張機能エラーの影響範囲限定
- アプリケーション全体のクラッシュ防止

### 3. 保守性

**コード品質維持**：

- 一貫したUI/UX体験
- 更新時の互換性保証
- デバッグの容易性

### 4. 後方互換性

**長期サポート**：

- Lichtblick更新時の動作保証
- API変更の影響最小化
- レガシー拡張機能のサポート

## 💡 ベストプラクティス

### 1. 命名規則

```typescript
// ✅ 推奨命名パターン
const panelNames = [
  "Original Panel Enhanced",
  "Original Panel Plus",
  "Original Panel Pro",
  "Advanced Original Panel",
  "Custom Original Panel",
];

// ❌ 避けるべき命名
const badNames = [
  "Plot", // 既存名と重複
  "3D", // 既存名と重複
  "Image", // 既存名と重複
];
```

### 2. 機能スコープの明確化

```typescript
// ✅ 明確な機能範囲
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Robot Telemetry Dashboard", // 具体的な用途
    initPanel: initRobotTelemetry,
  });
}

// ❌ 曖昧な機能範囲
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "Data Panel", // 汎用的すぎる
    initPanel: initGenericPanel,
  });
}
```

### 3. 段階的移行の支援

```typescript
// ✅ ユーザーの移行を支援
function initEnhancedPanel(context: PanelExtensionContext): () => void {
  const EnhancedPanel = () => {
    return (
      <div>
        {/* 移行ガイダンス */}
        <MigrationHelper
          fromPanel="Plot"
          toPanel="Enhanced Plot"
          configMigration={migrateConfig}
        />

        {/* Enhanced機能 */}
        <EnhancedFeatures />
      </div>
    );
  };

  return () => {
    // クリーンアップ
  };
}
```

## 🔗 関連リソース

- [拡張機能開発ガイド](./extension-development.md)
- [MessageConverter詳細ガイド](./messageconverter-guide.md)
- [拡張機能テンプレート](../templates/extension-template.md)
- [Lichtblickアーキテクチャドキュメント](../legacy/general/architecture.md)

## 📞 サポート

拡張機能開発に関する質問やサポートが必要な場合：

- **GitHub Issues**: [問題報告・機能要望](https://github.com/Lichtblick-Suite/lichtblick/issues)
- **GitHub Discussions**: [コミュニティディスカッション](https://github.com/Lichtblick-Suite/lichtblick/discussions)
- **Documentation**: [公式ドキュメント](https://lichtblick.org/docs)
