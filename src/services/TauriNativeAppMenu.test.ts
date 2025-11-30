import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TauriNativeAppMenu } from "./TauriNativeAppMenu";
import { MenuBridge } from "./MenuBridge";
import type { NativeAppMenuEvent } from "@lichtblick/suite-base/context/NativeAppMenuContext";

// MenuBridgeのモック
vi.mock("./MenuBridge", () => ({
  MenuBridge: {
    onMenuEvent: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

describe("TauriNativeAppMenu", () => {
  let nativeAppMenu: TauriNativeAppMenu;
  let mockUnlisten: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnlisten = vi.fn();
    vi.mocked(MenuBridge.onMenuEvent).mockResolvedValue(mockUnlisten);
    nativeAppMenu = new TauriNativeAppMenu();
  });

  afterEach(() => {
    nativeAppMenu.dispose();
  });

  describe("on", () => {
    it("open-fileイベントを登録できる", () => {
      const handler = vi.fn();

      const unregister = nativeAppMenu.on("open-file", handler);

      expect(unregister).toBeDefined();
      expect(typeof unregister).toBe("function");
    });

    it("open-connectionイベントを登録できる", () => {
      const handler = vi.fn();

      const unregister = nativeAppMenu.on("open-connection", handler);

      expect(unregister).toBeDefined();
    });

    it("open-demoイベントを登録できる", () => {
      const handler = vi.fn();

      const unregister = nativeAppMenu.on("open-demo", handler);

      expect(unregister).toBeDefined();
    });

    it("open-help-aboutイベントを登録できる", () => {
      const handler = vi.fn();

      const unregister = nativeAppMenu.on("open-help-about", handler);

      expect(unregister).toBeDefined();
    });

    it("open-help-docsイベントを登録できる", () => {
      const handler = vi.fn();

      const unregister = nativeAppMenu.on("open-help-docs", handler);

      expect(unregister).toBeDefined();
    });

    it("open-help-generalイベントを登録できる", () => {
      const handler = vi.fn();

      const unregister = nativeAppMenu.on("open-help-general", handler);

      expect(unregister).toBeDefined();
    });

    it("openイベントを登録できる", () => {
      const handler = vi.fn();

      const unregister = nativeAppMenu.on("open", handler);

      expect(unregister).toBeDefined();
    });

    it("unregister関数を呼ぶとハンドラーが削除される", () => {
      const handler = vi.fn();
      const unregister = nativeAppMenu.on("open-file", handler);

      // 削除前
      nativeAppMenu.triggerEvent("open-file");
      expect(handler).toHaveBeenCalledTimes(1);

      // unregisterを呼ぶ
      unregister?.();

      // 削除後
      nativeAppMenu.triggerEvent("open-file");
      expect(handler).toHaveBeenCalledTimes(1); // 増えていない
    });

    it("複数のハンドラーを同じイベントに登録できる", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      nativeAppMenu.on("open-file", handler1);
      nativeAppMenu.on("open-file", handler2);

      nativeAppMenu.triggerEvent("open-file");

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it("異なるイベントに別々のハンドラーを登録できる", () => {
      const fileHandler = vi.fn();
      const aboutHandler = vi.fn();

      nativeAppMenu.on("open-file", fileHandler);
      nativeAppMenu.on("open-help-about", aboutHandler);

      nativeAppMenu.triggerEvent("open-file");
      expect(fileHandler).toHaveBeenCalled();
      expect(aboutHandler).not.toHaveBeenCalled();

      nativeAppMenu.triggerEvent("open-help-about");
      expect(aboutHandler).toHaveBeenCalled();
    });
  });

  describe("メニューイベントのマッピング", () => {
    it("MenuBridgeのopen_fileがopen-fileにマッピングされる", async () => {
      const handler = vi.fn();
      nativeAppMenu.on("open-file", handler);

      // MenuBridgeのイベントをシミュレート
      nativeAppMenu.handleMenuBridgeEvent("open_file");

      expect(handler).toHaveBeenCalled();
    });

    it("MenuBridgeのaboutがopen-help-aboutにマッピングされる", async () => {
      const handler = vi.fn();
      nativeAppMenu.on("open-help-about", handler);

      nativeAppMenu.handleMenuBridgeEvent("about");

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("INativeAppMenuインターフェース準拠", () => {
    it("onメソッドを持つ", () => {
      expect(typeof nativeAppMenu.on).toBe("function");
    });

    it("onメソッドがUnregisterFnまたはundefinedを返す", () => {
      const handler = vi.fn();
      const result = nativeAppMenu.on("open-file", handler);

      expect(result === undefined || typeof result === "function").toBe(true);
    });
  });

  describe("dispose", () => {
    it("disposeを呼ぶとリソースがクリーンアップされる", () => {
      const handler = vi.fn();
      nativeAppMenu.on("open-file", handler);

      nativeAppMenu.dispose();

      // disposeの後はイベントが発火しない
      nativeAppMenu.triggerEvent("open-file");
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
