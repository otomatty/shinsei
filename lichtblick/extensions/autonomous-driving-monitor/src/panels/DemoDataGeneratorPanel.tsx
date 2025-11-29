import { PanelExtensionContext } from "@lichtblick/suite";
import { ReactElement } from "react";
import { createRoot } from "react-dom/client";

function DemoDataGeneratorPanel(): ReactElement {
  return (
    <div
      style={{
        padding: "2rem",
        backgroundColor: "#1a1a1a",
        color: "#ffffff",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2 style={{ marginBottom: "2rem" }}>Demo Data Generator</h2>

      <div
        style={{
          backgroundColor: "#2a2a2a",
          padding: "2rem",
          borderRadius: "10px",
          textAlign: "center",
          maxWidth: "600px",
        }}
      >
        <p style={{ marginBottom: "2rem", fontSize: "18px" }}>
          To test the autonomous driving monitor panels, you need to provide data on the following
          topics:
        </p>

        <div style={{ textAlign: "left" }}>
          <h3>Required Topics:</h3>
          <ul style={{ listStyleType: "none", padding: 0 }}>
            <li style={{ marginBottom: "1rem" }}>
              <code
                style={{
                  backgroundColor: "#333",
                  padding: "0.5rem",
                  borderRadius: "3px",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                /vehicle/status
              </code>
              <p style={{ marginLeft: "1rem", color: "#aaa" }}>
                Vehicle telemetry data including speed, RPM, battery, gear, turn signals, and
                warnings
              </p>
            </li>
            <li style={{ marginBottom: "1rem" }}>
              <code
                style={{
                  backgroundColor: "#333",
                  padding: "0.5rem",
                  borderRadius: "3px",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                /perception/traffic_lights
              </code>
              <p style={{ marginLeft: "1rem", color: "#aaa" }}>
                Traffic light detection with state, confidence, distance, and position
              </p>
            </li>
            <li style={{ marginBottom: "1rem" }}>
              <code
                style={{
                  backgroundColor: "#333",
                  padding: "0.5rem",
                  borderRadius: "3px",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                /perception/obstacles
              </code>
              <p style={{ marginLeft: "1rem", color: "#aaa" }}>
                Obstacle detection including type, position, velocity, dimensions, and confidence
              </p>
            </li>
          </ul>
        </div>

        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            backgroundColor: "#1a1a1a",
            borderRadius: "5px",
          }}
        >
          <h4>Testing Options:</h4>
          <ol style={{ textAlign: "left", paddingLeft: "1.5rem" }}>
            <li>Use a ROS bag file with the required topics</li>
            <li>Connect to a live ROS system</li>
            <li>Use Lichtblick's built-in data generation features</li>
            <li>Create a custom data source</li>
          </ol>
        </div>

        <div style={{ marginTop: "2rem", fontSize: "14px", color: "#888" }}>
          <p>Example message structures are defined in src/types.ts</p>
        </div>
      </div>
    </div>
  );
}

export function initDemoDataGeneratorPanel(context: PanelExtensionContext): () => void {
  const root = createRoot(context.panelElement);
  root.render(<DemoDataGeneratorPanel />);

  return () => {
    root.unmount();
  };
}
