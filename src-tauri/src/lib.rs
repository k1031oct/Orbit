use tauri::Manager;
use std::fs;
use std::path::PathBuf;
use base64::{Engine as _, engine::general_purpose};
mod scan;

#[tauri::command]
fn get_app_data_path(app: tauri::AppHandle) -> PathBuf {
    app.path().app_config_dir().unwrap()
}

#[tauri::command]
async fn save_db(app: tauri::AppHandle, data: String) -> Result<(), String> {
    let path = get_app_data_path(app).join("orbit.db");
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let decoded = general_purpose::STANDARD.decode(data).map_err(|e| e.to_string())?;
    fs::write(path, decoded).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn load_db(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = get_app_data_path(app).join("orbit.db");
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read(path).map_err(|e| e.to_string())?;
    let encoded = general_purpose::STANDARD.encode(content);
    Ok(Some(encoded))
}

#[tauri::command]
fn open_vscode(path: String) -> Result<(), String> {
    let _ = std::process::Command::new("code")
        .arg(".")
        .current_dir(path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn open_android_studio(path: String) -> Result<(), String> {
    // Standard Windows location check
    let paths = vec![
        r"C:\Program Files\Android\Android Studio\bin\studio64.exe",
        r"C:\Program Files\Android\Android Studio 2024.1\bin\studio64.exe",
    ];
    let exe = paths.into_iter().find(|p| std::path::Path::new(p).exists()).unwrap_or("studio64.exe");
    
    let _ = std::process::Command::new(exe)
        .arg(path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn scan_projects(base_dir: String) -> Vec<scan::ScannedProject> {
    scan::scan_directory(&base_dir)
}

#[tauri::command]
async fn scaffold_project(path: String, name: String, project_id: String, mcp_url: String) -> Result<(), String> {
    let project_path = PathBuf::from(&path);
    
    // Ensure directory exists (Bypassing JS scopes by doing it in Rust)
    if !project_path.exists() {
        fs::create_dir_all(&project_path).map_err(|e| e.to_string())?;
    }

    // Scaffold AGENTS.md if missing
    let agents_path = project_path.join("AGENTS.md");
    if !agents_path.exists() {
        let content = format!(
            "<!-- ORBIT_ID: {} -->\n<!-- ORBIT_NAME: {} -->\n<!-- ORBIT_PATH: {} -->\n\n# AGENTS for {}\n\n## 境界定義\n- このプロジェクトは Orbit によって管理されています。\n\n## 行動原則\n- DATA_FLOW.md を正解とする。\n\n## 🎯 ACTIVE MISSIONS\n", 
            project_id, name, path, name
        );
        fs::write(agents_path, content).map_err(|e| e.to_string())?;
    }

    // Scaffold DATA_FLOW.md if missing
    let data_flow_path = project_path.join("DATA_FLOW.md");
    if !data_flow_path.exists() {
        let content = format!(
            "<!-- ORBIT_ID: {} -->\n<!-- ORBIT_NAME: {} -->\n<!-- ORBIT_PATH: {} -->\n\n# DATA_FLOW for {}\n\n## システム構造\n└─ プロジェクトルート\n", 
            project_id, name, path, name
        );
        fs::write(data_flow_path, content).map_err(|e| e.to_string())?;
    }

    // 1. Scaffold ORBIT.md (Portal Link)
    let orbit_md_path = project_path.join("ORBIT.md");
    let orbit_content = format!(
        "<!-- ORBIT_ID: {} -->\n<!-- ORBIT_NAME: {} -->\n<!-- ORBIT_PATH: {} -->\n\n# ORBIT MISSION NODE: {}\n\n## Orchestrator Link\n- **Project ID**: {}\n- **MCP Endpoint**: {}\n\n## Governance\n- This node is managed by the Orbit Command Center.\n- Do not remove this file; it is required for AI-Orchestrator synchronization.\n",
        project_id, name, path, name, project_id, mcp_url
    );
    fs::write(orbit_md_path, orbit_content).map_err(|e| e.to_string())?;

    // 2. Auto-update .gitignore
    let gitignore_path = project_path.join(".gitignore");
    let mut gitignore_content = if gitignore_path.exists() {
        fs::read_to_string(&gitignore_path).unwrap_or_default()
    } else {
        String::new()
    };

    if !gitignore_content.contains("ORBIT.md") {
        if !gitignore_content.is_empty() && !gitignore_content.ends_with('\n') {
            gitignore_content.push('\n');
        }
        gitignore_content.push_str("\n# Orbit Portal\nORBIT.md\n");
        fs::write(gitignore_path, gitignore_content).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Mission {
    id: i32,
    title: String,
    status: String,
    target: String,
}

#[tauri::command]
async fn sync_missions(path: String, missions: Vec<Mission>) -> Result<(), String> {
    let agents_path = std::path::Path::new(&path).join("AGENTS.md");
    if !agents_path.exists() { return Ok(()); }

    let content = fs::read_to_string(&agents_path).map_err(|e| e.to_string())?;
    
    // ## 🎯 ACTIVE MISSIONS セクションを探す
    let section_header = "## 🎯 ACTIVE MISSIONS";
    let mut mission_list = String::from("\n## 🎯 ACTIVE MISSIONS\n");
    for m in missions {
        let check = if m.status == "Done" { "x" } else { " " };
        mission_list.push_str(&format!("- [{}] <!-- REQ_ID: {} --> {} ({})\n", check, m.id, m.title, m.target));
    }

    let new_content = if let Some(pos) = content.find(section_header) {
        // 既存のセクションを置換 (次の ## またはファイルの末尾まで)
        let mut final_content = content[..pos].to_string();
        final_content.push_str(&mission_list);
        
        let remaining = &content[pos + section_header.len()..];
        if let Some(next_section) = remaining.find("\n## ") {
            final_content.push_str(&remaining[next_section..]);
        }
        final_content
    } else {
        // セクションがない場合は末尾に追加
        let mut final_content = content.trim_end().to_string();
        final_content.push_str("\n");
        final_content.push_str(&mission_list);
        final_content
    };

    fs::write(agents_path, new_content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn run_shell_command(path: String, command: String, args: Vec<String>) -> Result<String, String> {
    use std::process::Command;
    
    let is_windows = cfg!(windows);
    let mut cmd_base = if is_windows {
        let mut c = Command::new("cmd");
        c.arg("/C");
        c
    } else {
        let mut c = Command::new("sh");
        c.arg("-c");
        c
    };

    let full_command = format!("{} {}", command, args.join(" "));
    let output = cmd_base.arg(full_command)
        .current_dir(path)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    if output.status.success() {
        Ok(stdout)
    } else {
        Err(format!("{}\n{}", stdout, stderr))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            save_db, 
            load_db, 
            open_vscode, 
            open_android_studio,
            scan_projects,
            scaffold_project,
            run_shell_command,
            sync_missions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
