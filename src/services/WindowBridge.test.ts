import { describe, it, expect, vi, beforeEach } from "vitest";

// Tauri Window APIのモック
vi.mock("@tauri-apps/api/window", () => {
  // モッククラスはファクトリ内で定義する必要がある（ホイスト対策）
  class MockLogicalSize {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
  }

  class MockLogicalPosition {
    x: number;
    y: number;
    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
  }

  return {
    getCurrentWindow: vi.fn(),
    LogicalSize: MockLogicalSize,
    LogicalPosition: MockLogicalPosition,
  };
});

// Tauri Shell Pluginのモック
vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(),
}));

import { WindowBridge } from "./WindowBridge";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-shell";

describe("WindowBridge", () => {
  // モックウィンドウオブジェクト
  const mockWindow = {
    setTitle: vi.fn(),
    setFullscreen: vi.fn(),
    isFullscreen: vi.fn(),
    setSize: vi.fn(),
    innerSize: vi.fn(),
    outerSize: vi.fn(),
    setPosition: vi.fn(),
    outerPosition: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    isMaximized: vi.fn(),
    isMinimized: vi.fn(),
    close: vi.fn(),
    toggleMaximize: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentWindow).mockReturnValue(mockWindow as any);
  });

  describe("setTitle", () => {
    it("ウィンドウタイトルを設定する", async () => {
      mockWindow.setTitle.mockResolvedValue(undefined);

      await WindowBridge.setTitle("Lichtblick");

      expect(mockWindow.setTitle).toHaveBeenCalledWith("Lichtblick");
    });
  });

  describe("getTitle", () => {
    it("現在のウィンドウタイトルを取得する", async () => {
      // タイトル取得はTauri APIでは直接サポートされていないため、
      // WindowBridgeで内部管理する必要がある
      await WindowBridge.setTitle("Test Title");
      const title = WindowBridge.getTitle();
      expect(title).toBe("Test Title");
    });
  });

  describe("setFullscreen", () => {
    it("フルスクリーンを有効にする", async () => {
      mockWindow.setFullscreen.mockResolvedValue(undefined);

      await WindowBridge.setFullscreen(true);

      expect(mockWindow.setFullscreen).toHaveBeenCalledWith(true);
    });

    it("フルスクリーンを無効にする", async () => {
      mockWindow.setFullscreen.mockResolvedValue(undefined);

      await WindowBridge.setFullscreen(false);

      expect(mockWindow.setFullscreen).toHaveBeenCalledWith(false);
    });
  });

  describe("toggleFullscreen", () => {
    it("フルスクリーン状態を切り替える（非フルスクリーン→フルスクリーン）", async () => {
      mockWindow.isFullscreen.mockResolvedValue(false);
      mockWindow.setFullscreen.mockResolvedValue(undefined);

      await WindowBridge.toggleFullscreen();

      expect(mockWindow.isFullscreen).toHaveBeenCalled();
      expect(mockWindow.setFullscreen).toHaveBeenCalledWith(true);
    });

    it("フルスクリーン状態を切り替える（フルスクリーン→非フルスクリーン）", async () => {
      mockWindow.isFullscreen.mockResolvedValue(true);
      mockWindow.setFullscreen.mockResolvedValue(undefined);

      await WindowBridge.toggleFullscreen();

      expect(mockWindow.isFullscreen).toHaveBeenCalled();
      expect(mockWindow.setFullscreen).toHaveBeenCalledWith(false);
    });
  });

  describe("isFullscreen", () => {
    it("フルスクリーン状態を取得する（true）", async () => {
      mockWindow.isFullscreen.mockResolvedValue(true);

      const result = await WindowBridge.isFullscreen();

      expect(result).toBe(true);
    });

    it("フルスクリーン状態を取得する（false）", async () => {
      mockWindow.isFullscreen.mockResolvedValue(false);

      const result = await WindowBridge.isFullscreen();

      expect(result).toBe(false);
    });
  });

  describe("setSize", () => {
    it("ウィンドウサイズを設定する", async () => {
      mockWindow.setSize.mockResolvedValue(undefined);

      await WindowBridge.setSize(1400, 900);

      expect(mockWindow.setSize).toHaveBeenCalled();
      // 引数の検証: LogicalSizeオブジェクトが正しく作成されていることを確認
      const callArg = mockWindow.setSize.mock.calls[0][0];
      expect(callArg.width).toBe(1400);
      expect(callArg.height).toBe(900);
    });
  });

  describe("getSize", () => {
    it("ウィンドウの内部サイズを取得する", async () => {
      mockWindow.innerSize.mockResolvedValue({ width: 1400, height: 900 });

      const result = await WindowBridge.getSize();

      expect(result).toEqual({ width: 1400, height: 900 });
    });
  });

  describe("setPosition", () => {
    it("ウィンドウ位置を設定する", async () => {
      mockWindow.setPosition.mockResolvedValue(undefined);

      await WindowBridge.setPosition(100, 200);

      expect(mockWindow.setPosition).toHaveBeenCalled();
      // 引数の検証: LogicalPositionオブジェクトが正しく作成されていることを確認
      const callArg = mockWindow.setPosition.mock.calls[0][0];
      expect(callArg.x).toBe(100);
      expect(callArg.y).toBe(200);
    });
  });

  describe("getPosition", () => {
    it("ウィンドウ位置を取得する", async () => {
      mockWindow.outerPosition.mockResolvedValue({ x: 100, y: 200 });

      const result = await WindowBridge.getPosition();

      expect(result).toEqual({ x: 100, y: 200 });
    });
  });

  describe("minimize", () => {
    it("ウィンドウを最小化する", async () => {
      mockWindow.minimize.mockResolvedValue(undefined);

      await WindowBridge.minimize();

      expect(mockWindow.minimize).toHaveBeenCalled();
    });
  });

  describe("maximize", () => {
    it("ウィンドウを最大化する", async () => {
      mockWindow.maximize.mockResolvedValue(undefined);

      await WindowBridge.maximize();

      expect(mockWindow.maximize).toHaveBeenCalled();
    });
  });

  describe("unmaximize", () => {
    it("ウィンドウの最大化を解除する", async () => {
      mockWindow.unmaximize.mockResolvedValue(undefined);

      await WindowBridge.unmaximize();

      expect(mockWindow.unmaximize).toHaveBeenCalled();
    });
  });

  describe("toggleMaximize", () => {
    it("最大化状態を切り替える（非最大化→最大化）", async () => {
      mockWindow.isMaximized.mockResolvedValue(false);
      mockWindow.maximize.mockResolvedValue(undefined);

      await WindowBridge.toggleMaximize();

      expect(mockWindow.isMaximized).toHaveBeenCalled();
      expect(mockWindow.maximize).toHaveBeenCalled();
    });

    it("最大化状態を切り替える（最大化→非最大化）", async () => {
      mockWindow.isMaximized.mockResolvedValue(true);
      mockWindow.unmaximize.mockResolvedValue(undefined);

      await WindowBridge.toggleMaximize();

      expect(mockWindow.isMaximized).toHaveBeenCalled();
      expect(mockWindow.unmaximize).toHaveBeenCalled();
    });
  });

  describe("isMaximized", () => {
    it("最大化状態を取得する", async () => {
      mockWindow.isMaximized.mockResolvedValue(true);

      const result = await WindowBridge.isMaximized();

      expect(result).toBe(true);
    });
  });

  describe("isMinimized", () => {
    it("最小化状態を取得する", async () => {
      mockWindow.isMinimized.mockResolvedValue(true);

      const result = await WindowBridge.isMinimized();

      expect(result).toBe(true);
    });
  });

  describe("close", () => {
    it("ウィンドウを閉じる", async () => {
      mockWindow.close.mockResolvedValue(undefined);

      await WindowBridge.close();

      expect(mockWindow.close).toHaveBeenCalled();
    });
  });

  describe("openExternal", () => {
    it("外部URLをデフォルトブラウザで開く", async () => {
      vi.mocked(open).mockResolvedValue(undefined);

      await WindowBridge.openExternal("https://example.com");

      expect(open).toHaveBeenCalledWith("https://example.com");
    });

    it("複数の外部URLを開く", async () => {
      vi.mocked(open).mockResolvedValue(undefined);

      await WindowBridge.openExternal("https://github.com");
      await WindowBridge.openExternal("https://google.com");

      expect(open).toHaveBeenCalledTimes(2);
      expect(open).toHaveBeenNthCalledWith(1, "https://github.com");
      expect(open).toHaveBeenNthCalledWith(2, "https://google.com");
    });
  });
});
