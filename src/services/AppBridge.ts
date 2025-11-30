// AppBridge: アプリケーション情報を取得するTauriブリッジ
import { invoke } from "@tauri-apps/api/core";

/**
 * アプリケーション情報
 */
export interface AppInfo {
  /** アプリケーションバージョン */
  version: string;
  /** アプリケーション名 */
  name: string;
  /** プラットフォーム（macos, windows, linux） */
  platform: string;
  /** アーキテクチャ（x86_64, aarch64等） */
  arch: string;
}

/**
 * 詳細なバージョン情報
 */
export interface VersionInfo {
  /** セマンティックバージョン */
  version: string;
  /** Tauriバージョン */
  tauriVersion: string;
  /** Rustバージョン */
  rustVersion: string;
}

/**
 * OS情報（OsContext相当）
 */
export interface OsInfo {
  /** プラットフォーム */
  platform: string;
  /** アーキテクチャ */
  arch: string;
  /** ホスト名 */
  hostname: string;
  /** プロセスID */
  pid: number;
}

/**
 * AppBridge - アプリケーション情報を取得するサービス
 *
 * lichtblickのOsContext相当の機能を提供
 */
export const AppBridge = {
  /**
   * アプリケーション情報を取得
   */
  async getAppInfo(): Promise<AppInfo> {
    return await invoke<AppInfo>("get_app_info");
  },

  /**
   * 詳細なバージョン情報を取得
   */
  async getVersionInfo(): Promise<VersionInfo> {
    const info = await invoke<{
      version: string;
      tauri_version: string;
      rust_version: string;
    }>("get_version_info");

    return {
      version: info.version,
      tauriVersion: info.tauri_version,
      rustVersion: info.rust_version,
    };
  },

  /**
   * OS情報を取得（OsContext相当）
   */
  async getOsInfo(): Promise<OsInfo> {
    return await invoke<OsInfo>("get_os_info");
  },

  /**
   * アプリケーションバージョンを取得
   */
  async getAppVersion(): Promise<string> {
    const info = await this.getAppInfo();
    return info.version;
  },

  /**
   * プラットフォーム名を取得
   */
  async getPlatform(): Promise<string> {
    const info = await this.getAppInfo();
    return info.platform;
  },

  /**
   * ホスト名を取得
   */
  async getHostname(): Promise<string> {
    return await invoke<string>("get_hostname");
  },

  /**
   * プロセスIDを取得
   */
  async getPid(): Promise<number> {
    return await invoke<number>("get_pid");
  },

  /**
   * 環境変数を取得
   */
  async getEnvVar(name: string): Promise<string | null> {
    return await invoke<string | null>("get_env_var", { name });
  },
};

export default AppBridge;
