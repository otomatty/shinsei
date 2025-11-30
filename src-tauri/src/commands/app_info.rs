// アプリケーション情報を提供するコマンド
use serde::Serialize;

/// アプリケーション情報
#[derive(Debug, Serialize)]
pub struct AppInfo {
    /// アプリケーションバージョン
    pub version: String,
    /// アプリケーション名
    pub name: String,
    /// プラットフォーム（macos, windows, linux）
    pub platform: String,
    /// アーキテクチャ（x86_64, aarch64等）
    pub arch: String,
}

/// アプリケーション情報を取得
///
/// フロントエンドから呼び出し:
/// ```typescript
/// const info = await invoke<AppInfo>("get_app_info");
/// ```
#[tauri::command]
pub fn get_app_info() -> AppInfo {
    AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        name: env!("CARGO_PKG_NAME").to_string(),
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    }
}

/// 詳細なアプリケーションバージョン情報
#[derive(Debug, Serialize)]
pub struct VersionInfo {
    /// セマンティックバージョン
    pub version: String,
    /// Tauriバージョン
    pub tauri_version: String,
    /// Rustバージョン（コンパイル時）
    pub rust_version: String,
}

/// 詳細なバージョン情報を取得
#[tauri::command]
pub fn get_version_info() -> VersionInfo {
    VersionInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        tauri_version: tauri::VERSION.to_string(),
        rust_version: env!("CARGO_PKG_RUST_VERSION").to_string(),
    }
}
