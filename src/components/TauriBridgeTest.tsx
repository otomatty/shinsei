// TauriBridge動作テスト用コンポーネント
import { useState } from "react";
import { TauriBridge } from "../services/TauriBridge";

interface TestResult {
  test: string;
  status: "pending" | "success" | "error";
  message: string;
}

export function TauriBridgeTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

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

  const runTests = async () => {
    setResults([]);
    setIsRunning(true);

    // Test 1: ファイル選択ダイアログ
    addResult({
      test: "showOpenDialog",
      status: "pending",
      message: "テスト中...",
    });
    try {
      const paths = await TauriBridge.showOpenDialog({
        multiple: false,
        filters: [{ name: "All Files", extensions: ["*"] }],
        title: "Test: Select a file",
      });
      updateResult(
        "showOpenDialog",
        "success",
        paths
          ? `選択されたファイル: ${paths.join(", ")}`
          : "キャンセルされました"
      );
    } catch (error) {
      updateResult("showOpenDialog", "error", String(error));
    }

    // Test 2: ファイル読み込み（ダイアログで選択したファイル）
    addResult({ test: "readFile", status: "pending", message: "テスト中..." });
    try {
      const result = await TauriBridge.showOpenDialog({
        multiple: false,
        title: "Test: Select a text file to read",
      });
      if (result && result.length > 0) {
        const content = await TauriBridge.readTextFile(result[0]);
        updateResult(
          "readFile",
          "success",
          `ファイル読み込み成功: ${content.length} 文字`
        );
      } else {
        updateResult(
          "readFile",
          "success",
          "ファイル選択がキャンセルされました"
        );
      }
    } catch (error) {
      updateResult("readFile", "error", String(error));
    }

    // Test 3: ファイル保存ダイアログ
    addResult({
      test: "showSaveDialog",
      status: "pending",
      message: "テスト中...",
    });
    try {
      const path = await TauriBridge.showSaveDialog({
        title: "Test: Save dialog",
        filters: [{ name: "Text Files", extensions: ["txt"] }],
      });
      updateResult(
        "showSaveDialog",
        "success",
        path ? `保存先: ${path}` : "キャンセルされました"
      );
    } catch (error) {
      updateResult("showSaveDialog", "error", String(error));
    }

    // Test 4: MCAPファイルを開く
    addResult({
      test: "openMcapFile",
      status: "pending",
      message: "テスト中...",
    });
    try {
      const result = await TauriBridge.openMcapFile();
      if (result) {
        updateResult(
          "openMcapFile",
          "success",
          `MCAPファイル読み込み成功: ${result.path} (${result.data.length} bytes)`
        );
      } else {
        updateResult(
          "openMcapFile",
          "success",
          "ファイル選択がキャンセルされました"
        );
      }
    } catch (error) {
      updateResult("openMcapFile", "error", String(error));
    }

    setIsRunning(false);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>TauriBridge 動作テスト</h2>
      <p>
        各テストではダイアログが表示されます。テストを進めるにはファイルを選択してください。
      </p>

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
        {isRunning ? "テスト実行中..." : "テストを実行"}
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

export default TauriBridgeTest;
