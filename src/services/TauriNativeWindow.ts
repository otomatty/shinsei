/**
 * TauriNativeWindow
 *
 * Tauri環境用のネイティブウィンドウ制御サービス
 * INativeWindowインターフェースを実装
 */
import type {
  INativeWindow,
  NativeWindowEvent,
} from "@lichtblick/suite-base/context/NativeWindowContext";
import { WindowBridge } from "./WindowBridge";

// アプリケーションのデフォルトタイトル
const DEFAULT_TITLE = "Shinsei";

type Handler = () => void;

/**
 * Tauri環境用のネイティブウィンドウ実装
 *
 * @example
 * ```typescript
 * const nativeWindow = new TauriNativeWindow();
 * await nativeWindow.setRepresentedFilename("/path/to/file.mcap");
 * nativeWindow.on("enter-full-screen", () => console.log("Fullscreen!"));
 * ```
 */
export class TauriNativeWindow implements INativeWindow {
  /** イベントハンドラーのマップ */
  private handlers: Map<NativeWindowEvent, Set<Handler>>;

  /** フルスクリーン監視のアンリッスン関数 */
  private fullscreenUnlisten: (() => void) | null = null;

  /** 初期化済みフラグ */
  private initialized = false;

  constructor() {
    this.handlers = new Map();
    this.handlers.set("enter-full-screen", new Set());
    this.handlers.set("leave-full-screen", new Set());

    // 非同期で初期化
    void this.initialize();
  }

  /**
   * 非同期の初期化処理
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // フルスクリーン状態の監視を開始
      this.fullscreenUnlisten = await WindowBridge.onFullscreenChange(
        (isFullscreen) => {
          void this.handleFullscreenChange(isFullscreen);
        }
      );
      this.initialized = true;
    } catch (error) {
      console.warn("Failed to initialize fullscreen monitoring:", error);
    }
  }

  /**
   * フルスクリーン状態変更のハンドリング
   * テスト用にpublicメソッドとして公開
   */
  async handleFullscreenChange(isFullscreen: boolean): Promise<void> {
    const eventName: NativeWindowEvent = isFullscreen
      ? "enter-full-screen"
      : "leave-full-screen";

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
   * ファイルパスからファイル名を抽出
   */
  private extractFilename(filepath: string): string {
    // Windows と Unix 両方のパスセパレータに対応
    const parts = filepath.split(/[/\\]/);
    return parts[parts.length - 1] ?? filepath;
  }

  /**
   * 現在開いているファイル名をウィンドウに関連付け
   *
   * Tauriではウィンドウタイトルにファイル名を表示することで代替実装
   *
   * @param filename - 関連付けるファイル名（undefined で解除）
   */
  async setRepresentedFilename(filename: string | undefined): Promise<void> {
    if (filename === undefined) {
      await WindowBridge.setTitle(DEFAULT_TITLE);
    } else {
      const displayName = this.extractFilename(filename);
      await WindowBridge.setTitle(`${displayName} - ${DEFAULT_TITLE}`);
    }
  }

  /**
   * ウィンドウイベントのリスナーを登録
   *
   * @param name - 監視するイベント名
   * @param handler - イベント発生時に実行される関数
   */
  on(name: NativeWindowEvent, handler: Handler): void {
    const eventHandlers = this.handlers.get(name);
    if (eventHandlers) {
      eventHandlers.add(handler);
    }
  }

  /**
   * リソースの解放
   */
  dispose(): void {
    if (this.fullscreenUnlisten) {
      this.fullscreenUnlisten();
      this.fullscreenUnlisten = null;
    }
    this.handlers.clear();
    this.initialized = false;
  }
}
