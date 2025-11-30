import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * メニューイベントのペイロード型
 * Rustから送信されるメニューアクションID
 */
export type MenuEventPayload =
  | "open_file"
  | "open_folder"
  | "save"
  | "save_as"
  | "toggle_fullscreen"
  | "zoom_in"
  | "zoom_out"
  | "reset_zoom"
  | "about";

/**
 * メニューイベントコールバック型
 */
export type MenuEventCallback = (action: MenuEventPayload) => void;

/**
 * 内部のリスナー管理用の型
 */
interface ListenerEntry {
  unlisten: UnlistenFn;
  callback: MenuEventCallback;
}

/**
 * アクティブなリスナーを管理
 */
const activeListeners: ListenerEntry[] = [];

/**
 * MenuBridge
 *
 * Tauriのメニューイベントをフロントエンドで処理するためのブリッジサービス
 * Rust側から送信される "menu-event" イベントをリッスンします
 */
export const MenuBridge = {
  /**
   * 全てのメニューイベントをリッスンする
   * @param callback - メニューイベント発生時に呼ばれるコールバック
   * @returns アンリッスン関数
   */
  async onMenuEvent(callback: MenuEventCallback): Promise<UnlistenFn> {
    const unlisten = await listen<MenuEventPayload>("menu-event", (event) => {
      callback(event.payload);
    });

    const entry: ListenerEntry = { unlisten, callback };
    activeListeners.push(entry);

    // 呼び出し側が直接使えるアンリッスン関数を返す
    return () => {
      unlisten();
      const index = activeListeners.indexOf(entry);
      if (index > -1) {
        activeListeners.splice(index, 1);
      }
    };
  },

  /**
   * 特定のメニューアクションのみをリッスンする
   * @param action - リッスンするメニューアクション
   * @param callback - 指定したアクション発生時に呼ばれるコールバック
   * @returns アンリッスン関数
   */
  async onSpecificMenuEvent(
    action: MenuEventPayload,
    callback: () => void
  ): Promise<UnlistenFn> {
    const wrappedCallback: MenuEventCallback = (receivedAction) => {
      if (receivedAction === action) {
        callback();
      }
    };

    const unlisten = await listen<MenuEventPayload>("menu-event", (event) => {
      wrappedCallback(event.payload);
    });

    const entry: ListenerEntry = { unlisten, callback: wrappedCallback };
    activeListeners.push(entry);

    return () => {
      unlisten();
      const index = activeListeners.indexOf(entry);
      if (index > -1) {
        activeListeners.splice(index, 1);
      }
    };
  },

  /**
   * 全てのリスナーを削除する
   */
  removeAllListeners(): void {
    for (const entry of activeListeners) {
      entry.unlisten();
    }
    activeListeners.length = 0;
  },

  /**
   * 登録されているリスナー数を取得する
   * @returns リスナー数
   */
  getListenerCount(): number {
    return activeListeners.length;
  },
};

export default MenuBridge;
