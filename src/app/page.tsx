'use client';

import { useState, useEffect } from 'react';
import { getProjects, addProject, deleteProject, getSetting, projectExistsByPath } from '@/lib/db';
import Link from 'next/link';
import { Settings, Plus, Trash2, FolderOpen, ShieldCheck, RefreshCw, X } from 'lucide-react';
import { join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { mkdir, writeTextFile } from '@tauri-apps/plugin-fs';

interface ScannedProject {
  name: string;
  path: string;
  markers: string[];
}

export default function Home() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const list = await getProjects();
    setProjects(list);
    const root = await getSetting('workspace_root');
    setWorkspaceRoot(root);
  }

  async function handleScan() {
    if (isScanning) return;
    setIsScanning(true);
    try {
      const root = await getSetting('workspace_root');
      if (!root) {
        alert('設定画面でワークスペースのルートディレクトリを先に設定してください');
        return;
      }
      // FIXED: rootPath -> baseDir to match backend expectations
      const scanned = await invoke<ScannedProject[]>('scan_projects', { baseDir: root });
      for (const p of scanned) {
        const exists = await projectExistsByPath(p.path);
        if (!exists) {
          await addProject({ name: p.name, androidPath: p.path, isRemoteSyncEnabled: 0 });
        }
      }
      await loadData();
    } catch (e) {
      console.error('Scan failed:', e);
    } finally {
      setIsScanning(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const gasUrl = formData.get('gasUrl') as string;
    if (!workspaceRoot) {
      alert('ワークスペースのルートディレクトリが設定されていません');
      return;
    }
    const projectPath = await join(workspaceRoot, name);
    try {
      await addProject({ name, gasUrl: gasUrl || undefined, androidPath: projectPath, isRemoteSyncEnabled: 0 });
      await mkdir(projectPath, { recursive: true });
      await writeTextFile(await join(projectPath, 'DATA_FLOW.md'), `# DATA_FLOW for ${name}\n`);
      await loadData();
      setIsAddModalOpen(false);
    } catch (e) {
      console.error('Create failed:', e);
    }
  }

  async function handleRemoveProject(id: string) {
    if (confirm('このノードを Orbit から除外しますか？（物理ファイルは削除されません）')) {
      await deleteProject(id);
      await loadData();
    }
  }

  return (
    <div className="orbit-w-full animate-fade" style={{ padding: '32px' }}>
      
      {/* Header Area */}
      <header className="orbit-flex-row orbit-w-full orbit-mb-xl">
        <div className="orbit-flex-row orbit-gap-sm">
          <div className="w-6 h-6 bg-indigo-500 rounded-sm shadow-xl shadow-indigo-500/20"></div>
          <div className="orbit-flex-col">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-white leading-none">Orbit</h1>
            <p className="text-[10px] text-gray-500 font-bold tracking-[0.4em] uppercase mt-2">Agent Orchestrator</p>
          </div>
        </div>
        
        <div className="orbit-flex-spacer" />

        <div className="orbit-flex-row orbit-gap-sm">
          {/* Add Project Trigger */}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="orbit-button-icon border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
            title="新規ノードを追加"
          >
            <Plus size={22} />
          </button>
          
          <button 
            onClick={handleScan} 
            disabled={isScanning} 
            className="orbit-button-icon"
            title="ワークペースをスキャン"
          >
             <RefreshCw size={20} className={isScanning ? 'animate-spin' : ''} />
          </button>
          
          <Link href="/settings" className="orbit-button-icon" title="設定を開く">
            <Settings size={20} />
          </Link>
        </div>
      </header>

      {/* Main Grid Area - Full Width Expansion */}
      <div className="grid-12 orbit-w-full">
        <div className="col-span-12 orbit-flex-col orbit-gap-sm">
          {projects.length === 0 ? (
            <div className="orbit-card orbit-flex-row orbit-flex-center py-40 border-dashed border-white/5 opacity-50">
               <div className="orbit-flex-col orbit-flex-center orbit-gap-sm">
                  <div className="w-12 h-12 rounded-full border border-white/10 orbit-flex-row orbit-flex-center">
                    <ShieldCheck size={24} className="text-gray-700" />
                  </div>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">ノードが登録されていません</p>
               </div>
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="orbit-relative orbit-w-full animate-fade">
                <Link 
                  href={`/projects/detail?id=${project.id}`} 
                  className="orbit-card orbit-card-interactive p-10 orbit-w-full"
                  style={{ paddingRight: '120px' }}
                >
                  <div className="orbit-flex-row orbit-flex-between orbit-mb-md orbit-w-full">
                    <div className="orbit-flex-row orbit-gap-xs">
                      <div className={`w-2.5 h-2.5 rounded-full ${project.status === 'active' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-gray-700'}`}></div>
                      <span className="text-[10px] font-extrabold text-gray-300 tracking-widest uppercase">{project.status === 'active' ? '接続中' : 'スタンバイ'}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono tracking-widest">#{project.id.slice(-4)}</span>
                  </div>
                  
                  <h2 className="text-4xl font-extrabold tracking-tighter uppercase italic orbit-mb-sm text-white leading-none">{project.name}</h2>
                  <div className="orbit-flex-row orbit-gap-xs text-[11px] text-gray-500 font-mono bg-black/40 p-4 border border-white/10 rounded-xl truncate orbit-w-full">
                     <ShieldCheck size={16} className="text-indigo-500/40" />
                     {project.androidPath}
                  </div>
                </Link>

                <button 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    handleRemoveProject(project.id); 
                  }} 
                  className="orbit-button-icon"
                  style={{
                    position: 'absolute',
                    right: '32px',
                    bottom: '32px',
                    zIndex: 10,
                    width: '56px',
                    height: '56px'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                  title="除外"
                >
                  <Trash2 size={24} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Project Modal Overlay */}
      {isAddModalOpen && (
        <div className="orbit-modal-overlay">
          <div className="orbit-modal-content orbit-card p-12 border-indigo-500/20 bg-black">
            <div className="orbit-flex-row orbit-flex-between orbit-mb-md">
               <div className="orbit-flex-row orbit-gap-xs text-indigo-400">
                  <Plus size={20} />
                  <h2 className="text-sm font-extrabold uppercase tracking-widest italic text-white">新規ノードを起動</h2>
               </div>
               <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-gray-600 hover:text-white transition-colors"
               >
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="orbit-flex-col orbit-gap-md">
              <div className="orbit-input-group">
                <label className="orbit-label">エイリアス（プロジェクト名）</label>
                <input name="name" className="orbit-input" placeholder="Project Name" required autoFocus />
              </div>
              <div className="orbit-input-group">
                <label className="orbit-label">メタデータ同期 (GAS URL / 任意)</label>
                <input name="gasUrl" className="orbit-input text-xs font-mono" placeholder="https://script.google.com/..." />
              </div>
              
              <div className="p-6 bg-white/[0.02] rounded-xl border border-white/5 orbit-mt-md">
                 <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest orbit-mb-xs orbit-flex-row orbit-gap-xs">
                   <FolderOpen size={14} /> 格納先ルート
                 </div>
                 <div className="text-[11px] text-gray-400 font-mono truncate">
                   {workspaceRoot || '設定が必要です'}
                 </div>
              </div>

              <div className="orbit-mt-md pt-6 border-t border-white/5">
                <button type="submit" className="orbit-button-primary py-5">
                  新規ノードをシステムに登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
