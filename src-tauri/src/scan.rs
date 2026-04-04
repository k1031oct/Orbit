use std::fs;
use std::path::PathBuf;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct ScannedProject {
    pub name: String,
    pub path: String,
    pub markers: Vec<String>,
    pub git_url: Option<String>,
}

fn detect_git_url(path: &PathBuf) -> Option<String> {
    let git_config = path.join(".git").join("config");
    if git_config.exists() {
        if let Ok(content) = fs::read_to_string(git_config) {
            // Simple line-based parser for [remote "origin"]
            let mut in_origin = false;
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed == "[remote \"origin\"]" {
                    in_origin = true;
                } else if in_origin && trimmed.starts_with('[') {
                    in_origin = false;
                } else if in_origin && trimmed.starts_with("url = ") {
                    return Some(trimmed.replace("url = ", "").trim().to_string());
                }
            }
        }
    }
    None
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
                    let git_url = detect_git_url(&path);
                    projects.push(ScannedProject {
                        name,
                        path: path.to_string_lossy().to_string(),
                        markers,
                        git_url,
                    });
                }
            }
        }
    }

    projects
}
