import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AppConfigurationService } from "./AppConfigurationService";
import type { AppConfigurationValue } from "@lichtblick/suite-base/context/AppConfigurationContext";

describe("AppConfigurationService", () => {
  let service: AppConfigurationService;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    // LocalStorageのモック
    localStorageMock = {};
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(
      (key: string) => localStorageMock[key] ?? null
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(
      (key: string, value: string) => {
        localStorageMock[key] = value;
      }
    );
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(
      (key: string) => {
        delete localStorageMock[key];
      }
    );

    service = new AppConfigurationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("get", () => {
    it("未設定のキーに対してundefinedを返す", () => {
      const result = service.get("nonexistent");
      expect(result).toBeUndefined();
    });

    it("文字列値を正しく取得できる", async () => {
      await service.set("theme", "dark");
      const result = service.get("theme");
      expect(result).toBe("dark");
    });

    it("数値を正しく取得できる", async () => {
      await service.set("timeout", 5000);
      const result = service.get("timeout");
      expect(result).toBe(5000);
    });

    it("真偽値を正しく取得できる", async () => {
      await service.set("autoSave", true);
      const result = service.get("autoSave");
      expect(result).toBe(true);
    });

    it("LocalStorageから永続化された値を読み込む", () => {
      // LocalStorageに事前にデータを設定
      localStorageMock["app-config"] = JSON.stringify({ theme: "light" });

      // 新しいインスタンスを作成（コンストラクタでLocalStorageから読み込み）
      const newService = new AppConfigurationService();
      const result = newService.get("theme");
      expect(result).toBe("light");
    });
  });

  describe("set", () => {
    it("文字列値を設定できる", async () => {
      await service.set("theme", "dark");
      expect(service.get("theme")).toBe("dark");
    });

    it("数値を設定できる", async () => {
      await service.set("connectionTimeout", 3000);
      expect(service.get("connectionTimeout")).toBe(3000);
    });

    it("真偽値を設定できる", async () => {
      await service.set("enableDebugMode", false);
      expect(service.get("enableDebugMode")).toBe(false);
    });

    it("undefinedを設定して値を削除できる", async () => {
      await service.set("theme", "dark");
      expect(service.get("theme")).toBe("dark");

      await service.set("theme", undefined);
      expect(service.get("theme")).toBeUndefined();
    });

    it("LocalStorageに永続化される", async () => {
      await service.set("theme", "dark");

      expect(localStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock["app-config"] ?? "{}");
      expect(savedData.theme).toBe("dark");
    });

    it("Promiseを返す（非同期操作）", () => {
      const result = service.set("theme", "dark");
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("addChangeListener", () => {
    it("設定変更時にコールバックが呼ばれる", async () => {
      const callback = vi.fn();
      service.addChangeListener("theme", callback);

      await service.set("theme", "dark");

      expect(callback).toHaveBeenCalledWith("dark");
    });

    it("異なるキーの変更ではコールバックが呼ばれない", async () => {
      const callback = vi.fn();
      service.addChangeListener("theme", callback);

      await service.set("language", "ja");

      expect(callback).not.toHaveBeenCalled();
    });

    it("複数のリスナーを登録できる", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.addChangeListener("theme", callback1);
      service.addChangeListener("theme", callback2);

      await service.set("theme", "light");

      expect(callback1).toHaveBeenCalledWith("light");
      expect(callback2).toHaveBeenCalledWith("light");
    });

    it("同じキーに複数の異なるリスナーを登録できる", async () => {
      const themeCallback = vi.fn();
      const langCallback = vi.fn();

      service.addChangeListener("theme", themeCallback);
      service.addChangeListener("language", langCallback);

      await service.set("theme", "dark");
      await service.set("language", "en");

      expect(themeCallback).toHaveBeenCalledWith("dark");
      expect(langCallback).toHaveBeenCalledWith("en");
    });

    it("値がundefinedに変更されたときもコールバックが呼ばれる", async () => {
      const callback = vi.fn();
      await service.set("theme", "dark");
      service.addChangeListener("theme", callback);

      await service.set("theme", undefined);

      expect(callback).toHaveBeenCalledWith(undefined);
    });
  });

  describe("removeChangeListener", () => {
    it("リスナーを削除するとコールバックが呼ばれなくなる", async () => {
      const callback = vi.fn();
      service.addChangeListener("theme", callback);

      // 削除前
      await service.set("theme", "dark");
      expect(callback).toHaveBeenCalledTimes(1);

      // リスナー削除
      service.removeChangeListener("theme", callback);

      // 削除後
      await service.set("theme", "light");
      expect(callback).toHaveBeenCalledTimes(1); // 増えていない
    });

    it("存在しないリスナーの削除はエラーにならない", () => {
      const callback = vi.fn();
      // 登録せずに削除を試みる
      expect(() => {
        service.removeChangeListener("theme", callback);
      }).not.toThrow();
    });

    it("特定のリスナーのみ削除される", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.addChangeListener("theme", callback1);
      service.addChangeListener("theme", callback2);

      service.removeChangeListener("theme", callback1);

      await service.set("theme", "dark");

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith("dark");
    });
  });

  describe("デフォルト設定", () => {
    it("デフォルト設定を持つインスタンスを作成できる", () => {
      const defaults: Record<string, AppConfigurationValue> = {
        theme: "dark",
        language: "en",
        autoSave: true,
      };
      const serviceWithDefaults = new AppConfigurationService(defaults);

      expect(serviceWithDefaults.get("theme")).toBe("dark");
      expect(serviceWithDefaults.get("language")).toBe("en");
      expect(serviceWithDefaults.get("autoSave")).toBe(true);
    });

    it("LocalStorageの値がデフォルト値より優先される", () => {
      localStorageMock["app-config"] = JSON.stringify({ theme: "light" });

      const defaults: Record<string, AppConfigurationValue> = {
        theme: "dark",
      };
      const serviceWithDefaults = new AppConfigurationService(defaults);

      expect(serviceWithDefaults.get("theme")).toBe("light");
    });
  });

  describe("IAppConfigurationインターフェース準拠", () => {
    it("IAppConfigurationのすべてのメソッドを持つ", () => {
      expect(typeof service.get).toBe("function");
      expect(typeof service.set).toBe("function");
      expect(typeof service.addChangeListener).toBe("function");
      expect(typeof service.removeChangeListener).toBe("function");
    });
  });
});
