/**
 * TauriNativeAppMenu
 *
 * Tauri環境用のネイティブアプリメニュー制御サービス
 * INativeAppMenuインターフェースを実装
 */
import type {
  INativeAppMenu,
  NativeAppMenuEvent,
} from "@lichtblick/suite-base/context/NativeAppMenuContext";
import { MenuBridge, type MenuEventPayload } from "./MenuBridge";

type Handler = () => void;
type UnregisterFn = () => void;

/**
 * MenuBridgeのイベントからNativeAppMenuEventへのマッピング
 */
const MENU_EVENT_MAP: Record<MenuEventPayload, NativeAppMenuEvent | null> = {
  open_file: "open-file",
  open_folder: "open", // open_folderは汎用の"open"にマッピング
  save: null, // saveはNativeAppMenuEventに対応なし
  save_as: null, // save_asはNativeAppMenuEventに対応なし
  toggle_fullscreen: null, // toggle_fullscreenはNativeAppMenuEventに対応なし
  zoom_in: null, // zoom_inはNativeAppMenuEventに対応なし
  zoom_out: null, // zoom_outはNativeAppMenuEventに対応なし
  reset_zoom: null, // reset_zoomはNativeAppMenuEventに対応なし
  about: "open-help-about",
};

/**
 * Tauri環境用のネイティブアプリメニュー実装
 *
 * @example
 * ```typescript
 * const nativeAppMenu = new TauriNativeAppMenu();
 * const unregister = nativeAppMenu.on("open-file", () => {
 *   console.log("File menu clicked!");
 * });
 * // クリーンアップ
 * unregister();
 * ```
 */
export class TauriNativeAppMenu implements INativeAppMenu {
  /** イベントハンドラーのマップ */
  private handlers: Map<NativeAppMenuEvent, Set<Handler>>;

  /** MenuBridgeのアンリッスン関数 */
  private menuBridgeUnlisten: (() => void) | null = null;

  /** 初期化済みフラグ */
  private disposed = false;

  constructor() {
    this.handlers = new Map();
    // サポートするすべてのイベントタイプを初期化
    const eventTypes: NativeAppMenuEvent[] = [
      "open",
      "open-file",
      "open-connection",
      "open-demo",
      "open-help-about",
      "open-help-docs",
      "open-help-general",
    ];
    for (const eventType of eventTypes) {
      this.handlers.set(eventType, new Set());
    }

    // 非同期で初期化
    void this.initialize();
  }

  /**
   * 非同期の初期化処理
   */
  private async initialize(): Promise<void> {
    try {
      // MenuBridgeのイベントを監視
      this.menuBridgeUnlisten = await MenuBridge.onMenuEvent((action) => {
        this.handleMenuBridgeEvent(action);
      });
    } catch (error) {
      console.warn("Failed to initialize menu event monitoring:", error);
    }
  }

  /**
   * MenuBridgeイベントのハンドリング
   * テスト用にpublicメソッドとして公開
   */
  handleMenuBridgeEvent(action: MenuEventPayload): void {
    if (this.disposed) {
      return;
    }

    const nativeEvent = MENU_EVENT_MAP[action];
    if (nativeEvent) {
      this.triggerEvent(nativeEvent);
    }
  }

  /**
   * 指定されたイベントをトリガー
   * テスト用にpublicメソッドとして公開
   */
  triggerEvent(eventName: NativeAppMenuEvent): void {
    if (this.disposed) {
      return;
    }

    const eventHandlers = this.handlers.get(eventName);
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        try {
          handler();
        } catch (error) {
          console.error(`Error in ${eventName} handler:`, error);
        }
      }
    }
  }

  /**
   * メニューイベントのリスナーを登録
   *
   * @param name - 監視するイベント名
   * @param handler - イベント発生時に実行される関数
   * @returns リスナーの登録解除関数
   */
  on(name: NativeAppMenuEvent, handler: Handler): UnregisterFn | undefined {
    if (this.disposed) {
      return undefined;
    }

    const eventHandlers = this.handlers.get(name);
    if (!eventHandlers) {
      return undefined;
    }

    eventHandlers.add(handler);

    // アンレジスター関数を返す
    return () => {
      eventHandlers.delete(handler);
    };
  }

  /**
   * リソースの解放
   */
  dispose(): void {
    this.disposed = true;

    if (this.menuBridgeUnlisten) {
      this.menuBridgeUnlisten();
      this.menuBridgeUnlisten = null;
    }

    // すべてのハンドラーをクリア
    for (const handlers of this.handlers.values()) {
      handlers.clear();
    }
  }
}
