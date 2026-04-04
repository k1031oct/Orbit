'use client';

import { useState, useEffect } from 'react';
import { getSetting, updateSetting } from '@/lib/db';
import { open } from '@tauri-apps/plugin-dialog';
import { Folder, Save, ArrowLeft, Settings, Database, RefreshCw, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const [workspaceRoot, setWorkspaceRoot] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const root = await getSetting('workspace_root');
      if (root) setWorkspaceRoot(root);
    }
    load();
  }, []);

  const handleSelectFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'ワークスペースのルートディレクトリを選択',
    });
    if (selected && typeof selected === 'string') {
      setWorkspaceRoot(selected);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateSetting('workspace_root', workspaceRoot);
    setIsSaving(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  };

  return (
    <div className="animate-fade orbit-w-full" style={{ padding: '32px' }}>
      <header className="orbit-flex-col orbit-w-full orbit-mb-xl">
        <div className="orbit-flex-col orbit-gap-xs">
          <Link href="/" className="orbit-flex-row orbit-gap-xs text-gray-600 hover:text-indigo-400 transition-all text-[10px] font-bold uppercase tracking-widest orbit-mb-xs">
            <ArrowLeft size={14} /> 戻る
          </Link>
          <div className="orbit-flex-row orbit-gap-sm">
             <div className="w-5 h-5 bg-indigo-500 rounded-sm"></div>
             <h1 className="text-5xl font-black tracking-tighter uppercase italic text-white leading-none">Settings</h1>
          </div>
          <div className="orbit-mt-md orbit-flex-row orbit-gap-xs text-[10px] text-gray-600 font-mono pl-11 uppercase tracking-[0.2em]">
            System Configuration Node
          </div>
        </div>
      </header>

      <div className="grid-12 orbit-w-full">
        {/* Configuration Panel (8 Col) */}
        <div className="col-span-8">
           <section className="orbit-card p-12 bg-black/5 border-white/[0.05]">
              <div className="orbit-flex-row orbit-flex-between orbit-mb-md">
                <div className="orbit-flex-row orbit-gap-xs text-indigo-400">
                  <Database size={20} />
                  <h2 className="text-sm font-extrabold uppercase tracking-widest italic text-white">グローバル・ノード・ルート</h2>
                </div>
                {justSaved && (
                  <div className="orbit-flex-row orbit-gap-xs text-emerald-400 text-[10px] font-bold uppercase animate-pulse">
                    <CheckCircle2 size={14} /> 設定を保存しました
                  </div>
                )}
              </div>

              <div className="orbit-flex-col orbit-gap-sm">
                <div className="orbit-input-group">
                  <label className="orbit-label">ワークスペース・ルートディレクトリ</label>
                  <div className="orbit-flex-row orbit-gap-sm">
                    <div className="orbit-flex-spacer orbit-input bg-black/40 border-white/10 orbit-flex-row orbit-gap-sm text-gray-300 font-mono text-[13px] group hover:border-white/20 transition-all">
                      <Folder size={18} className="text-indigo-500/40" />
                      <span className="truncate">{workspaceRoot || '未設定'}</span>
                    </div>
                    <button
                      onClick={handleSelectFolder}
                      className="orbit-button-ghost py-4 px-8 whitespace-nowrap"
                    >
                      参照...
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-600 orbit-mt-md italic leading-relaxed">
                    * Orbit はこのルートディレクトリを基準に、プロジェクト資産のスキャンおよび管理を行います。
                  </p>
                </div>

                <div className="orbit-mt-md pt-10 border-t border-white/[0.05]">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !workspaceRoot}
                    className="orbit-button-primary py-6 orbit-flex-row orbit-flex-center orbit-gap-sm shadow-2xl shadow-indigo-950/40 active:scale-[0.98] disabled:opacity-30"
                  >
                    {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                    {isSaving ? '同期中...' : 'システム設定を反映'}
                  </button>
                </div>
              </div>
           </section>
        </div>

        {/* Info Panel (4 Col) */}
        <div className="col-span-4">
           <section className="orbit-card p-10 border-indigo-500/10">
              <div className="orbit-flex-row orbit-gap-xs orbit-mb-md text-gray-500">
                <Settings size={18} />
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-white">Orbit について</h2>
              </div>
              <div className="orbit-flex-col orbit-gap-sm">
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl">
                   <div className="text-[9px] text-indigo-400/60 font-bold uppercase orbit-mb-xs">ビルドバージョン</div>
                   <div className="text-xs font-mono text-gray-400">Orbit-Core v0.1.0-alpha</div>
                </div>
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl">
                   <div className="text-[9px] text-indigo-400/60 font-bold uppercase orbit-mb-xs">プロバイダー</div>
                   <div className="text-xs font-mono text-gray-400">AntiGravity Labs</div>
                </div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
