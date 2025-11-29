import { Immutable, PanelExtensionContext, Topic } from "@lichtblick/suite";
import { ReactElement, useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { TrafficLight, TrafficLightArray } from "../types";

function TrafficLightPanel({ context }: { context: PanelExtensionContext }): ReactElement {
  const [, setTopics] = useState<undefined | Immutable<Topic[]>>();
  const [trafficLights, setTrafficLights] = useState<TrafficLight[]>([]);
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      setTopics(renderState.topics);

      // メッセージから信号機データを抽出
      if (renderState.currentFrame) {
        for (const message of renderState.currentFrame) {
          if (message.topic === "/perception/traffic_lights") {
            const data = message.message as TrafficLightArray;
            setTrafficLights(data.lights || []);
          }
        }
      }
    };

    context.watch("topics");
    context.watch("currentFrame");
    context.subscribe([{ topic: "/perception/traffic_lights" }]);
  }, [context]);

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  // 信号の色を取得
  const getSignalColor = (state: string) => {
    switch (state) {
      case "red":
        return "#ff0000";
      case "yellow":
        return "#ffff00";
      case "green":
        return "#00ff00";
      default:
        return "#333333";
    }
  };

  // 矢印の描画
  const getArrowPath = (state: string) => {
    switch (state) {
      case "arrow_left":
        return "M 25,50 L 45,30 L 45,40 L 75,40 L 75,60 L 45,60 L 45,70 Z";
      case "arrow_right":
        return "M 75,50 L 55,30 L 55,40 L 25,40 L 25,60 L 55,60 L 55,70 Z";
      case "arrow_straight":
        return "M 50,25 L 30,45 L 40,45 L 40,75 L 60,75 L 60,45 L 70,45 Z";
      default:
        return "";
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
        overflow: "auto",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Traffic Light Recognition</h2>

      {trafficLights.length === 0 ? (
        <div style={{ textAlign: "center", color: "#666" }}>
          <p>No traffic lights detected</p>
          <p>Waiting for data on /perception/traffic_lights</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
          }}
        >
          {trafficLights.map((light) => (
            <div
              key={light.id}
              style={{
                backgroundColor: "#2a2a2a",
                borderRadius: "10px",
                padding: "1rem",
                border: "2px solid #444",
              }}
            >
              {/* 信号機の視覚表現 */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                <svg width="100" height="200" viewBox="0 0 100 200">
                  {/* 信号機の枠 */}
                  <rect x="10" y="10" width="80" height="180" rx="10" fill="#333" />

                  {/* 赤信号 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="25"
                    fill={light.state === "red" ? "#ff0000" : "#330000"}
                    filter={light.state === "red" ? "url(#glow)" : ""}
                  />

                  {/* 黄信号 */}
                  <circle
                    cx="50"
                    cy="100"
                    r="25"
                    fill={light.state === "yellow" ? "#ffff00" : "#333300"}
                    filter={light.state === "yellow" ? "url(#glow)" : ""}
                  />

                  {/* 青信号 */}
                  <circle
                    cx="50"
                    cy="150"
                    r="25"
                    fill={light.state === "green" ? "#00ff00" : "#003300"}
                    filter={light.state === "green" ? "url(#glow)" : ""}
                  />

                  {/* 矢印信号 */}
                  {light.state.startsWith("arrow_") && (
                    <g transform="translate(0, 100)">
                      <path d={getArrowPath(light.state)} fill="#00ff00" filter="url(#glow)" />
                    </g>
                  )}

                  {/* グロー効果 */}
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                </svg>
              </div>

              {/* 信号情報 */}
              <div style={{ fontSize: "14px" }}>
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>ID:</strong> {light.id}
                </div>

                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>State:</strong>
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      color: getSignalColor(light.state),
                      fontWeight: "bold",
                    }}
                  >
                    {light.state.toUpperCase()}
                  </span>
                </div>

                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>Distance:</strong> {light.distance.toFixed(1)}m
                </div>

                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>Confidence:</strong>
                  <div
                    style={{
                      backgroundColor: "#333",
                      height: "10px",
                      borderRadius: "5px",
                      overflow: "hidden",
                      marginTop: "0.25rem",
                    }}
                  >
                    <div
                      style={{
                        width: `${light.confidence * 100}%`,
                        height: "100%",
                        backgroundColor:
                          light.confidence > 0.8
                            ? "#00ff00"
                            : light.confidence > 0.5
                              ? "#ffff00"
                              : "#ff0000",
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "12px" }}>{(light.confidence * 100).toFixed(0)}%</span>
                </div>

                {light.timeRemaining !== undefined && (
                  <div
                    style={{
                      marginBottom: "0.5rem",
                      fontSize: "18px",
                      fontWeight: "bold",
                      textAlign: "center",
                      color: light.timeRemaining < 5 ? "#ff9900" : "#ffffff",
                    }}
                  >
                    {light.timeRemaining}s
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* トピック情報 */}
      <div style={{ marginTop: "auto", paddingTop: "1rem", fontSize: "12px", color: "#666" }}>
        <p>Subscribed to: /perception/traffic_lights</p>
        <p>Detected lights: {trafficLights.length}</p>
      </div>
    </div>
  );
}

export function initTrafficLightPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<TrafficLightPanel context={context} />);

  return () => {
    root.unmount();
  };
}
