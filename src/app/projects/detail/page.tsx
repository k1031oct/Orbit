'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getProject, updateProject, getLocalRequirements, getDecisionLogs, addLocalRequirement, changeLocalRequirementStatus, removeLocalRequirement } from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Layers, ShieldCheck, Database, Plus, Trash2, Save, Globe } from 'lucide-react';
import OrbitalToolkit from '@/components/OrbitalToolkit';

function ProjectDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [project, setProject] = useState<any>(null);
  const [localRequirements, setLocalRequirements] = useState<any[]>([]);
  const [decisionLogs, setDecisionLogs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  async function loadData(projectId: string) {
    const p = await getProject(projectId);
    setProject(p);
    const reqs = await getLocalRequirements(projectId);
    setLocalRequirements(reqs);
    const logs = await getDecisionLogs(projectId);
    setDecisionLogs(logs);
  }

  async function handleEditProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const fields = {
      name: formData.get('name') as string,
      gasUrl: formData.get('gasUrl') as string || undefined,
      gitUrl: formData.get('gitUrl') as string || undefined,
      description: formData.get('description') as string || undefined,
    };
    await updateProject(id, fields);
    await loadData(id);
    setIsSaving(false);
  }

  async function handleAddLocalReq(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    const formData = new FormData(e.currentTarget);
    await addLocalRequirement({
      projectId: id,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      target: formData.get('target') as string,
    });
    await loadData(id);
    (e.target as HTMLFormElement).reset();
  }

  if (!project) return <div className="p-20 text-center font-mono">ノードに接続中...</div>;

  return (
    <div className="animate-fade orbit-w-full" style={{ padding: '32px' }}>
      <header className="orbit-flex-row orbit-w-full orbit-mb-lg" style={{ height: '64px' }}>
        <div className="orbit-flex-col">
          <Link href="/" className="orbit-flex-row orbit-gap-xs text-gray-600 hover:text-indigo-400 transition-all text-[10px] font-bold uppercase tracking-widest orbit-mb-xs">
            <ArrowLeft size={14} /> 戻る
          </Link>
          <div className="orbit-flex-row orbit-gap-sm">
             <div className="w-5 h-5 bg-indigo-500 rounded-sm"></div>
             <h1 className="text-4xl font-black tracking-tighter uppercase italic text-white leading-none">{project.name}</h1>
             <div className="orbit-flex-row orbit-gap-xs text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                接続中
             </div>
          </div>
        </div>

        <div className="orbit-flex-spacer" />

        <OrbitalToolkit projectPath={project.androidPath} gitUrl={project.gitUrl} />
      </header>

      <div className="grid-12 orbit-w-full orbit-items-stretch">
        
        {/* Node Control Section (4 Col) */}
        <div className="col-span-4 orbit-flex-col orbit-h-full">
            <section className="orbit-card bg-black/5 border-white/[0.05] orbit-h-full">
              <div className="orbit-flex-row orbit-flex-between orbit-mb-md">
                <div className="orbit-flex-row orbit-gap-xs text-indigo-400">
                  <Database size={18} />
                  <h2 className="text-sm font-extrabold uppercase tracking-widest italic text-white">構成設定</h2>
                </div>
                <form onSubmit={handleEditProject} id="config-form">
                   <button type="submit" disabled={isSaving} className="orbit-button-icon" title="設定を保存">
                     {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                   </button>
                </form>
              </div>
              
              <div className="orbit-flex-col orbit-gap-sm flex-1">
                <div className="orbit-input-group">
                  <label className="orbit-label">エイリアス</label>
                  <input form="config-form" name="name" defaultValue={project.name} className="orbit-input" />
                </div>
                <div className="orbit-input-group">
                  <label className="orbit-label">メタデータ同期 (GAS)</label>
                  <input form="config-form" name="gasUrl" defaultValue={project.gasUrl ?? ''} className="orbit-input font-mono text-emerald-400/60" placeholder="https://..." />
                </div>
                <div className="orbit-input-group">
                  <label className="orbit-label">リポジトリ (Git)</label>
                  <input form="config-form" name="gitUrl" defaultValue={project.gitUrl ?? ''} className="orbit-input font-mono text-fuchsia-400/60" placeholder="https://..." />
                </div>
              </div>
              <div className="orbit-mt-md pt-6 border-t border-white/5 text-[10px] text-gray-600 font-mono orbit-flex-row orbit-gap-xs uppercase tracking-widest">
                 <Globe size={14} /> {project.androidPath}
              </div>
            </section>
        </div>

        {/* New Objective Section (8 Col) */}
        <div className="col-span-8 orbit-h-full">
            <section className="orbit-card bg-black/5 border-white/[0.05] orbit-h-full">
              <div className="orbit-flex-row orbit-gap-sm orbit-mb-md">
                <div className="orbit-flex-row orbit-gap-xs text-indigo-400">
                  <Plus size={22} />
                  <h2 className="text-sm font-extrabold uppercase tracking-widest italic text-white">新規目標</h2>
                </div>
              </div>
              
              <form onSubmit={handleAddLocalReq} className="orbit-flex-col orbit-gap-md flex-1">
                <div className="grid-12 orbit-w-full">
                  <div className="col-span-6 orbit-input-group">
                    <label className="orbit-label">タイトル</label>
                    <input name="title" className="orbit-input" placeholder="ロジックの実装..." required />
                  </div>
                  <div className="col-span-6 orbit-input-group">
                    <label className="orbit-label">ターゲット</label>
                    <input name="target" className="orbit-input font-mono text-indigo-400/60" placeholder="Component::Class" />
                  </div>
                </div>
                <div className="orbit-input-group">
                  <label className="orbit-label">指示・要件の詳細</label>
                  <textarea name="description" className="orbit-input min-h-[160px] resize-none italic" placeholder="要件の詳細を入力してください..." />
                </div>
                <div className="orbit-flex-row orbit-flex-end">
                   <button type="submit" className="orbit-button-primary py-5 w-auto px-12">
                      目標を確定して追加
                   </button>
                </div>
              </form>
            </section>
        </div>

        {/* Decision Logs (4 Col) */}
        <div className="col-span-4 orbit-mt-md">
            <section className="orbit-card border-white/[0.05] orbit-h-full">
              <div className="orbit-flex-row orbit-gap-xs orbit-mb-md text-indigo-400">
                <Database size={18} />
                <h2 className="text-sm font-extrabold uppercase tracking-widest italic text-white">意思決定ログ</h2>
              </div>
              <div className="orbit-flex-col orbit-gap-sm max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                {decisionLogs.length === 0 ? (
                  <div className="py-20 text-center text-gray-700 text-[10px] uppercase font-bold tracking-[0.2em]">ログが見つかりません</div>
                ) : (
                  decisionLogs.map((log) => (
                    <div key={log.id} className="p-5 bg-black/20 border border-white/5 rounded-lg hover:border-white/10 transition-all">
                       <p className="text-[12px] font-bold text-gray-300 leading-tight orbit-mb-xs">{log.decision}</p>
                       <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{log.category} | {new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
        </div>

        {/* Active Objectives (8 Col) */}
        <div className="col-span-8 orbit-mt-md">
            <section className="orbit-card bg-black/5 border-white/[0.05] orbit-h-full">
              <div className="orbit-flex-row orbit-gap-xs orbit-mb-lg text-indigo-400">
                <Layers size={18} />
                <h2 className="text-sm font-extrabold uppercase tracking-widest italic text-white">進行中の目標</h2>
              </div>
              
              <div className="orbit-flex-col orbit-gap-sm">
                 {localRequirements.length === 0 ? (
                   <div className="py-24 text-center text-gray-700 font-bold text-[11px] uppercase tracking-[0.4em]">待機中</div>
                 ) : (
                   localRequirements.map((req) => (
                     <div key={req.id} className="orbit-card orbit-flex-row orbit-gap-md border-white/5 bg-black/10">
                        <div className="flex-shrink-0">
                           <div className="w-12 h-12 rounded-xl orbit-flex-row orbit-flex-center icon-indigo">
                              <Plus size={24} />
                           </div>
                        </div>
                        <div className="flex-1 min-w-0">
                           <h3 className="text-lg font-bold text-white orbit-mb-xs leading-none uppercase italic tracking-tight">{req.title}</h3>
                           <p className="text-[13px] text-gray-500 leading-relaxed italic">{req.description}</p>
                           {req.target && <span className="inline-block orbit-mt-md text-[10px] text-indigo-400 font-mono uppercase bg-indigo-500/10 px-3 py-1 rounded border border-indigo-500/20">{req.target}</span>}
                        </div>
                        <div className="orbit-flex-row orbit-gap-xs">
                           <button className="orbit-button-ghost">完了</button>
                           <button className="orbit-button-icon border-red-500/10 text-gray-700 hover:bg-red-500 hover:text-white" title="削除"><Trash2 size={18} /></button>
                        </div>
                     </div>
                   ))
                 )}
              </div>
            </section>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-mono">データを読み込み中...</div>}>
      <ProjectDetailContent />
    </Suspense>
  );
}
