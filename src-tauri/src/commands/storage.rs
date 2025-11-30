// ローカルファイルストレージコマンド
// lichtblickのLocalFileStorage相当の機能をTauriで実装
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// データストア名のディレクトリ
const DATASTORES_DIR_NAME: &str = "studio-datastores";

/// ストレージエラー
#[derive(Debug, Serialize)]
pub struct StorageError {
    pub message: String,
    pub code: Option<String>,
}

impl From<std::io::Error> for StorageError {
    fn from(err: std::io::Error) -> Self {
        StorageError {
            message: err.to_string(),
            code: err.raw_os_error().map(|c| c.to_string()),
        }
    }
}

/// データストアのベースパスを取得
fn get_datastore_base_path(app: &tauri::AppHandle) -> Result<PathBuf, StorageError> {
    let user_data_path = app
        .path()
        .app_data_dir()
        .map_err(|e| StorageError {
            message: e.to_string(),
            code: None,
        })?;

    Ok(user_data_path.join(DATASTORES_DIR_NAME))
}

/// データストアのパスを確保（存在しなければ作成）
fn ensure_datastore_path(app: &tauri::AppHandle, datastore: &str) -> Result<PathBuf, StorageError> {
    // データストア名のバリデーション（小文字とハイフンのみ許可）
    if !datastore.chars().all(|c| c.is_ascii_lowercase() || c == '-') {
        return Err(StorageError {
            message: format!("datastore ({}) contains invalid characters", datastore),
            code: Some("INVALID_NAME".to_string()),
        });
    }

    let datastores_dir = get_datastore_base_path(app)?;

    // データストアディレクトリを作成
    fs::create_dir_all(&datastores_dir).map_err(StorageError::from)?;

    let datastore_path = datastores_dir.join(datastore);
    fs::create_dir_all(&datastore_path).map_err(StorageError::from)?;

    Ok(datastore_path)
}

/// キーからファイルパスを生成
fn make_file_path(
    app: &tauri::AppHandle,
    datastore: &str,
    key: &str,
) -> Result<PathBuf, StorageError> {
    // キー名のバリデーション（小文字とハイフンのみ許可）
    if !key.chars().all(|c| c.is_ascii_lowercase() || c == '-') {
        return Err(StorageError {
            message: format!("key ({}) contains invalid characters", key),
            code: Some("INVALID_KEY".to_string()),
        });
    }

    let datastore_path = ensure_datastore_path(app, datastore)?;
    Ok(datastore_path.join(key))
}

/// データストア内のすべてのキーを一覧表示
#[tauri::command]
pub fn storage_list(app: tauri::AppHandle, datastore: String) -> Result<Vec<String>, StorageError> {
    let datastore_path = ensure_datastore_path(&app, &datastore)?;

    let entries = fs::read_dir(&datastore_path).map_err(StorageError::from)?;

    let keys: Vec<String> = entries
        .filter_map(|entry| {
            entry.ok().and_then(|e| {
                e.file_name()
                    .to_str()
                    .map(|s| s.to_string())
            })
        })
        .collect();

    Ok(keys)
}

/// データストア内のすべてのデータを取得
#[tauri::command]
pub fn storage_all(
    app: tauri::AppHandle,
    datastore: String,
) -> Result<Vec<Vec<u8>>, StorageError> {
    let datastore_path = ensure_datastore_path(&app, &datastore)?;

    let entries = fs::read_dir(&datastore_path).map_err(StorageError::from)?;

    let mut results: Vec<Vec<u8>> = Vec::new();

    for entry in entries.flatten() {
        if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            if let Ok(content) = fs::read(entry.path()) {
                results.push(content);
            }
        }
    }

    Ok(results)
}

/// 指定したキーのデータを取得（バイナリ）
#[tauri::command]
pub fn storage_get(
    app: tauri::AppHandle,
    datastore: String,
    key: String,
) -> Result<Option<Vec<u8>>, StorageError> {
    let file_path = make_file_path(&app, &datastore, &key)?;

    match fs::read(&file_path) {
        Ok(content) => Ok(Some(content)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(StorageError::from(e)),
    }
}

/// 指定したキーのデータを取得（UTF-8文字列）
#[tauri::command]
pub fn storage_get_string(
    app: tauri::AppHandle,
    datastore: String,
    key: String,
) -> Result<Option<String>, StorageError> {
    let file_path = make_file_path(&app, &datastore, &key)?;

    match fs::read_to_string(&file_path) {
        Ok(content) => Ok(Some(content)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(StorageError::from(e)),
    }
}

/// データを保存（バイナリ）
#[tauri::command]
pub fn storage_put(
    app: tauri::AppHandle,
    datastore: String,
    key: String,
    value: Vec<u8>,
) -> Result<(), StorageError> {
    let file_path = make_file_path(&app, &datastore, &key)?;
    fs::write(&file_path, value).map_err(StorageError::from)
}

/// データを保存（UTF-8文字列）
#[tauri::command]
pub fn storage_put_string(
    app: tauri::AppHandle,
    datastore: String,
    key: String,
    value: String,
) -> Result<(), StorageError> {
    let file_path = make_file_path(&app, &datastore, &key)?;
    fs::write(&file_path, value).map_err(StorageError::from)
}

/// データを削除
#[tauri::command]
pub fn storage_delete(
    app: tauri::AppHandle,
    datastore: String,
    key: String,
) -> Result<(), StorageError> {
    let file_path = make_file_path(&app, &datastore, &key)?;

    match fs::remove_file(&file_path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()), // 存在しない場合は成功扱い
        Err(e) => Err(StorageError::from(e)),
    }
}

/// データストアが存在するか確認
#[tauri::command]
pub fn storage_exists(
    app: tauri::AppHandle,
    datastore: String,
    key: String,
) -> Result<bool, StorageError> {
    let file_path = make_file_path(&app, &datastore, &key)?;
    Ok(file_path.exists())
}
