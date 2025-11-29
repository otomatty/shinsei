import { Immutable, PanelExtensionContext, Topic } from "@lichtblick/suite";
import { ReactElement, useEffect, useLayoutEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";

import { Obstacle, ObstacleArray } from "../types";

function ObstacleDetectionPanel({ context }: { context: PanelExtensionContext }): ReactElement {
  const [, setTopics] = useState<undefined | Immutable<Topic[]>>();
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();
  const [viewRange, setViewRange] = useState(30); // meters
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      setTopics(renderState.topics);

      // メッセージから障害物データを抽出
      if (renderState.currentFrame) {
        for (const message of renderState.currentFrame) {
          if (message.topic === "/perception/obstacles") {
            const data = message.message as ObstacleArray;
            setObstacles(data.obstacles || []);
          }
        }
      }
    };

    context.watch("topics");
    context.watch("currentFrame");
    context.subscribe([{ topic: "/perception/obstacles" }]);
  }, [context]);

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  // Canvas描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas設定
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height * 0.8; // 車両位置を下側に配置
    const scale = Math.min(width, height) / (viewRange * 2);

    // 背景をクリア
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    // グリッド描画
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    for (let r = 10; r <= viewRange; r += 10) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 距離ラベル
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    for (let r = 10; r <= viewRange; r += 10) {
      ctx.fillText(`${r}m`, centerX + r * scale, centerY + 15);
    }

    // 車両（自車）を描画
    ctx.fillStyle = "#0088ff";
    ctx.fillRect(centerX - 15, centerY - 20, 30, 40);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("EGO", centerX, centerY + 5);

    // 障害物を描画
    obstacles.forEach((obstacle) => {
      const x = centerX + obstacle.position.x * scale;
      const y = centerY - obstacle.position.y * scale;

      // 障害物の色（タイプ別）
      let color = "#ff0000";
      switch (obstacle.type) {
        case "car":
          color = "#ff6600";
          break;
        case "pedestrian":
          color = "#ffff00";
          break;
        case "bicycle":
          color = "#00ff00";
          break;
        case "truck":
          color = "#ff0066";
          break;
        default:
          color = "#999999";
      }

      // 障害物を描画
      ctx.save();
      ctx.translate(x, y);

      // 物体の形状
      ctx.fillStyle = color;
      if (obstacle.type === "pedestrian") {
        // 歩行者は円で表現
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 車両は矩形で表現
        const width = obstacle.dimensions.width * scale;
        const length = obstacle.dimensions.length * scale;
        ctx.fillRect(-width / 2, -length / 2, width, length);
      }

      // 速度ベクトル
      if (obstacle.velocity.x !== 0 || obstacle.velocity.y !== 0) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(obstacle.velocity.x * scale * 2, -obstacle.velocity.y * scale * 2);
        ctx.stroke();

        // 矢印の先端
        const angle = Math.atan2(-obstacle.velocity.y, obstacle.velocity.x);
        const arrowLength = 5;
        ctx.beginPath();
        ctx.moveTo(obstacle.velocity.x * scale * 2, -obstacle.velocity.y * scale * 2);
        ctx.lineTo(
          obstacle.velocity.x * scale * 2 - arrowLength * Math.cos(angle - Math.PI / 6),
          -obstacle.velocity.y * scale * 2 - arrowLength * Math.sin(angle - Math.PI / 6),
        );
        ctx.moveTo(obstacle.velocity.x * scale * 2, -obstacle.velocity.y * scale * 2);
        ctx.lineTo(
          obstacle.velocity.x * scale * 2 - arrowLength * Math.cos(angle + Math.PI / 6),
          -obstacle.velocity.y * scale * 2 - arrowLength * Math.sin(angle + Math.PI / 6),
        );
        ctx.stroke();
      }

      // ID表示
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(obstacle.id, 0, -10);

      // TTC（衝突までの時間）警告
      if (obstacle.ttc !== undefined && obstacle.ttc < 3) {
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#ff0000";
        ctx.font = "bold 12px Arial";
        ctx.fillText(`${obstacle.ttc.toFixed(1)}s`, 0, 25);
      }

      ctx.restore();
    });
  }, [obstacles, viewRange]);

  // 障害物タイプの色を取得
  const getObstacleColor = (type: string) => {
    switch (type) {
      case "car":
        return "#ff6600";
      case "pedestrian":
        return "#ffff00";
      case "bicycle":
        return "#00ff00";
      case "truck":
        return "#ff0066";
      default:
        return "#999999";
    }
  };

  return (
    <div
      style={{
        padding: "1rem",
        backgroundColor: "#1a1a1a",
        color: "#ffffff",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Obstacle Detection Visualizer</h2>

      {/* コントロール */}
      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <label>View Range: </label>
          <select
            value={viewRange}
            onChange={(e) => setViewRange(Number(e.target.value))}
            style={{
              backgroundColor: "#333",
              color: "#fff",
              border: "1px solid #666",
              padding: "5px",
              borderRadius: "3px",
            }}
          >
            <option value={10}>10m</option>
            <option value={30}>30m</option>
            <option value={50}>50m</option>
            <option value={100}>100m</option>
          </select>
        </div>

        <div style={{ fontSize: "14px" }}>Detected: {obstacles.length} obstacles</div>
      </div>

      {/* メインビジュアライゼーション */}
      <div style={{ flex: 1, display: "flex", gap: "1rem" }}>
        {/* 2Dマップ */}
        <div style={{ flex: 2 }}>
          <canvas
            ref={canvasRef}
            width={600}
            height={600}
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#0a0a0a",
              border: "1px solid #333",
            }}
          />
        </div>

        {/* 障害物リスト */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            backgroundColor: "#2a2a2a",
            borderRadius: "5px",
            padding: "1rem",
          }}
        >
          <h3 style={{ marginBottom: "1rem" }}>Obstacle List</h3>
          {obstacles.length === 0 ? (
            <p style={{ color: "#666" }}>No obstacles detected</p>
          ) : (
            <div style={{ fontSize: "12px" }}>
              {obstacles.map((obstacle) => (
                <div
                  key={obstacle.id}
                  style={{
                    marginBottom: "0.75rem",
                    padding: "0.5rem",
                    backgroundColor: "#1a1a1a",
                    borderRadius: "3px",
                    borderLeft: `3px solid ${getObstacleColor(obstacle.type)}`,
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
                    {obstacle.type.toUpperCase()} - {obstacle.id}
                  </div>
                  <div>
                    Pos: ({obstacle.position.x.toFixed(1)}, {obstacle.position.y.toFixed(1)})
                  </div>
                  <div>
                    Vel: {Math.sqrt(obstacle.velocity.x ** 2 + obstacle.velocity.y ** 2).toFixed(1)}{" "}
                    m/s
                  </div>
                  {obstacle.ttc !== undefined && (
                    <div style={{ color: obstacle.ttc < 3 ? "#ff0000" : "#ffff00" }}>
                      TTC: {obstacle.ttc.toFixed(1)}s
                    </div>
                  )}
                  <div>Conf: {(obstacle.confidence * 100).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 凡例 */}
      <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", fontSize: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "20px", height: "10px", backgroundColor: "#ff6600" }}></div>
          <span>Car</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "20px", height: "10px", backgroundColor: "#ffff00" }}></div>
          <span>Pedestrian</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "20px", height: "10px", backgroundColor: "#00ff00" }}></div>
          <span>Bicycle</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "20px", height: "10px", backgroundColor: "#ff0066" }}></div>
          <span>Truck</span>
        </div>
      </div>

      {/* トピック情報 */}
      <div style={{ marginTop: "0.5rem", fontSize: "12px", color: "#666" }}>
        <p>Subscribed to: /perception/obstacles</p>
      </div>
    </div>
  );
}

export function initObstacleDetectionPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<ObstacleDetectionPanel context={context} />);

  return () => {
    root.unmount();
  };
}
