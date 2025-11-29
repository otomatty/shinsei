# Lichtblick 拡張機能システム 概要調査

**調査ID**: 20251026_01
**調査日**: 2025年10月26日
**調査者**: AI Assistant
**関連Issue**: [20251026_01_extension-documentation](../../../01_issues/open/2025_10/20251026_01_extension-documentation.md)

## 🔍 調査目的

Lichtblick拡張機能システムの全体像を把握し、開発者向けドキュメント作成のための基礎情報を収集する。

## 📊 調査結果

### 1. 拡張機能システムアーキテクチャ

#### 全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                    Lichtblick Application                   │
├─────────────────────────────────────────────────────────────┤
│  ExtensionCatalogProvider                                   │
│  ├─ ExtensionLoader (Interface)                             │
│  │  ├─ IdbExtensionLoader (Web)                            │
│  │  └─ DesktopExtensionLoader (Desktop)                    │
│  ├─ ExtensionCatalog (Zustand Store)                       │
│  └─ ContributionPoints Builder                             │
├─────────────────────────────────────────────────────────────┤
│  PanelCatalogProvider                                       │
│  ├─ Built-in Panels                                        │
│  └─ Extension Panels (via PanelExtensionAdapter)           │
├─────────────────────────────────────────────────────────────┤
│  Extension Execution Environment                            │
│  ├─ Sandboxed Execution Context                            │
│  ├─ API Access Control                                     │
│  └─ Resource Management                                     │
└─────────────────────────────────────────────────────────────┘
```

#### 技術スタック

- **言語**: TypeScript
- **フレームワーク**: React
- **SDK**: @lichtblick/suite
- **配布形式**: .foxe ファイル（ZIPアーカイブ）
- **実行環境**: サンドボックス化された JavaScript 環境

### 2. 拡張機能の種類

#### 2.1 パネル拡張機能

- **目的**: カスタムUIパネルの提供
- **実装方式**: React コンポーネント
- **統合方法**: PanelExtensionAdapter
- **配置**: パネルカタログに追加

#### 2.2 MessageConverter

- **目的**: データ形式の変換処理
- **実装方式**: 変換関数の登録
- **統合方法**: MessagePipeline への組み込み
- **適用**: データ入力時の自動変換

#### 2.3 その他の拡張

- **TopicAliases**: トピック名マッピング
- **CameraModel**: カメラモデル登録
- **CustomDataSource**: データソース拡張（将来的）

### 3. 開発フロー

#### 3.1 初期化

```bash
npm init lichtblick-extension@latest my-extension
cd my-extension
npm install
```

#### 3.2 開発サイクル

```bash
# 開発・ビルド
npm run build

# ローカルテスト
npm run local-install
# Lichtblick再起動またはCtrl+R

# パッケージ化
npm run package
```

#### 3.3 配布

- `.foxe` ファイル生成
- 手動インストールまたはレジストリ配布

### 4. API制限とセキュリティ

#### 4.1 サンドボックス制限

- ファイルシステムへの直接アクセス不可
- ネットワークアクセスは制限付き
- DOM操作は割り当てられた要素内のみ

#### 4.2 API制限

- ビルトインパネルのコード変更不可
- 既存パネルのオーバーライド不可
- コアシステムへの直接アクセス不可

### 5. 実装パターン

#### 5.1 パネル拡張の標準パターン

```typescript
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "My Custom Panel",
    initPanel: initMyPanel,
  });
}

function initMyPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<MyPanelComponent context={context} />);
  return () => root.unmount();
}
```

#### 5.2 MessageConverter パターン

```typescript
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerMessageConverter({
    fromSchemaName: "custom_msgs/Input",
    toSchemaName: "std_msgs/Output",
    converter: convertMessage,
  });
}
```

### 6. 制限事項

#### 6.1 技術的制限

- 既存パネルの直接変更：**不可能**
- パネル名の重複：**不可能**
- コアシステムの変更：**不可能**
- 他の拡張機能との直接通信：**制限あり**

#### 6.2 設計的制限

- UI/UXの一貫性維持
- セキュリティ制約
- パフォーマンス制約
- 後方互換性維持

## 💡 推奨事項

### 1. 拡張機能開発者向け

- 既存パネル機能拡張は新規パネルとして実装
- MessageConverterを活用した間接的拡張を検討
- 適切な命名規則の使用（Enhanced, Plus, Pro等）

### 2. ドキュメント作成方針

- 制限事項の明確化
- 実装パターンの標準化
- トラブルシューティングガイドの充実

## 🔗 参考資料

- `create-lichtblick-extension` パッケージ
- `urdf-preset-extension` 実装例
- Lichtblick コアアーキテクチャドキュメント
- @lichtblick/suite SDK リファレンス

## 📝 次のステップ

1. 基本情報ドキュメントの作成
2. MessageConverterガイドの作成
3. パネル拡張性ドキュメントの作成
4. 開発者向けテンプレートの整備
