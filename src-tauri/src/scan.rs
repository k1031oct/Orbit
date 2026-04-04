use std::fs;
use std::path::PathBuf;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct ScannedProject {
    pub name: String,
    pub path: String,
    pub markers: Vec<String>,
}

pub fn scan_directory(base_dir: &str) -> Vec<ScannedProject> {
    let mut projects = Vec::new();
    let root = PathBuf::from(base_dir);

    if !root.is_dir() {
        return projects;
    }

    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                
                // Skip hidden directories and node_modules
                if name.starts_with('.') || name == "node_modules" || name == "target" {
                    continue;
                }

                let mut markers = Vec::new();
                
                // Project markers
                if path.join("package.json").exists() { markers.push("Node.js".to_string()); }
                if path.join("DATA_FLOW.md").exists() { markers.push("DataFlow".to_string()); }
                if path.join("AGENTS.md").exists() { markers.push("Agents".to_string()); }
                if path.join("build.gradle").exists() || path.join("app/src").exists() { markers.push("Android".to_string()); }
                if path.join("src-tauri").exists() { markers.push("Tauri".to_string()); }

                if !markers.is_empty() {
                    projects.push(ScannedProject {
                        name,
                        path: path.to_string_lossy().to_string(),
                        markers,
                    });
                }
            }
        }
    }

    projects
}
