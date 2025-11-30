// IPCテスト用コンポーネント
// Issue #5: IPC通信置換の動作確認用
import { useState, useEffect, useCallback } from "react";
import { AppBridge, DesktopBridge, StorageBridge } from "../services";
import type { AppInfo, OsInfo } from "../services";

interface TestResult {
  test: string;
  status: "pending" | "success" | "error";
  message: string;
  data?: unknown;
}

/**
 * IPCBridgeTest - IPC通信の動作確認用コンポーネント
 *
 * 以下の機能をテスト:
 * - AppBridge: アプリ情報取得
 * - DesktopBridge: パス取得
 * - StorageBridge: データ保存/読み込み
 */
export function IPCBridgeTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [osInfo, setOsInfo] = useState<OsInfo | null>(null);

  // 結果を追加
  const addResult = useCallback((result: TestResult) => {
    setResults((prev) => [...prev, result]);
  }, []);

  // 結果を更新
  const updateResult = useCallback(
    (
      testName: string,
      status: TestResult["status"],
      message: string,
      data?: unknown
    ) => {
      setResults((prev) =>
        prev.map((r) =>
          r.test === testName ? { ...r, status, message, data } : r
        )
      );
    },
    []
  );

  // テストを実行
  const runTests = useCallback(async () => {
    setIsRunning(true);
    setResults([]);

    // 1. アプリ情報取得テスト
    addResult({
      test: "get_app_info",
      status: "pending",
      message: "テスト中...",
    });
    try {
      const info = await AppBridge.getAppInfo();
      setAppInfo(info);
      updateResult(
        "get_app_info",
        "success",
        `${info.name} v${info.version} (${info.platform}/${info.arch})`,
        info
      );
    } catch (error) {
      updateResult(
        "get_app_info",
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }

    // 2. OS情報取得テスト
    addResult({
      test: "get_os_info",
      status: "pending",
      message: "テスト中...",
    });
    try {
      const info = await AppBridge.getOsInfo();
      setOsInfo(info);
      updateResult(
        "get_os_info",
        "success",
        `${info.hostname} (PID: ${info.pid})`,
        info
      );
    } catch (error) {
      updateResult(
        "get_os_info",
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }

    // 3. ホームディレクトリ取得テスト
    addResult({
      test: "get_home_path",
      status: "pending",
      message: "テスト中...",
    });
    try {
      const homePath = await DesktopBridge.getHomePath();
      updateResult("get_home_path", "success", homePath);
    } catch (error) {
      updateResult(
        "get_home_path",
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }

    // 4. ユーザーデータパス取得テスト
    addResult({
      test: "get_user_data_path",
      status: "pending",
      message: "テスト中...",
    });
    try {
      const userDataPath = await DesktopBridge.getUserDataPath();
      updateResult("get_user_data_path", "success", userDataPath);
    } catch (error) {
      updateResult(
        "get_user_data_path",
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }

    // 5. ストレージ書き込みテスト
    addResult({
      test: "storage_put",
      status: "pending",
      message: "テスト中...",
    });
    const testData = { message: "Hello from IPC test!", timestamp: Date.now() };
    try {
      await StorageBridge.putJson("test-store", "test-key", testData);
      updateResult("storage_put", "success", "データを保存しました", testData);
    } catch (error) {
      updateResult(
        "storage_put",
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }

    // 6. ストレージ読み込みテスト
    addResult({
      test: "storage_get",
      status: "pending",
      message: "テスト中...",
    });
    try {
      const loadedData = await StorageBridge.getJson<typeof testData>(
        "test-store",
        "test-key"
      );
      if (loadedData && loadedData.message === testData.message) {
        updateResult(
          "storage_get",
          "success",
          "データを読み込みました",
          loadedData
        );
      } else {
        updateResult("storage_get", "error", "データが一致しません");
      }
    } catch (error) {
      updateResult(
        "storage_get",
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }

    // 7. ストレージ一覧テスト
    addResult({
      test: "storage_list",
      status: "pending",
      message: "テスト中...",
    });
    try {
      const keys = await StorageBridge.list("test-store");
      updateResult(
        "storage_list",
        "success",
        `${keys.length}件のキー: ${keys.join(", ")}`,
        keys
      );
    } catch (error) {
      updateResult(
        "storage_list",
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }

    // 8. ストレージ存在確認テスト
    addResult({
      test: "storage_exists",
      status: "pending",
      message: "テスト中...",
    });
    try {
      const exists = await StorageBridge.exists("test-store", "test-key");
      updateResult("storage_exists", "success", `存在: ${exists}`);
    } catch (error) {
      updateResult(
        "storage_exists",
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }

    // 9. ストレージ削除テスト
    addResult({
      test: "storage_delete",
      status: "pending",
      message: "テスト中...",
    });
    try {
      await StorageBridge.delete("test-store", "test-key");
      const existsAfterDelete = await StorageBridge.exists(
        "test-store",
        "test-key"
      );
      if (!existsAfterDelete) {
        updateResult("storage_delete", "success", "データを削除しました");
      } else {
        updateResult("storage_delete", "error", "削除後もデータが存在します");
      }
    } catch (error) {
      updateResult(
        "storage_delete",
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }

    // 10. 環境変数取得テスト
    addResult({
      test: "get_env_var",
      status: "pending",
      message: "テスト中...",
    });
    try {
      const homeEnv = await AppBridge.getEnvVar("HOME");
      updateResult("get_env_var", "success", `HOME=${homeEnv ?? "(not set)"}`);
    } catch (error) {
      updateResult(
        "get_env_var",
        "error",
        error instanceof Error ? error.message : String(error)
      );
    }

    setIsRunning(false);
  }, [addResult, updateResult]);

  // 初回マウント時にテストを自動実行しない（手動実行のみ）
  useEffect(() => {
    // 自動実行なし
  }, []);

  // ステータスバッジのスタイル
  const getStatusStyle = (status: TestResult["status"]) => {
    const baseStyle = {
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "bold" as const,
    };
    switch (status) {
      case "success":
        return { ...baseStyle, backgroundColor: "#4caf50", color: "white" };
      case "error":
        return { ...baseStyle, backgroundColor: "#f44336", color: "white" };
      case "pending":
        return { ...baseStyle, backgroundColor: "#ff9800", color: "white" };
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <h2>🔌 IPC通信テスト (Issue #5)</h2>
      <p style={{ color: "#666" }}>
        Electron IPC → Tauri Commands の置換動作確認
      </p>

      <button
        onClick={runTests}
        disabled={isRunning}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: isRunning ? "#ccc" : "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: isRunning ? "not-allowed" : "pointer",
          marginBottom: "20px",
        }}
      >
        {isRunning ? "テスト実行中..." : "テストを実行"}
      </button>

      {/* アプリ情報サマリー */}
      {appInfo && (
        <div
          style={{
            backgroundColor: "#f5f5f5",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0" }}>📱 アプリケーション情報</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "5px 10px", fontWeight: "bold" }}>
                  名前
                </td>
                <td style={{ padding: "5px 10px" }}>{appInfo.name}</td>
              </tr>
              <tr>
                <td style={{ padding: "5px 10px", fontWeight: "bold" }}>
                  バージョン
                </td>
                <td style={{ padding: "5px 10px" }}>{appInfo.version}</td>
              </tr>
              <tr>
                <td style={{ padding: "5px 10px", fontWeight: "bold" }}>
                  プラットフォーム
                </td>
                <td style={{ padding: "5px 10px" }}>{appInfo.platform}</td>
              </tr>
              <tr>
                <td style={{ padding: "5px 10px", fontWeight: "bold" }}>
                  アーキテクチャ
                </td>
                <td style={{ padding: "5px 10px" }}>{appInfo.arch}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* OS情報サマリー */}
      {osInfo && (
        <div
          style={{
            backgroundColor: "#e3f2fd",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0" }}>💻 OS情報</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "5px 10px", fontWeight: "bold" }}>
                  ホスト名
                </td>
                <td style={{ padding: "5px 10px" }}>{osInfo.hostname}</td>
              </tr>
              <tr>
                <td style={{ padding: "5px 10px", fontWeight: "bold" }}>PID</td>
                <td style={{ padding: "5px 10px" }}>{osInfo.pid}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* テスト結果 */}
      <h3>テスト結果</h3>
      {results.length === 0 ? (
        <p style={{ color: "#999" }}>
          「テストを実行」ボタンをクリックしてください
        </p>
      ) : (
        <div>
          {results.map((result, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px",
                borderBottom: "1px solid #eee",
                gap: "10px",
              }}
            >
              <span style={getStatusStyle(result.status)}>
                {result.status === "success"
                  ? "✓"
                  : result.status === "error"
                    ? "✗"
                    : "..."}
              </span>
              <span style={{ fontWeight: "bold", minWidth: "180px" }}>
                {result.test}
              </span>
              <span style={{ color: "#666", flex: 1 }}>{result.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 成功/失敗サマリー */}
      {results.length > 0 && !isRunning && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: results.every((r) => r.status === "success")
              ? "#e8f5e9"
              : "#ffebee",
            borderRadius: "8px",
          }}
        >
          <strong>
            {results.filter((r) => r.status === "success").length} /{" "}
            {results.length} テスト成功
          </strong>
        </div>
      )}
    </div>
  );
}

export default IPCBridgeTest;
