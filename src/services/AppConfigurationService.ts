/**
 * AppConfigurationService
 *
 * Tauri環境用のアプリケーション設定管理サービス
 * IAppConfigurationインターフェースを実装し、LocalStorageベースで設定を永続化
 */
import type {
  IAppConfiguration,
  AppConfigurationValue,
  ChangeHandler,
} from "@lichtblick/suite-base/context/AppConfigurationContext";

// LocalStorageのキー
const STORAGE_KEY = "app-config";

/**
 * アプリケーション設定を管理するサービスクラス
 *
 * @example
 * ```typescript
 * const config = new AppConfigurationService();
 * await config.set("theme", "dark");
 * const theme = config.get("theme"); // "dark"
 * ```
 */
export class AppConfigurationService implements IAppConfiguration {
  /** 設定値を保持するマップ */
  private config: Map<string, AppConfigurationValue>;

  /** キーごとの変更リスナー */
  private listeners: Map<string, Set<ChangeHandler>>;

  /**
   * AppConfigurationServiceのコンストラクタ
   *
   * @param defaults - デフォルト設定値（オプション）
   */
  constructor(defaults?: Record<string, AppConfigurationValue>) {
    this.config = new Map();
    this.listeners = new Map();

    // デフォルト値を設定
    if (defaults) {
      for (const [key, value] of Object.entries(defaults)) {
        this.config.set(key, value);
      }
    }

    // LocalStorageから設定を読み込み
    this.loadFromStorage();
  }

  /**
   * LocalStorageから設定を読み込む
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<
          string,
          AppConfigurationValue
        >;
        for (const [key, value] of Object.entries(parsed)) {
          this.config.set(key, value);
        }
      }
    } catch (error) {
      console.warn("Failed to load configuration from localStorage:", error);
    }
  }

  /**
   * 設定をLocalStorageに保存する
   */
  private saveToStorage(): void {
    try {
      const obj: Record<string, AppConfigurationValue> = {};
      for (const [key, value] of this.config.entries()) {
        if (value !== undefined) {
          obj[key] = value;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.warn("Failed to save configuration to localStorage:", error);
    }
  }

  /**
   * 指定されたキーの変更リスナーに通知する
   *
   * @param key - 設定キー
   * @param newValue - 新しい値
   */
  private notifyListeners(key: string, newValue: AppConfigurationValue): void {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      for (const listener of keyListeners) {
        try {
          listener(newValue);
        } catch (error) {
          console.error(`Error in change listener for key "${key}":`, error);
        }
      }
    }
  }

  /**
   * 現在の設定値を取得
   *
   * @param key - 設定キー
   * @returns 設定値（未設定の場合はundefined）
   */
  get(key: string): AppConfigurationValue {
    return this.config.get(key);
  }

  /**
   * 設定値を更新
   *
   * @param key - 設定キー
   * @param value - 新しい設定値
   * @returns 設定保存の完了Promise
   */
  async set(key: string, value: AppConfigurationValue): Promise<void> {
    if (value === undefined) {
      this.config.delete(key);
    } else {
      this.config.set(key, value);
    }

    this.saveToStorage();
    this.notifyListeners(key, value);
  }

  /**
   * 設定変更の監視を開始
   *
   * @param key - 監視する設定キー
   * @param cb - 変更時のコールバック
   */
  addChangeListener(key: string, cb: ChangeHandler): void {
    let keyListeners = this.listeners.get(key);
    if (!keyListeners) {
      keyListeners = new Set();
      this.listeners.set(key, keyListeners);
    }
    keyListeners.add(cb);
  }

  /**
   * 設定変更の監視を解除
   *
   * @param key - 監視を解除する設定キー
   * @param cb - 削除するコールバック
   */
  removeChangeListener(key: string, cb: ChangeHandler): void {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.delete(cb);
      // リスナーが空になった場合はMapからキーを削除
      if (keyListeners.size === 0) {
        this.listeners.delete(key);
      }
    }
  }
}
