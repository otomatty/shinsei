// DesktopBridge: デスクトップ連携機能を提供するTauriブリッジ
// lichtblickのdesktopBridge相当の機能を実装
import { invoke } from "@tauri-apps/api/core";
import { type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * ウィンドウイベント型
 */
export type WindowEvent = "maximize" | "unmaximize" | "focus" | "blur";

/**
 * DesktopBridge - デスクトップ連携機能を提供するサービス
 *
 * lichtblickのdesktopBridge相当の機能を提供
 */
export const DesktopBridge = {
  // 最大化状態のキャッシュ（Tauriイベントが早期に発火する可能性があるため）
  _isMaximized: false,
  _initialized: false,

  /**
   * 初期化（最大化状態の監視を開始）
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    const appWindow = getCurrentWindow();
    this._isMaximized = await appWindow.isMaximized();

    // 最大化/復元イベントを監視
    await appWindow.onResized(async () => {
      this._isMaximized = await appWindow.isMaximized();
    });

    this._initialized = true;
  },

  /**
   * ウィンドウイベントリスナーを追加
   */
  async addWindowEventListener(
    eventName: WindowEvent,
    handler: () => void
  ): Promise<UnlistenFn> {
    const appWindow = getCurrentWindow();

    switch (eventName) {
      case "maximize":
        return appWindow.listen("tauri://resize", async () => {
          const isMax = await appWindow.isMaximized();
          if (isMax && !this._isMaximized) {
            this._isMaximized = true;
            handler();
          }
        });
      case "unmaximize":
        return appWindow.listen("tauri://resize", async () => {
          const isMax = await appWindow.isMaximized();
          if (!isMax && this._isMaximized) {
            this._isMaximized = false;
            handler();
          }
        });
      case "focus":
        return appWindow.listen("tauri://focus", handler);
      case "blur":
        return appWindow.listen("tauri://blur", handler);
      default:
        return () => {};
    }
  },

  /**
   * ホームディレクトリのパスを取得
   */
  async getHomePath(): Promise<string> {
    return await invoke<string>("get_home_path");
  },

  /**
   * ユーザーデータディレクトリのパスを取得
   */
  async getUserDataPath(): Promise<string> {
    return await invoke<string>("get_user_data_path");
  },

  /**
   * 設定ディレクトリのパスを取得
   */
  async getConfigPath(): Promise<string> {
    return await invoke<string>("get_config_path");
  },

  /**
   * キャッシュディレクトリのパスを取得
   */
  async getCachePath(): Promise<string> {
    return await invoke<string>("get_cache_path");
  },

  /**
   * ログディレクトリのパスを取得
   */
  async getLogPath(): Promise<string> {
    return await invoke<string>("get_log_path");
  },

  /**
   * ウィンドウが最大化されているか
   */
  isMaximized(): boolean {
    return this._isMaximized;
  },

  /**
   * ウィンドウを最小化
   */
  async minimizeWindow(): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  },

  /**
   * ウィンドウを最大化
   */
  async maximizeWindow(): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.maximize();
    this._isMaximized = await appWindow.isMaximized();
  },

  /**
   * ウィンドウを元のサイズに戻す
   */
  async unmaximizeWindow(): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.unmaximize();
    this._isMaximized = await appWindow.isMaximized();
  },

  /**
   * ウィンドウを閉じる
   */
  async closeWindow(): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  },

  /**
   * ウィンドウをリロード
   */
  reloadWindow(): void {
    window.location.reload();
  },

  /**
   * タイトルバーダブルクリック時の処理
   */
  async handleTitleBarDoubleClick(): Promise<void> {
    const appWindow = getCurrentWindow();
    if (await appWindow.isMaximized()) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
    // 操作後に実際の状態を取得してキャッシュを更新
    this._isMaximized = await appWindow.isMaximized();
  },

  /**
   * ディープリンクを取得（現在はプレースホルダー）
   * TODO: Tauri deep link pluginを使用して実装
   */
  getDeepLinks(): string[] {
    return [];
  },

  /**
   * ディープリンクをリセット
   */
  resetDeepLinks(): void {
    // セッションCookieを使用したElectronの手法ではなく、
    // 単純にリロードするだけ
    window.location.reload();
  },
};

export default DesktopBridge;
