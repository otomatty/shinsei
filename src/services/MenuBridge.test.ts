import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MenuBridge, type MenuEventPayload } from "./MenuBridge";

// メニューイベントのモックリスナーを保存（複数対応）
let mockListeners: Array<(payload: MenuEventPayload) => void> = [];

// @tauri-apps/api/event のモック
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(
    (
      _eventName: string,
      handler: (event: { payload: MenuEventPayload }) => void
    ) => {
      const wrappedHandler = (payload: MenuEventPayload) => {
        handler({ payload });
      };
      mockListeners.push(wrappedHandler);

      const unlisten = vi.fn(() => {
        const index = mockListeners.indexOf(wrappedHandler);
        if (index > -1) {
          mockListeners.splice(index, 1);
        }
      });

      return Promise.resolve(unlisten);
    }
  ),
}));

// 全てのリスナーにイベントを送信するヘルパー関数
function emitMenuEvent(payload: MenuEventPayload) {
  for (const listener of [...mockListeners]) {
    listener(payload);
  }
}

describe("MenuBridge", () => {
  beforeEach(() => {
    mockListeners = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    // リスナーのクリーンアップ
    MenuBridge.removeAllListeners();
  });

  describe("onMenuEvent", () => {
    it("should register a menu event listener", async () => {
      const callback = vi.fn();
      await MenuBridge.onMenuEvent(callback);

      expect(mockListeners.length).toBeGreaterThan(0);
    });

    it("should call the callback when menu event is received", async () => {
      const callback = vi.fn();
      await MenuBridge.onMenuEvent(callback);

      // イベントをシミュレート
      emitMenuEvent("open_file");

      expect(callback).toHaveBeenCalledWith("open_file");
    });

    it("should handle multiple menu events", async () => {
      const callback = vi.fn();
      await MenuBridge.onMenuEvent(callback);

      emitMenuEvent("open_file");
      emitMenuEvent("save");
      emitMenuEvent("toggle_fullscreen");

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, "open_file");
      expect(callback).toHaveBeenNthCalledWith(2, "save");
      expect(callback).toHaveBeenNthCalledWith(3, "toggle_fullscreen");
    });

    it("should return an unlisten function", async () => {
      const callback = vi.fn();
      const unlisten = await MenuBridge.onMenuEvent(callback);

      expect(typeof unlisten).toBe("function");
    });
  });

  describe("onSpecificMenuEvent", () => {
    it("should register listener for specific menu action", async () => {
      const callback = vi.fn();
      await MenuBridge.onSpecificMenuEvent("open_file", callback);

      expect(mockListeners.length).toBeGreaterThan(0);
    });

    it("should only call callback for matching menu action", async () => {
      const openFileCallback = vi.fn();
      const saveCallback = vi.fn();

      await MenuBridge.onSpecificMenuEvent("open_file", openFileCallback);
      await MenuBridge.onSpecificMenuEvent("save", saveCallback);

      emitMenuEvent("open_file");

      expect(openFileCallback).toHaveBeenCalledTimes(1);
      expect(saveCallback).not.toHaveBeenCalled();
    });

    it("should not call callback for non-matching menu action", async () => {
      const callback = vi.fn();
      await MenuBridge.onSpecificMenuEvent("open_file", callback);

      emitMenuEvent("save");

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("removeAllListeners", () => {
    it("should remove all registered listeners", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      await MenuBridge.onMenuEvent(callback1);
      await MenuBridge.onSpecificMenuEvent("save", callback2);

      MenuBridge.removeAllListeners();

      // リスナーが削除されていることを確認
      expect(MenuBridge.getListenerCount()).toBe(0);
    });
  });

  describe("getListenerCount", () => {
    it("should return 0 when no listeners registered", () => {
      expect(MenuBridge.getListenerCount()).toBe(0);
    });

    it("should return correct count after registering listeners", async () => {
      await MenuBridge.onMenuEvent(vi.fn());
      expect(MenuBridge.getListenerCount()).toBe(1);

      await MenuBridge.onSpecificMenuEvent("save", vi.fn());
      expect(MenuBridge.getListenerCount()).toBe(2);
    });

    it("should return correct count after removing listeners", async () => {
      const unlisten1 = await MenuBridge.onMenuEvent(vi.fn());
      await MenuBridge.onSpecificMenuEvent("save", vi.fn());

      expect(MenuBridge.getListenerCount()).toBe(2);

      unlisten1();
      expect(MenuBridge.getListenerCount()).toBe(1);
    });
  });

  describe("Menu event types", () => {
    const menuEvents: MenuEventPayload[] = [
      "open_file",
      "open_folder",
      "save",
      "save_as",
      "toggle_fullscreen",
      "zoom_in",
      "zoom_out",
      "reset_zoom",
      "about",
    ];

    menuEvents.forEach((event) => {
      it(`should handle "${event}" menu event`, async () => {
        const callback = vi.fn();
        await MenuBridge.onSpecificMenuEvent(event, callback);

        emitMenuEvent(event);

        expect(callback).toHaveBeenCalledTimes(1);
      });
    });
  });
});
