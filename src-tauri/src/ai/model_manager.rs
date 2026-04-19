use tauri::{AppHandle, Manager, Runtime, Emitter};
use std::fs;
use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use futures_util::StreamExt;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub url: String,
    pub size_mb: u64,
    pub is_downloaded: bool,
}

#[derive(Serialize, Clone)]
pub struct DownloadProgress {
    pub model_id: String,
    pub progress: f64,
    pub total_size: u64,
    pub downloaded_size: u64,
}

pub fn get_models_dir<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    let mut path = app.path().app_local_data_dir().unwrap();
    path.push("models");
    if !path.exists() {
        fs::create_dir_all(&path).unwrap();
    }
    path
}

#[tauri::command]
pub async fn download_model<R: Runtime>(app: AppHandle<R>, model_id: String) -> Result<String, String> {
    // 今回は固定で Gemma 2-2B を対象とする
    let model = if model_id == "gemma-2-2b" {
        ModelInfo {
            id: "gemma-2-2b".to_string(),
            name: "Gemma 2 2B IT".to_string(),
            filename: "gemma-2-2b-it-Q4_K_M.gguf".to_string(),
            url: "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf".to_string(),
            size_mb: 1600,
            is_downloaded: false,
        }
    } else {
        return Err("Unsupported model".to_string());
    };

    let target_path = get_models_dir(&app).join(&model.filename);
    
    if target_path.exists() {
        return Ok(target_path.to_str().unwrap().to_string());
    }

    let client = reqwest::Client::new();
    let res = client.get(&model.url).send().await.map_err(|e| e.to_string())?;
    let total_size = res.content_length().unwrap_or(0);
    
    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();
    let mut file = fs::File::create(&target_path).map_err(|e| e.to_string())?;

    use std::io::Write;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        // 進捗をフロントエンドに通知
        let progress = if total_size > 0 {
            (downloaded as f64 / total_size as f64) * 100.0
        } else {
            0.0
        };

        app.emit("model-download-progress", DownloadProgress {
            model_id: model_id.clone(),
            progress,
            total_size,
            downloaded_size: downloaded,
        }).unwrap();
    }

    Ok(target_path.to_str().unwrap().to_string())
}

#[tauri::command]
pub async fn check_model_downloaded(app: AppHandle, model_id: String) -> bool {
    // ひとまずファイルが存在するかだけで判定
    let filename = if model_id == "gemma-2-2b" { "gemma-2-2b-it-Q4_K_M.gguf" } else { return false };
    let path = get_models_dir(&app).join(filename);
    path.exists()
}
