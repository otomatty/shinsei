// TauriBridge: Tauri APIをラップしてElectron風のインターフェースを提供
import {
  readFile,
  writeFile,
  readDir,
  mkdir,
  exists,
  stat,
} from "@tauri-apps/plugin-fs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { join } from "path-browserify";

// ファイルフィルターの型定義
export interface FileFilter {
  name: string;
  extensions: string[];
}

// ファイル選択ダイアログのオプション
export interface OpenDialogOptions {
  multiple?: boolean;
  directory?: boolean;
  filters?: FileFilter[];
  defaultPath?: string;
  title?: string;
}

// ファイル保存ダイアログのオプション
export interface SaveDialogOptions {
  filters?: FileFilter[];
  defaultPath?: string;
  title?: string;
}

// ディレクトリエントリの型定義
export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  path: string;
}

// ファイル情報の型定義
export interface FileInfo {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
  readonly?: boolean;
  lastModified?: number;
}

/**
 * TauriBridge - TauriのファイルシステムAPIをラップするサービス
 */
export const TauriBridge = {
  /**
   * ファイル選択ダイアログを表示
   */
  async showOpenDialog(
    options: OpenDialogOptions = {}
  ): Promise<string[] | null> {
    const result = await open({
      multiple: options.multiple ?? false,
      directory: options.directory ?? false,
      filters: options.filters,
      defaultPath: options.defaultPath,
      title: options.title,
    });

    if (result === null) {
      return null;
    }

    // 単一ファイル選択の場合は配列に変換
    if (typeof result === "string") {
      return [result];
    }

    return result;
  },

  /**
   * ファイル保存ダイアログを表示
   */
  async showSaveDialog(
    options: SaveDialogOptions = {}
  ): Promise<string | null> {
    return await save({
      filters: options.filters,
      defaultPath: options.defaultPath,
      title: options.title,
    });
  },

  /**
   * ファイルをバイナリとして読み込む
   */
  async readFile(path: string): Promise<Uint8Array> {
    return await readFile(path);
  },

  /**
   * ファイルをテキストとして読み込む
   */
  async readTextFile(path: string): Promise<string> {
    const bytes = await readFile(path);
    return new TextDecoder().decode(bytes);
  },

  /**
   * バイナリデータをファイルに書き込む
   */
  async writeFile(path: string, data: Uint8Array): Promise<void> {
    await writeFile(path, data);
  },

  /**
   * テキストをファイルに書き込む
   */
  async writeTextFile(path: string, content: string): Promise<void> {
    const bytes = new TextEncoder().encode(content);
    await writeFile(path, bytes);
  },

  /**
   * ディレクトリの内容を読み込む
   */
  async readDirectory(path: string): Promise<DirectoryEntry[]> {
    const entries = await readDir(path);
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory,
      isFile: entry.isFile,
      path: join(path, entry.name),
    }));
  },

  /**
   * ディレクトリを作成（再帰的）
   */
  async createDirectory(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  },

  /**
   * ファイルまたはディレクトリが存在するか確認
   */
  async exists(path: string): Promise<boolean> {
    return await exists(path);
  },

  /**
   * ファイル情報を取得
   */
  async getFileInfo(path: string): Promise<FileInfo> {
    const info = await stat(path);
    return {
      size: info.size,
      isDirectory: info.isDirectory,
      isFile: info.isFile,
      isSymlink: info.isSymlink,
      readonly: info.readonly,
      lastModified:
        info.mtime && !isNaN(new Date(info.mtime).getTime())
          ? new Date(info.mtime).getTime()
          : undefined,
    };
  },

  /**
   * MCAPファイルを開くためのヘルパー
   */
  async openMcapFile(): Promise<{ path: string; data: Uint8Array } | null> {
    const paths = await this.showOpenDialog({
      multiple: false,
      filters: [
        { name: "MCAP Files", extensions: ["mcap"] },
        { name: "All Files", extensions: ["*"] },
      ],
      title: "Open MCAP File",
    });

    if (!paths || paths.length === 0) {
      return null;
    }

    const path = paths[0];
    const data = await this.readFile(path);
    return { path, data };
  },
};
