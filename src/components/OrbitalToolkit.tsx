'use client';

import { invoke } from '@tauri-apps/api/core';
import { Terminal, Cpu, GitBranch } from 'lucide-react';

interface ToolkitProps {
  projectPath: string;
  gitUrl?: string;
}

export default function OrbitalToolkit({ projectPath, gitUrl }: ToolkitProps) {
  
  async function handleOpenVSCode() {
    try {
      await invoke('open_vscode', { path: projectPath });
    } catch (e) {
      console.error('Failed to open VS Code:', e);
    }
  }

  async function handleOpenStudio() {
    try {
      await invoke('open_android_studio', { path: projectPath });
    } catch (e) {
      console.error('Failed to open Android Studio:', e);
    }
  }

  return (
    <div className="orbit-flex-row orbit-gap-sm animate-fade">
      <button
        onClick={handleOpenVSCode}
        className="orbit-button-icon border-indigo-500/10 hover:border-indigo-500/40 w-12 h-12"
        title="VS Code で開く"
      >
        <Terminal size={22} className="text-indigo-400" />
      </button>

      <button
        onClick={handleOpenStudio}
        className="orbit-button-icon border-emerald-500/10 hover:border-emerald-500/40 w-12 h-12"
        title="Android Studio で開く"
      >
        <Cpu size={22} className="text-emerald-400" />
      </button>

      {gitUrl && (
        <a
          href={gitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="orbit-button-icon border-fuchsia-500/10 hover:border-fuchsia-500/40 w-12 h-12"
          title="リポジトリを開く"
        >
          <GitBranch size={22} className="text-fuchsia-400" />
        </a>
      )}
    </div>
  );
}
