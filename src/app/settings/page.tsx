'use client';

import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Folder, Save, ArrowLeft, Settings, Database, RefreshCw, CheckCircle2, ShieldCheck, Cpu, Globe } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const [workspaceRoot, setWorkspaceRoot] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { SettingRepository } = await import('@/lib/repositories/SettingRepository');
      const root = await SettingRepository.get('workspace_root');
      if (root) setWorkspaceRoot(root);
    }
    load();
  }, []);

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'ワークスペースのルートディレクトリを選択',
      });
      if (selected && typeof selected === 'string') {
        setWorkspaceRoot(selected);
      }
    } catch (e) {
      console.error('Folder selection failed:', e);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { SettingRepository } = await import('@/lib/repositories/SettingRepository');
      await SettingRepository.update('workspace_root', workspaceRoot);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="orbit-dashboard animate-fade">
      
      {/* Settings Header: Brand Aligned */}
      <header className="shrink-0 flex flex-row items-center justify-between px-2">
        <div className="flex flex-row items-center gap-8">
          <Link href="/" className="orbit-btn orbit-btn-ghost w-12 h-12 p-0 border-none hover:bg-white/5">
             <ArrowLeft size={24} />
          </Link>
          <div className="flex flex-col">
            <h1 className="orbit-brand-title text-5xl leading-none italic">設定 / Settings</h1>
            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.5em] italic mt-1 font-mono">System Configuration Node</p>
          </div>
        </div>

        <div className="flex flex-row items-center gap-4">
           {justSaved && (
              <div className="orbit-badge py-3 px-6 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-fade">
                 <CheckCircle2 size={14} /> <span>ステータス: 同期完了</span>
              </div>
           )}
           <div className="w-10 h-10 bg-white/5 flex items-center justify-center rounded-xl">
             <Settings size={20} className="text-white/20" />
           </div>
        </div>
      </header>

      {/* Main Settings Body */}
      <div className="flex-1 flex flex-col gap-10 mt-10 max-w-7xl mx-auto w-full overflow-y-auto pr-4 custom-scrollbar">
        
        {/* Section 1: Global Workspace Root */}
        <section className="flex flex-col gap-8">
           <div className="flex flex-row items-center gap-4 ml-4 opacity-30">
              <Database size={20} className="text-indigo-400" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] italic text-white">プロジェクト・レジストリ・ルート</h2>
           </div>

           <div className="orbit-card-refined p-12 bg-white/[0.01] flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                 <label className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] italic ml-2">ディレクトリ階層ルート</label>
                 <div className="flex flex-row gap-4">
                    <div className="flex-1 orbit-card-refined py-6 px-10 bg-black/40 border-white/5 flex flex-row items-center gap-6 group hover:border-white/20 transition-all cursor-default">
                       <Folder size={24} className="text-indigo-500/40" />
                       <span className="text-xl font-mono text-white/60 truncate italic">{workspaceRoot || '構成を待機中...'}</span>
                    </div>
                    <button 
                      onClick={handleSelectFolder}
                      className="orbit-btn orbit-btn-ghost h-auto px-10 border-white/10"
                    >
                       ファイルシステムを参照
                    </button>
                 </div>
                 <p className="text-[10px] text-white/10 font-mono leading-relaxed mt-2 italic px-2">
                    * Orbit はこのルートをタクティカル・リファレンスとして使用し、ミッションノードとローカル資産をスキャンします。
                 </p>
              </div>

              <div className="pt-10 border-t border-white/5">
                 <button 
                   onClick={handleSave}
                   disabled={isSaving || !workspaceRoot}
                   className="orbit-btn orbit-btn-primary w-full h-20 text-sm shadow-[0_40px_80px_-20px_hsla(235,90%,65%,0.2)]"
                 >
                    {isSaving ? <RefreshCw size={24} className="animate-spin" /> : <Save size={24} />}
                    {isSaving ? 'システム同期中...' : 'システム設定を適用'}
                 </button>
              </div>
           </div>
        </section>

        {/* Section 2: About & Legal Info */}
        <div className="grid grid-cols-2 gap-10">
           <section className="flex flex-col gap-8">
              <div className="flex flex-row items-center gap-4 ml-4 opacity-30">
                 <ShieldCheck size={20} className="text-indigo-400" />
                 <h2 className="text-[11px] font-black uppercase tracking-[0.4em] italic text-white">システム情報</h2>
              </div>
              <div className="orbit-card-refined p-10 bg-white/[0.01] flex flex-col gap-6">
                 <div className="flex flex-row items-center justify-between pb-6 border-b border-white/5">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/20">ビルド・バージョン</span>
                   <span className="text-xs font-mono text-indigo-400 font-bold italic">v0.5.3 "Interactive"</span>
                 </div>
                 <div className="flex flex-row items-center justify-between">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/20">エンジン・プロバイダー</span>
                   <span className="text-xs font-black uppercase italic tracking-tighter text-white">AntiGravity Labs</span>
                 </div>
              </div>
           </section>

           <section className="flex flex-col gap-8">
              <div className="flex flex-row items-center gap-4 ml-4 opacity-30">
                 <Cpu size={20} className="text-indigo-400" />
                 <h2 className="text-[11px] font-black uppercase tracking-[0.4em] italic text-white">コア・アーキテクチャ</h2>
              </div>
              <div className="orbit-card-refined p-10 bg-white/[0.01] flex flex-col gap-6">
                 <div className="flex flex-row items-center justify-between pb-6 border-b border-white/5">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/20">ネイティブ・シェル</span>
                   <span className="text-xs font-mono text-white/40">Tauri v2 (Rust)</span>
                 </div>
                 <div className="flex flex-row items-center justify-between">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/20">クラウド同期ハブ</span>
                   <span className="text-xs font-mono text-white/40">Google Apps Script</span>
                 </div>
              </div>
           </section>
        </div>
      </div>

      {/* Persistent HUD Placeholder (for branding consistency) */}
      <footer className="orbit-hud flex-row justify-between mt-auto opacity-40">
         <div className="flex flex-row items-center gap-10">
            <Globe size={18} className="text-white/20" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 italic">Node Config Online</span>
         </div>
         <div className="flex flex-row items-center gap-4 text-[9px] font-mono text-white/10 uppercase italic">
            Core Engine Standby...
         </div>
      </footer>
    </div>
  );
}
