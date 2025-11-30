// Services index - Tauriブリッジサービスのエクスポート

// ファイルシステム操作
export {
  TauriBridge,
  type FileFilter,
  type OpenDialogOptions,
  type SaveDialogOptions,
  type DirectoryEntry,
  type FileInfo,
} from "./TauriBridge";

// ウィンドウ操作
export {
  WindowBridge,
  type WindowSize,
  type WindowPosition,
} from "./WindowBridge";

// メニューイベント
export {
  MenuBridge,
  type MenuEventPayload,
  type MenuEventCallback,
} from "./MenuBridge";

// アプリケーション情報
export {
  AppBridge,
  type AppInfo,
  type VersionInfo,
  type OsInfo,
} from "./AppBridge";

// デスクトップ連携
export { DesktopBridge, type WindowEvent } from "./DesktopBridge";

// ストレージ
export {
  StorageBridge,
  type StorageContent,
  type StorageError,
} from "./StorageBridge";
