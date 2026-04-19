use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct AiRequest {
    pub prompt: String,
    pub model_id: String,
}

#[derive(Serialize)]
pub struct AiResponse {
    pub text: String,
}

pub struct AiState {
    pub is_running: Arc<Mutex<bool>>,
}

#[tauri::command]
pub async fn generate_text_internal<R: Runtime>(
    app: AppHandle<R>,
    prompt: String,
    model_id: String,
) -> Result<String, String> {
    // 1. モデルパスの取得
    let filename = if model_id == "gemma-2-2b" { "gemma-2-2b-it-Q4_K_M.gguf" } else { "gemma-2-2b-it-Q4_K_M.gguf" };
    let models_dir = super::model_manager::get_models_dir(&app);
    let model_path = models_dir.join(filename);

    if !model_path.exists() {
        return Err("Model not found. Please download it first.".to_string());
    }

    // 2. サイドカーの実行 (llama-cli または llama-server)
    // 今回は簡易的に llama-cli をワンショットで実行する方式を模索
    let shell = app.shell();
    
    // 注意: サイドカーバイナリ 'llama-cli' が src-tauri/bin に配置されている必要があります
    // Windows の場合は llama-cli-x86_64-pc-windows-msvc.exe 等
    let output = shell.sidecar("llama-cli")
        .map_err(|e| format!("Failed to find sidecar: {}", e))?
        .args(["-m", model_path.to_str().unwrap(), "-p", &prompt, "-n", "256", "--quiet"])
        .output()
        .await
        .map_err(|e| format!("Execution failed: {}", e))?;

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).to_string();
        // llama-cli の出力からプロンプト部分を削るなどの処理が必要な場合あり
        Ok(text)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
