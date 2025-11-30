// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Manager,
};

// コマンドモジュール
mod commands;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn create_menu(app: &tauri::AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    // File メニュー
    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &MenuItem::with_id(app, "open_file", "Open File...", true, Some("CmdOrCtrl+O"))?,
            &MenuItem::with_id(app, "open_folder", "Open Folder...", true, Some("CmdOrCtrl+Shift+O"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))?,
            &MenuItem::with_id(app, "save_as", "Save As...", true, Some("CmdOrCtrl+Shift+S"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "close", "Close Window", true, Some("CmdOrCtrl+W"))?,
            &PredefinedMenuItem::quit(app, Some("Quit"))?,
        ],
    )?;

    // Edit メニュー
    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, Some("Undo"))?,
            &PredefinedMenuItem::redo(app, Some("Redo"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, Some("Cut"))?,
            &PredefinedMenuItem::copy(app, Some("Copy"))?,
            &PredefinedMenuItem::paste(app, Some("Paste"))?,
            &PredefinedMenuItem::select_all(app, Some("Select All"))?,
        ],
    )?;

    // View メニュー
    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &MenuItem::with_id(app, "toggle_fullscreen", "Toggle Fullscreen", true, Some("F11"))?,
            &MenuItem::with_id(app, "zoom_in", "Zoom In", true, Some("CmdOrCtrl+Plus"))?,
            &MenuItem::with_id(app, "zoom_out", "Zoom Out", true, Some("CmdOrCtrl+Minus"))?,
            &MenuItem::with_id(app, "reset_zoom", "Reset Zoom", true, Some("CmdOrCtrl+0"))?,
        ],
    )?;

    // Help メニュー
    let help_menu = Submenu::with_items(
        app,
        "Help",
        true,
        &[
            &MenuItem::with_id(app, "documentation", "Documentation", true, None::<&str>)?,
            &MenuItem::with_id(app, "about", "About Shinsei", true, None::<&str>)?,
        ],
    )?;

    // メニューバーを構築
    Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu, &help_menu])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // メニューバーを作成して設定
            let menu = create_menu(app.handle())?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let event_id = event.id().as_ref();
            // TODO: println!をlogクレートなどの適切なロガーに置き換えることを検討してください
            println!("Menu event triggered: {}", event_id);

            match event_id {
                // ウィンドウを閉じる（Rust側で直接処理）
                "close" => {
                    if let Some(window) = app.get_webview_window("main") {
                        if let Err(e) = window.close() {
                            println!("Failed to close window: {}", e);
                        }
                    }
                }
                // ドキュメントを外部ブラウザで開く
                "documentation" => {
                    let _ = tauri_plugin_opener::OpenerExt::opener(app)
                        .open_url("https://github.com/lichtblick-suite/lichtblick", None::<&str>);
                }
                // フロントエンドに転送するイベント
                // toggle_fullscreen も含め、フロントエンドで一貫して処理
                "open_file" | "open_folder" | "save" | "save_as" | "toggle_fullscreen" | "zoom_in" | "zoom_out" | "reset_zoom" | "about" => {
                    if let Some(window) = app.get_webview_window("main") {
                        if let Err(e) = window.emit("menu-event", event_id) {
                            println!("Failed to emit event '{}': {}", event_id, e);
                        }
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            // 基本コマンド
            greet,
            // アプリ情報コマンド
            commands::get_app_info,
            commands::get_version_info,
            // システムコマンド
            commands::get_home_path,
            commands::get_user_data_path,
            commands::get_config_path,
            commands::get_cache_path,
            commands::get_log_path,
            commands::get_env_var,
            commands::get_hostname,
            commands::get_pid,
            commands::get_os_info,
            // ストレージコマンド
            commands::storage_list,
            commands::storage_all,
            commands::storage_get,
            commands::storage_get_string,
            commands::storage_put,
            commands::storage_put_string,
            commands::storage_delete,
            commands::storage_exists,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
