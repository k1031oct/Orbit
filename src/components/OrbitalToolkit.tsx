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
    <div className="flex flex-row gap-2 animate-fade">
      <button
        onClick={handleOpenVSCode}
        className="w-10 h-10 flex items-center justify-center rounded-md border border-white/10 hover:border-indigo-500/40 bg-white/[0.03] transition-all"
        title="VS Code で開く"
      >
        <Terminal size={18} className="text-white/60" />
      </button>

      <button
        onClick={handleOpenStudio}
        className="w-10 h-10 flex items-center justify-center rounded-md border border-white/10 hover:border-emerald-500/40 bg-white/[0.03] transition-all"
        title="Android Studio で開く"
      >
        <Cpu size={18} className="text-white/60" />
      </button>

      {gitUrl && (
        <a
          href={gitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 flex items-center justify-center rounded-md border border-white/10 hover:border-fuchsia-500/40 bg-white/[0.03] transition-all"
          title="リポジトリを開く"
        >
          <GitBranch size={18} className="text-white/60" />
        </a>
      )}
    </div>
  );
}
