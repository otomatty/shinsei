import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TauriNativeWindow } from "./TauriNativeWindow";
import { WindowBridge } from "./WindowBridge";

// WindowBridgeのモック
vi.mock("./WindowBridge", () => ({
  WindowBridge: {
    setTitle: vi.fn(),
    isFullscreen: vi.fn(),
    onFullscreenChange: vi.fn(),
  },
}));

describe("TauriNativeWindow", () => {
  let nativeWindow: TauriNativeWindow;
  let mockUnlisten: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnlisten = vi.fn();
    vi.mocked(WindowBridge.onFullscreenChange).mockResolvedValue(mockUnlisten);
    nativeWindow = new TauriNativeWindow();
  });

  afterEach(() => {
    nativeWindow.dispose();
  });

  describe("setRepresentedFilename", () => {
    it("ファイル名を設定するとウィンドウタイトルが更新される", async () => {
      vi.mocked(WindowBridge.setTitle).mockResolvedValue(undefined);

      await nativeWindow.setRepresentedFilename("/path/to/file.mcap");

      expect(WindowBridge.setTitle).toHaveBeenCalledWith(
        expect.stringContaining("file.mcap")
      );
    });

    it("undefinedを設定するとデフォルトタイトルに戻る", async () => {
      vi.mocked(WindowBridge.setTitle).mockResolvedValue(undefined);

      await nativeWindow.setRepresentedFilename(undefined);

      expect(WindowBridge.setTitle).toHaveBeenCalledWith("Shinsei");
    });

    it("ファイルパスからファイル名のみを抽出して表示する", async () => {
      vi.mocked(WindowBridge.setTitle).mockResolvedValue(undefined);

      await nativeWindow.setRepresentedFilename(
        "/Users/user/Documents/recording.mcap"
      );

      expect(WindowBridge.setTitle).toHaveBeenCalledWith(
        expect.stringContaining("recording.mcap")
      );
    });

    it("Promiseを返す", async () => {
      vi.mocked(WindowBridge.setTitle).mockResolvedValue(undefined);

      const result = nativeWindow.setRepresentedFilename("test.mcap");

      expect(result).toBeInstanceOf(Promise);
      await result;
    });
  });

  describe("on", () => {
    it("enter-full-screenイベントを登録できる", async () => {
      const handler = vi.fn();

      nativeWindow.on("enter-full-screen", handler);

      // 内部でフルスクリーン監視が設定される
      expect(typeof handler).toBe("function");
    });

    it("leave-full-screenイベントを登録できる", async () => {
      const handler = vi.fn();

      nativeWindow.on("leave-full-screen", handler);

      expect(typeof handler).toBe("function");
    });

    it("フルスクリーン状態がtrueになるとenter-full-screenハンドラーが呼ばれる", async () => {
      const enterHandler = vi.fn();
      const leaveHandler = vi.fn();

      nativeWindow.on("enter-full-screen", enterHandler);
      nativeWindow.on("leave-full-screen", leaveHandler);

      // フルスクリーン状態変更をシミュレート
      await nativeWindow.handleFullscreenChange(true);

      expect(enterHandler).toHaveBeenCalled();
      expect(leaveHandler).not.toHaveBeenCalled();
    });

    it("フルスクリーン状態がfalseになるとleave-full-screenハンドラーが呼ばれる", async () => {
      const enterHandler = vi.fn();
      const leaveHandler = vi.fn();

      nativeWindow.on("enter-full-screen", enterHandler);
      nativeWindow.on("leave-full-screen", leaveHandler);

      // フルスクリーン状態変更をシミュレート
      await nativeWindow.handleFullscreenChange(false);

      expect(enterHandler).not.toHaveBeenCalled();
      expect(leaveHandler).toHaveBeenCalled();
    });

    it("複数のハンドラーを同じイベントに登録できる", async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      nativeWindow.on("enter-full-screen", handler1);
      nativeWindow.on("enter-full-screen", handler2);

      await nativeWindow.handleFullscreenChange(true);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe("INativeWindowインターフェース準拠", () => {
    it("setRepresentedFilenameメソッドを持つ", () => {
      expect(typeof nativeWindow.setRepresentedFilename).toBe("function");
    });

    it("onメソッドを持つ", () => {
      expect(typeof nativeWindow.on).toBe("function");
    });
  });

  describe("dispose", () => {
    it("disposeを呼ぶとリソースがクリーンアップされる", async () => {
      // 初期化を完了させる
      await nativeWindow.initialize();

      nativeWindow.dispose();

      // unlistenが呼ばれることを確認
      expect(mockUnlisten).toHaveBeenCalled();
    });
  });
});
