# Lichtblick 拡張機能開発ガイド

## 概要

Lichtblick拡張機能は、TypeScriptを使用して作成され、`@lichtblick/suite` SDKを使用してLichtblickアプリケーション内でカスタム機能を提供します。この開発ガイドでは、拡張機能の作成から配布までの完全な手順を説明します。

## 開発環境の準備

### 必要な環境

- **Node.js**: 16以上（推奨: 最新LTS版）
- **npm**: Node.jsに付属
- **エディタ**: VSCode（最も良くサポートされている）

### 開発ツールのインストール

```bash
# create-lichtblick-extension の最新版を使用
npm init lichtblick-extension@latest my-extension-name

# プロジェクトディレクトリに移動
cd my-extension-name

# 依存関係をインストール
npm install
```

## プロジェクト構造

```
my-extension-name/
├── src/
│   ├── index.ts          # エントリーポイント
│   └── ExamplePanel.tsx  # サンプルパネル
├── package.json          # プロジェクト設定
├── tsconfig.json         # TypeScript設定
├── config.ts             # ビルド設定
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## 基本的な拡張機能の作成

### 1. エントリーポイント（index.ts）

```typescript
import { ExtensionContext } from "@lichtblick/suite";
import { initExamplePanel } from "./ExamplePanel";

export function activate(extensionContext: ExtensionContext): void {
  // パネルの登録
  extensionContext.registerPanel({
    name: "example-panel",
    initPanel: initExamplePanel,
  });

  // メッセージコンバータの登録例
  extensionContext.registerMessageConverter({
    fromSchemaName: "custom.Input",
    toSchemaName: "geometry_msgs/Point",
    converter: (inputMessage: any) => {
      return {
        x: inputMessage.position.x,
        y: inputMessage.position.y,
        z: inputMessage.position.z,
      };
    },
  });

  // トピックエイリアスの登録例
  extensionContext.registerTopicAlias("/robot/pose", "/robot/current_pose");
}
```

### 2. パネルコンポーネントの作成

```typescript
import {
  Immutable,
  MessageEvent,
  PanelExtensionContext,
  Topic
} from "@lichtblick/suite";
import { ReactElement, useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function ExamplePanel({ context }: { context: PanelExtensionContext }): ReactElement {
  const [topics, setTopics] = useState<undefined | Immutable<Topic[]>>();
  const [messages, setMessages] = useState<undefined | Immutable<MessageEvent[]>>();
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  // レンダリングハンドラーの設定
  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      setTopics(renderState.topics);
      setMessages(renderState.currentFrame);
    };

    // 監視するフィールドの指定
    context.watch("topics");
    context.watch("currentFrame");

    // トピックの購読
    context.subscribe([{ topic: "/some/topic" }]);
  }, [context]);

  // レンダリング完了の通知
  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  return (
    <div style={{ padding: "1rem" }}>
      <h2>My Custom Panel</h2>
      <div>
        <h3>Available Topics:</h3>
        {(topics ?? []).map((topic) => (
          <div key={topic.name}>
            {topic.name} - {topic.schemaName}
          </div>
        ))}
      </div>
      <div>
        <h3>Messages:</h3>
        <p>Received {messages?.length || 0} messages</p>
      </div>
    </div>
  );
}

export function initExamplePanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<ExamplePanel context={context} />);

  return () => {
    root.unmount();
  };
}
```

## 拡張機能の種類と実装例

### 1. パネル拡張機能

パネル拡張機能は、LichtblickのワークスペースにカスタムUIパネルを追加する最も一般的な拡張機能です。

#### 基本的なパネル拡張

```typescript
import { ExtensionContext, PanelExtensionContext } from "@lichtblick/suite";
import { createRoot } from "react-dom/client";

function MyCustomPanel({ context }: { context: PanelExtensionContext }) {
  const [data, setData] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setConfig(renderState.config);
      setData(renderState.currentFrame?.messages || []);
      done();
    };

    context.watch("config");
    context.watch("currentFrame");
    context.subscribe([{ topic: "/robot/status" }]);
  }, [context]);

  return (
    <div style={{ padding: "16px" }}>
      <h2>Robot Status Panel</h2>
      <div>
        <p>Refresh Rate: {config.refreshRate}Hz</p>
        <p>Messages: {data.length}</p>
        {data.map((msg, index) => (
          <div key={index}>
            <strong>{msg.topic}:</strong> {JSON.stringify(msg.message)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "robot-status-panel",
    initPanel: (context: PanelExtensionContext) => {
      const root = createRoot(context.panelElement);
      root.render(<MyCustomPanel context={context} />);
      return () => root.unmount();
    },
    config: {
      refreshRate: {
        label: "Refresh Rate",
        input: "number",
        min: 1,
        max: 60,
        default: 10,
        help: "Panel refresh rate in Hz",
      },
      showTimestamp: {
        label: "Show Timestamp",
        input: "boolean",
        default: true,
        help: "Display message timestamps",
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
    },
  });
}
```

#### 高度なパネル拡張（3D可視化）

```typescript
import { ExtensionContext, PanelExtensionContext } from "@lichtblick/suite";
import * as THREE from "three";

function ThreeDVisualizationPanel({ context }: { context: PanelExtensionContext }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();

  useLayoutEffect(() => {
    if (!mountRef.current) return;

    // Three.jsの初期化
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();

    renderer.setSize(800, 600);
    mountRef.current.appendChild(renderer.domElement);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // 基本的なライトを追加
    const ambientLight = new THREE.AmbientLight(0x404040);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(ambientLight);
    scene.add(directionalLight);

    camera.position.z = 5;

    context.onRender = (renderState, done) => {
      const messages = renderState.currentFrame?.messages || [];

      // PointCloudメッセージを処理
      messages.forEach(msg => {
        if (msg.topic === "/pointcloud" && msg.message) {
          updatePointCloud(msg.message);
        }
      });

      renderer.render(scene, camera);
      done();
    };

    context.watch("currentFrame");
    context.subscribe([{ topic: "/pointcloud" }]);

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [context]);

  const updatePointCloud = (pointCloudData: any) => {
    if (!sceneRef.current) return;

    // 既存のポイントクラウドを削除
    const existingPointCloud = sceneRef.current.getObjectByName("pointcloud");
    if (existingPointCloud) {
      sceneRef.current.remove(existingPointCloud);
    }

    // 新しいポイントクラウドを作成
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pointCloudData.points.length * 3);
    const colors = new Float32Array(pointCloudData.points.length * 3);

    pointCloudData.points.forEach((point: any, index: number) => {
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;

      colors[index * 3] = point.r / 255;
      colors[index * 3 + 1] = point.g / 255;
      colors[index * 3 + 2] = point.b / 255;
    });

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.01,
      vertexColors: true
    });
    const pointCloud = new THREE.Points(geometry, material);
    pointCloud.name = "pointcloud";

    sceneRef.current.add(pointCloud);
  };

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
```

### 2. メッセージコンバータ

メッセージコンバータは、異なるメッセージフォーマット間の変換を行う機能です。

#### ROS1からROS2への変換

```typescript
export function activate(extensionContext: ExtensionContext): void {
  // Twist メッセージの変換
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

  // PointCloud2 メッセージの変換
  extensionContext.registerMessageConverter({
    fromSchemaName: "sensor_msgs/PointCloud2",
    toSchemaName: "foxglove/PointCloud",
    converter: (pointCloud2: any) => {
      const points = parsePointCloud2Data(pointCloud2);

      return {
        timestamp: pointCloud2.header.stamp,
        frame_id: pointCloud2.header.frame_id,
        pose: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
        points: points.map((point: any) => ({
          x: point.x,
          y: point.y,
          z: point.z,
          color: point.rgb,
        })),
      };
    },
  });
}

function parsePointCloud2Data(pointCloud2: any): any[] {
  // PointCloud2のバイナリデータを解析
  const points: any[] = [];
  const dataView = new DataView(pointCloud2.data.buffer);

  const pointStep = pointCloud2.point_step;
  const numPoints = pointCloud2.width * pointCloud2.height;

  for (let i = 0; i < numPoints; i++) {
    const offset = i * pointStep;

    const x = dataView.getFloat32(offset, true);
    const y = dataView.getFloat32(offset + 4, true);
    const z = dataView.getFloat32(offset + 8, true);
    const rgb = dataView.getUint32(offset + 12, true);

    points.push({ x, y, z, rgb });
  }

  return points;
}
```

#### カスタムメッセージの標準化

```typescript
export function activate(extensionContext: ExtensionContext): void {
  // カスタムロボットステータスを標準メッセージに変換
  extensionContext.registerMessageConverter({
    fromSchemaName: "custom_msgs/RobotStatus",
    toSchemaName: "diagnostic_msgs/DiagnosticStatus",
    converter: (customStatus: any) => {
      const level = customStatus.error_code === 0 ? 0 : 2; // OK or ERROR

      return {
        level,
        name: `Robot ${customStatus.robot_id}`,
        message: customStatus.status_message,
        hardware_id: customStatus.hardware_id,
        values: [
          { key: "battery_level", value: customStatus.battery_level.toString() },
          { key: "temperature", value: customStatus.temperature.toString() },
          { key: "error_code", value: customStatus.error_code.toString() },
        ],
      };
    },
  });

  // カスタムセンサーデータをJoint Stateに変換
  extensionContext.registerMessageConverter({
    fromSchemaName: "custom_msgs/SensorArray",
    toSchemaName: "sensor_msgs/JointState",
    converter: (sensorArray: any) => {
      return {
        header: {
          stamp: sensorArray.timestamp,
          frame_id: "base_link",
        },
        name: sensorArray.sensors.map((sensor: any) => sensor.name),
        position: sensorArray.sensors.map((sensor: any) => sensor.position),
        velocity: sensorArray.sensors.map((sensor: any) => sensor.velocity),
        effort: sensorArray.sensors.map((sensor: any) => sensor.effort),
      };
    },
  });
}
```

### 3. トピックエイリアス

トピックエイリアスは、トピック名の統一や互換性確保のために使用します。

#### 基本的なエイリアス

```typescript
export function activate(extensionContext: ExtensionContext): void {
  // 単純なエイリアス
  extensionContext.registerTopicAliases((topics) => {
    return [
      {
        sourceTopicName: "/robot/odom",
        aliasedTopicName: "/robot/odometry",
      },
      {
        sourceTopicName: "/camera/image",
        aliasedTopicName: "/camera/image_raw",
      },
      {
        sourceTopicName: "/lidar/scan",
        aliasedTopicName: "/laser_scan",
      },
    ];
  });
}
```

#### 高度なエイリアス（正規表現とロジック）

```typescript
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerTopicAliases((topics) => {
    const aliases = [];

    // 名前空間の統一
    const namespaceMapping = {
      "/old_namespace": "/new_namespace",
      "/legacy_robot": "/robot",
      "/cam": "/camera",
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

    // 正規表現を使用した動的エイリアス
    topics.forEach((topic) => {
      // 複数ロボットの統一命名
      const robotMatch = topic.name.match(/^\/robot_(\d+)\/(.+)$/);
      if (robotMatch) {
        const robotId = robotMatch[1];
        const topicPath = robotMatch[2];
        aliases.push({
          sourceTopicName: topic.name,
          aliasedTopicName: `/robots/${robotId}/${topicPath}`,
        });
      }

      // センサーデータの統一命名
      const sensorMatch = topic.name.match(/^\/sensor_(\w+)_(\d+)$/);
      if (sensorMatch) {
        const sensorType = sensorMatch[1];
        const sensorId = sensorMatch[2];
        aliases.push({
          sourceTopicName: topic.name,
          aliasedTopicName: `/sensors/${sensorType}/${sensorId}`,
        });
      }
    });

    // 条件付きエイリアス
    topics.forEach((topic) => {
      if (topic.schemaName === "sensor_msgs/Image") {
        // 画像トピックの統一
        if (topic.name.includes("compressed")) {
          aliases.push({
            sourceTopicName: topic.name,
            aliasedTopicName: topic.name.replace("compressed", "image"),
          });
        }
      }

      if (topic.schemaName === "sensor_msgs/LaserScan") {
        // LiDARトピックの統一
        aliases.push({
          sourceTopicName: topic.name,
          aliasedTopicName: topic.name.replace("scan", "lidar"),
        });
      }
    });

    return aliases;
  });
}
```

### 4. カスタムカメラモデル

カスタムカメラモデルは、特殊なカメラキャリブレーションや投影を実装するために使用します。

#### 基本的なカメラモデル

```typescript
import { ICameraModel, CameraInfo } from "@lichtblick/suite";

class CustomPinholeCameraModel implements ICameraModel {
  public readonly fx: number;
  public readonly fy: number;
  public readonly cx: number;
  public readonly cy: number;
  public readonly width: number;
  public readonly height: number;

  constructor(info: CameraInfo) {
    // カメラ内部パラメータの取得
    this.fx = info.K[0]; // K[0,0]
    this.fy = info.K[4]; // K[1,1]
    this.cx = info.K[2]; // K[0,2]
    this.cy = info.K[5]; // K[1,2]
    this.width = info.width;
    this.height = info.height;
  }

  public projectPixelTo3dPlane(
    pixel: [number, number],
    planeDistance: number,
  ): [number, number, number] {
    const [u, v] = pixel;

    // ピクセル座標を正規化座標に変換
    const x = ((u - this.cx) * planeDistance) / this.fx;
    const y = ((v - this.cy) * planeDistance) / this.fy;

    return [x, y, planeDistance];
  }

  public projectPixelTo3dRay(pixel: [number, number]): {
    origin: [number, number, number];
    direction: [number, number, number];
  } {
    const [u, v] = pixel;

    // 正規化座標に変換
    const x = (u - this.cx) / this.fx;
    const y = (v - this.cy) / this.fy;

    // 方向ベクトルを正規化
    const length = Math.sqrt(x * x + y * y + 1);

    return {
      origin: [0, 0, 0],
      direction: [x / length, y / length, 1 / length],
    };
  }
}

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerCameraModel({
    name: "custom_pinhole_camera",
    build: (info: CameraInfo) => {
      return new CustomPinholeCameraModel(info);
    },
  });
}
```

#### 魚眼カメラモデル

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
    const r = Math.sqrt(x_norm * x_norm + y_norm * y_norm);
    const theta = Math.atan(r);

    // 歪み補正の計算
    const theta_d =
      theta *
      (1 +
        this.k1 * theta * theta +
        this.k2 * Math.pow(theta, 4) +
        this.k3 * Math.pow(theta, 6) +
        this.k4 * Math.pow(theta, 8));

    const scale = r > 0 ? theta_d / r : 1;
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

### 5. 複合拡張機能

複数の機能を組み合わせた拡張機能の例：

```typescript
export function activate(extensionContext: ExtensionContext): void {
  // 1. カスタムメッセージコンバーター
  extensionContext.registerMessageConverter({
    fromSchemaName: "custom_msgs/RobotData",
    toSchemaName: "foxglove/RobotState",
    converter: (customData: any) => ({
      timestamp: customData.header.stamp,
      frame_id: customData.header.frame_id,
      pose: customData.pose,
      twist: customData.velocity,
      battery_level: customData.battery_percentage / 100,
      status: customData.error_code === 0 ? "OK" : "ERROR",
    }),
  });

  // 2. トピックエイリアス
  extensionContext.registerTopicAliases((topics) => {
    return topics
      .filter(topic => topic.name.startsWith("/robot_"))
      .map(topic => ({
        sourceTopicName: topic.name,
        aliasedTopicName: topic.name.replace("/robot_", "/robots/"),
      }));
  });

  // 3. カスタムパネル
  extensionContext.registerPanel({
    name: "robot-dashboard",
    initPanel: (context: PanelExtensionContext) => {
      const root = createRoot(context.panelElement);
      root.render(<RobotDashboard context={context} />);
      return () => root.unmount();
    },
    config: {
      robotId: {
        label: "Robot ID",
        input: "string",
        default: "robot_1",
      },
      showBattery: {
        label: "Show Battery",
        input: "boolean",
        default: true,
      },
    },
  });

  // 4. カメラモデル
  extensionContext.registerCameraModel({
    name: "robot_camera",
    build: (info: CameraInfo) => new RobotCameraModel(info),
  });
}
```

## 開発ワークフロー

### 1. ローカル開発

```bash
# 開発用ビルド（ウォッチモード）
npm run build:watch

# ローカルインストール
npm run local-install
```

### 2. テスト

```bash
# TypeScriptのコンパイルチェック
npm run build

# リンターの実行
npm run lint

# テストの実行（設定されている場合）
npm test
```

### 3. デバッグ

- Lichtblickの開発者ツールを使用
- `console.log`でのデバッグ出力
- React Developer Toolsの利用

## 設定とカスタマイズ

### config.ts の設定

```typescript
module.exports = {
  webpack: (config) => {
    // CSSローダーの追加
    config.module.rules.push({
      test: /\.css$/i,
      use: ["style-loader", "css-loader"],
    });

    // 追加のローダー設定
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg)$/i,
      use: [
        {
          loader: "file-loader",
          options: {
            outputPath: "images",
          },
        },
      ],
    });

    return config;
  },
};
```

### package.json の設定

```json
{
  "name": "my-extension",
  "publisher": "my-publisher",
  "version": "1.0.0",
  "description": "My custom Lichtblick extension",
  "main": "dist/index.js",
  "scripts": {
    "build": "lichtblick-extension build",
    "build:watch": "lichtblick-extension build --watch",
    "local-install": "lichtblick-extension install",
    "package": "lichtblick-extension package"
  },
  "lichtblick": {
    "displayName": "My Extension",
    "description": "A custom extension for Lichtblick",
    "publisher": "my-publisher",
    "homepage": "https://github.com/my-publisher/my-extension",
    "license": "MIT",
    "keywords": ["lichtblick", "robotics", "ros"]
  }
}
```

## 高度な機能

### 1. Webワーカーの使用

```typescript
// Webワーカーでの重い処理
const worker = new Worker("/path/to/worker.js");

worker.postMessage({ data: largeDataSet });
worker.onmessage = (event) => {
  const processedData = event.data;
  // 処理結果を使用
};
```

### 2. 外部APIとの連携

```typescript
// 外部APIからのデータ取得
async function fetchExternalData(apiKey: string) {
  try {
    const response = await fetch("https://api.example.com/data", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    console.error("API fetch error:", error);
    return null;
  }
}
```

### 3. 設定の永続化

```typescript
// ローカルストレージでの設定保存
function saveSettings(settings: any) {
  localStorage.setItem("my-extension-settings", JSON.stringify(settings));
}

function loadSettings() {
  const saved = localStorage.getItem("my-extension-settings");
  return saved ? JSON.parse(saved) : {};
}
```

## パッケージングと配布

### 1. 拡張機能のパッケージ化

```bash
# .foxeファイルの生成
npm run package
```

これにより、`my-extension-1.0.0.foxe`ファイルが生成されます。

### 2. ファイル構造

`.foxe`ファイルは実際にはZIPアーカイブで、以下の構造を持ちます：

```
my-extension-1.0.0.foxe
├── package.json
├── dist/
│   └── index.js
├── README.md
├── CHANGELOG.md
└── LICENSE
```

### 3. インストール方法

- **手動インストール**: `.foxe`ファイルをLichtblickで開く
- **開発者モード**: `~/.lichtblick-suite/extensions/`に直接配置

## ベストプラクティス

### 1. パフォーマンス

- **レンダリング最適化**: 不要な再レンダリングを避ける
- **メモリ管理**: 大きなデータセットの適切な処理
- **非同期処理**: UIをブロックしない処理の実装

```typescript
// React.memoを使用した最適化
const OptimizedComponent = React.memo(({ data }) => {
  return <div>{data.value}</div>;
});

// useMemoでの計算結果のキャッシュ
const expensiveValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

### 2. エラーハンドリング

```typescript
// エラーバウンダリの実装
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Extension error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong in the extension.</div>;
    }
    return this.props.children;
  }
}
```

### 3. テスト

```typescript
// 単体テストの例
import { render, screen } from '@testing-library/react';
import { ExamplePanel } from './ExamplePanel';

test('renders panel title', () => {
  const mockContext = {
    onRender: jest.fn(),
    watch: jest.fn(),
    subscribe: jest.fn(),
    panelElement: document.createElement('div')
  };

  render(<ExamplePanel context={mockContext} />);
  expect(screen.getByText('My Custom Panel')).toBeInTheDocument();
});
```

## トラブルシューティング

### よくある問題と解決方法

1. **ビルドエラー**

   - TypeScript設定の確認
   - 依存関係の更新

2. **拡張機能が読み込まれない**

   - package.jsonの設定確認
   - ファイルパスの確認

3. **パフォーマンス問題**
   - レンダリング頻度の最適化
   - メモリリークの確認

### デバッグのヒント

```typescript
// デバッグ用のログ出力
if (process.env.NODE_ENV === "development") {
  console.log("Debug info:", { topics, messages });
}

// パフォーマンス測定
console.time("expensive-operation");
expensiveOperation();
console.timeEnd("expensive-operation");
```

## 参考リンク

- [Lichtblick Suite GitHub](https://github.com/lichtblick-suite/lichtblick)
- [create-lichtblick-extension](https://github.com/lichtblick-suite/create-lichtblick-extension)
- [拡張機能のサンプル](https://github.com/lichtblick-suite/create-lichtblick-extension/tree/main/examples)

---

**作成日**: 2025年1月8日
**最終更新**: 2025年1月8日
