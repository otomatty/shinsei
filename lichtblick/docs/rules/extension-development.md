# Lichtblick 拡張機能開発ガイド

このドキュメントでは、Lichtblick拡張機能システムの基本的な使い方と開発方法について説明します。

## 📖 目次

- [基本概念](#基本概念)
- [拡張機能の種類](#拡張機能の種類)
- [開発環境の準備](#開発環境の準備)
- [実装パターン](#実装パターン)
- [制限事項](#制限事項)
- [ベストプラクティス](#ベストプラクティス)

## 🎯 基本概念

### 拡張機能とは

Lichtblick拡張機能は、Lichtblickアプリケーションの機能を拡張するためのカスタムコードです。TypeScriptとReactを使用して開発し、サンドボックス化された環境で安全に実行されます。

### アーキテクチャ概要

```
┌─────────────────────────────────────────┐
│ 拡張機能 (.foxe ファイル)               │
│ ├─ package.json (メタデータ)           │
│ ├─ dist/ (コンパイル済みコード)         │
│ └─ assets/ (リソース)                   │
├─────────────────────────────────────────┤
│ @lichtblick/suite SDK                   │
│ ├─ ExtensionContext                     │
│ ├─ PanelExtensionContext                │
│ └─ 型定義                               │
├─────────────────────────────────────────┤
│ Lichtblick Core                         │
│ ├─ ExtensionCatalog                     │
│ ├─ PanelExtensionAdapter                │
│ └─ MessagePipeline                      │
└─────────────────────────────────────────┘
```

### 技術スタック

- **言語**: TypeScript
- **UIフレームワーク**: React
- **SDK**: @lichtblick/suite
- **ビルドツール**: create-lichtblick-extension
- **配布形式**: .foxe ファイル（ZIPアーカイブ）

## 🔧 拡張機能の種類

### 1. パネル拡張機能

カスタムUIパネルを追加する最も一般的な拡張機能です。

**特徴:**

- ReactコンポーネントベースのUI
- リアルタイムデータの表示・操作
- パネルレイアウトへの統合

**用途例:**

- データ可視化パネル
- 制御インターフェース
- カスタムダッシュボード

### 2. MessageConverter

データ形式を変換して、既存パネルで表示可能にする機能です。

**特徴:**

- 入力メッセージ形式から出力形式への変換
- MessagePipelineへの自動統合
- 既存パネルの機能拡張（間接的）

**用途例:**

- カスタムメッセージの標準形式変換
- プリセットデータの自動生成
- データフォーマットの統一

### 3. その他の拡張

- **TopicAliases**: トピック名のマッピング
- **CameraModel**: カメラモデルの登録
- **CustomMessageSchemas**: メッセージスキーマの定義

## 🛠️ 開発環境の準備

### 1. 前提条件

- Node.js 16以上
- npm または yarn
- VS Code（推奨）

### 2. プロジェクト作成

```bash
# 新しい拡張機能プロジェクトを作成
npm init lichtblick-extension@latest my-extension

# プロジェクトディレクトリに移動
cd my-extension

# 依存関係をインストール
npm install
```

### 3. 開発サイクル

```bash
# 開発・ビルド
npm run build

# ローカルインストール（テスト用）
npm run local-install

# Lichtblickを再起動または Ctrl+R でリロード

# パッケージ化（配布用）
npm run package
```

## 📝 実装パターン

### 1. 基本的なパネル拡張

```typescript
// src/index.ts - エントリーポイント
import { ExtensionContext } from "@lichtblick/suite";
import { initMyPanel } from "./MyPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "My Custom Panel",
    initPanel: initMyPanel,
  });
}
```

```typescript
// src/MyPanel.tsx - パネルコンポーネント
import { PanelExtensionContext, Topic, MessageEvent } from "@lichtblick/suite";
import { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function MyPanel({ context }: { context: PanelExtensionContext }) {
  const [topics, setTopics] = useState<Topic[]>();
  const [messages, setMessages] = useState<MessageEvent[]>();

  useLayoutEffect(() => {
    // レンダリングハンドラーの設定
    context.onRender = (renderState, done) => {
      setTopics(renderState.topics);
      setMessages(renderState.currentFrame);
      done(); // 必須: レンダリング完了の通知
    };

    // 監視対象の設定
    context.watch("topics");
    context.watch("currentFrame");

    // トピック購読
    context.subscribe([{ topic: "/robot/status" }]);
  }, []);

  return (
    <div style={{ padding: "1rem" }}>
      <h2>My Custom Panel</h2>
      <p>Topics: {topics?.length || 0}</p>
      <p>Messages: {messages?.length || 0}</p>
      {messages?.map((msg, idx) => (
        <div key={idx}>
          {msg.topic}: {JSON.stringify(msg.message)}
        </div>
      ))}
    </div>
  );
}

export function initMyPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<MyPanel context={context} />);

  // クリーンアップ関数を返す
  return () => root.unmount();
}
```

### 2. MessageConverter実装

```typescript
// src/index.ts
import { ExtensionContext } from "@lichtblick/suite";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerMessageConverter({
    fromSchemaName: "custom_msgs/RobotData",
    toSchemaName: "geometry_msgs/Twist",
    converter: convertRobotData,
  });
}

async function convertRobotData(input: any): Promise<any> {
  // カスタムデータを標準形式に変換
  return {
    linear: { x: input.velocity, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: input.angular_velocity },
  };
}
```

### 3. 設定可能なパネル

```typescript
// パネル設定の実装
export function initConfigurablePanel(context: PanelExtensionContext): () => void {
  let config = context.initialState || { refreshRate: 10, showGrid: true };

  const ConfigurablePanel = () => {
    const [currentConfig, setCurrentConfig] = useState(config);

    useLayoutEffect(() => {
      context.onRender = (renderState, done) => {
        // 設定が変更された場合
        if (renderState.config) {
          setCurrentConfig(renderState.config);
          config = renderState.config;
        }
        done();
      };

      context.watch("config");
    }, []);

    return (
      <div>
        <h2>Configurable Panel</h2>
        <p>Refresh Rate: {currentConfig.refreshRate}Hz</p>
        <p>Show Grid: {currentConfig.showGrid ? "Yes" : "No"}</p>
      </div>
    );
  };

  const root = createRoot(context.panelElement);
  root.render(<ConfigurablePanel />);
  return () => root.unmount();
}
```

## ⚠️ 制限事項

### 技術的制限

#### 1. 既存パネルの変更不可

```typescript
// ❌ 既存パネルを直接変更することはできません
extensionContext.registerPanel({
  name: "Plot", // 既存パネル名と同じ - 重複エラー
  initPanel: myCustomPlot,
});
```

**理由**: セキュリティとアプリケーションの安定性のため

**代替案**: 新しい名前でパネルを作成

```typescript
// ✅ 新しい名前で機能拡張版を作成
extensionContext.registerPanel({
  name: "Enhanced Plot", // 新しい名前
  initPanel: myEnhancedPlot,
});
```

#### 2. サンドボックス制限

- **ファイルシステム**: 直接アクセス不可
- **ネットワーク**: 制限付きアクセス
- **DOM**: 割り当てられた要素内のみ操作可能
- **グローバル変数**: 他の拡張機能とは分離

#### 3. API制限

- **コアシステム**: 内部APIへの直接アクセス不可
- **他の拡張機能**: 直接通信制限
- **パフォーマンス**: リソース使用量の制限

### 設計的制限

#### 1. UI/UX一貫性

拡張機能は既存のLichtblick UI/UXガイドラインに従う必要があります。

#### 2. 後方互換性

Lichtblickの更新によって拡張機能が動作しなくなる可能性があります。

## 🌟 ベストプラクティス

### 1. 命名規則

```typescript
// ✅ 良い例：機能が明確
extensionContext.registerPanel({
  name: "Robot Status Monitor",
  // または
  name: "Plot Enhanced",
  name: "3D Viewer Pro",
});

// ❌ 悪い例：既存名と重複
extensionContext.registerPanel({
  name: "Plot",
  name: "3D",
});
```

### 2. エラーハンドリング

```typescript
export function activate(extensionContext: ExtensionContext): void {
  try {
    extensionContext.registerPanel({
      name: "My Panel",
      initPanel: initMyPanel,
    });
    console.log("Extension activated successfully");
  } catch (error) {
    console.error("Failed to activate extension:", error);
    // 必要に応じてフォールバック処理
  }
}
```

### 3. リソース管理

```typescript
export function initMyPanel(context: PanelExtensionContext): () => void {
  const cleanup = [];

  // イベントリスナーの設定
  const handleClick = () => { /* ... */ };
  context.panelElement.addEventListener("click", handleClick);
  cleanup.push(() => context.panelElement.removeEventListener("click", handleClick));

  // タイマーの設定
  const interval = setInterval(() => { /* ... */ }, 1000);
  cleanup.push(() => clearInterval(interval));

  const root = createRoot(context.panelElement);
  root.render(<MyPanel context={context} />);

  // クリーンアップ関数
  return () => {
    cleanup.forEach(fn => fn());
    root.unmount();
  };
}
```

### 4. TypeScript活用

```typescript
// 型安全な実装
interface MyPanelConfig {
  refreshRate: number;
  showDetails: boolean;
  colorScheme: "light" | "dark";
}

interface MyMessageType {
  timestamp: number;
  data: {
    temperature: number;
    humidity: number;
  };
}

function MyTypedPanel({ context }: { context: PanelExtensionContext }) {
  const [config, setConfig] = useState<MyPanelConfig>();
  const [messages, setMessages] = useState<MessageEvent<MyMessageType>[]>();

  // ... 実装
}
```

### 5. テスト

```typescript
// Jest テスト例
describe("MyPanel", () => {
  it("should render correctly", () => {
    const mockContext = {
      panelElement: document.createElement("div"),
      onRender: jest.fn(),
      watch: jest.fn(),
      subscribe: jest.fn(),
    };

    const cleanup = initMyPanel(mockContext as any);

    expect(mockContext.watch).toHaveBeenCalledWith("topics");
    expect(mockContext.subscribe).toHaveBeenCalled();

    cleanup();
  });
});
```

## 🔗 関連リソース

- [MessageConverter詳細ガイド](./messageconverter-guide.md)
- [パネル拡張性について](./panel-extensibility.md)
- [拡張機能テンプレート](../templates/extension-template.md)
- [create-lichtblick-extension](https://www.npmjs.com/package/create-lichtblick-extension)
- [@lichtblick/suite API Reference](https://github.com/Lichtblick-Suite/lichtblick/tree/main/packages/suite)

## 📞 サポート

- **GitHub Issues**: [Lichtblick Repository](https://github.com/Lichtblick-Suite/lichtblick/issues)
- **Community**: [Lichtblick Discussions](https://github.com/Lichtblick-Suite/lichtblick/discussions)
- **Documentation**: [Official Docs](https://lichtblick.org/docs)
