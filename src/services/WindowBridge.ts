// WindowBridge: Tauri Window APIをラップしてElectron風のインターフェースを提供
import {
  getCurrentWindow,
  LogicalSize,
  LogicalPosition,
} from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-shell";

// ウィンドウサイズの型定義
export interface WindowSize {
  width: number;
  height: number;
}

// ウィンドウ位置の型定義
export interface WindowPosition {
  x: number;
  y: number;
}

// 内部状態（Tauri APIはタイトル取得をサポートしていないため）
// NOTE: このモジュールレベルの状態はシングルウィンドウアプリケーションを前提としています。
// 将来マルチウィンドウをサポートする場合は、ウィンドウラベルをキーとしたMapなどで
// ウィンドウごとにタイトルを管理するリファクタリングが必要です。
let currentTitle = "";

/**
 * WindowBridge - TauriのウィンドウAPIをラップするサービス
 */
export const WindowBridge = {
  /**
   * ウィンドウタイトルを設定
   */
  async setTitle(title: string): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.setTitle(title);
    currentTitle = title;
  },

  /**
   * 現在のウィンドウタイトルを取得
   * 注: Tauri APIは直接タイトル取得をサポートしていないため、内部管理値を返す
   */
  getTitle(): string {
    return currentTitle;
  },

  /**
   * フルスクリーンモードを設定
   */
  async setFullscreen(fullscreen: boolean): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.setFullscreen(fullscreen);
  },

  /**
   * フルスクリーン状態を切り替え
   */
  async toggleFullscreen(): Promise<void> {
    const appWindow = getCurrentWindow();
    const isCurrentlyFullscreen = await appWindow.isFullscreen();
    await appWindow.setFullscreen(!isCurrentlyFullscreen);
  },

  /**
   * フルスクリーン状態を取得
   */
  async isFullscreen(): Promise<boolean> {
    const appWindow = getCurrentWindow();
    return await appWindow.isFullscreen();
  },

  /**
   * ウィンドウサイズを設定
   */
  async setSize(width: number, height: number): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.setSize(new LogicalSize(width, height));
  },

  /**
   * ウィンドウの内部サイズを取得
   */
  async getSize(): Promise<WindowSize> {
    const appWindow = getCurrentWindow();
    const size = await appWindow.innerSize();
    return { width: size.width, height: size.height };
  },

  /**
   * ウィンドウ位置を設定
   */
  async setPosition(x: number, y: number): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.setPosition(new LogicalPosition(x, y));
  },

  /**
   * ウィンドウ位置を取得
   */
  async getPosition(): Promise<WindowPosition> {
    const appWindow = getCurrentWindow();
    const position = await appWindow.outerPosition();
    return { x: position.x, y: position.y };
  },

  /**
   * ウィンドウを最小化
   */
  async minimize(): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  },

  /**
   * ウィンドウを最大化
   */
  async maximize(): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.maximize();
  },

  /**
   * ウィンドウの最大化を解除
   */
  async unmaximize(): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.unmaximize();
  },

  /**
   * 最大化状態を切り替え
   */
  async toggleMaximize(): Promise<void> {
    const appWindow = getCurrentWindow();
    const isCurrentlyMaximized = await appWindow.isMaximized();
    if (isCurrentlyMaximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
  },

  /**
   * 最大化状態を取得
   */
  async isMaximized(): Promise<boolean> {
    const appWindow = getCurrentWindow();
    return await appWindow.isMaximized();
  },

  /**
   * 最小化状態を取得
   */
  async isMinimized(): Promise<boolean> {
    const appWindow = getCurrentWindow();
    return await appWindow.isMinimized();
  },

  /**
   * ウィンドウを閉じる
   */
  async close(): Promise<void> {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  },

  /**
   * 外部URLをデフォルトブラウザで開く
   */
  async openExternal(url: string): Promise<void> {
    await open(url);
  },

  /**
   * フルスクリーン状態の変更を監視
   * @param callback フルスクリーン状態が変更されたときに呼ばれるコールバック
   * @returns 監視を解除する関数
   */
  async onFullscreenChange(
    callback: (isFullscreen: boolean) => void
  ): Promise<() => void> {
    const appWindow = getCurrentWindow();
    // TauriのWindow APIでリサイズイベントを監視し、フルスクリーン状態をチェック
    let lastFullscreenState = await appWindow.isFullscreen();

    const unlisten = await appWindow.onResized(async () => {
      const currentFullscreen = await appWindow.isFullscreen();
      if (currentFullscreen !== lastFullscreenState) {
        lastFullscreenState = currentFullscreen;
        callback(currentFullscreen);
      }
    });

    return unlisten;
  },
};

export default WindowBridge;
