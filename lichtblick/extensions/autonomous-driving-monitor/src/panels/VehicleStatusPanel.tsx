import { Immutable, PanelExtensionContext, Topic } from "@lichtblick/suite";
import { ReactElement, useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { VehicleStatus } from "../types";

function VehicleStatusPanel({ context }: { context: PanelExtensionContext }): ReactElement {
  const [, setTopics] = useState<undefined | Immutable<Topic[]>>();
  const [vehicleStatus, setVehicleStatus] = useState<VehicleStatus>({
    speed: 0,
    rpm: 0,
    battery: 100,
    gear: "P",
    turnSignal: "off",
    warnings: {
      engine: false,
      battery: false,
      temperature: false,
    },
    timestamp: Date.now(),
  });
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      setTopics(renderState.topics);

      // メッセージから車両状態を抽出
      if (renderState.currentFrame) {
        for (const message of renderState.currentFrame) {
          if (message.topic === "/vehicle/status") {
            const status = message.message as VehicleStatus;
            setVehicleStatus(status);
          }
        }
      }
    };

    context.watch("topics");
    context.watch("currentFrame");
    context.subscribe([{ topic: "/vehicle/status" }]);
  }, [context]);

  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  // スピードメーターの角度計算
  const speedAngle = (vehicleStatus.speed / 200) * 270 - 135;
  const rpmAngle = (vehicleStatus.rpm / 8000) * 270 - 135;

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
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Vehicle Status Monitor</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", flex: 1 }}>
        {/* スピードメーター */}
        <div style={{ textAlign: "center" }}>
          <h3>Speed (km/h)</h3>
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#333" strokeWidth="10" />
            <path
              d={`M 100,100 L ${100 + 70 * Math.cos(((speedAngle - 90) * Math.PI) / 180)},${100 + 70 * Math.sin(((speedAngle - 90) * Math.PI) / 180)}`}
              stroke="#00ff00"
              strokeWidth="4"
            />
            <text x="100" y="120" textAnchor="middle" fill="white" fontSize="24">
              {vehicleStatus.speed.toFixed(0)}
            </text>
          </svg>
        </div>

        {/* RPMメーター */}
        <div style={{ textAlign: "center" }}>
          <h3>RPM</h3>
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#333" strokeWidth="10" />
            <path
              d={`M 100,100 L ${100 + 70 * Math.cos(((rpmAngle - 90) * Math.PI) / 180)},${100 + 70 * Math.sin(((rpmAngle - 90) * Math.PI) / 180)}`}
              stroke="#ff9900"
              strokeWidth="4"
            />
            <text x="100" y="120" textAnchor="middle" fill="white" fontSize="24">
              {vehicleStatus.rpm.toFixed(0)}
            </text>
          </svg>
        </div>

        {/* バッテリー状態 */}
        <div>
          <h3>Battery</h3>
          <div
            style={{
              backgroundColor: "#333",
              height: "30px",
              borderRadius: "5px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${vehicleStatus.battery}%`,
                height: "100%",
                backgroundColor: vehicleStatus.battery > 20 ? "#00ff00" : "#ff0000",
                transition: "width 0.3s",
              }}
            />
          </div>
          <p>{vehicleStatus.battery}%</p>
        </div>

        {/* ギア表示 */}
        <div>
          <h3>Gear</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            {["P", "R", "N", "D", "S"].map((gear) => (
              <div
                key={gear}
                style={{
                  padding: "10px 15px",
                  backgroundColor: vehicleStatus.gear === gear ? "#00ff00" : "#333",
                  borderRadius: "5px",
                  fontWeight: "bold",
                }}
              >
                {gear}
              </div>
            ))}
          </div>
        </div>

        {/* ウィンカー */}
        <div>
          <h3>Turn Signal</h3>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: vehicleStatus.turnSignal === "left" ? "#ff9900" : "#333",
                clipPath: "polygon(0 50%, 40% 0, 40% 30%, 100% 30%, 100% 70%, 40% 70%, 40% 100%)",
              }}
            />
            <div
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: vehicleStatus.turnSignal === "hazard" ? "#ff9900" : "#333",
                borderRadius: "5px",
              }}
            >
              ⚠
            </div>
            <div
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: vehicleStatus.turnSignal === "right" ? "#ff9900" : "#333",
                clipPath: "polygon(100% 50%, 60% 0, 60% 30%, 0 30%, 0 70%, 60% 70%, 60% 100%)",
              }}
            />
          </div>
        </div>

        {/* 警告灯 */}
        <div>
          <h3>Warnings</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <div
              style={{
                padding: "5px 10px",
                backgroundColor: vehicleStatus.warnings.engine ? "#ff0000" : "#333",
                borderRadius: "3px",
              }}
            >
              Engine
            </div>
            <div
              style={{
                padding: "5px 10px",
                backgroundColor: vehicleStatus.warnings.battery ? "#ff0000" : "#333",
                borderRadius: "3px",
              }}
            >
              Battery
            </div>
            <div
              style={{
                padding: "5px 10px",
                backgroundColor: vehicleStatus.warnings.temperature ? "#ff0000" : "#333",
                borderRadius: "3px",
              }}
            >
              Temp
            </div>
          </div>
        </div>
      </div>

      {/* トピック情報 */}
      <div style={{ marginTop: "1rem", fontSize: "12px", color: "#666" }}>
        <p>Subscribed to: /vehicle/status</p>
        <p>Last update: {new Date(vehicleStatus.timestamp).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

export function initVehicleStatusPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<VehicleStatusPanel context={context} />);

  return () => {
    root.unmount();
  };
}
