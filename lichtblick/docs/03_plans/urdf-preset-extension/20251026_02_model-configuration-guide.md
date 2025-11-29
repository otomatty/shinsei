# URDF Preset Extension - モデル設定ガイド

**作成日**: 2025年10月26日
**バージョン**: 1.0.0
**対象**: 開発者・運用担当者

## 概要

このドキュメントでは、URDF Preset Extension におけるモデルの設定方法について詳しく説明します。プリセットモデルの追加・編集・カスタマイズの手順を提供します。ロボット、車両、その他の3Dオブジェクトなど、URDF形式に対応するあらゆるモデルを管理できます。

## ファイル構成

```
urdf-preset-extension/src/
├── models/
│   └── presetModels.ts          # メインの設定ファイル
├── converter/
│   └── types.ts                 # 型定義
└── utils/
    └── validation.ts            # バリデーション関数
```

## 1. プリセットモデルの基本設定

### 1.1 設定ファイルの場所

**ファイル**: `src/models/presetModels.ts`

このファイルがすべてのプリセットモデルの設定を管理しています。

### 1.2 基本構造

```typescript
/**
 * Default URDF model URLs
 * これらは本番環境に応じて変更してください
 */
const URDF_BASE_URL = "https://raw.githubusercontent.com/lichtblick/urdf-models/main";

/**
 * Preset robot models available for automatic addition
 */
export const PRESET_MODELS: Record<PresetModelType, PresetModel> = {
  robot_id: {
    id: "robot_id", // 一意のID
    name: "表示名", // UIに表示される名前
    description: "説明文", // モデルの詳細説明
    url: "URDFファイルのURL", // 実際のURDFファイルの場所
    category: "カテゴリ", // manipulator/mobile/humanoid/other
    default_frame_id: "フレームID", // デフォルトのフレームID
    enabled: true, // モデルの有効/無効
    metadata: {
      // メタデータ
      author: "作成者",
      version: "バージョン",
      license: "ライセンス",
      tags: ["タグ1", "タグ2"],
    },
  },
};
```

## 2. URLの設定方法

### 2.1 ベースURLの変更

本番環境に応じて以下の方法でベースURLを設定できます：

#### パターン1: GitHub Repository

```typescript
const URDF_BASE_URL = "https://raw.githubusercontent.com/your-org/urdf-models/main";
```

#### パターン2: CDN使用

```typescript
const URDF_BASE_URL = "https://your-cdn.com/urdf-models";
```

#### パターン3: ローカルアセット

```typescript
const URDF_BASE_URL = "/assets/urdf";
```

#### パターン4: 環境変数使用

```typescript
const URDF_BASE_URL = process.env.URDF_BASE_URL || "https://default-url.com";
```

### 2.2 個別URLの設定

各モデルで個別のURLを指定することも可能です：

```typescript
robot_custom: {
  id: "robot_custom",
  name: "Custom Robot",
  description: "カスタムロボット",
  url: "https://specific-server.com/models/custom_robot.urdf", // 個別URL
  // ...
}
```

## 3. 実際のロボットモデル例

### 3.1 Universal Robotsの例

```typescript
ur5e: {
  id: "ur5e",
  name: "UR5e - Universal Robot",
  description: "6-DOF collaborative robot arm (UR5e)",
  url: "https://raw.githubusercontent.com/ros-industrial/universal_robot/melodic-devel/ur_description/urdf/ur5e.urdf",
  category: "manipulator",
  default_frame_id: "base_link",
  enabled: true,
  metadata: {
    author: "Universal Robots",
    version: "1.0.0",
    license: "BSD-3-Clause",
    tags: ["collaborative", "6dof", "industrial"]
  }
}
```

### 3.2 TurtleBotの例

```typescript
turtlebot3_burger: {
  id: "turtlebot3_burger",
  name: "TurtleBot3 Burger",
  description: "Educational mobile robot platform",
  url: "https://raw.githubusercontent.com/ROBOTIS-GIT/turtlebot3/master/turtlebot3_description/urdf/turtlebot3_burger.urdf",
  category: "mobile",
  default_frame_id: "base_footprint",
  enabled: true,
  metadata: {
    author: "ROBOTIS",
    version: "1.0.0",
    license: "Apache-2.0",
    tags: ["educational", "mobile", "ros"]
  }
}
```

## 4. カテゴリ別設定ガイド

### 4.1 Manipulator（マニピュレータ）

```typescript
{
  category: "manipulator",
  default_frame_id: "base_link", // 通常はbase_link
  tags: ["6dof", "industrial", "collaborative"]
}
```

### 4.2 Mobile（移動ロボット）

```typescript
{
  category: "mobile",
  default_frame_id: "base_footprint", // 通常はbase_footprint
  tags: ["differential", "omnidirectional", "autonomous"]
}
```

### 4.3 Humanoid（ヒューマノイド）

```typescript
{
  category: "humanoid",
  default_frame_id: "base_link",
  tags: ["bipedal", "research", "humanoid"]
}
```

### 4.4 Other（その他）

```typescript
{
  category: "other",
  default_frame_id: "base_link",
  tags: ["custom", "experimental"]
}
```

## 5. 新しいモデルの追加手順

### 5.1 手順概要

1. URDFファイルを準備
2. アクセス可能なURLに配置
3. `presetModels.ts`にエントリを追加
4. テストで動作確認
5. デプロイ

### 5.2 詳細手順

#### ステップ1: URDFファイルの準備

```bash
# URDFファイルの検証
xmllint --schema urdf.xsd your_robot.urdf
```

#### ステップ2: モデル追加

```typescript
// presetModels.tsに追加
export const PRESET_MODELS: Record<PresetModelType, PresetModel> = {
  // 既存のモデル...

  your_robot: {
    id: "your_robot",
    name: "Your Robot Name",
    description: "Your robot description",
    url: `${URDF_BASE_URL}/your_robot/robot.urdf`,
    category: "manipulator", // 適切なカテゴリを選択
    default_frame_id: "base_link",
    enabled: true,
    metadata: {
      author: "Your Organization",
      version: "1.0.0",
      license: "MIT",
      tags: ["custom", "new"],
    },
  },
};
```

#### ステップ3: 型定義の更新

```typescript
// converter/types.ts
export type PresetModelType = "robot_a" | "robot_b" | "robot_c" | "default" | "your_robot"; // 新しいIDを追加
```

#### ステップ4: テスト実行

```bash
cd urdf-preset-extension
npm test
npm run test:coverage
```

## 6. 本番環境への反映

### 6.1 環境別設定

#### 開発環境

```typescript
const URDF_BASE_URL = "http://localhost:8080/urdf-models";
```

#### ステージング環境

```typescript
const URDF_BASE_URL = "https://staging.yourcompany.com/urdf-models";
```

#### 本番環境

```typescript
const URDF_BASE_URL = "https://cdn.yourcompany.com/urdf-models";
```

### 6.2 設定ファイルの分離

本番環境では設定を外部化することを推奨：

```typescript
// config/models.config.ts
export const MODEL_CONFIG = {
  baseUrl: process.env.URDF_BASE_URL || "https://default.com",
  enabledModels: process.env.ENABLED_MODELS?.split(",") || ["default"],
  cacheDuration: parseInt(process.env.CACHE_DURATION || "300000"),
};
```

## 7. トラブルシューティング

### 7.1 よくある問題

#### CORS エラー

```
Access to fetch at 'https://example.com/robot.urdf' from origin 'https://app.lichtblick.org' has been blocked by CORS policy
```

**解決方法**: URLのサーバーでCORSヘッダーを設定

#### ファイルが見つからない

```
404 Not Found: https://example.com/robot.urdf
```

**解決方法**: URLとファイルパスを確認

#### 無効なURDF

```
XML parsing error in URDF file
```

**解決方法**: URDFファイルの構文を確認

### 7.2 デバッグ方法

#### 開発者ツールでの確認

```javascript
// ブラウザのコンソールで実行
fetch("https://your-urdf-url.com/robot.urdf")
  .then((response) => response.text())
  .then((data) => console.log(data));
```

#### ローカルテスト

```bash
# ローカルでURDFファイルをテスト
curl -I https://your-urdf-url.com/robot.urdf
```

## 8. ベストプラクティス

### 8.1 命名規則

- **ID**: snake_case（例: `robot_arm_6dof`）
- **Name**: 人間が読みやすい形式（例: "Robot Arm 6DOF"）
- **Frame ID**: ROS命名規則に従う（例: `base_link`）

### 8.2 パフォーマンス

- URLは高速アクセス可能な場所に配置
- ファイルサイズを最適化
- キャッシュ設定を適切に構成

### 8.3 メンテナンス

- バージョン管理でモデル変更を追跡
- 定期的なリンク切れチェック
- ドキュメント更新

## 9. 参考リンク

- [URDF Specification](http://wiki.ros.org/urdf/XML)
- [ROS Naming Conventions](http://wiki.ros.org/Names)
- [Lichtblick Extension Development](https://github.com/lichtblick/lichtblick)

---

**更新履歴**

- 2025/10/26: 初版作成
