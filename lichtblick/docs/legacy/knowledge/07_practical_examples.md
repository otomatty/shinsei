# 7. 実践的な開発例

## 🌡️ 温度センサーPanel の作成

### **基本的な温度センサーPanel**

温度データを表示するシンプルなPanelを作成します。

**実際の参考例**:

- 既存Panel: `packages/suite-base/src/panels/Plot/index.tsx` (1行目〜)
- Panel登録: `packages/suite-base/src/panels/index.ts` (1行目〜)

```typescript
// TemperatureSensorPanel.tsx
import React, { useMemo } from "react";
import { useMessagesByTopic } from "@foxglove/studio-base/hooks/useMessagesByTopic";
import { Panel } from "@foxglove/studio-base/components/Panel";
import { PanelProps } from "@foxglove/studio-base/types/panels";

// 温度メッセージの型定義
interface TemperatureMessage {
  temperature: number;
  humidity: number;
  timestamp: {
    sec: number;
    nsec: number;
  };
  sensor_id: string;
}

// Panel設定の型定義
interface TemperatureSensorConfig {
  topic: string;
  showHumidity: boolean;
  temperatureUnit: "celsius" | "fahrenheit";
  maxHistorySize: number;
}

function TemperatureSensorPanel({
  config,
  saveConfig,
}: PanelProps<TemperatureSensorConfig>): JSX.Element {
  // メッセージの購読
  const topics = useMemo(() => [{ topic: config.topic }], [config.topic]);
  const messages = useMessagesByTopic({
    topics,
    historySize: config.maxHistorySize,
  });

  // 最新の温度データを取得
  const latestTemperature = useMemo(() => {
    if (messages.length === 0) return null;

    const latestMessage = messages[messages.length - 1];
    return latestMessage?.message as TemperatureMessage;
  }, [messages]);

  // 温度の単位変換
  const convertTemperature = (celsius: number): number => {
    if (config.temperatureUnit === "fahrenheit") {
      return (celsius * 9/5) + 32;
    }
    return celsius;
  };

  // 過去の温度データの統計計算
  const temperatureStats = useMemo(() => {
    if (messages.length === 0) return null;

    const temperatures = messages.map(msg =>
      (msg.message as TemperatureMessage).temperature
    );

    const converted = temperatures.map(temp => convertTemperature(temp));

    return {
      current: converted[converted.length - 1],
      average: converted.reduce((sum, temp) => sum + temp, 0) / converted.length,
      min: Math.min(...converted),
      max: Math.max(...converted),
      count: converted.length,
    };
  }, [messages, config.temperatureUnit]);

  if (!latestTemperature) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>No temperature data available</p>
        <p>Subscribing to: {config.topic}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", height: "100%" }}>
      <h2>Temperature Sensor</h2>
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        {/* 現在の温度 */}
        <div style={{
          backgroundColor: "#f0f0f0",
          padding: "15px",
          borderRadius: "8px",
          minWidth: "150px"
        }}>
          <h3>Current Temperature</h3>
          <div style={{
            fontSize: "2rem",
            fontWeight: "bold",
            color: temperatureStats!.current > 25 ? "#ff4444" : "#4444ff"
          }}>
            {temperatureStats!.current.toFixed(1)}°{config.temperatureUnit.charAt(0).toUpperCase()}
          </div>
          <div style={{ fontSize: "0.9rem", color: "#666" }}>
            Sensor ID: {latestTemperature.sensor_id}
          </div>
        </div>

        {/* 湿度（オプション） */}
        {config.showHumidity && (
          <div style={{
            backgroundColor: "#f0f8ff",
            padding: "15px",
            borderRadius: "8px",
            minWidth: "150px"
          }}>
            <h3>Humidity</h3>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#2196f3" }}>
              {latestTemperature.humidity.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* 統計情報 */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Statistics ({temperatureStats!.count} readings)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <div>
            <strong>Average:</strong> {temperatureStats!.average.toFixed(1)}°
          </div>
          <div>
            <strong>Min:</strong> {temperatureStats!.min.toFixed(1)}°
          </div>
          <div>
            <strong>Max:</strong> {temperatureStats!.max.toFixed(1)}°
          </div>
        </div>
      </div>

      {/* 設定コントロール */}
      <div style={{ borderTop: "1px solid #ddd", paddingTop: "15px" }}>
        <h3>Settings</h3>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <label>
            Topic:
            <input
              type="text"
              value={config.topic}
              onChange={(e) => saveConfig({ ...config, topic: e.target.value })}
              style={{ marginLeft: "5px", padding: "5px" }}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={config.showHumidity}
              onChange={(e) => saveConfig({ ...config, showHumidity: e.target.checked })}
            />
            Show Humidity
          </label>

          <label>
            Unit:
            <select
              value={config.temperatureUnit}
              onChange={(e) => saveConfig({
                ...config,
                temperatureUnit: e.target.value as "celsius" | "fahrenheit"
              })}
              style={{ marginLeft: "5px", padding: "5px" }}
            >
              <option value="celsius">Celsius</option>
              <option value="fahrenheit">Fahrenheit</option>
            </select>
          </label>

          <label>
            History Size:
            <input
              type="number"
              min="1"
              max="1000"
              value={config.maxHistorySize}
              onChange={(e) => saveConfig({
                ...config,
                maxHistorySize: parseInt(e.target.value) || 100
              })}
              style={{ marginLeft: "5px", padding: "5px", width: "80px" }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// Panel として登録
export default Panel(
  Object.assign(TemperatureSensorPanel, {
    panelType: "TemperatureSensor",
    defaultConfig: {
      topic: "/sensors/temperature",
      showHumidity: true,
      temperatureUnit: "celsius" as const,
      maxHistorySize: 100,
    },
  }),
);
```

## 🚁 3D ロボット可視化 Panel

### **高度な3D可視化Panel**

Three.jsを使用してロボットの3D可視化を行うPanelを作成します。

**実際の参考例**:

- 3D Panel: `packages/suite-base/src/panels/ThreeDeeRender/index.tsx` (1行目〜)
- Three.js使用例: `packages/suite-base/src/panels/ThreeDeeRender/renderer/` (ディレクトリ全体)

```typescript
// RobotVisualizationPanel.tsx
import React, { useRef, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import { useMessagesByTopic } from "@foxglove/studio-base/hooks/useMessagesByTopic";
import { Panel } from "@foxglove/studio-base/components/Panel";
import { PanelProps } from "@foxglove/studio-base/types/panels";

// ロボット位置メッセージの型定義
interface RobotPoseMessage {
  header: {
    stamp: {
      sec: number;
      nsec: number;
    };
    frame_id: string;
  };
  pose: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    orientation: {
      x: number;
      y: number;
      z: number;
      w: number;
    };
  };
}

// LiDAR スキャンメッセージの型定義
interface LaserScanMessage {
  header: {
    stamp: {
      sec: number;
      nsec: number;
    };
    frame_id: string;
  };
  angle_min: number;
  angle_max: number;
  angle_increment: number;
  time_increment: number;
  scan_time: number;
  range_min: number;
  range_max: number;
  ranges: number[];
  intensities: number[];
}

// Panel設定の型定義
interface RobotVisualizationConfig {
  robotTopic: string;
  lidarTopic: string;
  showTrail: boolean;
  trailLength: number;
  robotColor: string;
  lidarColor: string;
  backgroundColor: string;
  showGrid: boolean;
  gridSize: number;
  cameraMode: "follow" | "free";
}

function RobotVisualizationPanel({
  config,
  saveConfig,
}: PanelProps<RobotVisualizationConfig>): JSX.Element {
  // Canvas とレンダラーの参照
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const robotMeshRef = useRef<THREE.Mesh>();
  const lidarPointsRef = useRef<THREE.Points>();
  const trailRef = useRef<THREE.Line>();

  // 購読するトピックの設定
  const topics = useMemo(() => [
    { topic: config.robotTopic },
    { topic: config.lidarTopic },
  ], [config.robotTopic, config.lidarTopic]);

  // メッセージの購読
  const messages = useMessagesByTopic({
    topics,
    historySize: config.trailLength,
  });

  // ロボット位置のメッセージをフィルタリング
  const robotMessages = useMemo(() => {
    return messages.filter(msg => msg.topic === config.robotTopic);
  }, [messages, config.robotTopic]);

  // LiDAR メッセージをフィルタリング
  const lidarMessages = useMemo(() => {
    return messages.filter(msg => msg.topic === config.lidarTopic);
  }, [messages, config.lidarTopic]);

  // 3D シーンの初期化
  useEffect(() => {
    if (!canvasRef.current) return;

    // シーンの作成
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(config.backgroundColor);
    sceneRef.current = scene;

    // レンダラーの作成
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // カメラの作成
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // ライトの追加
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // グリッドの追加
    if (config.showGrid) {
      const gridHelper = new THREE.GridHelper(config.gridSize, config.gridSize);
      scene.add(gridHelper);
    }

    // ロボットメッシュの作成
    const robotGeometry = new THREE.BoxGeometry(1, 0.5, 0.3);
    const robotMaterial = new THREE.MeshLambertMaterial({ color: config.robotColor });
    const robotMesh = new THREE.Mesh(robotGeometry, robotMaterial);
    robotMesh.castShadow = true;
    scene.add(robotMesh);
    robotMeshRef.current = robotMesh;

    // LiDAR ポイントの作成
    const lidarGeometry = new THREE.BufferGeometry();
    const lidarMaterial = new THREE.PointsMaterial({
      color: config.lidarColor,
      size: 0.02,
    });
    const lidarPoints = new THREE.Points(lidarGeometry, lidarMaterial);
    scene.add(lidarPoints);
    lidarPointsRef.current = lidarPoints;

    // トレイルラインの作成
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({
      color: config.robotColor,
      opacity: 0.5,
      transparent: true,
    });
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trail);
    trailRef.current = trail;

    // リサイズハンドラー
    const handleResize = () => {
      if (!canvasRef.current) return;

      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [config.backgroundColor, config.showGrid, config.gridSize, config.robotColor, config.lidarColor]);

  // ロボット位置の更新
  useEffect(() => {
    if (!robotMeshRef.current || robotMessages.length === 0) return;

    const latestMessage = robotMessages[robotMessages.length - 1];
    const robotPose = latestMessage.message as RobotPoseMessage;

    // ロボットの位置を更新
    robotMeshRef.current.position.set(
      robotPose.pose.position.x,
      robotPose.pose.position.y,
      robotPose.pose.position.z
    );

    // ロボットの向きを更新
    robotMeshRef.current.quaternion.set(
      robotPose.pose.orientation.x,
      robotPose.pose.orientation.y,
      robotPose.pose.orientation.z,
      robotPose.pose.orientation.w
    );

    // カメラの追従
    if (config.cameraMode === "follow" && cameraRef.current) {
      cameraRef.current.position.set(
        robotPose.pose.position.x + 10,
        robotPose.pose.position.y + 10,
        robotPose.pose.position.z + 10
      );
      cameraRef.current.lookAt(
        robotPose.pose.position.x,
        robotPose.pose.position.y,
        robotPose.pose.position.z
      );
    }
  }, [robotMessages, config.cameraMode]);

  // トレイルの更新
  useEffect(() => {
    if (!trailRef.current || !config.showTrail || robotMessages.length === 0) return;

    const positions: number[] = [];

    robotMessages.forEach((msg) => {
      const robotPose = msg.message as RobotPoseMessage;
      positions.push(
        robotPose.pose.position.x,
        robotPose.pose.position.y,
        robotPose.pose.position.z
      );
    });

    const geometry = trailRef.current.geometry as THREE.BufferGeometry;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setDrawRange(0, positions.length / 3);
  }, [robotMessages, config.showTrail]);

  // LiDAR データの更新
  useEffect(() => {
    if (!lidarPointsRef.current || lidarMessages.length === 0) return;

    const latestLidarMessage = lidarMessages[lidarMessages.length - 1];
    const lidarScan = latestLidarMessage.message as LaserScanMessage;

    const positions: number[] = [];
    const colors: number[] = [];

    // LiDAR スキャンデータを3D点群に変換
    lidarScan.ranges.forEach((range, index) => {
      if (range >= lidarScan.range_min && range <= lidarScan.range_max) {
        const angle = lidarScan.angle_min + (index * lidarScan.angle_increment);
        const x = range * Math.cos(angle);
        const y = range * Math.sin(angle);
        const z = 0;

        positions.push(x, y, z);

        // 距離に応じた色付け
        const intensity = Math.min(range / lidarScan.range_max, 1.0);
        colors.push(intensity, 1.0 - intensity, 0);
      }
    });

    const geometry = lidarPointsRef.current.geometry as THREE.BufferGeometry;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
  }, [lidarMessages]);

  // アニメーションループ
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // 設定変更ハンドラー
  const handleConfigChange = useCallback((newConfig: Partial<RobotVisualizationConfig>) => {
    saveConfig({ ...config, ...newConfig });
  }, [config, saveConfig]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "calc(100% - 120px)" }}
      />

      {/* 設定パネル */}
      <div style={{ height: "120px", padding: "10px", backgroundColor: "#f5f5f5" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <div>
            <label>
              Robot Topic:
              <input
                type="text"
                value={config.robotTopic}
                onChange={(e) => handleConfigChange({ robotTopic: e.target.value })}
                style={{ width: "100%", padding: "3px" }}
              />
            </label>
          </div>

          <div>
            <label>
              LiDAR Topic:
              <input
                type="text"
                value={config.lidarTopic}
                onChange={(e) => handleConfigChange({ lidarTopic: e.target.value })}
                style={{ width: "100%", padding: "3px" }}
              />
            </label>
          </div>

          <div>
            <label>
              <input
                type="checkbox"
                checked={config.showTrail}
                onChange={(e) => handleConfigChange({ showTrail: e.target.checked })}
              />
              Show Trail
            </label>
          </div>

          <div>
            <label>
              Trail Length:
              <input
                type="number"
                min="1"
                max="500"
                value={config.trailLength}
                onChange={(e) => handleConfigChange({ trailLength: parseInt(e.target.value) || 50 })}
                style={{ width: "100%", padding: "3px" }}
              />
            </label>
          </div>

          <div>
            <label>
              Robot Color:
              <input
                type="color"
                value={config.robotColor}
                onChange={(e) => handleConfigChange({ robotColor: e.target.value })}
                style={{ width: "100%", padding: "3px" }}
              />
            </label>
          </div>

          <div>
            <label>
              Camera Mode:
              <select
                value={config.cameraMode}
                onChange={(e) => handleConfigChange({ cameraMode: e.target.value as "follow" | "free" })}
                style={{ width: "100%", padding: "3px" }}
              >
                <option value="follow">Follow Robot</option>
                <option value="free">Free Camera</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// Panel として登録
export default Panel(
  Object.assign(RobotVisualizationPanel, {
    panelType: "RobotVisualization",
    defaultConfig: {
      robotTopic: "/robot/pose",
      lidarTopic: "/scan",
      showTrail: true,
      trailLength: 50,
      robotColor: "#ff0000",
      lidarColor: "#00ff00",
      backgroundColor: "#f0f0f0",
      showGrid: true,
      gridSize: 20,
      cameraMode: "follow" as const,
    },
  }),
);
```

## 📊 データ統計Panel

### **リアルタイム統計計算Panel**

複数のトピックからデータを収集し、統計情報を表示するPanelです。

**実際の参考例**:

- 統計処理: `packages/suite-base/src/panels/Plot/PlotChart.tsx` (1行目〜)
- データ処理: `packages/suite-base/src/components/MessagePathSyntax/useMessagesByPath.ts` (26行目〜)

```typescript
// DataStatisticsPanel.tsx
import React, { useMemo, useCallback } from "react";
import { useMessagesByPath } from "@foxglove/studio-base/components/MessagePathSyntax";
import { Panel } from "@foxglove/studio-base/components/Panel";
import { PanelProps } from "@foxglove/studio-base/types/panels";

// 統計データの型定義
interface StatisticData {
  path: string;
  count: number;
  min: number;
  max: number;
  mean: number;
  standardDeviation: number;
  latest: number;
  rate: number; // メッセージ/秒
}

// Panel設定の型定義
interface DataStatisticsConfig {
  paths: string[];
  updateInterval: number;
  historySize: number;
  showDetailedStats: boolean;
  autoRefresh: boolean;
}

function DataStatisticsPanel({
  config,
  saveConfig,
}: PanelProps<DataStatisticsConfig>): JSX.Element {
  // メッセージパスからデータを取得
  const messagesByPath = useMessagesByPath(config.paths, config.historySize);

  // 統計データの計算
  const statisticsData = useMemo(() => {
    const stats: StatisticData[] = [];

    for (const [path, messages] of Object.entries(messagesByPath)) {
      if (messages.length === 0) continue;

      // 数値データの抽出
      const values = messages
        .map(msg => msg.value)
        .filter((value): value is number => typeof value === "number");

      if (values.length === 0) continue;

      // 基本統計の計算
      const count = values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const mean = values.reduce((sum, val) => sum + val, 0) / count;

      // 標準偏差の計算
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
      const standardDeviation = Math.sqrt(variance);

      // 最新値
      const latest = values[values.length - 1] ?? 0;

      // メッセージレート（メッセージ/秒）の計算
      const timeSpan = messages.length > 1 ?
        (messages[messages.length - 1]?.receiveTime.sec - messages[0]?.receiveTime.sec) || 1 : 1;
      const rate = count / timeSpan;

      stats.push({
        path,
        count,
        min,
        max,
        mean,
        standardDeviation,
        latest,
        rate,
      });
    }

    return stats;
  }, [messagesByPath]);

  // 設定変更ハンドラー
  const handleConfigChange = useCallback((newConfig: Partial<DataStatisticsConfig>) => {
    saveConfig({ ...config, ...newConfig });
  }, [config, saveConfig]);

  // パス追加ハンドラー
  const handleAddPath = useCallback((path: string) => {
    if (path && !config.paths.includes(path)) {
      handleConfigChange({ paths: [...config.paths, path] });
    }
  }, [config.paths, handleConfigChange]);

  // パス削除ハンドラー
  const handleRemovePath = useCallback((pathToRemove: string) => {
    handleConfigChange({ paths: config.paths.filter(path => path !== pathToRemove) });
  }, [config.paths, handleConfigChange]);

  return (
    <div style={{ padding: "20px", height: "100%", overflow: "auto" }}>
      <h2>Data Statistics</h2>

      {/* パス管理 */}
      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
        <h3>Message Paths</h3>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Enter message path (e.g., /robot/position.x)"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddPath(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
            style={{ width: "300px", padding: "5px", marginRight: "10px" }}
          />
          <button onClick={() => {
            const input = document.querySelector('input[placeholder*="message path"]') as HTMLInputElement;
            if (input) {
              handleAddPath(input.value);
              input.value = '';
            }
          }}>
            Add Path
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {config.paths.map((path) => (
            <span
              key={path}
              style={{
                backgroundColor: "#e9ecef",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
              onClick={() => handleRemovePath(path)}
              title="Click to remove"
            >
              {path} ×
            </span>
          ))}
        </div>
      </div>

      {/* 統計テーブル */}
      {statisticsData.length > 0 ? (
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Path</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Latest</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Count</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Mean</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Min</th>
                <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Max</th>
                {config.showDetailedStats && (
                  <>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Std Dev</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>Rate (Hz)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {statisticsData.map((stat) => (
                <tr key={stat.path}>
                  <td style={{ padding: "10px", border: "1px solid #ddd", fontFamily: "monospace" }}>
                    {stat.path}
                  </td>
                  <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right", fontWeight: "bold" }}>
                    {stat.latest.toFixed(3)}
                  </td>
                  <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                    {stat.count}
                  </td>
                  <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                    {stat.mean.toFixed(3)}
                  </td>
                  <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                    {stat.min.toFixed(3)}
                  </td>
                  <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                    {stat.max.toFixed(3)}
                  </td>
                  {config.showDetailedStats && (
                    <>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                        {stat.standardDeviation.toFixed(3)}
                      </td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "right" }}>
                        {stat.rate.toFixed(2)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          <p>No data available</p>
          <p>Add message paths to see statistics</p>
        </div>
      )}

      {/* 設定パネル */}
      <div style={{
        marginTop: "20px",
        padding: "15px",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px"
      }}>
        <h3>Settings</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          <label>
            History Size:
            <input
              type="number"
              min="1"
              max="10000"
              value={config.historySize}
              onChange={(e) => handleConfigChange({ historySize: parseInt(e.target.value) || 1000 })}
              style={{ width: "100%", padding: "5px", marginTop: "5px" }}
            />
          </label>

          <label>
            Update Interval (ms):
            <input
              type="number"
              min="100"
              max="5000"
              value={config.updateInterval}
              onChange={(e) => handleConfigChange({ updateInterval: parseInt(e.target.value) || 1000 })}
              style={{ width: "100%", padding: "5px", marginTop: "5px" }}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={config.showDetailedStats}
              onChange={(e) => handleConfigChange({ showDetailedStats: e.target.checked })}
              style={{ marginRight: "5px" }}
            />
            Show Detailed Statistics
          </label>

          <label>
            <input
              type="checkbox"
              checked={config.autoRefresh}
              onChange={(e) => handleConfigChange({ autoRefresh: e.target.checked })}
              style={{ marginRight: "5px" }}
            />
            Auto Refresh
          </label>
        </div>
      </div>
    </div>
  );
}

// Panel として登録
export default Panel(
  Object.assign(DataStatisticsPanel, {
    panelType: "DataStatistics",
    defaultConfig: {
      paths: [],
      updateInterval: 1000,
      historySize: 1000,
      showDetailedStats: true,
      autoRefresh: true,
    },
  }),
);
```

## 🔧 Panel 登録の方法

### **Panel をシステムに登録**

作成したPanelをLichtblickで使用できるようにする方法です。

**実際の参考例**:

- Panel登録: `packages/suite-base/src/panels/index.ts` (1行目〜)

```typescript
// packages/suite-base/src/panels/index.ts (Panel登録)
import TemperatureSensorPanel from "./TemperatureSensorPanel";
import RobotVisualizationPanel from "./RobotVisualizationPanel";
import DataStatisticsPanel from "./DataStatisticsPanel";

// 既存のPanel登録
export { default as Plot } from "./Plot";
export { default as ThreeDeeRender } from "./ThreeDeeRender";
export { default as Image } from "./Image";
// ... 他のPanel

// 新しいPanel登録
export { default as TemperatureSensor } from "./TemperatureSensorPanel";
export { default as RobotVisualization } from "./RobotVisualizationPanel";
export { default as DataStatistics } from "./DataStatisticsPanel";
```

### **Panel情報の設定**

**実際の参考例**:

- Panel情報: `packages/suite-base/src/panels/builtin.ts` (1行目〜)

```typescript
// packages/suite-base/src/panels/builtin.ts (Panel情報設定)
import { PanelInfo } from "@foxglove/studio-base/types/panels";

export const builtinPanels: PanelInfo[] = [
  // 既存のPanel
  {
    title: "Plot",
    type: "Plot",
    description: "Display time-series data",
    config: {},
    defaultConfig: {
      paths: [],
      xAxisVal: "timestamp",
      yAxisVal: "value",
      showLegend: true,
    },
  },

  // 新しいPanel
  {
    title: "Temperature Sensor",
    type: "TemperatureSensor",
    description: "Display temperature sensor data with statistics",
    config: {},
    defaultConfig: {
      topic: "/sensors/temperature",
      showHumidity: true,
      temperatureUnit: "celsius",
      maxHistorySize: 100,
    },
  },

  {
    title: "Robot Visualization",
    type: "RobotVisualization",
    description: "3D visualization of robot pose and sensor data",
    config: {},
    defaultConfig: {
      robotTopic: "/robot/pose",
      lidarTopic: "/scan",
      showTrail: true,
      trailLength: 50,
      robotColor: "#ff0000",
      lidarColor: "#00ff00",
      backgroundColor: "#f0f0f0",
      showGrid: true,
      gridSize: 20,
      cameraMode: "follow",
    },
  },

  {
    title: "Data Statistics",
    type: "DataStatistics",
    description: "Real-time statistical analysis of message data",
    config: {},
    defaultConfig: {
      paths: [],
      updateInterval: 1000,
      historySize: 1000,
      showDetailedStats: true,
      autoRefresh: true,
    },
  },
];
```

## 📚 学習完了！

これで Lichtblick プロジェクトの専門用語解説ガイドが完了しました。

### 📈 次のステップ

1. **実際のコード実装**: 上記の例を参考に、独自のPanelを作成してみてください
2. **既存コードの学習**: `packages/suite-base/src/panels/` 内の既存Panelを読んで理解を深める
3. **コミュニティ参加**: Lichtblick のコミュニティに参加して、疑問点を解決
4. **継続的な学習**: プロジェクトの更新を追って、新しい機能を学習

---

**🎉 お疲れ様でした！**

この7つの章を通じて、Lichtblickプロジェクトの基本的な概念から実践的な開発まで学習できました。実際の開発では、このガイドを参考にしながら、プロジェクトの実際のコードを確認することが重要です。

**💡 重要なポイント**

- **段階的な学習**: 基本概念から実践へ順序立てて学習
- **実際のコード確認**: ドキュメントだけでなく、実際のコードを必ず読む
- **継続的な練習**: 学んだ概念を実際のコードで試す
- **コミュニティ活用**: 困った時はコミュニティに相談

頑張ってください！
