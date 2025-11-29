# Lichtblick 拡張機能の種類

## 概要

Lichtblick の拡張機能システムは、単純なUIパネルだけでなく、多様な機能拡張を提供できる柔軟なアーキテクチャを持っています。このドキュメントでは、利用可能な拡張機能の種類とその実装方法について詳しく説明します。

## 拡張機能の種類一覧

### 1. パネル拡張（Panel Extensions）

- **用途**: カスタムUIパネルの提供
- **UI**: あり
- **主要機能**: データ可視化、ユーザーインタラクション

### 2. メッセージコンバーター（Message Converters）

- **用途**: メッセージフォーマット間の変換
- **UI**: なし
- **主要機能**: データ変換、プロトコル対応

### 3. トピックエイリアス（Topic Aliases）

- **用途**: トピック名の別名定義
- **UI**: なし
- **主要機能**: トピック名の統一、互換性確保

### 4. カメラモデル（Camera Models）

- **用途**: カスタムカメラキャリブレーション
- **UI**: なし
- **主要機能**: 画像処理、3D投影

### 5. パネル設定（Panel Settings）

- **用途**: 各機能の設定項目提供
- **UI**: 設定UI
- **主要機能**: 設定管理、カスタマイズ

## 詳細な実装方法

### 1. パネル拡張（Panel Extensions）

#### 概要

パネル拡張は、Lichtblick のワークスペースに新しいカスタムパネルを追加する機能です。

#### 実装例

```typescript
import { ExtensionContext, PanelExtensionContext } from "@lichtblick/suite";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "my-custom-panel",
    initPanel: (panelContext: PanelExtensionContext) => {
      // パネルの初期化処理
      panelContext.onRender = (renderState, done) => {
        // レンダリングロジック
        const { topics, currentFrame } = renderState;

        // DOMの更新
        const panelElement = panelContext.panelElement;
        panelElement.innerHTML = `
          <div>
            <h2>My Custom Panel</h2>
            <p>Topics: ${topics.length}</p>
            <p>Current time: ${currentFrame?.receiveTime}</p>
          </div>
        `;

        done();
      };

      // 設定変更の処理
      panelContext.watch("config", (config) => {
        console.log("Config changed:", config);
      });

      // トピック購読
      panelContext.subscribe(["/robot/pose", "/robot/velocity"]);
    },
  });
}
```

#### 高度な機能

```typescript
// React コンポーネントを使用した実装
import { createRoot } from "react-dom/client";

function MyPanelComponent({ topics, messages, config }) {
  return (
    <div>
      <h2>Advanced Panel</h2>
      {messages.map((msg, index) => (
        <div key={index}>
          <strong>{msg.topic}:</strong> {JSON.stringify(msg.message)}
        </div>
      ))}
    </div>
  );
}

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "advanced-panel",
    initPanel: (panelContext) => {
      const root = createRoot(panelContext.panelElement);

      panelContext.onRender = (renderState, done) => {
        root.render(
          <MyPanelComponent
            topics={renderState.topics}
            messages={renderState.currentFrame?.messages || []}
            config={renderState.config}
          />
        );
        done();
      };
    },
  });
}
```

### 2. メッセージコンバーター（Message Converters）

#### 概要

メッセージコンバーターは、異なるメッセージフォーマット間での変換を行う機能です。主にROS1からROS2への変換や、カスタムメッセージフォーマットの標準化に使用されます。

#### 基本実装

```typescript
export function activate(extensionContext: ExtensionContext): void {
  // ROS1 → ROS2 変換
  extensionContext.registerMessageConverter({
    fromSchemaName: "geometry_msgs/Twist",
    toSchemaName: "geometry_msgs/msg/Twist",
    converter: (ros1Message: any) => {
      return {
        linear: {
          x: ros1Message.linear.x,
          y: ros1Message.linear.y,
          z: ros1Message.linear.z,
        },
        angular: {
          x: ros1Message.angular.x,
          y: ros1Message.angular.y,
          z: ros1Message.angular.z,
        },
      };
    },
  });

  // カスタムメッセージ → 標準メッセージ変換
  extensionContext.registerMessageConverter({
    fromSchemaName: "custom_msgs/RobotStatus",
    toSchemaName: "std_msgs/String",
    converter: (customMessage: any) => {
      return {
        data: `Robot ${customMessage.robot_id}: ${customMessage.status}`,
      };
    },
  });
}
```

#### 高度な変換処理

```typescript
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerMessageConverter({
    fromSchemaName: "sensor_msgs/PointCloud2",
    toSchemaName: "foxglove/PointCloud",
    converter: (pointCloud2: any) => {
      // 複雑な変換処理
      const points = parsePointCloud2(pointCloud2);

      return {
        timestamp: pointCloud2.header.stamp,
        frame_id: pointCloud2.header.frame_id,
        pose: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
        points: points.map((point) => ({
          x: point.x,
          y: point.y,
          z: point.z,
          color: point.rgb,
        })),
      };
    },
    panelSettings: {
      // 変換設定のUI
      colorMode: {
        label: "Color Mode",
        input: "select",
        options: [
          { label: "Intensity", value: "intensity" },
          { label: "RGB", value: "rgb" },
          { label: "Height", value: "height" },
        ],
        default: "rgb",
      },
    },
  });
}

function parsePointCloud2(pointCloud: any): any[] {
  // PointCloud2の解析処理
  // 実際の実装では、バイナリデータの解析が必要
  return [];
}
```

### 3. トピックエイリアス（Topic Aliases）

#### 概要

トピックエイリアスは、異なるトピック名を統一したり、互換性を保つための機能です。

#### 基本実装

```typescript
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerTopicAliases((topics) => {
    const aliases = [];

    // 単純なエイリアス
    aliases.push({
      sourceTopicName: "/robot/odom",
      aliasedTopicName: "/robot/odometry",
    });

    // 正規表現を使用したエイリアス
    topics.forEach((topic) => {
      if (topic.name.match(/^\/robot_(\d+)\/cmd_vel$/)) {
        const robotId = topic.name.match(/^\/robot_(\d+)\/cmd_vel$/)[1];
        aliases.push({
          sourceTopicName: topic.name,
          aliasedTopicName: `/robots/${robotId}/velocity_command`,
        });
      }
    });

    return aliases;
  });
}
```

#### 高度なエイリアス処理

```typescript
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerTopicAliases((topics) => {
    const aliases = [];

    // 名前空間の統一
    const namespaceMapping = {
      "/old_namespace": "/new_namespace",
      "/legacy": "/current",
    };

    topics.forEach((topic) => {
      Object.entries(namespaceMapping).forEach(([oldNs, newNs]) => {
        if (topic.name.startsWith(oldNs)) {
          aliases.push({
            sourceTopicName: topic.name,
            aliasedTopicName: topic.name.replace(oldNs, newNs),
          });
        }
      });
    });

    // 条件付きエイリアス
    topics.forEach((topic) => {
      if (topic.schemaName === "sensor_msgs/Image") {
        // 画像トピックに統一的な命名を適用
        const match = topic.name.match(/^\/(.+)\/image_raw$/);
        if (match) {
          aliases.push({
            sourceTopicName: topic.name,
            aliasedTopicName: `/cameras/${match[1]}/image`,
          });
        }
      }
    });

    return aliases;
  });
}
```

### 4. カメラモデル（Camera Models）

#### 概要

カメラモデルは、カスタムカメラキャリブレーションや特殊なカメラ投影を実装するための機能です。

#### 基本実装

```typescript
import { ICameraModel, CameraInfo } from "@lichtblick/suite";

class CustomCameraModel implements ICameraModel {
  public readonly fx: number;
  public readonly fy: number;
  public readonly cx: number;
  public readonly cy: number;
  public readonly width: number;
  public readonly height: number;

  constructor(info: CameraInfo) {
    this.fx = info.K[0];
    this.fy = info.K[4];
    this.cx = info.K[2];
    this.cy = info.K[5];
    this.width = info.width;
    this.height = info.height;
  }

  public projectPixelTo3dPlane(
    pixel: [number, number],
    planeDistance: number,
  ): [number, number, number] {
    const [u, v] = pixel;
    const x = ((u - this.cx) * planeDistance) / this.fx;
    const y = ((v - this.cy) * planeDistance) / this.fy;
    return [x, y, planeDistance];
  }

  public projectPixelTo3dRay(pixel: [number, number]): {
    origin: [number, number, number];
    direction: [number, number, number];
  } {
    const [u, v] = pixel;
    const x = (u - this.cx) / this.fx;
    const y = (v - this.cy) / this.fy;

    return {
      origin: [0, 0, 0],
      direction: [x, y, 1],
    };
  }
}

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerCameraModel({
    name: "custom_camera_model",
    build: (info: CameraInfo) => {
      return new CustomCameraModel(info);
    },
  });
}
```

#### 高度なカメラモデル

```typescript
class FisheyeCameraModel implements ICameraModel {
  public readonly fx: number;
  public readonly fy: number;
  public readonly cx: number;
  public readonly cy: number;
  public readonly width: number;
  public readonly height: number;

  private readonly k1: number;
  private readonly k2: number;
  private readonly k3: number;
  private readonly k4: number;

  constructor(info: CameraInfo) {
    this.fx = info.K[0];
    this.fy = info.K[4];
    this.cx = info.K[2];
    this.cy = info.K[5];
    this.width = info.width;
    this.height = info.height;

    // 魚眼歪み係数
    this.k1 = info.D[0];
    this.k2 = info.D[1];
    this.k3 = info.D[2];
    this.k4 = info.D[3];
  }

  public projectPixelTo3dPlane(
    pixel: [number, number],
    planeDistance: number,
  ): [number, number, number] {
    const [u, v] = pixel;

    // 正規化座標
    const x_norm = (u - this.cx) / this.fx;
    const y_norm = (v - this.cy) / this.fy;

    // 魚眼歪み補正
    const theta = Math.sqrt(x_norm * x_norm + y_norm * y_norm);
    const theta_d = theta * (1 + this.k1 * theta * theta + this.k2 * Math.pow(theta, 4));

    const scale = theta_d / theta;
    const x_corrected = x_norm * scale;
    const y_corrected = y_norm * scale;

    return [x_corrected * planeDistance, y_corrected * planeDistance, planeDistance];
  }

  public projectPixelTo3dRay(pixel: [number, number]): {
    origin: [number, number, number];
    direction: [number, number, number];
  } {
    const [x, y, z] = this.projectPixelTo3dPlane(pixel, 1.0);
    const length = Math.sqrt(x * x + y * y + z * z);

    return {
      origin: [0, 0, 0],
      direction: [x / length, y / length, z / length],
    };
  }
}

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerCameraModel({
    name: "fisheye_camera_model",
    build: (info: CameraInfo) => {
      return new FisheyeCameraModel(info);
    },
  });
}
```

### 5. パネル設定（Panel Settings）

#### 概要

パネル設定は、各拡張機能の設定項目を定義し、ユーザーが設定を変更できるUIを提供する機能です。

#### 基本実装

```typescript
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "configurable-panel",
    initPanel: (panelContext) => {
      // パネルの初期化
      panelContext.onRender = (renderState, done) => {
        const config = renderState.config;

        // 設定に基づいてパネルを更新
        const element = panelContext.panelElement;
        element.innerHTML = `
          <div>
            <h2>Configurable Panel</h2>
            <p>Refresh Rate: ${config.refreshRate}Hz</p>
            <p>Show Grid: ${config.showGrid ? "Yes" : "No"}</p>
            <p>Color Scheme: ${config.colorScheme}</p>
          </div>
        `;

        done();
      };
    },
    config: {
      // 設定スキーマの定義
      refreshRate: {
        label: "Refresh Rate",
        input: "number",
        min: 1,
        max: 60,
        default: 10,
        help: "Panel refresh rate in Hz",
      },
      showGrid: {
        label: "Show Grid",
        input: "boolean",
        default: true,
        help: "Display grid lines",
      },
      colorScheme: {
        label: "Color Scheme",
        input: "select",
        options: [
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
          { label: "Auto", value: "auto" },
        ],
        default: "dark",
        help: "Color scheme for the panel",
      },
      customColor: {
        label: "Custom Color",
        input: "rgb",
        default: { r: 255, g: 0, b: 0 },
        help: "Custom color for highlights",
      },
    },
  });
}
```

#### 高度な設定管理

```typescript
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "advanced-configurable-panel",
    initPanel: (panelContext) => {
      let currentConfig = {};

      // 設定変更の監視
      panelContext.watch("config", (newConfig) => {
        currentConfig = newConfig;
        updatePanelDisplay();
      });

      function updatePanelDisplay() {
        const element = panelContext.panelElement;

        // 設定に基づいた動的なUI生成
        const filters = currentConfig.dataFilters || [];
        const filterHTML = filters
          .map((filter) => `<div>Filter: ${filter.field} ${filter.operator} ${filter.value}</div>`)
          .join("");

        element.innerHTML = `
          <div style="color: ${currentConfig.textColor}; background: ${currentConfig.backgroundColor}">
            <h2>Advanced Panel</h2>
            <div>Data Filters:</div>
            ${filterHTML}
          </div>
        `;
      }

      panelContext.onRender = (renderState, done) => {
        updatePanelDisplay();
        done();
      };
    },
    config: {
      // 複雑な設定項目
      dataFilters: {
        label: "Data Filters",
        input: "array",
        items: {
          field: {
            label: "Field",
            input: "string",
            default: "",
          },
          operator: {
            label: "Operator",
            input: "select",
            options: [
              { label: "Equals", value: "eq" },
              { label: "Greater Than", value: "gt" },
              { label: "Less Than", value: "lt" },
            ],
            default: "eq",
          },
          value: {
            label: "Value",
            input: "string",
            default: "",
          },
        },
        default: [],
      },
      textColor: {
        label: "Text Color",
        input: "rgb",
        default: { r: 255, g: 255, b: 255 },
      },
      backgroundColor: {
        label: "Background Color",
        input: "rgb",
        default: { r: 0, g: 0, b: 0 },
      },
    },
  });
}
```

## 拡張機能の組み合わせ

### 複数機能を持つ拡張機能

```typescript
export function activate(extensionContext: ExtensionContext): void {
  // 1. カスタムメッセージコンバーター
  extensionContext.registerMessageConverter({
    fromSchemaName: "custom_msgs/RobotData",
    toSchemaName: "foxglove/RobotState",
    converter: (customData) => ({
      // 変換処理
    }),
  });

  // 2. トピックエイリアス
  extensionContext.registerTopicAliases((topics) => {
    return topics
      .filter((topic) => topic.name.startsWith("/robot_"))
      .map((topic) => ({
        sourceTopicName: topic.name,
        aliasedTopicName: topic.name.replace("/robot_", "/robots/"),
      }));
  });

  // 3. カスタムパネル
  extensionContext.registerPanel({
    name: "robot-dashboard",
    initPanel: (panelContext) => {
      // パネル実装
    },
  });

  // 4. カメラモデル
  extensionContext.registerCameraModel({
    name: "robot_camera",
    build: (info) => new RobotCameraModel(info),
  });
}
```

## パフォーマンス考慮事項

### 効率的な実装

```typescript
// 良い例：メモ化を使用
export function activate(extensionContext: ExtensionContext): void {
  const memoizedConverter = memoize((input: any) => {
    // 重い変換処理
    return expensiveConversion(input);
  });

  extensionContext.registerMessageConverter({
    fromSchemaName: "heavy_msgs/LargeData",
    toSchemaName: "standard_msgs/ProcessedData",
    converter: memoizedConverter,
  });
}

// 悪い例：毎回重い処理を実行
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerMessageConverter({
    fromSchemaName: "heavy_msgs/LargeData",
    toSchemaName: "standard_msgs/ProcessedData",
    converter: (input) => {
      // 毎回重い処理（非効率）
      return expensiveConversion(input);
    },
  });
}
```

## エラーハンドリング

### 堅牢な拡張機能

```typescript
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerMessageConverter({
    fromSchemaName: "unreliable_msgs/Data",
    toSchemaName: "standard_msgs/SafeData",
    converter: (input) => {
      try {
        return processData(input);
      } catch (error) {
        console.error("Conversion failed:", error);
        // フォールバック値を返す
        return {
          data: "Error: Unable to process data",
          timestamp: Date.now(),
        };
      }
    },
  });
}
```

## 今後の拡張予定

### 計画中の新しい拡張タイプ

1. **データソース拡張**: カスタムデータソースの追加
2. **レイアウト拡張**: カスタムレイアウトエンジン
3. **テーマ拡張**: カスタムテーマとスタイル
4. **ツール拡張**: 開発者ツールの追加
5. **エクスポート拡張**: カスタムエクスポート形式

---

このドキュメントは、Lichtblick v1.17.0 時点の情報に基づいています。最新の情報については、公式ドキュメントを参照してください。
