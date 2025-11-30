// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Manager,
};

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
            match event.id().as_ref() {
                "open_file" => {
                    println!("Open File clicked");
                    // フロントエンドにイベントを送信
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-event", "open_file");
                    }
                }
                "open_folder" => {
                    println!("Open Folder clicked");
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-event", "open_folder");
                    }
                }
                "save" => {
                    println!("Save clicked");
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-event", "save");
                    }
                }
                "save_as" => {
                    println!("Save As clicked");
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-event", "save_as");
                    }
                }
                "close" => {
                    println!("Close Window clicked");
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.close();
                    }
                }
                "toggle_fullscreen" => {
                    println!("Toggle Fullscreen clicked");
                    if let Some(window) = app.get_webview_window("main") {
                        if let Ok(is_fullscreen) = window.is_fullscreen() {
                            let _ = window.set_fullscreen(!is_fullscreen);
                        }
                    }
                }
                "zoom_in" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-event", "zoom_in");
                    }
                }
                "zoom_out" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-event", "zoom_out");
                    }
                }
                "reset_zoom" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-event", "reset_zoom");
                    }
                }
                "documentation" => {
                    let _ = tauri_plugin_opener::OpenerExt::opener(app)
                        .open_url("https://github.com/lichtblick-suite/lichtblick", None::<&str>);
                }
                "about" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-event", "about");
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
