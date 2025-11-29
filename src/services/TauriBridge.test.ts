import { describe, it, expect, vi, beforeEach } from "vitest";

// Tauri APIのモック
vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readDir: vi.fn(),
  mkdir: vi.fn(),
  exists: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

import { TauriBridge } from "./TauriBridge";
import * as fs from "@tauri-apps/plugin-fs";
import * as dialog from "@tauri-apps/plugin-dialog";

describe("TauriBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("showOpenDialog", () => {
    it("ファイル選択ダイアログを開き、選択したファイルパスを返す", async () => {
      const mockPath = "/path/to/file.mcap";
      vi.mocked(dialog.open).mockResolvedValue(mockPath);

      const result = await TauriBridge.showOpenDialog({
        multiple: false,
        filters: [{ name: "MCAP", extensions: ["mcap"] }],
      });

      expect(dialog.open).toHaveBeenCalledWith({
        multiple: false,
        directory: false,
        filters: [{ name: "MCAP", extensions: ["mcap"] }],
        defaultPath: undefined,
        title: undefined,
      });
      expect(result).toEqual([mockPath]);
    });

    it("複数ファイル選択時は配列を返す", async () => {
      const mockPaths = ["/path/to/file1.mcap", "/path/to/file2.mcap"];
      vi.mocked(dialog.open).mockResolvedValue(mockPaths);

      const result = await TauriBridge.showOpenDialog({ multiple: true });

      expect(result).toEqual(mockPaths);
    });

    it("キャンセル時はnullを返す", async () => {
      vi.mocked(dialog.open).mockResolvedValue(null);

      const result = await TauriBridge.showOpenDialog({});

      expect(result).toBeNull();
    });
  });

  describe("showSaveDialog", () => {
    it("保存ダイアログを開き、保存先パスを返す", async () => {
      const mockPath = "/path/to/save.txt";
      vi.mocked(dialog.save).mockResolvedValue(mockPath);

      const result = await TauriBridge.showSaveDialog({
        filters: [{ name: "Text", extensions: ["txt"] }],
        title: "Save File",
      });

      expect(dialog.save).toHaveBeenCalledWith({
        filters: [{ name: "Text", extensions: ["txt"] }],
        defaultPath: undefined,
        title: "Save File",
      });
      expect(result).toBe(mockPath);
    });

    it("キャンセル時はnullを返す", async () => {
      vi.mocked(dialog.save).mockResolvedValue(null);

      const result = await TauriBridge.showSaveDialog({});

      expect(result).toBeNull();
    });
  });

  describe("readFile", () => {
    it("ファイルをバイナリで読み込む", async () => {
      const mockData = new Uint8Array([0x89, 0x4d, 0x43, 0x41, 0x50]); // MCAP magic bytes
      vi.mocked(fs.readFile).mockResolvedValue(mockData);

      const result = await TauriBridge.readFile("/path/to/file.mcap");

      expect(fs.readFile).toHaveBeenCalledWith("/path/to/file.mcap");
      expect(result).toEqual(mockData);
    });
  });

  describe("readTextFile", () => {
    it("ファイルをテキストで読み込む", async () => {
      const mockContent = "Hello, World!";
      const mockBytes = new TextEncoder().encode(mockContent);
      vi.mocked(fs.readFile).mockResolvedValue(mockBytes);

      const result = await TauriBridge.readTextFile("/path/to/file.txt");

      expect(result).toBe(mockContent);
    });
  });

  describe("writeFile", () => {
    it("バイナリデータをファイルに書き込む", async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      await TauriBridge.writeFile("/path/to/file.bin", data);

      expect(fs.writeFile).toHaveBeenCalledWith("/path/to/file.bin", data);
    });
  });

  describe("writeTextFile", () => {
    it("テキストをファイルに書き込む", async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      const text = "Hello, World!";
      const expectedBytes = new TextEncoder().encode(text);

      await TauriBridge.writeTextFile("/path/to/file.txt", text);

      expect(fs.writeFile).toHaveBeenCalled();
      const callArgs = vi.mocked(fs.writeFile).mock.calls[0];
      expect(callArgs?.[0]).toBe("/path/to/file.txt");
      expect(callArgs?.[1]).toEqual(expectedBytes);
    });
  });

  describe("readDirectory", () => {
    it("ディレクトリの内容を読み込む", async () => {
      const mockEntries = [
        {
          name: "file1.txt",
          isDirectory: false,
          isFile: true,
          isSymlink: false,
        },
        { name: "subdir", isDirectory: true, isFile: false, isSymlink: false },
      ];
      vi.mocked(fs.readDir).mockResolvedValue(mockEntries);

      const result = await TauriBridge.readDirectory("/path/to/dir");

      expect(fs.readDir).toHaveBeenCalledWith("/path/to/dir");
      expect(result).toEqual([
        {
          name: "file1.txt",
          isDirectory: false,
          isFile: true,
          path: "/path/to/dir/file1.txt",
        },
        {
          name: "subdir",
          isDirectory: true,
          isFile: false,
          path: "/path/to/dir/subdir",
        },
      ]);
    });
  });

  describe("createDirectory", () => {
    it("ディレクトリを作成する", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await TauriBridge.createDirectory("/path/to/new/dir");

      expect(fs.mkdir).toHaveBeenCalledWith("/path/to/new/dir", {
        recursive: true,
      });
    });
  });

  describe("exists", () => {
    it("ファイルが存在する場合trueを返す", async () => {
      vi.mocked(fs.exists).mockResolvedValue(true);

      const result = await TauriBridge.exists("/path/to/file.txt");

      expect(result).toBe(true);
    });

    it("ファイルが存在しない場合falseを返す", async () => {
      vi.mocked(fs.exists).mockResolvedValue(false);

      const result = await TauriBridge.exists("/path/to/nonexistent.txt");

      expect(result).toBe(false);
    });
  });

  describe("getFileInfo", () => {
    it("ファイル情報を取得する", async () => {
      const mockStat = {
        size: 1024,
        isDirectory: false,
        isFile: true,
        isSymlink: false,
        readonly: false,
        mtime: new Date("2024-01-01T00:00:00Z"),
        atime: new Date("2024-01-01T00:00:00Z"),
        birthtime: new Date("2024-01-01T00:00:00Z"),
        fileAttributes: 0,
        dev: 0,
        ino: 0,
        mode: 0,
        nlink: 0,
        uid: 0,
        gid: 0,
        rdev: 0,
        blksize: 0,
        blocks: 0,
        ctime: new Date("2024-01-01T00:00:00Z"),
      };
      vi.mocked(fs.stat).mockResolvedValue(mockStat);

      const result = await TauriBridge.getFileInfo("/path/to/file.txt");

      expect(fs.stat).toHaveBeenCalledWith("/path/to/file.txt");
      expect(result).toEqual({
        size: 1024,
        isDirectory: false,
        isFile: true,
        isSymlink: false,
        readonly: false,
        lastModified: new Date("2024-01-01T00:00:00Z").getTime(),
      });
    });
  });

  describe("openMcapFile", () => {
    it("MCAPファイルを選択して読み込む", async () => {
      const mockPath = "/path/to/recording.mcap";
      const mockData = new Uint8Array([0x89, 0x4d, 0x43, 0x41, 0x50]);

      vi.mocked(dialog.open).mockResolvedValue(mockPath);
      vi.mocked(fs.readFile).mockResolvedValue(mockData);

      const result = await TauriBridge.openMcapFile();

      expect(dialog.open).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: [
            { name: "MCAP Files", extensions: ["mcap"] },
            { name: "All Files", extensions: ["*"] },
          ],
        })
      );
      expect(result).toEqual({
        path: mockPath,
        data: mockData,
      });
    });

    it("キャンセル時はnullを返す", async () => {
      vi.mocked(dialog.open).mockResolvedValue(null);

      const result = await TauriBridge.openMcapFile();

      expect(result).toBeNull();
    });
  });
});
