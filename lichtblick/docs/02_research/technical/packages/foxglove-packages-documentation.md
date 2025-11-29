# Lichtblick プロジェクトの@lichtblick・@foxglove パッケージドキュメント

## 概要

このドキュメントは、Lichtblickプロジェクトで使用されている`@lichtblick`と`@foxglove`パッケージについて詳しく説明します。

## プロジェクトについて

**Lichtblick** は、BMW Group が開発するオープンソースのロボティクス用統合可視化・診断ツールです。ブラウザ上やLinux、Windows、macOS向けのデスクトップアプリケーションとして利用できます。

- **元プロジェクト**: [Foxglove Studio](https://github.com/foxglove/studio)のフォークとして開始
- **ライセンス**: Mozilla Public License v2.0 (MPL-2.0)
- **開発者**: BMW Group (lichtblick@bmwgroup.com)
- **リポジトリ**: https://github.com/lichtblick-suite/lichtblick

## パッケージの分類

### @foxglove パッケージ（外部依存）

これらは外部のnpmパッケージとして使用されており、Foxglove社が開発・メンテナンスしています。

#### 1. @foxglove/schemas (v1.6.6)
- **目的**: ロボティクス用のメッセージスキーマ定義
- **機能**:
  - 3D可視化用のメッセージタイプ定義
  - `FrameTransform`, `PointCloud`, `LaserScan`, `PoseInFrame`などの型定義
  - JSON Schema形式での型の提供
- **使用例**:
  ```typescript
  import { LaserScan, PointCloud, FrameTransform } from "@foxglove/schemas";
  ```

#### 2. @foxglove/ws-protocol (v0.7.2)
- **目的**: Foxglove WebSocket通信プロトコルの実装
- **機能**:
  - WebSocket経由でのリアルタイムデータ通信
  - チャンネル管理、サブスクリプション管理
  - サービス呼び出し、パラメータ管理
- **使用例**:
  ```typescript
  import { FoxgloveClient, StatusLevel } from "@foxglove/ws-protocol";
  ```

#### 3. @foxglove/sql.js
- **目的**: SQL処理関連機能
- **使用箇所**: MCAP（録画データ）の処理で使用

### @lichtblick パッケージ（内部モノレポ）

これらはプロジェクト内で開発・管理されているワークスペースパッケージです。

#### 1. @lichtblick/suite-base
- **目的**: Lichtblickの中核機能を提供
- **機能**:
  - メインアプリケーションのコンポーネント
  - パネルシステム、プレイヤー、データソース管理
  - 3D可視化、各種パネル（ログ、グラフ、3D表示など）
- **依存関係**: 194の依存パッケージを持つ大規模なパッケージ

#### 2. @lichtblick/suite
- **目的**: Lichtblickの公開API定義
- **機能**:
  - 型定義（Time, MessageEvent, Topic, Subscriptionなど）
  - 拡張機能システムのインターフェース
  - パネル拡張、メッセージコンバーター、カメラモデル登録
- **重要な型**:
  - `PanelExtensionContext`: パネル拡張の実行コンテキスト
  - `ExtensionContext`: 拡張機能の登録・管理
  - `SettingsTree`: 設定UI管理

#### 3. @lichtblick/hooks
- **目的**: カスタムReactフック集
- **機能**:
  - `useDeepMemo`, `useShallowMemo`: メモ化フック
  - `useGuaranteedContext`: コンテキストの保証付き取得
  - `useVisibilityState`: 可視性状態管理
  - `useMemoryInfo`: メモリ情報取得

#### 4. @lichtblick/log
- **目的**: ログ機能
- **機能**:
  - レベル別ログ（debug, info, warn, error）
  - チャンネル別ログ管理
  - ログレベルの動的変更
- **使用例**:
  ```typescript
  import Logger from "@lichtblick/log";
  const log = Logger.getLogger("MyComponent");
  log.info("メッセージ");
  ```

#### 5. @lichtblick/mcap-support
- **目的**: MCAPファイル形式のサポート
- **機能**:
  - MCAPファイルの読み込み・解析
  - Foxgloveスキーマとの統合

#### 6. @lichtblick/theme
- **目的**: テーマ・スタイリング管理
- **機能**: MUI（Material-UI）テーマの作成と管理

#### 7. @lichtblick/den
- **目的**: 非同期処理ユーティリティ
- **機能**:
  - `debouncePromise`: Promise のデバウンス処理
  - `race`: 非同期処理の競合制御

#### 8. @lichtblick/message-path
- **目的**: メッセージパスの解析・処理
- **機能**: ネストされたメッセージフィールドへのアクセス

#### 9. @lichtblick/typescript-transformers
- **目的**: TypeScriptコンパイル時の変換処理
- **機能**: カスタムTypeScript変換機能

#### 10. @lichtblick/comlink-transfer-handlers
- **目的**: Web Worker間での効率的なデータ転送
- **機能**: Comlinkライブラリ用のカスタムハンドラ

#### 11. @lichtblick/eslint-plugin-suite
- **目的**: Lichtblick固有のESLintルール
- **機能**: プロジェクト固有のコーディング規約の強制

#### 12. 外部パッケージ（@lichtblick名前空間）
以下は外部npmパッケージとして公開されているもの：

- `@lichtblick/tsconfig`: TypeScript設定
- `@lichtblick/eslint-plugin`: ESLintプラグイン
- `@lichtblick/omgidl-parser`: OMG IDLパーサー
- `@lichtblick/omgidl-serialization`: OMG IDLシリアライゼーション
- `@lichtblick/ros2idl-parser`: ROS2 IDLパーサー
- その他多数のROSメッセージ処理関連パッケージ

## 使用例とパターン

### Foxglove Schema の使用例

```typescript
// 3D可視化でのLaserScanデータ処理
import { LaserScan as FoxgloveLaserScan } from "@foxglove/schemas";

function normalizeFoxgloveLaserScan(message: FoxgloveLaserScan): NormalizedLaserScan {
  return {
    timestamp: message.timestamp,
    frame_id: message.frame_id,
    start_angle: message.start_angle,
    end_angle: message.end_angle,
    ranges: normalizeFloat32Array(message.ranges),
    intensities: normalizeFloat32Array(message.intensities),
    // ...
  };
}
```

### Foxglove WebSocket の使用例

```typescript
// WebSocketプレイヤーでのリアルタイム通信
import { FoxgloveClient, StatusLevel } from "@foxglove/ws-protocol";

const client = new FoxgloveClient({
  ws: new WebSocket(url, [FoxgloveClient.SUPPORTED_SUBPROTOCOL])
});

client.on("message", ({ subscriptionId, data }) => {
  // メッセージ処理
});
```

### Lichtblick内部パッケージの使用例

```typescript
// suite-baseからの機能インポート
import { App, SharedRoot } from "@lichtblick/suite-base";
import { MessageEvent, Topic } from "@lichtblick/suite";
import Logger from "@lichtblick/log";
import { useDeepMemo } from "@lichtblick/hooks";

// 使用例
const log = Logger.getLogger("MyComponent");
const memoizedValue = useDeepMemo(() => computeExpensiveValue(data), [data]);
```

## 設定と統合

### package.json での設定

```json
{
  "workspaces": {
    "packages": [
      "packages/*",
      "packages/@types/*"
    ]
  },
  "dependencies": {
    "@lichtblick/hooks": "workspace:*",
    "@lichtblick/log": "workspace:*",
    "@lichtblick/suite": "workspace:*"
  },
  "devDependencies": {
    "@foxglove/schemas": "1.6.6",
    "@foxglove/ws-protocol": "0.7.2"
  }
}
```

### TypeScript設定

```json
{
  "extends": "@lichtblick/tsconfig/base",
  "compilerOptions": {
    "paths": {
      "@lichtblick/suite-base/*": ["./packages/suite-base/src/*"]
    }
  }
}
```

## 重要な設計原則

1. **モノレポ構造**: 関連パッケージを単一リポジトリで管理
2. **明確な責任分離**: 各パッケージが特定の機能に特化
3. **型安全性**: TypeScriptによる厳密な型チェック
4. **拡張性**: プラグインシステムによる機能拡張
5. **互換性**: Foxglove エコシステムとの互換性維持

## 開発時の注意点

1. **ワークスペース依存**: `workspace:*`を使用してローカル依存を管理
2. **循環依存の回避**: パッケージ間の循環依存を防ぐ設計
3. **API安定性**: 公開APIの後方互換性を重視
4. **テストカバレッジ**: 各パッケージでのテスト実装
5. **ドキュメント**: 型定義とJSDocによるドキュメント化

## 関連リンク

- [Lichtblick GitHub](https://github.com/lichtblick-suite/lichtblick)
- [Lichtblick Documentation](https://lichtblick-suite.github.io/docs/)
- [Foxglove 公式サイト](https://foxglove.dev/)
- [Mozilla Public License v2.0](https://opensource.org/licenses/MPL-2.0)
