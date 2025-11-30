// WindowBridge動作テスト用コンポーネント
import { useState } from "react";
import { WindowBridge } from "../services/WindowBridge";

interface TestResult {
  test: string;
  status: "pending" | "success" | "error";
  message: string;
}

export function WindowBridgeTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [windowInfo, setWindowInfo] = useState<{
    size: { width: number; height: number } | null;
    position: { x: number; y: number } | null;
    isFullscreen: boolean;
    isMaximized: boolean;
    isMinimized: boolean;
  }>({
    size: null,
    position: null,
    isFullscreen: false,
    isMaximized: false,
    isMinimized: false,
  });

  const addResult = (result: TestResult) => {
    setResults((prev) => [...prev, result]);
  };

  const updateResult = (
    test: string,
    status: TestResult["status"],
    message: string
  ) => {
    setResults((prev) =>
      prev.map((r) => (r.test === test ? { ...r, status, message } : r))
    );
  };

  const refreshWindowInfo = async () => {
    try {
      const [size, position, isFullscreen, isMaximized, isMinimized] =
        await Promise.all([
          WindowBridge.getSize(),
          WindowBridge.getPosition(),
          WindowBridge.isFullscreen(),
          WindowBridge.isMaximized(),
          WindowBridge.isMinimized(),
        ]);

      setWindowInfo({
        size,
        position,
        isFullscreen,
        isMaximized,
        isMinimized,
      });
    } catch (error) {
      console.error("Failed to refresh window info:", error);
    }
  };

  // テスト実行用ヘルパー関数（重複コード削減）
  const executeTest = async (
    name: string,
    testFn: () => Promise<string>
  ): Promise<void> => {
    addResult({ test: name, status: "pending", message: "テスト中..." });
    try {
      const message = await testFn();
      updateResult(name, "success", message);
    } catch (error) {
      updateResult(
        name,
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const runTests = async () => {
    setResults([]);
    setIsRunning(true);

    await executeTest("setTitle", async () => {
      await WindowBridge.setTitle("Lichtblick - Test Title");
      const title = WindowBridge.getTitle();
      return `タイトル設定成功: "${title}"`;
    });

    await executeTest("getSize", async () => {
      const size = await WindowBridge.getSize();
      return `現在のサイズ: ${size.width} x ${size.height}`;
    });

    await executeTest("getPosition", async () => {
      const position = await WindowBridge.getPosition();
      return `現在の位置: (${position.x}, ${position.y})`;
    });

    await executeTest("isFullscreen", async () => {
      const isFullscreen = await WindowBridge.isFullscreen();
      return `フルスクリーン状態: ${isFullscreen ? "ON" : "OFF"}`;
    });

    await executeTest("isMaximized", async () => {
      const isMaximized = await WindowBridge.isMaximized();
      return `最大化状態: ${isMaximized ? "ON" : "OFF"}`;
    });

    await refreshWindowInfo();
    setIsRunning(false);
  };

  const handleSetSize = async () => {
    try {
      await WindowBridge.setSize(1200, 800);
      await refreshWindowInfo();
    } catch (error) {
      console.error("Failed to set size:", error);
    }
  };

  const handleToggleFullscreen = async () => {
    try {
      await WindowBridge.toggleFullscreen();
      await refreshWindowInfo();
    } catch (error) {
      console.error("Failed to toggle fullscreen:", error);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await WindowBridge.toggleMaximize();
      await refreshWindowInfo();
    } catch (error) {
      console.error("Failed to toggle maximize:", error);
    }
  };

  const handleMinimize = async () => {
    try {
      await WindowBridge.minimize();
    } catch (error) {
      console.error("Failed to minimize:", error);
    }
  };

  const handleOpenExternal = async () => {
    try {
      await WindowBridge.openExternal(
        "https://github.com/lichtblick-suite/lichtblick"
      );
    } catch (error) {
      console.error("Failed to open external URL:", error);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>WindowBridge 動作テスト</h2>

      {/* ウィンドウ情報表示 */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#2d2d2d",
          borderRadius: "8px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>現在のウィンドウ情報</h3>
        <button
          onClick={refreshWindowInfo}
          style={{
            marginBottom: "10px",
            padding: "5px 10px",
            cursor: "pointer",
          }}
        >
          更新
        </button>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li>
            サイズ:{" "}
            {windowInfo.size
              ? `${windowInfo.size.width} x ${windowInfo.size.height}`
              : "未取得"}
          </li>
          <li>
            位置:{" "}
            {windowInfo.position
              ? `(${windowInfo.position.x}, ${windowInfo.position.y})`
              : "未取得"}
          </li>
          <li>フルスクリーン: {windowInfo.isFullscreen ? "ON" : "OFF"}</li>
          <li>最大化: {windowInfo.isMaximized ? "ON" : "OFF"}</li>
          <li>最小化: {windowInfo.isMinimized ? "ON" : "OFF"}</li>
        </ul>
      </div>

      {/* ウィンドウ操作ボタン */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleSetSize}
          style={{
            padding: "10px 15px",
            cursor: "pointer",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          サイズ変更 (1200x800)
        </button>
        <button
          onClick={handleToggleFullscreen}
          style={{
            padding: "10px 15px",
            cursor: "pointer",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          フルスクリーン切替
        </button>
        <button
          onClick={handleToggleMaximize}
          style={{
            padding: "10px 15px",
            cursor: "pointer",
            backgroundColor: "#FF9800",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          最大化切替
        </button>
        <button
          onClick={handleMinimize}
          style={{
            padding: "10px 15px",
            cursor: "pointer",
            backgroundColor: "#9C27B0",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          最小化
        </button>
        <button
          onClick={handleOpenExternal}
          style={{
            padding: "10px 15px",
            cursor: "pointer",
            backgroundColor: "#607D8B",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          外部リンクを開く
        </button>
      </div>

      {/* 自動テスト */}
      <button
        onClick={runTests}
        disabled={isRunning}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: isRunning ? "not-allowed" : "pointer",
          backgroundColor: isRunning ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          marginBottom: "20px",
        }}
      >
        {isRunning ? "テスト実行中..." : "自動テストを実行"}
      </button>

      <div>
        {results.map((result) => (
          <div
            key={result.test}
            style={{
              padding: "10px",
              margin: "5px 0",
              borderRadius: "4px",
              backgroundColor:
                result.status === "success"
                  ? "#d4edda"
                  : result.status === "error"
                    ? "#f8d7da"
                    : "#fff3cd",
              borderLeft: `4px solid ${
                result.status === "success"
                  ? "#28a745"
                  : result.status === "error"
                    ? "#dc3545"
                    : "#ffc107"
              }`,
              color: "#333",
            }}
          >
            <strong>{result.test}</strong>
            <span
              style={{
                marginLeft: "10px",
                padding: "2px 6px",
                borderRadius: "3px",
                fontSize: "12px",
                backgroundColor:
                  result.status === "success"
                    ? "#28a745"
                    : result.status === "error"
                      ? "#dc3545"
                      : "#ffc107",
                color: "white",
              }}
            >
              {result.status}
            </span>
            <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>
              {result.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
