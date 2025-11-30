import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TauriDataSourceFactory,
  createTauriDataSourceFactories,
} from "./TauriDataSourceFactory";
import type {
  DataSourceFactoryInitializeArgs,
  IDataSourceFactory,
} from "@lichtblick/suite-base/context/PlayerSelectionContext";
import type { Player } from "@lichtblick/suite-base/players/types";

// モックメトリクスコレクターを作成するヘルパー
function createMockMetricsCollector() {
  return {
    playerConstructed: vi.fn(),
    play: vi.fn(),
    seek: vi.fn(),
    setSpeed: vi.fn(),
    pause: vi.fn(),
    close: vi.fn(),
    setSubscriptions: vi.fn(),
    setProperty: vi.fn(),
    recordBytesReceived: vi.fn(),
    recordPlaybackTime: vi.fn(),
    recordDataProviderPerformance: vi.fn(),
    recordTimeToFirstMsgs: vi.fn(),
    recordDataProviderInitializePerformance: vi.fn(),
    recordDataProviderStall: vi.fn(),
    recordUncachedRangeRequest: vi.fn(),
  };
}

// モックFileを作成するヘルパー
function createMockFile(name: string): File {
  return new File(["content"], name, { type: "application/octet-stream" });
}

describe("TauriDataSourceFactory", () => {
  let factory: TauriDataSourceFactory;

  beforeEach(() => {
    factory = new TauriDataSourceFactory();
  });

  describe("プロパティ", () => {
    it("idが正しく設定されている", () => {
      expect(factory.id).toBe("tauri-mcap-local-file");
    });

    it("typeがfileである", () => {
      expect(factory.type).toBe("file");
    });

    it("displayNameが設定されている", () => {
      expect(factory.displayName).toBe("MCAP (Tauri)");
    });

    it("iconNameが設定されている", () => {
      expect(factory.iconName).toBe("OpenFile");
    });

    it("supportedFileTypesにmcapが含まれる", () => {
      expect(factory.supportedFileTypes).toContain(".mcap");
    });

    it("supportsMultiFileがtrueである", () => {
      expect(factory.supportsMultiFile).toBe(true);
    });
  });

  describe("initialize", () => {
    it("ファイルなしでundefinedを返す", () => {
      const args: DataSourceFactoryInitializeArgs = {
        metricsCollector: createMockMetricsCollector(),
      };

      const result = factory.initialize(args);
      expect(result).toBeUndefined();
    });

    it("空のfilesでundefinedを返す", () => {
      const args: DataSourceFactoryInitializeArgs = {
        metricsCollector: createMockMetricsCollector(),
        files: [],
      };

      const result = factory.initialize(args);
      expect(result).toBeUndefined();
    });

    it("playerFactoryが未設定の場合、ファイルがあってもundefinedを返す", () => {
      const args: DataSourceFactoryInitializeArgs = {
        metricsCollector: createMockMetricsCollector(),
        file: createMockFile("test.mcap"),
      };

      const result = factory.initialize(args);
      expect(result).toBeUndefined();
    });
  });

  describe("setPlayerFactory", () => {
    it("playerFactoryを設定できる", () => {
      const mockPlayer = { name: "MockPlayer" } as unknown as Player;
      const playerFactory = vi.fn().mockReturnValue(mockPlayer);

      factory.setPlayerFactory(playerFactory);

      const args: DataSourceFactoryInitializeArgs = {
        metricsCollector: createMockMetricsCollector(),
        file: createMockFile("test.mcap"),
      };

      const result = factory.initialize(args);

      expect(playerFactory).toHaveBeenCalled();
      expect(result).toBe(mockPlayer);
    });

    it("playerFactoryにファイルが渡される", () => {
      const mockPlayer = { name: "MockPlayer" } as unknown as Player;
      const playerFactory = vi.fn().mockReturnValue(mockPlayer);

      factory.setPlayerFactory(playerFactory);

      const testFile = createMockFile("test.mcap");
      const args: DataSourceFactoryInitializeArgs = {
        metricsCollector: createMockMetricsCollector(),
        file: testFile,
      };

      factory.initialize(args);

      expect(playerFactory).toHaveBeenCalledWith(
        [testFile],
        expect.objectContaining({ metricsCollector: expect.any(Object) })
      );
    });

    it("複数ファイルをまとめて渡す", () => {
      const mockPlayer = { name: "MockPlayer" } as unknown as Player;
      const playerFactory = vi.fn().mockReturnValue(mockPlayer);

      factory.setPlayerFactory(playerFactory);

      const file1 = createMockFile("test1.mcap");
      const file2 = createMockFile("test2.mcap");
      const args: DataSourceFactoryInitializeArgs = {
        metricsCollector: createMockMetricsCollector(),
        files: [file1, file2],
      };

      factory.initialize(args);

      expect(playerFactory).toHaveBeenCalledWith(
        [file1, file2],
        expect.any(Object)
      );
    });

    it("単一ファイルとfilesを両方指定した場合、すべてを結合する", () => {
      const mockPlayer = { name: "MockPlayer" } as unknown as Player;
      const playerFactory = vi.fn().mockReturnValue(mockPlayer);

      factory.setPlayerFactory(playerFactory);

      const singleFile = createMockFile("single.mcap");
      const file1 = createMockFile("test1.mcap");
      const file2 = createMockFile("test2.mcap");
      const args: DataSourceFactoryInitializeArgs = {
        metricsCollector: createMockMetricsCollector(),
        file: singleFile,
        files: [file1, file2],
      };

      factory.initialize(args);

      expect(playerFactory).toHaveBeenCalledWith(
        [singleFile, file1, file2],
        expect.any(Object)
      );
    });
  });

  describe("IDataSourceFactoryインターフェース準拠", () => {
    it("必須プロパティをすべて持つ", () => {
      expect(factory.id).toBeDefined();
      expect(factory.type).toBeDefined();
      expect(factory.displayName).toBeDefined();
      expect(typeof factory.initialize).toBe("function");
    });

    it("オプションプロパティを持つ", () => {
      expect(factory.iconName).toBeDefined();
      expect(factory.supportedFileTypes).toBeDefined();
      expect(factory.supportsMultiFile).toBeDefined();
    });

    it("setPlayerFactoryメソッドを持つ", () => {
      expect(typeof factory.setPlayerFactory).toBe("function");
    });
  });
});

describe("createTauriDataSourceFactories", () => {
  it("データソースファクトリーの配列を返す", () => {
    const factories = createTauriDataSourceFactories();

    expect(Array.isArray(factories)).toBe(true);
    expect(factories.length).toBeGreaterThan(0);
  });

  it("TauriDataSourceFactoryを含む", () => {
    const factories = createTauriDataSourceFactories();

    const tauriFactory = factories.find(
      (f: IDataSourceFactory) => f.id === "tauri-mcap-local-file"
    );
    expect(tauriFactory).toBeDefined();
  });

  it("各ファクトリーがIDataSourceFactoryインターフェースを満たす", () => {
    const factories = createTauriDataSourceFactories();

    for (const factory of factories) {
      expect(factory.id).toBeDefined();
      expect(factory.type).toBeDefined();
      expect(factory.displayName).toBeDefined();
      expect(typeof factory.initialize).toBe("function");
    }
  });
});
