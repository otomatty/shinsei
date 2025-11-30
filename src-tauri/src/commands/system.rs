// システム情報を提供するコマンド
use serde::Serialize;
use tauri::Manager;

// NOTE: NetworkInterface構造体は将来のネットワーク情報取得機能で使用予定
// 現在はlichtblickのOsContext.getNetworkInterfaces()相当の機能は未実装

/// ホームディレクトリのパスを取得
///
/// フロントエンドから呼び出し:
/// ```typescript
/// const homePath = await invoke<string>("get_home_path");
/// ```
#[tauri::command]
pub fn get_home_path() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not find home directory".to_string())
}

/// ユーザーデータディレクトリのパスを取得
/// アプリケーション固有のデータを保存するディレクトリ
///
/// macOS: ~/Library/Application Support/{app_name}
/// Windows: C:\Users\{user}\AppData\Roaming\{app_name}
/// Linux: ~/.local/share/{app_name}
#[tauri::command]
pub fn get_user_data_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// 設定ディレクトリのパスを取得
///
/// macOS: ~/Library/Application Support/{app_name}
/// Windows: C:\Users\{user}\AppData\Roaming\{app_name}
/// Linux: ~/.config/{app_name}
#[tauri::command]
pub fn get_config_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_config_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// キャッシュディレクトリのパスを取得
#[tauri::command]
pub fn get_cache_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_cache_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// ログディレクトリのパスを取得
#[tauri::command]
pub fn get_log_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_log_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// 環境変数を取得
#[tauri::command]
pub fn get_env_var(name: String) -> Option<String> {
    std::env::var(&name).ok()
}

/// ホスト名を取得
#[tauri::command]
pub fn get_hostname() -> Result<String, String> {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// プロセスIDを取得
#[tauri::command]
pub fn get_pid() -> u32 {
    std::process::id()
}

/// OS情報
#[derive(Debug, Serialize)]
pub struct OsInfo {
    pub platform: String,
    pub arch: String,
    pub hostname: String,
    pub pid: u32,
}

/// OS情報を取得（OsContext相当）
#[tauri::command]
pub fn get_os_info() -> OsInfo {
    OsInfo {
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        hostname: hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string()),
        pid: std::process::id(),
    }
}
